-- Row Level Security: пользователь видит и меняет только свои заявки.
-- Ограничение действует на уровне Postgres, поэтому прямой запрос к REST API
-- с чужим JWT не вернёт и не изменит чужие строки.

alter table public.tickets enable row level security;

drop policy if exists tickets_select_own on public.tickets;
create policy tickets_select_own
  on public.tickets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists tickets_insert_own on public.tickets;
create policy tickets_insert_own
  on public.tickets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists tickets_update_own on public.tickets;
create policy tickets_update_own
  on public.tickets
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists tickets_delete_own on public.tickets;
create policy tickets_delete_own
  on public.tickets
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
