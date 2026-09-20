import { useState, useEffect } from 'react'
import { supabase, DISTRICTS_EN } from '../lib/supabase.js'
import JobCard from './JobCard.jsx'
export default function JobsBoard({initialQuery=''}) {
 const [query,setQuery]=useState(initialQuery),[district,setDistrict]=useState(''),[page,setPage]=useState(0),[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let active=true;setLoading(true);const timer=setTimeout(async()=>{
  let q=supabase.from('projects').select('id,project_type,city,district,description,budget_range,created_at').eq('status','active').order('created_at',{ascending:false}).range(page*20,page*20+20)
  if(district)q=q.eq('district',district)
  if(query.trim())q=q.ilike('project_type',`%${query.trim().replace(/[%_]/g,'')}%`)
  const {data,error}=await q;if(active){setRows(data||[]);setError(error?'වැඩ පූරණය කළ නොහැක. නැවත උත්සාහ කරන්න.':'');setLoading(false)}
 },250);return()=>{active=false;clearTimeout(timer)}},[query,district,page])
 return <section><div className="wh-filters"><label>වැඩය හෝ සේවාව<input value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}} placeholder="උදා: cleaning, design, repair…"/></label><label>ප්‍රදේශය<select value={district} onChange={e=>{setDistrict(e.target.value);setPage(0)}}><option value="">ශ්‍රී ලංකාව පුරා</option>{DISTRICTS_EN.map(d=><option key={d}>{d}</option>)}</select></label></div>
 {loading?<p role="status">වැඩ සොයමින්…</p>:error?<p role="alert">{error}</p>:rows.length?<div className="wh-provider-grid">{rows.slice(0,20).map(job=><JobCard key={job.id} job={job}/>)}</div>:<div className="wh-empty"><h2>දැනට ගැළපෙන වැඩ නැහැ.</h2><p>වෙනත් ප්‍රදේශයක් හෝ වචනයක් උත්සාහ කරන්න. පසුව අලුත් අවස්ථා බලන්න.</p><a className="wh-button" href="/post-project">වැඩයක් පළ කරන්න</a></div>}
 <div className="wh-pagination"><button disabled={!page||loading} onClick={()=>setPage(p=>p-1)}>← පෙර</button><span>{page+1}</span><button disabled={rows.length<21||loading} onClick={()=>setPage(p=>p+1)}>ඊළඟ →</button></div></section>
}
