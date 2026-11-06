<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import AssigneeSelect from '@/components/AssigneeSelect.vue'
import CategoryBadge from '@/components/CategoryBadge.vue'
import CategoryIcon from '@/components/CategoryIcon.vue'
import HistoryTimeline from '@/components/HistoryTimeline.vue'
import Spinner from '@/components/Spinner.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import StatusControl from '@/components/StatusControl.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { CATEGORY_OPTIONS, STATUS_LABELS } from '@/lib/constants'
import { dataErrorMessage, isNotFoundError } from '@/lib/errors'
import { formatDateTime, profileName } from '@/lib/format'
import { fetchProfiles } from '@/lib/team'
import {
  addComment,
  fetchComments,
  fetchTicket,
  fetchTicketEvents,
  updateTicket,
  updateTicketStatus,
} from '@/lib/tickets'
import type {
  Profile,
  Ticket,
  TicketCategory,
  TicketComment,
  TicketEvent,
  TicketStatus,
} from '@/types'

const route = useRoute()
const { user } = useAuth()
const toast = useToast()

const ticket = ref<Ticket | null>(null)
const profiles = ref<Profile[]>([])
const comments = ref<TicketComment[]>([])
const events = ref<TicketEvent[]>([])

const loading = ref(true)
const loadError = ref('')
const notFound = ref(false)
const profilesError = ref('')
const commentsError = ref('')
const eventsError = ref('')

const form = reactive<{
  title: string
  description: string
  category: TicketCategory
  assignee_id: string
}>({
  title: '',
  description: '',
  category: 'other',
  assignee_id: '',
})

const errors = reactive({ title: '', description: '', category: '', assignee: '' })
const saving = ref(false)
const formError = ref('')
const statusSaving = ref<TicketStatus | null>(null)

const commentBody = ref('')
const commentSubmitting = ref(false)
const commentError = ref('')

const canEdit = computed(() => {
  const current = ticket.value
  const me = user.value
  if (!current || !me) return false
  return me.id === current.user_id || me.id === current.assignee_id
})

const isDirty = computed(() => {
  const current = ticket.value
  if (!current) return false
  return (
    form.title !== current.title ||
    form.description !== current.description ||
    form.category !== current.category ||
    form.assignee_id !== current.assignee_id
  )
})

function mergeProfiles(...lists: (Profile | null | undefined)[][]): Profile[] {
  const map = new Map<string, Profile>()
  for (const list of lists) {
    for (const profile of list) {
      if (profile) map.set(profile.id, profile)
    }
  }
  return [...map.values()].sort((a, b) => a.display_name.localeCompare(b.display_name, 'ru'))
}

function fillForm(next: Ticket) {
  form.title = next.title
  form.description = next.description
  form.category = next.category
  form.assignee_id = next.assignee_id
}

async function loadProfiles() {
  const fallback = [ticket.value?.author, ticket.value?.assignee].filter(Boolean) as Profile[]

  try {
    profiles.value = mergeProfiles(await fetchProfiles(), fallback)
  } catch (cause) {
    profiles.value = mergeProfiles(fallback)
    profilesError.value = dataErrorMessage(cause)
  }
}

async function loadComments(ticketId: string) {
  commentsError.value = ''

  try {
    comments.value = await fetchComments(ticketId)
  } catch (cause) {
    commentsError.value = dataErrorMessage(cause)
  }
}

