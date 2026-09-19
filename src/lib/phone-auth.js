// Authentication accepts Sri Lankan mobile numbers only; never truncate foreign numbers.
export function normalizeMobile(value) {
  const raw = String(value ?? '').trim()
  if (!/^[+\d\s()-]+$/.test(raw)) throw new Error('invalid_phone')
  let digits = raw.replace(/[\s()-]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  if (/^07\d{8}$/.test(digits)) digits = '94' + digits.slice(1)
  if (/^7\d{8}$/.test(digits)) digits = '94' + digits
  if (!/^947\d{8}$/.test(digits)) throw new Error('invalid_phone')
  return '+' + digits
}

export async function requestPhoneCode(client, rawPhone, { link = false, captchaToken } = {}) {
  const phone = normalizeMobile(rawPhone)
  const result = link
    ? await client.auth.updateUser({ phone })
    : await client.auth.signInWithOtp({ phone, options: { channel: 'sms', captchaToken } })
  if (result.error) throw result.error
  return phone
}

export async function verifyPhoneCode(client, phone, token, { link = false } = {}) {
  if (!/^\d{6}$/.test(token)) throw new Error('invalid_code')
  const result = await client.auth.verifyOtp({ phone: normalizeMobile(phone), token, type: link ? 'phone_change' : 'sms' })
  if (result.error) throw result.error
  if (!result.data?.user) throw new Error('verification_failed')
  return result.data
}
