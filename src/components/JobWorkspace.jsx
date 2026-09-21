import { useEffect, useState } from 'react'
import { mutuallyStarted, reviewable } from '../lib/job-workflow.js'
import './JobWorkspace.css'
const labels = { invited: 'සේවා සපයන්නාගේ පිළිතුර බලාපොරොත්තුවෙන්', accepted: 'ආරම්භ කිරීමට සූදානම්', in_progress: 'වැඩය සිදුවෙමින්', completion_requested: 'අවසන් කිරීම තහවුරු කිරීමට නියමිතයි', completed: 'අවසන් කළා', stopped: 'නැවැත්වූවා', abandoned: 'අත්හැරියා', disputed: 'ගැටලුවක් වාර්තා කළා', declined: 'ආරාධනය ප්‍රතික්ෂේප කළා' }
const reviewStatus = { pending: 'පරීක්ෂාවට යොමු කර ඇත', published: 'පළ කර ඇත', hidden: 'සඟවා ඇත' }
const consentStatus = { pending: 'අවසරය බලාපොරොත්තුවෙන්', granted: 'අවසර ලැබී ඇත', denied: 'අවසර නොලැබුණි' }
const roles = { customer: 'පාරිභෝගිකයා', provider: 'සේවා සපයන්නා', admin: 'වැඩHUB කණ්ඩායම' }
const events = { invite:'ආරාධනය යැවීය', accept:'වැඩය භාරගත්තේය', decline:'ආරාධනය ප්‍රතික්ෂේප කළේය', start:'වැඩය ආරම්භ වූ බව තහවුරු කළේය', request_completion:'අවසන් කිරීම ඉල්ලීය', confirm_completion:'අවසන් කළ බව තහවුරු කළේය', stop:'වැඩය නැවැත්වීය', abandon:'වැඩය අත්හැරීය', dispute:'ගැටලුවක් වාර්තා කළේය', review:'සමාලෝචනය සුරැකීය', reply:'පිළිතුරක් එක් කළේය', appeal:'පරීක්ෂණයක් ඉල්ලීය', request_portfolio:'ඡායාරූප අවසරය ඉල්ලීය', allow_portfolio:'ඡායාරූප සඳහා අවසර දුන්නේය', deny_portfolio:'ඡායාරූප අවසරය ප්‍රතික්ෂේප කළේය' }
export default function JobWorkspace({ moderate = false, provider = false }) {
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
      await load(); setNotice('වෙනස සුරැකිණි. අනෙක් පාර්ශ්වයට එය “මගේ වැඩ” තුළින් දැකිය හැකිය.')
      return true
    } catch (e) { setError(e.message); return false } finally { setBusy(false) }
  }
  return <main className="job-workspace">
    <a href="/account">← මගේ ගිණුම</a>
    <h1>{moderate ? 'සමාලෝචන පරීක්ෂාව' : 'මගේ වැඩ සහ සමාලෝචන'}</h1>
    <p>වැඩයේ ආරම්භය සහ අවසානය දෙපාර්ශ්වයෙන් තහවුරු කර සමාලෝචනයක් එක් කරන්න.</p>
    {error && <div role="alert" className="job-error">දෝෂයක් ඇති විය. නැවත උත්සාහ කරන්න. <button type="button" onClick={() => { setError(''); load().catch(e => setError(e.message)) }}>නැවත පූරණය කරන්න</button></div>}
    {notice && <p role="status" className="job-notice">{notice}</p>}
    {!result && !error && <p role="status">ඔබේ වැඩ පූරණය වෙමින්…</p>}
    {result && <>
      {result.admin && <a href={moderate ? '/my-jobs' : '/my-jobs?moderate=1'}>{moderate ? 'මගේ වැඩ' : 'පරීක්ෂණ පෝලිම විවෘත කරන්න'}</a>}
      {moderate && <p><a href="/my-jobs?moderate=1">පරීක්ෂාව බලාපොරොත්තුවෙන්</a> · <a href="/my-jobs?moderate=1&all=1">සියලු වැඩ වාර්තා</a></p>}
      {!moderate && !provider && <>
        {!result.phoneVerified && <p className="job-error">වෙනස්කම් කිරීමට පෙර දුරකථන අංකය තහවුරු කරන්න. <a href="/login">පිවිසුම් පිටුව විවෘත කරන්න</a></p>}
        <details className="job-card"><summary>සේවා සපයන්නෙකු සමඟ වැඩයක් ආරම්භ කරන්න</summary>
          <p>ඔබ පළ කළ වැඩය තෝරා සේවා සපයන්නාගේ පැතිකඩ සබැඳිය අලවන්න. එක් එක් සේවා සපයන්නා සඳහා වෙනම වැඩ වාර්තාවක් භාවිත කරන්න.</p>
          {result.projects.length ? <form onSubmit={async e => {
            e.preventDefault(); const form = e.currentTarget; const data = Object.fromEntries(new FormData(form))
            if (await send({ action: 'invite', ...data })) form.reset()
          }}><label>ඔබේ වැඩය<select required name="project_id"><option value="">වැඩයක් තෝරන්න</option>{result.projects.map(p => <option key={p.id} value={p.id}>{p.project_type} · {p.city}</option>)}</select></label>
            <label>සේවා සපයන්නාගේ පැතිකඩ සබැඳිය<input name="provider_slug" required maxLength={150} placeholder="https://wedahub.lk/providers/provider-name" /></label>
            <button disabled={busy || !result.phoneVerified}>ආරාධනා කරන්න</button>
          </form> : <p>ආරාධනාවක් යැවීමට පළමුව <a href="/post-project">වැඩක් පළ කරන්න</a>.</p>}
        </details>
      </>}
      {!result.jobs.length && <div className="job-card"><h2>{moderate ? 'පරීක්ෂාවට සමාලෝචන නැත' : 'තවම වැඩ වාර්තා නැත'}</h2><p>{moderate ? 'සාක්ෂි සහ සමාලෝචන පරීක්ෂණ ඉල්ලීම් මෙහි දිස්වේ.' : 'ඔබේ ආරාධනා සහ තහවුරු කළ වැඩ මෙහි දිස්වේ.'}</p></div>}
      {result.jobs.map(job => <JobCard key={`${job.id}-${job.version}`} job={job} userId={result.userId} moderate={moderate} disabled={busy || (!moderate && !result.phoneVerified)} send={send} />)}
      <nav aria-label="වැඩ පිටු" className="job-actions">
        {result.page > 0 && <a href={`?${moderate ? 'moderate=1&' : ''}${new URLSearchParams(window.location.search).get('all') === '1' ? 'all=1&' : ''}page=${result.page - 1}`}>← අලුත් වැඩ</a>}
        {result.hasMore && <a href={`?${moderate ? 'moderate=1&' : ''}${new URLSearchParams(window.location.search).get('all') === '1' ? 'all=1&' : ''}page=${result.page + 1}`}>පැරණි වැඩ →</a>}
      </nav>
      <p className="job-footnote">තහවුරු කළ වැඩයක සමාලෝචනය යනු දෙපාර්ශ්වයේ වැඩ සම්බන්ධතාව තහවුරු වූ බවයි. එය සේවාවේ ගුණාත්මකභාවයට සහතිකයක් නොවේ. සියලු ගිණුම් සඳහා එකම සමාලෝචන නීති අදාළ වේ.</p>
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
    <p>වැඩ යොමු අංකය: <code>{job.id.slice(0, 8)}</code> · {moderate ? 'කණ්ඩායම් පරීක්ෂාව' : `ඔබ ${roles[role]}යි`}</p>
    <div className="job-confirmations"><span>පාරිභෝගික ආරම්භය: {d.started?.customer ? 'තහවුරු කළා' : 'බලාපොරොත්තුවෙන්'}</span><span>සේවා සපයන්නාගේ ආරම්භය: {d.started?.provider ? 'තහවුරු කළා' : 'බලාපොරොත්තුවෙන්'}</span></div>
    {!moderate && <>
      <div className="job-actions">
        {!customer && d.status === 'invited' && <>{button('accept', 'වැඩය භාරගන්න')}{button('decline', 'ආරාධනය ප්‍රතික්ෂේප කරන්න')}</>}
        {d.accepted_at && ['accepted', 'in_progress', 'completion_requested'].includes(d.status) && !d.started?.[role] && button('start', 'වැඩය ආරම්භ වූ බව තහවුරු කරන්න')}
        {['accepted', 'in_progress'].includes(d.status) && d.started?.[role] && button('request_completion', 'වැඩය අවසන් කිරීමට ඉල්ලන්න')}
        {d.status === 'completion_requested' && d.completion_requested_by !== role && mutuallyStarted(d) && button('confirm_completion', 'වැඩය අවසන් බව තහවුරු කරන්න')}
      </div>
      {d.accepted_at && <details><summary>වැඩය නැවතීම, අත්හැරීම හෝ ගැටලුවක් සටහන් කරන්න</summary>
        <form onSubmit={e => { e.preventDefault(); const fields = Object.fromEntries(new FormData(e.currentTarget)); action(fields.outcome, { reason: fields.reason }) }}>
          <label>සිදුවූයේ කුමක්ද?<select name="outcome"><option value="stop">වැඩය නැවැත්වීය</option><option value="abandon">වැඩය අත්හැරීය</option><option value="dispute">ගැටලුවක් වාර්තා කරන්න</option></select></label>
          <label>විස්තරය (අනෙක් පාර්ශ්වයටත් පෙනේ)<textarea name="reason" required minLength={10} maxLength={2000} /></label><button disabled={disabled}>වෙනස සුරකින්න</button>
        </form>
      </details>}
      {d.issue && <p><strong>අලුත්ම ගැටලුව:</strong> {d.issue.reason}</p>}
      {customer && reviewable(d) && d.started?.customer && <details open={!d.review}><summary>{d.review ? 'ඔබේ සමාලෝචනය වෙනස් කරන්න' : 'සමාලෝචනයක් ලියන්න'}</summary>
        <p>සේවා සපයන්නා අවසන් කිරීම තහවුරු කර නැති වුවත් ඔබට අත්දැකීම සමාලෝචනය කළ හැකිය.</p>
        {form('review', <>
          <label>පොදු ලෙස පෙන්වන ඔබේ නම<input name="reviewer_name" required minLength={2} maxLength={60} defaultValue={d.review?.reviewer_name || ''} /></label>
          <label>ලකුණු<select name="rating" defaultValue={d.review?.rating || 5}>{[5,4,3,2,1].map(n => <option key={n} value={n}>තරු {n}</option>)}</select></label>
          <label>ඔබේ අත්දැකීම (පොදු)<textarea name="comment" required minLength={20} maxLength={2000} defaultValue={d.review?.comment || ''} /></label>
          {!mutuallyStarted(d) && <label>පරීක්ෂණ කණ්ඩායම සඳහා පුද්ගලික සාක්ෂි<textarea name="evidence" required minLength={10} maxLength={4000} defaultValue={d.evidence || ''} placeholder="වැඩය ආරම්භ වූ වේලාව සහ උපකාරක ලේඛන සබැඳි සඳහන් කරන්න. මෙය ඔබට සහ පරීක්ෂණ කණ්ඩායමට පමණක් පෙනේ." /></label>}
        </>, d.review ? 'සමාලෝචනයේ වෙනස්කම් සුරකින්න' : 'සමාලෝචනය ඉදිරිපත් කරන්න')}
      </details>}
      {d.review && <section className="job-review"><h3>ඔබේ වැඩ සමාලෝචනය · {reviewStatus[d.review.status] || d.review.status}</h3><p>{d.review.rating}/5 — {d.review.comment}</p>
        {d.review.reply && <p><strong>සේවා සපයන්නාගේ පිළිතුර:</strong> {d.review.reply}</p>}
        {!customer && <><details><summary>මෙම සමාලෝචනයට පිළිතුරු දෙන්න</summary>{form('reply', <label>පොදු පිළිතුර<textarea name="reply" required minLength={2} maxLength={1500} defaultValue={d.review.reply || ''}/></label>, 'පිළිතුර සුරකින්න')}</details>
          <details><summary>සමාලෝචනයක් පිළිබඳ පරීක්ෂණයක් ඉල්ලන්න</summary><p>පරීක්ෂණයක් ඉල්ලූ පමණින් සමාලෝචනය ස්වයංක්‍රීයව ඉවත් නොවේ.</p>{form('appeal', <label>පුද්ගලික හේතුව සහ උපකාරක සාක්ෂි<textarea name="reason" required minLength={10} maxLength={4000}/></label>, 'පරීක්ෂණ ඉල්ලීම යවන්න')}</details>
          {d.appeal && <p>පරීක්ෂණ ඉල්ලීම: {reviewStatus[d.appeal.status] || d.appeal.status}</p>}</>}
      </section>}
      {!customer && d.status === 'completed' && <details><summary>වැඩයේ ඡායාරූප පෙන්වීමට අවසර ඉල්ලන්න</summary><p>පාරිභෝගිකයා මෙම නිශ්චිත ඡායාරූප සහ විස්තරයට අවසර දෙයි. ඒවා වෙනස් කිරීමට නැවත අවසර අවශ්‍යයි.</p>
        <form onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); action('request_portfolio', { caption: f.caption, photos: f.photos.split('\n').map(x => x.trim()).filter(Boolean) }) }}>
          <label>විස්තරය<input name="caption" required minLength={2} maxLength={200}/></label><label>HTTPS ඡායාරූප සබැඳි, එක් පේළියකට එකක් (උපරිම 10)<textarea name="photos" required maxLength={15000}/></label><button disabled={disabled}>පාරිභෝගික අවසරය ඉල්ලන්න</button>
        </form>
      </details>}
      {d.portfolio && <section><h3>වැඩ ගැලරිය · {consentStatus[d.portfolio.consent] || d.portfolio.consent}</h3><p>{d.portfolio.caption}</p><ul>{d.portfolio.photos.map((url, i) => <li key={i}><a href={url} target="_blank" rel="noopener noreferrer">ඡායාරූපය {i + 1} බලන්න</a></li>)}</ul>
        {customer && <div className="job-actions">{d.portfolio.consent !== 'granted' && d.status === 'completed' && button('allow_portfolio', 'මෙම ඡායාරූප පැතිකඩේ පෙන්වීමට අවසර දෙන්න')}{button('deny_portfolio', d.portfolio.consent === 'granted' ? 'ඡායාරූප අවසරය ඉවත් කරන්න' : 'ඡායාරූප අවසරය ප්‍රතික්ෂේප කරන්න')}</div>}
      </section>}
    </>}
    {moderate && <section><h3>සමාලෝචන පරීක්ෂාව</h3><p>{d.review?.rating}/5 — {d.review?.comment}</p><p><strong>පාරිභෝගික සාක්ෂි:</strong> {d.evidence || 'දෙපාර්ශ්වයම වැඩය ආරම්භ වූ බව තහවුරු කර ඇත.'}</p><p><strong>සේවා සපයන්නාගේ ඉල්ලීම:</strong> {d.appeal?.reason || 'නැත'}</p>
      <p>තීරණයට පෙර සාක්ෂි සහ වැඩ ඉතිහාසය පරීක්ෂා කරන්න. ගිණුමේ ගෙවීම් මට්ටම මෙම තීරණයට බලපාන්නේ නැත.</p>
      <form onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); action(f.decision, { reason: f.reason }) }}>
        <label>තීරණය<select name="decision"><option value="approve_review">තහවුරු කළ වැඩයක සමාලෝචනය පළ කරන්න</option><option value="hide_review">සමාලෝචනය සඟවන්න</option></select></label>
        <label>තීරණයට පුද්ගලික හේතුව<textarea name="reason" required minLength={10} maxLength={2000}/></label><button disabled={disabled}>තීරණය සුරකින්න</button>
      </form>
    </section>}
    <details><summary>වැඩ ඉතිහාසය</summary><ol>{(d.events || []).map((e, i) => <li key={i}>{events[e.action] || e.action.replaceAll('_', ' ')} · {roles[e.role] || e.role} · <time dateTime={e.at}>{new Date(e.at).toLocaleString('si-LK')}</time></li>)}</ol></details>
  </article>
}
