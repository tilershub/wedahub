import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { PROFESSIONS, RETAIL_TYPES } from '../src/lib/professions.js'
import { SERVICES } from '../src/lib/services.js'
const C='11111111-1111-4111-8111-111111111111',P='22222222-2222-4222-8222-222222222222'
test('catalog supports broad services without retail registration categories',()=>{
 for(const type of ['tutor','cleaner','driver','it_specialist','beauty_professional','caterer','pet_service','other_service','tiler'])assert.ok(PROFESSIONS.some(p=>p.value===type))
 assert.ok(PROFESSIONS.every(p=>!RETAIL_TYPES.includes(p.value)))
 assert.equal(new Set(PROFESSIONS.map(p=>p.value)).size,PROFESSIONS.length)
 assert.equal(new Set(SERVICES.map(p=>p.slug)).size,SERVICES.length)
})
test('service search, applicant ownership and atomic admin approval',async t=>{
 const db=new PGlite()
 try{
 await db.exec(await readFile(new URL('./fixtures/job-schema.sql',import.meta.url),'utf8'))
 await db.exec(`alter table providers add column slug text,add column city text,add column district text,add column services text[],add column service_areas text[],add column description text,add column profile_image text,add column cover_image text,add column gallery text[],add column verification_status text,add column is_featured boolean,add column created_at timestamptz default now(),add column phone text,add column whatsapp text,add column person_id uuid;
 alter table providers alter column id set default gen_random_uuid();
 alter table providers add constraint providers_provider_type_check check(true); alter table providers add column provider_type text;
 create table persons(id uuid primary key default gen_random_uuid(),user_id uuid unique,display_name text);alter table persons enable row level security;
 create policy people_admin on persons for select using(is_admin());
 create table provider_submissions(id uuid primary key default gen_random_uuid(),user_id uuid,name text,provider_type text,city text,district text,services text[],service_areas text[],description text,profile_image text,cover_image text,photo_urls text[],phone text,whatsapp text,status text);
 alter table provider_submissions enable row level security;
 create policy insert_sub on provider_submissions for insert with check(true);
 create policy admin_sub on provider_submissions for all using(is_admin()) with check(is_admin());
 create policy provider_admin on providers for all using(is_admin()) with check(is_admin());
 grant all on persons,provider_submissions to authenticated,service_role;
 `)
 const filename=(await readdir('supabase/migrations')).find(n=>n.endsWith('_all_service_providers.sql'))
 await db.exec(await readFile('supabase/migrations/'+filename,'utf8'))
 const role=async(name,id='',admin='false')=>{await db.exec('reset role; set role '+name);await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.admin',$2,false)",[id,admin])}
 await role('service_role')
 await db.query('insert into providers(name,slug,provider_type,status,services,city) values($1,$2,$3,$4,$5,$6)',['Math teacher','math-teacher','tutor','active',['Maths lessons'],'Kandy'])
 await db.exec("insert into providers(name,slug,provider_type,status) values('Shop','tile-shop','tile_shop','active'),('Hidden','hidden','cleaner','pending_review')")
 await t.test('public search finds actual services and excludes shops and pending profiles',async()=>{
 await role('anon');let r=await db.query("select * from search_service_providers('math','','',0)");assert.equal(r.rows.length,1);assert.equal(r.rows[0].provider_type,'tutor')
 r=await db.query("select * from search_service_providers('','','',0)");assert.equal(r.rows.length,1)
 r=await db.query("select * from search_service_providers('','cleaner','',0)");assert.equal(r.rows.length,0)
 })
 await t.test('new registrations cannot claim another account or approve themselves',async()=>{
 await role('authenticated',C)
 await assert.rejects(db.query("insert into provider_submissions(user_id,status) values($1,'pending_review')",[P]),/row-level security/)
 await assert.rejects(db.query("insert into provider_submissions(user_id,status) values($1,'approved')",[C]),/row-level security/)
 await assert.rejects(db.query("select approve_service_provider(gen_random_uuid())"),/Administrator/)
 })
 await role('service_role');const {rows:[sub]}=await db.query("insert into provider_submissions(user_id,name,provider_type,status,services) values($1,'Design studio','digital_professional','pending_review',array['Web design']) returning id",[C])
 await t.test('approval creates person/profile and is idempotent',async()=>{
 await role('authenticated',P,'true')
 const {rows:[approved]}=await db.query('select approve_service_provider($1) id',[sub.id]);assert.ok(approved.id)
 const result=(await db.query('select user_id,person_id,provider_type from providers where id=$1',[approved.id])).rows[0];assert.equal(result.user_id,C);assert.ok(result.person_id);assert.equal(result.provider_type,'digital_professional')
 assert.equal((await db.query('select approve_service_provider($1) id',[sub.id])).rows[0].id,approved.id)
 assert.equal((await db.query('select status from provider_submissions where id=$1',[sub.id])).rows[0].status,'approved')
 })
 }finally{await db.close()}
})
