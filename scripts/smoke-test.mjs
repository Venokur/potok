// Проверка приватности доски: по умолчанию пользователь видит только свои задачи
// и назначенные на него; обзор всей команды включается персональной настройкой.
// Дополнительно проверяются комментарии, история, права и фильтр по категории.
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

const ticketId = crypto.randomUUID()
const otherTicketId = crypto.randomUUID()
let cleaned = false

try {
  const olegProfile = await oleg.client
    .from('profiles')
    .select('can_view_all_tickets')
    .eq('id', oleg.id)
    .single()
  check('обзор команды по умолчанию выключен', olegProfile.data?.can_view_all_tickets === false)

  const created = await anna.client
    .from('tickets')
    .insert({
      id: ticketId,
      title: `Smoke-задача ${stamp}`,
      description: 'Проверяем приватность, назначение, комментарии и историю.',
      category: 'bot',
      assignee_id: ivan.id,
    })
    .select(
      '*,author:profiles!tickets_user_id_fkey(display_name),assignee:profiles!tickets_assignee_id_fkey(display_name)',
    )
    .single()

  check('автор создаёт задачу и назначает исполнителя', created.data?.assignee_id === ivan.id, created.error?.message)

  const annaSees = await anna.client.from('tickets').select('id').eq('id', ticketId)
  check('автор видит свою задачу', (annaSees.data ?? []).length === 1)

  const ivanSees = await ivan.client.from('tickets').select('id').eq('id', ticketId)
  check('исполнитель видит назначенную задачу', (ivanSees.data ?? []).length === 1)

  const olegList = await oleg.client.from('tickets').select('id')
  check('посторонний не видит чужую задачу в списке', (olegList.data ?? []).length === 0)

  const olegRead = await oleg.client.from('tickets').select('id').eq('id', ticketId).maybeSingle()
  check('посторонний не читает чужую задачу по id', olegRead.data === null)

  const ivanStatus = await ivan.client
    .from('tickets')
    .update({ status: 'clarification' })
    .eq('id', ticketId)
    .select('status')
    .single()
  check('исполнитель переводит задачу в «Уточнение»', ivanStatus.data?.status === 'clarification')

  const comment = await ivan.client
    .from('comments')
    .insert({ ticket_id: ticketId, body: 'Уточните, пожалуйста, детали.' })
    .select('id')
    .single()
  check('исполнитель комментирует назначенную задачу', Boolean(comment.data), comment.error?.message)

  const olegComments = await oleg.client.from('comments').select('id').eq('ticket_id', ticketId)
  check('посторонний не видит комментарии', (olegComments.data ?? []).length === 0)

  const olegEvents = await oleg.client.from('ticket_events').select('id').eq('ticket_id', ticketId)
  check('посторонний не видит историю', (olegEvents.data ?? []).length === 0)

  const olegCommentAttempt = await oleg.client
    .from('comments')
    .insert({ ticket_id: ticketId, body: 'Чужой комментарий' })
  check('посторонний не может комментировать чужую задачу', Boolean(olegCommentAttempt.error))

  const olegUpdate = await oleg.client
    .from('tickets')
    .update({ status: 'done' })
    .eq('id', ticketId)
    .select()
  check('посторонний не может менять чужую задачу', (olegUpdate.data ?? []).length === 0)

  const olegHijack = await oleg.client
    .from('profiles')
    .update({ can_view_all_tickets: true })
    .eq('id', anna.id)
    .select()
  check('нельзя включить обзор другому сотруднику', (olegHijack.data ?? []).length === 0)

  const enabled = await oleg.client
    .from('profiles')
    .update({ can_view_all_tickets: true })
    .eq('id', oleg.id)
    .select('can_view_all_tickets')
    .single()
  check('пользователь включает обзор своей настройкой', enabled.data?.can_view_all_tickets === true)

  const olegSeesTicket = await oleg.client.from('tickets').select('id').eq('id', ticketId)
  check('с включённым обзором видна чужая задача', (olegSeesTicket.data ?? []).length === 1)

  const olegSeesComments = await oleg.client.from('comments').select('id').eq('ticket_id', ticketId)
  check('с обзором видны комментарии', (olegSeesComments.data ?? []).length === 1)

  const olegSeesHistory = await oleg.client.from('ticket_events').select('kind').eq('ticket_id', ticketId)
  const kinds = (olegSeesHistory.data ?? []).map((event) => event.kind)
  check(
    'с обзором видна история',
    ['created', 'status_changed', 'comment_added'].every((kind) => kinds.includes(kind)),
    kinds.join(', '),
  )

  const olegUpdateWithView = await oleg.client
    .from('tickets')
    .update({ title: 'Взлом' })
    .eq('id', ticketId)
    .select()
  check('обзор не даёт права менять чужую задачу', (olegUpdateWithView.data ?? []).length === 0)

  const disabled = await oleg.client
    .from('profiles')
    .update({ can_view_all_tickets: false })
    .eq('id', oleg.id)
    .select('can_view_all_tickets')
    .single()
  check('обзор можно выключить', disabled.data?.can_view_all_tickets === false)

  const olegAfterOff = await oleg.client.from('tickets').select('id').eq('id', ticketId)
  check('после выключения чужая задача снова скрыта', (olegAfterOff.data ?? []).length === 0)

  const second = await anna.client
    .from('tickets')
    .insert({
      id: otherTicketId,
      title: `Smoke-отчёт ${stamp}`,
      description: 'Проверяем фильтр по категории.',
      category: 'report',
      assignee_id: anna.id,
    })
    .select('id')
    .single()
  check('вторая задача создана', Boolean(second.data), second.error?.message)

  const reportFilter = await anna.client.from('tickets').select('id,category').eq('category', 'report')
  check(
    'фильтр по категории возвращает только нужное',
    (reportFilter.data ?? []).length === 1 && reportFilter.data?.[0]?.id === otherTicketId,
  )

  const deleteByIvan = await ivan.client.from('tickets').delete().eq('id', ticketId).select()
  check('исполнитель не может удалить чужую задачу', (deleteByIvan.data ?? []).length === 0)

  const deleteByAnna = await anna.client.from('tickets').delete().eq('id', ticketId).select().single()
  check('автор удаляет свою задачу', deleteByAnna.data?.id === ticketId)

  await anna.client.from('tickets').delete().eq('id', otherTicketId)
  cleaned = true
} catch (error) {
  check('сценарий выполнен без исключений', false, String(error))
} finally {
  if (!cleaned) {
    await anna.client.from('tickets').delete().eq('id', ticketId)
    await anna.client.from('tickets').delete().eq('id', otherTicketId)
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
