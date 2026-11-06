-- 0003: общая доска команды.
-- Добавляет профили сотрудников, исполнителя, комментарии, историю действий
-- и новый этап «Уточнение». Доска читается всеми авторизованными сотрудниками,
-- менять задачу могут автор и исполнитель.

-- ---------------------------------------------------------------------------
-- Профили сотрудников (нужны для выбора исполнителя и подписей в истории)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Справочник сотрудников для назначения задач и подписей.';

-- Профили для уже зарегистрированных пользователей.
insert into public.profiles (id, email, display_name)
select
  u.id,
  coalesce(u.email, u.id::text || '@local'),
  coalesce(nullif(initcap(split_part(u.email, '@', 1)), ''), 'Сотрудник')
from auth.users u
on conflict (id) do nothing;

-- Новый пользователь автоматически попадает в справочник.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@local'),
    coalesce(nullif(initcap(split_part(new.email, '@', 1)), ''), 'Сотрудник')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_team on public.profiles;
create policy profiles_select_team
  on public.profiles
  for select
  to authenticated
  using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;

-- ---------------------------------------------------------------------------
-- Задачи: автор (user_id) + исполнитель (assignee_id) + этап «Уточнение»
-- ---------------------------------------------------------------------------
alter table public.tickets add column if not exists assignee_id uuid;

update public.tickets
set assignee_id = user_id
where assignee_id is null;

alter table public.tickets alter column assignee_id set default auth.uid();
alter table public.tickets alter column assignee_id set not null;

comment on column public.tickets.user_id is 'Автор задачи.';
comment on column public.tickets.assignee_id is 'Исполнитель задачи.';

-- FK теперь ведут на профили: это позволяет PostgREST отдавать имена автора
-- и исполнителя вместе с задачей.
alter table public.tickets drop constraint if exists tickets_user_id_fkey;
alter table public.tickets
  add constraint tickets_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.tickets drop constraint if exists tickets_assignee_id_fkey;
alter table public.tickets
  add constraint tickets_assignee_id_fkey
  foreign key (assignee_id) references public.profiles (id) on delete cascade;

alter table public.tickets drop constraint if exists tickets_status_allowed;
alter table public.tickets
  add constraint tickets_status_allowed
  check (status in ('new', 'clarification', 'in_progress', 'done'));

create index if not exists tickets_assignee_status_idx
  on public.tickets (assignee_id, status);
create index if not exists tickets_status_created_idx
  on public.tickets (status, created_at desc);

-- Общая доска: читают все сотрудники, меняют автор и исполнитель.
drop policy if exists tickets_select_own on public.tickets;
drop policy if exists tickets_insert_own on public.tickets;
drop policy if exists tickets_update_own on public.tickets;
drop policy if exists tickets_delete_own on public.tickets;
drop policy if exists tickets_select_team on public.tickets;
drop policy if exists tickets_update_participants on public.tickets;
drop policy if exists tickets_delete_author on public.tickets;

create policy tickets_select_team
  on public.tickets
  for select
  to authenticated
  using (true);

create policy tickets_insert_own
  on public.tickets
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy tickets_update_participants
  on public.tickets
  for update
  to authenticated
  using (auth.uid() = user_id or auth.uid() = assignee_id)
  with check (auth.uid() = user_id or auth.uid() = assignee_id);

create policy tickets_delete_author
  on public.tickets
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Автора задачи нельзя подменить через update.
create or replace function public.protect_ticket_author()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and auth.uid() <> old.user_id then
    new.user_id := old.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists tickets_protect_author on public.tickets;
create trigger tickets_protect_author
  before update on public.tickets
  for each row
  execute function public.protect_ticket_author();

-- ---------------------------------------------------------------------------
-- Комментарии
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_length check (char_length(btrim(body)) between 1 and 2000)
);

comment on table public.comments is 'Комментарии к задачам. Читает вся команда, пишет автор от своего имени.';

create index if not exists comments_ticket_created_idx
  on public.comments (ticket_id, created_at);

alter table public.comments enable row level security;

drop policy if exists comments_select_team on public.comments;
create policy comments_select_team
  on public.comments
  for select
  to authenticated
  using (true);

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own
  on public.comments
  for insert
  to authenticated
  with check (author_id = auth.uid());

grant select, insert on public.comments to authenticated;
revoke all on public.comments from anon;

-- ---------------------------------------------------------------------------
-- История действий
-- ---------------------------------------------------------------------------
create table if not exists public.ticket_events (
  id bigserial primary key,
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ticket_events_kind_allowed check (
    kind in ('created', 'status_changed', 'assignee_changed', 'updated', 'comment_added')
  )
);

comment on table public.ticket_events is 'История действий по задачам. Пишется только триггерами.';

create index if not exists ticket_events_ticket_created_idx
  on public.ticket_events (ticket_id, created_at);

alter table public.ticket_events enable row level security;

drop policy if exists ticket_events_select_team on public.ticket_events;
create policy ticket_events_select_team
  on public.ticket_events
  for select
  to authenticated
  using (true);

grant select on public.ticket_events to authenticated;
revoke all on public.ticket_events from anon;

-- Для задач, созданных до появления истории, добавляем событие создания.
insert into public.ticket_events (ticket_id, actor_id, kind, payload, created_at)
select
  t.id,
  t.user_id,
  'created',
  jsonb_build_object('title', t.title, 'assignee_id', t.assignee_id),
  t.created_at
from public.tickets t
where not exists (
  select 1 from public.ticket_events e where e.ticket_id = t.id
);

create or replace function public.log_ticket_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ticket_events (ticket_id, actor_id, kind, payload)
    values (
      new.id,
      auth.uid(),
      'created',
      jsonb_build_object('title', new.title, 'assignee_id', new.assignee_id)
    );
    return null;
  end if;

  if new.status is distinct from old.status then
    insert into public.ticket_events (ticket_id, actor_id, kind, payload)
    values (
      new.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    insert into public.ticket_events (ticket_id, actor_id, kind, payload)
    values (
      new.id,
      auth.uid(),
      'assignee_changed',
      jsonb_build_object('from', old.assignee_id, 'to', new.assignee_id)
    );
  end if;

  if new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.category is distinct from old.category then
    insert into public.ticket_events (ticket_id, actor_id, kind, payload)
    values (new.id, auth.uid(), 'updated', '{}'::jsonb);
  end if;

  return null;
end;
$$;

drop trigger if exists tickets_log_event on public.tickets;
create trigger tickets_log_event
  after insert or update on public.tickets
  for each row
  execute function public.log_ticket_event();

create or replace function public.log_comment_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ticket_events (ticket_id, actor_id, kind, payload)
  values (
    new.ticket_id,
    new.author_id,
    'comment_added',
    jsonb_build_object('comment_id', new.id, 'excerpt', left(new.body, 140))
  );

  return null;
end;
$$;

drop trigger if exists comments_log_event on public.comments;
create trigger comments_log_event
  after insert on public.comments
  for each row
  execute function public.log_comment_event();

-- Заставляем PostgREST сразу увидеть новые таблицы и колонки.
notify pgrst, 'reload schema';
