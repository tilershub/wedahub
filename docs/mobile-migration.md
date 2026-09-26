# වැඩHUB mobile migration — audit and staged delivery

Audit date: 2026-09-26. Source: `tilershub/wedahub` at `85cdcb8` and the three checked-in SQL migrations. This is a **repository audit**, not a certified production database audit. The connected Supabase account lists `trade90` and `luxehome`; the web app points to `ginrgwaciblcvxvkbeyd`, which is absent from that connection. Do not run migrations against either listed project as a substitute.

## Existing platform

| Area | Current implementation | Reuse / gap |
| --- | --- | --- |
| Web | Astro 5 SSR on Cloudflare, React islands, server routes | Keep deployed web and admin; React DOM components, Astro pages, cookies, `window`, `File`, and Cloudflare secrets cannot be imported into React Native. |
| Auth | Supabase SSR cookie session; SMS OTP with Text.lk Send SMS hook and optional browser Turnstile; legacy email/Google login; phone linking | Reuse **same auth users/project**, but mobile needs its own session storage and a supported CAPTCHA path if enabled. A new phone OTP must never duplicate an existing email account. |
| Accounts | Customer identified by auth user; provider submissions become `providers` via admin approval; `persons` exists; `providers.user_id` currently treated as one profile per user in UI and approval | Multi-role and multiple organizations need an additive model after live-schema inspection. |
| Discovery | `search_service_providers(text, profession, district, page)` RPC, `providers`, `services`, `service_areas`; `projects` board and bids | Reuse RPC with explicit public fields. Current filters and category list are mostly flat and sometimes hard-coded in JS. |
| Jobs | `projects`, `bids`; separate `job_engagements` JSONB state with server-validated transition module and `save_job_engagement` RPC | Preserve transition rules and version check. `/api/jobs` currently assumes SSR cookies and same-origin POST, so a native app cannot use it unchanged. No native writes until bearer-token authorization and parity tests exist. |
| Reviews | Legacy reviews plus engagement-linked confirmed reviews, private evidence, moderation, provider reply/appeal, consented job portfolio | Reuse projection and moderation. Category-specific criteria, customer reviews, and explicit public evidence labels are missing. |
| Verification | `verification_status` single provider field, submission approval and `is_admin()` | Not the required evidence model. Credentials, issuer registry, verification events and private document policies require additive schema work. |
| Storage | Browser uploads to `avatars`, `provider-photos`, `provider-assets`, `blog-images`; public URL helpers | Public portfolio images can remain public. Bucket inventory, object policies and private ID/credential storage are unverified; create no sensitive uploads yet. |
| Languages | Sinhala/English split across JS, JSX and JSON; no complete Tamil UI | Mobile translation keys start in Sinhala, Tamil, English. Language preference is local until an authorized profile field is verified. |
| Admin | Existing Astro admin for submissions, providers, projects, bids, blogs and review queue | Retain web admin. Extend it for credentials/issuers/disputes after schema authorization. |
| Notifications | Web activity view derived from queries and jobs API | No verified Expo push token table, delivery worker, consent or device lifecycle yet. |

## Security and delivery gates

1. Obtain access to the **actual** project `ginrgwaciblcvxvkbeyd` and inventory `pg_tables`, columns/FKs, all policies, grants, triggers/functions, Auth settings/hooks, buckets/object policies and advisors. Check applied migration history against the repository. These three migrations are not a full schema baseline.
2. Verify `is_admin()` and its email allowlist/hard-coded user ID against current users; keep all admin authorization server-side. Inspect every public `security definer` function and `providers`/`projects` grants. `search_service_providers` has a safe explicit return shape, whereas several web pages use `select('*')`; check for public phone or sensitive fields before mobile release.
3. Inspect Storage policies before ID or qualification uploads. Never store identity documents in the current public photo buckets; add a private bucket, owner/admin policies, short-lived signed reads and retention rules only after live verification.
4. Confirm the SMS hook secrets/config are healthy after the prior missing-secrets incident. Confirm CAPTCHA requirements for native OTP and account linking. Do not send production SMS during automated tests.
5. `/api/jobs` relies on a cookie-authenticated `locals.user` and same-origin POST. Add a separate authenticated bearer path or shared request context that calls `auth.getUser(token)` and verifies the expected project/actor; keep its transition tests. Never expose service-role credentials in Expo.
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

1. **Foundation (this branch):** Expo app, brand tokens, three-language keys, remembered language, public provider discovery/profile, SMS OTP session wiring and sign-out. No schema or web runtime changes. Gate: typecheck, Expo doctor, web tests/build, physical-device OTP test after CAPTCHA settings verified.
2. **Backend inventory:** authorized production schema/policy/bucket export, advisor results, account-link and SMS checks. Gate: read-only audit and RLS test matrix.
3. **Identity model:** additive account/profile membership, hierarchical skills, issuer/credential/evidence tables with private storage and moderation. Backfill existing provider records without changing IDs. Gate: migration in staging plus web/admin regression tests.
4. **Marketplace:** native onboarding, applications, profiles, skills, pricing, portfolio, job posting and interest; rely on RLS or checked server endpoints. Gate: customer/provider/business tests on both platforms.
5. **Verified work:** mobile bearer support for existing engagement engine, expanded outcomes and evidence labels; category-specific reviews and disputes. Gate: two-party adversarial tests, version conflicts and legacy review distinction.
6. **Notifications and release:** Expo push registration/deregistration, preference/consent, delivery retries, abuse controls, accessibility, offline/error states, Android/iOS device tests and store builds. No release until live project audit and end-to-end checks pass.

## Decisions needed after the live audit

- Access to the Supabase project that the web code uses; connected projects presently do not match. This blocks certification and any production schema changes.
- Confirm whether native phone sign-in may use the same OTP flow without browser Turnstile, or choose an approved mobile CAPTCHA flow based on actual Auth settings. Existing email users must link their phone from the original account.
- Confirm the final app bundle identifiers, store accounts and signing owner before release builds. These do not block local development.

This branch does not claim the app is release-ready; it establishes a safe, reviewable native base and keeps the existing site unchanged.
