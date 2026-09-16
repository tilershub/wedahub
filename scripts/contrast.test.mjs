// The brand gold #D4A15E is only legible on dark. On paper it is 2.2:1 as text
// and 2.3:1 under white — both far below the 4.5:1 floor — which is why the
// accent exists twice in :root (see BRAND.md). Nothing in the build catches a
// contrast regression, and "reach for --brand-gold on a white card" is the
// easy mistake to make, so these pairs are asserted rather than trusted.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

function token(name) {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))
  assert.ok(m, `token --${name} is missing from src/index.css`)
  return m[1]
}

function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

test('contrast helper matches known values', () => {
  assert.equal(ratio('#FFFFFF', '#000000').toFixed(0), '21')
  assert.equal(ratio('#777777', '#FFFFFF').toFixed(1), '4.5')
})

const AA = 4.5          // normal-size text
const AA_LARGE = 3      // >=24px, or >=19px bold
const WHITE = '#FFFFFF'

// [label, foreground, background, floor]
const pairs = [
  ['accent text on the page background',   token('terra'),      token('surface-2'),  AA],
  ['accent text on white cards',           token('terra'),      WHITE,               AA],
  ['white text on an accent fill',         WHITE,               token('terra'),      AA],
  ['accent hover fill under white text',   WHITE,               token('terra-light'), AA],
  ['brand gold on ink',                    token('terra-lift'), token('navy'),       AA],
  ['ink text on a brand-gold fill',        token('navy'),       token('terra-lift'), AA],
  ['body text on the page background',     token('text'),       token('surface-2'),  AA],
  ['secondary text on white',              token('text-2'),     WHITE,               AA],
  ['muted text on white',                  token('text-3'),     WHITE,               AA],
  ['faint text on white',                  token('text-4'),     WHITE,               AA_LARGE],
]

for (const [label, fg, bg, floor] of pairs) {
  test(`${label} (${fg} on ${bg}) meets ${floor}:1`, () => {
    const r = ratio(fg, bg)
    assert.ok(r >= floor, `${label}: ${r.toFixed(2)}:1, needs ${floor}:1`)
  })
}

// The pair above is pointless if the bright gold quietly becomes the default
// accent, so assert the thing BRAND.md actually promises.
test('the light-surface accent is not the brand gold', () => {
  assert.notEqual(token('terra').toUpperCase(), token('brand-gold').toUpperCase())
  assert.ok(ratio(token('brand-gold'), token('surface-2')) < AA,
    'brand gold now passes on paper — if the sheet changed, revisit this split')
})
