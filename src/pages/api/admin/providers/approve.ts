export const prerender = false
import type { APIRoute } from 'astro'
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Sign in required' }, 401)
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid origin' }, 403)
  const { data: admin, error: authError } = await locals.supabase.rpc('is_admin')
  if (authError || admin !== true) return json({ error: 'Administrator access required' }, 403)
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid request' }, 400) }
  if (typeof body?.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)) return json({ error: 'Invalid submission' }, 400)
  const { data, error } = await locals.supabase.rpc('approve_service_provider', { submission_id: body.id })
  if (error) return json({ error: 'Unable to approve this submission. Check the account and service details.' }, 400)
  return json({ ok: true, provider_id: data })
}
