begin;
-- A location is optional at registration; do not invent a hometown.
alter table public.provider_submissions alter column city drop not null;
create table public.provider_service_offerings (
 id uuid primary key default gen_random_uuid(),
 provider_id uuid not null references public.providers(id) on delete cascade,
 title text not null check(length(trim(title)) between 2 and 120),
 description text check(length(description)<=1000),
 pricing_model text not null check(pricing_model in ('hourly','daily','per_m2','per_sqft','per_unit','fixed','starting_from','range','quotation','session')),
 amount numeric(12,2), maximum_amount numeric(12,2),
 unit_label text check(length(unit_label)<=60),
 duration_minutes integer,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((pricing_model='quotation' and amount is null and maximum_amount is null) or (pricing_model<>'quotation' and amount>=0 and amount is not null)),
 check((pricing_model='range' and maximum_amount is not null and maximum_amount>=amount) or (pricing_model<>'range' and maximum_amount is null)),
 check((pricing_model='session' and duration_minutes between 15 and 1440 and duration_minutes is not null) or (pricing_model<>'session' and duration_minutes is null)),
 check(pricing_model<>'per_unit' or length(trim(unit_label))>0 and unit_label is not null)
);
create index provider_offerings_provider_idx on public.provider_service_offerings(provider_id);
alter table public.provider_service_offerings enable row level security;
revoke all on public.provider_service_offerings from anon,authenticated;
grant select on public.provider_service_offerings to anon,authenticated;
grant insert,update,delete on public.provider_service_offerings to authenticated;
create policy offering_public_read on public.provider_service_offerings for select to anon,authenticated using(exists(
 select 1 from public.providers p where p.id=provider_id and p.merged_into is null and (p.status='active' or p.user_id=(select auth.uid()))));
create policy offering_owner_insert on public.provider_service_offerings for insert to authenticated with check(exists(
 select 1 from public.providers p where p.id=provider_id and p.user_id=(select auth.uid()) and p.merged_into is null));
create policy offering_owner_update on public.provider_service_offerings for update to authenticated using(exists(
 select 1 from public.providers p where p.id=provider_id and p.user_id=(select auth.uid()) and p.merged_into is null)) with check(exists(
 select 1 from public.providers p where p.id=provider_id and p.user_id=(select auth.uid()) and p.merged_into is null));
create policy offering_owner_delete on public.provider_service_offerings for delete to authenticated using(exists(
 select 1 from public.providers p where p.id=provider_id and p.user_id=(select auth.uid()) and p.merged_into is null));
create function private.guard_provider_offering() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and (new.id<>old.id or new.provider_id<>old.provider_id or new.created_at<>old.created_at) then
  raise exception 'Service ownership is immutable' using errcode='42501';
 end if;
 if TG_OP='INSERT' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.provider_id::text,844));
  if (select count(*) from public.provider_service_offerings where provider_id=new.provider_id)>=50 then raise exception 'Service limit reached'; end if;
  new.created_at:=now();
 end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function private.guard_provider_offering() from public,anon,authenticated;
create trigger provider_offering_guard before insert or update on public.provider_service_offerings for each row execute function private.guard_provider_offering();
commit;
