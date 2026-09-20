export const prerender = false
import type { APIRoute } from 'astro'
import { createAdminSupabase } from '../../../lib/supabase.admin'
import { serverSecret } from '../../../lib/secrets'
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return new Response(null, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, { status: 403 })
  const key = serverSecret(locals, 'SUPABASE_SERVICE_ROLE_KEY')
  if (!key) return new Response(null, { status: 503 })
  let token
  try { token = (await request.json()).token } catch { return new Response(null, { status: 400 }) }
  if (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{20,100}$/.test(token)) return new Response(null, { status: 400 })
  const { data, error } = await createAdminSupabase(key).from('projects')
    .update({ user_id: locals.user.id, session_token: null, status: 'active' }).eq('session_token', token).is('user_id', null).eq('status', 'pending_review').select('id')
  return new Response(null, { status: error ? 500 : data?.length ? 204 : 404 })
}
