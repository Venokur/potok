// Демо-данные для доски: два сотрудника и несколько задач с комментариями.
//
// Запуск: npm run seed  (нужен запущенный docker compose и Node.js 20+)
// Аккаунты: anna@potok.local / ivan@potok.local, пароль potok12345.

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || 'http://localhost:8080'
const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdG9rLWxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDAwMDAsImV4cCI6MjA4ODAwMDAwMH0.LBch0AEseAYRU7pAaIjFnXCIf6T7a7y3aquAABL9Euo'
const password = 'potok12345'

function makeClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function ensureUser(email, displayName) {
  const client = makeClient()
  let signIn = await client.auth.signInWithPassword({ email, password })

  if (signIn.error) {
    const signUp = await client.auth.signUp({ email, password })
    if (signUp.error) throw new Error(`${email}: ${signUp.error.message}`)
    signIn = { data: { user: signUp.data.user }, error: null }
  }

  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Error(`${email}: не удалось получить пользователя`)

  await client.from('profiles').update({ display_name: displayName }).eq('id', data.user.id)

  return { client, id: data.user.id, email }
}

const anna = await ensureUser('anna@potok.local', 'Анна')
const ivan = await ensureUser('ivan@potok.local', 'Иван')

const { data: existing, error: existingError } = await anna.client
  .from('tickets')
  .select('title')

if (existingError) throw existingError

const existingTitles = new Set((existing ?? []).map((ticket) => ticket.title))

const seed = [
  {
    author: anna,
    assignee: ivan.id,
    title: 'Бот для согласования отпусков',
    description:
      'Нужен Telegram-бот: сотрудник подаёт заявку на отпуск, руководитель согласует кнопкой, результат уходит в HR-систему.',
    category: 'bot',
    status: 'new',
    comments: [
      { author: ivan, body: 'Уточню, есть ли API у HR-системы, и вернусь с оценкой.' },
    ],
  },
  {
    author: anna,
    assignee: ivan.id,
    title: 'Интеграция CRM с почтой',
    description:
      'Письма клиентов должны автоматически попадать в карточку сделки с нужными тегами.',
    category: 'integration',
    status: 'clarification',
    comments: [
      { author: ivan, body: 'Нужен доступ к тестовому ящику и список тегов — без этого не начать.' },
    ],
  },
  {
    author: ivan,
    assignee: anna.id,
    title: 'Ежедневный отчёт по продажам в Telegram',
    description:
      'Каждый день в 9:00 собирать воронку из CRM и отправлять сводку в канал отдела продаж.',
    category: 'report',
    status: 'in_progress',
    comments: [
      { author: anna, body: 'Собрала макет сообщения, согласую с руководителем и выложу в задачу.' },
    ],
  },
  {
    author: anna,
    assignee: ivan.id,
    title: 'Автоматическая выгрузка счетов в 1С',
    description: 'Раз в неделю формировать счета и отправлять их в 1С без ручной сверки.',
    category: 'integration',
    status: 'done',
    comments: [
      { author: ivan, body: 'Готово, выгрузка работает по расписанию. Проверено на двух неделях.' },
    ],
  },
]

let created = 0

for (const item of seed) {
  if (existingTitles.has(item.title)) continue

  const ticketId = crypto.randomUUID()
  const inserted = await item.author.client
    .from('tickets')
    .insert({
      id: ticketId,
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      assignee_id: item.assignee,
    })
    .select('id')
    .single()

  if (inserted.error) throw inserted.error

  for (const comment of item.comments) {
    const result = await comment.author.client
      .from('comments')
      .insert({ ticket_id: ticketId, body: comment.body })
    if (result.error) throw result.error
  }

  created += 1
}

console.log(created > 0 ? `Добавлено задач: ${created}` : 'Демо-данные уже на месте')
console.log('Аккаунты: anna@potok.local / ivan@potok.local, пароль potok12345')

await anna.client.auth.signOut()
await ivan.client.auth.signOut()
