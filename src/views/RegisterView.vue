<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import AuthLayout from '@/components/AuthLayout.vue'
import Spinner from '@/components/Spinner.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { authErrorMessage } from '@/lib/errors'

const router = useRouter()
const { signUp } = useAuth()
const toast = useToast()

const form = reactive({ email: '', password: '', confirm: '' })
const showPassword = ref(false)
const submitting = ref(false)
const formError = ref('')
const needsConfirmation = ref(false)

const errors = reactive({ email: '', password: '', confirm: '' })

function validate(): boolean {
  errors.email = !form.email.trim()
    ? 'Введите электронную почту'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
      ? 'Проверьте формат почты'
      : ''
  errors.password = !form.password
    ? 'Введите пароль'
    : form.password.length < 6
      ? 'Пароль должен содержать минимум 6 символов'
      : ''
  errors.confirm = !form.confirm
    ? 'Повторите пароль'
    : form.confirm !== form.password
      ? 'Пароли не совпадают'
      : ''

  return !errors.email && !errors.password && !errors.confirm
}

async function submit() {
  if (submitting.value) return
  formError.value = ''
  needsConfirmation.value = false

  if (!validate()) return

  submitting.value = true

  try {
    const result = await signUp(form.email.trim(), form.password)

    if (result.needsConfirmation) {
      needsConfirmation.value = true
      return
    }

    toast.success('Аккаунт создан')
    await router.replace({ name: 'tickets' })
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
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">Создать аккаунт</h1>
      <p class="mt-1.5 text-sm text-slate-500">
        Зарегистрируйтесь, чтобы отправлять заявки и следить за их статусом.
      </p>

      <AlertBanner v-if="formError" class="mt-5">{{ formError }}</AlertBanner>

      <AlertBanner v-if="needsConfirmation" class="mt-5" variant="info">
        Аккаунт создан. Мы отправили письмо на {{ form.email }} — подтвердите почту и войдите.
      </AlertBanner>

      <form class="mt-6 space-y-4" novalidate @submit.prevent="submit">
        <div>
          <label for="email" class="label">Электронная почта</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            name="email"
            autocomplete="email"
            inputmode="email"
            class="input mt-1.5"
            :class="{ 'input-error': errors.email }"
            placeholder="name@company.ru"
            :aria-invalid="Boolean(errors.email)"
            :aria-describedby="errors.email ? 'email-error' : undefined"
            required
            @input="errors.email = ''"
          />
          <p v-if="errors.email" id="email-error" class="field-error">{{ errors.email }}</p>
        </div>

        <div>
          <label for="password" class="label">Пароль</label>
          <div class="relative mt-1.5">
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="new-password"
              class="input pr-12"
              :class="{ 'input-error': errors.password }"
              placeholder="Минимум 6 символов"
              :aria-invalid="Boolean(errors.password)"
              :aria-describedby="errors.password ? 'password-error' : undefined"
              required
              @input="errors.password = ''"
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
          <p v-if="errors.password" id="password-error" class="field-error">{{ errors.password }}</p>
        </div>

        <div>
          <label for="confirm" class="label">Повторите пароль</label>
          <input
            id="confirm"
            v-model="form.confirm"
            :type="showPassword ? 'text' : 'password'"
            name="confirm"
            autocomplete="new-password"
            class="input mt-1.5"
            :class="{ 'input-error': errors.confirm }"
            placeholder="Ещё раз"
            :aria-invalid="Boolean(errors.confirm)"
            :aria-describedby="errors.confirm ? 'confirm-error' : undefined"
            required
            @input="errors.confirm = ''"
          />
          <p v-if="errors.confirm" id="confirm-error" class="field-error">{{ errors.confirm }}</p>
        </div>

        <button type="submit" class="btn-primary mt-2 w-full" :disabled="submitting">
          <Spinner v-if="submitting" :size="16" />
          {{ submitting ? 'Создаём аккаунт…' : 'Зарегистрироваться' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-500">
        Уже есть аккаунт?
        <RouterLink
          :to="{ name: 'login' }"
          class="font-semibold text-indigo-600 transition hover:text-indigo-500"
        >
          Войти
        </RouterLink>
      </p>
    </div>

    <p class="mt-6 text-center text-xs text-slate-400">
      Демо-сервис. Данные хранятся в локальном Supabase.
    </p>
  </AuthLayout>
</template>
