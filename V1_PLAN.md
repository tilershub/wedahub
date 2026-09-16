# වැඩHUB v1 — implementation plan

Revision 2. Nothing has been built yet. §1 is the repo as it stands, §2 records
the decisions you have now made, §3 is the one open question those decisions
created, §4–6 are the build.

---

## 1. What is actually in the repo

Astro 5 (`output: 'server'`) + React islands, deployed as a Cloudflare Worker,
with Supabase for data and auth. Server code reads secrets through
`serverSecret(locals, NAME)` because `import.meta.env` is build-time only on
Workers.

**Routing.** File-based under `src/pages`. `src/middleware.ts` runs the
TilersHub migration redirects, then builds a cookie-backed Supabase server
client and puts `supabase` + `user` on `Astro.locals`. Every `.astro` page reads
from `Astro.locals.supabase`, so SSR queries run as the signed-in user and RLS
applies.

**Auth.** Google OAuth only, in `AuthButton.jsx` and inline in `BidForm.jsx`.
`signInWithOtp(email)` exists in `src/lib/supabase.js` but nothing calls it.
53 users in `auth.users`, all email, **zero with a phone number**.

**The provider profile table is `providers`, not `tilers`.** `tilers` (38 rows)
is legacy: three read-only references left (`/tile`, `ExploreApp`, a role check
in `Notifications`). `providers` (4 rows) backs the directory, the public
profile page `/providers/[slug]`, the sitemap, the admin and both dashboards.
Wherever the brief says `profiles`, I mean `providers`.

**The job flow today.** `projects` are jobs, `bids` are quotes. A provider fills
`BidForm` and one row lands in `bids` with an optional `quote_amount`. The
homeowner sees `BidCard`s and contacts them on WhatsApp. No hire step, no
completion, no link from a review back to a job.

**i18n.** Not key-based. `si(value)` looks an **English source string** up in a
2,400-line `sinhala.json` and passes anything unknown through. `useLang()` is
hardcoded `'si'`. Many components hardcode Sinhala in JSX. No Tamil anywhere,
no language selection.

**Admin.** `/admin` renders `AdminDashboard.jsx`, gated on
`user.email === 'tilershub@gmail.com'` server- and client-side.
`api/admin/providers/approve.ts` is the house pattern for privileged writes: use
the admin's own session and let `is_admin()` RLS authorise it, rather than the
service-role key.

**Tests/CI.** `check.yml` runs `node --test scripts/migration.test.mjs`, `npm run
build`, `npm run check:worker`. `scripts/check-schema.mjs` probes every
`table.column` referenced in `src/` against PostgREST and fails the build on a
mismatch — so new code and new columns must land together.

**Migrations.** No `supabase/migrations/` directory; the live schema was applied
out-of-band. I am starting one — it is the only way to give you a separately
reviewable migration.

---

## 2. Decisions you have made

### 2.1 SMS gateway: Text.lk or Notify.lk ✅

You are opening an account with one of them. I will write **one adapter with
both drivers** behind a `SMS_PROVIDER` env var, so the choice is a config change
and neither account blocks the build. Both are confirmed to want the number in
the **exact canonical form the brief mandates** — `94771234567`, no `+`, no
leading zero — which is a useful confirmation that the normalisation target is
right.

| | Text.lk | Notify.lk |
|---|---|---|
| Endpoint | `POST https://app.text.lk/api/v3/sms/send` | `POST https://app.notify.lk/api/v1/send` |
| Auth | `Authorization: Bearer <API_KEY>` | `user_id` + `api_key` as params |
| Body | `recipient`, `sender_id`, `type: "plain"`, `message` | `to`, `sender_id`, `message` |
| Success | `{status:"success", data:{uid, status, cost, sms_count}}` | `{status:"success", data:"Sent"}` |
| Failure | `{status:"error", message:"…"}` | undocumented — I treat any non-`success` as failure |

Text.lk returns **`cost` and `sms_count` per message**, which is what the §5.2
global daily spend cap should meter on. Notify.lk does not, so on that driver I
meter on segment count (160 GSM-7 chars, 70 if the body contains Sinhala or
Tamil — worth knowing: **a Sinhala SMS is 70 characters, not 160**, so
localised templates cost roughly 2.3× per message and the §7 "keep volume low"
instruction matters more than it looks).

Secrets: `SMS_PROVIDER`, `SMS_SENDER_ID`, `TEXTLK_API_KEY` *or*
`NOTIFYLK_USER_ID` + `NOTIFYLK_API_KEY`, set in Cloudflare → Variables and
Secrets. **Do not paste them into chat.** Until they exist the adapter runs in
stub mode: it writes the row to `sms_log`, logs the body, and returns success,
so every flow is testable end to end today.

