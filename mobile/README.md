# වැඩHUB mobile

Expo SDK 57 / React Native / TypeScript app alongside the existing Astro site. This is the **first migration checkpoint**, not an app-store release.

## Setup

1. `npm ci`
2. Copy `.env.example` to `.env` and set the **publishable** key from the existing වැඩHUB Supabase project `ginrgwaciblcvxvkbeyd`. `EXPO_PUBLIC_*` values are embedded in the app. Never use a secret or service-role key.
3. `npm start` and open on an Android or iOS device with the matching Expo Go version. Native release builds later use EAS; no Mac is needed for cloud builds.

Public discovery calls the existing `search_service_providers` RPC. The profile detail uses an explicit column list. Phone OTP uses the existing Supabase Auth users and SMS hook. If the project enforces CAPTCHA for phone OTP, native CAPTCHA integration must be completed and tested before onboarding. Existing email/Google users must link a phone on the web while signed into their original account before using phone sign-in.

Language can be changed on the home screen and is saved on-device. A server profile preference can be added only after the actual schema and RLS are inspected.

## Verification

```sh
npm run lint
npx tsc --noEmit
EXPO_OFFLINE=1 npx expo-doctor
EXPO_OFFLINE=1 npx expo export --platform android
EXPO_OFFLINE=1 npx expo export --platform ios
```

See [`../docs/mobile-migration.md`](../docs/mobile-migration.md) for the audit, blockers, and next phases. No private ID/credential documents should be uploaded through existing public photo buckets.
