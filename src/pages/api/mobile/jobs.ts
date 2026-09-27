export const prerender = false
import type { APIContext, APIRoute } from 'astro'
import { createSupabaseBearerClient } from '../../../lib/supabase.server'
import { accountRole } from '../../../lib/account-role.js'
import { GET as getJobs, POST as postJobs } from '../jobs/index'

const error = (message: string, status: number) => new Response(JSON.stringify({ error: message }), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})

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

export const GET: APIRoute = context => authenticated(context, getJobs)
export const POST: APIRoute = context => authenticated(context, postJobs)
