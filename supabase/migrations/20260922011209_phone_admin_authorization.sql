-- Explicit grant for the verified 0774503744 account requested by the owner.
-- Preserve the existing email allowlist; never authorize by editable profile data.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.admin_users where email = auth.email())
    or auth.uid() = '9c332dbf-dfb7-4854-a2c6-629786b1f9d9'::uuid
  );
$$;
