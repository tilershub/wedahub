// Mirrors the existing web auth normalization. Retain a dedicated parity test
// if this rule ever changes on either platform.
export function normalizeMobile(value: string): string {
  const raw = value.trim();
  if (!/^[+\d\s()-]+$/.test(raw)) throw new Error('invalid_phone');
  let digits = raw.replace(/[\s()-]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (/^07\d{8}$/.test(digits)) digits = '94' + digits.slice(1);
  if (/^7\d{8}$/.test(digits)) digits = '94' + digits;
  if (!/^947\d{8}$/.test(digits)) throw new Error('invalid_phone');
  return '+' + digits;
}
