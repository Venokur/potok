<script setup lang="ts">
import { computed } from 'vue'

import { initials, profileName } from '@/lib/format'
import type { Profile } from '@/types'

const props = withDefaults(
  defineProps<{
    profile?: Profile | null
    name?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { profile: null, name: '', size: 'sm' },
)

const palettes = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
]

const label = computed(() => props.name.trim() || profileName(props.profile))
const letters = computed(() => initials(label.value))

const palette = computed(() => {
  const source = props.profile?.id ?? label.value
  let hash = 0
  for (const char of source) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997
  }
  return palettes[hash % palettes.length]
})

const sizeClass = computed(() => {
  if (props.size === 'md') return 'size-8 text-xs'
  if (props.size === 'lg') return 'size-10 text-sm'
  return 'size-6 text-[10px]'
})
</script>

<template>
  <span
    class="inline-grid shrink-0 place-items-center rounded-full font-semibold select-none"
    :class="[palette, sizeClass]"
    :title="label"
    aria-hidden="true"
  >
    {{ letters }}
  </span>
</template>
