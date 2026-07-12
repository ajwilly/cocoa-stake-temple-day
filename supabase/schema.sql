-- Cocoa Stake Temple Day carpool sign-up
-- Paste this whole file into the Supabase SQL Editor and run it once.

create extension if not exists pgcrypto;

create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  role text not null check (role in ('driver', 'rider')),
  name text not null,
  phone text not null,
  unit text not null,
  seats int not null default 0,
  depart_time text,
  depart_place text,
  party int not null default 1,
  kids int not null default 0,
  can_watch_kids boolean not null default false,
  needs text
);

alter table public.signups enable row level security;

-- Public visitors may only ever create a signup row. They cannot read,
-- edit, or delete any row -- not their own, not anyone else's.
create policy "anon can insert signups"
  on public.signups
  for insert
  to anon
  with check (true);

-- Signed-in admins (created in Authentication > Users) can see and remove
-- every row. There is deliberately no update policy -- nobody edits an
-- existing signup, they just delete and re-submit.
create policy "admins can read all signups"
  on public.signups
  for select
  to authenticated
  using (true);

create policy "admins can delete all signups"
  on public.signups
  for delete
  to authenticated
  using (true);

-- Table-level grants, matched to the RLS policies above: anon can only
-- ever insert, authenticated (admin) can only ever read + delete.
revoke all on public.signups from anon, authenticated;
grant insert on public.signups to anon;
grant select, delete on public.signups to authenticated;

-- Public counts-only aggregate. This is a SECURITY DEFINER function, so it
-- runs with the privileges of the function owner (bypassing RLS) but it
-- only ever returns per-unit sums -- never a name, phone, or note. This is
-- the ONLY way the anon/public page reads data from the signups table.
create or replace function public.get_ward_counts()
returns table (
  unit text,
  seats_offered bigint,
  riders_needing_seats bigint,
  children_coming bigint,
  childcare_helpers bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    unit,
    coalesce(sum(seats) filter (where role = 'driver'), 0) as seats_offered,
    coalesce(sum(party) filter (where role = 'rider'), 0) as riders_needing_seats,
    coalesce(sum(kids), 0) as children_coming,
    coalesce(count(*) filter (where can_watch_kids), 0) as childcare_helpers
  from public.signups
  group by unit;
$$;

revoke all on function public.get_ward_counts() from public;
grant execute on function public.get_ward_counts() to anon, authenticated;
