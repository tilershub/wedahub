// Outbound SMS, through Text.lk.
//
// Server-only. Never import this from a .jsx component — it reads secrets, and
// components are bundled for the browser.
//
// Three things this file is careful about:
//
// 1. Cost. A Sinhala message is 70 characters per segment, not 160, because it
//    cannot be encoded in GSM-7 — so the same sentence costs roughly 2.3× in
//    Sinhala or Tamil. Bodies are kept short for that reason, and every send is
//    metered into sms_log so otp_rate_check() can enforce the daily cap.
// 2. Secrets. Resolved by the caller via serverSecret() and passed in, so this
//    module stays a pure function of its arguments and can be tested.
// 3. Silence. With no API key configured it runs in stub mode: the row still
//    lands in sms_log marked 'stubbed' and the body is logged, so every flow is
//    exercisable end to end before the gateway account exists.
//
// The completion code is never a template variable here. See the test.

const TEXTLK_ENDPOINT = 'https://app.text.lk/api/v3/sms/send'

// GSM 03.38 basic set. Anything outside it forces the whole message to UCS-2.
const GSM7 = new Set([...'@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'])
// Escape-table characters occupy two septets each.
const GSM7_EXT = new Set([...'^{}\\[~]|€'])

/**
 * Billable segments for a body, by the same rules the gateway charges on.
 *
 * GSM-7: 160 in a single message, 153 each once it splits (the UDH header eats
 * the difference). UCS-2: 70, then 67.
 */
export function smsSegments(body) {
  const chars = [...String(body ?? '')]
  if (chars.length === 0) return 0

  const gsmOnly = chars.every((c) => GSM7.has(c) || GSM7_EXT.has(c))
  if (gsmOnly) {
    const septets = chars.reduce((n, c) => n + (GSM7_EXT.has(c) ? 2 : 1), 0)
    return septets <= 160 ? 1 : Math.ceil(septets / 153)
  }

  const units = chars.reduce((n, c) => n + (c.codePointAt(0) > 0xffff ? 2 : 1), 0)
  return units <= 70 ? 1 : Math.ceil(units / 67)
}

// Every message the app sends, in the three languages, keyed by event.
//
// Sinhala and Tamil are a first pass pending native review — flagged rather
// than polished, per the brief. Kept deliberately terse: see the note about
// 70-character segments above.
export const TEMPLATES = {
  otp: {
    si: 'වැඩHUB කේතය {code}. කාටවත් නොකියන්න.',
    en: 'Your වැඩHUB code is {code}. Do not share it.',
    ta: 'உங்கள் වැඩHUB குறியீடு {code}. யாருடனும் பகிர வேண்டாம்.',
  },
  estimate_received: {
    si: '{name} ඔබේ {service} වැඩේට දළ මිලක් එවා තියෙනවා.',
    en: '{name} sent an estimate for your {service} job.',
    ta: '{name} உங்கள் {service} வேலைக்கு தோராயமான விலை அனுப்பியுள்ளார்.',
  },
  visit_requested: {
    si: '{owner} {slot} බිම බලන්න එන්න කියනවා.',
    en: '{owner} wants a site visit on {slot}.',
    ta: '{owner} {slot} அன்று தள பார்வை கேட்கிறார்.',
  },
  visit_confirmed: {
    si: '{name} {slot} බිම බැලීම තහවුරු කළා.',
    en: '{name} confirmed the visit for {slot}.',
    ta: '{name} {slot} தள பார்வையை உறுதி செய்தார்.',
  },
  final_quote: {
    si: '{name} නියම මිල එවා තියෙනවා: රු. {price}',
    en: '{name} sent a final quote: Rs {price}',
    ta: '{name} இறுதி விலை அனுப்பியுள்ளார்: ரூ. {price}',
  },
  // Reworded from the brief's table. The code changes hands when the work
  // starts, not when it ends, so telling the provider to ask "when you finish"
  // would describe a flow the app no longer has.
  quote_accepted: {
    si: 'ඔබේ මිල ගණන පිළිගත්තා. වැඩ පටන් ගන්නකොට සේවාදායකයාගෙන් අංක 4 කේතය ඉල්ලන්න.',
    en: 'Your quote was accepted. Ask the client for the 4-digit code when you start.',
    ta: 'உங்கள் விலை ஏற்கப்பட்டது. வேலை தொடங்கும்போது 4 இலக்கக் குறியீட்டைக் கேளுங்கள்.',
  },
  job_completed: {
    si: '{name} වැඩේ ඉවර කළා. සමාලෝචනයක් දාන්නද?',
    en: '{name} closed the job. Leave a review?',
    ta: '{name} வேலையை முடித்தார். மதிப்பீடு அளிக்கவா?',
  },
  claim_invite: {
    si: 'වැඩHUB එකේ ඔබේ නම තියෙනවා. ඔබේ එක කරගන්න: {link}',
    en: 'Your name is listed on වැඩHUB. Claim your listing: {link}',
    ta: 'වැඩHUB இல் உங்கள் பெயர் உள்ளது. உங்களுடையதாக்குங்கள்: {link}',
  },
}

