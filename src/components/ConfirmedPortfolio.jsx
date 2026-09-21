import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
export default function ConfirmedPortfolio({ providerId }) {
  const [items, setItems] = useState([])
  useEffect(() => { let active = true
    supabase.from('job_portfolio').select('engagement_id,caption,photos').eq('provider_id', providerId).order('approved_at', { ascending: false }).then(({ data }) => { if (active) setItems(data || []) })
    return () => { active = false }
  }, [providerId])
  if (!items.length) return null
  return <section style={{ margin: '24px 0', padding: 20, background: '#fff', borderRadius: 16, border: '1px solid #EAE4D7' }}>
    <h2>පාරිභෝගික අවසරය ඇතිව පෙන්වන නිම කළ වැඩ</h2>
    {items.map(item => <div key={item.engagement_id}><h3>{item.caption}</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>{item.photos.map((src, i) => <img key={i} src={src} alt={`${item.caption} — ඡායාරූපය ${i + 1}`} loading="lazy" referrerPolicy="no-referrer" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8 }} />)}</div></div>)}
  </section>
}
