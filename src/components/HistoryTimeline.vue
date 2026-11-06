<script setup lang="ts">
import { computed } from 'vue'

import { STATUS_LABELS } from '@/lib/constants'
import { formatDateTime, profileName } from '@/lib/format'
import type { Profile, TicketEvent, TicketStatus } from '@/types'

const props = defineProps<{
  events: TicketEvent[]
  profiles: Profile[]
}>()

const names = computed(() => {
  const map = new Map<string, string>()
  for (const profile of props.profiles) map.set(profile.id, profileName(profile))
  return map
})

function assigneeName(id: unknown): string {
  if (typeof id !== 'string') return '—'
  return names.value.get(id) ?? 'Сотрудник'
}

function statusLabel(value: unknown): string {
  if (typeof value !== 'string') return '—'
  return STATUS_LABELS[value as TicketStatus] ?? value
}

function eventText(event: TicketEvent): string {
  switch (event.kind) {
    case 'created':
      return 'Задача создана'
    case 'status_changed':
      return `Статус: ${statusLabel(event.payload.from)} → ${statusLabel(event.payload.to)}`
    case 'assignee_changed':
      return `Исполнитель: ${assigneeName(event.payload.from)} → ${assigneeName(event.payload.to)}`
    case 'updated':
      return 'Обновлены детали задачи'
    case 'comment_added':
      return 'Добавлен комментарий'
    default:
      return 'Изменение'
  }
}

function eventColor(event: TicketEvent): string {
  switch (event.kind) {
    case 'created':
      return 'bg-indigo-50 text-indigo-600'
    case 'status_changed':
      return 'bg-amber-50 text-amber-600'
    case 'assignee_changed':
      return 'bg-sky-50 text-sky-600'
    case 'updated':
      return 'bg-slate-100 text-slate-500'
    case 'comment_added':
      return 'bg-emerald-50 text-emerald-600'
    default:
      return 'bg-slate-100 text-slate-500'
  }
}

function excerpt(event: TicketEvent): string {
  const value = event.payload.excerpt
  return typeof value === 'string' ? value : ''
}
</script>

<template>
  <div v-if="events.length === 0" class="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
    <p class="text-sm text-slate-500">История пока пуста</p>
    <p class="mt-1 text-xs text-slate-400">Здесь появятся изменения статуса, исполнителя и комментарии.</p>
  </div>

  <ol
    v-else
    class="relative mt-4 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-4 before:w-px before:bg-slate-200"
  >
    <li v-for="event in events" :key="event.id" class="relative flex gap-3">
      <span
        class="relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-white"
        :class="eventColor(event)"
      >
        <svg
          v-if="event.kind === 'created'"
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <svg
          v-else-if="event.kind === 'status_changed'"
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 8h13l-3-3M20 16H7l3 3" />
        </svg>
        <svg
          v-else-if="event.kind === 'assignee_changed'"
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
        <svg
          v-else-if="event.kind === 'updated'"
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z" />
        </svg>
        <svg
          v-else
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
        </svg>
      </span>

      <div class="min-w-0 pt-0.5">
        <p class="text-sm leading-snug text-slate-700">{{ eventText(event) }}</p>
        <p class="mt-0.5 text-xs text-slate-400">
          {{ profileName(event.actor) }} · {{ formatDateTime(event.created_at) }}
        </p>
        <p v-if="excerpt(event)" class="mt-1 line-clamp-2 text-xs text-slate-500">
          «{{ excerpt(event) }}»
        </p>
      </div>
    </li>
  </ol>
</template>
