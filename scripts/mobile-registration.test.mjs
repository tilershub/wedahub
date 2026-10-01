import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

const compiled = await build({ entryPoints: ['mobile/src/lib/registration.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'registration-client', setup(b) {
    b.onLoad({ filter: /mobile\/src\/lib\/supabase\.ts$/ }, () => ({ loader: 'js', contents: 'export const supabase = {auth: {getUser: () => globalThis.registrationDb.auth.getUser()}, from: (...args) => globalThis.registrationDb.from(...args)}' }))
  } }] })
const { registerProvider } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const fields = { name: 'Test Provider', profession: 'plumber', city: 'Colombo', district: 'Colombo', phone: '0771234567', service: 'Water pipe repair' }
function setup({ user = { id: 'authenticated-user', phone_confirmed_at: '2026-09-28' }, submissions = [], profiles = [] } = {}) {
  const inserted = []
  globalThis.registrationDb = { auth: { getUser: async () => ({ data: { user } }) }, from(table) {
    const q = { select() { return q }, eq() { return q }, is() { return q }, order() { return q },
      limit: async () => ({ data: table === 'providers' ? profiles : submissions }),
      insert: async payload => { inserted.push({ table, payload }); return { error: null } } }
    return q
  } }
  return inserted
}
test('registration requires a phone-confirmed signed-in account', async () => {
  for (const user of [null, { id: 'unverified' }]) {
    const inserted = setup({ user })
    await assert.rejects(registerProvider(fields), /sign_in_required/)
    assert.equal(inserted.length, 0)
  }
})
test('registration preserves pending-review workflow and derives account ownership', async () => {
  const inserted = setup()
  await registerProvider({ ...fields, userId: 'someone-else', status: 'approved' })
  assert.equal(inserted.length, 1)
  assert.equal(inserted[0].table, 'provider_submissions')
  assert.equal(inserted[0].payload.user_id, 'authenticated-user')
  assert.equal(inserted[0].payload.status, 'pending_review')
  assert.equal(inserted[0].payload.whatsapp, '+94771234567')
  assert.equal(inserted[0].payload.provider_type, 'plumber')
})
test('registration does not create another application for an existing or pending profile', async () => {
  for (const options of [{ profiles: [{ id: 'profile' }] }, { submissions: [{ status: 'pending_review' }] }]) {
    const inserted = setup(options)
    await assert.rejects(registerProvider(fields), /registration_exists/)
    assert.equal(inserted.length, 0)
  }
})
test('registration rejects invalid profession, phone and oversized description', async () => {
  const inserted = setup()
  for (const change of [{ profession: 'admin' }, { phone: 'abc' }, { service: 'x'.repeat(1001) }]) {
    await assert.rejects(registerProvider({ ...fields, ...change }))
  }
  assert.equal(inserted.length, 0)
})
