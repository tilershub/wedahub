# වැඩHUB v1 — implementation plan

Nothing in this plan has been built yet. It is the map I want signed off before I
write code, per §0.2 of the brief. Section 2 is the part that needs your
decisions; the rest follows from it.

---

## 1. What is actually in the repo

Astro 5 (`output: 'server'`) + React islands, deployed as a Cloudflare Worker,
with Supabase for data and auth. Server code reads secrets through
`serverSecret(locals, NAME)` because `import.meta.env` is build-time only on
Workers.

**Routing.** File-based under `src/pages`. `src/middleware.ts` runs the
TilersHub migration redirects, then builds a cookie-backed Supabase server
client and puts `supabase` + `user` on `Astro.locals`. Every `.astro` page
reads from `Astro.locals.supabase`, so SSR queries run as the signed-in user
and RLS applies.

**Auth.** Google OAuth only, in `AuthButton.jsx` and inline in `BidForm.jsx`.
`signInWithOtp(email)` exists in `src/lib/supabase.js` but nothing calls it.
53 users in `auth.users`, all email, **zero with a phone number**. There is no
phone auth configured and no SMS code anywhere in the repo.

**The provider profile table is `providers`, not `tilers`.** `tilers` (38 rows)
is legacy: three references left, all read-only (`/tile`, `ExploreApp`, a role
check in `Notifications`). `providers` (4 rows) is what the directory, the
public profile page `/providers/[slug]`, the sitemap, the admin and the
dashboards all use. Wherever the brief says `profiles`, I mean `providers`.

**The job flow today.** `projects` are jobs, `bids` are quotes. A provider
opens `/jobs/<slug>-<uuid>`, fills `BidForm`, and one row lands in `bids` with
an optional `quote_amount`. The homeowner sees `BidCard`s in `Dashboard.jsx`
and contacts them on WhatsApp. There is no hire step, no completion, and no
link from a review back to a job.

**i18n.** Not key-based. `src/lib/sinhala.js` exports `si(value)`, which looks
an **English source string** up in a 2,400-line `sinhala.json` and passes
anything unknown through. `useLang()` is hardcoded `return 'si'`. Many
components skip it entirely and hardcode Sinhala in JSX. There is **no Tamil
anywhere**, and no way to select a language.

**Admin.** `/admin` renders `AdminDashboard.jsx`, a 1,500-line tabbed React
app, gated on `user.email === 'tilershub@gmail.com'` both server- and
client-side. `api/admin/providers/approve.ts` shows the house pattern for
privileged writes: use the admin's own session and let the `is_admin()` RLS
policies authorise it, rather than reaching for the service-role key.

**Tests/CI.** `.github/workflows/check.yml` runs `node --test
scripts/migration.test.mjs`, `npm run build`, then `npm run check:worker`.
`scripts/check-schema.mjs` probes every `table.column` referenced in `src/`
against PostgREST and fails the build on a mismatch — so new code and new
columns have to land together.

**Migrations.** There is no `supabase/migrations/` directory. The live schema
was applied out-of-band. I propose to start one (§4); it is the only way to give
you the separately-reviewable migration §10 asks for.

---

## 2. Decisions I need from you

### 2.1 There is no SMS gateway. This blocks all of §3 and §7. **(blocker)**

The brief says "use the existing SMS gateway". There isn't one — no provider
integration, no credentials, no `sms`/`otp` code, and Supabase phone auth is
unconfigured with zero phone users. Phone + OTP is the entry point for every
other feature here, so nothing in §3 can ship until this is chosen. Two routes:

- **(A) Supabase phone auth.** Configure Twilio/Vonage/MessageBird in the
  Supabase dashboard; the client calls `signInWithOtp({ phone })`. Least code.
  But international A2P delivery into Sri Lanka is expensive and needs sender-ID
  registration, and Supabase gives you per-hour limits, **not** the global daily
  spend cap §5.2 demands.
- **(B) Our own OTP against a Sri Lankan gateway** (Text.lk, Notify.lk, Dialog
  eSMS, Hutch). We hold `otp_codes` + `sms_log` tables, issue and check codes in
  an API route, enforce 3/hour, 10/day and a global daily cap ourselves, then
  mint the Supabase session server-side with the service-role key. More code,
  but it is the only option that satisfies §5.2's spend cap and the §7 message
  table, and local gateways are roughly an order of magnitude cheaper per SMS.

