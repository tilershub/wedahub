-- Apply after the updated web posting form is deployed. Existing jobs are grandfathered.
begin;
create trigger new_job_photos_guard before insert or update on public.projects for each row execute function private.guard_job_photos();
commit;
