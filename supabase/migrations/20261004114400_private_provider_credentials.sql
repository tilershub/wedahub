begin;
create table public.trusted_issuers (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 160),
 website text check(website is null or (website like 'https://%' and length(website)<=500)),
 credential_types text[] not null default '{}' check(credential_types <@ array['identity','credential','licence','business','industry_registration']::text[]),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.trusted_issuers enable row level security;
grant select on public.trusted_issuers to anon,authenticated;
grant insert,update,delete on public.trusted_issuers to authenticated;
create policy issuer_read on public.trusted_issuers for select to anon,authenticated using(active or public.is_admin());
create policy issuer_admin on public.trusted_issuers for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Private evidence metadata. Only public.provider_badges exposes approved labels.
create table public.provider_credentials (
 id uuid primary key default gen_random_uuid(),
 provider_id uuid not null references public.providers(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 credential_type text not null check(credential_type in ('identity','credential','licence','business','industry_registration')),
 qualification_name text not null check(length(trim(qualification_name)) between 2 and 160),
 field text check(length(field)<=160),
 level text check(length(level)<=100),
 issuing_organization text not null check(length(trim(issuing_organization)) between 2 and 160),
 issuer_id uuid references public.trusted_issuers(id),
 certificate_number text check(length(certificate_number)<=160),
 issue_date date,
 expiry_date date,
 document_path text,
 status text not null default 'self_reported' check(status in ('self_reported','pending','verified','rejected')),
 verification_method text check(verification_method in ('manual','issuer_contact','official_api')),
 verified_at timestamptz,
 reviewed_by uuid references auth.users(id),
 review_note text check(length(review_note)<=2000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(expiry_date is null or issue_date is null or expiry_date >= issue_date),
 check(document_path is null or (document_path like user_id::text||'/'||id::text||'/%' and length(document_path)<=250 and document_path !~ '\.\.'))
);
alter table public.provider_badges add column credential_id uuid unique references public.provider_credentials(id) on delete cascade;
create index credentials_provider_idx on public.provider_credentials(provider_id);
create index credentials_owner_idx on public.provider_credentials(user_id);
create index credentials_issuer_idx on public.provider_credentials(issuer_id);
create index credentials_reviewer_idx on public.provider_credentials(reviewed_by);
create index credentials_queue_idx on public.provider_credentials(status,created_at);
alter table public.provider_credentials enable row level security;
revoke all on public.provider_credentials from anon,authenticated;
grant select,insert,update on public.provider_credentials to authenticated;
create policy credential_read on public.provider_credentials for select to authenticated using(
 public.is_admin() or (user_id=(select auth.uid()) and exists(select 1 from public.providers p where p.id=provider_id and p.user_id=(select auth.uid()))));
create policy credential_create on public.provider_credentials for insert to authenticated with check(
 user_id=(select auth.uid()) and status='self_reported' and exists(select 1 from public.providers p where p.id=provider_id and p.user_id=(select auth.uid())));
create policy credential_update on public.provider_credentials for update to authenticated using(
 public.is_admin() or (user_id=(select auth.uid()) and status='self_reported' and exists(select 1 from public.providers p where p.id=provider_id and p.user_id=(select auth.uid())))) with check(
 public.is_admin() or (user_id=(select auth.uid()) and status in ('self_reported','pending') and exists(select 1 from public.providers p where p.id=provider_id and p.user_id=(select auth.uid()))));

create schema if not exists private;
create function private.guard_credential() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' then
  if new.status<>'self_reported' or new.verified_at is not null or new.reviewed_by is not null or new.verification_method is not null or new.review_note is not null then
   raise exception 'Review fields are administrator controlled' using errcode='42501';
  end if;
  new.created_at:=now();
 else
  if new.id<>old.id or new.provider_id<>old.provider_id or new.user_id<>old.user_id or new.created_at<>old.created_at then
   raise exception 'Credential ownership is immutable' using errcode='42501';
  end if;
  if public.is_admin() and auth.uid()<>old.user_id then
   -- Reviewers cannot silently rewrite the submitted evidence.
   if (to_jsonb(new)-array['status','verification_method','verified_at','reviewed_by','review_note','updated_at']) is distinct from
      (to_jsonb(old)-array['status','verification_method','verified_at','reviewed_by','review_note','updated_at']) then
     raise exception 'Submitted evidence is immutable' using errcode='42501';
   end if;
   if old.status not in ('pending','verified') or new.status not in ('verified','rejected') then raise exception 'Invalid review transition'; end if;
   if length(trim(coalesce(new.review_note,'')))<10 or new.verification_method is null then raise exception 'Verification method and rationale required'; end if;
   if new.verification_method='official_api' then raise exception 'Official API verification is not configured'; end if;
   if new.status='verified' then
    if new.expiry_date is not null and new.expiry_date<(now() at time zone 'Asia/Colombo')::date then raise exception 'Credential has expired'; end if;
    if new.credential_type<>'identity' and not exists(select 1 from public.trusted_issuers i where i.id=new.issuer_id and i.active and new.credential_type=any(i.credential_types)) then
     raise exception 'A recognized issuer for this credential type is required';
    end if;
    new.verified_at:=now();
   else new.verified_at:=null;
   end if;
   new.reviewed_by:=auth.uid();
  else
   if old.status<>'self_reported' or new.status not in ('self_reported','pending') or new.verified_at is distinct from old.verified_at or new.reviewed_by is distinct from old.reviewed_by or new.review_note is distinct from old.review_note or new.verification_method is distinct from old.verification_method then
    raise exception 'Review fields and submitted evidence are protected' using errcode='42501';
   end if;
  end if;
 end if;
 if new.status='pending' and not exists(select 1 from storage.objects o where o.bucket_id='credential-documents' and o.name=new.document_path) then
  raise exception 'Upload a supporting document before requesting verification';
 end if;
 if new.issue_date>current_date then raise exception 'Issue date cannot be in the future'; end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function private.guard_credential() from public,anon,authenticated;
create trigger credential_guard before insert or update on public.provider_credentials for each row execute function private.guard_credential();

create table public.credential_review_events (
 id uuid primary key default gen_random_uuid(), credential_id uuid not null references public.provider_credentials(id) on delete cascade,
 actor_id uuid not null references auth.users(id), status text not null, method text, note text, at timestamptz not null default now()
);
create index credential_events_credential_idx on public.credential_review_events(credential_id);
create index credential_events_actor_idx on public.credential_review_events(actor_id);
alter table public.credential_review_events enable row level security;
revoke all on public.credential_review_events from anon,authenticated;
grant select on public.credential_review_events to authenticated;
create policy credential_events_read on public.credential_review_events for select to authenticated using(public.is_admin());
-- Internal trigger only; never callable through the public API. Records server-derived actor/status.
create function private.record_credential_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authenticated actor required' using errcode='42501'; end if;
 if new.status is distinct from old.status or new.review_note is distinct from old.review_note or new.verification_method is distinct from old.verification_method or new.verified_at is distinct from old.verified_at then
  insert into public.credential_review_events(credential_id,actor_id,status,method,note) values(new.id,auth.uid(),new.status,new.verification_method,new.review_note);
 end if;
 if new.status='verified' then
  insert into public.provider_badges(credential_id,provider_id,kind,subject,verified_at,expires_at)
  values(new.id,new.provider_id,new.credential_type,new.qualification_name,new.verified_at,(new.expiry_date+1)::timestamp at time zone 'Asia/Colombo')
  on conflict(credential_id) do update set verified_at=excluded.verified_at,expires_at=excluded.expires_at,revoked_at=null;
 elsif old.status='verified' then update public.provider_badges set revoked_at=now() where credential_id=new.id;
 end if;
 return new;
end $$;
revoke all on function private.record_credential_review() from public,anon,authenticated;
create trigger credential_review_record after update on public.provider_credentials for each row execute function private.record_credential_review();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('credential-documents','credential-documents',false,10485760,array['application/pdf','image/jpeg','image/png']);
-- No UPDATE/DELETE permission: evidence cannot be replaced while/after reviewed.
create policy credential_object_read on storage.objects for select to authenticated using(bucket_id='credential-documents' and exists(
 select 1 from public.provider_credentials c where split_part(name,'/',1)=c.user_id::text and split_part(name,'/',2)=c.id::text));
create policy credential_object_upload on storage.objects for insert to authenticated with check(bucket_id='credential-documents' and exists(
 select 1 from public.provider_credentials c where c.user_id=(select auth.uid()) and c.status='self_reported' and split_part(name,'/',1)=c.user_id::text and split_part(name,'/',2)=c.id::text));
-- Protect against permissive policies added to other buckets later.
create policy credential_object_anon_guard on storage.objects as restrictive for all to anon using(bucket_id<>'credential-documents') with check(bucket_id<>'credential-documents');
create policy credential_object_read_guard on storage.objects as restrictive for select to authenticated using(bucket_id<>'credential-documents' or (auth.uid() is not null and exists(
 select 1 from public.provider_credentials c where split_part(name,'/',1)=c.user_id::text and split_part(name,'/',2)=c.id::text)));
create policy credential_object_insert_guard on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'credential-documents' or (auth.uid() is not null and exists(
 select 1 from public.provider_credentials c where c.user_id=(select auth.uid()) and c.status='self_reported' and split_part(name,'/',1)=c.user_id::text and split_part(name,'/',2)=c.id::text)));
create policy credential_object_update_guard on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'credential-documents') with check(bucket_id<>'credential-documents');
create policy credential_object_delete_guard on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'credential-documents');
commit;
