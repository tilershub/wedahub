export const prerender = false
import type { APIContext, APIRoute } from 'astro'
import { createSupabaseBearerClient } from '../../../lib/supabase.server'
import { accountRole } from '../../../lib/account-role.js'
import { GET as getJobs, POST as postJobs } from '../jobs/index'

const error = (message: string, status: number) => new Response(JSON.stringify({ error: message }), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})

const browserOrigins = new Set(['https://wedahub.lk', 'https://www.wedahub.lk', 'https://wedahub--safari-preview.expo.app'])
function allowBrowser(response: Response, origin: string | null) {
  if (origin && browserOrigins.has(origin)) response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.append('Vary', 'Origin')
  return response
}

export const OPTIONS: APIRoute = ({ request }) => {
  const origin = request.headers.get('origin')
  const method = request.headers.get('access-control-request-method')
  if (!origin || !browserOrigins.has(origin) || !['GET', 'POST'].includes(method || '')) return error('Origin or method not allowed.', 403)
  const requestedHeaders = (request.headers.get('access-control-request-headers') || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean)
  if (requestedHeaders.some(value => !['authorization', 'content-type'].includes(value))) return error('Request headers not allowed.', 403)
  return allowBrowser(new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600', 'Cache-Control': 'no-store',
  } }), origin)
}

// Native clients do not have SSR cookies. Validate the explicit token against
// this project's Auth service, then reuse exactly the existing job handlers.
// Never fall back to cookies or trust a user ID supplied by the mobile client.
async function authenticated(context: APIContext, handler: APIRoute) {
  const header = context.request.headers.get('authorization') || ''
  const match = /^Bearer ([^\s,]+)$/i.exec(header)
  if (!match || match[1].length > 8192) return error('A valid sign-in token is required.', 401)
  try {
    const token = match[1]
    const supabase = createSupabaseBearerClient(token)
    const { data, error: authError } = await supabase.auth.getUser(token)
    if (authError || !data.user) return error('Your session is invalid or expired. Sign in again.', 401)
    const user = data.user
    const locals = { ...context.locals, user, supabase, apiAuth: 'bearer' as const,
      accountRole: () => accountRole(supabase, user) }
    return await handler({ ...context, locals })
  } catch {
    return error('Unable to verify your session. Please retry.', 503)
  }
}

async function mobileRequest(context: APIContext, handler: APIRoute) {
  const origin = context.request.headers.get('origin')
  // Native requests have no Origin. Browser clients must use an explicitly
  // approved app origin, and still authenticate with a verified bearer token.
  if (origin && !browserOrigins.has(origin)) return error('Origin not allowed.', 403)
  return allowBrowser(await authenticated(context, handler), origin)
}
export const GET: APIRoute = context => mobileRequest(context, getJobs)
export const POST: APIRoute = context => mobileRequest(context, postJobs)
