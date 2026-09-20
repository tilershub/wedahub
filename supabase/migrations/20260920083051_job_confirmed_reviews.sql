-- Deploy this migration before the application. No legacy reviews are relabelled.
begin;
create table public.job_engagements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  provider_id uuid not null references public.providers(id),
  customer_id uuid not null references auth.users(id),
  provider_user_id uuid not null references auth.users(id),
  data jsonb not null,
  version integer not null default 1,
  needs_moderation boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, provider_id),
  check (customer_id <> provider_user_id),
  check (jsonb_typeof(data) = 'object')
);
create index job_engagements_customer on public.job_engagements(customer_id, updated_at desc);
create index job_engagements_provider on public.job_engagements(provider_user_id, updated_at desc);
create index job_engagements_queue on public.job_engagements(updated_at) where needs_moderation;
alter table public.job_engagements enable row level security;
-- Private evidence and participants are accessed only through the checked server route.
revoke all on public.job_engagements from public, anon, authenticated;
grant all on public.job_engagements to service_role;

alter table public.reviews drop constraint reviews_status_check;
alter table public.reviews add constraint reviews_status_check check (status in ('published', 'hidden', 'pending'));
alter table public.reviews add column engagement_id uuid unique references public.job_engagements(id);
alter table public.reviews add column confirmed_job boolean not null default false;
alter table public.reviews add column provider_reply text;
alter table public.reviews add column updated_at timestamptz not null default now();
-- Existing permissive policies cannot override these restrictive guards.
create policy reviews_published_only on public.reviews as restrictive for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy reviews_no_direct_insert on public.reviews as restrictive for insert to anon, authenticated with check (false);
create policy reviews_no_direct_update on public.reviews as restrictive for update to anon, authenticated using (false) with check (false);
create policy reviews_no_direct_delete on public.reviews as restrictive for delete to anon, authenticated using (false);

create table public.job_portfolio (
  engagement_id uuid primary key references public.job_engagements(id),
  provider_id uuid not null references public.providers(id),
  caption text not null,
  photos text[] not null,
  approved_at timestamptz not null
);
create index job_portfolio_provider on public.job_portfolio(provider_id);
alter table public.job_portfolio enable row level security;
revoke all on public.job_portfolio from public, anon, authenticated;
grant select on public.job_portfolio to anon, authenticated;
grant all on public.job_portfolio to service_role;
create policy portfolio_public_read on public.job_portfolio for select to anon, authenticated using (true);

-- Called by the trusted server after transition/actor validation. Row locking plus a
-- version check prevents lost confirmations, duplicate reviews and stale photo consent.
create function public.save_job_engagement(job_id uuid, expected_version integer, next_data jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare j public.job_engagements; r jsonb; p jsonb;
begin
  select * into j from public.job_engagements where id = job_id for update;
  if not found or j.version <> expected_version then
    raise exception 'Job version conflict' using errcode = '40001';
  end if;
  update public.job_engagements set data = next_data, version = version + 1,
    needs_moderation = coalesce(next_data->'review'->>'status' = 'pending', false)
       or coalesce(next_data->'appeal'->>'status' = 'pending', false),
    updated_at = now() where id = job_id;
  r := next_data->'review';
  if r is not null then
    insert into public.reviews (engagement_id, provider_id, reviewer_name, rating, comment, job_type,
      status, confirmed_job, provider_reply, created_at, updated_at)
    values (j.id, j.provider_id, r->>'reviewer_name', (r->>'rating')::integer, r->>'comment', next_data->>'title',
      r->>'status', coalesce((r->>'confirmed_job')::boolean, false), r->>'reply', (r->>'created_at')::timestamptz, now())
    on conflict (engagement_id) do update set reviewer_name = excluded.reviewer_name, rating = excluded.rating,
      comment = excluded.comment, status = excluded.status, confirmed_job = excluded.confirmed_job,
      provider_reply = excluded.provider_reply, updated_at = excluded.updated_at;
  end if;
  p := next_data->'portfolio';
  if next_data->>'status' = 'completed' and p->>'consent' = 'granted' then
    insert into public.job_portfolio (engagement_id, provider_id, caption, photos, approved_at)
    values (j.id, j.provider_id, p->>'caption', array(select jsonb_array_elements_text(p->'photos')), (p->>'decided_at')::timestamptz)
    on conflict (engagement_id) do update set caption = excluded.caption, photos = excluded.photos, approved_at = excluded.approved_at;
  else
    delete from public.job_portfolio where engagement_id = j.id;
  end if;
end;
$$;
revoke all on function public.save_job_engagement(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.save_job_engagement(uuid, integer, jsonb) to service_role;

-- Prevent legacy permissive policies from allowing forged ownership. Retired claim
-- policy is removed; anonymous project drafts are linked by the server with a token.
drop policy if exists "claim provider profile" on public.providers;
create policy providers_owner_update_guard on public.providers as restrictive for update to anon, authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());
create policy projects_owner_update_guard on public.projects as restrictive for update to anon, authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());
create policy projects_owner_delete_guard on public.projects as restrictive for delete to anon, authenticated
using (user_id = (select auth.uid()) or public.is_admin());
create policy projects_insert_owner_guard on public.projects as restrictive for insert to anon, authenticated
with check (user_id = (select auth.uid()) or (user_id is null and status = 'pending_review') or public.is_admin());
drop policy if exists anon_select_all on public.projects;
drop policy if exists auth_select_all on public.projects;
-- Do not expose unowned draft tokens. Public active/published project policies remain.
create policy projects_private_drafts on public.projects as restrictive for select to anon, authenticated
using (status in ('active', 'published', 'featured') or user_id = (select auth.uid()) or public.is_admin());
commit;
