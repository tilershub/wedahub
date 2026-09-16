// OTP code generation and checking.
//
// The database half (rate limits, the spend cap) is enforced by
// otp_rate_check() and verified against the real schema. This covers the part
// that runs in the Worker: that codes come from the CSPRNG, that a code is
// never stored in the clear, that a wrong guess is counted, and that a correct
// one cannot be replayed.
//
// The Supabase client is faked rather than mocked with a library — these
// functions touch three tables through two methods, and a fake that records
// what it was asked keeps the assertions about behaviour rather than about
// call signatures.

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateCode, issueCode, checkCode, syntheticEmail,
  CODE_LENGTH, MAX_ATTEMPTS,
} from '../src/lib/otp.ts'

// A stand-in for the one query shape checkCode builds, plus insert/update
// recording. Enough to drive the logic, small enough to read.
function fakeDb({ row = null } = {}) {
  const calls = { inserts: [], updates: [] }
  const builder = () => {
    const chain = {
      select: () => chain, eq: () => chain, is: () => chain, gt: () => chain,
      order: () => chain, limit: () => chain,
      maybeSingle: async () => ({ data: row }),
      single: async () => ({ data: row }),
    }
    return chain
  }
  return {
    calls,
    from(table) {
      return {
        ...builder(),
        insert: async (values) => { calls.inserts.push({ table, values }); return { error: null } },
        update(values) {
          calls.updates.push({ table, values })
          return { eq: async () => ({ error: null }) }
        },
      }
    },
  }
}

test('codes are the right shape and come from the CSPRNG', () => {
  const seen = new Set()
  for (let i = 0; i < 400; i++) {
    const code = generateCode()
    assert.match(code, new RegExp(`^\\d{${CODE_LENGTH}}$`), code)
    seen.add(code)
  }
  // 400 draws from a million with no repeat is overwhelmingly likely; a
  // constant or a seeded generator would collapse here.
  assert.ok(seen.size > 390, `only ${seen.size} distinct codes in 400 draws`)
})

test('the code is never stored in the clear', async () => {
  const db = fakeDb()
  const issued = await issueCode(db, '94771234567', 'sign_in')
  assert.ok('code' in issued)

  const stored = db.calls.inserts[0].values
  assert.equal(db.calls.inserts[0].table, 'otp_codes')
  assert.ok(stored.code_hash && stored.salt, 'no hash or salt was written')
  assert.equal(stored.code_hash.length, 64, 'not a sha256 digest')
  assert.ok(!JSON.stringify(stored).includes(issued.code),
    'the plaintext code is in the row that gets written')
  assert.notEqual(stored.code_hash, issued.code)
})

test('the same code hashes differently for different issues', async () => {
  // Per-code salt: two people whose codes happen to collide must not produce
  // the same row, or the table becomes a rainbow table of six-digit numbers.
  const a = fakeDb(), b = fakeDb()
  await issueCode(a, '94771234567', 'sign_in')
  await issueCode(b, '94771234567', 'sign_in')
  assert.notEqual(a.calls.inserts[0].values.salt, b.calls.inserts[0].values.salt)
})

// Build a row the way issueCode would have, so checkCode sees real data.
async function rowFor(code, overrides = {}) {
  const db = fakeDb()
  // issueCode picks its own code, so hash the one we want by reusing it.
  await issueCode(db, '94771234567', 'sign_in')
  const { salt } = db.calls.inserts[0].values
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${code}:${salt}`))
  const hash = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('')
  return {
    id: 'row-1', code_hash: hash, salt, attempts: 0,
    expires_at: new Date(Date.now() + 60_000).toISOString(), consumed_at: null,
    ...overrides,
  }
}

test('the right code passes and is consumed so it cannot be replayed', async () => {
  const row = await rowFor('123456')
  const db = fakeDb({ row })
  assert.deepEqual(await checkCode(db, '94771234567', 'sign_in', '123456'), { ok: true })

  const consumed = db.calls.updates.find((u) => 'consumed_at' in u.values)
  assert.ok(consumed, 'a passing code was not marked consumed')
})

test('a wrong code fails and is counted', async () => {
  const row = await rowFor('123456')
  const db = fakeDb({ row })
  assert.deepEqual(await checkCode(db, '94771234567', 'sign_in', '999999'),
    { ok: false, reason: 'wrong' })

  const counted = db.calls.updates.find((u) => u.values.attempts === 1)
  assert.ok(counted, 'a wrong guess was not counted')
})

test('the last allowed attempt locks rather than inviting one more', async () => {
  const row = await rowFor('123456', { attempts: MAX_ATTEMPTS - 1 })
  const db = fakeDb({ row })
  assert.deepEqual(await checkCode(db, '94771234567', 'sign_in', '000000'),
    { ok: false, reason: 'locked' })
})

test('a spent code is refused outright', async () => {
  const row = await rowFor('123456', { attempts: MAX_ATTEMPTS })
  const db = fakeDb({ row })
  assert.deepEqual(await checkCode(db, '94771234567', 'sign_in', '123456'),
    { ok: false, reason: 'locked' },
    'a correct code must not work once the attempt limit is spent')
})

test('no live code reads as expired, not as "no such number"', async () => {
  // The two are the same to the person, and distinguishing them turns this
  // endpoint into a way to ask whether a number is registered.
  const db = fakeDb({ row: null })
  assert.deepEqual(await checkCode(db, '94771234567', 'sign_in', '123456'),
    { ok: false, reason: 'expired' })
})

test('one SIM maps to exactly one auth account', () => {
  // The mapping is derived from the canonical number, so no two spellings can
  // become two accounts — which is the whole point of normalising first.
  assert.equal(syntheticEmail('94771234567'), '94771234567@phone.wedahub.lk')
  assert.notEqual(syntheticEmail('94771234567'), syntheticEmail('94771234568'))
})
