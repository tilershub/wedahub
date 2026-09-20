# Job confirmations and reviews — version one

## Included

- `/my-jobs`: customer invites a claimed, active provider to one of their projects. Each project/provider pair has its own permanent engagement record. Multiple providers can work on one project.
- Provider acceptance; independent start confirmations; completion request and confirmation by the other participant. A late start confirmation is supported while completion is pending.
- Either participant records stopped/abandoned work or a dispute. Customer reviews are allowed after work starts and completion is requested, or an issue is recorded. Provider refusal to confirm completion does not block a review.
- One editable review per engagement. Both starts confirmed: published as “Review from a confirmed job”. No mutual start: private evidence and admin approval are required. Review edits after moderation return to the queue. Historical versions are retained privately.
- Provider public reply and private appeal. An appeal does not automatically hide a review. Administrators investigate and record a reason when publishing/hiding. Admin → Reviews opens the queue; “All job records” also permits proactive investigation.
- Exact photo links and caption require customer permission after completion. Replacement requires new permission. Withdrawing permission removes the entry from the public job portfolio. Existing generic profile galleries remain separate; the UI directs job-photo submissions to the consent flow. The system cannot identify copied/reuploaded photos automatically.
- In-app job updates in Notifications and a private job timeline. No SMS is sent by this feature.
- Free/paid accounts follow the same review rules; reviews have no dependency on membership expiry.

## Security and data changes

`job_engagements` contains participant snapshots, state, private evidence, appeals and event history. Direct browser access is revoked; `/api/jobs` checks the authenticated user, role, verified phone and same-origin requests. Evidence is returned only to its author and administrators. Public reviews and consented portfolio entries are separate projections.

`save_job_engagement` is SECURITY INVOKER and executable only by service_role. It locks the engagement and requires its expected version; state, review projection and portfolio projection commit together. Legacy rating triggers continue to maintain provider rating/count using published reviews only. New RLS restrictions prevent direct review insertion/update/delete even where old permissive policies exist.

Legacy project policies allowed any visitor to update/delete projects, and provider ownership could be reassigned. Restrictive owner guards now prevent those paths; the retired provider-claim update policy is removed.

Anonymous new projects remain private until sign-in. DraftLinker sends its random token to `/api/projects/link-draft`, which links an unowned pending draft and publishes it atomically. **Previously public unowned projects cannot safely be claimed using their old tokens**: those tokens were publicly readable. Administrators must verify ownership and link those records manually. Do not restore the old broad claim policies.

## Deployment order

1. Back up the database and apply `supabase/migrations/20260920085146_job_confirmed_reviews.sql` to the WEDAHUB project `ginrgwaciblcvxvkbeyd`. Use the existing project migration process; this repository did not previously contain a full schema baseline. Do not blindly run `db push` against unrelated migration history.
2. Configure the Cloudflare Worker secret `SUPABASE_SERVICE_ROLE_KEY` for that same project. It must never have a PUBLIC_ prefix or be exposed to browser code. The API returns 503 when missing.
3. Deploy the application immediately after the migration. During the brief transition, old direct review and draft-claim writes are intentionally denied.
4. Confirm Supabase phone authentication works with the approved Text.lk sender before onboarding users. This workflow requires `phone_confirmed_at` for participant changes. Administrators must exist in the existing `admin_users` system.
5. Verify with separate customer/provider accounts: invite, accept, start, completion, negative review without completion approval, evidence queue, appeal, photo consent and withdrawal. Test anonymous posting → sign-in → publication. Check existing email users can link a phone to their original account.

No production migration, deployment or test SMS is performed by this pull request.

## Validation

Run:

```sh
node --test scripts/migration.test.mjs scripts/phone-auth.test.mjs scripts/job-workflow.test.mjs scripts/job-database.test.mjs scripts/job-api.test.mjs
npm run build
npm run check:worker
```

Database tests execute the migration in isolated PostgreSQL (PGlite), starting with representative legacy permissive policies and the production review status constraint. Tests cover role permissions, private drafts, unique/self engagements, rating aggregation, atomic projections, stale writes and consent removal. API tests check identity/phone/origin enforcement, unauthorized actions, secret configuration and evidence redaction. No production user records are used.

This change does not set the still-undecided free-tier delay (12 vs 24 hours), portfolio membership limits, paid badge billing or the daily SMS digest. Those require their own membership and messaging rollout.

Local result: all 53 tests and the production build passed. The Worker smoke check could not start because this environment reports `uv_interface_addresses: Unknown system error 1`; the existing CI Worker check remains required before release. Production migration and two-account browser acceptance testing remain deployment gates.
