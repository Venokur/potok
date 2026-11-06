import type { Profile } from '@/types'

import { supabase } from './supabase'

/** Справочник сотрудников для выбора исполнителя. */
export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .order('display_name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Profile[]
}
