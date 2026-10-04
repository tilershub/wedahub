# වැඩHUB mobile migration — audit and staged delivery

Audit updated: 2026-09-27. TILERSHUB access is now verified for the actual WEDAHUB project `ginrgwaciblcvxvkbeyd`. The live audit inspected the 30 original public tables, policies, function bodies/grants, triggers, four storage buckets, migration history, public Auth settings and security advisors. The three repository migrations are deployed. Focused security hardening was tested and applied as `20260927021613_pre_mobile_security`; see [the live audit and migration PR](https://github.com/tilershub/wedahub/pull/122). Full historical schema reproduction, private credentials, Auth hook/CAPTCHA settings and device acceptance tests remain release gates.

## Existing platform

| Area | Current implementation | Reuse / gap |
| --- | --- | --- |
| Web | Astro 5 SSR on Cloudflare, React islands, server routes | Keep deployed web and admin; React DOM components, Astro pages, cookies, `window`, `File`, and Cloudflare secrets cannot be imported into React Native. |
| Auth | Supabase SSR cookie session; SMS OTP with Text.lk Send SMS hook and optional browser Turnstile; legacy email/Google login; phone linking | Reuse **same auth users/project**, but mobile needs its own session storage and a supported CAPTCHA path if enabled. A new phone OTP must never duplicate an existing email account. |
| Accounts | Customer identified by auth user; provider submissions become `providers` via admin approval; `persons` exists; `providers.user_id` currently treated as one profile per user in UI and approval | Multi-role and multiple organizations need an additive model after live-schema inspection. |
| Discovery | `search_service_providers(text, profession, district, page)` RPC, `providers`, `services`, `service_areas`; `projects` board and bids | Reuse RPC with explicit public fields. Current filters and category list are mostly flat and sometimes hard-coded in JS. |
| Jobs | `projects`, `bids`; separate `job_engagements` JSONB state with server-validated transition module and `save_job_engagement` RPC | Preserve transition rules and version check. This branch adds `/api/mobile/jobs`, verifying the explicit token against Supabase and reusing the existing handlers. Cookie-only and invalid-token calls fail; web `/api/jobs` retains its same-origin check. Deploy and run two-account tests before exposing native writes. |
| Reviews | Legacy reviews plus engagement-linked confirmed reviews, private evidence, moderation, provider reply/appeal, consented job portfolio | Reuse projection and moderation. Category-specific criteria, customer reviews, and explicit public evidence labels are missing. |
| Verification | `verification_status` single provider field, submission approval and `is_admin()` | Not the required evidence model. Credentials, issuer registry, verification events and private document policies require additive schema work. |
| Storage | Browser uploads to `avatars`, `provider-photos`, `provider-assets`, `blog-images`; public URL helpers | Public portfolio images can remain public. Live inventory confirmed four public buckets (avatars, provider-assets, blog-images, project-media); provider-photos is an obsolete helper reference. Private ID/credential storage does not exist; create no sensitive uploads yet. |
| Languages | Sinhala/English split across JS, JSX and JSON; no complete Tamil UI | Mobile translation keys start in Sinhala, Tamil, English. Language preference is local until an authorized profile field is verified. |
| Admin | Existing Astro admin for submissions, providers, projects, bids, blogs and review queue | Retain web admin. Extend it for credentials/issuers/disputes after schema authorization. |
| Notifications | Web activity view derived from queries and jobs API | No verified Expo push token table, delivery worker, consent or device lifecycle yet. |

## Security and delivery gates

1. **Access and catalog audit complete.** All public tables have RLS, and the repository migrations match live history. Generate a full historical schema baseline before applying broad product-model changes; the repository's three original migrations are not a complete schema. Public Auth settings show phone enabled and email/Google/Apple disabled. Hook/CAPTCHA configuration still requires verification.
2. Verify `is_admin()` and its email allowlist/hard-coded user ID against current users; keep all admin authorization server-side. Inspect every public `security definer` function and `providers`/`projects` grants. `search_service_providers` has a safe explicit return shape, whereas several web pages use `select('*')`; check for public phone or sensitive fields before mobile release.
3. Inspect Storage policies before ID or qualification uploads. Never store identity documents in the current public photo buckets; add a private bucket, owner/admin policies, short-lived signed reads and retention rules only after live verification.
4. Confirm the SMS hook secrets/config are healthy after the prior missing-secrets incident. Confirm CAPTCHA requirements for native OTP and account linking. Do not send production SMS during automated tests.
5. `/api/mobile/jobs` now calls `auth.getUser(token)` against the same Supabase project and passes the verified actor to the existing handlers. Tests cover cookie rejection, malformed/foreign/expired-token rejection through Auth, actor spoofing and transition parity. It is implemented in this PR and not yet deployed. Never expose service-role credentials in Expo.
6. Existing `save_job_engagement` accepts `next_data` only to `service_role`. Keep it server-only. Add native job operations only after endpoint authentication, redaction, CSRF and two-account regression testing.
7. Check old `reviews` policies and rating triggers in production. The checked-in restrictive policies are necessary but do not prove deployment. Do not represent legacy ratings as verified job ratings.

## Target architecture

```
Astro web + web admin ─┐
                       ├─ same Supabase Auth, Postgres, Storage
Expo iOS/Android ──────┘
       │
       └─ existing web API for privileged engagement transitions,
          extended with verified mobile bearer authorization
```

Mobile lives in `mobile/`, TypeScript + Expo Router. Public discovery uses the existing restricted RPC. Native auth uses the existing Supabase project. UI copy is keyed for `si`, `ta`, `en`; screen components do not embed translated strings. Network functions return only explicit fields. The web admin remains the operational moderation interface.

## MVP sequence and checkpoints

1. **Foundation (this branch):** Expo app, brand tokens, three-language keys, remembered language, public provider discovery/profile, SMS OTP session wiring and sign-out. The branch now includes the additive skills migration and authenticated native job adapter. Gate: typecheck, Expo doctor, web tests/build, physical-device OTP test after CAPTCHA settings verified.
2. **Backend inventory:** authorized production schema/policy/bucket export, advisor results, account-link and SMS checks. Gate: read-only audit and RLS test matrix.
3. **Identity model:** additive account/profile membership, hierarchical skills, issuer/credential/evidence tables with private storage and moderation. The additive skills catalogue and native owner picker are now implemented; see [skills checkpoint](skills-checkpoint.md). Backfill existing provider records without changing IDs. Gate: migration in staging plus web/admin regression tests.
4. **Marketplace:** native onboarding, applications, profiles, skills, pricing, portfolio, job posting and interest; rely on RLS or checked server endpoints. Gate: customer/provider/business tests on both platforms.
5. **Verified work:** mobile bearer support for existing engagement engine, expanded outcomes and evidence labels; category-specific reviews and disputes. Gate: two-party adversarial tests, version conflicts and legacy review distinction.
6. **Notifications and release:** Expo push registration/deregistration, preference/consent, delivery retries, abuse controls, accessibility, offline/error states, Android/iOS device tests and store builds. No release until live project audit and end-to-end checks pass.

## Decisions needed after the live audit

- Supabase project access is resolved. Generated mobile types now come from the actual live schema.
- Confirm whether native phone sign-in may use the same OTP flow without browser Turnstile, or choose an approved mobile CAPTCHA flow based on actual Auth settings. Existing email users must link their phone from the original account.
- Confirm the final app bundle identifiers, store accounts and signing owner before release builds. These do not block local development.

This branch does not claim the app is release-ready; it establishes a safe, reviewable native base and keeps the existing site unchanged.

### Mobile checkpoint — 2026-09-28

- Home, Jobs, Projects and Account now use a persistent bottom bar. One account can switch between homeowner and provider views; the stored view preference grants no database rights.
- Homeowners can post projects and see interested providers through existing RLS. Providers can browse jobs, see matches to listed services first, apply with an active claimed profile and track applications through existing RLS. The forms reuse existing `projects` and `bids` fields.
- Confirmed engagements use the existing server transition engine for invitations, start, completion, disputes and reviews. The mobile UI requires `EXPO_PUBLIC_WEB_API_URL` pointing at a deployed `/api/mobile/jobs`. The current Safari preview has no API origin because that web endpoint remains in the unmerged branch. Those actions are therefore unavailable in that preview.
- Remaining release work: profile and business onboarding, richer provider editing, credentials/issuer registry with private storage, expanded search and price models, job media, PIN/QR start, expanded outcomes and category review criteria, provider reviews of customers, push delivery, moderation extensions, two-account native tests and store release preparation. These are separate additive checkpoints, preserving production web users and data.

### Registration and Safari API checkpoint — 2026-09-28

- Native registration now reuses `provider_submissions` and the existing administrator approval workflow. The first service profile can represent an individual or a business using the same profession IDs as the website. The UI supports Sinhala, Tamil and English, phone normalization, pending status and duplicate-application checks. Existing owners are directed to their linked profile: the current admin function only creates one primary provider per user, so additional organization memberships are still future schema work.
- Rechecked live submission RLS: inserts require the signed-in owner and `pending_review`; only owners/admins can read submissions. No live test applications or SMS messages were created.
- Added explicit Safari preview origin handling and OPTIONS preflight to `/api/mobile/jobs`. Tokens remain mandatory for actual requests, and cookie credentials are not enabled. Authorization and CORS regression tests pass. The route is absent from `main`; this remains a deployment gate, not a completed live feature.
- Full repository tests, Astro build, mobile TypeScript/lint and Expo web export pass. Physical-device and authenticated end-to-end checks remain open.

## Completion map

Home organization update: homeowner and provider now have separate home compositions with a visible, remembered role switch. Homeowner discovery starts with six groups covering the existing service catalogue; a service choice opens a profession-filtered provider list. The home screen itself no longer loads or renders provider cards. Provider home focuses on jobs, applications, profiles and registration. Discovery retains bottom navigation as a hidden tab route. TypeScript, lint and web export pass; the Expo preview workflow must finish before live visual verification.

| Requirement | Current state | Remaining work |
| --- | --- | --- |
| Navigation and two interfaces | Live bottom tabs and homeowner/provider modes | Device accessibility checks |
| Authentication and languages | Phone OTP, sessions, three-language keys | Recovery/linking, native CAPTCHA and language review |
| Provider/business onboarding | Native first-profile registration implemented | Additional profiles and organization membership |
| Profiles, skills, portfolio, prices | Discovery, linked skill editing, public portfolio/experience/daily rates | Full profile editing, uploads, availability and broader pricing models |
| Credentials and trust | Existing generic legacy status only | Evidence types, issuers, private documents and admin verification |
| Jobs and interest | Posting, feed, applications and project lists | Media, dates/scope, richer location/skill matching |
| Engagement and reviews | Existing server engine; mobile UI implemented | Deploy mobile API, end-to-end tests, PIN/QR, expanded outcomes, category criteria, customer reviews |
| Notifications and moderation | Existing web admin retained | Native inbox/push delivery, issuer/credential moderation |
| Production release | Static preview deployed | Android/iOS device QA, signing and store release |

### Provider evidence and nationwide discovery — 30 September 2026

Mobile uses a new `discover_service_providers` SECURITY INVOKER RPC; the website's existing search endpoint and data are preserved. Results sort globally before pagination by published average rating descending (unrated last), confirmed completed engagements descending, presence of a current badge or legacy verification, review count, and stable provider ID. There is no composite score, paid/featured boost, qualification score or price ranking.

Cards and details show published ratings/review counts, completed වැඩHUB job quantity, confirmed-engagement review count where present, and each available badge type separately. Counts are not portfolio photo counts or self-reported project totals. No completion percentage is shown: quantity is less misleading while the outcome taxonomy is incomplete. At migration time there were no recorded engagements or typed badges, so zero counts and missing badges are intentional, not fabricated placeholders. Legacy verification stays explicitly labelled and is not converted into identity, qualification or skill verification.

The additive `provider_badges` table holds only public attestations (provider, type, subject, verification/expiry/revocation dates). Admin RLS controls issuance and revocation; only active, unexpired badges are returned by discovery, including for admin sessions. No document URLs, identity numbers or private review evidence belong in this table. Administrators must complete manual evidence checks before issuing an attestation. The existing web admin keeps its legacy badge workflow; a dedicated typed-evidence admin screen and private evidence/issuer registry are still pending. Skill badges require an actual skill assessment, not merely selecting a skill or uploading a qualification.

`provider_job_counts` is read-only to clients. A private, non-callable trigger publishes only counts from the existing server-controlled engagement workflow: completed state, completion timestamp and both start confirmations. Changing a completed job to disputed removes it from the completed count. Provider row locking serializes simultaneous count refreshes. Engagement payloads remain private. Review aggregates use published reviews, not client-editable profile counters.

Discovery defaults to all Sri Lanka, with no GPS or account-hometown constraint. The 25 translated district options and optional exact town search remain editable after searching. Area matching includes home base, explicitly listed service areas and recognised islandwide markers. Unknown service coverage is not inferred from home base; nationwide search always includes providers across the island. Structured town-to-district coverage expansion remains future work.

Validation: PGlite regression covers ranking across page boundaries, hidden review exclusion, expired badge exclusion, cross-district/islandwide coverage, completed-to-disputed recount, and anonymous/owner write denial. Live anonymous RPC checks passed for nationwide and Colombo searches and the unchanged legacy endpoint. Mobile typecheck, lint and web export passed.

Rollback: first revert mobile to the previous search client. Then remove only the `discover_service_providers(text,text,text,integer,text)` function and `provider_job_count_refresh` trigger if necessary. Retain badge/count tables and the private helper to preserve issued attestations; no destructive rollback is required. Do not roll back unrelated web migrations.

### Provider coverage controls and badge detail — 30 September 2026

My service profiles now includes an explicit-save service-area editor. Providers can select islandwide coverage or multiple districts; existing custom areas remain selectable rather than being discarded. The update sends only `service_areas`, requires a current authenticated user, filters by that user's ownership and checks the returned row. Existing provider RLS and protected-field triggers were inspected: service areas are owner-editable, verification/status fields are protected. No schema or permission changes were needed. No production provider coverage was changed during validation.

Active providers can open their public profile directly from their editing screen. Homeowner profile details display each current badge's public subject, verification date and expiry where present, plus an explanation of the confirmed completed-job count. Credential/identity documents remain excluded. Badge reads explicitly exclude revoked, future and expired records even for admin sessions. TypeScript, lint and Expo web export passed; authenticated save UX still requires a signed-in device smoke test.

### Website colour alignment — 30 September 2026

Mobile now shares the website's navy (#0B2A4A), champagne gold (#D6BE84), cream (#F7F3E8), muted slate (#536273) and warm border (#EAE4D7) palette from `src/styles/brand-mobile.css`. The app bar uses cream with a navy wordmark, primary actions use navy, and the selected bottom tab uses navy with a gold icon and cream label. Dark gold (#8C6C26) is used for readable accent text on light surfaces. The theme centralizes selected, placeholder and semantic status colours. Both account modes use the same brand palette.

## Production checkpoint — 2026-10-04

PR #121 is merged into main (`0b30d295`). Its CI passed the complete 78-test
suite, Astro build/worker checks, mobile typecheck/lint, and web/Android/iOS
JavaScript exports. These are not signed native builds or device certification.

This checkpoint adds:
- A localized in-app recent activity inbox reachable from the app bar and Account.
  It reuses owner-filtered projects/bids and the bearer-only engagements API.
  Read markers contain only record IDs/version, scoped to the signed-in account,
  and stay on this device. No private activity payload is cached to disk.
- Navigation state/drafts remount on account identity changes. Inbox loads discard
  stale results after navigation away or a newer refresh.
- Tests reject unrelated-account activity, deduplicate bids, discard invalid dates,
  and verify version-specific unread markers and ordering.
- The live `GET /api/mobile/jobs` returns 401 without a token. Preview-origin
  preflight returns 204 with exact-origin CORS and no cookie credentials. Preview
  configuration now enables this endpoint. Signed-in two-party lifecycle testing
  is still required; no production engagement was created during these checks.
- Engagement requests omit cookies, reject redirects where supported by fetch,
  and abort after 20 seconds; mutations are never automatically retried.
- EAS internal preview, iOS simulator and production build profiles use the existing
  project and publishable configuration. No signing credentials are committed.

Scope limits: this is a recent activity inbox, not a durable notification event log.
It shows up to 100 derived items from the existing bounded queries and the latest
25 engagements. Application dates use their creation timestamp because the existing
query does not expose a reliable change timestamp. Read status is not synchronized
between devices. Push delivery, tokens, preferences, outbox/retries/receipts, matching
notifications and messages remain to implement. Only the latest engagement event
is represented, and a user's own latest event is omitted.

Release remains blocked by private credential upload/verification workflows,
trusted issuer management, remaining review/outcome features, messaging/push,
account recovery/deletion UX, signed builds, real-device accessibility/offline tests,
and full two-account authorization/engagement acceptance tests. Keep production
store submission disabled until these are resolved. Existing web/data are unchanged.

## Private credentials checkpoint — 2026-10-04

Applied `private_provider_credentials` to the existing WEDAHUB project after isolated
Postgres tests. Adds private `provider_credentials`, administrator-only review events,
public recognized-issuer metadata, and a private `credential-documents` bucket capped
at 10 MB per file (PDF/JPEG/PNG). No existing data or storage buckets were changed;
the separately created `wedahub-social-posts` bucket remains untouched.

Provider flow: My profiles → Credentials → save optional details as self-reported →
attach private document → request verification. Field, level, certificate number,
issue/expiry dates and registry issuer are supported. Submitted evidence and ownership
cannot be changed by the provider. Rejected submissions remain as evidence; correction
currently requires a new submission. Formal qualifications remain optional.

Administrator flow: `/admin/credentials`, linked from existing admin. Define recognized
issuers and allowed credential types, examine private evidence using a 60-second
attachment link, record manual/issuer-contact verification and rationale, approve or
reject/revoke. Administrators cannot review their own credential or rewrite evidence.
Optimistic `updated_at` checks reject stale review forms. Official API verification is
explicitly disabled until a real integration exists. No institutions are automatically
seeded or trusted. Issuer activation is administrative, not certificate authentication.

Only an approved title/type/date becomes a public `provider_badges` record. A separate
unique credential FK avoids user-selected submission IDs colliding with existing badge
IDs. Revocation removes the current public badge; expiry is honored by existing discovery
queries. Certificate numbers, files, review rationale and raw credential rows stay private.
Review transitions are appended to the audit table. The private trigger's execution is
revoked from client roles. Existing broad storage policies cannot override restrictive
private-document guards; owners cannot replace/delete submitted evidence.

Live post-migration verification confirmed RLS on all three new tables, private bucket,
10 MB/type restrictions, no anonymous credential SELECT, no callable client review
trigger and zero production credential rows. Advisors reported no findings for these
new objects. Existing helper-function/Auth warnings remain; see
https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Validation: isolated ownership/storage/approval/revocation/audit tests and admin download
authorization tests pass. Mobile typecheck/lint and all three platform exports pass;
Astro builds successfully. Local Worker smoke test cannot start due to
`uv_interface_addresses` in this environment; GitHub CI must verify the Worker runtime.

Before broad credential rollout: real-device picker/upload tests and two-account live
acceptance tests, user-facing retention/deletion policy, upload-abuse quotas and orphan
cleanup, malware scanning/reviewer handling policy, audit trail for issuer registry
changes, and reviewed Sinhala/Tamil copy. Disabling an issuer prevents new approval,
but does not automatically revoke already-reviewed credentials. Admin queue is bounded
to latest 100 pending/approved records; pagination remains necessary as volume grows.
Temporary picker copies are deleted after upload; interrupted app processes may leave
OS-managed cache files. Never upload real identity documents for automated QA.

Rollback: revert mobile/admin UI first; retain the additive tables and private bucket
so evidence is not lost. Do not drop populated credential/audit tables or delete bucket
objects as a routine rollback. The new nullable badge FK leaves all legacy badges intact.

## Credential abuse controls and issuer audit — 2026-10-04

Applied additive `credential_upload_limits_and_audit` after both baseline and hardened
Postgres suites passed. Limits: 10 new credential records per rolling 24 hours, 50 per
account, and three upload reservations per credential, with the existing 10 MB/file
cap. Server-side advisory/row locks serialize quota checks. Reservations expire after
30 minutes; storage RLS rejects arbitrary/unreserved paths. Failed uploads consume an
attempt, limiting repeated storage abuse; users see the limits before uploading.

Only the owner of a draft credential on a currently owned provider profile may reserve.
Clients cannot insert reservation rows directly. Two deliberately narrow authenticated
SECURITY DEFINER RPCs perform server-authorized operations: `reserve_credential_upload`
checks actor/ownership/status/type/quota; `credential_cleanup_candidates` explicitly
requires an authenticated admin. PUBLIC/anon EXECUTE is revoked on both. These can
appear in the authenticated-function advisor by design; do not revoke the intentional
permission without replacing the callers. All internal trigger functions remain private
and not callable by clients.

Existing web admin now has an abandoned-upload cleanup action. It obtains at most 200
server-selected paths from expired reservations older than 24 hours and removes only
unattached files through the Storage API, with a server-only service credential. It
never deletes submitted/referenced evidence, accepts no browser-supplied object paths,
and remains protected by admin authorization and same-origin POST. It is an on-demand
admin action, not a scheduled cleanup job. Objects outside the reservation system,
including files orphaned by provider deletion, require a separately reviewed retention
workflow; they are not indiscriminately deleted.

Issuer creation, modification and deletion now append immutable admin-only before/after
audit events. Client roles cannot write/delete these events. Tests cover unreserved
uploads, forged reservations, per-document and daily caps, non-admin cleanup denial,
cleanup preserving attached evidence, and issuer audit immutability. Full CI for the
preceding credential checkpoint passed both web/Worker and mobile exports. Remaining
launch work includes real-device uploads, retention/deletion handling, scanning and
reviewer procedures, push infrastructure and the wider marketplace release checklist.
