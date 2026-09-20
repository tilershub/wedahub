import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const C='11111111-1111-4111-8111-111111111111', P='22222222-2222-4222-8222-222222222222', X='33333333-3333-4333-8333-333333333333'
const PROJECT='44444444-4444-4444-8444-444444444444', PROVIDER='55555555-5555-4555-8555-555555555555'
test('migration permissions, atomic projections, consent and concurrency in PostgreSQL', async t => {
  const db = new PGlite()
  try {
    await db.exec(await readFile(new URL('./fixtures/job-schema.sql', import.meta.url), 'utf8'))
    await db.exec(await readFile(new URL('../supabase/migrations/20260920085146_job_confirmed_reviews.sql', import.meta.url), 'utf8'))
    await db.query('insert into auth.users values ($1),($2),($3)',[C,P,X])
    await db.query("insert into projects(id,user_id,status) values($1,$2,'active')",[PROJECT,C])
    await db.query("insert into providers(id,user_id,status,claim_status) values($1,$2,'active','claimed')",[PROVIDER,P])
    const { rows: [job] } = await db.query('insert into job_engagements(project_id,provider_id,customer_id,provider_user_id,data) values($1,$2,$3,$4,$5) returning *',[PROJECT,PROVIDER,C,P,{ status:'accepted' }])
    const role = async (name, id = '') => { await db.exec(`reset role; set role ${name}`); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]) }
    await t.test('anonymous direct reviews and private job reads are denied',async () => {
      await role('anon')
      await assert.rejects(db.exec("insert into reviews(reviewer_name,rating) values('Fake',5)"), /row-level security/)
      await assert.rejects(db.exec('select * from job_engagements'), /permission denied/)
      await assert.rejects(db.query('select save_job_engagement($1,1,$2)',[job.id,{}]), /permission denied/)
    })
    await t.test('authenticated direct reviews and unauthorized ownership changes fail',async () => {
      await role('authenticated',X)
      await assert.rejects(db.exec("insert into reviews(reviewer_name,rating) values('Fake',5)"), /row-level security/)
      assert.equal((await db.query("update projects set user_id=$1 where id=$2 returning id",[X,PROJECT])).rows.length,0)
      assert.equal((await db.query('delete from projects where id=$1 returning id',[PROJECT])).rows.length,0)
      await role('authenticated',P)
      await assert.rejects(db.query('update providers set user_id=$1 where id=$2',[X,PROVIDER]), /row-level security/)
      await assert.rejects(db.query('select save_job_engagement($1,1,$2)',[job.id,{}]), /permission denied/)
    })
    await t.test('unowned draft tokens stay private and cannot impersonate a customer',async () => {
      await role('anon')
      await db.exec("insert into projects(id,session_token,status) values('66666666-6666-4666-8666-666666666666','private-draft-token','pending_review')")
      assert.equal((await db.query("select * from projects where session_token='private-draft-token'")).rows.length,0)
      await assert.rejects(db.query("insert into projects(id,user_id,status) values(gen_random_uuid(),$1,'active')",[C]), /row-level security/)
    })
    let version = 1
    const next = { status:'completion_requested', title:'Kitchen work', review: { reviewer_name:'Customer', rating:2, comment:'Work left unfinished.', status:'published', confirmed_job:true, created_at:'2026-09-20T10:00:00Z' } }
    const save = async () => { await role('service_role'); await db.query('select save_job_engagement($1,$2,$3)',[job.id,version,next]); version++ }
    await t.test('server atomically saves one public review and rejects stale writes', async () => {
      await save()
      await assert.rejects(db.query('select save_job_engagement($1,1,$2)',[job.id,next]),/version conflict/)
      next.review.rating=3; await save()
      const { rows } = await db.exec('select rating from reviews').then(r=>r[0]); assert.equal(rows.length,1); assert.equal(rows[0].rating,3)
      const profile=(await db.query('select avg_rating,review_count from providers where id=$1',[PROVIDER])).rows[0]; assert.equal(Number(profile.avg_rating),3); assert.equal(profile.review_count,1)
    })
    await t.test('pending and hidden reviews are not public and cannot be directly edited',async () => {
      for (const status of ['pending','hidden']) {
        next.review.status=status; await save(); assert.equal((await db.query('select review_count from providers where id=$1',[PROVIDER])).rows[0].review_count,0); await role('anon')
        assert.equal((await db.query('select * from reviews')).rows.length,0)
      }
      next.review.status='published'; await save(); await role('authenticated',C)
      assert.equal((await db.query("update reviews set rating=5 returning id")).rows.length,0)
      assert.equal((await db.query('delete from reviews returning id')).rows.length,0)
    })
    await t.test('only exact approved completed-job photos become public and revocation removes them',async () => {
      next.status='completed'; next.portfolio={ caption:'Kitchen', photos:['https://example.com/1.jpg'], consent:'pending', decided_at:'2026-09-20T10:00:00Z' }
      await save(); await role('anon'); assert.equal((await db.query('select * from job_portfolio')).rows.length,0)
      next.portfolio.consent='granted'; await save(); await role('anon'); assert.equal((await db.query('select * from job_portfolio')).rows.length,1)
      next.portfolio.consent='denied'; await save(); await role('anon'); assert.equal((await db.query('select * from job_portfolio')).rows.length,0)
    })
    await t.test('database rejects duplicate engagements and self-engagements',async () => {
      await role('service_role')
      await assert.rejects(db.query('insert into job_engagements(project_id,provider_id,customer_id,provider_user_id,data) values($1,$2,$3,$4,$5)',[PROJECT,PROVIDER,C,P,{}]),/unique constraint/)
      await assert.rejects(db.query('insert into job_engagements(project_id,provider_id,customer_id,provider_user_id,data) values($1,$2,$3,$3,$4)',[PROJECT,PROVIDER,C,{}]),/check constraint/)
    })
  } finally { await db.close() }
})
