-- Tadka: run once in Supabase → SQL Editor → New query → Run
create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.docs enable row level security;
drop policy if exists "Own docs only" on public.docs;
create policy "Own docs only" on public.docs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.docs replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
