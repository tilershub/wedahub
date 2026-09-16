// "Is this you?" — the answer to the §3.1 claim offer.
//
// The check that matters is the one in the middle: the caller may only claim a
// listing whose pending claim number is one of the numbers *they have verified
// by OTP*. Without that, a signed-in user could POST any provider id and take
// over any unclaimed listing in the directory, and with 10,000 imported
// listings that is the whole database.
//
// Answering "no" does not delete anything. The import got something wrong and
// a human needs to see which, so the listing is flagged and left alone.

export const prerender = false

import type { APIRoute } from 'astro'
import { serverSecret } from '../../../lib/secrets'
import { createAdminSupabase } from '../../../lib/supabase.admin'

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user
  if (!user) return json({ error: 'unauthorised' }, 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  const providerId = String(body.providerId ?? '')
  const mine = body.mine === true
  if (!providerId) return json({ error: 'bad_request' }, 400)

  const serviceKey = serverSecret(locals, 'SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceKey) return json({ error: 'somethingWrong' }, 503)
  const admin = createAdminSupabase(serviceKey)

  const { data: person } = await admin
    .from('persons').select('id').eq('user_id', user.id).maybeSingle()
  if (!person) return json({ error: 'unauthorised' }, 401)

  const { data: listing } = await admin
    .from('providers')
    .select('id, claim_status, merged_into, person_id')
    .eq('id', providerId)
    .maybeSingle()
  if (!listing) return json({ error: 'not_found' }, 404)
  if (listing.claim_status !== 'unclaimed' || listing.merged_into) {
    return json({ error: 'already_claimed' }, 409)
  }

  // The listing's pending number has to be one this person actually proved.
  const { data: pending } = await admin
    .from('provider_claim_numbers')
    .select('e164')
    .eq('provider_id', providerId)
    .maybeSingle()
  if (!pending) return json({ error: 'not_found' }, 404)

  const { data: owned } = await admin
    .from('phone_numbers')
    .select('id')
    .eq('person_id', person.id)
    .eq('e164', pending.e164)
    .not('verified_at', 'is', null)
    .maybeSingle()
  if (!owned) return json({ error: 'unauthorised' }, 403)

  if (!mine) {
    // Flagged, not deleted: the number is right but the person is not, which
    // usually means the source data paired a name with the wrong number.
    await admin.from('providers')
      .update({ claim_denied_at: new Date().toISOString() })
      .eq('id', providerId)
    return json({ ok: true, claimed: false }, 200)
  }

  const { error } = await admin
    .from('providers')
    .update({
      person_id: person.id,
      user_id: user.id,
      claim_status: 'claimed',
      source: 'import',       // how it arrived, not how it was claimed
      claim_denied_at: null,
    })
    .eq('id', providerId)
    .eq('claim_status', 'unclaimed')   // lose the race rather than double-claim

  if (error) {
    // The 3-profile limit is a trigger, so it surfaces here as a check failure.
    const tooMany = /at most 3 provider profiles/.test(error.message)
    console.error('[claim] failed:', error.message)
    return json({ error: tooMany ? 'tooManyProfiles' : 'somethingWrong' }, 400)
  }

  // The claim number has done its job. Removing it means the listing can never
  // be claimed twice, and drops one more copy of a number we should not hold.
  await admin.from('provider_claim_numbers').delete().eq('provider_id', providerId)

  return json({ ok: true, claimed: true }, 200)
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
