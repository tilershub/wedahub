# Provider profile and shared-app MVP checkpoint

## Product boundary

Ship one Expo app with Homeowner and Provider modes. Mode changes navigation and task emphasis; it is never an authorization claim. Supabase ownership and RLS remain authoritative. Keep domain clients, localization and evidence components separate from route shells so later homeowner/provider apps can reuse the same backend and domain code. Do not create another backend or migrate existing web users.

## Changes

Provider registration requires a confirmed account phone, name and main service. The contact phone is derived from authenticated identity, not an arbitrary form field. Applications retain existing admin approval. City, biography and credentials are optional. Existing primary-profile registration rules remain; multiple service offerings do not create multiple independent identities.

Public profile order is cover/header, portfolio, transparent reputation and published reviews, optional service menu, then about/skills/coverage. Owners get section editing. Editable fields are explicitly allowlisted and updates check ownership and last-updated timestamps. Photo uploads use the existing public provider-assets bucket (JPG/PNG, 5 MB); identity documents remain in the separate private credential flow. Removing portfolio photos removes their profile reference, not the stored asset.

Service offerings support hourly, daily, square metre, square foot, unit, fixed, starting price, range, quotation and timed session pricing. Currency is LKR. Each provider can maintain up to 50 offerings. Database constraints validate prices and duration. RLS restricts mutations to owners and public reads to active, unmerged providers; owners can read their own unpublished offerings. IDs and ownership cannot be reassigned.

## Reviews

Existing customer review workflow remains unchanged: recorded engagement plus customer-reported start, and a reviewable completed/problem outcome. Mutual start confirmation permits publication; otherwise supporting evidence and moderation are required. Failed jobs can be reviewed. Published averages and confirmed-job evidence remain distinct. Public profile reads never include private evidence. Provider replies are displayed. Category-specific criteria and reciprocal customer reviews remain release backlog items.

## Migration and rollback

20261004171253_provider_service_offerings.sql is additive; provider_submissions.city becomes nullable and a new RLS-protected table is added. Existing web fields and data are unchanged. Applied to the existing project after PGlite security tests. To roll back the app, leave the table/data in place; do not drop offerings or reapply NOT NULL while null cities exist. Export any new data before any future destructive rollback.

## Release gates

TypeScript, lint, pricing/RLS tests, existing regression suite and all-platform Expo exports are required. Safari preview is a web preview, not native device validation. Signed Android/iOS builds, real-device OTP/media/keyboard/navigation testing, accessibility and native-speaker translation review, push delivery, store privacy/release configuration, and remaining marketplace scope are still required before a production release declaration.