**I recommend (B).** I need the gateway name and its API credentials (as
Cloudflare secrets — do not paste them here), plus the registered sender ID.

Until that exists I can build everything else against a stub gateway that writes
to `sms_log` and logs instead of sending, so the flows are testable end to end.
Say the word and I will do that first.

### 2.2 There is no messaging feature. **(blocker for §5.3.4)**

§5.3.4 says the accepted quote "opens a message thread through the **existing**
messaging feature". There is no such feature and no messages table — all
contact in this app is a `wa.me` deep link. Options: (a) on accept, surface a
WhatsApp deep link between the two parties, which matches every other contact
path in the app and costs nothing; (b) build in-app threads, which is a feature
of its own and well outside "additive". **I recommend (a)** and will treat
in-app messaging as out of scope unless you say otherwise.

### 2.3 Trilingual strings need a new i18n layer

§4 requires si/en/ta on every new string. The existing `si()` helper is a
one-way English→Sinhala dictionary with no Tamil and no language selection, so
it cannot carry the §8 table. Rewriting it would touch every existing component,
which §0.3 forbids.

**Proposal:** add `src/lib/i18n.js` + `src/lib/strings.json` holding
`{ key: { si, en, ta } }`, a `lang` cookie set from a switcher (default `si`,
resolved in middleware, written onto `<html lang>`), and a `t(key)` used by
**all new** code. `si()` and `sinhala.json` stay exactly as they are, so no
existing screen changes behaviour. Over time old strings migrate; not in this PR.
The §8 Sinhala and Tamil go in verbatim with a `"_review": "pending-native"`
flag per the brief.

### 2.4 The completion code cannot be a column on the jobs table

§5.1 says jobs gain `completion_code`; §5.2 says a provider's fetch must never
return it. Postgres RLS filters rows, not columns, so the only column-level tool
is `REVOKE SELECT (completion_code)` — and that makes **`select('*')` on
`projects` fail outright** for everyone. `Dashboard.jsx`, `account.astro` and
`provider.astro` all do exactly that, so this would break the signed-in app.

**Proposal:** the code lives in its own table, `job_completion_codes`, with an
RLS policy granting SELECT only to the job's owner, plus
`job_code_attempts` for the §5.2 attempt log. `projects` still gets
`completed_at` and `hired_profile_id`. Same guarantee, enforced in the database,
without the blast radius. This is the one place I am deliberately departing from
the literal wording of §5.1.

### 2.5 Job status: keeping `active`, not renaming to `open`

§5.1 wants `open → hired → completed | cancelled`. Every one of the 14 live jobs
is `status = 'active'`, the public RLS policy on `projects` is literally
`status = 'active'`, and ~20 code sites test for it. Per §0.3 I will **keep
`active` as the open state** and add `hired`, `completed`, `cancelled` alongside
it. Renaming is a data migration plus an RLS rewrite for no user-visible gain.

### 2.6 The existing one-quote-per-job unique index blocks the five-stage flow

`bids_one_per_job_per_user` is `UNIQUE (job_id, user_id) WHERE user_id IS NOT
NULL`. Under the new flow one provider sends an estimate **and later** a final
quote on the same job, so the second insert would fail. The migration drops it
and creates `UNIQUE (job_id, user_id, kind)`. I am flagging it because it is a
destructive change to a live constraint that currently prevents duplicate
quotes, and because `bids` has no `profile_id` — it links to a provider by
`user_id` and `provider_slug`, so the §5.1 index becomes `(job_id, user_id,
kind)`.

### 2.7 Two smaller conflicts

- **The role switch.** §1 and §6 want a visible mode toggle. `AppShell.jsx`
  carries a deliberate comment: *"Role is a fact about the account, not a
  toggle, so there is no role switch taking up bar width."* I will follow the
  brief and add the switch, keeping the resolution in the one place it already
  lives (`Layout.astro`), but you are overriding a considered decision.
- **`claim_requests` already exists**, with `verify_claim()` and
  `get_claim_status()` RPCs, and `/verify-claim` 301s to `/join-wedahub`
  because the flow was retired. §3 says signing in *is* claiming, so the new
  path supersedes it. I will leave the table and its four rows untouched rather
  than drop them.

### 2.8 One dependency question

CSV parsing for §4. §10 forbids new dependencies without asking. I will hand-roll
a ~40-line RFC-4180 parser in `src/lib/csv.js` unless you would rather I add
`papaparse`. **Recommend hand-rolling**; the input shape is fixed and small.

