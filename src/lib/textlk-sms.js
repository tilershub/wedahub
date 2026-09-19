import { normalizeMobile } from './phone-auth.js'

const failure = (status, message) => new Response(JSON.stringify({ error: { http_code: status, message } }), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})
const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0))

// Standard Webhooks v1: authenticate the exact raw body before parsing or sending SMS.
export async function verifySmsHook(body, headers, secret, now = Date.now()) {
  const id = headers.get('webhook-id')
  const timestamp = headers.get('webhook-timestamp')
  const signatures = headers.get('webhook-signature')
  if (!id || !timestamp || !/^\d+$/.test(timestamp) || !signatures ||
      Math.abs(now / 1000 - Number(timestamp)) > 300) return false
  try {
    const keyBytes = decode(secret.replace(/^v1,whsec_/, '').replace(/^whsec_/, ''))
    if (keyBytes.length < 32) return false
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const data = new TextEncoder().encode(`${id}.${timestamp}.${body}`)
    for (const entry of signatures.split(/\s+/)) {
      const [version, signature] = entry.split(',')
      if (version !== 'v1' || !signature) continue
      try { if (await crypto.subtle.verify('HMAC', key, decode(signature), data)) return true } catch { /* try rotation signature */ }
    }
  } catch { return false }
  return false
}

export async function handleSmsHook(request, config, fetcher = fetch) {
  if (request.method !== 'POST') return failure(405, 'Method not allowed')
  if (!config.secret || !config.apiKey || !config.senderId || config.senderId === 'TextLKDemo')
    return failure(503, 'SMS delivery is not configured')
  if (Number(request.headers.get('content-length')) > 16384) return failure(413, 'Request too large')
  const body = await request.text()
  if (new TextEncoder().encode(body).length > 16384) return failure(413, 'Request too large')
  if (!await verifySmsHook(body, request.headers, config.secret)) return failure(401, 'Invalid webhook')
  let phone, otp
  try {
    const event = JSON.parse(body)
    phone = normalizeMobile(event.sms?.phone ?? event.user?.phone)
    otp = event.sms?.otp
    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) throw new Error()
  } catch { return failure(400, 'Invalid SMS payload') }
  try {
    const result = await fetcher('https://app.text.lk/api/v3/sms/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ recipient: phone.slice(1), sender_id: config.senderId, type: 'plain',
        message: `WedaHUB: Your verification code is ${otp}. Do not share this code with anyone.` }),
      signal: AbortSignal.timeout(4000),
    })
    const payload = await result.json()
    if (!result.ok || payload?.status !== 'success') return failure(502, 'Unable to send verification code')
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  } catch { return failure(502, 'Unable to send verification code') }
}
