// Every string, in all three languages.
//
// §9.13 asks for a full run in Sinhala and then Tamil with no English leaking.
// A missing translation is exactly how that fails, and it fails quietly — the
// screen still renders, just in the wrong language, and only a Tamil speaker
// notices. So the check is mechanical and runs in CI.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { t, resolveLang, useT, LANGS, DEFAULT_LANG, pendingNativeReview } from '../src/lib/i18n.js'

const strings = JSON.parse(
  readFileSync(new URL('../src/lib/strings.json', import.meta.url), 'utf8'))

// Keys starting with _ are notes to the reader, not strings.
const entries = Object.entries(strings).filter(([key]) => !key.startsWith('_'))

test('there are strings to check', () => {
  assert.ok(entries.length > 30, `only ${entries.length} keys`)
})

test('every key has Sinhala, English and Tamil', () => {
  const missing = []
  for (const [key, entry] of entries) {
    for (const lang of LANGS) {
      if (!entry[lang] || !String(entry[lang]).trim()) missing.push(`${key}.${lang}`)
    }
  }
  assert.deepEqual(missing, [], `missing translations: ${missing.join(', ')}`)
})

test('no Sinhala or Tamil value is just the English copied across', () => {
  // The quiet failure mode: someone fills a gap by pasting English in, and the
  // key then passes the presence check above while still leaking English.
  // වැඩHUB itself is a brand name and stays Latin in every language.
  const offenders = []
  for (const [key, entry] of entries) {
    for (const lang of ['si', 'ta']) {
      const value = String(entry[lang]).replace(/වැඩHUB/g, '').trim()
      if (value && value === String(entry.en).replace(/වැඩHUB/g, '').trim()) {
        offenders.push(`${key}.${lang}`)
      }
    }
  }
  assert.deepEqual(offenders, [], `English left in a non-English slot: ${offenders.join(', ')}`)
})

test('Sinhala values are actually in Sinhala script', () => {
  const sinhala = /[඀-෿]/
  const offenders = entries
    .filter(([, e]) => !sinhala.test(e.si))
    .map(([k]) => k)
  assert.deepEqual(offenders, [], `no Sinhala characters in: ${offenders.join(', ')}`)
})

test('Tamil values are actually in Tamil script', () => {
  const tamil = /[஀-௿]/
  const offenders = entries
    .filter(([, e]) => !tamil.test(e.ta))
    .map(([k]) => k)
  assert.deepEqual(offenders, [], `no Tamil characters in: ${offenders.join(', ')}`)
})

test('a key takes the same placeholders in every language', () => {
  const names = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  for (const [key, entry] of entries) {
    for (const lang of ['en', 'ta']) {
      assert.equal(names(entry[lang]), names(entry.si),
        `${key}.${lang} takes different placeholders from ${key}.si`)
    }
  }
})

test('lookup returns the right language and fills placeholders', () => {
  assert.equal(t('yes', 'en'), 'Yes')
  assert.equal(t('yes', 'ta'), 'ஆம்')
  assert.equal(t('codeSentTo', 'en', { phone: '077 123 4567' }), 'Code sent to 077 123 4567')
  assert.equal(t('weHaveListing', 'en', { name: 'Nuwan Perera', trade: 'tiler', city: 'Kotte' }),
    'We already have a listing for Nuwan Perera, tiler, Kotte.')
})

test('the default and the fallback are Sinhala, never English', () => {
  assert.equal(DEFAULT_LANG, 'si')
  assert.equal(t('yes'), t('yes', 'si'))
  assert.equal(t('yes', 'fr'), t('yes', 'si'), 'an unknown language must not fall back to English')
  assert.equal(resolveLang(undefined), 'si')
  assert.equal(resolveLang('TA'), 'ta')
  assert.equal(resolveLang('en-GB'), 'en')
  assert.equal(resolveLang('klingon'), 'si')
})

test('useT binds one language', () => {
  const tr = useT('ta')
  assert.equal(tr('yes'), 'ஆம்')
  assert.equal(tr('codeSentTo', { phone: '077' }), t('codeSentTo', 'ta', { phone: '077' }))
})

test('a missing key is loud, not silently English', () => {
  assert.equal(t('noSuchKeyAnywhere', 'en'), 'noSuchKeyAnywhere')
})

test('strings still awaiting native review are declared', () => {
  // Not a failure — the brief asks for these to be flagged rather than passed
  // off as final. This asserts the flag survives, so the list stays findable.
  const pending = pendingNativeReview()
  assert.ok(pending.length > 0, 'the pending-native flags have gone missing')
  assert.ok(pending.includes('estimateNote'))
})
