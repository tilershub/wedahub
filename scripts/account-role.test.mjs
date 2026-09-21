import test from 'node:test'
import assert from 'node:assert/strict'
import { accountRole } from '../src/lib/account-role.js'

function db(provider = [], submissions = [], error = null) {
  return { from(table) {
    const query = { select: () => query, eq: () => query, order: () => query,
      limit: () => Promise.resolve({ data: table === 'providers' ? provider : submissions, error }) }
    return query
  } }
}
test('guests and homeowners use customer navigation', async () => {
  assert.equal(await accountRole(null, null), 'client')
  assert.equal(await accountRole(db(), { id: 'customer' }), 'client')
})
test('listed and pending providers use provider navigation', async () => {
  assert.equal(await accountRole(db([{ id: 'profile' }]), { id: 'provider' }), 'provider')
  for (const status of ['pending_review', 'approved', 'listed']) {
    assert.equal(await accountRole(db([], [{ status }]), { id: 'provider' }), 'provider')
  }
  assert.equal(await accountRole(db([], [{ status: 'rejected' }]), { id: 'customer' }), 'client')
})
test('failed role lookup does not silently grant customer UI', async () => {
  await assert.rejects(accountRole(db([], [], { message: 'unavailable' }), { id: 'user' }))
})
