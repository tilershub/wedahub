// OTP issue and check, and turning a verified number into a Supabase session.
//
// Server-only. Everything here runs with the service role, because the tables
// it touches have no client policy at all — that is what makes "the code never
// reaches the browser" true rather than merely intended.
//
// Codes are stored as sha256(code + per-code salt). A database leak should not
// hand anyone a live code, and nothing ever needs to read one back: checking a
// code hashes the attempt and compares.

import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeLkPhone } from './phone.js'

export const CODE_LENGTH = 6
export const CODE_TTL_MINUTES = 10
/** Wrong guesses allowed against one code before it is dead. */
export const MAX_ATTEMPTS = 5

export type OtpPurpose = 'sign_in' | 'add_number' | 'claim_verify'

/** Six digits from the CSPRNG. Math.random() is not acceptable for a credential. */
export function generateCode(length = CODE_LENGTH): string {
  const digits = new Uint32Array(length)
  crypto.getRandomValues(digits)
  // Modulo bias over 10 buckets in a 2^32 range is immaterial here, and the
  // alternative (rejection sampling) buys nothing against a 5-attempt limit.
  return Array.from(digits, (d) => String(d % 10)).join('')
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${code}:${salt}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Compare two hex digests without leaking where they diverge.
 *
 * The attempt limit already makes timing analysis academic, but a constant
 * time compare costs nothing and removes the question.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Record a new code for this number and return the plaintext exactly once, for
 * the caller to hand to the SMS gateway. It is never stored and never returned
 * to a browser.
 */
export async function issueCode(
  db: SupabaseClient,
  e164: string,
  purpose: OtpPurpose,
): Promise<{ code: string } | { error: string }> {
  const code = generateCode()
  const salt = randomSalt()
  const codeHash = await hashCode(code, salt)

  const { error } = await db.from('otp_codes').insert({
    e164,
    code_hash: codeHash,
    salt,
    purpose,
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
  })
  if (error) return { error: error.message }
  return { code }
}

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'locked' | 'wrong' }

/**
 * Check an attempt against the most recent live code for this number.
 *
 * Consumes the code on success so it cannot be replayed, and counts the
 * attempt on failure so a six-digit space cannot be walked.
 */
export async function checkCode(
  db: SupabaseClient,
  e164: string,
  purpose: OtpPurpose,
  attempt: string,
): Promise<CheckResult> {
  const { data: row } = await db
    .from('otp_codes')
    .select('id, code_hash, salt, attempts, expires_at, consumed_at')
    .eq('e164', e164)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // No live code is reported as expired rather than "no code was ever sent":
  // the two are the same to the person, and distinguishing them would confirm
  // to a stranger whether a number is in use.
  if (!row) return { ok: false, reason: 'expired' }
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' }

  const expected = await hashCode(attempt, row.salt)
  if (!safeEqual(expected, row.code_hash)) {
    await db.from('otp_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id)
    return { ok: false, reason: row.attempts + 1 >= MAX_ATTEMPTS ? 'locked' : 'wrong' }
  }

  await db.from('otp_codes').update({ consumed_at: new Date().toISOString() }).eq('id', row.id)
  return { ok: true }
}

/**
 * The auth account for a SIM.
 *
 * Supabase's own phone auth wants Supabase to send the SMS. We send it through
 * Text.lk, so the number is mapped to a synthetic address in a domain that
 * receives no mail and the account is an email account underneath. The mapping
 * is derived from the canonical number, so one SIM is always one account, and
 * no two spellings of a number can become two accounts.
 */
export function syntheticEmail(e164: string): string {
  return `${e164}@phone.wedahub.lk`
}

/**
 * Mint a one-time token the browser exchanges for a session.
 *
 * generateLink creates the user if it does not exist and sends nothing — it
 * only returns the token. The browser then calls
 * supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }), which is what
 * actually writes the session cookie.
 *
 * The token is a bearer credential with a short life. It is only ever issued
 * after our own OTP check has passed.
 */
export async function issueSessionToken(
  admin: SupabaseClient,
  e164: string,
): Promise<{ tokenHash: string; userId: string } | { error: string }> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: syntheticEmail(e164),
  })
  if (error || !data?.properties?.hashed_token) {
    return { error: error?.message || 'could not create a session' }
  }
  return { tokenHash: data.properties.hashed_token, userId: data.user?.id ?? '' }
}