---

## 3. Structural decisions worth stating up front

### 3.0 The completion code and the review gate — confirmed

Settled in conversation, and the reason the review flow changes from what the
app does today. The code has one job: it is the homeowner's proof that the work
actually happened, and it is the only thing that unlocks a review.

1. The owner accepts a final quote. That is the moment the job is finalised and
   starts, and the server **generates the 4-digit code automatically** right
   then — nobody types it, nobody picks it.
2. The code sits in the **owner's area, against that one job**, from that moment
   on. One code per job, not per provider and not per account.
3. The provider never sees it, is never sent it, and it is never in an SMS
   (§7) — the whole mechanism is worthless if the provider can obtain it
   without the owner handing it over.
4. Work happens. When it is finished, the owner **reads the code to the
   provider**, who enters it on their own screen.
5. A correct code closes the job (`completed`), and **only then** does the
   review button appear for the owner.

So the gate is not "the job looks old enough" or "the owner says so" — it is
"the provider proved, with a code only the owner had, that the owner considers
the work done". That is what §2.4 above is protecting: if a provider could read
the code out of an API response, they could close their own jobs and farm
reviews, and the gate would mean nothing.

This replaces the current behaviour outright. Today `reviews` has
`with_check: true` on insert, so **any anonymous visitor can post a review on
any profile at any time** — no account, no job, no relationship. Migration 09
removes that path (§5.3.6 of the brief).

*One thing I inferred rather than heard cleanly:* you mentioned a start date. I
have read that as "the code is generated when the job starts, and starting is
the same event as accepting the quote", since there is no separate start-date
concept in the schema. If you meant a distinct start milestone the provider
confirms before the work begins, tell me — that is a second state and a second
timestamp, not a rewording.

### 3.1 Everything else

- `normalizeLkPhone()` exists **twice on purpose** — once in JS
  (`src/lib/phone.js`) and once in SQL (`public.normalize_lk_phone`), with one
  shared test corpus asserting both agree. The SQL copy is what
  `phone_numbers.e164` is generated from, so nothing can write an unnormalised
  number even if it bypasses the app. The existing `phoneVariants()` in
  `supabase.js` stays for the legacy `bids.bidder_whatsapp` matching; new code
  never calls it.
- `providers.phone` and `providers.whatsapp` **stay** — they are how the whole
  directory contacts people, and removing them is not additive. They stop being
  identity: `persons`/`phone_numbers` becomes the only thing sign-in and claim
  matching read. Imported rows are inserted with both **NULL**, so the "never
  display the phone" rule of §4 holds at the API layer, not just in JSX. The
  pending claim number goes to a separate admin-only table.
- Privileged writes use the admin's own session + `is_admin()` policies, per
  `approve.ts`. The service-role key is used **only** where there is no session
  yet: OTP issue/verify and the unauthenticated "remove this listing" token.

---

## 4. Migrations

New directory `supabase/migrations/`, applied in order. Each is reviewable on its
own; §10 asks for them listed separately in the PR description, which I will do.

