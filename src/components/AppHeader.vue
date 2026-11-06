<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import AppLogo from '@/components/AppLogo.vue'
import Spinner from '@/components/Spinner.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { user, signOut } = useAuth()
const toast = useToast()

const isSigningOut = ref(false)

async function handleSignOut() {
  if (isSigningOut.value) return
  isSigningOut.value = true

  try {
    await signOut()
    toast.success('Вы вышли из аккаунта')
    await router.push({ name: 'login' })
  } catch {
    toast.error('Не удалось выйти из аккаунта. Попробуйте ещё раз.')
  } finally {
    isSigningOut.value = false
  }
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <RouterLink
        :to="{ name: 'tickets' }"
        class="rounded-lg focus-visible:ring-4 focus-visible:ring-indigo-500/20 focus-visible:outline-none"
        aria-label="Поток — к списку заявок"
      >
        <AppLogo />
      </RouterLink>

      <div class="flex items-center gap-1 sm:gap-2">
        <span class="hidden max-w-52 truncate text-sm text-slate-500 lg:block" :title="user?.email">
          {{ user?.email }}
        </span>
        <RouterLink
          :to="{ name: 'settings' }"
          class="btn-ghost"
          aria-label="Настройки аккаунта"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
            />
          </svg>
          <span class="hidden sm:inline">Настройки</span>
        </RouterLink>
        <button type="button" class="btn-ghost" :disabled="isSigningOut" @click="handleSignOut">
          <Spinner v-if="isSigningOut" :size="16" />
          <svg
            v-else
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
          </svg>
          <span class="hidden sm:inline">Выйти</span>
          <span class="sr-only sm:hidden">Выйти из аккаунта</span>
        </button>
      </div>
    </div>
  </header>
</template>
