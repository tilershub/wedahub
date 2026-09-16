// Phone normalisation, asserted twice: once against src/lib/phone.js and once
// against the database's normalize_lk_phone(). They are separate
// implementations of the same rules, and if they ever disagree, claim matching
// silently half-works — a provider signs in with the second SIM and the app
// creates a duplicate instead of finding them. So the corpus is shared and
// both copies have to pass it.
//
// The database half needs network. It is skipped, loudly, when the REST API is
// unreachable, so a network blip cannot turn into a red build — the JS half
// still runs and still gates.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeLkPhone, isLkMobile, formatLkPhone, maskLkPhone } from '../src/lib/phone.js'

// [input, expected] — expected null means "must be rejected".
const CORPUS = [
  // The four spellings the brief names. All one record.
  ['0771234567',      '94771234567'],
  ['+94 77 123 4567', '94771234567'],
  ['077-1234567',     '94771234567'],
  ['94771234567',     '94771234567'],

  // The same number through every other keyboard people actually use.
  ['+94771234567',    '94771234567'],
  ['0094771234567',   '94771234567'],
  ['771234567',       '94771234567'],
  ['077 123 4567',    '94771234567'],
  ['(077) 123-4567',  '94771234567'],
  ['  0771234567  ',  '94771234567'],
  ['077/1234567',     '94771234567'],
  ['0 7 7 1 2 3 4 5 6 7', '94771234567'],
  ['tel:+94771234567', '94771234567'],

  // Fixed lines are valid numbers — they just cannot receive an OTP.
  ['0112345678',      '94112345678'],
  ['+94 11 234 5678', '94112345678'],
  ['0812345678',      '94812345678'],

  // Every mobile prefix in service.
  ['0701234567', '94701234567'],
  ['0711234567', '94711234567'],
  ['0721234567', '94721234567'],
  ['0741234567', '94741234567'],
  ['0751234567', '94751234567'],
  ['0761234567', '94761234567'],
  ['0781234567', '94781234567'],

  // Rejected. Storing any of these gives you a row nothing will ever match.
  [null,               null],
  [undefined,          null],
  ['',                 null],
  ['   ',              null],
  ['abc',              null],
  ['-',                null],
  ['12345',            null],   // too short
  ['077123456',        null],   // 9 digits but a trunk 0 — one short
  ['07712345678',      null],   // 11 digits starting 0 — one long
  ['9477123456',       null],   // 94 + 8 digits
  ['947712345678',     null],   // 94 + 10 digits
  ['0771234567890',    null],   // far too long
  ['011234567',        null],   // 9 digits starting 0
  ['+1 415 555 2671',  null],   // not Sri Lankan
  ['+447911123456',    null],   // not Sri Lankan
  ['000000000',        null],   // 9 digits, leading zero
]

test('the JS normaliser agrees with the corpus', () => {
  for (const [input, expected] of CORPUS) {
    assert.equal(normalizeLkPhone(input), expected,
      `normalizeLkPhone(${JSON.stringify(input)})`)
  }
})

test('normalising is idempotent', () => {
  for (const [, expected] of CORPUS) {
    if (expected) assert.equal(normalizeLkPhone(expected), expected)
  }
})

test('every spelling of one number collapses to one record', () => {
  const spellings = CORPUS.filter(([, e]) => e === '94771234567').map(([i]) => i)
  const distinct = new Set(spellings.map(normalizeLkPhone))
  assert.equal(distinct.size, 1, `got ${distinct.size} records for one number`)
  assert.ok(spellings.length >= 4)
})

test('a number never becomes a different valid number', () => {
  // A rejection is safe; a wrong answer is not. Nothing invalid may normalise
  // onto a real subscriber's line.
  for (const [input, expected] of CORPUS) {
    if (expected === null) assert.equal(normalizeLkPhone(input), null,
      `${JSON.stringify(input)} must be rejected, not reshaped`)
  }
})

test('only mobiles can receive an OTP', () => {
  assert.ok(isLkMobile('0771234567'))
  assert.ok(isLkMobile('+94 70 123 4567'))
  assert.ok(!isLkMobile('0112345678'), 'a Colombo fixed line cannot receive SMS')
  assert.ok(!isLkMobile('0812345678'), 'a Kandy fixed line cannot receive SMS')
  assert.ok(!isLkMobile('rubbish'))
})

test('display helpers round-trip and never leak a full number when masking', () => {
  assert.equal(formatLkPhone('94771234567'), '077 123 4567')
  assert.equal(normalizeLkPhone(formatLkPhone('94771234567')), '94771234567')
  assert.equal(formatLkPhone('nonsense'), 'nonsense')

  const masked = maskLkPhone('94771234567')
  assert.equal(masked, '077 ••• 4567')
  assert.ok(!masked.includes('123'), 'the masked middle is still showing')
  assert.equal(maskLkPhone('nonsense'), '•••')
})

// ── the database copy ────────────────────────────────────────────────────────

const REST_URL = process.env.SUPABASE_URL || 'https://ginrgwaciblcvxvkbeyd.supabase.co'
const KEY = process.env.SUPABASE_ANON_KEY || readAnonKeyFromSource()

function readAnonKeyFromSource() {
  return readFileSync(new URL('../src/lib/supabase.js', import.meta.url), 'utf8')
    .match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)?.[1]
}

async function rpc(input) {
  const res = await fetch(`${REST_URL}/rest/v1/rpc/normalize_lk_phone`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

test('the SQL normaliser agrees with the JS one', async (t) => {
  try {
    // strict, so it returns NULL for NULL without being called.
    await rpc('0771234567')
  } catch (err) {
    t.skip(`normalize_lk_phone() not reachable (${err.message.slice(0, 80)}) — ` +
           'migration 0001 may not be applied yet')
    return
  }
  for (const [input, expected] of CORPUS) {
    if (input === undefined) continue     // not expressible over JSON
    assert.equal(await rpc(input), expected,
      `normalize_lk_phone(${JSON.stringify(input)}) disagrees with phone.js`)
  }
})
