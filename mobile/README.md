# වැඩHUB mobile

Expo SDK 57 / React Native / TypeScript app alongside the existing Astro site. This is the **first migration checkpoint**, not an app-store release.

## Setup

1. `npm ci`
2. Copy `.env.example` to `.env` and set the **publishable** key from the existing වැඩHUB Supabase project `ginrgwaciblcvxvkbeyd`. `EXPO_PUBLIC_*` values are embedded in the app. Never use a secret or service-role key.
3. `npm start` and open on an Android or iOS device with the matching Expo Go version. Native release builds later use EAS; no Mac is needed for cloud builds.

Public discovery calls the existing `search_service_providers` RPC. The profile detail uses an explicit column list. `src/types/database.ts` is generated from the live WEDAHUB schema. Phone OTP uses the existing Supabase Auth users and SMS hook. If the project enforces CAPTCHA for phone OTP, native CAPTCHA integration must be completed and tested before onboarding. Public Auth settings currently enable phone only; email/Google are disabled. Existing accounts need their linked phone, or an administrator-assisted recovery/linking flow before new phone signup.

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

### Skills checkpoint

The existing WEDAHUB project now has the additive skills catalogue. After phone sign-in, open **My service profiles**, select an existing linked profile, and tap skills to add/remove them. Labels and searches support Sinhala, Tamil and English. Skills are self-reported and displayed separately from verification. See `../docs/skills-checkpoint.md` for migration, access rules, recovery and remaining credential work.

## Safari preview (Expo Hosting)

This Expo Router app also exports as a single-page web application. The web preview lets reviewers use the current discovery, profile, language, sign-in and skills screens from Safari. It is a review surface, not an installed iOS app; native device permissions, push delivery and app-store behavior require device builds.

```sh
cd mobile
npm ci
# Set EXPO_PUBLIC_SUPABASE_URL and the project's PUBLISHABLE key in .env.local.
npm run export:web
npx eas-cli@latest whoami
npx eas-cli@latest deploy
```

The app is linked to the separate `tilershub/wedahub` EAS project (`018b748b-7935-4612-ae13-5db1bbeaa59e`) with preview subdomain `wedahub`. The final command needs an authenticated Expo CLI session. Use the resulting `https://wedahub--...expo.app/` **preview** URL, without `--prod`. Expo's Free plan supports this. `EXPO_PUBLIC_*` fields are embedded into the web bundle; never use a secret or service-role key. This export is configured with `web.output: single` so the app's client routes use one entry page. Deploy it separately from the existing Astro website.

The Expo web dashboard is signed in, but its browser session does not sign the development workspace into the Expo CLI. The web export, typecheck, lint and Expo checks pass locally; interactive Safari testing has not yet happened. A public Safari URL still requires a CLI deployment or an authorized GitHub workflow. Do not share an Expo password or raw access token in issues or PRs.
