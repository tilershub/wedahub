begin;
create table public.credential_upload_slots (
 id uuid primary key default gen_random_uuid(),
 credential_id uuid not null references public.provider_credentials(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 object_path text not null unique,
 mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 minutes'
);
create index credential_slots_credential_idx on public.credential_upload_slots(credential_id);
create index credential_slots_owner_idx on public.credential_upload_slots(user_id);
alter table public.credential_upload_slots enable row level security;
revoke all on public.credential_upload_slots from anon,authenticated;
grant select on public.credential_upload_slots to authenticated;
create policy credential_slots_read on public.credential_upload_slots for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());

create function private.limit_credential_creation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.user_id<>auth.uid() then raise exception 'Owner authentication required' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text,841));
 if (select count(*) from public.provider_credentials where user_id=new.user_id)>=50 or
    (select count(*) from public.provider_credentials where user_id=new.user_id and created_at>now()-interval '24 hours')>=10 then
  raise exception 'Credential submission limit reached' using errcode='P0001';
 end if;
 return new;
end $$;
revoke all on function private.limit_credential_creation() from public,anon,authenticated;
create trigger credential_creation_limit before insert on public.provider_credentials for each row execute function private.limit_credential_creation();

-- A narrowly authorized RPC serializes reservations on the credential row.
-- Direct client inserts into the slots table are forbidden.
create function public.reserve_credential_upload(credential uuid, mime text) returns text
language plpgsql security definer set search_path='' as $$
declare c public.provider_credentials; slot_id uuid:=gen_random_uuid(); object_name text; ext text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into c from public.provider_credentials where id=credential for update;
 if c.id is null or c.user_id<>auth.uid() or c.status<>'self_reported' or not exists(select 1 from public.providers where id=c.provider_id and user_id=auth.uid()) then
  raise exception 'Draft credential ownership required' using errcode='42501';
 end if;
 ext:=case mime when 'application/pdf' then 'pdf' when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else null end;
 if ext is null then raise exception 'Unsupported file type'; end if;
 if (select count(*) from public.credential_upload_slots where credential_id=credential)>=3 then raise exception 'Document upload limit reached'; end if;
 object_name:=c.user_id::text||'/'||c.id::text||'/'||slot_id::text||'.'||ext;
 insert into public.credential_upload_slots(id,credential_id,user_id,object_path,mime_type) values(slot_id,c.id,c.user_id,object_name,mime);
 return object_name;
end $$;
revoke all on function public.reserve_credential_upload(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_credential_upload(uuid,text) to authenticated;

create policy credential_reserved_upload on storage.objects as restrictive for insert to authenticated with check(
 bucket_id<>'credential-documents' or exists(select 1 from public.credential_upload_slots s where s.object_path=name and s.user_id=(select auth.uid()) and s.expires_at>now()));
create function private.check_credential_document_slot() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.document_path is distinct from old.document_path and new.document_path is not null then
  if not exists(select 1 from public.credential_upload_slots s where s.credential_id=new.id and s.user_id=new.user_id and s.object_path=new.document_path and s.expires_at>now()) or
     not exists(select 1 from storage.objects where bucket_id='credential-documents' and name=new.document_path) then
   raise exception 'Upload reservation expired or document missing';
  end if;
 end if;
 return new;
end $$;
revoke all on function private.check_credential_document_slot() from public,anon,authenticated;
create trigger credential_document_slot before insert or update on public.provider_credentials for each row execute function private.check_credential_document_slot();

-- Paths are generated here, never accepted from an admin browser. Attachments cannot
-- switch to these paths after expiry, so cleanup cannot race a later attachment.
create function public.credential_cleanup_candidates() returns table(object_path text)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 return query select s.object_path from public.credential_upload_slots s
 join storage.objects o on o.bucket_id='credential-documents' and o.name=s.object_path
 where s.expires_at<now()-interval '24 hours'
 and not exists(select 1 from public.provider_credentials c where c.document_path=s.object_path)
 order by s.created_at limit 200;
end $$;
revoke all on function public.credential_cleanup_candidates() from public,anon,authenticated;
grant execute on function public.credential_cleanup_candidates() to authenticated;

create table public.trusted_issuer_events (
 id uuid primary key default gen_random_uuid(),issuer_id uuid not null,actor_id uuid not null references auth.users(id),
 action text not null,previous_data jsonb,next_data jsonb,created_at timestamptz not null default now()
);
create index issuer_events_issuer_idx on public.trusted_issuer_events(issuer_id);
create index issuer_events_actor_idx on public.trusted_issuer_events(actor_id);
alter table public.trusted_issuer_events enable row level security;
revoke all on public.trusted_issuer_events from anon,authenticated;
grant select on public.trusted_issuer_events to authenticated;
create policy issuer_events_read on public.trusted_issuer_events for select to authenticated using(public.is_admin());
create function private.audit_trusted_issuer() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Authenticated administrator required' using errcode='42501'; end if;
 insert into public.trusted_issuer_events(issuer_id,actor_id,action,previous_data,next_data)
 values(coalesce(new.id,old.id),auth.uid(),TG_OP,case when TG_OP<>'INSERT' then to_jsonb(old) end,case when TG_OP<>'DELETE' then to_jsonb(new) end);
 return coalesce(new,old);
end $$;
revoke all on function private.audit_trusted_issuer() from public,anon,authenticated;
create trigger trusted_issuer_audit after insert or update or delete on public.trusted_issuers for each row execute function private.audit_trusted_issuer();
commit;
