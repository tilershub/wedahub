-- A phone number identifies a SIM, not a person.
--
-- Providers here commonly carry two numbers on different networks, and the
-- most common duplicate in a directory like this is the same man signing up
-- again from his second SIM. So identity is a person, a person has many
-- verified numbers, and any of them signs them into the same account.
--
-- This is also what makes NIC-based identity later a single nullable column on
-- persons rather than a migration across every profile.
--
-- Note `persons.user_id`, which the brief's sketch does not have: a person has
-- to reach their auth account for RLS to say "your rows" at all, and without it
-- a homeowner who never creates a provider profile has no person record to
-- attach numbers to. One person, one login, many SIMs.

create table if not exists public.persons (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users(id) on delete set null,
  display_name text,
  -- Unused in v1. Present so adding NIC identity is a write, not a migration.
  nic_hash     text,
  -- Set on the losing row by an admin merge. Nothing is ever deleted.
  merged_into  uuid references public.persons(id),
  created_at   timestamptz not null default now()
);

create index if not exists persons_user_id_idx on public.persons (user_id)
  where user_id is not null;
create index if not exists persons_merged_into_idx on public.persons (merged_into)
  where merged_into is not null;

create table if not exists public.phone_numbers (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.persons(id) on delete cascade,
  -- The CHECK is the point of this table. A number cannot enter the system in
  -- any spelling but the canonical one, even if something writes around the
  -- app, so the unique index below actually means "the same number".
  e164        text not null unique check (e164 = public.normalize_lk_phone(e164)),
  is_primary  boolean not null default false,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);

create unique index if not exists phone_numbers_one_primary_per_person
  on public.phone_numbers (person_id) where is_primary;
create index if not exists phone_numbers_person_idx on public.phone_numbers (person_id);

-- Which person the caller is. SECURITY DEFINER so the policies below can use it
-- without every caller needing to read persons first.
create or replace function public.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.persons
  where user_id = auth.uid() and merged_into is null
  limit 1
$$;

grant execute on function public.current_person_id() to authenticated;

alter table public.persons       enable row level security;
alter table public.phone_numbers enable row level security;

-- persons: your own row, or an admin's. No client writes — a person is created
-- by the verified-OTP path, which runs with the service role.
create policy "own person readable" on public.persons
  for select using (user_id = auth.uid());
create policy "admin reads all persons" on public.persons
  for select using (is_admin());
create policy "own person updatable" on public.persons
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin updates any person" on public.persons
  for update using (is_admin());

-- phone_numbers: readable by the person they belong to. Deliberately no INSERT
-- policy for any client role — a number only ever lands here after an OTP has
-- been checked server-side, so there is no path that records an unverified
-- number as verified.
create policy "own numbers readable" on public.phone_numbers
  for select using (person_id = public.current_person_id());
create policy "admin reads all numbers" on public.phone_numbers
  for select using (is_admin());
-- Dropping a spare SIM is the owner's business; the primary is not, because
-- removing it would leave the account with no canonical number.
create policy "own spare number removable" on public.phone_numbers
  for delete using (person_id = public.current_person_id() and not is_primary);
create policy "admin deletes any number" on public.phone_numbers
  for delete using (is_admin());

comment on table public.persons is
  'One human. Holds many verified phone_numbers and up to 3 provider profiles.';
comment on table public.phone_numbers is
  'Verified SIMs. Any of a person''s numbers signs them into the same account.';
comment on column public.phone_numbers.e164 is
  'Canonical 94XXXXXXXXX. CHECKed against normalize_lk_phone so it cannot be stored any other way.';
