// Issue an OTP.
//
// §5.2 calls this "the one endpoint where an attacker costs you real money",
// and it is: every accepted request sends a message somebody bills us for.
// The limits live in otp_rate_check() in the database rather than here, so a
// second caller cannot forget them.
//
// The response never varies by whether the number is known. Telling a stranger
// "that number has no account" turns this into a directory of who is
// registered, and the person typing their own number learns nothing useful
// from the distinction anyway.

export const prerender = false

import type { APIRoute } from 'astro'
import { normalizeLkPhone, isLkMobile } from '../../../../lib/phone.js'
import { serverSecret } from '../../../../lib/secrets'
import { createAdminSupabase } from '../../../../lib/supabase.admin'
import { sendSms } from '../../../../lib/sms.js'
import { issueCode, type OtpPurpose } from '../../../../lib/otp'

const PURPOSES: OtpPurpose[] = ['sign_in', 'add_number', 'claim_verify']

export const POST: APIRoute = async ({ request, locals }) => {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  const e164 = normalizeLkPhone(body.phone as string)
  if (!e164) return json({ error: 'invalidNumber' }, 400)
  // The gateway will happily accept a landline, bill for it, and deliver
  // nothing. Better to say so than to leave someone waiting for a code.
  if (!isLkMobile(e164)) return json({ error: 'notAMobile' }, 400)

  const purpose = (PURPOSES.includes(body.purpose as OtpPurpose)
    ? body.purpose : 'sign_in') as OtpPurpose

  const serviceKey = serverSecret(locals, 'SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceKey) {
    console.error('[otp] SUPABASE_SERVICE_ROLE_KEY is not set')
    return json({ error: 'smsUnavailable' }, 503)
  }
  const admin = createAdminSupabase(serviceKey)

  // 3 per number per hour, 10 per day, and the global daily spend cap.
  const { data: gate, error: gateError } = await admin.rpc('otp_rate_check', { p_e164: e164 })
  if (gateError) {
    console.error('[otp] rate check failed:', gateError.message)
    return json({ error: 'somethingWrong' }, 500)
  }
  if (!gate?.allowed) {
    const reason = String(gate?.reason ?? 'somethingWrong')
    const key = {
      too_many_this_hour: 'tooManyThisHour',
      too_many_today: 'tooManyToday',
      daily_cap_reached: 'smsUnavailable',
      invalid_number: 'invalidNumber',
    }[reason] ?? 'somethingWrong'
    return json({ error: key, retryAfter: gate?.retry_after_seconds ?? null }, 429)
  }

  const issued = await issueCode(admin, e164, purpose)
  if ('error' in issued) {
    console.error('[otp] could not store code:', issued.error)
    return json({ error: 'somethingWrong' }, 500)
  }

  const result = await sendSms(
    admin,
    { apiKey: serverSecret(locals, 'TEXTLK_API_KEY'), senderId: serverSecret(locals, 'SMS_SENDER_ID') },
    { to: e164, template: 'otp', lang: locals.lang || 'si', vars: { code: issued.code } },
  )
  if (!result.ok) return json({ error: 'smsUnavailable' }, 502)

  // Deliberately no `code` in this response, in any environment. A debug-only
  // branch here is one misconfigured flag away from handing out every OTP.
  // In stub mode the code is in the server log.
  return json({ ok: true, stubbed: result.status === 'stubbed' }, 200)
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
