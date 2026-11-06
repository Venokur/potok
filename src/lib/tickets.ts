import type {
  Profile,
  Ticket,
  TicketCategory,
  TicketComment,
  TicketEvent,
  TicketInput,
  TicketStatus,
} from '@/types'

import { supabase } from './supabase'

const TICKET_SELECT = [
  'id',
  'user_id',
  'assignee_id',
  'title',
  'description',
  'category',
  'status',
  'created_at',
  'updated_at',
  'author:profiles!tickets_user_id_fkey(id,email,display_name)',
  'assignee:profiles!tickets_assignee_id_fkey(id,email,display_name)',
  'comments(count)',
].join(',')

const COMMENT_SELECT = '*,author:profiles!comments_author_id_fkey(id,email,display_name)'
const EVENT_SELECT = '*,actor:profiles!ticket_events_actor_id_fkey(id,email,display_name)'

type ProfileRef = Profile | Profile[] | null | undefined

interface RawTicket extends Omit<Ticket, 'author' | 'assignee' | 'comment_count'> {
  author?: ProfileRef
  assignee?: ProfileRef
  comments?: { count: number }[] | null
}

interface RawComment extends Omit<TicketComment, 'author'> {
  author?: ProfileRef
}

interface RawEvent extends Omit<TicketEvent, 'actor'> {
  actor?: ProfileRef
}

function normalizeProfile(value: ProfileRef): Profile | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapTicket(raw: RawTicket): Ticket {
  const { author, assignee, comments, ...ticket } = raw

  return {
    ...ticket,
    author: normalizeProfile(author),
    assignee: normalizeProfile(assignee),
    comment_count: comments?.[0]?.count ?? 0,
  }
}

function mapComment(raw: RawComment): TicketComment {
  const { author, ...comment } = raw
  return { ...comment, author: normalizeProfile(author) }
}

function mapEvent(raw: RawEvent): TicketEvent {
  const { actor, ...event } = raw
  return { ...event, actor: normalizeProfile(actor) }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export interface TicketFilters {
  search?: string
  assigneeId?: string
  category?: TicketCategory
}

/** Общая доска: возвращает задачи всех сотрудников (RLS разрешает чтение команде). */
export async function fetchTickets(filters: TicketFilters = {}): Promise<Ticket[]> {
  let query = supabase.from('tickets').select(TICKET_SELECT).order('created_at', { ascending: false })

  if (filters.assigneeId) {
    query = query.eq('assignee_id', filters.assigneeId)
  }

  if (filters.category) {
    query = query.eq('category', filters.category)
  }

  const search = filters.search?.trim()
  if (search) {
    query = query.ilike('title', `%${escapeLike(search)}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as unknown as RawTicket[]).map(mapTicket)
}

export async function fetchTicket(id: string): Promise<Ticket> {
  const { data, error } = await supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('TICKET_NOT_FOUND')
  return mapTicket(data as unknown as RawTicket)
}

export async function createTicket(input: TicketInput): Promise<Ticket> {
  // id генерируем на клиенте: повторная отправка того же запроса не создаст дубликат.
  const payload = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    assignee_id: input.assignee_id,
  }

  const { data, error } = await supabase
    .from('tickets')
    .insert(payload)
    .select(TICKET_SELECT)
    .single()

  if (error) throw error
  return mapTicket(data as unknown as RawTicket)
}

export async function updateTicket(
  id: string,
  patch: Partial<Pick<TicketInput, 'title' | 'description' | 'category' | 'assignee_id'>>,
): Promise<Ticket> {
  const payload: Record<string, string> = {}
  if (patch.title !== undefined) payload.title = patch.title.trim()
  if (patch.description !== undefined) payload.description = patch.description.trim()
  if (patch.category !== undefined) payload.category = patch.category
  if (patch.assignee_id !== undefined) payload.assignee_id = patch.assignee_id

  const { data, error } = await supabase
    .from('tickets')
    .update(payload)
    .eq('id', id)
    .select(TICKET_SELECT)
    .single()

  if (error) throw error
  return mapTicket(data as unknown as RawTicket)
}

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket> {
  const { data, error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', id)
    .select(TICKET_SELECT)
    .single()

  if (error) throw error
  return mapTicket(data as unknown as RawTicket)
}

export async function fetchComments(ticketId: string): Promise<TicketComment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return ((data ?? []) as unknown as RawComment[]).map(mapComment)
}

export async function addComment(ticketId: string, body: string): Promise<TicketComment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ ticket_id: ticketId, body: body.trim() })
    .select(COMMENT_SELECT)
    .single()

  if (error) throw error
  return mapComment(data as unknown as RawComment)
}

export async function fetchTicketEvents(ticketId: string): Promise<TicketEvent[]> {
  const { data, error } = await supabase
    .from('ticket_events')
    .select(EVENT_SELECT)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw error
  return ((data ?? []) as unknown as RawEvent[]).map(mapEvent)
}
