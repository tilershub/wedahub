// The one place a Sri Lankan phone number becomes canonical.
//
// Auth, import, claim matching and search all have to agree on what "the same
// number" means, or half the claim matches silently fail — the same man's
// 0771234567 and +94 77 123 4567 would land as two different people. Every
// write of a number goes through normalizeLkPhone first, and the database
// enforces it again in normalize_lk_phone() so nothing can get in behind us.
//
// Canonical form is E.164 without the plus: 94771234567. That is also exactly
// what the Text.lk API wants as `recipient`, so nothing reformats on the way
// out.
//
// This file is mirrored by supabase/migrations/0001_phone_normalise.sql and
// both are asserted against the same corpus in scripts/phone.test.mjs. Change
// one and the test fails until you change the other.

const CC = '94'

// Sri Lankan national significant numbers are 9 digits and never start with 0:
// mobiles are 7X, fixed lines are area codes 11, 21, 31, 81 and so on.
const NSN = /^[1-9]\d{8}$/

/**
 * Reduce any way a Sri Lankan number might be typed to one canonical string.
 *
 *   0771234567, +94 77 123 4567, 077-1234567, 94771234567, 771234567
 *     → '94771234567'
 *
 * Returns null when the input cannot be read as a Sri Lankan number, so callers
 * reject it rather than storing something unmatchable. Never throws.
 */
export function normalizeLkPhone(input) {
  if (input === null || input === undefined) return null
  let digits = String(input).replace(/\D/g, '')
  if (!digits) return null

  // 00 is the international access prefix: 0094771234567.
  if (digits.startsWith('00')) digits = digits.slice(2)

  let nsn
  if (digits.length === 9) {
    // Bare national number, as people write it when the form says "+94".
    nsn = digits
  } else if (digits.length === 10 && digits.startsWith('0')) {
    // Trunk form — how almost everyone writes it locally.
    nsn = digits.slice(1)
  } else if (digits.length === 11 && digits.startsWith(CC)) {
    nsn = digits.slice(2)
  } else {
    // Anything else is a typo, a foreign number, or a landline written with
    // the area code twice. Guessing at it is how wrong people get merged.
    return null
  }

  return NSN.test(nsn) ? CC + nsn : null
}

/**
 * True when the number can receive an SMS. OTP and claim invites must not be
 * sent to a fixed line: the gateway accepts it, bills for it, and the code
 * never arrives.
 */
export function isLkMobile(input) {
  const e164 = normalizeLkPhone(input)
  return e164 !== null && e164[2] === '7'
}

/**
 * 94771234567 → 077 123 4567, for display back to the person who typed it.
 * Anything unparseable is returned untouched rather than mangled.
 */
export function formatLkPhone(input) {
  const e164 = normalizeLkPhone(input)
  if (!e164) return String(input ?? '')
  const n = e164.slice(2)
  return `0${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`
}

/**
 * Mask for anywhere a number is shown to someone who should not have it in
 * full — "is this you?" prompts, support screens, the admin merge view.
 *
 *   94771234567 → 077 ••• 4567
 */
export function maskLkPhone(input) {
  const e164 = normalizeLkPhone(input)
  if (!e164) return '•••'
  const n = e164.slice(2)
  return `0${n.slice(0, 2)} ••• ${n.slice(5)}`
}
