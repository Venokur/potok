<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppHeader from '@/components/AppHeader.vue'
import ToastHost from '@/components/ToastHost.vue'
import { isSupabaseConfigured } from '@/lib/config'

const route = useRoute()
const showChrome = computed(() => route.meta.layout !== 'auth')
</script>

<template>
  <div
    v-if="!isSupabaseConfigured"
    class="flex min-h-dvh items-center justify-center p-6"
  >
    <div class="panel max-w-lg p-6">
      <h1 class="text-lg font-semibold text-slate-900">Приложение не настроено</h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Не найден anon-ключ Supabase. Запустите приложение через
        <code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">docker compose up --build</code>
        или задайте <code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>
        для локальной разработки.
      </p>
    </div>
  </div>

  <template v-else>
    <div class="flex min-h-dvh flex-col">
      <AppHeader v-if="showChrome" />

      <main class="flex-1">
        <RouterView />
      </main>

      <footer v-if="showChrome" class="border-t border-slate-200/70 py-6">
        <div
          class="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <p>Поток — заявки на автоматизацию</p>
          <p class="inline-flex items-center gap-1.5">
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
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Права на изменение проверяются политиками Supabase RLS
          </p>
        </div>
      </footer>
    </div>

    <ToastHost />
  </template>
</template>
