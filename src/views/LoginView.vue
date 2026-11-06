<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import AuthLayout from '@/components/AuthLayout.vue'
import Spinner from '@/components/Spinner.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { authErrorMessage } from '@/lib/errors'

const route = useRoute()
const router = useRouter()
const { signIn } = useAuth()
const toast = useToast()

const form = reactive({ email: '', password: '' })
const showPassword = ref(false)
const submitting = ref(false)
const formError = ref('')

async function submit() {
  if (submitting.value) return
  formError.value = ''

  if (!form.email.trim() || !form.password) {
    formError.value = 'Заполните почту и пароль.'
    return
  }

  submitting.value = true

  try {
    await signIn(form.email.trim(), form.password)
    toast.success('Вы вошли в аккаунт')

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.replace(redirect.startsWith('/') ? redirect : { name: 'tickets' })
  } catch (error) {
    formError.value = authErrorMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="panel p-6 sm:p-8">
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">Вход в аккаунт</h1>
      <p class="mt-1.5 text-sm text-slate-500">Продолжите работу с заявками на автоматизацию.</p>

      <AlertBanner v-if="formError" class="mt-5">{{ formError }}</AlertBanner>

      <form class="mt-6 space-y-4" novalidate @submit.prevent="submit">
        <div>
          <label for="email" class="label">Электронная почта</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            name="email"
            autocomplete="username"
            inputmode="email"
            class="input mt-1.5"
            placeholder="name@company.ru"
            required
          />
        </div>

        <div>
          <label for="password" class="label">Пароль</label>
          <div class="relative mt-1.5">
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              class="input pr-12"
              placeholder="Ваш пароль"
              required
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-400 transition hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
              :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
              @click="showPassword = !showPassword"
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
                <path v-if="showPassword" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path
                  d="M9.9 5.2A9.4 9.4 0 0 1 12 5c5 0 9 4.5 9 7a11 11 0 0 1-2.4 3.8M6.6 6.6C4.1 8.2 3 10.3 3 12c0 2.5 4 7 9 7 1.2 0 2.3-.2 3.3-.7"
                />
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" class="btn-primary mt-2 w-full" :disabled="submitting">
          <Spinner v-if="submitting" :size="16" />
          {{ submitting ? 'Входим…' : 'Войти' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-500">
        Нет аккаунта?
        <RouterLink
          :to="{ name: 'register' }"
          class="font-semibold text-indigo-600 transition hover:text-indigo-500"
        >
          Зарегистрироваться
        </RouterLink>
      </p>
    </div>

    <p class="mt-6 text-center text-xs text-slate-400">
      Демо-сервис. Данные хранятся в локальном Supabase.
    </p>
  </AuthLayout>
</template>
