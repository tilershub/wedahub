begin;
alter table public.providers drop constraint providers_provider_type_check;
alter table public.providers add constraint providers_provider_type_check check (provider_type in ('cleaner','electrician','plumber','carpenter','painter','tiler','mason','contractor','construction_company','interior_designer','architect','technician','mechanic','gardener','driver','mover','tutor','it_specialist','digital_professional','photographer','event_provider','caterer','beauty_professional','tailor','fitness_trainer','caregiver','pet_service','business_professional','welder','general_worker','workshop','other_service','tile_shop','bathroom_shop','supplier','brand_dealer','tool_supplier'));

-- Public search inherits the existing provider RLS. Only public profile fields
-- are returned; retail-only records remain stored but are excluded from discovery.
create function public.search_service_providers(search_text text default '', profession text default '', district_filter text default '', page_number integer default 0)
returns table(id uuid, name text, slug text, provider_type text, city text, district text, services text[], profile_image text, avg_rating numeric, review_count integer, verification_status text)
language sql stable security invoker set search_path = '' as $$
 select p.id,p.name,p.slug,p.provider_type,p.city,p.district,p.services,p.profile_image,p.avg_rating,p.review_count,p.verification_status
 from public.providers p
 where p.status='active' and p.slug is not null
 and p.provider_type not in ('tile_shop','bathroom_shop','supplier','brand_dealer','tool_supplier')
 and (coalesce(profession,'')='' or p.provider_type=profession)
 and (coalesce(district_filter,'')='' or p.district=district_filter or district_filter=any(p.service_areas) or p.city ilike district_filter)
 and (coalesce(trim(search_text),'')='' or position(lower(trim(search_text)) in lower(concat_ws(' ',p.name,p.provider_type,p.city,p.description,array_to_string(p.services,' '))))>0)
 order by p.is_featured desc nulls last,p.review_count desc nulls last,p.created_at desc,p.id
 limit 21 offset least(greatest(coalesce(page_number,0),0),10000)*20;
$$;
revoke all on function public.search_service_providers(text,text,text,integer) from public;
grant execute on function public.search_service_providers(text,text,text,integer) to anon,authenticated,service_role;

-- Registration belongs to the authenticated applicant, never a supplied third party.
create policy submissions_owned_insert_guard on public.provider_submissions as restrictive for insert to anon,authenticated
with check (user_id=(select auth.uid()) and status='pending_review');
create policy admin_creates_person on public.persons for insert to authenticated with check (public.is_admin());

-- Approval reads the stored submission and commits the person/profile/status together.
create function public.approve_service_provider(submission_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare s public.provider_submissions; person_uuid uuid; provider_uuid uuid; provider_slug text;
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into s from public.provider_submissions where id=submission_id for update;
 if not found or s.user_id is null then raise exception 'No account-linked submission found'; end if;
 perform pg_advisory_xact_lock(hashtext(s.user_id::text));
 select id into provider_uuid from public.providers where user_id=s.user_id limit 1;
 if provider_uuid is null then
   select id into person_uuid from public.persons where user_id=s.user_id limit 1;
   if person_uuid is null then
     insert into public.persons(user_id,display_name) values(s.user_id,s.name) returning id into person_uuid;
   end if;
   provider_slug := coalesce(nullif(trim(both '-' from regexp_replace(lower(s.name),'[^a-z0-9]+','-','g')),''),'service-provider') || '-' || substr(gen_random_uuid()::text,1,8);
   insert into public.providers(name,slug,provider_type,city,district,whatsapp,phone,description,profile_image,cover_image,gallery,service_areas,services,user_id,person_id,status,verification_status,claim_status)
   values(s.name,provider_slug,s.provider_type,s.city,s.district,s.whatsapp,s.phone,s.description,s.profile_image,s.cover_image,s.photo_urls,s.service_areas,s.services,s.user_id,person_uuid,'active','listed','claimed') returning id into provider_uuid;
 end if;
 update public.provider_submissions set status='approved' where id=s.id;
 return provider_uuid;
end;
$$;
revoke all on function public.approve_service_provider(uuid) from public,anon;
grant execute on function public.approve_service_provider(uuid) to authenticated;
commit;
