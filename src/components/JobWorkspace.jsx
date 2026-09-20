import { useEffect, useState } from 'react'
import { mutuallyStarted, reviewable } from '../lib/job-workflow.js'
import './JobWorkspace.css'
const labels = { invited: 'Awaiting provider', accepted: 'Ready to start', in_progress: 'Work in progress', completion_requested: 'Completion requested', completed: 'Completed', stopped: 'Stopped', abandoned: 'Abandoned', disputed: 'Issue reported', declined: 'Invitation declined' }
export default function JobWorkspace({ moderate = false }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  async function load() {
    const params = new URLSearchParams(window.location.search)
    if (moderate) params.set('moderate', '1')
    const response = await fetch(`/api/jobs?${params}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    setResult(data)
  }
  useEffect(() => { load().catch(e => setError(e.message)) }, [])
  async function send(payload) {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      await load(); setNotice('Saved. The other participant can see the update in My jobs.')
      return true
    } catch (e) { setError(e.message); return false } finally { setBusy(false) }
  }
  return <main className="job-workspace">
    <a href="/account">← My account</a>
    <h1>{moderate ? 'Review moderation' : 'My jobs & reviews'}</h1>
    <p>Track work together. Share your experience through a job record.</p>
    {error && <div role="alert" className="job-error">{error} <button type="button" onClick={() => { setError(''); load().catch(e => setError(e.message)) }}>Refresh</button></div>}
    {notice && <p role="status" className="job-notice">{notice}</p>}
    {!result && !error && <p role="status">Loading your jobs…</p>}
    {result && <>
      {result.admin && <a href={moderate ? '/my-jobs' : '/my-jobs?moderate=1'}>{moderate ? 'My jobs' : 'Open moderation queue'}</a>}
      {moderate && <p><a href="/my-jobs?moderate=1">Waiting for investigation</a> · <a href="/my-jobs?moderate=1&all=1">All job records</a></p>}
      {!moderate && <>
        {!result.phoneVerified && <p className="job-error">Verify your phone before making changes. <a href="/login">Open sign-in settings</a></p>}
        <details className="job-card"><summary>Start a job with a provider</summary>
          <p>Select a project you posted, then paste the provider’s profile link. Use a separate job record for each provider.</p>
          {result.projects.length ? <form onSubmit={async e => {
            e.preventDefault(); const form = e.currentTarget; const data = Object.fromEntries(new FormData(form))
            if (await send({ action: 'invite', ...data })) form.reset()
          }}><label>Your project<select required name="project_id"><option value="">Select a project</option>{result.projects.map(p => <option key={p.id} value={p.id}>{p.project_type} · {p.city}</option>)}</select></label>
            <label>Provider profile link or slug<input name="provider_slug" required maxLength={150} placeholder="https://wedahub.lk/providers/provider-name" /></label>
            <button disabled={busy || !result.phoneVerified}>Invite provider</button>
          </form> : <p><a href="/post-project">Post a project</a> to invite a provider.</p>}
        </details>
      </>}
      {!result.jobs.length && <div className="job-card"><h2>{moderate ? 'No reviews waiting' : 'No jobs yet'}</h2><p>{moderate ? 'Evidence submissions and review appeals appear here.' : 'Your invitations and confirmed work will appear here. Providers can accept customer invitations from this page.'}</p></div>}
      {result.jobs.map(job => <JobCard key={`${job.id}-${job.version}`} job={job} userId={result.userId} moderate={moderate} disabled={busy || (!moderate && !result.phoneVerified)} send={send} />)}
      <nav aria-label="Job pages" className="job-actions">
        {result.page > 0 && <a href={`?${moderate ? 'moderate=1&' : ''}${new URLSearchParams(window.location.search).get('all') === '1' ? 'all=1&' : ''}page=${result.page - 1}`}>← Newer jobs</a>}
        {result.hasMore && <a href={`?${moderate ? 'moderate=1&' : ''}${new URLSearchParams(window.location.search).get('all') === '1' ? 'all=1&' : ''}page=${result.page + 1}`}>Older jobs →</a>}
      </nav>
      <p className="job-footnote">A confirmed job review means the work relationship was confirmed. It does not guarantee workmanship. Free and paid accounts follow the same review rules.</p>
    </>}
  </main>
}
function JobCard({ job, userId, moderate, disabled, send }) {
  const d = job.data
  const customer = job.customer_id === userId
  const role = customer ? 'customer' : 'provider'
  const action = (name, fields = {}) => send({ id: job.id, version: job.version, action: name, ...fields })
  const button = (name, label) => <button type="button" disabled={disabled} onClick={() => action(name)}>{label}</button>
  const form = (name, content, label) => <form onSubmit={e => { e.preventDefault(); action(name, Object.fromEntries(new FormData(e.currentTarget))) }}>{content}<button disabled={disabled}>{label}</button></form>
  return <article className="job-card">
    <header><div><h2>{d.title}</h2><a href={`/providers/${d.provider_slug}`}>{d.provider_name}</a></div><span className="job-status">{labels[d.status] || d.status}</span></header>
    <p>Job reference: <code>{job.id.slice(0, 8)}</code> · {moderate ? 'Admin investigation' : `You are the ${role}`}</p>
    <div className="job-confirmations"><span>Customer start: {d.started?.customer ? 'Confirmed' : 'Waiting'}</span><span>Provider start: {d.started?.provider ? 'Confirmed' : 'Waiting'}</span></div>
    {!moderate && <>
      <div className="job-actions">
        {!customer && d.status === 'invited' && <>{button('accept', 'Accept job')}{button('decline', 'Decline invitation')}</>}
        {d.accepted_at && ['accepted', 'in_progress', 'completion_requested'].includes(d.status) && !d.started?.[role] && button('start', 'Confirm work started')}
        {['accepted', 'in_progress'].includes(d.status) && d.started?.[role] && button('request_completion', 'Request completion')}
        {d.status === 'completion_requested' && d.completion_requested_by !== role && mutuallyStarted(d) && button('confirm_completion', 'Confirm completed')}
      </div>
      {d.accepted_at && <details><summary>Record stopped work, abandonment or an issue</summary>
        <form onSubmit={e => { e.preventDefault(); const fields = Object.fromEntries(new FormData(e.currentTarget)); action(fields.outcome, { reason: fields.reason }) }}>
          <label>What happened?<select name="outcome"><option value="stop">Work stopped</option><option value="abandon">Job abandoned</option><option value="dispute">Report an issue</option></select></label>
          <label>Explanation (shared with the other participant)<textarea name="reason" required minLength={10} maxLength={2000} /></label><button disabled={disabled}>Save job update</button>
        </form>
      </details>}
      {d.issue && <p><strong>Latest issue:</strong> {d.issue.reason}</p>}
      {customer && reviewable(d) && d.started?.customer && <details open={!d.review}><summary>{d.review ? 'Edit your review' : 'Write your review'}</summary>
        <p>You can review your experience even if the provider has not confirmed completion.</p>
        {form('review', <>
          <label>Your public name<input name="reviewer_name" required minLength={2} maxLength={60} defaultValue={d.review?.reviewer_name || ''} /></label>
          <label>Rating<select name="rating" defaultValue={d.review?.rating || 5}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} stars</option>)}</select></label>
          <label>Your experience (public)<textarea name="comment" required minLength={20} maxLength={2000} defaultValue={d.review?.comment || ''} /></label>
          {!mutuallyStarted(d) && <label>Private evidence for the review team<textarea name="evidence" required minLength={10} maxLength={4000} defaultValue={d.evidence || ''} placeholder="Explain when work started and provide supporting document links. Only you and the review team can see this." /></label>}
        </>, d.review ? 'Save review changes' : 'Submit review')}
      </details>}
      {d.review && <section className="job-review"><h3>Your job review · {d.review.status}</h3><p>{d.review.rating}/5 — {d.review.comment}</p>
        {d.review.reply && <p><strong>Provider reply:</strong> {d.review.reply}</p>}
        {!customer && <><details><summary>Reply to this review</summary>{form('reply', <label>Public reply<textarea name="reply" required minLength={2} maxLength={1500} defaultValue={d.review.reply || ''}/></label>, 'Save reply')}</details>
          <details><summary>Ask for a review investigation</summary><p>An appeal does not automatically remove a review.</p>{form('appeal', <label>Private reason and supporting evidence<textarea name="reason" required minLength={10} maxLength={4000}/></label>, 'Submit appeal')}</details>
          {d.appeal && <p>Appeal: {d.appeal.status}</p>}</>}
      </section>}
      {!customer && d.status === 'completed' && <details><summary>Request permission to show job photos</summary><p>The customer approves these exact photos and caption. Replacing them requires new permission. Use photo links you have permission to share privately.</p>
        <form onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); action('request_portfolio', { caption: f.caption, photos: f.photos.split('\n').map(x => x.trim()).filter(Boolean) }) }}>
          <label>Caption<input name="caption" required minLength={2} maxLength={200}/></label><label>HTTPS photo links, one per line (up to 10)<textarea name="photos" required maxLength={15000}/></label><button disabled={disabled}>Ask customer for permission</button>
        </form>
      </details>}
      {d.portfolio && <section><h3>Job portfolio · {d.portfolio.consent}</h3><p>{d.portfolio.caption}</p><ul>{d.portfolio.photos.map((url, i) => <li key={i}><a href={url} target="_blank" rel="noopener noreferrer">Preview photo {i + 1}</a></li>)}</ul>
        {customer && <div className="job-actions">{d.portfolio.consent !== 'granted' && d.status === 'completed' && button('allow_portfolio', 'Allow these photos on the provider profile')}{button('deny_portfolio', d.portfolio.consent === 'granted' ? 'Withdraw photo permission' : 'Decline photo permission')}</div>}
      </section>}
    </>}
    {moderate && <section><h3>Review investigation</h3><p>{d.review?.rating}/5 — {d.review?.comment}</p><p><strong>Customer evidence:</strong> {d.evidence || 'Both participants confirmed starting work.'}</p><p><strong>Provider appeal:</strong> {d.appeal?.reason || 'None'}</p>
      <p>Check the evidence and job history before deciding. Payment tier must not affect this decision.</p>
      <form onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); action(f.decision, { reason: f.reason }) }}>
        <label>Decision<select name="decision"><option value="approve_review">Publish review from a confirmed job</option><option value="hide_review">Hide review</option></select></label>
        <label>Private decision reason<textarea name="reason" required minLength={10} maxLength={2000}/></label><button disabled={disabled}>Record decision</button>
      </form>
    </section>}
    <details><summary>Job history</summary><ol>{(d.events || []).map((e, i) => <li key={i}>{e.action.replaceAll('_', ' ')} · {e.role} · <time dateTime={e.at}>{new Date(e.at).toLocaleString()}</time></li>)}</ol></details>
  </article>
}
