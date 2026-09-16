-- Hang provider profiles off the person model.
--
-- `providers` is this repo's profile table — `tilers` is legacy, with three
-- read-only references left. Everything the brief calls `profiles` is here.
--
-- providers.phone and providers.whatsapp stay. They are how the whole
-- directory contacts people and removing them is not additive. What changes is
-- that they stop being identity: sign-in and claim matching read phone_numbers
-- and nothing else. Imported rows are inserted with both NULL, so an unclaimed
-- listing has no number to leak through the public API — the rule holds at the
-- data layer, not in JSX.
--
-- Defaults are chosen so the four live rows keep behaving exactly as they do
-- today: they are already claimed, already self-signed-up.

alter table public.providers
  add column if not exists person_id    uuid references public.persons(id),
  add column if not exists claim_status text not null default 'claimed',
  add column if not exists source       text not null default 'self_signup',
  add column if not exists merged_into  uuid references public.providers(id),
  add column if not exists completeness int  not null default 0,
  add column if not exists visit_fee    int  not null default 0;

alter table public.providers
  drop constraint if exists providers_claim_status_check,
  add  constraint providers_claim_status_check
       check (claim_status in ('unclaimed', 'claimed'));

alter table public.providers
  drop constraint if exists providers_source_check,
  add  constraint providers_source_check
       check (source in ('self_signup', 'import', 'agent'));

alter table public.providers
  drop constraint if exists providers_completeness_check,
  add  constraint providers_completeness_check
       check (completeness between 0 and 100);

-- Zero means free, and it is what the owner sees before requesting a visit.
alter table public.providers
  drop constraint if exists providers_visit_fee_check,
  add  constraint providers_visit_fee_check
       check (visit_fee >= 0);

create index if not exists providers_person_id_idx on public.providers (person_id)
  where person_id is not null;
create index if not exists providers_claim_status_idx on public.providers (claim_status);
create index if not exists providers_merged_into_idx on public.providers (merged_into)
  where merged_into is not null;

-- Give every existing signed-in profile a person, so the new model is complete
-- from the moment it lands rather than only for accounts created afterwards.
insert into public.persons (user_id, display_name)
select distinct on (p.user_id) p.user_id, p.name
from public.providers p
where p.user_id is not null
  and not exists (select 1 from public.persons x where x.user_id = p.user_id)
order by p.user_id, p.created_at;

update public.providers p
set person_id = s.id
from public.persons s
where p.user_id = s.user_id and p.person_id is null;

-- Added only now that the backfill has run: an unclaimed listing has nobody
-- behind it yet, but a claimed one must never be left dangling without an
-- identity. Declared before the backfill it would validate against the old
-- rows and fail.
alter table public.providers
  drop constraint if exists providers_claimed_has_person,
  add  constraint providers_claimed_has_person
       check (claim_status = 'unclaimed' or person_id is not null or user_id is null);

-- At most three non-merged profiles per person, per the brief. A merged row no
-- longer counts: it is history, not a listing.
create or replace function public.enforce_profile_limit()
returns trigger
language plpgsql
as $$
begin
  if new.person_id is not null and new.merged_into is null then
    if (select count(*) from public.providers
        where person_id = new.person_id
          and merged_into is null
          and id <> new.id) >= 3 then
      raise exception 'a person may hold at most 3 provider profiles'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists providers_profile_limit on public.providers;
create trigger providers_profile_limit
  before insert or update of person_id, merged_into on public.providers
  for each row execute function public.enforce_profile_limit();

comment on column public.providers.claim_status is
  'unclaimed listings are import rows nobody has signed into yet: name, trade and city only, no contact, no jobs.';
comment on column public.providers.visit_fee is
  'Rupees, snapshotted onto site_visits at request time so later edits do not rewrite history. 0 means free.';
