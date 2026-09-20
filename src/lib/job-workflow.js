// Pure transition rules shared by the API and tests. Only server-verified actors enter here.
export class JobError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}
const fail = (message, status) => { throw new JobError(message, status) }
const text = (value, min = 1, max = 2000) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(`Enter between ${min} and ${max} characters.`)
  return value.trim()
}
export const mutuallyStarted = d => !!(d.started?.customer && d.started?.provider)
export const reviewable = d => ['completion_requested', 'completed', 'stopped', 'abandoned', 'disputed'].includes(d.status)
export function transition(job, actor, action, input = {}, now = new Date().toISOString()) {
  const role = actor.id === job.customer_id ? 'customer' : actor.id === job.provider_user_id ? 'provider' : null
  const moderation = ['approve_review', 'hide_review'].includes(action)
  if (moderation ? !actor.admin : !role) fail('You cannot change this job.', 403)
  const d = structuredClone(job.data)
  const requireRole = expected => { if (role !== expected) fail('This action belongs to the other participant.', 403) }
  const accepted = () => { if (!d.accepted_at) fail('The provider must accept first.') }
  switch (action) {
    case 'accept':
      requireRole('provider'); if (d.status !== 'invited') fail('This invitation is no longer open.')
      d.accepted_at = now; d.status = 'accepted'; break
    case 'decline':
      requireRole('provider'); if (d.status !== 'invited') fail('This invitation is no longer open.')
      d.status = 'declined'; break
    case 'start':
      accepted(); if (!['accepted', 'in_progress', 'completion_requested'].includes(d.status)) fail('This job cannot be started now.')
      d.started ||= {}; if (d.started[role]) fail('You already confirmed the start.')
      d.started[role] = now; if (mutuallyStarted(d) && d.status !== 'completion_requested') d.status = 'in_progress'; break
    case 'request_completion':
      accepted(); if (!['accepted', 'in_progress'].includes(d.status) || !d.started?.[role]) fail('Confirm that work started first.')
      d.status = 'completion_requested'; d.completion_requested_by = role; break
    case 'confirm_completion':
      if (d.status !== 'completion_requested' || d.completion_requested_by === role) fail('The other participant must confirm completion.')
      if (!mutuallyStarted(d)) fail('Both participants must confirm that work started. Report an issue if this is disputed.')
      d.status = 'completed'; d.completed_at = now; break
    case 'stop': case 'abandon': case 'dispute':
      accepted(); if (['declined', 'invited'].includes(d.status)) fail('This job has not started.')
      d.status = { stop: 'stopped', abandon: 'abandoned', dispute: 'disputed' }[action]
      d.issue = { by: role, reason: text(input.reason, 10), at: now }; break
    case 'review': {
      requireRole('customer'); if (!reviewable(d) || !d.started?.customer) fail('Confirm work started, then record completion or an issue before reviewing.')
      const rating = Number(input.rating)
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) fail('Choose a rating from 1 to 5.')
      const evidence = input.evidence ? text(input.evidence, 10, 4000) : ''
      if (!mutuallyStarted(d) && !evidence) fail('Describe private evidence of the job for the review team.')
      // Edits to a moderated/appealed review return to the queue, never bypass moderation.
      const pending = !mutuallyStarted(d) || d.review?.status === 'hidden' || !!d.appeal || !!d.review?.moderated_at
      d.review = { ...d.review, rating, comment: text(input.comment, 20), reviewer_name: text(input.reviewer_name, 2, 60),
        status: pending ? 'pending' : 'published', confirmed_job: mutuallyStarted(d), updated_at: now,
        created_at: d.review?.created_at || now }
      d.evidence = evidence || d.evidence || ''; break
    }
    case 'reply':
      requireRole('provider'); if (!d.review) fail('There is no review to reply to.')
      d.review.reply = text(input.reply, 2, 1500); break
    case 'appeal':
      requireRole('provider'); if (!d.review) fail('There is no review to appeal.')
      d.appeal = { reason: text(input.reason, 10, 4000), at: now, status: 'pending' }; break
    case 'approve_review': case 'hide_review':
      if (!d.review) fail('There is no review to moderate.')
      d.moderation = { reason: text(input.reason, 10), actor: actor.id, at: now }
      d.review.status = action === 'approve_review' ? 'published' : 'hidden'
      // Evidence approval confirms a genuine engagement, not quality or completion.
      if (action === 'approve_review') d.review.confirmed_job = true
      d.review.moderated_at = now
      if (d.appeal) d.appeal.status = 'resolved'
      break
    case 'request_portfolio': {
      requireRole('provider'); if (d.status !== 'completed') fail('Complete the job before requesting portfolio permission.')
      const photos = input.photos
      if (!Array.isArray(photos) || photos.length < 1 || photos.length > 10) fail('Add between 1 and 10 photo links.')
      d.portfolio = { photos: photos.map(p => {
        const url = text(p, 1, 1500)
        try { if (new URL(url).protocol !== 'https:') throw new Error() } catch { fail('Photo links must use HTTPS.') }
        return url
      }), caption: text(input.caption, 2, 200), consent: 'pending', requested_at: now }
      break
    }
    case 'allow_portfolio': case 'deny_portfolio':
      requireRole('customer'); if (!d.portfolio) fail('No photos have been submitted for permission.')
      if (action === 'allow_portfolio' && d.status !== 'completed') fail('Only completed work can appear in the job portfolio.')
      d.portfolio.consent = action === 'allow_portfolio' ? 'granted' : 'denied'; d.portfolio.decided_at = now; break
    default: fail('Unknown action.')
  }
  d.events = [...(d.events || []), { action, actor_id: actor.id, role: moderation ? 'admin' : role, at: now }]
  // Store substantive review revisions privately for an audit trail.
  if (action === 'review') d.events[d.events.length - 1].review = structuredClone(d.review)
  return d
}
