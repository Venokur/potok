interface SupabaseLikeError {
  message?: string
  code?: string
  status?: number
  name?: string
}

function normalize(error: unknown): SupabaseLikeError {
  if (error && typeof error === 'object') return error as SupabaseLikeError
  if (typeof error === 'string') return { message: error }
  return {}
}

function has(message: string, fragments: string[]): boolean {
  return fragments.some((fragment) => message.includes(fragment))
}

/** Понятные пользователю сообщения для ошибок Supabase Auth. */
export function authErrorMessage(error: unknown): string {
  const { message = '', code = '', status } = normalize(error)
  const text = message.toLowerCase()

  if (has(text, ['invalid login credentials', 'invalid_credentials'])) {
    return 'Неверная почта или пароль.'
  }
  if (has(text, ['email not confirmed', 'email_not_confirmed'])) {
    return 'Почта ещё не подтверждена. Проверьте письмо и попробуйте снова.'
  }
  if (has(text, ['user already registered', 'already been registered', 'user_already_exists'])) {
    return 'Пользователь с такой почтой уже зарегистрирован.'
  }
  if (has(text, ['password should be at least', 'password_too_short', 'weak_password'])) {
    return 'Пароль слишком короткий — минимум 6 символов.'
  }
  if (has(text, ['unable to validate email', 'invalid email', 'email_address_invalid'])) {
    return 'Проверьте формат электронной почты.'
  }
  if (has(text, ['rate limit', 'too many requests', 'over_email_send_rate_limit']) || status === 429) {
    return 'Слишком много попыток. Подождите минуту и попробуйте снова.'
  }
  if (has(text, ['signups not allowed', 'signup_disabled'])) {
    return 'Регистрация временно недоступна.'
  }
  if (has(text, ['failed to fetch', 'fetch failed', 'network', 'load failed'])) {
    return 'Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.'
  }
  if (has(text, ['jwt expired', 'session expired', 'invalid jwt'])) {
    return 'Сессия истекла. Войдите в аккаунт снова.'
  }
  if (code === 'email_not_confirmed') {
    return 'Почта ещё не подтверждена. Проверьте письмо.'
  }

  return 'Не удалось выполнить действие. Попробуйте ещё раз.'
}

/** Понятные пользователю сообщения для ошибок PostgREST / Postgres. */
export function dataErrorMessage(error: unknown): string {
  const { message = '', code = '', status } = normalize(error)
  const text = message.toLowerCase()

  if (message === 'TICKET_NOT_FOUND' || code === 'PGRST116') {
    return 'Заявка не найдена или недоступна.'
  }
  if (has(text, ['row-level security', 'permission denied'])) {
    return 'Нет доступа к этой заявке.'
  }
  if (has(text, ['duplicate key', 'already exists', '23505'])) {
    return 'Такая заявка уже создана.'
  }
  if (has(text, ['violates check constraint', 'violates not-null', '23514', '23502'])) {
    return 'Проверьте заполнение полей: возможно, превышена допустимая длина.'
  }
  if (has(text, ['jwt expired', 'invalid jwt', 'pgrst301'])) {
    return 'Сессия истекла. Войдите в аккаунт снова.'
  }
  if (has(text, ['failed to fetch', 'fetch failed', 'network', 'load failed'])) {
    return 'Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.'
  }
  if (status === 401) return 'Нужно войти в аккаунт заново.'
  if (status === 403) return 'Недостаточно прав для этого действия.'

  return 'Не удалось сохранить изменения. Попробуйте ещё раз.'
}

export function isDuplicateError(error: unknown): boolean {
  const { message = '', code = '', status } = normalize(error)
  return status === 409 || code === '23505' || message.toLowerCase().includes('duplicate key')
}

export function isNotFoundError(error: unknown): boolean {
  const { message = '', code = '' } = normalize(error)
  return message === 'TICKET_NOT_FOUND' || code === 'PGRST116'
}
