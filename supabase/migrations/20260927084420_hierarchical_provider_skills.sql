-- Additive catalogue: existing providers.services/provider_type remain untouched.
-- IDs encode ancestry, so the parent constraint prevents cycles even under concurrency.
create table public.skills (
  id text primary key check (length(id) <= 240 and id ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$'),
  parent_id text references public.skills(id) on delete restrict,
  name_en text not null check (length(trim(name_en)) between 1 and 160),
  name_si text not null check (length(trim(name_si)) between 1 and 160),
  name_ta text not null check (length(trim(name_ta)) between 1 and 160),
  selectable boolean not null default true,
  active boolean not null default true,
  constraint skills_ancestry check (
    (position('.' in id) = 0 and parent_id is null)
    or (position('.' in id) > 0 and parent_id is not null and parent_id = regexp_replace(id, '\.[^.]+$', ''))
  )
);
create index skills_parent_idx on public.skills(parent_id);

create table public.provider_skills (
  provider_id uuid not null references public.providers(id) on delete cascade,
  skill_id text not null references public.skills(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (provider_id, skill_id)
);
create index provider_skills_skill_idx on public.provider_skills(skill_id, provider_id);

alter table public.skills enable row level security;
alter table public.provider_skills enable row level security;
-- Override Supabase default privileges, including TRUNCATE and trigger grants.
revoke all on public.skills, public.provider_skills from public, anon, authenticated;
grant select on public.skills, public.provider_skills to anon, authenticated;
grant insert, update, delete on public.skills to authenticated;
grant insert (provider_id, skill_id), delete on public.provider_skills to authenticated;
grant all on public.skills, public.provider_skills to service_role;

create policy skills_read on public.skills for select to anon, authenticated using (true);
create policy skills_admin_insert on public.skills for insert to authenticated with check ((select public.is_admin()));
create policy skills_admin_update on public.skills for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy skills_admin_delete on public.skills for delete to authenticated using ((select public.is_admin()));

-- A skill is a self-reported capability. It carries no verification status.
create policy provider_skills_read on public.provider_skills for select to anon, authenticated using (
  exists (select 1 from public.providers p where p.id = provider_id and p.merged_into is null
    and (p.status = 'active' or p.user_id = (select auth.uid()) or (select public.is_admin())))
);
create policy provider_skills_insert on public.provider_skills for insert to authenticated with check (
  exists (select 1 from public.providers p where p.id = provider_id and p.merged_into is null
    and (p.user_id = (select auth.uid()) or (select public.is_admin())))
  and exists (select 1 from public.skills s where s.id = skill_id and s.active and s.selectable)
);
create policy provider_skills_delete on public.provider_skills for delete to authenticated using (
  exists (select 1 from public.providers p where p.id = provider_id
    and (p.user_id = (select auth.uid()) or (select public.is_admin())))
);

insert into public.skills (id,parent_id,name_en,name_si,name_ta,selectable) values
('construction',null,'Construction','ඉදිකිරීම්','கட்டுமானம்',false),
('hospitality',null,'Hospitality','ආගන්තුක සත්කාර','விருந்தோம்பல்',false),
('education',null,'Education','අධ්‍යාපනය','கல்வி',false),
('transport',null,'Transport','ප්‍රවාහනය','போக்குவரத்து',false),
('home_services',null,'Home services','ගෘහ සේවා','வீட்டுச் சேவைகள்',false),
('construction.tiling','construction','Tiling','ටයිල් ඇල්ලීම','டைல் பதித்தல்',true),
('construction.electrical','construction','Electrical work','විදුලි වැඩ','மின்சார வேலை',true),
('construction.plumbing','construction','Plumbing','ජලනළ වැඩ','குழாய் வேலை',true),
('construction.masonry','construction','Masonry','පෙදරේරු වැඩ','கொத்தனார் வேலை',true),
('construction.carpentry','construction','Carpentry','වඩු වැඩ','தச்சு வேலை',true),
('construction.painting','construction','Painting','පින්තාරු කිරීම','வர்ணம் பூசுதல்',true),
('construction.welding','construction','Welding','වෑල්ඩින් වැඩ','வெல்டிங் வேலை',true),
('hospitality.chef','hospitality','Cooking / Chef','ආහාර පිසීම / සූපවේදී','சமையல் / சமையல்காரர்',true),
('education.teaching','education','Teaching','ඉගැන්වීම','கற்பித்தல்',true),
('transport.driving','transport','Driving','රිය පැදවීම','வாகனம் ஓட்டுதல்',true),
('home_services.cleaning','home_services','Cleaning','පිරිසිදු කිරීම','சுத்தம் செய்தல்',true),
('home_services.repairs','home_services','Appliance repairs','උපකරණ අලුත්වැඩියා','சாதனங்கள் பழுதுபார்த்தல்',true),
('construction.tiling.large_format','construction.tiling','Large-format tiling','විශාල ප්‍රමාණයේ ටයිල් ඇල්ලීම','பெரிய அளவிலான டைல் பதித்தல்',true),
('construction.electrical.domestic','construction.electrical','Domestic electrical installation','ගෘහස්ථ විදුලි ස්ථාපනය','வீட்டு மின் நிறுவல்',true),
('hospitality.chef.sri_lankan','hospitality.chef','Sri Lankan cuisine','ශ්‍රී ලාංකික ආහාර','இலங்கை உணவு வகைகள்',true),
('education.teaching.mathematics','education.teaching','Mathematics','ගණිතය','கணிதம்',true);

comment on table public.provider_skills is 'Self-reported skills; never evidence of a verified qualification or licence.';
