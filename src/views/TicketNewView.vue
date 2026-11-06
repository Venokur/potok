<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import AssigneeSelect from '@/components/AssigneeSelect.vue'
import CategoryIcon from '@/components/CategoryIcon.vue'
import Spinner from '@/components/Spinner.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { CATEGORY_OPTIONS } from '@/lib/constants'
import { dataErrorMessage } from '@/lib/errors'
import { fetchProfiles } from '@/lib/team'
import { createTicket } from '@/lib/tickets'
import type { Profile, TicketCategory } from '@/types'

const router = useRouter()
const { user } = useAuth()
const toast = useToast()

const form = reactive<{
  title: string
  description: string
  category: TicketCategory | ''
  assignee_id: string
}>({
  title: '',
  description: '',
  category: '',
  assignee_id: user.value?.id ?? '',
})

const profiles = ref<Profile[]>([])
const profilesError = ref('')
const errors = reactive({ title: '', description: '', category: '', assignee: '' })
const submitting = ref(false)
const formError = ref('')

onMounted(async () => {
  try {
    profiles.value = await fetchProfiles()
  } catch (cause) {
    profilesError.value = dataErrorMessage(cause)

    const current = user.value
    if (current) {
      profiles.value = [
        {
          id: current.id,
          email: current.email ?? '',
          display_name: (current.email ?? 'Сотрудник').split('@')[0],
        },
      ]
    }
  }

  if (!form.assignee_id) {
    form.assignee_id = profiles.value[0]?.id ?? user.value?.id ?? ''
  }
})

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

async function submit() {
  if (submitting.value) return
  formError.value = ''

  if (!validate()) return

  submitting.value = true

  try {
    const ticket = await createTicket({
      title: form.title,
      description: form.description,
      category: form.category as TicketCategory,
      assignee_id: form.assignee_id,
    })

    toast.success('Заявка создана')
    await router.push({ name: 'ticket-detail', params: { id: ticket.id } })
  } catch (error) {
    formError.value = dataErrorMessage(error)
    toast.error(formError.value)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
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

    <div class="panel mt-4 p-5 sm:p-8">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">Новая заявка</h1>
          <p class="mt-1.5 text-sm text-slate-500">
            Опишите задачу и назначьте исполнителя — заявка сразу получит статус «Новая».
          </p>
        </div>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          Все поля обязательны
        </span>
      </div>

      <AlertBanner v-if="formError" class="mt-5">{{ formError }}</AlertBanner>
      <AlertBanner v-if="profilesError && !profiles.length" class="mt-5">{{ profilesError }}</AlertBanner>

      <form class="mt-6 space-y-6" novalidate @submit.prevent="submit">
        <div>
          <div class="flex items-baseline justify-between gap-3">
            <label for="title" class="label">
              Название <span class="text-rose-500" aria-hidden="true">*</span>
            </label>
            <span class="text-xs text-slate-400">{{ form.title.length }} / 200</span>
          </div>
          <input
            id="title"
            v-model="form.title"
            type="text"
            maxlength="200"
            class="input mt-1.5"
            :class="{ 'input-error': errors.title }"
            placeholder="Например: бот для согласования отпусков"
            :aria-invalid="Boolean(errors.title)"
            :aria-describedby="errors.title ? 'title-error' : undefined"
            required
            @input="errors.title = ''"
          />
          <p v-if="errors.title" id="title-error" class="field-error">{{ errors.title }}</p>
        </div>

        <div>
          <div class="flex items-baseline justify-between gap-3">
            <label for="description" class="label">
              Описание задачи <span class="text-rose-500" aria-hidden="true">*</span>
            </label>
            <span class="text-xs text-slate-400">{{ form.description.length }} / 5000</span>
          </div>
          <textarea
            id="description"
            v-model="form.description"
            rows="6"
            maxlength="5000"
            class="input mt-1.5 resize-y"
            :class="{ 'input-error': errors.description }"
            placeholder="Что нужно автоматизировать, как это работает сейчас и какой результат ожидается?"
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
          <label for="assignee" class="label">
            Исполнитель <span class="text-rose-500" aria-hidden="true">*</span>
          </label>
          <AssigneeSelect
            id="assignee"
            v-model="form.assignee_id"
            class="mt-1.5"
            :profiles="profiles"
            :disabled="submitting || profiles.length === 0"
          />
          <p class="mt-1.5 text-xs text-slate-500">
            Задачу увидит вся команда. Исполнитель сможет двигать её по этапам и комментировать.
          </p>
          <p v-if="errors.assignee" class="field-error">{{ errors.assignee }}</p>
          <p v-else-if="profilesError" class="field-error">
            Список сотрудников недоступен: {{ profilesError }}
          </p>
        </div>

        <fieldset>
          <legend class="label">
            Категория <span class="text-rose-500" aria-hidden="true">*</span>
          </legend>
          <div class="mt-2 grid gap-2.5 sm:grid-cols-2">
            <label
              v-for="option in CATEGORY_OPTIONS"
              :key="option.value"
              class="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition"
              :class="
                form.category === option.value
                  ? 'border-indigo-500 bg-indigo-50/60 ring-4 ring-indigo-500/10'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              "
            >
              <input
                v-model="form.category"
                type="radio"
                name="category"
                :value="option.value"
                class="sr-only"
                @change="errors.category = ''"
              />
              <span
                class="grid size-9 shrink-0 place-items-center rounded-lg"
                :class="
                  form.category === option.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                "
              >
                <CategoryIcon :category="option.value" class="size-5" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-medium text-slate-900">{{ option.label }}</span>
                <span class="mt-0.5 block text-xs leading-snug text-slate-500">
                  {{ option.hint }}
                </span>
              </span>
            </label>
          </div>
          <p v-if="errors.category" class="field-error">{{ errors.category }}</p>
        </fieldset>

        <div
          class="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"
        >
          <RouterLink :to="{ name: 'tickets' }" class="btn-secondary">Отмена</RouterLink>
          <button
            type="submit"
            class="btn-primary"
            :disabled="submitting || profiles.length === 0"
          >
            <Spinner v-if="submitting" :size="16" />
            {{ submitting ? 'Создаём…' : 'Создать заявку' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
