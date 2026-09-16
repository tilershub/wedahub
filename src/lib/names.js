// Name comparison for the §3.2 near-match check and §3.5 search clustering.
//
// This decides whether to ask "is this you?" before creating a second profile.
// It never decides a merge on its own — §3.4 is explicit that name similarity
// alone must never auto-merge, because Sri Lankan names repeat constantly and
// joining two different people is far worse than leaving a duplicate.
//
// Which way to err follows from that. A false positive costs one dismissable
// prompt. A false negative is a permanent duplicate nobody ever notices. So
// the folding below is aggressive and the threshold is generous: this is tuned
// for recall, and the human on the other end of the prompt is the precision.
//
// What it handles:
//   case, punctuation, spacing, word order          Perera Nuwan  = Nuwan Perera
//   honorifics and company suffixes                 Mr. N Perera (Pvt) Ltd
//   initials against full given names               N. Perera     = Nuwan Perera
//   Sinhala-to-Latin transliteration drift          Nuvan/Nuwan, Priyantha/Priyanta
//
// What it does not: compare across scripts. A name written in Sinhala script
// and the same name in Latin will not match. Transliteration is a bigger
// problem than this function, and getting it half-right silently is worse than
// not attempting it — the imports are Latin, which is where duplicates land.

// Dropped before comparison: they carry no identity and appear inconsistently.
const NOISE = new Set([
  'mr', 'mrs', 'ms', 'miss', 'master', 'dr', 'eng', 'engineer',
  'pvt', 'private', 'ltd', 'limited', 'company', 'co', 'and',
  'enterprises', 'enterprise', 'constructions', 'construction',
  'services', 'service', 'solutions', 'solution', 'works', 'work',
  'the', 'of',
])

/**
 * Fold one word to a form that survives transliteration drift.
 *
 * Order matters: digraphs collapse before single letters, or "th" would become
 * "tw" by way of the v/w rule.
 */
function foldToken(token) {
  return token
    // Aspirated consonants are written both ways by the same person on
    // different days: Priyantha/Priyanta, Sudheera/Sudeera.
    .replace(/th/g, 't').replace(/dh/g, 'd').replace(/bh/g, 'b')
    .replace(/gh/g, 'g').replace(/kh/g, 'k').replace(/ph/g, 'p')
    .replace(/sh/g, 's').replace(/ch/g, 'c').replace(/jh/g, 'j')
    // v and w are the same sound here: Nuvan/Nuwan, Silva/Silwa.
    .replace(/v/g, 'w')
    // Long vowels get written doubled or single: Susee/Susi, Noor/Nur.
    .replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/aa/g, 'a')
    .replace(/ai/g, 'e').replace(/au/g, 'o')
    .replace(/x/g, 'ks').replace(/z/g, 's').replace(/q/g, 'k')
    // Any remaining doubling is decorative: Sampatth/Sampath.
    .replace(/(.)\1+/g, '$1')
}

/**
 * A name reduced to comparable tokens. Word order is not preserved — Sri
 * Lankan names are written given-first and family-first interchangeably.
 */
export function nameTokens(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')      // strip diacritics
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')            // punctuation becomes a break
    .split(/\s+/)
    .filter((tok) => tok && !NOISE.has(tok))
    .map(foldToken)
    .filter(Boolean)
}

/** The folded name as one string — the clustering key for §3.5. */
export function normalizeName(name) {
  return nameTokens(name).sort().join(' ')
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]
}

function tokenSimilarity(a, b) {
  if (a === b) return 1
  // An initial stands in for the whole given name: "N. Perera" is how half of
  // an imported CSV will spell "Nuwan Perera".
  if (a.length === 1 || b.length === 1) {
    return a[0] === b[0] ? 0.9 : 0
  }
  const distance = levenshtein(a, b)
  return 1 - distance / Math.max(a.length, b.length)
}

/**
 * How alike two names are, 0 to 1.
 *
 * Each token of the shorter name is scored against its best partner in the
 * longer one and averaged, so "Silva" still matches "de Silva" and a missing
 * middle name does not sink the score. A mild penalty for very different token
 * counts keeps "Nuwan" from scoring a clean 1.0 against "Nuwan Perera".
 */
export function nameSimilarity(a, b) {
  const ta = nameTokens(a).slice().sort()
  const tb = nameTokens(b).slice().sort()
  if (ta.length === 0 || tb.length === 0) return 0

  // The assignment below is greedy, so its result depends on the order it sees
  // tokens in — which would make the score depend on which name was passed
  // first. That score is persisted on duplicate_candidates, where A and B are
  // whichever way round the row happened to be written, so it has to be
  // symmetric. Tokens are sorted above and the pair is oriented canonically
  // here, with the joined form breaking ties at equal length.
  const [short, long] = ta.length !== tb.length
    ? (ta.length < tb.length ? [ta, tb] : [tb, ta])
    : (ta.join(' ') <= tb.join(' ') ? [ta, tb] : [tb, ta])
  const used = new Set()
  let total = 0

  for (const token of short) {
    let best = 0
    let bestIndex = -1
    for (let i = 0; i < long.length; i++) {
      if (used.has(i)) continue
      const score = tokenSimilarity(token, long[i])
      if (score > best) { best = score; bestIndex = i }
    }
    if (bestIndex >= 0) used.add(bestIndex)
    total += best
  }

  const lengthPenalty = 0.85 + 0.15 * (short.length / long.length)
  return (total / short.length) * lengthPenalty
}

// Above this, ask the person. Set for recall: see the note at the top about
// which error is the expensive one.
export const SIMILAR_NAME_THRESHOLD = 0.82

export function isSimilarName(a, b) {
  return nameSimilarity(a, b) >= SIMILAR_NAME_THRESHOLD
}

/**
 * The §3.5 clustering key: one card per person per trade per city, even when
 * two records exist. Trade and city are exact — only the name is fuzzy, and
 * two different trades in one city are two different listings.
 */
export function clusterKey({ name, trade, city }) {
  const flatten = (v) => String(v ?? '').toLowerCase().replace(/[^a-z]/g, '')
  return `${normalizeName(name)}|${flatten(trade)}|${flatten(city)}`
}
