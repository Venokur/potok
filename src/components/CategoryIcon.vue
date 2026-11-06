<script setup lang="ts">
import type { TicketCategory } from '@/types'

defineProps<{ category: TicketCategory }>()
</script>

<template>
  <svg
    v-if="category === 'bot'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 8V4M9 14h.01M15 14h.01M9 17h6" />
  </svg>
  <svg
    v-else-if="category === 'integration'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M9 15 15 9M7.5 6.5 9 5a4 4 0 0 1 5.7 5.7l-1.5 1.5M16.5 17.5 15 19a4 4 0 0 1-5.7-5.7l1.5-1.5" />
  </svg>
  <svg
    v-else-if="category === 'report'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M4 20h16M7 20v-6M12 20V8M17 20v-9" />
  </svg>
  <svg
    v-else
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="3" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
    <path d="M4 20h5M17 4h3v3" />
  </svg>
</template>
