import type { User } from '@supabase/supabase-js'
import { computed, ref } from 'vue'

import { supabase } from '@/lib/supabase'

const user = ref<User | null>(null)
const initializing = ref(true)
let initPromise: Promise<void> | null = null

/**
 * Загружает сессию один раз и дальше слушает изменения авторизации.
 * Вызывается из router guard и из main.ts.
 */
export function initAuth(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const { data } = await supabase.auth.getSession()
      user.value = data.session?.user ?? null
    } catch {
      // Supabase может быть ещё недоступен — не блокируем рендер приложения.
      user.value = null
    } finally {
      initializing.value = false
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
  })()

  return initPromise
}

export function useAuth() {
  const isAuthenticated = computed(() => Boolean(user.value))

  async function signIn(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    user.value = data.user
  }

  async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    user.value = data.session?.user ?? null
    return { needsConfirmation: !data.session }
  }

  async function signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
  }

  return { user, initializing, isAuthenticated, signIn, signUp, signOut }
}