### 2.2 In-app messaging: build it ✅

Scope in §5.4 below. One thread per (job, provider). It opens when the provider
sends an **estimate**, not at accept — the two of them have to be able to talk
to arrange the site visit, which happens before any final quote exists.

### 2.3 The code is revealed at the start, not at the end ✅ — and this is a real fix

You caught a genuine hole in the brief. Under §5 as written, the code changes
hands only when the work is finished, so a provider who takes the job and then
walks off, or stops answering the phone, **can never be reviewed** — the job
never reaches `completed`, and the review never unlocks. The worst providers
would be the ones with no reviews, which is exactly backwards.

So the code's meaning changes. It is no longer proof the work was *finished*. It
is proof the engagement *happened*:

1. Owner accepts a final quote → job `hired`, the 4-digit code is generated
   automatically and appears in the owner's area against that job.
2. On the day they agree to start, the owner reads the code to the provider.
3. The provider enters it → the engagement is confirmed: this provider really is
   doing this customer's job. Job → `in_progress`.
4. From that point the homeowner's review is protected — whatever the provider
   does or does not do afterwards.

The code still never reaches the provider's browser, is never in an SMS, and is
never readable by anyone but the owner. §5.2's rate limit and attempt log stay.

Two consequences, both handled below: **the code no longer closes the job**, so
completion needs its own signal (§5.3); and **review can no longer unlock on
completion alone**, which is §3.

### 2.4 Settled previously, unchanged

- **The completion code cannot be a column on `projects`.** RLS filters rows,
  not columns; the only column-level tool is `REVOKE SELECT`, which makes
  `select('*')` on `projects` fail for everyone — and `Dashboard.jsx`,
  `account.astro` and `provider.astro` all do exactly that. The code lives in
  its own owner-readable table.
- **Job status keeps `active` as the open state.** All 14 live jobs use it, the
  public RLS policy is literally `status = 'active'`, ~20 code sites test for
  it. New states are added alongside, not renamed.
- **`bids_one_per_job_per_user` must be dropped.** It is `UNIQUE (job_id,
  user_id)`, so a provider sending an estimate *and later* a final quote would
  fail on the second insert. Replaced with `UNIQUE (job_id, user_id, kind)`.
  `bids` has no `profile_id` — it links by `user_id` and `provider_slug`.
- **Trilingual strings need a new layer.** `si()` is a one-way
  English→Sinhala dictionary with no Tamil and no language selection.
  `src/lib/i18n.js` + `strings.json` (`{key:{si,en,ta}}`) + a `lang` cookie, used
  by all **new** code. `si()` and `sinhala.json` are left exactly as they are.