| # | File | What it does |
|---|---|---|
| 01 | `0001_phone_normalise.sql` | `normalize_lk_phone(text) returns text`, immutable. Digits-only, strips `+`/`00`, maps `0XXXXXXXXX`, `94XXXXXXXXX`, `XXXXXXXXX` to one `94XXXXXXXXX` form; returns NULL when unparseable so callers reject rather than store junk. |
| 02 | `0002_persons_phone_numbers.sql` | `persons` (`id`, `display_name`, `nic_hash` nullable, `merged_into` self-FK, `created_at`). `phone_numbers` (`id`, `person_id`, `e164` unique not null, `is_primary`, `verified_at`, `created_at`); `e164` has a CHECK that it equals `normalize_lk_phone(e164)`; partial unique index gives one primary per person. RLS: a person reads their own rows via their `providers.person_id`; admin reads all; **no client INSERT** — numbers only ever arrive through the verified-OTP path. |
| 03 | `0003_providers_identity.sql` | `providers` gains `person_id`, `claim_status` (`unclaimed`\|`claimed`, default `claimed` so the 4 live rows keep working), `source` (`self_signup`\|`import`\|`agent`, default `self_signup`), `merged_into`, `completeness int default 0`, `visit_fee int not null default 0`. Backfills `persons` rows for the 4 existing providers. Trigger enforcing at most 3 non-merged profiles per person. Indexes on `person_id`, `claim_status`, `merged_into`. |
| 04 | `0004_import.sql` | `import_batches` and `import_rows` (staging; raw cells + `normalised_phone` + `reject_reason`). `provider_claim_numbers` (`provider_id`, `e164`) — the pending claim number for an unclaimed listing, **admin-only RLS, never publicly selectable**. `phone_blacklist` (`e164`, `reason`, `created_at`) for §4's removal. `listing_removal_tokens` (`token`, `provider_id`, `used_at`). |
| 05 | `0005_duplicates.sql` | `duplicate_candidates` per §3.4 (`profile_a`, `profile_b`, `reason`, `score`, `status`, `created_at`) + `photo_hashes` (`provider_id`, `sha256`) and a `device_fingerprints` table to feed the `same_photo_hash` / `same_device` signals. `merge_providers(survivor uuid, loser uuid)` SECURITY DEFINER: moves reviews, bids, photos, `phone_numbers`, sets `merged_into`, never deletes. Admin-only. |
| 06 | `0006_site_visits.sql` | `site_visits` exactly as §5.1 — `fee` copied from `providers.visit_fee` at request time by the RPC, `status` `requested`→`confirmed`→`done`\|`cancelled`, partial unique on `(job_id, provider_id)` where not cancelled. RLS: job owner and the quoting provider only. |
| 07 | `0007_bids_two_stage.sql` | `bids` gains `kind` (`estimate`\|`final`, default `estimate`), `low`, `high`. CHECK per kind: `estimate` needs `low`/`high` and null `quote_amount`; `final` needs `quote_amount` and null `low`/`high`. **Backfills all 8 live rows to `final`.** Drops `bids_one_per_job_per_user`, creates `UNIQUE (job_id, user_id, kind)`. Trigger `require_site_visit_before_final()` rejecting a `final` insert with no `done` `site_visits` row for that job+provider (§5.2). |
| 08 | `0008_job_completion.sql` | `projects` gains `completed_at`, `hired_profile_id`; status set extended with `hired`/`completed`/`cancelled` (§2.5). `job_completion_codes` (owner-SELECT-only RLS, §2.4) and `job_code_attempts`. `accept_final_quote(bid_id)`: job → `hired`, other bids → `lost`, generates the 4-digit code. `close_job(job_id, code) returns boolean`: hired provider only, logs every attempt, 5 failures per provider per job then a one-hour lock. |
| 09 | `0009_reviews_gated.sql` | `reviews` gains `job_id`. Replaces the `anyone inserts reviews` policy (`with_check: true`) with one requiring a `completed` job that the reviewer owns and whose `hired_profile_id` is the provider being reviewed. **This closes an open hole** — today any anonymous visitor can post a review on any profile. |
| 10 | `0010_otp.sql` | `otp_codes` (hashed code, `e164`, `expires_at`, `consumed_at`, attempt count) and `sms_log` (`e164`, `template`, `cost_units`, `sent_at`) backing the §5.2 limits: 3/number/hour, 10/number/day, global daily cap, and §4's "at most one claim invite per number, ever". Service-role only. |

Every new table gets RLS enabled and explicit policies in the same file — §0.5.

---

## 5. Files

### New

| Path | Purpose |
|---|---|
| `src/lib/phone.js` | `normalizeLkPhone`, the single writer-side helper (§2 of brief). |
| `src/lib/i18n.js`, `src/lib/strings.json` | si/en/ta layer (§2.3 above), carrying the §8 table. |
| `src/lib/names.js` | Name normalisation + similarity for the §3.2 near-match (case, spacing, Sinhala/English variants). |
| `src/lib/csv.js` | Minimal RFC-4180 parse/serialise for import + report (§2.8). |
| `src/lib/sms.js` | Server-side gateway adapter + template rendering in the recipient's language (§7). Stubbed until §2.1 is answered. |
| `src/lib/quotes.js` | Estimate-range vs final-price formatting, stage derivation. |
| `src/pages/api/auth/otp/send.ts`, `verify.ts` | Issue/check OTP, rate limits, session mint. |
| `src/pages/api/auth/numbers/add.ts`, `confirm.ts` | §3.3 "add another number". |
| `src/pages/api/auth/claim-match.ts` | §3.1/§3.2 server-side matching: known number, unclaimed-import match, near-match. Never runs client-side. |
| `src/pages/api/visits/request.ts`, `respond.ts`, `complete.ts` | Site visit lifecycle; snapshots `visit_fee` at request. |
| `src/pages/api/jobs/accept.ts`, `close.ts` | Thin wrappers over `accept_final_quote` / `close_job`. |
| `src/pages/api/admin/import/validate.ts`, `publish.ts`, `report.ts` | §4 CSV → staging → report → publish. |
| `src/pages/api/admin/duplicates/merge.ts` | Wrapper over `merge_providers`. |
| `src/pages/api/listings/remove.ts` | §4 one-tap removal, token-authenticated, no session. |
| `src/pages/remove-listing.astro` | Landing page for that token link. |
| `scripts/phone.test.mjs` | §9.1 unit tests, incl. asserting the JS and SQL helpers agree. |
| `supabase/migrations/*.sql` | The ten above. |

