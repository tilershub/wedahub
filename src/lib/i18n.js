// Trilingual strings for everything built from v1 onward.
//
// This sits alongside `si()` in sinhala.js rather than replacing it. That
// helper is a one-way English→Sinhala dictionary with no Tamil and no way to
// pick a language, and rewriting every existing component to use this instead
// would be exactly the kind of rewrite the brief rules out. So: old screens
// keep `si()`, new screens use `t()`, and the two coexist until the old ones
// are migrated deliberately.
//
// Keys are stable identifiers, not English sentences — `t('estimate')`, never
// `t('Rough estimate')`. An English source string as a key is what makes a
// dictionary untranslatable into a third language, because the key and one of
// the translations are the same thing.

import strings from './strings.json' with { type: 'json' }

export const LANGS = ['si', 'en', 'ta']

// Sinhala, matching the rest of the site. Not English: falling back to English
// is how English leaks into a Tamil session (§9.13).
export const DEFAULT_LANG = 'si'

export const LANG_LABELS = { si: 'සිංහල', en: 'English', ta: 'தமிழ்' }

/** Coerce anything — a cookie, a query param, a saved column — to a real language. */
export function resolveLang(value) {
  const lang = String(value || '').toLowerCase().slice(0, 2)
  return LANGS.includes(lang) ? lang : DEFAULT_LANG
}

/**
 * Look up `key` in `lang`, filling {placeholders} from `vars`.
 *
 * A missing key returns the key itself and warns. That is deliberately ugly —
 * "estimateNote" showing up in the UI is a bug you notice, where silently
 * rendering English is a bug you ship. scripts/i18n.test.mjs is the real guard:
 * it fails the build if any key is missing any language.
 */
export function t(key, lang = DEFAULT_LANG, vars = null) {
  const entry = strings[key]
  if (!entry) {
    console.warn(`[i18n] missing key: ${key}`)
    return key
  }

  const value = entry[resolveLang(lang)] ?? entry[DEFAULT_LANG]
  if (!vars) return value

  return value.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] === undefined || vars[name] === null ? match : String(vars[name]))
}

/**
 * Bind a language once, for a component that renders many strings:
 *
 *   const tr = useT(lang)
 *   tr('estimate')
 */
export function useT(lang) {
  const resolved = resolveLang(lang)
  return (key, vars) => t(key, resolved, vars)
}

/** Keys whose Sinhala or Tamil is a first pass awaiting a native speaker. */
export function pendingNativeReview() {
  return Object.entries(strings)
    .filter(([, entry]) => entry._review === 'pending-native')
    .map(([key]) => key)
}
