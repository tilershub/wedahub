-- OTP issue/check and the SMS ledger.
--
-- This is the one endpoint where an attacker spends real money: every request
-- sends a message someone bills us for. So the limits live here, next to the
-- data, rather than in the route that happens to call them — a second caller
-- added later inherits them for free.
--
-- Codes are stored as a salted hash. A database leak should not hand anyone a
-- live code, and nothing in the app ever needs to read one back: verification
-- compares hashes.
--
-- Neither table has an RLS policy for anon or authenticated, which is
-- deliberate: with RLS on and no policy, only the service role reaches them,
-- and OTP issue/verify is server-side by definition.

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
create policy "admin reads settings"   on public.app_settings for select using (is_admin());
create policy "admin updates settings" on public.app_settings for update using (is_admin());

-- A row rather than a constant so the cap can be raised during an incident
-- without a deploy. Numbers are a starting point, not a measurement.
insert into public.app_settings (key, value) values
  ('sms_daily_cap', '{"messages": 2000, "cost": 6000, "currency": "LKR"}')
on conflict (key) do nothing;

create table if not exists public.otp_codes (
  id          uuid primary key default gen_random_uuid(),
  e164        text not null check (e164 = public.normalize_lk_phone(e164)),
  -- sha256(code || salt). The code itself is never stored.
  code_hash   text not null,
  salt        text not null,
  purpose     text not null check (purpose in ('sign_in', 'add_number', 'claim_verify')),
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  -- Wrong guesses against this code. Five and it is dead, so a six-digit space
  -- cannot be walked.
  attempts    int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists otp_codes_lookup_idx
  on public.otp_codes (e164, purpose, created_at desc);
create index if not exists otp_codes_expiry_idx on public.otp_codes (expires_at);

create table if not exists public.sms_log (
  id           uuid primary key default gen_random_uuid(),
  e164         text not null,
  -- Which message, not the body: bodies carry codes and names.
  template     text not null,
  lang         text not null default 'si',
  -- Text.lk reports both per message; they are what the cap meters on.
  segments     int not null default 1,
  cost         numeric(10, 4),
  provider     text not null default 'textlk',
  provider_uid text,
  status       text not null default 'sent'
               check (status in ('sent', 'failed', 'stubbed')),
  error        text,
  sent_at      timestamptz not null default now()
);

create index if not exists sms_log_number_idx   on public.sms_log (e164, sent_at desc);
create index if not exists sms_log_sent_at_idx  on public.sms_log (sent_at desc);
-- Backs "at most one claim invite per number, ever".
create index if not exists sms_log_template_idx on public.sms_log (template, e164);

alter table public.otp_codes enable row level security;
alter table public.sms_log   enable row level security;

-- Readable for ops. Still no write path for any client role.
create policy "admin reads sms log" on public.sms_log for select using (is_admin());

-- Every limit in one place, so the answer is the same whoever asks.
--
-- Returns {allowed, reason, retry_after_seconds}. `reason` is a key, not a
-- sentence: the caller renders it in the recipient's language.
create or replace function public.otp_rate_check(p_e164 text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e164     text := public.normalize_lk_phone(p_e164);
  v_hour     int;
  v_day      int;
  v_sent_day int;
  v_cost_day numeric;
  v_cap      jsonb;
  v_oldest   timestamptz;
begin
  if v_e164 is null then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_number');
  end if;

  select count(*), min(created_at) into v_hour, v_oldest
  from public.otp_codes
  where e164 = v_e164 and created_at > now() - interval '1 hour';

  if v_hour >= 3 then
    return jsonb_build_object(
      'allowed', false, 'reason', 'too_many_this_hour',
      'retry_after_seconds',
      greatest(1, ceil(extract(epoch from (v_oldest + interval '1 hour' - now()))))::int);
  end if;

  select count(*) into v_day
  from public.otp_codes
  where e164 = v_e164 and created_at > now() - interval '1 day';

  if v_day >= 10 then
    return jsonb_build_object('allowed', false, 'reason', 'too_many_today');
  end if;

  -- The spend cap. Without it, one script turns a marketing budget into
  -- somebody else's afternoon.
  select value into v_cap from public.app_settings where key = 'sms_daily_cap';
  select count(*), coalesce(sum(cost), 0) into v_sent_day, v_cost_day
  from public.sms_log
  where sent_at > date_trunc('day', now()) and status = 'sent';

  if v_sent_day >= (v_cap ->> 'messages')::int
     or v_cost_day >= (v_cap ->> 'cost')::numeric then
    return jsonb_build_object('allowed', false, 'reason', 'daily_cap_reached');
  end if;

  return jsonb_build_object('allowed', true);
end;
$$;

revoke execute on function public.otp_rate_check(text) from public, anon, authenticated;

comment on table public.otp_codes is
  'Salted hashes of issued OTPs. The code itself is never stored and never leaves the send call.';
comment on table public.sms_log is
  'Every message attempted, with cost. Backs the daily spend cap and the one-claim-invite-per-number rule.';
