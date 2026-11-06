interface RuntimeConfig {
  supabaseUrl?: string
  supabaseAnonKey?: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig
  }
}

const runtime = window.__APP_CONFIG__ ?? {}

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * В Docker адрес Supabase проксируется через nginx того же origin,
 * поэтому по умолчанию используем текущий origin — это позволяет открывать
 * приложение и по localhost, и по внешнему адресу туннеля без пересборки.
 */
export const SUPABASE_URL = (runtime.supabaseUrl || envUrl || window.location.origin).replace(/\/+$/, '')
export const SUPABASE_ANON_KEY = runtime.supabaseAnonKey || envKey || ''

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
