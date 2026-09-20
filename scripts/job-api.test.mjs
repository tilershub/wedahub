import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
const built = await build({ entryPoints: ['src/pages/api/jobs/index.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'test-server-context', setup(b) {
    b.onLoad({ filter: /supabase\.admin\.ts$/ }, () => ({ contents: 'export const createAdminSupabase = () => globalThis.__jobDb', loader: 'js' }))
    b.onLoad({ filter: /secrets\.ts$/ }, () => ({ contents: "export const serverSecret = locals => locals.testKey", loader: 'js' }))
  }}] })
const api = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`)
const C='11111111-1111-4111-8111-111111111111', P='22222222-2222-4222-8222-222222222222', J='33333333-3333-4333-8333-333333333333'
const locals = (id=C, admin=false) => ({ user: { id, phone_confirmed_at: '2026-09-20' }, testKey:'test-only', supabase:{ rpc: async () => ({ data: admin }) } })
const request = (body={}, origin='https://wedahub.lk') => new Request('https://wedahub.lk/api/jobs',{ method:'POST', headers:{ origin, 'Content-Type':'application/json' }, body:JSON.stringify(body) })
const job={ id:J, customer_id:C, provider_user_id:P, version:1, data:{ status:'invited', events:[], evidence:'private customer evidence', appeal:{reason:'private provider appeal'}, moderation:{reason:'admin-only'} } }
function mock() {
  let saves=0
  const db={ from(table) { const q={select(){return q},order(){return q},range(){return q},limit(){return q},or(){return q},eq(){return q},single:async()=>({data:structuredClone(job)}),then(resolve){return Promise.resolve({data:table==='job_engagements'?[structuredClone(job)]:[]}).then(resolve)}};return q },rpc:async()=>{saves++;return {error:null}} }
  globalThis.__jobDb=db; return ()=>saves
}
test('API rejects unauthenticated, cross-origin and unverified-phone writes',async()=>{
  mock()
  assert.equal((await api.POST({locals:{user:null},request:request()})).status,401)
  assert.equal((await api.POST({locals:locals(),request:request({},'https://attacker.example')})).status,403)
  const unverified=locals();delete unverified.user.phone_confirmed_at
  assert.equal((await api.POST({locals:unverified,request:request({})})).status,403)
})
test('API denies outsider changes and unauthorized moderation before saving',async()=>{
  const saves=mock()
  for(const action of ['accept','approve_review']) {
    const response=await api.POST({locals:locals('44444444-4444-4444-8444-444444444444'),request:request({id:J,version:1,action,reason:'Malicious attempt.'})})
    assert.equal(response.status,403)
  }
  assert.equal(saves(),0)
})
test('API accepts the invited provider and rejects missing configuration',async()=>{
  const saves=mock()
  assert.equal((await api.POST({locals:locals(P),request:request({id:J,version:1,action:'accept'})})).status,200)
  assert.equal(saves(),1)
  const l=locals();delete l.testKey
  assert.equal((await api.GET({locals:l,url:new URL('https://wedahub.lk/api/jobs')})).status,503)
})
test('API redacts each participant’s private evidence and all internal moderation notes',async()=>{
  mock()
  const get=async(id)=> (await api.GET({locals:locals(id),url:new URL('https://wedahub.lk/api/jobs')})).json()
  const customer=await get(C), provider=await get(P)
  assert.equal(customer.jobs[0].data.appeal,undefined)
  assert.equal(provider.jobs[0].data.evidence,undefined)
  assert.equal(customer.jobs[0].data.moderation,undefined)
  assert.equal(provider.jobs[0].data.moderation,undefined)
  assert.equal((await api.GET({locals:locals(),url:new URL('https://wedahub.lk/api/jobs?moderate=1')})).status,403)
})
