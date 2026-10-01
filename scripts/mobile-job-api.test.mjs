import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

const compiled=await build({entryPoints:['src/pages/api/mobile/jobs.ts'],bundle:true,platform:'node',format:'esm',write:false,
  plugins:[{name:'mobile-auth-test',setup(b){
    b.onLoad({filter:/supabase\.server\.ts$/},()=>({loader:'js',contents:'export const createSupabaseBearerClient = token => globalThis.__mobileClient(token)'}))
    b.onLoad({filter:/supabase\.admin\.ts$/},()=>({loader:'js',contents:'export const createAdminSupabase = () => globalThis.__jobDb'}))
    b.onLoad({filter:/secrets\.ts$/},()=>({loader:'js',contents:"export const serverSecret = () => 'test-only'"}))
  }}]})
const api=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const customer='11111111-1111-4111-8111-111111111111',provider='22222222-2222-4222-8222-222222222222',jobId='33333333-3333-4333-8333-333333333333'
function setup(){
  const verified=[];let saved=0
  globalThis.__mobileClient=token=>({
    auth:{getUser:async explicit=>{verified.push([token,explicit]);return token==='provider-token'?{data:{user:{id:provider,phone_confirmed_at:'2026-09-27'}}}:{data:{user:null},error:{message:'invalid'}}}},
    rpc:async()=>({data:false}),
  })
  globalThis.__jobDb={from(){const q={select(){return q},eq(){return q},single:async()=>({data:{id:jobId,customer_id:customer,provider_user_id:provider,version:1,data:{status:'invited',events:[]}}})};return q},rpc:async()=>{saved++;return {error:null}}}
  return {verified,saved:()=>saved}
}
function request(token,body={id:jobId,version:1,action:'accept'}){
  const headers={'content-type':'application/json',cookie:'fake-session=customer','x-user-id':customer}
  if(token!==undefined)headers.authorization=token
  return {request:new Request('https://wedahub.lk/api/mobile/jobs',{method:'POST',headers,body:JSON.stringify(body)}),locals:{user:{id:customer},apiAuth:'bearer'},url:new URL('https://wedahub.lk/api/mobile/jobs')}
}
test('mobile endpoint ignores cookies and rejects missing/malformed/invalid bearer tokens',async()=>{
  const state=setup()
  for(const token of [undefined,'Basic abc','Bearer a b','Bearer foreign-project-token','Bearer expired-token']){
    assert.equal((await api.POST(request(token))).status,401)
  }
  assert.equal(state.saved(),0)
})
test('mobile endpoint verifies explicit token, uses its actor and reuses job transition rules',async()=>{
  const state=setup()
  assert.equal((await api.POST(request('Bearer provider-token'))).status,200)
  assert.deepEqual(state.verified,[['provider-token','provider-token']])
  assert.equal(state.saved(),1)
  // Supplying customer identity in body/locals cannot grant a customer-only action.
  assert.equal((await api.POST(request('Bearer provider-token',{id:jobId,version:1,action:'review',user_id:customer,rating:5}))).status,403)
  assert.equal(state.saved(),1)
})
test('GET also requires explicit valid bearer authorization',async()=>{
  setup()
  const ctx=request(undefined)
  assert.equal((await api.GET(ctx)).status,401)
})

test('Safari preflight allows the app origin without accepting cookies or arbitrary origins',async()=>{
  const origin='https://wedahub--safari-preview.expo.app'
  const preflight=value=>({request:new Request('https://wedahub.lk/api/mobile/jobs',{method:'OPTIONS',headers:{origin:value,'access-control-request-method':'POST','access-control-request-headers':'authorization, content-type'}})})
  const allowed=await api.OPTIONS(preflight(origin))
  assert.equal(allowed.status,204)
  assert.equal(allowed.headers.get('access-control-allow-origin'),origin)
  assert.equal(allowed.headers.get('access-control-allow-credentials'),null)
  assert.equal((await api.OPTIONS(preflight('https://untrusted.example'))).status,403)
})

test('browser CORS responses retain bearer authorization and reject foreign origins before a write',async()=>{
  const state=setup(),ctx=request('Bearer provider-token')
  ctx.request.headers.set('origin','https://wedahub--safari-preview.expo.app')
  const response=await api.POST(ctx)
  assert.equal(response.status,200)
  assert.equal(response.headers.get('access-control-allow-origin'),'https://wedahub--safari-preview.expo.app')
  const invalid=request(undefined)
  invalid.request.headers.set('origin','https://wedahub--safari-preview.expo.app')
  assert.equal((await api.POST(invalid)).status,401)
  const foreign=request('Bearer provider-token')
  foreign.request.headers.set('origin','https://untrusted.example')
  assert.equal((await api.POST(foreign)).status,403)
  assert.equal(state.saved(),1)
})
