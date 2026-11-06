<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AlertBanner from '@/components/AlertBanner.vue'
import Spinner from '@/components/Spinner.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { dataErrorMessage } from '@/lib/errors'
import { profileName } from '@/lib/format'
import { fetchProfile, updateCanViewAllTickets } from '@/lib/team'
import type { Profile } from '@/types'

const { user } = useAuth()
const toast = useToast()

const profile = ref<Profile | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const canViewAll = ref(false)

const displayName = computed(() => profileName(profile.value ?? { email: user.value?.email ?? '', display_name: '' }))

async function load() {
  if (!user.value) return

  loading.value = true
  error.value = ''

  try {
    const data = await fetchProfile(user.value.id)
    profile.value = data
    canViewAll.value = data.can_view_all_tickets ?? false
  } catch (cause) {
    error.value = dataErrorMessage(cause)
  } finally {
    loading.value = false
  }
}

async function toggle() {
  if (!user.value || saving.value || loading.value) return

  const next = !canViewAll.value
  saving.value = true
  error.value = ''

  try {
    const updated = await updateCanViewAllTickets(user.value.id, next)
    profile.value = updated
    canViewAll.value = updated.can_view_all_tickets ?? next
    toast.success(next ? 'Обзор всей доски включён' : 'Доска снова приватная')
  } catch (cause) {
    error.value = dataErrorMessage(cause)
    toast.error(error.value)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
    <RouterLink
      :to="{ name: 'tickets' }"
      class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
    >
      <svg
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      К доске
    </RouterLink>

    <h1 class="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Настройки</h1>
    <p class="mt-1.5 text-sm text-slate-500">Аккаунт и приватность доски.</p>

    <AlertBanner v-if="error" class="mt-5">{{ error }}</AlertBanner>

    <section class="panel mt-5 p-5 sm:p-6">
      <h2 class="text-lg font-semibold text-slate-900">Аккаунт</h2>

      <div v-if="loading" class="mt-4 flex items-center gap-3">
        <div class="size-10 animate-pulse rounded-full bg-slate-100" />
        <div class="space-y-2">
          <div class="h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div class="h-3 w-48 animate-pulse rounded bg-slate-100" />
        </div>
      </div>

      <div v-else class="mt-4 flex items-center gap-3">
        <UserAvatar :profile="profile" size="lg" />
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-slate-900">{{ displayName }}</p>
          <p class="truncate text-sm text-slate-500">{{ user?.email }}</p>
        </div>
      </div>
    </section>

    <section class="panel mt-5 p-5 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-semibold text-slate-900">Видимость задач команды</h2>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="
                canViewAll
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 ring-inset'
                  : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 ring-inset'
              "
            >
              {{ canViewAll ? 'Включено' : 'Выключено' }}
            </span>
          </div>
          <p class="mt-1.5 text-sm leading-relaxed text-slate-500">
            По умолчанию вы видите только задачи, которые создали сами, и задачи, назначенные
            на вас. Включите обзор, чтобы просматривать доску всей команды.
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2 pt-1">
          <Spinner v-if="saving" :size="16" class="text-slate-400" />
          <button
            type="button"
            role="switch"
            :aria-checked="canViewAll"
            :disabled="saving || loading"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:ring-4 focus-visible:ring-indigo-500/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            :class="canViewAll ? 'bg-indigo-600' : 'bg-slate-300'"
            aria-label="Показывать задачи всей команды"
            @click="toggle"
          >
            <span
              class="inline-block size-5 rounded-full bg-white shadow-sm transition"
              :class="canViewAll ? 'translate-x-[22px]' : 'translate-x-0.5'"
            />
          </button>
        </div>
      </div>

      <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <p class="text-sm font-medium text-slate-700">Как это работает</p>
        <ul class="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
          <li class="flex items-start gap-2">
            <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            Свои задачи и задачи, назначенные на вас, видны всегда — с ними можно работать.
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            Включённый обзор показывает задачи всей команды, но не даёт права их менять:
            редактировать и двигать чужие задачи по-прежнему могут только автор и исполнитель.
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            Настройка индивидуальная: она расширяет только ваш обзор и не открывает ваши задачи
            другим сотрудникам.
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            Изменение сохраняется сразу и действует на уровне базы данных (RLS), в том числе
            при прямых запросах к API.
          </li>
        </ul>
      </div>

      <button
        v-if="error && !loading"
        type="button"
        class="btn-secondary mt-4"
        @click="load"
      >
        Попробовать снова
      </button>
    </section>
  </div>
</template>
