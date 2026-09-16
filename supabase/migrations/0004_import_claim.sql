-- Bulk import staging, pending claim numbers, and the opt-out.
--
-- The important table here is provider_claim_numbers. An imported listing has
-- a phone number attached to it, but nobody has verified that number, so it
-- must not go into phone_numbers — that table means "a verified SIM belonging
-- to this person", and putting an unverified import row in it would let anyone
-- whose number appeared in a CSV be signed in as somebody else.
--
-- It is also why the number is not on providers. §4 forbids ever displaying an
-- unclaimed listing's number: publishing it without consent is a problem under
-- the Personal Data Protection Act, and it removes the only reason to claim
-- the listing. providers is world-readable where status = 'active', so a
-- column there is a column the public API returns. Here, with no policy for
-- anon or authenticated, it is only reachable by the server.

create table if not exists public.import_batches (
  id           uuid primary key default gen_random_uuid(),
  filename     text,
  source_label text,
  uploaded_by  uuid references auth.users(id),
  status       text not null default 'staged'
               check (status in ('staged', 'published', 'discarded')),
  row_count    int not null default 0,
  created_at   timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.import_rows (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references public.import_batches(id) on delete cascade,
  row_number  int not null,
  -- The cells exactly as the CSV had them, kept so the rejection report can
  -- show the importer what they actually typed.
  raw         jsonb not null,
  normalised_phone text,
  -- null until validated; a key like 'bad_phone' or 'unknown_city', not a
  -- sentence, so the report renders in the admin's language.
  reject_reason text,
  provider_id uuid references public.providers(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (batch_id, row_number)
);

create index if not exists import_rows_batch_idx on public.import_rows (batch_id);
create index if not exists import_rows_phone_idx on public.import_rows (normalised_phone)
  where normalised_phone is not null;

-- The unverified number behind an unclaimed listing. One per listing.
create table if not exists public.provider_claim_numbers (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  e164        text not null check (e164 = public.normalize_lk_phone(e164)),
  -- §4: at most one claim invite per number, ever.
  invited_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists provider_claim_numbers_e164_idx
  on public.provider_claim_numbers (e164);

-- §3.1: when someone holding the number says the listing is not them, the
-- listing is flagged for review rather than deleted or silently reassigned.
-- The import was wrong about something, and a human needs to see which.
alter table public.providers
  add column if not exists claim_denied_at timestamptz;

-- "Remove this listing" (§4) and never import this number again.
create table if not exists public.phone_blacklist (
  e164       text primary key check (e164 = public.normalize_lk_phone(e164)),
  reason     text not null default 'listing_removed'
             check (reason in ('listing_removed', 'complaint', 'manual')),
  created_at timestamptz not null default now()
);

-- The token in the removal link. §4 requires this to work without signing in —
-- the whole point is that the person has no account and wants no account.
create table if not exists public.listing_removal_tokens (
  token       text primary key,
  provider_id uuid not null references public.providers(id) on delete cascade,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists listing_removal_tokens_provider_idx
  on public.listing_removal_tokens (provider_id);

alter table public.import_batches         enable row level security;
alter table public.import_rows            enable row level security;
alter table public.provider_claim_numbers enable row level security;
alter table public.phone_blacklist        enable row level security;
alter table public.listing_removal_tokens enable row level security;

create policy "admin reads batches" on public.import_batches for select using (is_admin());
create policy "admin reads rows"    on public.import_rows    for select using (is_admin());
create policy "admin reads blacklist" on public.phone_blacklist for select using (is_admin());

-- provider_claim_numbers and listing_removal_tokens get NO select policy at
-- all, for anyone. The first holds numbers §4 says must never be displayed;
-- the second holds bearer tokens. Both are reachable only by the server with
-- the service role. This is the data-layer half of "shows no phone number
-- anywhere, including in the API response".

comment on table public.provider_claim_numbers is
  'Unverified numbers behind unclaimed listings. Never in phone_numbers (unverified) and never on providers (public). No client may select from this table.';
comment on table public.phone_blacklist is
  'Numbers whose owner removed their listing. Blocked from re-import, permanently.';
