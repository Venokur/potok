export const TICKET_STATUSES = ['new', 'clarification', 'in_progress', 'done'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_CATEGORIES = ['bot', 'integration', 'report', 'other'] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

export interface Profile {
  id: string
  email: string
  display_name: string
  can_view_all_tickets?: boolean
}

export interface Ticket {
  id: string
  user_id: string
  assignee_id: string
  title: string
  description: string
  category: TicketCategory
  status: TicketStatus
  created_at: string
  updated_at: string
  author?: Profile | null
  assignee?: Profile | null
  comment_count: number
}

export interface TicketInput {
  title: string
  description: string
  category: TicketCategory
  assignee_id: string
}

export interface TicketComment {
  id: string
  ticket_id: string
  author_id: string
  body: string
  created_at: string
  author?: Profile | null
}

export type TicketEventKind =
  | 'created'
  | 'status_changed'
  | 'assignee_changed'
  | 'updated'
  | 'comment_added'

export interface TicketEvent {
  id: number
  ticket_id: string
  actor_id: string | null
  kind: TicketEventKind
  payload: Record<string, unknown>
  created_at: string
  actor?: Profile | null
}
