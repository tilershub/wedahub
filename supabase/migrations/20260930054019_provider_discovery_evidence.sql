begin;
-- Public summaries only. No identity documents, certificate numbers or evidence URLs.
create table public.provider_badges (
 id uuid primary key default gen_random_uuid(),
 provider_id uuid not null references public.providers(id) on delete cascade,
 kind text not null check (kind in ('identity','skill','credential','licence','business','industry_registration')),
 subject text not null check (length(trim(subject)) between 1 and 160),
 verified_at timestamptz not null default now(),
 expires_at timestamptz,
 revoked_at timestamptz,
 check (expires_at is null or expires_at > verified_at)
);
create index provider_badges_provider_idx on public.provider_badges(provider_id);
alter table public.provider_badges enable row level security;
revoke all on public.provider_badges from anon,authenticated;
grant select on public.provider_badges to anon,authenticated;
grant insert,update,delete on public.provider_badges to authenticated;
create policy public_current_badges on public.provider_badges for select to anon,authenticated using (
 revoked_at is null and (expires_at is null or expires_at > now()) and verified_at <= now()
 and exists(select 1 from public.providers p where p.id=provider_id and p.status='active' and p.merged_into is null));
create policy admin_badges on public.provider_badges for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.provider_job_counts (
 provider_id uuid primary key references public.providers(id) on delete cascade,
 completed_jobs integer not null default 0 check(completed_jobs>=0)
);
alter table public.provider_job_counts enable row level security;
revoke all on public.provider_job_counts from anon,authenticated;
grant select on public.provider_job_counts to anon,authenticated;
create policy public_job_counts on public.provider_job_counts for select to anon,authenticated using (
 exists(select 1 from public.providers p where p.id=provider_id and p.status='active' and p.merged_into is null));
-- The existing server-only engagement workflow is authoritative. Publish only a count.
-- This trigger is not a callable API and cannot reveal the private engagement payload.
create schema if not exists private;
create function private.refresh_provider_job_count() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 for target in select distinct x from unnest(array[case when TG_OP<>'INSERT' then OLD.provider_id end,case when TG_OP<>'DELETE' then NEW.provider_id end]) x where x is not null loop
  perform 1 from public.providers where id=target for update;
  if found then
   insert into public.provider_job_counts(provider_id,completed_jobs)
   select target,count(*)::integer from public.job_engagements j where j.provider_id=target
    and j.data->>'status'='completed' and nullif(j.data->>'completed_at','') is not null
    and nullif(j.data->'started'->>'customer','') is not null and nullif(j.data->'started'->>'provider','') is not null
   on conflict(provider_id) do update set completed_jobs=excluded.completed_jobs;
  end if;
 end loop;
 return null;
end;
$$;
revoke all on function private.refresh_provider_job_count() from public,anon,authenticated;
create trigger provider_job_count_refresh after insert or update or delete on public.job_engagements for each row execute function private.refresh_provider_job_count();
insert into public.provider_job_counts(provider_id,completed_jobs)
 select provider_id,count(*)::integer from public.job_engagements j where j.data->>'status'='completed'
 and nullif(j.data->>'completed_at','') is not null and nullif(j.data->'started'->>'customer','') is not null and nullif(j.data->'started'->>'provider','') is not null group by provider_id;

-- Separate v2 endpoint leaves current web clients untouched. Rank before pagination.
create function public.discover_service_providers(search_text text default '', profession text default '', area_filter text default '', page_number integer default 0, provider_slug text default '')
returns table(id uuid,name text,slug text,provider_type text,city text,district text,services text[],profile_image text,avg_rating numeric,review_count integer,verification_status text,service_areas text[],completed_jobs integer,badge_kinds text[],confirmed_review_count integer)
language sql stable security invoker set search_path='' as $$
 select p.id,p.name,p.slug,p.provider_type,p.city,p.district,p.services,p.profile_image,r.avg_rating,r.review_count,p.verification_status,p.service_areas,coalesce(j.completed_jobs,0),b.kinds,r.confirmed_count
 from public.providers p
 left join public.provider_job_counts j on j.provider_id=p.id
 cross join lateral (select avg(v.rating)::numeric as avg_rating,count(*)::integer as review_count,count(*) filter(where v.confirmed_job and v.engagement_id is not null)::integer as confirmed_count from public.reviews v where v.provider_id=p.id and v.status='published') r
 cross join lateral (select coalesce(array_agg(distinct v.kind order by v.kind),'{}'::text[]) kinds from public.provider_badges v where v.provider_id=p.id and v.revoked_at is null and v.verified_at<=now() and (v.expires_at is null or v.expires_at>now())) b
 where p.status='active' and p.merged_into is null and p.slug is not null
 and p.provider_type not in ('tile_shop','bathroom_shop','supplier','brand_dealer','tool_supplier')
 and (coalesce(provider_slug,'')='' or p.slug=provider_slug)
 and (coalesce(profession,'')='' or p.provider_type=profession)
 and (coalesce(trim(area_filter),'')='' or lower(trim(p.district))=lower(trim(area_filter)) or lower(trim(p.city))=lower(trim(area_filter))
  or exists(select 1 from unnest(p.service_areas) a where lower(trim(a))=lower(trim(area_filter)) or lower(trim(a)) in ('sri lanka','all island','all-island','islandwide','island-wide','nationwide')))
 and (coalesce(trim(search_text),'')='' or position(lower(trim(search_text)) in lower(concat_ws(' ',p.name,p.provider_type,p.city,p.description,array_to_string(p.services,' '))))>0)
 order by r.avg_rating desc nulls last,coalesce(j.completed_jobs,0) desc,
 (cardinality(b.kinds)>0 or p.verification_status in ('th_verified','th_certified_pro','th_master')) desc,
 r.review_count desc,p.id
 limit 21 offset least(greatest(coalesce(page_number,0),0),10000)*20;
$$;
revoke all on function public.discover_service_providers(text,text,text,integer,text) from public;
grant execute on function public.discover_service_providers(text,text,text,integer,text) to anon,authenticated,service_role;
commit;
