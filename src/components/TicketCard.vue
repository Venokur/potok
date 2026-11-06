<script setup lang="ts">
import { computed, ref } from 'vue'

import { profileName, formatDate } from '@/lib/format'
import type { Ticket } from '@/types'

import CategoryBadge from './CategoryBadge.vue'
import UserAvatar from './UserAvatar.vue'

const props = defineProps<{
  ticket: Ticket
  currentUserId?: string
  dragging?: boolean
}>()

const emit = defineEmits<{
  dragstart: [id: string]
  dragend: []
}>()

const suppressClick = ref(false)
const assignee = computed(() => profileName(props.ticket.assignee))
const isMine = computed(() => props.ticket.assignee_id === props.currentUserId)

function onDragStart() {
  suppressClick.value = true
  emit('dragstart', props.ticket.id)
}

function onDragEnd() {
  emit('dragend')
  setTimeout(() => {
    suppressClick.value = false
  }, 200)
}

function onClick(event: MouseEvent) {
  if (suppressClick.value) event.preventDefault()
}
</script>

<template>
  <RouterLink
    :to="{ name: 'ticket-detail', params: { id: ticket.id } }"
    draggable="true"
    class="group block rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-indigo-200 hover:shadow-md focus-visible:ring-4 focus-visible:ring-indigo-500/20 focus-visible:outline-none"
    :class="{ 'pointer-events-none opacity-40': dragging }"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click="onClick"
  >
    <div class="flex items-center justify-between gap-2">
      <CategoryBadge :category="ticket.category" />
      <span
        v-if="ticket.comment_count > 0"
        class="inline-flex items-center gap-1 text-xs text-slate-400"
        :title="`Комментариев: ${ticket.comment_count}`"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
        </svg>
        {{ ticket.comment_count }}
      </span>
    </div>

    <p
      class="mt-2.5 line-clamp-2 text-sm leading-snug font-medium text-slate-900 transition group-hover:text-indigo-600"
    >
      {{ ticket.title }}
    </p>
    <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
      {{ ticket.description }}
    </p>

    <div class="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
      <span class="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
        <UserAvatar :profile="ticket.assignee" />
        <span class="truncate">{{ assignee }}</span>
        <span v-if="isMine" class="shrink-0 text-slate-400">(вы)</span>
      </span>
      <span class="shrink-0 text-[11px] text-slate-400">{{ formatDate(ticket.created_at) }}</span>
    </div>
  </RouterLink>
</template>