- **The role switch** overrides a deliberate comment in `AppShell.jsx` ("Role is
  a fact about the account, not a toggle"). Following the brief.
- **`claim_requests` and its RPCs stay**, unused, rather than being dropped.
- **CSV parsing hand-rolled** in `src/lib/csv.js` (~40 lines, RFC 4180) rather
  than adding `papaparse`, per §10's no-new-dependencies rule.

---

## 3. The one open question your change creates

Moving the code to the start fixes abandonment but opens the opposite hole: if
the review unlocks the moment the provider enters the code, **it unlocks before
any work has been done**.

That matters for one reason more than any other. Right now a fake review costs
nothing: sign up as a homeowner with a second SIM, post a job, "hire" yourself,
enter your own code, write yourself five stars. Two minutes, start to finish.
With 10,000 imported profiles competing for the same jobs and no verification
tier in v1, that is the attack that actually gets used.

**My recommendation — split the two events:**

- Entering the code **confirms the engagement**. That is a valuable signal on
  its own: it is the first hard evidence a real hire happened.
- The review **unlocks on whichever comes first**: the job being marked
  complete, or a cooling period after engagement — the provider's own quoted
  timeline, or 7 days flat if they gave none.

Normal job: finishes in a few days, either side marks it done, review unlocks
immediately — exactly as the brief intended. Abandoned job: nobody marks it
done, the timer runs out, the homeowner reviews anyway — exactly the protection
you asked for. And the fake-review loop now costs a week of waiting per fake
instead of two minutes.

I would also **label the review by how it unlocked** — a review on a job that
was never completed reads differently from one left after finished work, and
saying so is more useful to the next homeowner than a bare star count.

**If you would rather it unlock immediately on code entry, say so and I will
build that instead** — it is your call, and the abandonment protection you asked
for is intact either way. I am flagging it because the cost lands later, as
rating inflation across a directory you are about to grow 250×, and it is much
cheaper to decide now than to clean up.

One more thing I noticed but am *not* building: you said entering the code
"verifies that this provider is doing this customer's job". That would also work
as a way to attach a provider the homeowner found **off-platform** — they give
out the code, the provider enters it, and a real job lands on the platform that
otherwise never would. That is a genuinely good growth mechanism, but it
contradicts §5.2's "only the hired provider can enter the code". Parking it as
v1.1 unless you want it now.

---

## 4. Migrations

New directory `supabase/migrations/`. Each file is reviewable on its own and
will be listed separately in the PR description.

| # | File | What it does |
|---|---|---|
| 01 | `0001_phone_normalise.sql` | `normalize_lk_phone(text)`, immutable. Digits only, strips `+`/`00`, maps `0XXXXXXXXX` / `94XXXXXXXXX` / `XXXXXXXXX` to one `94XXXXXXXXX`; NULL when unparseable so callers reject rather than store junk. |
| 02 | `0002_persons_phone_numbers.sql` | `persons` (`id`, `display_name`, `nic_hash` nullable, `merged_into`, `created_at`). `phone_numbers` (`person_id`, `e164` unique not null, `is_primary`, `verified_at`), with a CHECK that `e164 = normalize_lk_phone(e164)` and a partial unique index for one primary per person. RLS: own rows + admin; **no client INSERT** — numbers arrive only through verified OTP. |
| 03 | `0003_providers_identity.sql` | `providers` gains `person_id`, `claim_status`, `source`, `merged_into`, `completeness`, `visit_fee int not null default 0`. Backfills `persons` for the 4 live rows. Trigger: max 3 non-merged profiles per person. |
| 04 | `0004_import.sql` | `import_batches`, `import_rows` (staging + `normalised_phone` + `reject_reason`). `provider_claim_numbers` — the pending claim number for an unclaimed listing, **admin-only, never publicly selectable**. `phone_blacklist`. `listing_removal_tokens`. |
| 05 | `0005_duplicates.sql` | `duplicate_candidates` per §3.4, plus `photo_hashes` and `device_fingerprints` to feed the signals. `merge_providers(survivor, loser)` SECURITY DEFINER: moves reviews, bids, photos, numbers, threads; sets `merged_into`; deletes nothing. |
| 06 | `0006_site_visits.sql` | `site_visits` per §5.1. `fee` snapshotted from `providers.visit_fee` at request time. Partial unique on `(job_id, profile_id)` where not cancelled. RLS: job owner + quoting provider only. |
| 07 | `0007_bids_two_stage.sql` | `bids` gains `kind` (`estimate`\|`final`), `low`, `high`. CHECK per kind. **Backfills the 8 live rows to `final`.** Drops `bids_one_per_job_per_user`, creates `UNIQUE (job_id, user_id, kind)`. Trigger rejecting a `final` with no `done` site visit. |
| 08 | `0008_engagement_code.sql` | **Reworked for §2.3.** `projects` gains `hired_profile_id`, `engagement_confirmed_at`, `completed_at`, `review_unlocks_at`; states `hired`, `in_progress`, `completed`, `abandoned`, `cancelled`. `job_engagement_codes` (owner-SELECT-only) + `job_code_attempts`. `accept_final_quote(bid_id)` → `hired`, others `lost`, generates the code. `confirm_engagement(job_id, code)` → `in_progress`, sets the review timer; 5 attempts per provider per job then a one-hour lock, every attempt logged. `mark_job_complete(job_id)` callable by either party. |
| 09 | `0009_reviews_gated.sql` | `reviews` gains `job_id` and `unlocked_by` (`completed`\|`timer`). Replaces the `anyone inserts reviews` policy — which today has `with_check: true`, so **any anonymous visitor can review any profile** — with one requiring a job the reviewer owns, whose `hired_profile_id` is the provider, past `review_unlocks_at`. |
| 10 | `0010_otp_sms.sql` | `otp_codes` (hashed, `e164`, `expires_at`, `consumed_at`, attempts) and `sms_log` (`e164`, `template`, `segments`, `cost`, `provider_uid`, `sent_at`) backing 3/number/hour, 10/number/day, the global daily cap, and §4's one-claim-invite-per-number-ever. Service-role only. |
| 11 | `0011_messaging.sql` | **New, per §2.2.** `conversations` (`job_id`, `owner_user_id`, `provider_id`, `last_message_at`) unique per pair; `messages` (`conversation_id`, `sender_user_id`, `body`, `read_at`). RLS: the two participants only. A thread cannot exist without an estimate on that job, and an unclaimed profile can never be a participant (§4). |

Every new table gets RLS enabled with explicit policies in the same file.

---

## 5. Build

### 5.1 New files

`src/lib/` — `phone.js` (the single normaliser), `i18n.js` + `strings.json`
(si/en/ta, carrying §8 verbatim with a `pending-native` flag), `names.js` (§3.2
similarity), `csv.js`, `sms.js` (both drivers + templates + spend cap),
`quotes.js` (range vs price formatting, stage derivation).

`src/pages/api/` — `auth/otp/{send,verify}.ts`, `auth/numbers/{add,confirm}.ts`,
`auth/claim-match.ts` (§3.1/3.2, server-only), `visits/{request,respond,complete}.ts`,
`jobs/{accept,confirm-code,complete}.ts`, `messages/{send,list,read}.ts`,
`admin/import/{validate,publish,report}.ts`, `admin/duplicates/merge.ts`,
`listings/remove.ts` (token, no session).

`src/pages/remove-listing.astro`, `src/components/{MessageThread,MessageList}.jsx`,
`scripts/phone.test.mjs`, `supabase/migrations/*.sql`.

### 5.2 Modified files

`src/lib/supabase.js` (phone OTP helpers in, Google out) · `src/middleware.ts`
(+ `lang`) · `src/env.d.ts` · `src/layouts/Layout.astro` (lang attr, mode
resolution in the one place it already lives) · `AppShell.jsx` (mode switch,
language switch, unread badge) · `AuthButton.jsx` (phone + OTP + "is this
you?") · `JoinForm.jsx` (90-second signup) · `ProfileEditor.jsx` (visit fee,
add-another-number, completeness) · `BidForm.jsx` (stage-driven) ·
`BidCard.jsx` (range vs price, never the same styling) · `Dashboard.jsx` (owner
job detail + code card, my-jobs chips, provider my-work stages) ·
`ReviewsSection.jsx` (gated) · `AdminDashboard.jsx` (Import, Duplicates, Merge
tabs) · `ProviderDirectory.jsx` + `providers/index.astro` (§3.5 clustering) ·
`providers/[slug].astro` (unclaimed chip, no contact, 301 when merged) ·
`login.astro` · `api/reviews/create.ts` (gate; also currently inserts a
`user_id` column that does not exist on `reviews` — fixing that too) ·
`api/admin/providers/approve.ts` · `check.yml` · `README.md`.

Not touched: `tilers`, the blog/editorial code, `SocialHub`, AdSense, the
migration redirects.

### 5.3 The job state machine

```
active ──accept final quote──▶ hired ──provider enters code──▶ in_progress
(open)   code generated,        (code in owner's area)          engagement confirmed,
         others → lost                                          review timer starts
                                                                      │
                          ┌───────────────────────────────────────────┤
                          ▼                                           ▼
                     completed                                   abandoned
                (either side marks done)                (timer expired, never completed)
                          └──────────── review unlocks ───────────────┘
```
`cancelled` reachable from `active` and `hired`. Completion carries no money in
v1 (no escrow, no payments), so it drives the status chip and the review label
and nothing else — it does not need to be adversarially airtight.

### 5.4 Messaging

Thread opens on the first estimate. Participants: job owner + that one provider.
Unclaimed profiles cannot participate. Realtime via the Supabase subscription
already in `@supabase/supabase-js`, falling back to refetch-on-focus.

**No SMS per message.** §7 caps notification volume, a Sinhala SMS is 70
characters, and a chatty thread would outspend every other template combined.
In-app badge only, with one digest SMS if a message is unread for 24h. Flagging
it because it is a judgement call, not something the brief states.

---

## 6. Sequencing

This no longer fits one reviewable PR — 11 migrations and ~35 files, with a
schema change under the live directory. §3.4 also requires the merge tool to
exist *before* the first import, which sets a hard order. I propose four, each
independently shippable, each listing its migrations separately:

1. **Identity & auth** — normalisation (+ tests), persons/phone_numbers,
   provider identity columns, OTP + gateway, phone login replacing Google,
   add-another-number, claim matching, near-match, `duplicate_candidates`.
   Migrations 01–03, 05, 10.
2. **Import & merge** — CSV → staging → report → publish, unclaimed rules,
   removal token, admin merge screen, search de-dup. Migration 04. **Must land
   before the first import runs.**
3. **Job flow** — estimates, site visits, final quotes, engagement code,
   completion, gated reviews. Migrations 06–09.
4. **Messaging** — migration 11.

Say the word if you would rather have it as one PR and I will squash it.

---

## 7. Not building

No verification badges, membership, subscriptions, payments, escrow or
commission — and no extension of the `verification_status` column or
`VERIFICATION_BADGES` map that already exist. No new runtime dependencies. No
renaming of `tilers` or `bids`. Off-platform code attachment parked to v1.1
(§3).
