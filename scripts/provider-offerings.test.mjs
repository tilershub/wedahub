import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const owner='11111111-1111-4111-8111-111111111111', stranger='22222222-2222-4222-8222-222222222222';
const active='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pending='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
test('service pricing enforces ownership, public visibility, pricing constraints and quota',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;
 create table providers(id uuid primary key,user_id uuid,status text,merged_into uuid);
 create table provider_submissions(city text not null);
 insert into providers values('${active}','${owner}','active',null),('${pending}','${owner}','pending_review',null);
 alter table providers enable row level security;grant select on providers to anon,authenticated;
 create policy visible on providers for select using(status='active' or user_id=auth.uid());`);
 await db.exec(readFileSync('supabase/migrations/20261004171253_provider_service_offerings.sql','utf8'));
 await db.exec('insert into provider_submissions(city) values(null)');
 const as=async(role,id='')=>db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);
 const insert=(id,model='quotation',extra='')=>`insert into provider_service_offerings(provider_id,title,pricing_model${extra?',amount,duration_minutes':''}) values('${id}','Bathroom plumbing','${model}'${extra?','+extra:''})`;
 await as('authenticated',owner);
 await db.exec(insert(active));await db.exec(insert(pending,'session','1000,120'));
 await assert.rejects(db.exec(insert(active,'session','1000,0')),/check constraint/);
 await assert.rejects(db.exec(insert(active,'daily','-1,null')),/check constraint/);
 await assert.rejects(db.exec(`update provider_service_offerings set provider_id='${pending}' where provider_id='${active}'`),/immutable/);
 await as('authenticated',stranger);
 assert.equal((await db.query('select * from provider_service_offerings')).rows.length,1);
 await assert.rejects(db.exec(insert(active)),/row-level security/);
 assert.equal((await db.query('delete from provider_service_offerings returning *')).rows.length,0);
 assert.equal((await db.query("update provider_service_offerings set title='Hacked' returning *")).rows.length,0);
 await as('anon');assert.equal((await db.query('select * from provider_service_offerings')).rows.length,1);
 await assert.rejects(db.exec(insert(active)),/permission denied/);
 await as('authenticated',owner);
 await db.exec(`insert into provider_service_offerings(provider_id,title,pricing_model) select '${active}','Extra service','quotation' from generate_series(1,49)`);
 await assert.rejects(db.exec(insert(active)),/limit reached/);
 }finally{await db.close();}
});
