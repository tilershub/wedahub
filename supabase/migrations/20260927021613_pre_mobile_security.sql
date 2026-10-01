-- Audited against WEDAHUB on 2026-09-27. No rows are deleted or rewritten.
begin;

-- The website retired claims in favour of authenticated applications and admin
-- approval. Clients must not manufacture their own verification code/claim.
revoke insert, update, delete on public.claim_requests from public, anon, authenticated;
revoke execute on function public.verify_claim(uuid,text) from public, anon, authenticated;
revoke execute on function public.get_claim_status(uuid) from public, anon, authenticated;

-- This legacy automatically updatable view otherwise bypasses table RLS.
alter view public.tiler_profiles set (security_invoker = true);
revoke insert, update, delete on public.tiler_profiles from public, anon, authenticated;

-- RLS protects row ownership; it does not prevent an owner changing trust fields.
-- Use a BEFORE trigger so normal profile editing and the existing admin stay intact.
-- SECURITY INVOKER is intentional: the trusted rating trigger executes as its
-- definer and server/service-role updates continue to maintain projections.
create function public.guard_profile_fields() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('anon','authenticated') and not coalesce(public.is_admin(),false) then
    if (to_jsonb(new) - tg_argv[0]::text[]) is distinct from
       (to_jsonb(old) - tg_argv[0]::text[]) then
      raise exception 'Only administrators may change protected profile fields' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_profile_fields() from public, anon, authenticated;
create trigger providers_protected_fields before update on public.providers
for each row execute function public.guard_profile_fields('{name,city,district,service_areas,services,description,whatsapp,phone,profile_image,cover_image,gallery,experience_years,website_url,daily_rate_min,daily_rate_max,visit_fee,updated_at}');
create trigger tilers_protected_fields before update on public.tilers
for each row execute function public.guard_profile_fields('{full_name,city,district,phone,whatsapp,avatar_url,bio,experience_years,daily_rate_min,daily_rate_max,services,availability,cover_image,gallery,service_areas}');
create trigger persons_protected_fields before update on public.persons
for each row execute function public.guard_profile_fields('{display_name}');

-- A user-entered contact number is not proof of bid ownership.
drop policy "bidder reads own submitted bids" on public.bids;
create policy bids_insert_identity_guard on public.bids as restrictive
for insert to anon, authenticated
with check ((select auth.uid()) is not null and user_id = (select auth.uid()) and status = 'new');
create trigger bids_protected_fields before update on public.bids
for each row execute function public.guard_profile_fields('{bidder_name,bidder_whatsapp,bidder_type,message,quote_amount,timeline}');
create policy bids_admin_update on public.bids for update to authenticated
using (public.is_admin()) with check (public.is_admin());

-- The current website uses blogs; this older empty table must not be a public
-- write endpoint. Preserve published reads and allow the authenticated admin.
drop policy "anon full access" on public.blog_posts;
create policy blog_posts_admin_manage on public.blog_posts for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Preserve current web upload paths, including arbitrary admin prefixes.
drop policy "Anyone can upload provider assets" on storage.objects;
create policy provider_assets_owned_upload on storage.objects for insert to authenticated
with check (bucket_id = 'provider-assets' and (
  public.is_admin() or (
    (select auth.uid()) is not null
    and (storage.foldername(name))[1] in ('profiles','covers','portfolio')
    and left(storage.filename(name),37) = (select auth.uid())::text || '-'
  )
));

alter function public.update_blog_posts_updated_at() set search_path = '';
alter function public.set_updated_at() set search_path = '';
alter function public.normalize_lk_phone(text) set search_path = '';
alter function public.enforce_profile_limit() set search_path = '';
revoke execute on function public.update_provider_rating() from public, anon, authenticated;
revoke truncate, references, trigger on all tables in schema public from public, anon, authenticated;
commit;
