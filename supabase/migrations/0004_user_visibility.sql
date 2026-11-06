-- 0004: приватность по умолчанию и персональная настройка обзора доски.
--
-- Пользователь по умолчанию видит только задачи, которые создал сам, и задачи,
-- назначенные на него. Настройка can_view_all_tickets расширяет обзор на всю
-- команду. Она индивидуальная: включает обзор только тому, кто её включил.

alter table public.profiles
  add column if not exists can_view_all_tickets boolean not null default false;

comment on column public.profiles.can_view_all_tickets is
  'Если true — сотрудник видит задачи всей команды. По умолчанию false.';

create or replace function public.can_view_all_tickets()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.can_view_all_tickets from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

comment on function public.can_view_all_tickets() is
  'Настройка текущего пользователя: показывать ли ему задачи всей команды.';

-- Проверка доступа к конкретной задаче: автор, исполнитель или включённый обзор.
create or replace function public.can_access_ticket(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.tickets t
    where t.id = p_ticket_id
      and (
        t.user_id = auth.uid()
        or t.assignee_id = auth.uid()
        or public.can_view_all_tickets()
      )
  );
$$;

comment on function public.can_access_ticket(uuid) is
  'Может ли текущий пользователь читать задачу: автор, исполнитель или включённый обзор.';

revoke all on function public.can_view_all_tickets() from public;
revoke all on function public.can_access_ticket(uuid) from public;
grant execute on function public.can_view_all_tickets() to authenticated;
grant execute on function public.can_access_ticket(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Задачи: вместо «видно всем» — автор, исполнитель или включённый обзор.
-- ---------------------------------------------------------------------------
drop policy if exists tickets_select_team on public.tickets;
drop policy if exists tickets_select_scoped on public.tickets;

create policy tickets_select_scoped
  on public.tickets
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or assignee_id = auth.uid()
    or public.can_view_all_tickets()
  );

-- ---------------------------------------------------------------------------
-- Комментарии и история наследуют доступ к задаче.
-- ---------------------------------------------------------------------------
drop policy if exists comments_select_team on public.comments;
drop policy if exists comments_select_visible on public.comments;

create policy comments_select_visible
  on public.comments
  for select
  to authenticated
  using (public.can_access_ticket(ticket_id));

drop policy if exists comments_insert_own on public.comments;

create policy comments_insert_own
  on public.comments
  for insert
  to authenticated
  with check (author_id = auth.uid() and public.can_access_ticket(ticket_id));

drop policy if exists ticket_events_select_team on public.ticket_events;
drop policy if exists ticket_events_select_visible on public.ticket_events;

create policy ticket_events_select_visible
  on public.ticket_events
  for select
  to authenticated
  using (public.can_access_ticket(ticket_id));

-- ---------------------------------------------------------------------------
-- Профиль: пользователь может менять только имя и настройку обзора.
-- ---------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (display_name, can_view_all_tickets) on public.profiles to authenticated;

notify pgrst, 'reload schema';