### Modified

| Path | Change |
|---|---|
| `src/lib/supabase.js` | Add phone-OTP helpers; remove `signInWithGoogle` and the unused email `signInWithOtp`. `phoneVariants` stays for legacy bid matching. |
| `src/middleware.ts` | Resolve `lang` from cookie onto `locals`. |
| `src/env.d.ts` | `locals.lang`, `locals.mode`. |
| `src/layouts/Layout.astro` | `<html lang>` from `locals.lang`; extend the existing server-side role resolution to the owner/provider mode (§1 — one place). |
| `src/components/AppShell.jsx` | Visible mode switch + language switch (§2.7). |
| `src/components/AuthButton.jsx` | Google modal → phone + OTP + "is this you?" claim step. |
| `src/components/JoinForm.jsx` | 90-second provider signup on phone identity; nothing else blocking. |
| `src/components/ProfileEditor.jsx` | Visit fee, add-another-number, completeness meter, photos. |
| `src/components/BidForm.jsx` | Stage-driven: estimate range → visit → final quote → code entry. Google sign-in block removed. |
| `src/components/BidCard.jsx` | Renders a range with the estimate label, or a final price — never the same styling (§5.3.1). |
| `src/components/Dashboard.jsx` | Owner job detail (estimates, final quotes, visit-fee line, completion-code card), owner my-jobs chips and split counts, provider my-work stages (§6). |
| `src/components/ReviewsSection.jsx` | Review only at `completed`; the always-available form goes. |
| `src/components/AdminDashboard.jsx` | New Import, Duplicates and Merge tabs. |
| `src/components/ProviderDirectory.jsx`, `src/pages/providers/index.astro` | §3.5 search clustering — one card per normalised name+city+trade, most complete wins. |
| `src/pages/providers/[slug].astro` | "Not yet on වැඩHUB" chip, no contact affordances when unclaimed, 301 when `merged_into` is set. |
| `src/pages/login.astro` | Phone entry; the `.si-text`/`.en-text` spans go through the new `t()`. |
| `src/pages/api/reviews/create.ts` | Require a completed job. (It also currently inserts a `user_id` column that does not exist on `reviews` — fixing that at the same time.) |
| `src/pages/api/admin/providers/approve.ts` | Set `person_id`, `claim_status`, `source` on the created provider. |
| `.github/workflows/check.yml` | Run `scripts/phone.test.mjs`. |
| `README.md` | Note the new migrations directory and how to apply it. |

`tilers`, the blog/editorial code, `SocialHub`, AdSense and the migration
redirects are not touched.

---

## 6. How I will test §9

1–2, 5–7 and 10 are driven by the claim/near-match API and need the §2.1 stub or
gateway; 3–4, 8–9, 11–12 are testable immediately. `node --test
scripts/phone.test.mjs` covers §9.1 against both helper copies. §9.4 and §9.11
("no phone in the API response", "the provider's fetch never returns the code")
I will verify with direct PostgREST requests as anon and as a second provider
account, not by reading the JSX — those are the two claims worth proving from
outside the app. §9.13 (a full run in Sinhala, then Tamil) happens against the
new `t()` layer; strings still on `si()` from existing screens will render
Sinhala in a Tamil session, and I will list exactly which ones rather than
quietly half-translating them.

---

## 7. Not building (§1, §10)

No verification badges, membership, subscriptions, payments, escrow or
commission — and no extension of the `verification_status` column or the
`VERIFICATION_BADGES` map that already exist. No new runtime dependencies. No
in-app messaging (§2.2). No renaming of `tilers` or `bids`.
