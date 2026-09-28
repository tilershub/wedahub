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
