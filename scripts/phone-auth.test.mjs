import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { normalizeMobile, requestPhoneCode, verifyPhoneCode } from '../src/lib/phone-auth.js'
import { handleSmsHook, verifySmsHook } from '../src/lib/textlk-sms.js'

const key = Buffer.alloc(32, 19)
const secret = 'v1,whsec_' + key.toString('base64')
const config = { secret, apiKey: 'test-key', senderId: 'WedaHUB' }
const event = { user: { phone: '94771234567' }, sms: { otp: '123456' } }
function signed(payload = event, age = 0) {
  const body = JSON.stringify(payload)
  const timestamp = String(Math.floor(Date.now()/1000) + age)
  const signature = createHmac('sha256', key).update(`test-id.${timestamp}.${body}`).digest('base64')
  const headers = { 'webhook-id': 'test-id', 'webhook-timestamp': timestamp, 'webhook-signature': `v1,${signature}` }
  return new Request('https://wedahub.lk/api/auth/send-sms', { method: 'POST', body, headers })
}
for (const input of ['0771234567', '077 123 4567', '+94 (77) 123-4567', '94771234567', '771234567']) {
  test(`normalizes ${input}`, () => assert.equal(normalizeMobile(input), '+94771234567'))
}
for (const input of ['+44771234567', '0112345678', '947712345678', '', '0771234567,0777654321', 'abc0771234567', '++94771234567']) {
  test(`rejects invalid recipient ${input}`, () => assert.throws(() => normalizeMobile(input)))
}
test('login delegates issuance to Supabase with CAPTCHA', async () => {
  const client = { auth: { signInWithOtp: async args => { assert.deepEqual(args, { phone: '+94771234567', options: { channel: 'sms', captchaToken: 'captcha' } }); return {} } } }
  assert.equal(await requestPhoneCode(client, '0771234567', { captchaToken: 'captcha' }), '+94771234567')
})
test('linking updates current account instead of creating a new user', async () => {
  const client = { auth: { updateUser: async args => { assert.deepEqual(args, { phone: '+94771234567' }); return {} } } }
  await requestPhoneCode(client, '0771234567', { link: true })
})
test('verification uses SMS or phone_change and propagates invalid/expired codes', async () => {
  for (const link of [true, false]) {
    const client = { auth: { verifyOtp: async args => { assert.equal(args.type, link ? 'phone_change' : 'sms'); return { data: { user: { id: 'same-user' } } } } } }
    assert.equal((await verifyPhoneCode(client, '0771234567', '012345', { link })).user.id, 'same-user')
    await assert.rejects(verifyPhoneCode(client, '0771234567', '12345'))
  }
  await assert.rejects(verifyPhoneCode({ auth: { verifyOtp: async () => ({ error: new Error('expired') }) } }, '0771234567', '123456'), /expired/)
})
test('valid webhook sends one plain SMS with server-side bearer token', async () => {
  let calls = 0
  const response = await handleSmsHook(signed(), config, async (url, init) => {
    calls++; assert.equal(url, 'https://app.text.lk/api/v3/sms/send')
    assert.equal(init.headers.Authorization, 'Bearer test-key')
    assert.deepEqual(JSON.parse(init.body), { recipient: '94771234567', sender_id: 'WedaHUB', type: 'plain', message: 'WedaHUB: Your verification code is 123456. Do not share this code with anyone.' })
    return Response.json({ status: 'success' })
  })
  assert.equal(response.status, 200); assert.equal(calls, 1)
})
test('phone change uses the explicit SMS recipient instead of the old account phone', async () => {
  const request = signed({ user: { phone: '94770000000' }, sms: { phone: '94771234567', otp: '123456' } })
  const result = await handleSmsHook(request, config, async (_, init) => {
    assert.equal(JSON.parse(init.body).recipient, '94771234567'); return Response.json({ status: 'success' })
  })
  assert.equal(result.status, 200)
})
test('forged, altered, expired and future webhooks cannot send SMS', async () => {
  const altered = signed(); const headers = altered.headers
  for (const request of [signed(event, -601), signed(event, 601), new Request(altered.url, { method: 'POST', body: '{}', headers }), new Request(altered.url, { method: 'POST', body: JSON.stringify(event) })]) {
    const result = await handleSmsHook(request, config, () => assert.fail('must not send'))
    assert.equal(result.status, 401)
  }
})
test('supports rotating signatures', async () => {
  const request = signed(); const body = await request.text()
  request.headers.set('webhook-signature', 'v1,bad v2,ignored '+request.headers.get('webhook-signature'))
  assert.equal(await verifySmsHook(body, request.headers, secret), true)
})
test('malformed signed payload and foreign numbers fail closed', async () => {
  for (const payload of [{}, { user: { phone: '+44771234567' }, sms: { otp: '123456' } }, { ...event, sms: { otp: 'hi' } }]) {
    assert.equal((await handleSmsHook(signed(payload), config, () => assert.fail())).status, 400)
  }
})
test('provider HTTP errors, error bodies and timeouts are not success', async () => {
  for (const fetcher of [async () => Response.json({ status: 'error', message: 'private-provider-detail' }), async () => new Response('bad', { status: 500 }), async () => { throw new Error('private timeout') }]) {
    const response = await handleSmsHook(signed(), config, fetcher)
    assert.equal(response.status, 502)
    assert.doesNotMatch(await response.text(), /private|123456|test-key/)
  }
})
test('missing configuration and demo sender do not send', async () => {
  for (const cfg of [{}, { ...config, senderId: 'TextLKDemo' }]) assert.equal((await handleSmsHook(signed(), cfg, () => assert.fail())).status, 503)
})
