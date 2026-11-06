<script setup lang="ts">
import type { TicketStatus } from '@/types'
import { STATUS_BADGE_CLASSES, STATUS_DOT_CLASSES, STATUS_LABELS } from '@/lib/constants'

defineProps<{ status: TicketStatus }>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset"
    :class="STATUS_BADGE_CLASSES[status]"
  >
    <span class="size-1.5 rounded-full" :class="STATUS_DOT_CLASSES[status]" />
    {{ STATUS_LABELS[status] }}
  </span>
</template>
