// Check an OTP, and turn a verified SIM into an account.
//
// §3 collapses claiming into signing in, so this is where identity is decided:
//
//   known number        → sign in to that person
//   unknown number, but an unclaimed listing carries it
//                       → sign in, and offer the listing to claim
//   unknown, no listing → sign in as somebody new
//
// Verifying always produces a session. Owning the SIM is what an account is;
// whether a listing belongs to you is a separate, consented step (/api/auth/claim),
// because the import data is not evidence about who is holding the phone today.
//
// The person and phone_numbers rows are written here and nowhere else — this is
// the only place in the codebase that knows a number has actually been proven.

export const prerender = false

import type { APIRoute } from 'astro'
import { normalizeLkPhone } from '../../../../lib/phone.js'
import { serverSecret } from '../../../../lib/secrets'
import { createAdminSupabase } from '../../../../lib/supabase.admin'
import { checkCode, issueSessionToken, type OtpPurpose } from '../../../../lib/otp'

const PURPOSES: OtpPurpose[] = ['sign_in', 'add_number', 'claim_verify']

export const POST: APIRoute = async ({ request, locals }) => {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  const e164 = normalizeLkPhone(body.phone as string)
  const code = String(body.code ?? '').replace(/\D/g, '')
  if (!e164) return json({ error: 'invalidNumber' }, 400)
  if (!code) return json({ error: 'codeWrong' }, 400)

  const purpose = (PURPOSES.includes(body.purpose as OtpPurpose)
    ? body.purpose : 'sign_in') as OtpPurpose

  const serviceKey = serverSecret(locals, 'SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceKey) {
    console.error('[otp] SUPABASE_SERVICE_ROLE_KEY is not set')
    return json({ error: 'somethingWrong' }, 503)
  }
  const admin = createAdminSupabase(serviceKey)

  const check = await checkCode(admin, e164, purpose, code)
  if (!check.ok) {
    const key = { expired: 'codeExpired', locked: 'tooManyThisHour', wrong: 'codeWrong' }[check.reason]
    return json({ error: key }, 400)
  }

  const session = await issueSessionToken(admin, e164)
  if ('error' in session) {
    console.error('[otp] session mint failed:', session.error)
    return json({ error: 'somethingWrong' }, 500)
  }

  // ── the person behind the SIM ──────────────────────────────────────────────

  const { data: existingNumber } = await admin
    .from('phone_numbers')
    .select('person_id')
    .eq('e164', e164)
    .maybeSingle()

  let personId = existingNumber?.person_id ?? null

  if (!personId) {
    // The auth user may already exist from a different SIM of the same person,
    // in which case that person owns this new number too.
    const { data: byUser } = await admin
      .from('persons')
      .select('id')
      .eq('user_id', session.userId)
      .maybeSingle()

    personId = byUser?.id ?? null

    if (!personId) {
      const { data: created, error } = await admin
        .from('persons')
        .insert({ user_id: session.userId })
        .select('id')
        .single()
      if (error || !created) {
        console.error('[otp] could not create person:', error?.message)
        return json({ error: 'somethingWrong' }, 500)
      }
      personId = created.id
    }

    const { count } = await admin
      .from('phone_numbers')
      .select('id', { count: 'exact', head: true })
      .eq('person_id', personId)

    const { error: numberError } = await admin.from('phone_numbers').insert({
      person_id: personId,
      e164,
      // The first verified number is the primary — it is the one a near-match
      // check will later send a confirmation code to.
      is_primary: (count ?? 0) === 0,
      verified_at: new Date().toISOString(),
    })
    if (numberError) {
      console.error('[otp] could not attach number:', numberError.message)
      return json({ error: 'somethingWrong' }, 500)
    }
  }

  // ── is there an unclaimed listing carrying this number? ────────────────────

  const { data: pending } = await admin
    .from('provider_claim_numbers')
    .select('provider_id, providers!inner(id, name, provider_type, city, district, slug, claim_status, merged_into)')
    .eq('e164', e164)
    .eq('providers.claim_status', 'unclaimed')
    .is('providers.merged_into', null)
    .maybeSingle()

  const listing = pending?.providers as
    | { id: string; name: string; provider_type: string; city: string; district: string; slug: string }
    | undefined

  // Does this person already hold a profile? Decides where the UI sends them.
  const { count: profileCount } = await admin
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('person_id', personId)
    .is('merged_into', null)

  return json({
    ok: true,
    // Exchanged by the browser for a session cookie. Short-lived, single use.
    tokenHash: session.tokenHash,
    outcome: listing ? 'claim_offer' : (profileCount ? 'known' : 'new'),
    // Name, trade and city only — the same three fields §4 allows an unclaimed
    // listing to show publicly. Never the number: they just proved they hold
    // the SIM, so telling them what we have on file adds nothing and would
    // print it into a response.
    listing: listing
      ? {
          id: listing.id,
          name: listing.name,
          trade: listing.provider_type,
          city: listing.city || listing.district,
          slug: listing.slug,
        }
      : null,
  }, 200)
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
