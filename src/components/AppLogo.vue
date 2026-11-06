<script setup lang="ts">
withDefaults(defineProps<{ light?: boolean; compact?: boolean }>(), {
  light: false,
  compact: false,
})
</script>

<template>
  <span class="flex items-center gap-2.5">
    <span
      class="grid size-9 shrink-0 place-items-center rounded-xl"
      :class="
        light
          ? 'bg-white/15 text-white ring-1 ring-white/25'
          : 'bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-sm shadow-indigo-500/30'
      "
    >
      <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M13.5 3 5.5 14h5l-1 7 8-11h-5l1-7Z"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <span
      v-if="!compact"
      class="text-lg font-semibold tracking-tight"
      :class="light ? 'text-white' : 'text-slate-900'"
      >Поток</span
    >
  </span>
</template>
