# WEDAHUB live audit — 27 September 2026

Organization: TILERSHUB. Project: `ginrgwaciblcvxvkbeyd`. Access verified through the connected Supabase account. PostgreSQL 17.6.1.121. No personal records, identity documents, OTP values or message contents were downloaded for this audit.

## Verified inventory

- 30 public tables, all with RLS enabled. There are 64 recorded migrations, including all three migrations checked into the web repository. The full historical schema is not yet reproducible from this repository alone.
- `providers` coexists with legacy `tilers`; `blogs` coexists with legacy `blog_posts`; the retired `claim_requests` flow coexists with newer `persons`, `phone_numbers`, import/duplicate and OTP infrastructure.
- `providers.person_id` and `enforce_profile_limit` already support up to three profiles per person. The current web approval/UI selects one provider per user. Reuse the identity model rather than introducing another account table blindly.
- Engagement/review storage is deployed. `job_engagements` has no direct client grants; `save_job_engagement` is service-role-only and SECURITY INVOKER. Published reviews and consented portfolio are public projections. Zero engagements/reviews at audit time means no production lifecycle history can substitute for two-account acceptance testing.
- Four buckets: public `avatars`, `provider-assets`, `blog-images`, `project-media`. No private credential bucket exists. `provider-photos`, referenced by an unused helper, does not exist. Only `blog-images` has MIME and size limits.
- No deployed Supabase Edge Functions. The SMS hook runs in the Astro/Cloudflare API.
- Public Auth settings report phone login enabled, signup allowed, phone auto-confirm disabled; email/Google/Apple login disabled. These settings do not reveal the active SMS-hook secrets or CAPTCHA configuration. Do not infer either from the reported provider name. No SMS was sent.

## Findings and focused remediation

| Finding | Evidence and impact | Remediation |
| --- | --- | --- |
| Retired claim API still writable/callable | A client could insert its own `claim_requests.code`, then call `verify_claim`, a SECURITY DEFINER function that assigns an unowned profile. The website now redirects `/verify-claim` to registration. | Revoke client claim writes and claim RPC execution; preserve records and admin reads. |
| Legacy view bypasses RLS | `tiler_profiles` is a definer view with client DML grants. | Make it SECURITY INVOKER and read-only to clients. |
| Owners can change trust fields | Provider/tiler/person row ownership policies do not restrict columns such as verification, rating, featured status, identity hashes and ownership links. | Invoker BEFORE triggers allow profile presentation fields, while protecting system fields; existing admins/service operations remain authorized. |
| Bid identity spoofing | Insert policy accepts arbitrary `user_id`; another SELECT policy authorizes by editable contact number. | Require signed-in bid ownership and default status; remove contact-number authorization; protect bid routing/ownership fields. |
| Anonymous legacy blog writes | `blog_posts` has `anon full access`. | Keep published read, restrict writes to administrators. |
| Anonymous public uploads | `provider-assets` INSERT checks only the bucket. | Require authenticated user path prefixes or verified admin; preserve existing web path convention. |
| Mutable function search paths | Four functions have no explicit path. | Set empty paths; their table references are schema-qualified. |

The non-destructive migration is `20260927021613_pre_mobile_security.sql`. It does not delete or rewrite rows. PGlite tests exercise owner edits, protected columns, retired claims, bid identity, the legacy view, existing upload paths, admin actions and server rating projections.

Supabase advisor reference: [security-definer views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), [mutable function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable). `job_engagements`/OTP/token tables having RLS with no client policy is intentional and should not be "fixed" by opening access. `is_admin` and `current_person_id` perform identity-scoped checks; not every definer warning is an exploitable path.

## Remaining work before production mobile release

1. Create a full reproducible schema baseline and generated client types; reconcile legacy tables before removing anything.
2. Add private credential/evidence storage and hierarchical skills, trusted issuers, credential moderation and profile memberships through additive migrations.
3. Verify SMS hook/CAPTCHA configuration and account recovery/linking on physical devices. Current email/Google settings differ from old web login options.
4. Add validated bearer authorization for the existing server engagement API, preserving cookie/CSRF behavior for web callers.
5. Expand outcome/review evidence models without relabelling historical generic ratings as verified jobs. Retain version locking and participant evidence redaction.
6. Finish device push, account deletion/export, accessibility, abuse controls and Android/iOS release tests.

## Rollback approach

Keep production data intact. If normal profile editing fails, adjust the allowlist for that specific field after checking its meaning. Do not restore anonymous uploads, client-supplied claim codes, definer-view DML, phone-number authorization or public blog writes. Fix forward is safer than reinstating those access paths. The migration's policies, grants and triggers can be reverted individually by an administrator if a verified dependency requires it.

## Live verification

Applied as migration `20260927021613_pre_mobile_security` on 27 September 2026. Live catalog checks confirm four field-protection triggers, no legacy unsafe policies, no client claim RPC/INSERT privileges, and a read-only invoker view. Anonymous provider discovery still returns a 21-row page. The definer-view error and all four mutable-search-path warnings are cleared. All 68 repository tests passed before application.
