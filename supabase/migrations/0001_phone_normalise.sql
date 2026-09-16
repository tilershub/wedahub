-- One canonical form for a Sri Lankan phone number, in the database.
--
-- src/lib/phone.js does this in JS so the browser can validate as you type.
-- This is the same function in SQL, and it is the one that matters: it is what
-- phone_numbers.e164 is CHECKed against, so a number cannot enter the system
-- unnormalised even if something writes around the app. scripts/phone.test.mjs
-- asserts the two agree on a shared corpus.
--
-- Canonical form is E.164 without the plus — 94771234567 — which is also what
-- the Text.lk API wants as `recipient`, so nothing reformats on the way out.
--
-- Returns NULL for anything unreadable rather than guessing. Guessing is how
-- two different people end up merged.

create or replace function public.normalize_lk_phone(input text)
returns text
language plpgsql
immutable
strict
as $$
declare
  digits text;
  nsn    text;
begin
  digits := regexp_replace(input, '[^0-9]', '', 'g');
  if digits = '' then
    return null;
  end if;

  -- 00 is the international access prefix: 0094771234567.
  if left(digits, 2) = '00' then
    digits := substr(digits, 3);
  end if;

  if length(digits) = 9 then
    -- Bare national number, as people write it when the form says "+94".
    nsn := digits;
  elsif length(digits) = 10 and left(digits, 1) = '0' then
    -- Trunk form — how almost everyone writes it locally.
    nsn := substr(digits, 2);
  elsif length(digits) = 11 and left(digits, 2) = '94' then
    nsn := substr(digits, 3);
  else
    return null;
  end if;

  -- National significant numbers are 9 digits and never start with 0:
  -- mobiles are 7X, fixed lines are area codes 11, 21, 31, 81 and so on.
  if nsn ~ '^[1-9][0-9]{8}$' then
    return '94' || nsn;
  end if;

  return null;
end;
$$;

comment on function public.normalize_lk_phone(text) is
  'Canonical Sri Lankan number as 94XXXXXXXXX, or NULL if unparseable. Mirrored by src/lib/phone.js.';

-- Pure string work on its argument: no table access, nothing to leak. Exposed
-- so scripts/phone.test.mjs can assert it against the JS copy from CI, where
-- the only credential available is the anon key.
grant execute on function public.normalize_lk_phone(text) to anon, authenticated;