/**
 * Fill a template in the recipient's saved language, falling back to Sinhala —
 * the site default — rather than to English.
 *
 * A missing variable throws. A half-rendered "{name} sent an estimate" going
 * out to ten thousand people is worse than a failed send.
 */
export function renderTemplate(name, lang, vars = {}) {
  const template = TEMPLATES[name]
  if (!template) throw new Error(`unknown SMS template: ${name}`)
  const body = template[lang] || template.si

  return body.replace(/\{(\w+)\}/g, (_, key) => {
    if (vars[key] === undefined || vars[key] === null) {
      throw new Error(`SMS template ${name} is missing {${key}}`)
    }
    return String(vars[key])
  })
}

/**
 * Send one message and record it.
 *
 * `db` is a service-role Supabase client — sms_log has no client write policy.
 * `config` is { apiKey, senderId } from serverSecret(). With no apiKey we stub.
 *
 * Resolves { ok, status, segments, cost, error }. Never throws: a failed
 * notification must not take down the action that triggered it.
 */
export async function sendSms(db, config, { to, template, lang = 'si', vars = {} }) {
  const body = renderTemplate(template, lang, vars)
  const segments = smsSegments(body)
  const row = { e164: to, template, lang, segments }

  if (!config?.apiKey) {
    console.log(`[sms:stub] ${to} ${template}/${lang} (${segments} seg): ${body}`)
    await log(db, { ...row, status: 'stubbed' })
    return { ok: true, status: 'stubbed', segments, cost: 0 }
  }

  try {
    const res = await fetch(TEXTLK_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // `recipient` wants 94XXXXXXXXX, which is exactly what normalizeLkPhone
      // already produced, so nothing is reformatted here.
      body: JSON.stringify({
        recipient: to,
        sender_id: config.senderId,
        type: 'plain',
        message: body,
      }),
    })

    const payload = await res.json().catch(() => ({}))
    if (!res.ok || payload.status !== 'success') {
      const error = payload.message || `HTTP ${res.status}`
      await log(db, { ...row, status: 'failed', error })
      return { ok: false, status: 'failed', segments, error }
    }

    // Text.lk reports what it actually billed, which beats our own estimate —
    // the daily cap meters on this.
    const cost = payload.data?.cost != null ? Number(payload.data.cost) : null
    await log(db, {
      ...row,
      status: 'sent',
      cost,
      segments: payload.data?.sms_count ?? segments,
      provider_uid: payload.data?.uid ?? null,
    })
    return { ok: true, status: 'sent', segments, cost }
  } catch (err) {
    const error = err?.message || 'send failed'
    await log(db, { ...row, status: 'failed', error })
    return { ok: false, status: 'failed', segments, error }
  }
}

async function log(db, row) {
  const { error } = await db.from('sms_log').insert({ provider: 'textlk', ...row })
  // Losing the ledger row must not lose the message that was already sent, but
  // it does mean the cap is now undercounting, which is worth shouting about.
  if (error) console.error('[sms] could not write sms_log:', error.message)
}
