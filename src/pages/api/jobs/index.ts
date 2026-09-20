export const prerender = false
import type { APIRoute } from 'astro'
import { createAdminSupabase } from '../../../lib/supabase.admin'
import { serverSecret } from '../../../lib/secrets'
import { transition, JobError } from '../../../lib/job-workflow.js'
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
const uuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
async function context(locals: App.Locals) {
  if (!locals.user) throw new JobError('Sign in to manage your jobs.', 401)
  const key = serverSecret(locals, 'SUPABASE_SERVICE_ROLE_KEY')
  if (!key) throw new JobError('Job management is not configured yet. Please try again later.', 503)
  const db = createAdminSupabase(key)
  const { data, error } = await locals.supabase.rpc('is_admin')
  if (error) throw new JobError('Unable to check account access.', 503)
  return { db, user: locals.user, admin: data === true }
}
function failure(e: unknown) { return e instanceof JobError ? json({ error: e.message }, e.status) : json({ error: 'Unable to save. Please retry.' }, 500) }
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    const { db, user, admin } = await context(locals)
    const moderate = url.searchParams.get('moderate') === '1'
    if (moderate && !admin) throw new JobError('Administrator access required.', 403)
    const page = Math.max(0, Math.min(10000, Number.parseInt(url.searchParams.get('page') || '0', 10) || 0))
    let query = db.from('job_engagements').select('*').order('updated_at', { ascending: false }).range(page * 25, page * 25 + 25)
    if (!moderate) query = query.or(`customer_id.eq.${user.id},provider_user_id.eq.${user.id}`)
    else if (url.searchParams.get('all') !== '1') query = query.eq('needs_moderation', true)
    const [jobs, projects] = await Promise.all([query, db.from('projects').select('id,project_type,city').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)])
    if (jobs.error || projects.error) throw new JobError('Unable to load jobs. Please retry.', 503)
    // Admin notes and the other participant's private evidence are never sent to a participant.
    const safeJobs = (jobs.data || []).slice(0, 25).map(j => {
      if (moderate) return j
      const d = { ...j.data }; delete d.moderation
      if (j.customer_id !== user.id) delete d.evidence
      if (j.provider_user_id !== user.id) delete d.appeal
      d.events = (d.events || []).map(({ action, at, role }) => ({ action, at, role }))
      return { ...j, data: d }
    })
    return json({ jobs: safeJobs, page, hasMore: (jobs.data || []).length > 25, projects: projects.data, userId: user.id, admin, phoneVerified: !!user.phone_confirmed_at })
  } catch (e) { return failure(e) }
}
export const POST: APIRoute = async ({ locals, request }) => {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new JobError('Request origin not allowed.', 403)
    const { db, user, admin } = await context(locals)
    if (Number(request.headers.get('content-length')) > 20000) throw new JobError('Request too large.', 413)
    const raw = await request.text()
    if (raw.length > 20000) throw new JobError('Request too large.', 413)
    let body
    try { body = JSON.parse(raw) } catch { throw new JobError('Invalid request.') }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new JobError('Invalid request.')
    const { action } = body
    const moderation = ['approve_review', 'hide_review'].includes(action)
    if (!moderation && !user.phone_confirmed_at) throw new JobError('Verify your phone from the sign-in screen before managing jobs.', 403)
    if (action === 'invite') {
      if (!uuid(body.project_id) || typeof body.provider_slug !== 'string' || body.provider_slug.length > 150) throw new JobError('Select your project and enter a provider profile link or slug.')
      const slug = body.provider_slug.replace(/\/$/, '').split('/').pop()
      const [{ data: project, error: pe }, { data: provider, error: ve }] = await Promise.all([
        db.from('projects').select('id,user_id,project_type,city').eq('id', body.project_id).eq('user_id', user.id).single(),
        db.from('providers').select('id,user_id,name,slug,status,claim_status').eq('slug', slug).eq('status', 'active').single(),
      ])
      if (pe || ve || !project || !provider?.user_id || provider.claim_status !== 'claimed') throw new JobError('Choose your own project and an active, claimed provider profile.')
      if (provider.user_id === user.id) throw new JobError('You cannot hire or review yourself.')
      const { error } = await db.from('job_engagements').insert({ project_id: project.id, provider_id: provider.id, customer_id: user.id, provider_user_id: provider.user_id,
        data: { status: 'invited', title: `${project.project_type} · ${project.city}`, provider_name: provider.name, provider_slug: provider.slug, started: {}, events: [{ action: 'invite', role: 'customer', actor_id: user.id, at: new Date().toISOString() }] } })
      if (error) throw new JobError(error.code === '23505' ? 'This provider already has a job record for this project.' : 'Unable to create the invitation.', 409)
      return json({ ok: true })
    }
    if (!uuid(body.id) || !Number.isInteger(body.version)) throw new JobError('Invalid job record.')
    const { data: job, error } = await db.from('job_engagements').select('*').eq('id', body.id).single()
    if (error || !job) throw new JobError('Job not found.', 404)
    const next = transition(job, { id: user.id, admin }, action, body)
    const { error: saveError } = await db.rpc('save_job_engagement', { job_id: job.id, expected_version: body.version, next_data: next })
    if (saveError) throw new JobError(saveError.code === '40001' ? 'This job changed. Refresh and try again.' : 'Unable to save this change.', 409)
    return json({ ok: true })
  } catch (e) { return failure(e) }
}