async function loadEvents(ticketId?: string) {
  const id = ticketId ?? ticket.value?.id
  if (!id) return

  eventsError.value = ''

  try {
    events.value = await fetchTicketEvents(id)
  } catch (cause) {
    eventsError.value = dataErrorMessage(cause)
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  notFound.value = false

  try {
    const data = await fetchTicket(String(route.params.id))
    ticket.value = data
    fillForm(data)

    await Promise.all([loadProfiles(), loadComments(data.id), loadEvents(data.id)])
  } catch (error) {
    ticket.value = null
    if (isNotFoundError(error)) notFound.value = true
    else loadError.value = dataErrorMessage(error)
  } finally {
    loading.value = false
  }
}

function validate(): boolean {
  const title = form.title.trim()
  const description = form.description.trim()

  errors.title = !title
    ? 'Введите название заявки'
    : title.length > 200
      ? 'Название не должно превышать 200 символов'
      : ''
  errors.description = !description
    ? 'Опишите задачу'
    : description.length > 5000
      ? 'Описание не должно превышать 5000 символов'
      : ''
  errors.category = form.category ? '' : 'Выберите категорию'
  errors.assignee = form.assignee_id ? '' : 'Выберите исполнителя'

  return !errors.title && !errors.description && !errors.category && !errors.assignee
}

async function save() {
  const current = ticket.value
  if (!current || saving.value) return
  formError.value = ''

  if (!validate()) return
  if (!isDirty.value) {
    toast.info('Изменений нет')
    return
  }

  saving.value = true

  try {
    const updated = await updateTicket(current.id, {
      title: form.title,
      description: form.description,
      category: form.category,
      assignee_id: form.assignee_id,
    })

    ticket.value = updated
    fillForm(updated)
    toast.success('Изменения сохранены')
    await loadEvents(updated.id)
  } catch (error) {
    formError.value = dataErrorMessage(error)
    toast.error(formError.value)
  } finally {
    saving.value = false
  }
}

async function changeStatus(next: TicketStatus) {
  const current = ticket.value
  if (!current || statusSaving.value || current.status === next || !canEdit.value) return

  statusSaving.value = next

  try {
    const updated = await updateTicketStatus(current.id, next)
    ticket.value = updated
    toast.success(`Этап изменён на «${STATUS_LABELS[next]}»`)
    await loadEvents(updated.id)
  } catch (error) {
    toast.error(dataErrorMessage(error))
  } finally {
    statusSaving.value = null
  }
}

async function submitComment() {
  const current = ticket.value
  const body = commentBody.value.trim()

  if (!current || commentSubmitting.value || !body) return

  commentSubmitting.value = true
  commentError.value = ''

  try {
    const created = await addComment(current.id, body)
    comments.value = [...comments.value, created]
    commentBody.value = ''
    await loadEvents(current.id)
  } catch (error) {
    commentError.value = dataErrorMessage(error)
    toast.error(commentError.value)
  } finally {
    commentSubmitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
    <RouterLink
      :to="{ name: 'tickets' }"
      class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
    >
      <svg
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      К доске
    </RouterLink>

    <div v-if="loading" class="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="space-y-5">
        <div class="panel space-y-4 p-5 sm:p-7">
          <div class="flex gap-2">
            <div class="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
            <div class="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div class="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
          <div class="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div class="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
          <div class="h-20 w-full animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div class="panel h-56 animate-pulse bg-slate-100/60" />
      </div>
      <div class="panel h-72 animate-pulse bg-slate-100/60" />
    </div>

    <div v-else-if="notFound" class="panel mt-4 px-6 py-16 text-center">
      <span class="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <svg
          class="size-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <h1 class="mt-4 text-lg font-semibold text-slate-900">Задача не найдена</h1>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Возможно, она была удалена автором.
      </p>
      <RouterLink :to="{ name: 'tickets' }" class="btn-primary mt-5">Вернуться к доске</RouterLink>
    </div>

    <div v-else-if="loadError" class="panel mt-4 px-6 py-14 text-center">
      <span class="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-500">
        <svg
          class="size-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      </span>
      <h1 class="mt-4 text-lg font-semibold text-slate-900">Не удалось загрузить задачу</h1>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">{{ loadError }}</p>
      <button type="button" class="btn-secondary mt-5" @click="load">Попробовать снова</button>
    </div>

    <div
      v-else-if="ticket"
      class="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
    >
      <div class="space-y-5">
        <section class="panel p-5 sm:p-7">
          <div class="flex flex-wrap items-center gap-2">
            <StatusBadge :status="ticket.status" />
            <CategoryBadge :category="ticket.category" />
          </div>

          <h1 class="mt-3 text-2xl font-bold tracking-tight break-words text-slate-900 sm:text-3xl">
            {{ ticket.title }}
          </h1>

          <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 sm:text-sm">
            <span class="inline-flex items-center gap-1.5">
              <UserAvatar :profile="ticket.author" />
              {{ profileName(ticket.author) }}
            </span>
            <span class="text-slate-300" aria-hidden="true">·</span>
            <span>создана {{ formatDateTime(ticket.created_at) }}</span>
            <span class="text-slate-300" aria-hidden="true">·</span>
            <span>обновлена {{ formatDateTime(ticket.updated_at) }}</span>
          </div>

          <p class="mt-5 text-sm leading-relaxed whitespace-pre-line text-slate-700">
            {{ ticket.description }}
          </p>

          <div class="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <UserAvatar :profile="ticket.assignee" size="md" />
            <div class="min-w-0">
              <p class="text-xs text-slate-500">Исполнитель</p>
              <p class="truncate text-sm font-medium text-slate-800">
                {{ profileName(ticket.assignee) }}
                <span v-if="ticket.assignee_id === user?.id" class="text-slate-400">(вы)</span>
              </p>
            </div>
          </div>

          <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p class="text-sm font-medium text-slate-700">Этап задачи</p>
            <p class="mt-0.5 text-xs text-slate-500">
              {{
                canEdit
                  ? 'Измените этап — он сохранится сразу и попадёт в историю.'
                  : 'Менять этап могут автор и исполнитель.'
              }}
            </p>
            <StatusControl
              class="mt-3"
              :value="ticket.status"
              :pending="statusSaving"
              :disabled="!canEdit"
              @change="changeStatus"
            />
            <p v-if="statusSaving" class="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <Spinner :size="14" />
              Сохраняем этап…
            </p>
            <p v-else-if="!canEdit" class="mt-2 text-xs text-slate-500">
              Вы видите задачу как наблюдатель.
            </p>
          </div>
        </section>

        <section class="panel p-5 sm:p-6">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-slate-900">Комментарии</h2>
            <span
              class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 ring-inset"
            >
              {{ comments.length }}
            </span>
          </div>
          <p class="mt-1 text-sm text-slate-500">Детали и вопросы — здесь, их видит вся команда.</p>

          <AlertBanner v-if="commentsError" class="mt-4">{{ commentsError }}</AlertBanner>

          <div v-if="comments.length" class="mt-4 divide-y divide-slate-100">
            <article
              v-for="comment in comments"
              :key="comment.id"
              class="flex gap-3 py-3.5 first:pt-0 last:pb-0"
            >
              <UserAvatar :profile="comment.author" size="md" />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p class="text-sm font-medium text-slate-800">
                    {{ profileName(comment.author) }}
                  </p>
                  <p class="text-xs text-slate-400">{{ formatDateTime(comment.created_at) }}</p>
                </div>
                <p class="mt-1 text-sm leading-relaxed whitespace-pre-line text-slate-700">
                  {{ comment.body }}
                </p>
              </div>
            </article>
          </div>

          <p
            v-else
            class="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500"
          >
            Пока нет комментариев. Начните обсуждение.
          </p>

          <form class="mt-4" novalidate @submit.prevent="submitComment">
            <label for="comment" class="sr-only">Новый комментарий</label>
            <textarea
              id="comment"
              v-model="commentBody"
              rows="3"
              maxlength="2000"
              class="input resize-y"
              placeholder="Напишите комментарий…"
              :disabled="commentSubmitting"
              @input="commentError = ''"
              @keydown.ctrl.enter.prevent="submitComment"
              @keydown.meta.enter.prevent="submitComment"
            />
            <div class="mt-2 flex items-center justify-between gap-3">
              <p class="text-xs text-slate-400">
                {{ commentBody.length }} / 2000 · Ctrl + Enter — отправить
              </p>
              <button
                type="submit"
                class="btn-primary"
                :disabled="commentSubmitting || !commentBody.trim()"
              >
                <Spinner v-if="commentSubmitting" :size="16" />
                {{ commentSubmitting ? 'Отправляем…' : 'Отправить' }}
              </button>
            </div>
            <p v-if="commentError" class="field-error">{{ commentError }}</p>
          </form>
        </section>

        <section v-if="canEdit" class="panel p-5 sm:p-6">
          <h2 class="text-lg font-semibold text-slate-900">Редактировать задачу</h2>
          <p class="mt-1 text-sm text-slate-500">
            Меняйте название, описание, категорию или исполнителя — всё попадёт в историю.
          </p>

          <AlertBanner v-if="formError" class="mt-4">{{ formError }}</AlertBanner>
          <AlertBanner v-if="profilesError" class="mt-4" variant="info">
            Список сотрудников загружен не полностью: {{ profilesError }}
          </AlertBanner>

          <form class="mt-5 space-y-5" novalidate @submit.prevent="save">
            <div>
              <div class="flex items-baseline justify-between gap-3">
                <label for="title" class="label">Название</label>
                <span class="text-xs text-slate-400">{{ form.title.length }} / 200</span>
              </div>
              <input
                id="title"
                v-model="form.title"
                type="text"
                maxlength="200"
                class="input mt-1.5"
                :class="{ 'input-error': errors.title }"
                :aria-invalid="Boolean(errors.title)"
                :aria-describedby="errors.title ? 'title-error' : undefined"
                required
                @input="errors.title = ''"
              />
              <p v-if="errors.title" id="title-error" class="field-error">{{ errors.title }}</p>
            </div>

            <div>
              <div class="flex items-baseline justify-between gap-3">
                <label for="description" class="label">Описание задачи</label>
                <span class="text-xs text-slate-400">{{ form.description.length }} / 5000</span>
              </div>
              <textarea
                id="description"
                v-model="form.description"
                rows="6"
                maxlength="5000"
                class="input mt-1.5 resize-y"
                :class="{ 'input-error': errors.description }"
                :aria-invalid="Boolean(errors.description)"
                :aria-describedby="errors.description ? 'description-error' : undefined"
                required
                @input="errors.description = ''"
              />
              <p v-if="errors.description" id="description-error" class="field-error">
                {{ errors.description }}
              </p>
            </div>

            <div>
              <label for="assignee" class="label">Исполнитель</label>
              <AssigneeSelect
                id="assignee"
                v-model="form.assignee_id"
                class="mt-1.5"
                :profiles="profiles"
                :disabled="saving || profiles.length === 0"
              />
              <p v-if="errors.assignee" class="field-error">{{ errors.assignee }}</p>
            </div>

            <fieldset>
              <legend class="label">Категория</legend>
              <div class="mt-2 grid gap-2.5 sm:grid-cols-2">
                <label
                  v-for="option in CATEGORY_OPTIONS"
                  :key="option.value"
                  class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition"
                  :class="
                    form.category === option.value
                      ? 'border-indigo-500 bg-indigo-50/60 ring-4 ring-indigo-500/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  "
                >
                  <input
                    v-model="form.category"
                    type="radio"
                    name="category-edit"
                    :value="option.value"
                    class="sr-only"
                  />
                  <span
                    class="grid size-8 shrink-0 place-items-center rounded-lg"
                    :class="
                      form.category === option.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    "
                  >
                    <CategoryIcon :category="option.value" class="size-4" />
                  </span>
                  <span class="text-sm font-medium text-slate-900">{{ option.label }}</span>
                </label>
              </div>
            </fieldset>

            <div
              class="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-xs text-slate-400">
                {{ isDirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены' }}
              </p>
              <button type="submit" class="btn-primary sm:w-auto" :disabled="saving || !isDirty">
                <Spinner v-if="saving" :size="16" />
                {{ saving ? 'Сохраняем…' : 'Сохранить изменения' }}
              </button>
            </div>
          </form>
        </section>
      </div>

      <aside class="lg:sticky lg:top-24">
        <section class="panel p-5">
          <h2 class="text-lg font-semibold text-slate-900">История действий</h2>
          <p class="mt-1 text-sm text-slate-500">Кто и что изменил в задаче.</p>

          <AlertBanner v-if="eventsError" class="mt-4" variant="info">{{ eventsError }}</AlertBanner>
          <HistoryTimeline v-else :events="events" :profiles="profiles" />
        </section>
      </aside>
    </div>
  </div>
</template>
