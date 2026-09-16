// Name matching for the "is this you?" prompt (§3.2) and search clustering
// (§3.5).
//
// The asymmetry to keep in mind while reading the thresholds: a false positive
// here is one prompt the person taps "no" on, and a duplicate_candidates row a
// human reviews. A false negative is a duplicate profile that nobody ever
// notices — with 10,000 imported listings, that is the failure that compounds.
// So MUST_MATCH is the strict half of this file, and MUST_NOT_MATCH only
// guards against genuinely different people being conflated.

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  nameTokens, normalizeName, nameSimilarity, isSimilarName, clusterKey,
  SIMILAR_NAME_THRESHOLD,
} from '../src/lib/names.js'

const MUST_MATCH = [
  ['Nuwan Perera',        'nuwan perera',          'case'],
  ['Nuwan  Perera',       'Nuwan Perera',          'extra spacing'],
  ['Perera Nuwan',        'Nuwan Perera',          'family name first'],
  ['Nuwan Perera',        'N. Perera',             'initial for given name'],
  ['Nuwan Perera',        'N Perera',              'initial, no dot'],
  ['Mr. Nuwan Perera',    'Nuwan Perera',          'honorific'],
  ['Nuwan Perera',        'Nuvan Perera',          'v/w drift'],
  ['Priyantha Silva',     'Priyanta Silva',        'aspirated th'],
  ['Sudheera Bandara',    'Sudeera Bandara',       'aspirated dh'],
  ['Kumara de Silva',     'Kumara Silva',          'name particle dropped'],
  ['Sampatth Kumara',     'Sampath Kumara',        'doubled consonant'],
  ['Susee Fernando',      'Susi Fernando',         'long vowel spelling'],
  ['Chaminda Perera',     'Caminda Perera',        'ch/c drift'],
  ['Thushara Silva',      'Tushara Silwa',         'two drifts at once'],
  ['Nimal  Perera ',      'NIMAL PERERA',          'case and trailing space'],
  ['Ranjith Kumara',      'Ranjit Kumar',          'both tokens drift'],
  ['ABC Constructions',   'ABC',                   'company suffix'],
  ['Saman Tiles (Pvt) Ltd', 'Saman Tiles',         'company form'],
]

const MUST_NOT_MATCH = [
  ['Nuwan Perera',    'Kamal Fernando',  'unrelated people'],
  ['Nuwan Perera',    'Nuwan Fernando',  'same given name, different family'],
  ['Nuwan Perera',    'Kamal Perera',    'same family, different given'],
  ['Saman Silva',     'Sunil Silva',     'similar-looking given names'],
  ['ABC Tiles',       'XYZ Tiles',       'different businesses, same trade word'],
]

test('every spelling variant of one person matches', () => {
  const failures = []
  for (const [a, b, why] of MUST_MATCH) {
    const score = nameSimilarity(a, b)
    if (score < SIMILAR_NAME_THRESHOLD) {
      failures.push(`${why}: "${a}" vs "${b}" scored ${score.toFixed(3)}`)
    }
  }
  assert.deepEqual(failures, [],
    `these would silently become duplicate profiles:\n  ${failures.join('\n  ')}`)
})

test('different people do not match', () => {
  const failures = []
  for (const [a, b, why] of MUST_NOT_MATCH) {
    const score = nameSimilarity(a, b)
    if (score >= SIMILAR_NAME_THRESHOLD) {
      failures.push(`${why}: "${a}" vs "${b}" scored ${score.toFixed(3)}`)
    }
  }
  assert.deepEqual(failures, [],
    `these would prompt the wrong person:\n  ${failures.join('\n  ')}`)
})

test('similarity is symmetric', () => {
  for (const [a, b] of [...MUST_MATCH, ...MUST_NOT_MATCH]) {
    assert.equal(nameSimilarity(a, b).toFixed(6), nameSimilarity(b, a).toFixed(6),
      `"${a}" vs "${b}" is order-dependent`)
  }
})

test('a name always matches itself', () => {
  for (const [a] of [...MUST_MATCH, ...MUST_NOT_MATCH]) {
    assert.equal(nameSimilarity(a, a), 1, a)
  }
})

test('empty and junk input scores zero rather than matching everything', () => {
  assert.equal(nameSimilarity('', 'Nuwan Perera'), 0)
  assert.equal(nameSimilarity(null, 'Nuwan Perera'), 0)
  assert.equal(nameSimilarity(undefined, undefined), 0)
  assert.equal(nameSimilarity('(Pvt) Ltd', 'Nuwan Perera'), 0,
    'a name of nothing but noise words must not match a real name')
  assert.equal(nameSimilarity('...', 'Nuwan Perera'), 0)
})

test('tokens drop noise and fold transliteration', () => {
  assert.deepEqual(nameTokens('Mr. Nuwan Perera'), ['nuwan', 'perera'])
  assert.deepEqual(nameTokens('ABC Constructions (Pvt) Ltd'), ['abc'])
  assert.deepEqual(nameTokens('Nuvan'), nameTokens('Nuwan'))
  assert.deepEqual(nameTokens('Priyantha'), nameTokens('Priyanta'))
})

test('the clustering key is order-independent and trade/city exact', () => {
  const a = { name: 'Nuwan Perera',  trade: 'tiler', city: 'Kotte' }
  const b = { name: 'Perera Nuwan',  trade: 'Tiler', city: 'kotte' }
  const c = { name: 'Nuwan Perera',  trade: 'tiler', city: 'Galle' }
  const d = { name: 'Nuwan Perera',  trade: 'plumber', city: 'Kotte' }

  assert.equal(clusterKey(a), clusterKey(b), 'one person should be one card')
  assert.notEqual(clusterKey(a), clusterKey(c), 'different city is a different listing')
  assert.notEqual(clusterKey(a), clusterKey(d), 'different trade is a different listing')
})

test('normalizeName is stable and order-free', () => {
  assert.equal(normalizeName('Nuwan Perera'), normalizeName('Perera Nuwan'))
  assert.equal(normalizeName('Nuwan Perera'), normalizeName('  NUWAN   perera  '))
  assert.equal(normalizeName(''), '')
})

test('isSimilarName agrees with the threshold', () => {
  assert.ok(isSimilarName('Nuwan Perera', 'Nuvan Perera'))
  assert.ok(!isSimilarName('Nuwan Perera', 'Kamal Fernando'))
})

test('a single given name does not fully match a full name', () => {
  // It should still be close enough to raise the prompt, but not read as
  // certainty — "Nuwan" is not evidence of being "Nuwan Perera".
  const score = nameSimilarity('Nuwan', 'Nuwan Perera')
  assert.ok(score < 1, `scored ${score}, which would be treated as an exact match`)
})
