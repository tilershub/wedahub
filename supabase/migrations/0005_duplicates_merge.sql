-- Duplicate detection and the admin merge.
--
-- §3.4 is blunt about the sequencing: this has to exist before the first
-- import runs, because cleaning 10,000 profiles without a merge tool is not
-- feasible. It is built here, ahead of the importer, for that reason.
--
-- Nothing in here merges anything automatically. Every row is a suggestion for
-- a human, and merge_providers() only ever runs when an admin presses the
-- button. Merging two different people is far worse than leaving a duplicate,
-- and Sri Lankan names repeat constantly.

create table if not exists public.duplicate_candidates (
  id         uuid primary key default gen_random_uuid(),
  profile_a  uuid not null references public.providers(id) on delete cascade,
  profile_b  uuid not null references public.providers(id) on delete cascade,
  reason     text not null
             check (reason in ('name_city_trade', 'same_photo_hash', 'same_device', 'manual')),
  -- 0..1. From nameSimilarity() for name_city_trade, 1 for an exact photo or
  -- device match. Symmetric, so it does not matter which profile is A.
  score      numeric(4, 3) not null default 0 check (score >= 0 and score <= 1),
  status     text not null default 'open'
             check (status in ('open', 'merged', 'dismissed')),
  notes      text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint duplicate_candidates_distinct check (profile_a <> profile_b)
);

-- One row per pair regardless of which way round it was found. Without this,
-- three signals firing on the same two profiles become three rows in the
-- review queue, and the weekly review drowns.
create unique index if not exists duplicate_candidates_pair_idx
  on public.duplicate_candidates (
    least(profile_a, profile_b), greatest(profile_a, profile_b), reason);
create index if not exists duplicate_candidates_open_idx
  on public.duplicate_candidates (created_at desc) where status = 'open';

-- Signals. §3.4: any one of these alone is weak; two together is worth a look.
create table if not exists public.photo_hashes (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  sha256      text not null,
  created_at  timestamptz not null default now(),
  unique (provider_id, sha256)
);
create index if not exists photo_hashes_sha_idx on public.photo_hashes (sha256);

create table if not exists public.device_fingerprints (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  fingerprint text not null,
  created_at  timestamptz not null default now(),
  unique (provider_id, fingerprint)
);
create index if not exists device_fingerprints_fp_idx
  on public.device_fingerprints (fingerprint);

alter table public.duplicate_candidates enable row level security;
alter table public.photo_hashes          enable row level security;
alter table public.device_fingerprints   enable row level security;

-- Admin-only throughout. These are internal signals: a provider seeing that we
-- suspect them of being a duplicate of a named competitor is not a screen
-- anyone wants to ship. Writes come from the server with the service role.
create policy "admin reads duplicates"   on public.duplicate_candidates for select using (is_admin());
create policy "admin updates duplicates" on public.duplicate_candidates for update using (is_admin());
create policy "admin reads photo hashes" on public.photo_hashes          for select using (is_admin());
create policy "admin reads devices"      on public.device_fingerprints   for select using (is_admin());

-- Merge two profiles: keep the survivor, retire the loser, move everything
-- across, delete nothing.
--
-- The loser keeps its row and its id so its public URL can 301 to the
-- survivor, and so the merge is reversible by hand if it was wrong.
create or replace function public.merge_providers(p_survivor uuid, p_loser uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survivor providers;
  v_loser    providers;
  v_moved    jsonb := '{}'::jsonb;
  v_count    int;
begin
  if not is_admin() then
    raise exception 'merge_providers is admin only' using errcode = 'insufficient_privilege';
  end if;
  if p_survivor = p_loser then
    raise exception 'cannot merge a profile into itself' using errcode = 'check_violation';
  end if;

  select * into v_survivor from providers where id = p_survivor;
  if not found then raise exception 'survivor % not found', p_survivor; end if;
  select * into v_loser from providers where id = p_loser;
  if not found then raise exception 'loser % not found', p_loser; end if;
  if v_loser.merged_into is not null then
    raise exception 'profile % is already merged', p_loser using errcode = 'check_violation';
  end if;

  -- Reviews carry the public rating, so they move first and the trigger on
  -- reviews recomputes both profiles' averages.
  update reviews set provider_id = p_survivor where provider_id = p_loser;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('reviews', v_count);

  -- Quotes link to a provider by slug, not by id — see the note on bids in
  -- V1_PLAN.md. Repointing the slug keeps the survivor's quote history whole.
  update bids set provider_slug = v_survivor.slug where provider_slug = v_loser.slug;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('quotes', v_count);

  update photo_hashes set provider_id = p_survivor
   where provider_id = p_loser
     and not exists (select 1 from photo_hashes s
                     where s.provider_id = p_survivor and s.sha256 = photo_hashes.sha256);
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('photos', v_count);

  update device_fingerprints set provider_id = p_survivor
   where provider_id = p_loser
     and not exists (select 1 from device_fingerprints s
                     where s.provider_id = p_survivor and s.fingerprint = device_fingerprints.fingerprint);

  update saved_providers set provider_id = p_survivor
   where provider_id = p_loser
     and not exists (select 1 from saved_providers s
                     where s.provider_id = p_survivor and s.user_id = saved_providers.user_id);
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('saves', v_count);

  -- Phone numbers belong to the person, not the profile, so they only move
  -- when the two profiles turned out to be two records of one human. That is
  -- the whole point of the identity model: afterwards, either SIM signs them
  -- into the surviving account.
  if v_loser.person_id is not null and v_survivor.person_id is not null
     and v_loser.person_id <> v_survivor.person_id then
    update phone_numbers set person_id = v_survivor.person_id, is_primary = false
     where person_id = v_loser.person_id;
    get diagnostics v_count = row_count;
    v_moved := v_moved || jsonb_build_object('numbers', v_count);
    update persons set merged_into = v_survivor.person_id where id = v_loser.person_id;
  else
    v_moved := v_moved || jsonb_build_object('numbers', 0);
  end if;

  -- The gallery is a text[] on the row, so it is unioned rather than moved.
  update providers
     set gallery = (select array(select distinct unnest(
           coalesce(v_survivor.gallery, '{}') || coalesce(v_loser.gallery, '{}'))))
   where id = p_survivor;

  -- Retire the loser last, so a failure anywhere above rolls the whole thing
  -- back with both profiles still live.
  update providers set merged_into = p_survivor where id = p_loser;

  update duplicate_candidates
     set status = 'merged', resolved_at = now()
   where status = 'open'
     and (least(profile_a, profile_b), greatest(profile_a, profile_b))
       = (least(p_survivor, p_loser), greatest(p_survivor, p_loser));

  return jsonb_build_object(
    'survivor', p_survivor, 'loser', p_loser,
    'survivor_slug', v_survivor.slug, 'loser_slug', v_loser.slug,
    'moved', v_moved);
end;
$$;

revoke execute on function public.merge_providers(uuid, uuid) from public, anon;
grant  execute on function public.merge_providers(uuid, uuid) to authenticated;

comment on table public.duplicate_candidates is
  'Suggestions for human review. Nothing here merges on its own — §3.4.';
comment on function public.merge_providers(uuid, uuid) is
  'Admin-only. Moves reviews, quotes, photos, saves and phone numbers to the survivor and sets merged_into on the loser. Deletes nothing.';
