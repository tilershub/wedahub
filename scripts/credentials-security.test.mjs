import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const sql=readFileSync('supabase/migrations/20261004114400_private_provider_credentials.sql','utf8');
for(const hardened of [false,true]) test(`private credentials: ownership, immutable evidence, reviewed badges, storage isolation and audit (limits=${hardened})`,async()=>{
 const db=new PGlite();
 const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',admin='33333333-3333-4333-8333-333333333333';
 const provider='44444444-4444-4444-8444-444444444444',cred='55555555-5555-4555-8555-555555555555',issuer='66666666-6666-4666-8666-666666666666';
 let path=`${owner}/${cred}/certificate.pdf`; let abandoned;
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${other}'),('${admin}');
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.is_admin() returns boolean language sql as $$select coalesce(auth.uid()='${admin}',false)$$;
 grant usage on schema auth,storage to anon,authenticated;
 create table public.providers(id uuid primary key,user_id uuid); insert into providers values('${provider}','${owner}'); grant select on providers to anon,authenticated;
 create table public.provider_badges(id uuid primary key default gen_random_uuid(),provider_id uuid,kind text,subject text,verified_at timestamptz,expires_at timestamptz,revoked_at timestamptz);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to anon,authenticated;
 -- Simulate a future unsafe permissive policy; restrictive guards must still protect evidence.
 create policy broad_read on storage.objects for select to anon,authenticated using(true);
 create policy broad_write on storage.objects for all to authenticated using(true) with check(true);
 `);
 await db.exec(sql);
 if(hardened)await db.exec(readFileSync('supabase/migrations/20261004115826_credential_upload_limits_and_audit.sql','utf8'));
 await db.exec(`set test.uid='${admin}';`);
 await db.exec(`insert into trusted_issuers(id,name,credential_types) values('${issuer}','Recognized institute',array['credential']); set role authenticated; set test.uid='${owner}';`);
 await assert.rejects(db.exec(`insert into provider_credentials(provider_id,user_id,credential_type,qualification_name,issuing_organization,status) values('${provider}','${owner}','credential','NVQ','Institute','verified')`));
 await db.exec(`insert into provider_credentials(id,provider_id,user_id,credential_type,qualification_name,issuing_organization,issuer_id) values('${cred}','${provider}','${owner}','credential','Trade certificate','Recognized institute','${issuer}')`);
 await assert.rejects(db.exec(`update provider_credentials set status='pending' where id='${cred}'`));
 if(hardened){
  await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values('credential-documents','${path}')`));
  await assert.rejects(db.query('select * from credential_cleanup_candidates()'));
  const reserve=async()=>(await db.query(`select reserve_credential_upload('${cred}','application/pdf') as path`)).rows[0].path;
  path=await reserve(); abandoned=await reserve(); await reserve(); await assert.rejects(reserve());
  await db.exec(`insert into storage.objects(bucket_id,name) values('credential-documents','${abandoned}')`);
  await assert.rejects(db.exec(`insert into credential_upload_slots(credential_id,user_id,object_path,mime_type) values('${cred}','${owner}','forged','application/pdf')`));
 }
 await db.exec(`insert into storage.objects(bucket_id,name) values('credential-documents','${path}'); update provider_credentials set document_path='${path}',status='pending' where id='${cred}';`);
 assert.equal((await db.query(`update provider_credentials set status='verified' where id='${cred}' returning id`)).rows.length,0);
 assert.equal((await db.query(`update provider_credentials set qualification_name='Tampered' where id='${cred}' returning id`)).rows.length,0);
 assert.equal((await db.query(`delete from storage.objects where name='${path}' returning name`)).rows.length,0);
 assert.equal((await db.query(`update storage.objects set name='replacement' where name='${path}' returning name`)).rows.length,0);
 await db.exec(`set test.uid='${other}';`);
 assert.equal((await db.query('select * from provider_credentials')).rows.length,0);
 assert.equal((await db.query("select * from storage.objects where bucket_id='credential-documents'")).rows.length,0);
 await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values('credential-documents','${path}')`));
 await db.exec(`set test.uid='${admin}';`);
 await assert.rejects(db.exec(`update provider_credentials set status='verified',verification_method='official_api',review_note='Not actually integrated' where id='${cred}'`));
 await db.exec(`update provider_credentials set status='verified',verification_method='issuer_contact',review_note='Confirmed with issuing institution' where id='${cred}'; reset role;`);
 assert.equal((await db.query('select * from provider_badges where revoked_at is null')).rows.length,1);
 assert.equal((await db.query('select * from credential_review_events')).rows.length,2);
 await db.exec(`set role authenticated; set test.uid='${admin}'; update provider_credentials set status='rejected',review_note='Issuer withdrew this credential' where id='${cred}'; reset role;`);
 assert.equal((await db.query('select * from provider_badges where revoked_at is null')).rows.length,0);
 if(hardened){
  await db.exec(`update credential_upload_slots set expires_at=now()-interval '2 days'; set role authenticated; set test.uid='${admin}'; update trusted_issuers set active=false where id='${issuer}';`);
  assert.deepEqual((await db.query('select * from credential_cleanup_candidates()')).rows.map(r=>r.object_path),[abandoned]);
  assert.equal((await db.query('select * from trusted_issuer_events')).rows.length,2);
  await assert.rejects(db.exec('delete from trusted_issuer_events'));
  await db.exec(`set test.uid='${owner}'; insert into provider_credentials(provider_id,user_id,credential_type,qualification_name,issuing_organization) select '${provider}','${owner}','credential','Draft '||n,'Institution' from generate_series(1,9)n;`);
  await assert.rejects(db.exec(`insert into provider_credentials(provider_id,user_id,credential_type,qualification_name,issuing_organization) values('${provider}','${owner}','credential','Over limit','Institution')`));
  await db.exec('reset role');
 }
 await db.exec(`insert into storage.objects(bucket_id,name) values('avatars','public-photo'); set role anon; set test.uid='';`);
 assert.deepEqual((await db.query('select name from storage.objects')).rows.map(x=>x.name),['public-photo']);
 await assert.rejects(db.query('select * from provider_credentials'));
 }finally{await db.close()}
});
