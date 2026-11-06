// Проверка общей доски: видимость задач для команды, права автора/исполнителя,
// комментарии и история действий.
//
// Запуск: npm run smoke  (или node scripts/smoke-test.mjs)
// Требует запущенный `docker compose up` и Node.js 20+.
// Оставляет тестовых пользователей smoke-*@potok.local; как удалить — см. README.

import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.SUPABASE_URL || 'http://localhost:8080'
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdG9rLWxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDAwMDAsImV4cCI6MjA4ODAwMDAwMH0.LBch0AEseAYRU7pAaIjFnXCIf6T7a7y3aquAABL9Euo'

const password = 'potok-smoke-123'
const stamp = Date.now()

const results = []

function check(name, ok, details = '') {
  results.push({ name, ok })
  const mark = ok ? '\u001b[32mPASS\u001b[0m' : '\u001b[31mFAIL\u001b[0m'
  console.log(`${mark}  ${name}${details ? ` — ${details}` : ''}`)
}

function makeClient() {
  return createClient(BASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function signUp(tag) {
  const client = makeClient()
  const email = `smoke-${tag}-${stamp}@potok.local`
  const { data, error } = await client.auth.signUp({ email, password })
  if (error) throw error
  if (!data.session) throw new Error(`no session for ${email}`)
  return { client, id: data.user.id, email }
}

const anna = await signUp('anna')
const ivan = await signUp('ivan')
const oleg = await signUp('oleg')

const ticketSelect =
  '*,author:profiles!tickets_user_id_fkey(display_name),assignee:profiles!tickets_assignee_id_fkey(display_name),comments(count)'

const ticketId = crypto.randomUUID()
let ticketRemoved = false

try {
  const profiles = await oleg.client.from('profiles').select('id,email')
  check(
    'справочник сотрудников доступен',
    (profiles.data ?? []).some((profile) => profile.id === ivan.id),
    profiles.error?.message,
  )

  const created = await anna.client
    .from('tickets')
    .insert({
      id: ticketId,
      title: `Smoke-задача ${stamp}`,
      description: 'Проверяем общую доску, исполнителя, комментарии и историю.',
      category: 'bot',
      assignee_id: ivan.id,
    })
    .select(ticketSelect)
    .single()

  check('задача создана и назначена исполнителю', created.data?.assignee_id === ivan.id, created.error?.message)
  check('новая задача получает этап new', created.data?.status === 'new')
  check('к задаче приходят автор и исполнитель', Boolean(created.data?.author && created.data?.assignee))

  const listIvan = await ivan.client.from('tickets').select('id').eq('id', ticketId)
  check('исполнитель видит задачу, созданную другим', (listIvan.data ?? []).length === 1)

  const listOleg = await oleg.client.from('tickets').select('id').eq('id', ticketId)
  check('третий сотрудник видит задачу на общей доске', (listOleg.data ?? []).length === 1)

  const updateByOleg = await oleg.client
    .from('tickets')
    .update({ status: 'done' })
    .eq('id', ticketId)
    .select()
  check('наблюдатель не может менять чужую задачу', (updateByOleg.data ?? []).length === 0)

  const statusByIvan = await ivan.client
    .from('tickets')
    .update({ status: 'clarification' })
    .eq('id', ticketId)
    .select('status')
    .single()
  check('исполнитель переводит задачу в «Уточнение»', statusByIvan.data?.status === 'clarification')

  const hijack = await ivan.client
    .from('tickets')
    .update({ user_id: ivan.id })
    .eq('id', ticketId)
    .select('user_id')
    .single()
  check('исполнитель не может подменить автора', hijack.data?.user_id === anna.id)

  const comment = await ivan.client
    .from('comments')
    .insert({ ticket_id: ticketId, body: 'Уточните, пожалуйста, детали.' })
    .select('*,author:profiles!comments_author_id_fkey(display_name)')
    .single()
  check('исполнитель оставляет комментарий', Boolean(comment.data), comment.error?.message)

  const commentsByOleg = await oleg.client.from('comments').select('id').eq('ticket_id', ticketId)
  check('комментарий видит вся команда', (commentsByOleg.data ?? []).length === 1)

  const forged = await oleg.client
    .from('comments')
    .insert({ ticket_id: ticketId, author_id: ivan.id, body: 'Чужое авторство' })
  check('нельзя писать комментарий от чужого имени', Boolean(forged.error))

  const reassigned = await anna.client
    .from('tickets')
    .update({ assignee_id: oleg.id })
    .eq('id', ticketId)
    .select('assignee_id')
    .single()
  check('автор переназначает исполнителя', reassigned.data?.assignee_id === oleg.id)

  const events = await oleg.client
    .from('ticket_events')
    .select('kind')
    .eq('ticket_id', ticketId)
    .order('created_at')
  const kinds = (events.data ?? []).map((event) => event.kind)
  check('история доступна наблюдателю', (events.data ?? []).length >= 4, events.error?.message)
  check(
    'история фиксирует создание, этап, комментарий и исполнителя',
    ['created', 'status_changed', 'comment_added', 'assignee_changed'].every((kind) =>
      kinds.includes(kind),
    ),
    kinds.join(', '),
  )

  const deleteByIvan = await ivan.client.from('tickets').delete().eq('id', ticketId).select()
  check('исполнитель не может удалить чужую задачу', (deleteByIvan.data ?? []).length === 0)

  const deleteByAnna = await anna.client.from('tickets').delete().eq('id', ticketId).select().single()
  check('автор удаляет задачу', deleteByAnna.data?.id === ticketId)
  ticketRemoved = true
} catch (error) {
  check('сценарий выполнен без исключений', false, String(error))
} finally {
  if (!ticketRemoved) {
    await anna.client.from('tickets').delete().eq('id', ticketId)
  }
  await anna.client.auth.signOut()
  await ivan.client.auth.signOut()
  await oleg.client.auth.signOut()
}

const failed = results.filter((result) => !result.ok)
console.log('')
console.log(
  failed.length === 0
    ? `Все проверки пройдены (${results.length})`
    : `Провалено ${failed.length} из ${results.length}`,
)
process.exit(failed.length === 0 ? 0 : 1)
