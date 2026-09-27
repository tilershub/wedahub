# Provider skills checkpoint — 2026-09-27

## Delivered

Migration `20260927084420_hierarchical_provider_skills` is applied to the existing WEDAHUB Supabase project. It adds `skills` and `provider_skills`; no existing row, service, provider type, profile ID, approval function or verification flag was changed.

The initial catalogue has 21 entries across construction, hospitality, education, transport and home services, with English, Sinhala and Tamil names. This is a starter catalogue, not a complete list of Sri Lankan professions. Stable path IDs encode ancestry and a foreign key/check constraint prevents missing parents and cycles, including concurrent changes. Administrators can add/rename/retire entries through existing Supabase admin access; an integrated web taxonomy editor remains to be built. Do not translate or reuse stable IDs.

The native **My account → My service profiles** screen lists all unmerged provider profiles owned by the signed-in account. Selecting a profile opens a searchable skill picker. Each tap saves a single addition/removal; failed saves leave the previous selection intact. Public native profiles show the selections as **skills stated by the provider**, with no implied verification. Existing web services remain independently readable until an explicit migration maps them; no automatic inference or destructive backfill was performed.

Customer identity continues to be the existing Auth user. `persons.user_id` is unique; `providers.person_id` already supports up to three profiles. Reusing these links avoids creating parallel accounts. Native registration, business-profile classification and customer profile editing remain separate increments. Users without an approved linked service profile currently receive a clear empty state.

## Access rules

| Actor | Catalogue | Provider skill selections |
| --- | --- | --- |
| Anonymous | Read | Read active, unmerged profiles only |
| Owner | Read | Read/add/remove on own unmerged profiles |
| Unrelated signed-in user | Read | Read active profiles; cannot change another profile |
| Existing administrator | Maintain | Maintain visible provider selections |

Only selectable active catalogue entries may be added. Owners can remove a retired selection. Clients cannot rewrite assignment timestamps, move assignments between profiles with UPDATE, or TRUNCATE either table. No new privileged function or sensitive document storage was introduced.

## Verification and recovery

PGlite tests execute the migration under anonymous, owner, unrelated-user and admin roles. They cover ownership, pending-profile privacy, catalogue administration, invalid hierarchy, retired entries, timestamp privileges and preservation of legacy services. Live anonymous reads of the catalogue and existing discovery RPC were checked after migration. Generated mobile database types were refreshed from the live project.

For rollback, first revert the mobile screens/helper or hide their links. The additive tables can remain inert without affecting the web. Do not drop them once users have selected skills; export assignments and review dependencies before any separately authorized destructive rollback. Do not delete the migration history record. This branch records the actual live migration timestamp.

## Next: credentials and verification evidence

Keep skills separate from credentials. The next migration should add credential types, trusted issuers and issuer/type scopes; private credential records (including certificate number and document reference); individual verification decisions and an append-only audit trail; and a public projection containing only approved display fields. Issuer recognition does not verify arbitrary uploads. Existing generic verification flags must not be converted into identity/credential evidence without a reviewed source.

Credential states must distinguish self-reported, pending, verified, rejected and expired; absence of a record means not provided. Verified evidence must become immutable to its owner; edits submit a new version for review. Expiry must affect public status at read time. Reuse `is_admin()` in the current web admin workflow, with recorded reviewer/method/date and a reason for rejection.

Create a dedicated private document bucket with owner/admin authorization, constrained file types/sizes and short-lived signed reads. Never use the existing public photo buckets for identity or qualification evidence. Upload, submission, moderation, replacement and retention rules must be tested together before enabling document uploads. No private-document upload UI or bucket is claimed by this checkpoint.

Release gates still include native OTP/CAPTCHA validation, two real accounts on Android/iOS, Sinhala/Tamil reviewer checks, full historical-schema staging reproduction, and the remaining marketplace/review/notification workflows. JavaScript export is not a signed device build.
