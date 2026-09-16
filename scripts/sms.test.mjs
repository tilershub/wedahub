// SMS templates and segment counting.
//
// The pure half of src/lib/sms.js, which is the half where mistakes are
// expensive: a segment miscount means the daily spend cap meters on the wrong
// number, and a template mistake goes out to every provider at once.

import test from 'node:test'
import assert from 'node:assert/strict'
import { smsSegments, renderTemplate, TEMPLATES } from '../src/lib/sms.js'

const LANGS = ['si', 'en', 'ta']

test('GSM-7 bodies bill at 160, then 153', () => {
  assert.equal(smsSegments(''), 0)
  assert.equal(smsSegments('Your code is 1234'), 1)
  assert.equal(smsSegments('a'.repeat(160)), 1)
  assert.equal(smsSegments('a'.repeat(161)), 2)
  assert.equal(smsSegments('a'.repeat(306)), 2)
  assert.equal(smsSegments('a'.repeat(307)), 3)
})

test('escape-table characters cost two septets', () => {
  // 80 of them is 160 septets — still one message, but only just.
  assert.equal(smsSegments('['.repeat(80)), 1)
  assert.equal(smsSegments('['.repeat(81)), 2)
})

test('Sinhala and Tamil bill at 70, then 67', () => {
  assert.equal(smsSegments('ක'.repeat(70)), 1)
  assert.equal(smsSegments('ක'.repeat(71)), 2)
  assert.equal(smsSegments('அ'.repeat(70)), 1)
  assert.equal(smsSegments('அ'.repeat(71)), 2)
  // One non-GSM character drags the whole body to UCS-2.
  assert.equal(smsSegments('a'.repeat(100) + 'ක'), 2)
})

test('a Sinhala message costs more than the same message in English', () => {
  // The reason §7 says keep the volume low, asserted rather than assumed.
  const en = renderTemplate('quote_accepted', 'en')
  const si = renderTemplate('quote_accepted', 'si')
  assert.ok(smsSegments(si) > smsSegments(en),
    `si ${smsSegments(si)} seg vs en ${smsSegments(en)} seg — check the encoding rules`)
})

test('every template exists in all three languages and is non-empty', () => {
  for (const [name, byLang] of Object.entries(TEMPLATES)) {
    for (const lang of LANGS) {
      assert.ok(byLang[lang], `${name} is missing ${lang}`)
      assert.ok(byLang[lang].trim().length > 0, `${name}.${lang} is empty`)
    }
  }
})

test('a template takes the same variables in every language', () => {
  const names = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  for (const [name, byLang] of Object.entries(TEMPLATES)) {
    const si = names(byLang.si)
    for (const lang of ['en', 'ta']) {
      assert.equal(names(byLang[lang]), si,
        `${name}.${lang} takes different variables from ${name}.si`)
    }
  }
})

test('rendering fills variables and falls back to Sinhala, not English', () => {
  assert.equal(renderTemplate('otp', 'en', { code: '1234' }),
    'Your වැඩHUB code is 1234. Do not share it.')
  // An unknown language gets the site default.
  assert.equal(renderTemplate('otp', 'xx', { code: '1234' }), renderTemplate('otp', 'si', { code: '1234' }))
})

test('a missing variable throws rather than sending half a sentence', () => {
  assert.throws(() => renderTemplate('final_quote', 'en', { name: 'Nuwan' }), /missing \{price\}/)
  assert.throws(() => renderTemplate('estimate_received', 'si', {}), /missing/)
  assert.throws(() => renderTemplate('no_such_template', 'en'), /unknown SMS template/)
})

test('rendered templates leave no placeholder behind', () => {
  const vars = { code: '1234', name: 'Nuwan', service: 'tiling', owner: 'Saman',
                 slot: '3pm Monday', price: '48,000', link: 'https://wedahub.lk/c/x' }
  for (const name of Object.keys(TEMPLATES)) {
    for (const lang of LANGS) {
      assert.ok(!renderTemplate(name, lang, vars).includes('{'),
        `${name}.${lang} still has an unfilled placeholder`)
    }
  }
})

test('no template can carry the completion code', () => {
  // §7: never put the completion code in an SMS. The code is the only thing
  // proving the homeowner and the provider actually met, so a template that
  // took it as a variable would hand it to the one person who must not have it
  // — and nothing else in the codebase would notice.
  const forbidden = /\{\s*(code|completion_code|engagement_code|job_code)\s*\}/
  for (const [name, byLang] of Object.entries(TEMPLATES)) {
    if (name === 'otp') continue          // a sign-in code, not a job code
    for (const lang of LANGS) {
      assert.ok(!forbidden.test(byLang[lang]),
        `${name}.${lang} interpolates a code into an SMS`)
    }
  }
})
