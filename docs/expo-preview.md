# Expo Safari preview

Preview: https://wedahub--safari-preview.expo.app/

The Expo project is `tilershub/wedahub` (`018b748b-7935-4612-ae13-5db1bbeaa59e`). Its GitHub integration is limited to `tilershub/wedahub`, with base directory `/mobile`.

`mobile/.eas/workflows/safari-preview.yml` deploys the `safari-preview` alias on mobile changes pushed to `codex/mobile-foundation`; it also supports manual runs. It runs TypeScript and lint checks, exports the web app, and deploys with `prod: false`. The workflow contains only public Supabase client configuration. No service credentials are included.

First successful deployment: `gd5d8eef90`, source commit `14cf9ff1008f15a06c668f0404c85294cc242230`.

Verified in the cloud browser on 2026-09-28: existing provider data loads, search filters results, provider links survive direct reload, Sinhala/Tamil/English switching works, and the phone sign-in form loads. The cloud TypeScript, lint, export, and deployment steps passed. Actual iPhone Safari rendering and the complete SMS OTP flow still need device testing. No SMS was sent during the browser check.

Open the preview in iPhone Safari, choose a language, search for a provider, then open My account and sign in using the phone linked to an existing account. The preview uses the existing Supabase backend, so authenticated edits affect existing data. This remains the mobile foundation preview, not the completed marketplace MVP or an App Store build.
