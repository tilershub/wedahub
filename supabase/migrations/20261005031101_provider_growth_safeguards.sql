begin;
-- Protect the shared registration path against double taps and concurrent clients.
create unique index submissions_one_pending_per_account on public.provider_submissions(user_id)
 where user_id is not null and status='pending_review';
create function private.guard_provider_registration() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.user_id is not null then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.user_id::text));
  if exists(select 1 from public.providers where user_id=new.user_id and merged_into is null) then
   raise exception 'A provider profile already exists for this account' using errcode='23505';
  end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_provider_registration() from public,anon,authenticated;
create trigger provider_registration_guard before insert on public.provider_submissions for each row execute function private.guard_provider_registration();

-- New jobs require uploaded photos. Historical rows remain valid.
alter table public.projects add column if not exists updated_at timestamptz not null default now();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('job-images','job-images',true,5242880,array['image/jpeg','image/png']);
create policy job_image_owner_read on storage.objects for select to authenticated using(bucket_id='job-images' and split_part(name,'/',1)=(select auth.uid())::text);
create policy job_image_owner_insert on storage.objects for insert to authenticated with check(bucket_id='job-images' and split_part(name,'/',1)=(select auth.uid())::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{16,50}\.(jpg|png)$');
create policy job_image_upload_guard on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'job-images' or (auth.uid() is not null and split_part(name,'/',1)=auth.uid()::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{16,50}\.(jpg|png)$'));
create policy job_image_update_guard on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'job-images') with check(bucket_id<>'job-images');
create policy job_image_delete_guard on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'job-images');
create function private.guard_job_photos() returns trigger language plpgsql security invoker set search_path='' as $$
declare image_url text; object_path text;
begin
 if TG_OP='INSERT' or new.images is distinct from old.images then
  if coalesce(cardinality(new.images),0) not between 1 and 5 then raise exception 'Add between 1 and 5 uploaded photos'; end if;
  if (select count(distinct v) from unnest(new.images) v)<>cardinality(new.images) then raise exception 'Duplicate photos are not allowed'; end if;
  foreach image_url in array new.images loop
   if image_url is null or image_url not like 'https://ginrgwaciblcvxvkbeyd.supabase.co/storage/v1/object/public/job-images/%' then raise exception 'Use uploaded job images'; end if;
   object_path:=substr(image_url,length('https://ginrgwaciblcvxvkbeyd.supabase.co/storage/v1/object/public/job-images/')+1);
   if split_part(object_path,'/',1) is distinct from new.user_id::text or not exists(select 1 from storage.objects where bucket_id='job-images' and name=object_path) then raise exception 'Photo ownership or upload invalid'; end if;
  end loop;
 end if;
 return new;
end $$;
revoke all on function private.guard_job_photos() from public,anon,authenticated;
-- The enforcement trigger is activated in a separate rollout migration after web deployment.

create function private.limit_job_image_uploads() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.bucket_id='job-images' then
  if auth.uid() is null or split_part(new.name,'/',1)<>auth.uid()::text then raise exception 'Upload ownership required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,915));
  if (select count(*) from storage.objects where bucket_id='job-images' and split_part(name,'/',1)=auth.uid()::text and created_at>now()-interval '24 hours')>=25 then raise exception 'Daily photo upload limit reached'; end if;
 end if;
 return new;
end $$;
revoke all on function private.limit_job_image_uploads() from public,anon,authenticated;
create trigger job_image_upload_limit before insert on storage.objects for each row execute function private.limit_job_image_uploads();

-- A narrow public projection: documents, identity details and certificate numbers stay private.
alter table public.provider_credentials add column public_listing boolean not null default false;
create table public.provider_qualification_summaries(
 credential_id uuid primary key references public.provider_credentials(id) on delete cascade,
 provider_id uuid not null references public.providers(id) on delete cascade,
 qualification_name text not null,field text,level text,issuing_organization text not null,
 status text not null check(status in('pending','verified')),expiry_date date
);
create index qualification_provider_idx on public.provider_qualification_summaries(provider_id);
alter table public.provider_qualification_summaries enable row level security;
revoke all on public.provider_qualification_summaries from anon,authenticated;
grant select on public.provider_qualification_summaries to anon,authenticated;
create policy public_qualification_read on public.provider_qualification_summaries for select to anon,authenticated using(exists(select 1 from public.providers p where p.id=provider_id and p.merged_into is null and (p.status='active' or p.user_id=(select auth.uid()))));
create function private.sync_public_qualification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authenticated actor required'; end if;
 if new.public_listing and new.credential_type in('credential','licence','industry_registration') and new.status in('pending','verified') and exists(select 1 from storage.objects where bucket_id='credential-documents' and name=new.document_path) then
  insert into public.provider_qualification_summaries values(new.id,new.provider_id,new.qualification_name,new.field,new.level,new.issuing_organization,new.status,new.expiry_date)
  on conflict(credential_id) do update set qualification_name=excluded.qualification_name,field=excluded.field,level=excluded.level,issuing_organization=excluded.issuing_organization,status=excluded.status,expiry_date=excluded.expiry_date;
 else delete from public.provider_qualification_summaries where credential_id=new.id;
 end if;
 return new;
end $$;
revoke all on function private.sync_public_qualification() from public,anon,authenticated;
create trigger sync_public_qualification after insert or update on public.provider_credentials for each row execute function private.sync_public_qualification();
alter table public.provider_service_offerings add constraint offering_finite_prices check((amount is null or amount::text not in('NaN','Infinity','-Infinity')) and (maximum_amount is null or maximum_amount::text not in('NaN','Infinity','-Infinity')));
create or replace function public.discover_service_providers(search_text text default '', profession text default '', area_filter text default '', page_number integer default 0, provider_slug text default '')
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
 and not exists(select 1 from regexp_split_to_table(lower(left(trim(coalesce(search_text,'')),200)), '\s+') term
 where term<>'' and position(term in lower(concat_ws(' ',p.name,p.provider_type,p.city,p.description,array_to_string(p.services,' '),
 (select string_agg(concat_ws(' ',o.title,o.description),' ') from public.provider_service_offerings o where o.provider_id=p.id),
 (select string_agg(concat_ws(' ',sk.name_en,sk.name_si,sk.name_ta),' ') from public.provider_skills ps join public.skills sk on sk.id=ps.skill_id where ps.provider_id=p.id and sk.active))))=0)
 order by r.avg_rating desc nulls last,coalesce(j.completed_jobs,0) desc,
 (cardinality(b.kinds)>0 or p.verification_status in ('th_verified','th_certified_pro','th_master')) desc,
 r.review_count desc,p.id
 limit 21 offset least(greatest(coalesce(page_number,0),0),10000)*20;
$$;

commit;
