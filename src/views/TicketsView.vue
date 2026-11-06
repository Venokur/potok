<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppSelect from '@/components/AppSelect.vue'
import Spinner from '@/components/Spinner.vue'
import TicketCard from '@/components/TicketCard.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import {
  CATEGORY_DOT_CLASSES,
  CATEGORY_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from '@/lib/constants'
import { dataErrorMessage } from '@/lib/errors'
import { pluralize } from '@/lib/format'
import { fetchProfile } from '@/lib/team'
import { fetchTickets, updateTicketStatus } from '@/lib/tickets'
import type { Ticket, TicketCategory, TicketStatus } from '@/types'

type BoardFilter = 'all' | 'me'

const { user } = useAuth()
const toast = useToast()

const tickets = ref<Ticket[]>([])
const search = ref('')
const category = ref('all')
const boardFilter = ref<BoardFilter>('all')
const canViewAll = ref<boolean | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')

const draggingId = ref<string | null>(null)
const dropTarget = ref<TicketStatus | null>(null)
const movingId = ref<string | null>(null)
const movingStatus = ref<TicketStatus | null>(null)

let requestId = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

const columns = STATUS_OPTIONS

const categoryOptions = computed(() => [
  { value: 'all', label: 'Все категории', dotClass: 'bg-slate-300' },
  ...CATEGORY_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    dotClass: CATEGORY_DOT_CLASSES[option.value],
  })),
])

const grouped = computed(() => {
  const result: Record<TicketStatus, Ticket[]> = {
    new: [],
    clarification: [],
    in_progress: [],
    done: [],
  }

  for (const ticket of tickets.value) {
    result[ticket.status].push(ticket)
  }
  return result
})

const myCount = computed(
  () => tickets.value.filter((ticket) => ticket.assignee_id === user.value?.id).length,
)

const subtitle = computed(() => {
  if (loading.value) return 'Загружаем задачи…'

  const total = tickets.value.length
  const count = `${total} ${pluralize(total, 'задача', 'задачи', 'задач')}`

  if (boardFilter.value === 'me') return `${count} назначено на вас`
  return myCount.value > 0 ? `${count} · ${myCount.value} на вас` : count
})

const hasFilters = computed(
  () =>
    search.value.trim().length > 0 ||
    boardFilter.value !== 'all' ||
    category.value !== 'all',
)

async function load(mode: 'initial' | 'refresh' = 'refresh') {
  const currentRequest = ++requestId

  if (mode === 'initial') loading.value = true
  else refreshing.value = true
  error.value = ''

  try {
    const data = await fetchTickets({
      search: search.value,
      assigneeId: boardFilter.value === 'me' ? user.value?.id : undefined,
      category: category.value === 'all' ? undefined : (category.value as TicketCategory),
    })
    if (currentRequest === requestId) tickets.value = data
  } catch (cause) {
    if (currentRequest === requestId) {
      error.value = dataErrorMessage(cause)
      toast.error('Не удалось загрузить доску')
    }
  } finally {
    if (currentRequest === requestId) {
      loading.value = false
      refreshing.value = false
    }
  }
}

function onDragStart(id: string) {
  draggingId.value = id
}

function onDragEnd() {
  draggingId.value = null
  dropTarget.value = null
}

function onDragOver(status: TicketStatus) {
  if (draggingId.value) dropTarget.value = status
}

async function onDrop(status: TicketStatus) {
  const id = draggingId.value
  onDragEnd()

  if (!id || movingId.value) return

  const ticket = tickets.value.find((item) => item.id === id)
  if (!ticket || ticket.status === status) return

  movingId.value = id
  movingStatus.value = status

  try {
    const updated = await updateTicketStatus(id, status)
    const index = tickets.value.findIndex((item) => item.id === id)
    if (index !== -1) tickets.value[index] = updated
    toast.success(`Задача перемещена в «${STATUS_LABELS[status]}»`)
  } catch (cause) {
    toast.error(dataErrorMessage(cause))
    await load()
  } finally {
    movingId.value = null
    movingStatus.value = null
  }
}

function resetFilters() {
  search.value = ''
  boardFilter.value = 'all'
  category.value = 'all'
}

watch(boardFilter, () => load())
watch(category, () => load())
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(), 300)
})

onMounted(() => {
  load('initial')

  if (user.value) {
    fetchProfile(user.value.id)
      .then((profile) => {
        canViewAll.value = profile.can_view_all_tickets ?? false
      })
      .catch(() => {
        canViewAll.value = null
      })
  }
})

onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <div class="mx-auto w-full max-w-[92rem] px-4 py-8 sm:px-6 sm:py-10">
    <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold tracking-widest text-indigo-600 uppercase">
          Рабочее пространство
        </p>
        <h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Доска задач
        </h1>
        <p class="mt-1.5 text-sm text-slate-500">{{ subtitle }}</p>
      </div>

      <RouterLink :to="{ name: 'ticket-new' }" class="btn-primary w-full sm:w-auto">
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Новая заявка
      </RouterLink>
    </div>

    <div
      class="panel mt-6 flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="relative w-full sm:w-72">
        <svg
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          v-model="search"
          type="search"
          class="input pr-10 pl-9"
          placeholder="Поиск по названию"
          aria-label="Поиск по названию задачи"
        />
        <button
          v-if="search"
          type="button"
          class="absolute inset-y-0 right-0 grid w-9 place-items-center rounded-r-xl text-slate-400 transition hover:text-slate-600"
          aria-label="Очистить поиск"
          @click="search = ''"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        </div>

        <AppSelect
          v-model="category"
          compact
          :options="categoryOptions"
          aria-label="Фильтр по категории"
        />
      </div>

      <div class="flex items-center justify-end gap-2">
        <Spinner v-if="refreshing" :size="14" class="shrink-0 text-slate-400" />
        <div class="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Фильтр доски">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
            :class="
              boardFilter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            "
            :aria-pressed="boardFilter === 'all'"
            @click="boardFilter = 'all'"
          >
            Все задачи
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
            :class="
              boardFilter === 'me'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            "
            :aria-pressed="boardFilter === 'me'"
            @click="boardFilter = 'me'"
          >
            Мои задачи
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="canViewAll !== null"
      class="mt-3 flex flex-col gap-2 rounded-xl border px-4 py-3 text-xs leading-relaxed sm:flex-row sm:items-center sm:justify-between"
      :class="
        canViewAll
          ? 'border-indigo-200 bg-indigo-50/60 text-indigo-800'
          : 'border-slate-200 bg-white text-slate-600'
      "
    >
      <p class="flex items-start gap-2">
        <svg
          v-if="canViewAll"
          class="mt-0.5 size-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
        <svg
          v-else
          class="mt-0.5 size-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        <span v-if="canViewAll">
          Обзор всей доски включён: видны задачи команды, но менять чужие задачи по-прежнему
          могут только автор и исполнитель.
        </span>
        <span v-else>
          Приватный режим: видны только ваши задачи и задачи, назначенные на вас.
        </span>
      </p>
      <RouterLink
        :to="{ name: 'settings' }"
        class="shrink-0 font-semibold underline decoration-current/30 underline-offset-2 transition hover:decoration-current"
      >
        {{ canViewAll ? 'Изменить настройку' : 'Показать всю доску' }}
      </RouterLink>
    </div>

    <div v-if="loading" class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="column in columns" :key="column.value" class="rounded-2xl border border-slate-200/70 bg-slate-100/60 p-3">
        <div class="mb-3 h-5 w-28 animate-pulse rounded bg-slate-200/80" />
        <div class="space-y-2.5">
          <div v-for="index in 2" :key="index" class="h-28 animate-pulse rounded-xl bg-white/80" />
        </div>
      </div>
    </div>

    <div v-else-if="error" class="panel mt-5 px-6 py-14 text-center">
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
      <h2 class="mt-4 text-base font-semibold text-slate-900">Не удалось загрузить доску</h2>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">{{ error }}</p>
      <button type="button" class="btn-secondary mt-5" @click="load()">Попробовать снова</button>
    </div>

    <template v-else>
      <div v-if="tickets.length === 0 && hasFilters" class="panel mt-5 px-6 py-12 text-center">
        <h2 class="text-base font-semibold text-slate-900">Ничего не найдено</h2>
        <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Попробуйте изменить запрос или переключиться на все задачи.
        </p>
        <button
          type="button"
          class="btn-secondary mt-5"
          @click="resetFilters"
        >
          Сбросить фильтры
        </button>
      </div>

      <div v-else class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section
          v-for="column in columns"
          :key="column.value"
          class="flex min-h-[17rem] flex-col rounded-2xl border p-3 transition"
          :class="
            dropTarget === column.value && draggingId
              ? 'border-indigo-400 bg-indigo-50/60 ring-4 ring-indigo-500/10'
              : 'border-slate-200/70 bg-slate-100/60'
          "
          @dragover.prevent="onDragOver(column.value)"
          @drop.prevent="onDrop(column.value)"
        >
          <header class="flex items-center justify-between gap-2 px-1">
            <div class="flex min-w-0 items-center gap-2">
              <span
                class="size-2 shrink-0 rounded-full"
                :class="{
                  'bg-sky-500': column.value === 'new',
                  'bg-violet-500': column.value === 'clarification',
                  'bg-amber-500': column.value === 'in_progress',
                  'bg-emerald-500': column.value === 'done',
                }"
              />
              <h2 class="truncate text-sm font-semibold text-slate-700">{{ column.label }}</h2>
              <span
                class="rounded-md bg-white px-1.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 ring-inset"
              >
                {{ grouped[column.value].length }}
              </span>
            </div>
            <Spinner
              v-if="movingStatus === column.value"
              :size="14"
              class="shrink-0 text-slate-400"
            />
          </header>
          <p class="mt-0.5 mb-3 px-1 text-xs leading-snug text-slate-400">{{ column.hint }}</p>

          <div class="flex flex-1 flex-col gap-2.5">
            <TicketCard
              v-for="ticket in grouped[column.value]"
              :key="ticket.id"
              :ticket="ticket"
              :current-user-id="user?.id"
              :dragging="draggingId === ticket.id || movingId === ticket.id"
              @dragstart="onDragStart"
              @dragend="onDragEnd"
            />

            <div
              v-if="grouped[column.value].length === 0"
              class="grid flex-1 place-items-center rounded-xl border border-dashed border-slate-300/70 px-3 py-8 text-center text-xs leading-relaxed text-slate-400"
            >
              {{ draggingId && dropTarget === column.value ? 'Отпустите задачу здесь' : 'Нет задач' }}
            </div>
          </div>
        </section>
      </div>
    </template>

    <p class="mt-4 flex items-start gap-2 px-1 text-xs leading-relaxed text-slate-400">
      <svg
        class="mt-0.5 size-3.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5M18.5 20a6 6 0 0 0-2.5-4.9" />
      </svg>
      По умолчанию доска приватная: вы видите свои задачи и назначенные на вас. Обзор всей
      команды включается в настройках. Права проверяются политиками Supabase RLS, а действия
      попадают в историю.
    </p>
  </div>
</template>
