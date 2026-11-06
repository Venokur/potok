import type { TicketCategory, TicketStatus } from '@/types'
import { TICKET_STATUSES } from '@/types'

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'Новая',
  clarification: 'Уточнение',
  in_progress: 'В работе',
  done: 'Завершена',
}

export const STATUS_HINTS: Record<TicketStatus, string> = {
  new: 'Только поступила на доску',
  clarification: 'Нужны детали от автора',
  in_progress: 'Исполнитель уже работает',
  done: 'Задача закрыта',
}

export const STATUS_BADGE_CLASSES: Record<TicketStatus, string> = {
  new: 'bg-sky-50 text-sky-700 ring-sky-200',
  clarification: 'bg-violet-50 text-violet-700 ring-violet-200',
  in_progress: 'bg-amber-50 text-amber-800 ring-amber-200',
  done: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

export const STATUS_DOT_CLASSES: Record<TicketStatus, string> = {
  new: 'bg-sky-500',
  clarification: 'bg-violet-500',
  in_progress: 'bg-amber-500',
  done: 'bg-emerald-500',
}

export const STATUS_OPTIONS = TICKET_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
  hint: STATUS_HINTS[value],
}))

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bot: 'Бот',
  integration: 'Интеграция',
  report: 'Отчёт',
  other: 'Другое',
}

export const CATEGORY_BADGE_CLASSES: Record<TicketCategory, string> = {
  bot: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  integration: 'bg-sky-50 text-sky-700 ring-sky-200',
  report: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  other: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export interface CategoryOption {
  value: TicketCategory
  label: string
  hint: string
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'bot', label: CATEGORY_LABELS.bot, hint: 'Чат-бот или цифровой помощник' },
  { value: 'integration', label: CATEGORY_LABELS.integration, hint: 'Связать сервисы между собой' },
  { value: 'report', label: CATEGORY_LABELS.report, hint: 'Автоматическая выгрузка данных' },
  { value: 'other', label: CATEGORY_LABELS.other, hint: 'Всё, что не вошло в категории выше' },
]
