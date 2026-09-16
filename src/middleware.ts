import { migrationRedirect } from './lib/migration.js'
import { defineMiddleware } from 'astro:middleware'
import { createSupabaseServerClient } from './lib/supabase.server'
import { resolveLang, LANGS, DEFAULT_LANG } from './lib/i18n.js'

const LANG_COOKIE = 'lang'
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const onRequest = defineMiddleware(async (context, next) => {
  const destination = migrationRedirect(context.url)
  if (destination) return context.redirect(destination, 301)

  // Language is resolved here, once, so the server renders in the same language
  // the browser will hydrate in. Deciding it client-side means the first paint
  // is Sinhala and then swaps, which on a mid-range phone is a visible flash.
  //
  // ?lang= wins and is sticky: it is how a shared link in Tamil stays Tamil,
  // and how the switcher works without JavaScript. Accept-Language is
  // deliberately ignored — Sri Lankan Android phones are overwhelmingly set to
  // en-US regardless of what the person actually reads, so honouring it would
  // show English to almost everyone.
  const requested = context.url.searchParams.get('lang')
  if (requested && LANGS.includes(requested)) {
    context.cookies.set(LANG_COOKIE, requested, {
      path: '/', maxAge: LANG_COOKIE_MAX_AGE, sameSite: 'lax',
    })
    context.locals.lang = requested
  } else {
    context.locals.lang = resolveLang(context.cookies.get(LANG_COOKIE)?.value ?? DEFAULT_LANG)
  }

  const supabase = createSupabaseServerClient(context.request, context.cookies)
  const { data: { user } } = await supabase.auth.getUser()
  context.locals.supabase = supabase
  context.locals.user = user
  return next()
})
