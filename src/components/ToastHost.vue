<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center p-4 sm:right-0 sm:bottom-0 sm:left-auto sm:items-end sm:p-6"
    aria-live="polite"
  >
    <TransitionGroup name="toast" tag="div" class="flex w-full max-w-sm flex-col gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-white p-3.5 shadow-lg shadow-slate-900/10"
        :class="{
          'border-emerald-200': toast.kind === 'success',
          'border-rose-200': toast.kind === 'error',
          'border-indigo-200': toast.kind === 'info',
        }"
      >
        <span
          class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white"
          :class="{
            'bg-emerald-500': toast.kind === 'success',
            'bg-rose-500': toast.kind === 'error',
            'bg-indigo-500': toast.kind === 'info',
          }"
          aria-hidden="true"
        >
          <svg
            v-if="toast.kind === 'success'"
            class="size-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m5 13 4 4L19 7" />
          </svg>
          <svg
            v-else
            class="size-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
          >
            <path d="M12 6v7M12 17h.01" />
          </svg>
        </span>

        <p class="min-w-0 flex-1 text-sm leading-snug text-slate-700">{{ toast.message }}</p>

        <button
          type="button"
          class="-mt-0.5 -mr-1 grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Закрыть уведомление"
          @click="dismiss(toast.id)"
        >
          <svg
            class="size-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
