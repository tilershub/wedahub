# Phone sign-in with Text.lk

Status: code prepared; production activation and real SMS verification still required.

The site keeps Supabase Auth as the authority for OTP generation, expiration,
verification and cookie sessions. Text.lk only delivers the SMS. Public login,
provider registration, bidding, job-board access and post-project account creation
share PhoneSignIn. Sri Lankan mobile numbers are normalized to +947XXXXXXXX.
The client provides a 60-second resend countdown; server limits must also be set.

## Configure before releasing this change

1. Open WedaHUB project `ginrgwaciblcvxvkbeyd` under TILERSHUB.
   Live read-only check on 21 September 2026 found `external.phone = false`:
   phone authentication is disabled. The SMS handler is deployed, but credentials,
   hook activation and real SMS delivery have not been verified.
2. Log in to https://app.text.lk and open Developers in the left menu. Copy the
   displayed API Token (the API key). Do not regenerate it if other integrations use it.
   Confirm SMS credit and an approved production Sender ID
   (request WedaHUB or use the exact approved name). TextLKDemo cannot be used
   for production OTP messages.
3. Open Cloudflare > Workers & Pages > wedahub > Settings > Variables and Secrets.
   Select Add, choose Secret and add TEXTLK_API_KEY, TEXTLK_SENDER_ID and
   SUPABASE_SEND_SMS_HOOK_SECRET using the dashboard's encrypted secret fields.
   TEXTLK_API_KEY is the token alone, without a Bearer prefix. TEXTLK_SENDER_ID
   is the exact approved sender, for example WEDAHUB if that is the approved spelling.
   Select Deploy after saving the secrets. Use runtime secrets, not build variables.
   Do not place secrets in GitHub, client code, public build variables or chat.
4. In Supabase Authentication > Auth Hooks, create/enable a Send SMS HTTPS hook.
   Configure the Send SMS HTTP
   hook URL as `https://wedahub.lk/api/auth/send-sms`. Generate the hook signing
   secret in Supabase and save the matching full value in the Worker secret.
   After the Worker is configured, enable Phone under Authentication > Sign In /
   Providers. Text.lk is connected through the hook, not the Textlocal provider.
   Never fill a different provider with fake credentials.
   The handler accepts `v1,whsec_...`, `whsec_...` or the base64 signing key.
   It verifies Standard Webhooks v1 signatures and a five-minute timestamp
   tolerance before sending to Text.lk. It does not store or log OTPs.
5. Configure six-digit OTPs with a short expiry (e.g. 5 minutes), a minimum
   60-second SMS send interval, appropriate project-wide SMS and verification
   rate limits, and Text.lk spend monitoring. Configure Cloudflare Turnstile in
   Supabase Auth with its secret, and PUBLIC_TURNSTILE_SITE_KEY in the site's
   build environment. Rebuild when changing the public key. Client countdowns
   alone do not stop API abuse. Turnstile failures block the form when configured.
6. Deploy first to a controlled preview, using a test Auth project and hook
   configuration if available. Coordinate production deployment with activation
   of the matching hook and secrets; do not ship a phone-only login before these
   settings are ready. Keep the prior deployment available for rollback.

## Existing accounts

Existing users should choose “Use existing account”, authenticate with their
previous Google/email login, and add their phone while signed in. The code uses
updateUser({ phone }) followed by verifyOtp({ type: 'phone_change' }); the user ID
and all records owned by it remain the same. The hook prefers sms.phone for
phone changes, because user.phone can still be the old number.

Do not automatically merge accounts based on public profile/WhatsApp numbers.
A phone login before linking can create a second account; support must verify
both accounts before any manual merge. The previous Google/email option remains
for migration and recovery. Existing admin email access remains available; an
admin can link a phone to the same account while retaining its email.

## Release checks

- New mobile signup, wrong/expired code, resend, and Sri Lankan number formats.
- SMS delivery on a real authorized test number; confirm Text.lk delivery status.
- Reload after login: SSR sees the same session; logout removes access.
- Existing Google/email account: verify phone; confirm unchanged user ID,
  provider profile, quotes and posted projects, then log in again by phone.
- Registration, job board, bidding, anonymous draft linking and admin access.
- Phone-only dashboard and CAPTCHA success/failure/expiry on mobile.
- Missing/bad hook signature cannot send SMS; provider errors remain login errors.

Local validation: `node --test scripts/phone-auth.test.mjs`, `npm run build`,
and the repository's Worker checks. Unit tests mock delivery; they do not prove
Text.lk credentials, delivery or the live database configuration.

References:
- https://text.lk/docs/textlk-api-key/
- https://text.lk/docs/send-sms/
- https://text.lk/docs/ (production Sender ID requirements)
- https://supabase.com/docs/guides/auth/phone-login
- https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
- https://supabase.com/docs/reference/javascript/auth-updateuser

Development results: build passed and 22 focused tests passed. Local Worker
checks could not start because Wrangler hit `uv_interface_addresses` in this
execution environment. The unchanged Worker checks remain enabled in CI.
