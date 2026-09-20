-- Minimal pre-migration schema, including legacy permissive policies found in production.
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function public.is_admin() returns boolean language sql stable as $$ select coalesce(current_setting('request.jwt.claim.admin',true),'false') = 'true' $$;
grant usage on schema auth, public to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create table public.projects(id uuid primary key, user_id uuid, status text default 'pending_review', session_token text, project_type text, city text);
create table public.providers(id uuid primary key, user_id uuid, name text, status text, claim_status text, avg_rating numeric default 0, review_count integer default 0);
create table public.reviews(id uuid primary key default gen_random_uuid(), provider_id uuid references public.providers, tiler_id uuid, reviewer_name text not null, rating integer not null, comment text, job_type text, status text default 'published', created_at timestamptz default now());
alter table projects enable row level security; alter table providers enable row level security; alter table reviews enable row level security;
create policy anon_select_all on projects for select using(true);
create policy auth_select_all on projects for select to authenticated using(true);
create policy public_active on projects for select using(status = 'active');
create policy own_select on projects for select using(user_id = auth.uid());
create policy any_insert on projects for insert with check(true);
create policy any_update on projects for update using(true) with check(true);
create policy any_delete on projects for delete using(true);
create policy provider_read on providers for select using(true);
create policy "claim provider profile" on providers for update using(user_id is null) with check(auth.uid() is not null);
create policy provider_update on providers for update using(user_id=auth.uid()) with check(auth.uid() is not null);
create policy review_read on reviews for select using(true);
create policy review_insert on reviews for insert with check(true);
create policy review_update on reviews for update using(true) with check(true);
create policy review_delete on reviews for delete using(true);
grant all on all tables in schema public to anon,authenticated,service_role;
grant all on auth.users to service_role;

alter table reviews add constraint reviews_status_check check (status in ('published','hidden'));
alter table reviews add constraint reviews_rating_check check (rating between 1 and 5);
create function public.update_provider_rating() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update providers set avg_rating=coalesce((select round(avg(rating)::numeric,1) from reviews where provider_id=coalesce(new.provider_id,old.provider_id) and status='published'),0),
    review_count=(select count(*) from reviews where provider_id=coalesce(new.provider_id,old.provider_id) and status='published') where id=coalesce(new.provider_id,old.provider_id);
  return coalesce(new,old);
end; $$;
create trigger trg_update_rating after insert or update or delete on reviews for each row execute function update_provider_rating();
