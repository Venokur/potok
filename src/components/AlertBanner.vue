<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'error' | 'info' }>(), { variant: 'error' })
</script>

<template>
  <div
    class="flex items-start gap-2.5 rounded-xl border p-3.5 text-sm"
    :class="
      variant === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-indigo-200 bg-indigo-50 text-indigo-700'
    "
    role="alert"
  >
    <svg
      class="mt-0.5 size-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <circle v-if="variant === 'error'" cx="12" cy="12" r="9" />
      <path v-if="variant === 'error'" d="M12 8v5M12 16h.01" />
      <circle v-else cx="12" cy="12" r="9" />
      <path v-if="variant === 'info'" d="M12 11v5M12 8h.01" />
    </svg>
    <div class="min-w-0 flex-1">
      <slot />
    </div>
  </div>
</template>
