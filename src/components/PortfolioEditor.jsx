import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

const MAX_GALLERY = 8

async function uploadImage(file, userId) {
  const ext = file.name.split('.').pop()
  const path = `portfolio/${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('provider-assets').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('provider-assets').getPublicUrl(path)
  return data.publicUrl
}

export default function PortfolioEditor({ profile, profileType, userId }) {
  const [gallery, setGallery]     = useState(profile?.gallery || [])
  const [newFiles, setNewFiles]   = useState([])
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const ref = useRef(null)

  const table = profileType === 'tiler' ? 'tilers' : 'providers'
  const profileHref = profile?.slug ? `/providers/${profile.slug}` : null

  function addFiles(files) {
    const slots = MAX_GALLERY - gallery.length - newFiles.length
    const combined = [...newFiles, ...Array.from(files)].slice(0, newFiles.length + slots)
    setNewFiles(combined)
  }

  async function save() {
    setSaving(true); setError(sinhalaText(''))
    try {
      const newUrls = []
      for (const f of newFiles) newUrls.push(await uploadImage(f, userId))
      const updated = [...gallery, ...newUrls]
      const { error: err } = await supabase.from(table).update({ gallery: updated }).eq('id', profile.id).eq('user_id', userId)
      if (err) throw err
      setGallery(updated)
      setNewFiles([])
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(sinhalaText(e?.message || 'සුරැකීම අසාර්ථකයි. නැවත උත්සාහ කරන්න.'))
    } finally {
      setSaving(false)
    }
  }

  async function removePhoto(index) {
    const updated = gallery.filter((_, i) => i !== index)
    setGallery(updated)
    const { error: err } = await supabase.from(table).update({ gallery: updated }).eq('id', profile.id).eq('user_id', userId)
    if (err) setError(sinhalaText(err.message))
  }

  const hasNew = newFiles.length > 0
  const total  = gallery.length + newFiles.length

  return (
    <div>
      <p>වැඩHUB හරහා කළ වැඩයක ඡායාරූප පැතිකඩට එක් කිරීමට පෙර <a href="/my-jobs">මගේ වැඩ තුළින් පාරිභෝගික අවසරය ඉල්ලන්න</a>.</p>
      {/* Prompt when empty */}
      {sinhalaText(total === 0 && (
        <div style={{ background:'linear-gradient(135deg,#F7F3E8,#F7F3E8)', border:'1px solid #EAE4D7', borderRadius:14, padding:'18px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:36, flexShrink:0 }}>📸</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#0B2A4A', marginBottom:4 }}>ව්‍යාපෘති ඡායාරූප එකතු කරන්න</div>
            <div style={{ fontSize:12, color:'#071827', lineHeight:1.6 }}>ගැලරිය ඇති ප්‍රවීණයන්ට 3× වැඩි විමසීම් ලැබේ. සේවාලාභීන් ආකර්ෂණය කිරීමට හොඳම කාර්ය ඉදිරිපත් කරන්න.</div>
          </div>
        </div>
      ))}

      {/* Stats bar */}
      {sinhalaText(gallery.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#3A4046' }}>
            📸 ඡායාරූප {sinhalaText(gallery.length)}ක්
          </span>
          {sinhalaText(profileHref && (
            <a href={profileHref} target="_blank" rel="noopener" style={{ fontSize:12, fontWeight:600, color:'#0B2A4A', textDecoration:'none' }}>
              පොදු පැතිකඩ →
            </a>
          ))}
        </div>
      ))}

      {/* Photo grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:10, marginBottom:12 }}>
        {sinhalaText(gallery.map((url, i) => (
          <div key={url} style={{ position:'relative', aspectRatio:'1', borderRadius:12, overflow:'hidden', border:'1px solid #EAE4D7' }}>
            <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
            <button type="button" onClick={() => removePhoto(i)}
              style={{ position:'absolute', top:4, right:4, background:'rgba(0,0,0,0.7)', color:'#fff', border:'none', borderRadius:'50%', width:22, height:22, cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>
              ✕
            </button>
          </div>
        )))}
        {sinhalaText(newFiles.map((f, i) => (
          <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:12, overflow:'hidden', border:'2px solid #A9CBB8' }}>
            <img src={URL.createObjectURL(f)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            <button type="button" onClick={() => setNewFiles(newFiles.filter((_, j) => j !== i))}
              style={{ position:'absolute', top:4, right:4, background:'rgba(0,0,0,0.7)', color:'#fff', border:'none', borderRadius:'50%', width:22, height:22, cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>
              ✕
            </button>
            <div style={{ position:'absolute', bottom:4, left:4, background:'rgba(34,197,94,0.9)', color:'#fff', fontSize:9, fontWeight:700, borderRadius:6, padding:'2px 6px' }}>නව</div>
          </div>
        )))}
        {sinhalaText(total < MAX_GALLERY && (
          <div onClick={() => ref.current?.click()}
            style={{ aspectRatio:'1', borderRadius:12, border:'2px dashed #D6D0C6', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#FAF8F2', gap:6, transition:'border-color 0.15s,background 0.15s' }}
            onMouseOver={e => { e.currentTarget.style.borderColor='#0B2A4A'; e.currentTarget.style.background='#F7F3E8' }}
            onMouseOut={e  => { e.currentTarget.style.borderColor='#D6D0C6'; e.currentTarget.style.background='#FAF8F2' }}
          >
            <span style={{ fontSize:24, color:'#8A8F95' }}>+</span>
            <span style={{ fontSize:10, color:'#8A8F95', fontWeight:600 }}>ඡායාරූප</span>
          </div>
        ))}
      </div>

      <input ref={ref} type="file" accept="image/*" multiple onChange={e => addFiles(e.target.files)} style={{ display:'none' }} />
      <p style={{ fontSize:11, color:'#8A8F95', margin:'0 0 16px' }}>JPG / PNG / WebP · ඡායාරූප {sinhalaText(MAX_GALLERY)}ක් දක්වා · ඔබේ හොඳම නිමි කාර්ය</p>

      {sinhalaText(error && (
        <div style={{ padding:'10px 14px', background:'#FBEDEB', border:'1px solid #F2C9C3', borderRadius:10, fontSize:13, color:'#C0392B', marginBottom:14 }}>
          ⚠ {sinhalaText(error)}
        </div>
      ))}

      {sinhalaText(saved && (
        <div style={{ padding:'10px 14px', background:'#E9F1EC', border:'1px solid #C6DDCF', borderRadius:10, fontSize:13, color:'#285C43', fontWeight:600, marginBottom:14 }}>
          ✓ ගැලරිය සුරකිනු ලැබිණ!
        </div>
      ))}

      {sinhalaText(hasNew ? (
        <button onClick={save} disabled={saving}
          style={{ width:'100%', padding:'13px', background: saving ? '#8A8F95' : '#0B2A4A', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer', transition:'background 0.2s' }}>
          {sinhalaText(saving ? '⏳ සුරකිමින්…' : `💾 නව ඡායාරූප ${newFiles.length}ක් සුරකින්න`)}
        </button>
      ) : gallery.length > 0 && profileHref ? (
        <a href={profileHref} target="_blank" rel="noopener"
          style={{ display:'block', textAlign:'center', padding:'12px', background:'#F7F3E8', color:'#0B2A4A', border:'1px solid #EAE4D7', borderRadius:12, fontSize:13, fontWeight:700, textDecoration:'none' }}>
          🔗 පොදු පැතිකඩ බලන්න →
        </a>
      ) : null)}
    </div>
  )
}
