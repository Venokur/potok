<script setup lang="ts">
import { STATUS_DOT_CLASSES, STATUS_OPTIONS } from '@/lib/constants'
import type { TicketStatus } from '@/types'

import Spinner from './Spinner.vue'

defineProps<{
  value: TicketStatus
  pending?: TicketStatus | null
  disabled?: boolean
}>()

const emit = defineEmits<{ change: [status: TicketStatus] }>()
</script>

<template>
  <div
    class="grid w-full max-w-lg grid-cols-2 gap-1 rounded-xl bg-slate-200/60 p-1 sm:grid-cols-4"
    role="group"
    aria-label="Этап задачи"
  >
    <button
      v-for="option in STATUS_OPTIONS"
      :key="option.value"
      type="button"
      class="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 sm:text-[13px]"
      :class="
        value === option.value
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-800'
      "
      :title="option.hint"
      :aria-pressed="value === option.value"
      :disabled="disabled || Boolean(pending)"
      @click="emit('change', option.value)"
    >
      <Spinner v-if="pending === option.value" :size="14" />
      <span v-else class="size-1.5 rounded-full" :class="STATUS_DOT_CLASSES[option.value]" />
      {{ option.label }}
    </button>
  </div>
</template>
