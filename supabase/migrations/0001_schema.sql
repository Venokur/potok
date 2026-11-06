-- Схема приложения «Поток».
-- Выполняется при каждом `docker compose up` (идемпотентно).

create extension if not exists pgcrypto;

create schema if not exists auth;

-- В self-hosted Supabase auth.uid() обычно уже существует. Если образа нет —
-- создаём совместимую реализацию, чтобы политики RLS работали.
do $do$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    execute $fn$
      create function auth.uid()
      returns uuid
      language sql
      stable
      as $body$
        select coalesce(
          nullif(current_setting('request.jwt.claim.sub', true), ''),
          nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
        )::uuid
      $body$;
    $fn$;
  end if;
end
$do$;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tickets_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint tickets_description_length check (char_length(btrim(description)) between 1 and 5000),
  constraint tickets_category_allowed check (category in ('bot', 'integration', 'report', 'other')),
  constraint tickets_status_allowed check (status in ('new', 'in_progress', 'done'))
);

comment on table public.tickets is 'Заявки на автоматизацию. Доступ ограничен владельцем через RLS.';
comment on column public.tickets.user_id is 'Владелец заявки. Проставляется из JWT при вставке.';

create index if not exists tickets_user_created_idx
  on public.tickets (user_id, created_at desc);

create index if not exists tickets_user_status_idx
  on public.tickets (user_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
  before update on public.tickets
  for each row
  execute function public.set_updated_at();

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.tickets to authenticated, service_role;
revoke all on public.tickets from anon;
