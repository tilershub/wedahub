# Provider growth flow — 5 October 2026

## Scope and evidence

Keep one app with Homeowner/Provider switching. Registration remains free, minimal and moderated. No qualification is needed to list a skill; unverified certificates never earn badges. No paywall or first-three-month expiry was introduced.

- Profile: one cover (navy fallback), overlapping avatar, responsive portfolio carousel with swipe and previous/next controls, count, service menu, qualifications and skills. Portfolio supports the existing 24-photo owner limit, including 3, 5 and 10 photos. Existing images are preserved.
- Services: owners use My service profiles → select profile → Edit profile → Add a service. Name, description and flexible LKR price support fixed packages, area rates and timed sessions. Existing prices remain visible. A two-hour teaching session is 120 minutes.
- Certificates: pick a document before creation; upload to the private credential bucket, then submit. Failed uploads retain only a private draft for retry. No public qualification summary exists without a stored document. New qualification/licence/industry submissions opt in to public name, field, level, issuer and status. Identity documents and certificate numbers never enter the public projection. Rejected credentials disappear from the projection. Existing submissions are not retroactively published.
- Categories: horizontally browsable main groups and service shortcuts with vector icons and localized labels; no full provider catalogue on Home. Icons retain text/accessibility labels.
- Search: all search words can match across profile text, service titles/descriptions and Sinhala/Tamil/English skills; original ranking and all-Sri-Lanka default remain.
- New jobs: 1–5 JPG/PNG photos, maximum 5 MB each, public-image notice. Database checks stored objects and uploader ownership, rejects duplicates, foreign URLs and empty new jobs. 25 image uploads per account per rolling day. Existing jobs remain editable without images. Referenced job photos cannot be overwritten/deleted by clients. Abandoned uploads currently require administrator cleanup; automated retention and moderation scanning remain release work.

## Duplicate audit

Read-only production audit found zero exact duplicate Auth phone groups, zero multiple unmerged provider profiles per account, and zero duplicate pending_review applications. One provider-contact collision was LUXEhome and BathSpace with different owners and brands; these are not proven duplicate accounts, so no deletion was performed. One verified phone identifies an Auth account, but different phone numbers cannot prove that two accounts belong to the same person. Existing phone normalization is retained. Added unique pending application index and a locked server-side existing-profile check.

## Safe rollout

1. Apply provider_growth_safeguards (new bucket, summary projection, search and registration guards). Existing web posting remains compatible.
2. Deploy the updated website posting form and API plus mobile preview.
3. After checking the live web form, apply activate_job_photo_requirement. Do not activate it while the old website posting form is live.
4. Rollback UI without dropping data. If reverting to a web form without photos, remove only the new_job_photos_guard trigger first. Do not drop stored photos, submissions or qualifications.

## Checks and limits

PGlite exercises owner/stranger/anonymous boundaries, duplicate pending registration, existing-profile blocking, old-job compatibility, missing/foreign/duplicate images, upload quota, public qualification projection and private documents, rejected certificates and multiword service discovery. Existing suites cover OTP normalization, session boundaries, job lifecycle and review evidence.

Manual acceptance must still cover a real owner account and two real phones: OTP sign-in, provider approval, edit/save/reopen, photo picker cancel and retry, certificate upload/rejection, job upload/post, provider application, engagement/review and sign-out. Do not send OTPs or create public test jobs without a designated test identity. Public-page browser checks and successful exports are not a substitute for these native checks.

Security advisor findings reviewed: current_person_id is scoped to auth.uid(), is_admin uses server-held administrator data, and merge_providers checks is_admin before mutations; server-only RLS tables intentionally have no client policies. Password-leak protection is disabled (phone OTP is the current client method); reassess before enabling password login. Advisor warnings do not establish a clean security certification.

## Apple App Store and Google Play release path

The app is not store-ready yet. Complete in-app account deletion and a web deletion request route, report/block/moderation flows, privacy policy and retention process, permission disclosures, native accessibility and language QA, push delivery, crash monitoring and signed device acceptance first.

1. Create or use organization developer accounts with the correct legal owner. The owner handles membership payments, legal agreements and identity verification. Do not send passwords or signing keys in chat.
2. Keep the existing bundle/package identifier lk.wedahub.app. Configure Apple signing and Android signing through the linked EAS project; store credentials in EAS, never in the repository.
3. Build with the configured production profile in mobile/: `npx eas-cli@latest build --platform all --profile production`. This creates signed store binaries, unlike Expo web exports.
4. Send iOS builds through EAS Submit to App Store Connect/TestFlight. Create the store listing, support/privacy links, age/content ratings, screenshots and accurate privacy disclosures. Supply an approved reviewer-access method for phone authentication; never add a universal OTP bypass.
5. Create the Google Play listing and upload the Android App Bundle to internal testing. Follow EAS/Play setup for submission permissions. For personal accounts created after 13 November 2023, Google currently requires at least 12 opted-in closed testers continuously for 14 days before applying for production access; check the actual account type.
6. Test on real iPhone and Android devices, including poor connectivity and larger text. Submit to review only after acceptance gates pass; release first to a small staged audience. EAS submission uploads a binary and does not itself guarantee store approval.

Official references checked 5 October 2026:
- https://developer.apple.com/app-store/review/guidelines/ (UGC moderation, reviewer access, privacy, in-app account deletion)
- https://support.google.com/googleplay/android-developer/answer/14151465?hl=en (new personal-account testing)
- https://docs.expo.dev/deploy/submit-to-app-stores/ (EAS submission)
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
