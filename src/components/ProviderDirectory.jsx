import { useEffect, useState } from 'react'
import { supabase, DISTRICTS_EN } from '../lib/supabase.js'
import { PROFESSIONS, professionLabel } from '../lib/professions.js'
export default function ProviderDirectory({ initialType = '', initialSearch = '', initialDistrict = '' }) {
  const [query,setQuery]=useState(initialSearch), [type,setType]=useState(initialType), [district,setDistrict]=useState(initialDistrict), [page,setPage]=useState(0)
  const [rows,setRows]=useState([]), [loading,setLoading]=useState(true), [error,setError]=useState('')
  useEffect(() => {
    let active=true; setLoading(true)
    const timer=setTimeout(async () => {
      const { data,error }=await supabase.rpc('search_service_providers',{search_text:query,profession:type,district_filter:district,page_number:page})
      if(!active)return
      setRows(data||[]);setError(error?'සේවා පූරණය කළ නොහැක. නැවත උත්සාහ කරන්න.':'');setLoading(false)
    },250)
    return()=>{active=false;clearTimeout(timer)}
  },[query,type,district,page])
  const change=(setter,value)=>{setter(value);setPage(0)}
  return <section aria-label="Service provider directory">
    <div className="wh-filters"><label>නම හෝ සේවාව<input aria-label="Search providers" value={query} onChange={e=>change(setQuery,e.target.value)} placeholder="උදා: පිරිසිදු කිරීම, computer repair…"/></label><label>සේවා වර්ගය<select aria-label="Profession" value={type} onChange={e=>change(setType,e.target.value)}><option value="">සියලු සේවා</option>{PROFESSIONS.map(p=><option key={p.value} value={p.value}>{p.si}</option>)}</select></label><label>දිස්ත්‍රික්කය<select aria-label="District" value={district} onChange={e=>change(setDistrict,e.target.value)}><option value="">ශ්‍රී ලංකාව පුරා</option>{DISTRICTS_EN.map(d=><option key={d}>{d}</option>)}</select></label></div>
    {loading?<p role="status">සේවා සොයමින්…</p>:error?<div className="wh-empty" role="alert"><p>{error}</p><button className="wh-button" onClick={()=>location.reload()}>නැවත උත්සාහ කරන්න</button></div>:<>
      {!rows.length?<div className="wh-empty"><h2>තවමත් ගැළපෙන පැතිකඩක් නැහැ.</h2><p>වෙනත් වචනයක් හෝ ප්‍රදේශයක් තෝරන්න. නැතිනම් ඔබට අවශ්‍ය වැඩය පළ කරන්න.</p><a className="wh-button" href="/post-project">වැඩයක් පළ කරන්න →</a></div>:<div className="wh-provider-grid">{rows.slice(0,20).map(p=><a className="wh-provider-card" key={p.id} href={`/providers/${p.slug}`}><header>{p.profile_image?<img className="wh-avatar" src={p.profile_image} alt="" loading="lazy"/>:<span className="wh-avatar">{p.name?.slice(0,1)}</span>}<div><h2>{p.name}</h2><small>{professionLabel(p.provider_type,'si')}</small></div></header><p>{p.city}{p.district&&p.district!==p.city?` · ${p.district}`:''}</p><div className="wh-chips">{(p.services||[]).slice(0,3).map((s,i)=><span key={i}>{s}</span>)}</div><div className="wh-card-bottom"><span>{p.review_count?`★ ${Number(p.avg_rating).toFixed(1)} (${p.review_count})`:'තවමත් සමාලෝචන නැහැ'}</span><span>{['th_verified','th_certified_pro','th_master'].includes(p.verification_status)?'✓ සත්‍යාපිත':'පැතිකඩ බලන්න →'}</span></div></a>)}</div>}
      <div className="wh-pagination"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>← පෙර</button><span>{page+1}</span><button disabled={rows.length<21} onClick={()=>setPage(p=>p+1)}>ඊළඟ →</button></div>
    </>}
  </section>
}
