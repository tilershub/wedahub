export const prerender = false

import { projectInput } from '../../../lib/project-input.js'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user
  if (!user) return json({ error: 'Unauthorized' }, 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  let payload
  try { payload = projectInput(body, user.id) } catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid project' }, 400) }
  const { error } = await locals.supabase
    .from('projects')
    .insert(payload)

  if (error) return json({ error: error.message }, 400)
  return json({ ok: true }, 200)
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
