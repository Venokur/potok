import type { Profile } from '@/types'

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

export function formatDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

/** Русское склонение: pluralize(2, 'заявка', 'заявки', 'заявок') → 'заявки'. */
export function pluralize(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return many
  if (last > 1 && last < 5) return few
  if (last === 1) return one
  return many
}

type NameSource = Pick<Profile, 'display_name' | 'email'> | null | undefined

export function profileName(profile: NameSource): string {
  if (!profile) return 'Сотрудник'

  const name = profile.display_name?.trim()
  if (name) return name

  const email = profile.email?.trim()
  if (email) return email.split('@')[0]

  return 'Сотрудник'
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}
