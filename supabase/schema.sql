-- GHARANA — Supabase schema (Phase 4b). Paste into Supabase → SQL Editor → Run. Safe to run again.
--
-- Everything is protected by Row Level Security: each signed-in user can only ever
-- read or write their own rows.

-- ── 1. Sync: one row per record in the app ───────────────────────────
create table if not exists public.records (
  user_id    uuid    not null default auth.uid() references auth.users on delete cascade,
  tbl        text    not null,
  id         text    not null,
  data       jsonb,
  updated_at bigint  not null,              -- the device's edit time (ms) — newest edit wins
  deleted    boolean not null default false,
  server_at  timestamptz not null default clock_timestamp(),  -- when the server received it (for pulling)
  primary key (user_id, tbl, id)
);
create index if not exists records_user_server_at on public.records (user_id, server_at);

alter table public.records enable row level security;
drop policy if exists "own records" on public.records;
create policy "own records" on public.records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Every insert/update gets a fresh server time, so devices can pull "everything since X".
create or replace function public.records_touch() returns trigger language plpgsql as $$
begin
  new.server_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
  for each row execute function public.records_touch();

-- Upload a batch of changes; an older edit never overwrites a newer one.
create or replace function public.push_records(rows jsonb) returns void
language sql security invoker as $$
  insert into public.records (user_id, tbl, id, data, updated_at, deleted)
  select auth.uid(), r->>'tbl', r->>'id', r->'data', (r->>'updated_at')::bigint, coalesce((r->>'deleted')::boolean, false)
  from jsonb_array_elements(rows) as r
  on conflict (user_id, tbl, id) do update
    set data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted
    where excluded.updated_at >= public.records.updated_at;
$$;

-- ── 2. Push notifications: your devices + reminder schedule ──────────
create table if not exists public.push_settings (
  user_id       uuid primary key default auth.uid() references auth.users on delete cascade,
  subscriptions jsonb not null default '[]',   -- one per device (phone, laptop…)
  schedule      jsonb not null default '[]',   -- reminders: times, days, kind
  tz            text  not null default 'Australia/Melbourne',  -- follows Travel Mode
  last_sent     jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);
alter table public.push_settings enable row level security;
drop policy if exists "own push settings" on public.push_settings;
create policy "own push settings" on public.push_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
