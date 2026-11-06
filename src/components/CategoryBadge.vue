<script setup lang="ts">
import type { TicketCategory } from '@/types'
import { CATEGORY_BADGE_CLASSES, CATEGORY_LABELS } from '@/lib/constants'
import CategoryIcon from './CategoryIcon.vue'

defineProps<{ category: TicketCategory }>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset"
    :class="CATEGORY_BADGE_CLASSES[category]"
  >
    <CategoryIcon :category="category" class="size-3.5" />
    {{ CATEGORY_LABELS[category] }}
  </span>
</template>
