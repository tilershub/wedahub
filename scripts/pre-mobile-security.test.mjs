import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const owner='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222'
const migration = await readFile(new URL('../supabase/migrations/20260927021613_pre_mobile_security.sql',import.meta.url),'utf8')
test('pre-mobile hardening preserves normal web actions and denies forged evidence',async t=>{
  const db=new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function public.is_admin() returns boolean language sql stable as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;
      create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
      create function storage.filename(text) returns text language sql immutable as $$select split_part($1,'/',-1)$$;
      grant usage on schema public,auth,storage to anon,authenticated,service_role;
      create table providers(id int primary key,user_id uuid,name text,verification_status text default 'listed',avg_rating numeric default 0,review_count int default 0,status text default 'active',is_featured boolean default false,person_id uuid,merged_into uuid,gallery text[],updated_at timestamptz);
      create table tilers(id int primary key,user_id uuid,full_name text,is_verified boolean default false,avg_rating numeric default 0,total_jobs int default 0);
      create table persons(id int primary key,user_id uuid,display_name text,nic_hash text,merged_into uuid);
      create table claim_requests(id uuid,user_id uuid,code text);
      create table bids(id int primary key,user_id uuid,job_id int,bidder_whatsapp text,message text,status text default 'new');
      create table blog_posts(id int,title text,status text);
      create table storage.objects(id int,bucket_id text,name text);
      create view tiler_profiles as select id,full_name,is_verified from tilers;
      alter table providers enable row level security; alter table tilers enable row level security;
      alter table persons enable row level security; alter table bids enable row level security;
      alter table claim_requests enable row level security; alter table blog_posts enable row level security;
      alter table storage.objects enable row level security;
      create policy profile_read on providers for select using(true);
      create policy profile_update on providers for update using(user_id=auth.uid() or is_admin()) with check(user_id=auth.uid() or is_admin());
      create policy tiler_read on tilers for select using(true);
      create policy tiler_update on tilers for update using(user_id=auth.uid() or is_admin()) with check(auth.uid() is not null);
      create policy person_all on persons for all using(user_id=auth.uid() or is_admin()) with check(user_id=auth.uid() or is_admin());
      create policy claim_insert on claim_requests for insert with check(user_id=auth.uid());
      create policy "bidder reads own submitted bids" on bids for select using(true);
      create policy bid_read on bids for select using(user_id=auth.uid() or is_admin());
      create policy bid_insert on bids for insert with check(true);
      create policy bid_update on bids for update using(user_id=auth.uid()) with check(user_id=auth.uid());
      create policy "anon full access" on blog_posts for all to anon using(true) with check(true);
      create policy blog_read on blog_posts for select using(status='published');
      create policy "Anyone can upload provider assets" on storage.objects for insert with check(bucket_id='provider-assets');
      create function verify_claim(uuid,text) returns text language sql security definer as $$select 'ok'::text$$;
      create function get_claim_status(uuid) returns json language sql security definer as $$select '{}'::json$$;
      create function update_blog_posts_updated_at() returns trigger language plpgsql as $$begin return new; end$$;
      create function set_updated_at() returns trigger language plpgsql as $$begin return new; end$$;
      create function normalize_lk_phone(text) returns text language sql as $$select $1$$;
      create function enforce_profile_limit() returns trigger language plpgsql as $$begin return new; end$$;
      create function update_provider_rating() returns trigger language plpgsql security definer as $$begin update public.providers set avg_rating=5,review_count=1 where id=1; return new; end$$;
      create table trusted_reviews(id int); create trigger rating after insert on trusted_reviews for each row execute function update_provider_rating();
      grant all on all tables in schema public to anon,authenticated,service_role;
      grant all on storage.objects to anon,authenticated,service_role;
      insert into providers(id,user_id,name) values(1,'${owner}','Original');
      insert into tilers(id,user_id,full_name) values(1,'${owner}','Original');
      insert into persons(id,user_id,display_name) values(1,'${owner}','Original');
      insert into bids(id,user_id,job_id,message,bidder_whatsapp) values(1,'${owner}',1,'Original','same-number');
    `)
    await db.exec(migration)
    const role=async(name,id='',admin=false)=>{
      await db.exec(`reset role; set role ${name}`)
      await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('test.admin',$2,false)",[id,String(admin)])
    }
    await t.test('owner profile editing works, verification/rating/ownership tampering fails',async()=>{
      await role('authenticated',owner)
      await db.exec("update providers set name='Updated',gallery=array['https://example.test/photo'] where id=1")
      for(const patch of ["verification_status='th_master'","avg_rating=5","review_count=99","is_featured=true","status='inactive'",`person_id='${other}'`,`user_id='${other}'`]){
        await assert.rejects(db.exec(`update providers set ${patch} where id=1`),/protected profile fields/)
      }
      await db.exec("update persons set display_name='Updated' where id=1")
      await assert.rejects(db.exec("update persons set nic_hash='fake' where id=1"),/protected profile fields/)
      await assert.rejects(db.exec(`update tilers set user_id='${other}' where id=1`),/protected profile fields/)
      await assert.rejects(db.exec('update tilers set is_verified=true where id=1'),/protected profile fields/)
    })
    await t.test('retired claim creation and verification are denied',async()=>{
      await role('authenticated',owner)
      await assert.rejects(db.exec(`insert into claim_requests values(gen_random_uuid(),'${owner}','123456')`),/permission denied/)
      await assert.rejects(db.exec("select verify_claim(gen_random_uuid(),'123456')"),/permission denied/)
      await role('anon')
      await assert.rejects(db.exec("select verify_claim(gen_random_uuid(),'123456')"),/permission denied/)
    })
    await t.test('legacy view is read-only and respects table RLS',async()=>{
      await role('anon')
      await assert.rejects(db.exec('update tiler_profiles set is_verified=true'),/permission denied/)
      await role('service_role')
      const {rows}=await db.query("select reloptions from pg_class where relname='tiler_profiles'")
      assert.ok(rows[0].reloptions.includes('security_invoker=true'))
    })
    await t.test('bids require the authenticated owner and cannot be read by phone matching',async()=>{
      await role('anon')
      await assert.rejects(db.exec(`insert into bids(id,user_id) values(2,'${owner}')`),/row-level security/)
      await role('authenticated',other)
      assert.equal((await db.query('select * from bids')).rows.length,0)
      await assert.rejects(db.exec(`insert into bids(id,user_id) values(2,'${owner}')`),/row-level security/)
      await db.exec(`insert into bids(id,user_id,message) values(2,'${other}','My bid')`)
      await db.exec("update bids set message='Updated bid' where id=2")
      await assert.rejects(db.exec("update bids set job_id=99 where id=2"),/protected profile fields/)
      await assert.rejects(db.exec("update bids set status='accepted' where id=2"),/protected profile fields/)
    })
    await t.test('existing owner/admin uploads succeed; anonymous/forged prefixes fail',async()=>{
      await role('anon')
      await assert.rejects(db.exec("insert into storage.objects values(1,'provider-assets','spam.png')"),/row-level security/)
      await role('authenticated',owner)
      await db.exec(`insert into storage.objects values(2,'provider-assets','portfolio/${owner}-123-a.png')`)
      await assert.rejects(db.exec(`insert into storage.objects values(3,'provider-assets','portfolio/${other}-123-a.png')`),/row-level security/)
      await role('authenticated',owner,true)
      await db.exec("insert into storage.objects values(4,'provider-assets','profiles/manual-prefix.png')")
    })
    await t.test('admin trust changes and server rating projections continue working',async()=>{
      await role('authenticated',owner,true)
      await db.exec("update providers set verification_status='th_verified' where id=1")
      await db.exec("update bids set status='accepted' where id=1")
      await db.exec("insert into blog_posts values(1,'Admin article','published')")
      await role('service_role')
      await db.exec('insert into trusted_reviews values(1)')
      assert.equal(Number((await db.query('select avg_rating from providers where id=1')).rows[0].avg_rating),5)
      await role('anon')
      assert.equal((await db.query('select * from blog_posts')).rows.length,1)
      await assert.rejects(db.exec("insert into blog_posts values(2,'Spam','published')"),/row-level security/)
    })
  } finally {await db.close()}
})
