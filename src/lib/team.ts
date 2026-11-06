import type { Profile } from '@/types'

import { supabase } from './supabase'

const PROFILE_FIELDS = 'id, email, display_name, can_view_all_tickets'

/** Справочник сотрудников для выбора исполнителя. */
export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .order('display_name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Profile[]
}

/** Текущий профиль вместе с персональными настройками. */
export async function fetchProfile(id: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as Profile
}

/** Настройка «видеть задачи всей команды». */
export async function updateCanViewAllTickets(id: string, value: boolean): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ can_view_all_tickets: value })
    .eq('id', id)
    .select(PROFILE_FIELDS)
    .single()

  if (error) throw error
  return data as unknown as Profile
}
