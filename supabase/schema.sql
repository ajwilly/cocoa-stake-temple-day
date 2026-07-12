-- Cocoa Stake Temple Day carpool sign-up
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- Safe to re-run: it also cleans up the retired children/childcare fields
-- from any project set up before that was removed.

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
  needs text
);

-- Retired: this app no longer tracks children counts or childcare
-- volunteers (liability/legal exposure around unlicensed childcare).
alter table public.signups drop column if exists kids;
alter table public.signups drop column if exists can_watch_kids;

alter table public.signups enable row level security;

-- Public visitors may only ever create a signup row. They cannot read,
-- edit, or delete any row -- not their own, not anyone else's.
drop policy if exists "anon can insert signups" on public.signups;
create policy "anon can insert signups"
  on public.signups
  for insert
  to anon
  with check (true);

-- Signed-in admins (created in Authentication > Users) can see, remove,
-- AND add rows -- an admin browsing the public page on the same device
-- they logged in on still submits as "authenticated", not "anon", so this
-- needs its own insert policy or their sign-up silently gets rejected.
-- There is deliberately no update policy -- nobody edits an existing
-- signup, they just delete and re-submit.
drop policy if exists "admins can insert signups" on public.signups;
create policy "admins can insert signups"
  on public.signups
  for insert
  to authenticated
  with check (true);

drop policy if exists "admins can read all signups" on public.signups;
create policy "admins can read all signups"
  on public.signups
  for select
  to authenticated
  using (true);

drop policy if exists "admins can delete all signups" on public.signups;
create policy "admins can delete all signups"
  on public.signups
  for delete
  to authenticated
  using (true);

-- Table-level grants, matched to the RLS policies above: anon can only
-- ever insert, authenticated (admin) can insert + read + delete.
revoke all on public.signups from anon, authenticated;
grant insert on public.signups to anon;
grant insert, select, delete on public.signups to authenticated;

-- Public counts-only aggregate. This is a SECURITY DEFINER function, so it
-- runs with the privileges of the function owner (bypassing RLS) but it
-- only ever returns per-unit sums -- never a name, phone, or note. This is
-- the ONLY way the anon/public page reads data from the signups table.
-- Dropped and recreated (not CREATE OR REPLACE) because its return columns
-- changed when children_coming/childcare_helpers were retired -- Postgres
-- won't let you change a function's return type in place.
drop function if exists public.get_ward_counts();

create function public.get_ward_counts()
returns table (
  unit text,
  seats_offered bigint,
  riders_needing_seats bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    unit,
    coalesce(sum(seats) filter (where role = 'driver'), 0) as seats_offered,
    coalesce(sum(party) filter (where role = 'rider'), 0) as riders_needing_seats
  from public.signups
  group by unit;
$$;

revoke all on function public.get_ward_counts() from public;
grant execute on function public.get_ward_counts() to anon, authenticated;

-- Force Supabase's API layer (PostgREST) to immediately pick up the
-- schema/grant changes above, instead of waiting for its own cache to
-- refresh -- without this, you can see spurious "permission denied"
-- errors for a short window right after running this script.
notify pgrst, 'reload schema';
