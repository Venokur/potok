import { createClient } from '@supabase/supabase-js'

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'anon-key-is-not-configured', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
