import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
const migration = readdirSync('supabase/migrations').find(name => name.endsWith('_hierarchical_provider_skills.sql'))
const owner = '11111111-1111-4111-8111-111111111111'
const stranger = '22222222-2222-4222-8222-222222222222'
const admin = '33333333-3333-4333-8333-333333333333'
const active = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const pending = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

test('skills migration preserves legacy fields and enforces actor boundaries', async t => {
  const db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create function public.is_admin() returns boolean language sql stable as $$ select auth.uid() = '${admin}'::uuid $$;
    create table public.providers(id uuid primary key, user_id uuid, status text, merged_into uuid, services text[]);
    insert into public.providers values ('${active}','${owner}','active',null,array['legacy tiling']),('${pending}','${owner}','pending_review',null,array['legacy chef']);
    alter table public.providers enable row level security;
    grant select on public.providers to anon,authenticated;
    create policy visible on public.providers for select using (status='active' or user_id=auth.uid() or is_admin());
  `)
  await db.exec(readFileSync(`supabase/migrations/${migration}`, 'utf8'))
  const as = async (role, id = '') => { await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub','${id}',false);`) }
  const denied = async sql => assert.rejects(db.exec(sql), /permission denied|row-level security|check constraint|foreign key/)
  try {
    await t.test('anonymous catalogue reads work, anonymous writes fail', async () => {
      await as('anon')
      assert.equal((await db.query('select * from public.skills')).rows.length,21)
      await denied(`insert into public.provider_skills(provider_id,skill_id) values ('${active}','construction.tiling')`)
    })
    await t.test('owners can manage skills on multiple profiles, never taxonomy or timestamps', async () => {
      await as('authenticated',owner)
      await db.exec(`insert into public.provider_skills(provider_id,skill_id) values ('${active}','construction.tiling'),('${pending}','hospitality.chef')`)
      assert.equal((await db.query('select * from public.provider_skills')).rows.length,2)
      assert.equal((await db.query("update public.skills set name_en='Unapproved' where id='construction' returning *")).rows.length,0)
      await denied(`insert into public.provider_skills(provider_id,skill_id,created_at) values ('${active}','construction.plumbing','2000-01-01')`)
      await denied(`insert into public.provider_skills(provider_id,skill_id) values ('${active}','construction')`)
      await denied(`update public.provider_skills set provider_id='${pending}'`)
    })
    await t.test('other users see only public evidence and cannot modify another provider', async () => {
      await as('authenticated',stranger)
      assert.equal((await db.query('select * from public.provider_skills')).rows.length,1)
      await denied(`insert into public.provider_skills(provider_id,skill_id) values ('${active}','construction.plumbing')`)
      assert.equal((await db.query(`delete from public.provider_skills where provider_id='${active}' returning *`)).rows.length,0)
      await as('anon')
      assert.equal((await db.query('select * from public.provider_skills')).rows.length,1)
    })
    await t.test('admins retire skills; retired skills cannot be newly selected', async () => {
      await as('authenticated',admin)
      await db.exec("update public.skills set active=false where id='construction.plumbing'")
      await as('authenticated',owner)
      await denied(`insert into public.provider_skills(provider_id,skill_id) values ('${active}','construction.plumbing')`)
      await db.exec(`delete from public.provider_skills where provider_id='${pending}'`)
    })
    await t.test('hierarchy cannot contain missing parents or cycles', async () => {
      await as('authenticated',admin)
      await denied("update public.skills set parent_id='construction.tiling' where id='construction'")
      await denied("update public.skills set parent_id=null where id='construction.tiling'")
      await denied("insert into public.skills(id,parent_id,name_en,name_si,name_ta) values ('unknown.child','unknown','a','a','a')")
    })
    await t.test('legacy services and owner identity remain unchanged', async () => {
      await as('postgres')
      const {rows} = await db.query(`select services,user_id from public.providers where id='${active}'`)
      assert.deepEqual(rows[0],{services:['legacy tiling'],user_id:owner})
      const grants = await db.query("select has_table_privilege('authenticated','public.provider_skills','TRUNCATE') as truncate,has_table_privilege('anon','public.skills','INSERT') as insert")
      assert.deepEqual(grants.rows[0],{truncate:false,insert:false})
    })
  } finally { await db.close() }
})
