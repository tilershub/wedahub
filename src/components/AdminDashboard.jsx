import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, signInWithOtp, DISTRICTS_EN } from '../lib/supabase.js'
import SocialHub from '../modules/social/SocialHub.jsx'
import { SERVICES, HOME_GROUPS } from '../lib/services.js'
import { CATEGORIES } from '../lib/categories.js'

// ─── Design tokens ────────────────────────────────────────────────────────────
// Ink for chrome and structure, terracotta for actions. The palette sweep
// collapsed both of these onto the action colour, which left the whole panel
// one hue with nothing to rank by.
const NAVY  = '#14171A'
const TERRA = '#C2542B'
const S = {
  page:    { display: 'flex', minHeight: 'var(--th-fill)' },
  sidebar: { width: 220, background: NAVY, color: '#fff', flexShrink: 0, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: 'var(--th-fill)', overflowY: 'auto' },
  main:    { flex: 1, padding: '28px 32px', overflowX: 'auto' },
  card:    { background: '#fff', border: '1px solid #E4E0D9', borderRadius: 14, padding: 20 },
  h2:      { fontSize: 20, fontWeight: 700, color: '#14171A', marginBottom: 18, marginTop: 0 },
  badge:   (bg, color) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }),
  btn:     (bg, color='#fff') => ({ padding: '6px 14px', background: bg, color, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }),
  th:      { fontSize: 11, fontWeight: 700, color: '#6B7076', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #EFEBE4', whiteSpace: 'nowrap' },
  td:      { padding: '10px 12px', fontSize: 13, color: '#3A4046', borderBottom: '1px solid #FBFAF8', verticalAlign: 'top' },
}

const STATUS_BADGE = {
  pending_review: ['#F3E7DF','#2A2F35'],
  approved:       ['#E9F1EC','#22513B'],
  listed:         ['#F3E7DF','#7A3218'],
  rejected:       ['#FBEDEB','#8E2A1F'],
  active:         ['#E9F1EC','#22513B'],
  matched:        ['#EDE9FE','#8E3C1E'],
  completed:      ['#F4F1EC','#3A4046'],
  pending_code:   ['#F3E7DF','#2A2F35'],
  verified:       ['#E9F1EC','#22513B'],
  featured:       ['#EDE9FE','#8E3C1E'],
  none:           ['#F4F1EC','#6B7076'],
  new:            ['#F3E7DF','#2A2F35'],
  seen:           ['#F4F1EC','#3A4046'],
  draft:          ['#F4F1EC','#3A4046'],
  published:      ['#E9F1EC','#22513B'],
  archived:       ['#FBEDEB','#8E2A1F'],
}

const ALL_SERVICES = [
  'Floor Tiling', 'Wall Tiling', 'Bathroom Tiling', 'Kitchen Tiling',
  'Staircase Tiling', 'Outdoor Tiling', 'Large Tile Installation',
  'Waterproofing', 'Grouting & Finishing',
  'Tile Cutting', 'Tile Routing',
  'Bathroom Renovation', 'Full Construction',
  'Bathroom Plumbing', 'Shower Cubicle',
  'Hand Railing', 'Vanity Cupboard',
  'Bathroom Lighting', 'Bathroom Wiring', 'Electrical Works',
  'Ipanel Ceiling',
]

function StatusBadge({ status }) {
  const [bg, color] = STATUS_BADGE[status] || ['#EFEBE4','#6B7076']
  return <span style={S.badge(bg, color)}>{sinhalaText(status?.replace(/_/g,' '))}</span>
}

function timeAgo(ts) {
  if (!ts) return '—'
  const d = Math.floor((Date.now() - new Date(ts)) / 86400000)
  return d === 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`
}

function Table({ heads, children, empty }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr>{sinhalaText(heads.map(h => <th key={h} style={S.th}>{sinhalaText(h)}</th>))}</tr></thead>
        <tbody>{sinhalaText(children)}</tbody>
      </table>
      {sinhalaText(empty && <div style={{ textAlign: 'center', padding: '36px 0', color: '#8A8F95', fontSize: 13 }}>{sinhalaText(empty)}</div>)}
    </div>
  )
}

function Pagination({ page, setPage, count, perPage }) {
  const total = Math.ceil(count / perPage)
  if (total <= 1) return null
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#6B7076' }}>පිටුව {sinhalaText(page + 1)} of {sinhalaText(total)}</span>
      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={S.btn('#EFEBE4','#3A4046')}>← පෙර</button>
      <button onClick={() => setPage(p => Math.min(total - 1, p + 1))} disabled={page >= total - 1} style={S.btn('#EFEBE4','#3A4046')}>ඊළඟ →</button>
    </div>
  )
}

// ─── Shared form helpers ──────────────────────────────────────────────────────
function lbl() {
  return { display: 'block', fontSize: 11, fontWeight: 700, color: '#3A4046', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }
}
function inp(hasError) {
  return { width: '100%', padding: '10px 13px', border: `1.5px solid ${hasError ? '#E3A199' : '#E4E0D9'}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: hasError ? '#FBEDEB' : '#fff', boxSizing: 'border-box' }
}
function Chip({ label, checked, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${checked ? NAVY : '#E4E0D9'}`, background: checked ? '#F7EFE9' : '#fff', color: checked ? NAVY : '#6B7076' }}>
      {sinhalaText(checked ? '✓ ' : '')}{sinhalaText(label)}
    </button>
  )
}
function toggleArr(arr, val) {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
}
async function uploadImage(file, folder, prefix) {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('provider-assets').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('provider-assets').getPublicUrl(path)
  return data.publicUrl
}

function ImageUploadBox({ label, hint, value, onChange, aspect }) {
  const ref = useRef(null)
  const [preview, setPreview] = useState(value || null)
  const [dragging, setDragging] = useState(false)
  function handle(file) {
    if (!file || !file.type.startsWith('image/')) return
    onChange(file)
    setPreview(URL.createObjectURL(file))
  }
  const height = aspect === 'cover' ? 120 : 90
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={lbl()}>{sinhalaText(label)}</div>
      <div onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}
        style={{ position: 'relative', height, borderRadius: 10, border: `2px dashed ${dragging ? NAVY : '#D6D0C6'}`, background: dragging ? '#F7EFE9' : preview ? '#000' : '#FBFAF8', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {sinhalaText(preview ? (
          <>
            <img src={preview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
            <div style={{ position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>වෙනස් කිරීමට ඔබන්න</div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#8A8F95', fontSize: 11, pointerEvents: 'none' }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>{sinhalaText(aspect === 'cover' ? '🖼️' : '👤')}</div>
            උඩුගත කිරීමට ඔබන්න හෝ මෙතැනට ඇද දමන්න
          </div>
        ))}
      </div>
      {sinhalaText(hint && <p style={{ fontSize: 11, color: '#8A8F95', marginTop: 3 }}>{sinhalaText(hint)}</p>)}
      <input ref={ref} type="file" accept="image/*" onChange={e => handle(e.target.files[0])} style={{ display: 'none' }} />
    </div>
  )
}

function GalleryEditor({ existing, newFiles, onNewFiles, onRemoveExisting }) {
  const ref = useRef(null)
  const MAX = 8
  function addFiles(files) {
    const combined = [...newFiles, ...Array.from(files)].slice(0, MAX - existing.length)
    onNewFiles(combined)
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={lbl()}>ඡායාරූප / කළ වැඩ <span style={{ fontSize: 10, color: '#8A8F95', textTransform: 'none', fontWeight: 400 }}>(උපරිම {sinhalaText(MAX)})</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 6, marginBottom: 6 }}>
        {sinhalaText(existing.map((url, i) => (
          <div key={url} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid #E4E0D9' }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button type="button" onClick={() => onRemoveExisting(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        )))}
        {sinhalaText(newFiles.map((f, i) => (
          <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid #C6DDCF' }}>
            <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button type="button" onClick={() => onNewFiles(newFiles.filter((_,j) => j!==i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        )))}
        {sinhalaText((existing.length + newFiles.length) < MAX && (
          <div onClick={() => ref.current?.click()} style={{ aspectRatio: '1', borderRadius: 8, border: '2px dashed #D6D0C6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#FBFAF8' }}>
            <span style={{ fontSize: 18, color: '#8A8F95' }}>+</span>
          </div>
        ))}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple onChange={e => addFiles(e.target.files)} style={{ display: 'none' }} />
    </div>
  )
}

// ─── Profile create/edit modal ────────────────────────────────────────────────
function ProfileModal({ profile, profileType, adminUserId, onClose, onSaved }) {
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 768
  const isCreate = !profile

  const [name,       setName]       = useState(profile?.name || '')
  const [profType,   setProfType]   = useState(profile?.provider_type || 'tiler')
  const [whatsapp,   setWhatsapp]   = useState(profile?.whatsapp || '')
  const [city,       setCity]       = useState(profile?.city || '')
  const [district,   setDistrict]   = useState(profile?.district || '')
  const [bio,        setBio]        = useState(profile?.description || '')
  const [services,   setServices]   = useState(profile?.services || [])
  const [svcAreas,   setSvcAreas]   = useState(profile?.service_areas || [])
  const [expYears,   setExpYears]   = useState(profile?.experience_years ?? '')
  const [rateMin,    setRateMin]    = useState(profile?.daily_rate_min ?? '')
  const [rateMax,    setRateMax]    = useState(profile?.daily_rate_max ?? '')
  const [website,    setWebsite]    = useState(profile?.website_url || '')
  const [badge,      setBadge]      = useState(profile?.verification_status || 'listed')
  const [existingGallery, setExistingGallery] = useState(profile?.gallery || [])
  const [newGalleryFiles, setNewGalleryFiles] = useState([])
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [coverImageFile,   setCoverImageFile]   = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState('')

  const [customSvc, setCustomSvc] = useState('')
  function addCustomSvc() {
    const s = customSvc.trim()
    if (s && !services.includes(s)) setServices(prev => [...prev, s])
    setCustomSvc('')
  }

  async function save() {
    if (!name.trim())     { setErr('Name is required'); return }
    if (!whatsapp.trim()) { setErr('WhatsApp number is required'); return }
    if (!city.trim())     { setErr('City is required'); return }
    setSaving(true); setErr('')
    try {
      const prefix = `admin-${adminUserId?.slice(0,8) || 'admin'}`
      let profileImageUrl, coverImageUrl
      const newGalleryUrls = []
      if (profileImageFile) profileImageUrl = await uploadImage(profileImageFile, 'profiles', prefix)
      if (coverImageFile)   coverImageUrl   = await uploadImage(coverImageFile,   'covers',   prefix)
      for (const f of newGalleryFiles) newGalleryUrls.push(await uploadImage(f, 'portfolio', prefix))

      const payload = {
        name: name.trim(),
        whatsapp: whatsapp.replace(/\s/g,''),
        city: city.trim(),
        district: district || null,
        description: bio.trim() || null,
        services: services.length ? services : null,
        service_areas: svcAreas.length ? svcAreas : null,
        gallery: [...existingGallery, ...newGalleryUrls],
        experience_years: expYears !== '' ? parseInt(expYears,10)||null : null,
        daily_rate_min:   rateMin  !== '' ? parseInt(rateMin,10)||null  : null,
        daily_rate_max:   rateMax  !== '' ? parseInt(rateMax,10)||null  : null,
        verification_status: badge,
        website_url: website.trim() || null,
        provider_type: profType,
      }
      if (profileImageUrl !== undefined) payload.profile_image = profileImageUrl
      if (coverImageUrl   !== undefined) payload.cover_image   = coverImageUrl

      if (isCreate) {
        payload.slug = slugify(name.trim()) + '-' + Math.random().toString(36).slice(2,6)
        const { error } = await supabase.from('providers').insert(payload)
        if (error) throw error
      } else {
        const { error } = await supabase.from('providers').update(payload).eq('id', profile.id)
        if (error) throw error
      }
      onSaved()
    } catch(e) {
      setErr(e?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ flex: 1, background: 'rgba(20,23,26,0.5)' }} onClick={onClose} />
      <div style={{ width: isNarrow ? '100vw' : 520, maxWidth: '100vw', background: '#fff', overflowY: 'auto', boxShadow: '-4px 0 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', borderRadius: isNarrow ? 0 : undefined }}>
        {/* Drawer header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EFEBE4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#14171A' }}>
              {sinhalaText(isCreate ? 'Create Provider' : 'Edit Provider')}
            </div>
            {sinhalaText(!isCreate && profile?.slug && (
              <div style={{ fontSize: 11, color: '#8A8F95', marginTop: 2 }}>/{sinhalaText(profile.slug)}</div>
            ))}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8A8F95', padding: 4 }}>✕</button>
        </div>

        {/* Drawer body */}
        <div style={{ padding: '20px 24px', flex: 1 }}>
          {/* Images */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
            <ImageUploadBox label="Profile Photo" aspect="profile"
              value={profile?.profile_image} onChange={setProfileImageFile} />
            <ImageUploadBox label="Cover Image" aspect="cover"
              value={profile?.cover_image} onChange={setCoverImageFile} />
          </div>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl()}>නම / ආයතනය *</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inp(!name && err)} placeholder="ව්‍යාපාරයේ හෝ පුද්ගලයාගේ නම" />
          </div>

          {/* Profession */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl()}>වෘත්තිය</label>
            <select value={profType} onChange={e => setProfType(e.target.value)} style={{ ...inp(false), WebkitAppearance: 'none', cursor: 'pointer' }}>
              <option value="tiler">ටයිල් කාර්මිකයා</option>
              <option value="contractor">කොන්ත්‍රාත්කරු</option>
              <option value="electrician">විදුලි කාර්මිකයා</option>
              <option value="plumber">ජලනළ කාර්මිකයා</option>
              <option value="carpenter">වඩු කාර්මිකයා</option>
              <option value="painter">පින්තාරුකරු</option>
              <option value="mason">පෙදරේරුවා</option>
              <option value="construction_company">ඉදිකිරීම් ආයතනය</option>
              <option value="interior_designer">අභ්‍යන්තර නිර්මාණකරු</option>
              <option value="tile_shop">ටයිල් වෙළෙඳසැල</option>
              <option value="bathroom_shop">නාන කාමර උපාංග වෙළෙඳසැල</option>
              <option value="supplier">සැපයුම්කරු</option>
              <option value="workshop">වැඩපොළ</option>
              <option value="brand_dealer">සන්නාම අලෙවිකරු</option>
              <option value="tool_supplier">මෙවලම් සැපයුම්කරු</option>
            </select>
          </div>

          {/* City + District */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl()}>නගරය *</label>
              <input value={city} onChange={e => setCity(e.target.value)} style={inp(!city && err)} placeholder="උදා: කොළඹ" />
            </div>
            <div>
              <label style={lbl()}>දිස්ත්‍රික්කය</label>
              <select value={district} onChange={e => setDistrict(e.target.value)} style={{ ...inp(false), WebkitAppearance: 'none', cursor: 'pointer' }}>
                <option value="">තෝරන්න…</option>
                {sinhalaText(DISTRICTS_EN.map(d => <option key={d} value={d}>{sinhalaText(d)}</option>))}
              </select>
            </div>
          </div>

          {/* WhatsApp */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl()}>WhatsApp අංකය *</label>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={inp(!whatsapp && err)} placeholder="+94771234567" type="tel" />
          </div>

          {/* Experience + Rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl()}>පළපුරුද්ද (වසර)</label>
              <input value={expYears} onChange={e => setExpYears(e.target.value)} style={inp(false)} placeholder="e.g. 8" type="number" min="0" />
            </div>
            <div>
              <label style={lbl()}>අවම ගාස්තුව (රු./වර්ග අඩිය)</label>
              <input value={rateMin} onChange={e => setRateMin(e.target.value)} style={inp(false)} placeholder="e.g. 180" type="number" min="0" />
            </div>
            <div>
              <label style={lbl()}>උපරිම ගාස්තුව (රු./වර්ග අඩිය)</label>
              <input value={rateMax} onChange={e => setRateMax(e.target.value)} style={inp(false)} placeholder="e.g. 300" type="number" min="0" />
            </div>
          </div>

          {/* Website + Badge */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl()}>වෙබ් අඩවියේ ලිපිනය</label>
              <input value={website} onChange={e => setWebsite(e.target.value)} style={inp(false)} placeholder="https://…" type="url" />
            </div>
            <div>
              <label style={lbl()}>සත්‍යාපන ලාංඡනය</label>
              <select value={badge} onChange={e => setBadge(e.target.value)} style={{ ...inp(false), WebkitAppearance: 'none', cursor: 'pointer' }}>
                <option value="listed">ලැයිස්තුගතයි</option>
                <option value="th_verified">TH සත්‍යාපිත</option>
                <option value="th_certified_pro">සහතික ලත් වෘත්තිකයා</option>
                <option value="th_master">TH ප්‍රවීණ</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl()}>විස්තරය</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              placeholder="පැතිකඩ විස්තරය…"
              style={{ ...inp(false), resize: 'vertical' }} />
          </div>

          {/* Services */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl()}>සේවාවන්</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {sinhalaText(ALL_SERVICES.map(s => (
                <Chip key={s} label={s} checked={services.includes(s)} onClick={() => setServices(p => toggleArr(p, s))} />
              )))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={customSvc} onChange={e => setCustomSvc(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter'){e.preventDefault();addCustomSvc()} }}
                placeholder="වෙනත් සේවාවක් එක් කරන්න…"
                style={{ flex:1, padding:'7px 12px', border:'1.5px solid #E4E0D9', borderRadius:10, fontSize:12, outline:'none', fontFamily:'inherit' }} />
              <button type="button" onClick={addCustomSvc} style={{ padding:'7px 12px', background:'#F7EFE9', color:NAVY, border:`1.5px solid #EDDFD5`, borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer' }}>+ එක් කරන්න</button>
            </div>
            {sinhalaText(services.filter(s => !ALL_SERVICES.includes(s)).length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                {sinhalaText(services.filter(s => !ALL_SERVICES.includes(s)).map(s => (
                  <span key={s} style={{ fontSize:11, padding:'3px 10px', background:'#E9F1EC', border:'1px solid #C6DDCF', borderRadius:20, color:'#285C43', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                    {sinhalaText(s)}
                    <button type="button" onClick={() => setServices(p => p.filter(x=>x!==s))} style={{ background:'none', border:'none', cursor:'pointer', color:'#285C43', padding:0, fontSize:12, lineHeight:1 }}>✕</button>
                  </span>
                )))}
              </div>
            ))}
          </div>

          {/* Service Areas */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl()}>සේවා ප්‍රදේශ</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sinhalaText(DISTRICTS_EN.map(d => (
                <Chip key={d} label={d} checked={svcAreas.includes(d)} onClick={() => setSvcAreas(p => toggleArr(p, d))} />
              )))}
            </div>
          </div>

          {/* Gallery */}
          <GalleryEditor
            existing={existingGallery}
            newFiles={newGalleryFiles}
            onNewFiles={setNewGalleryFiles}
            onRemoveExisting={i => setExistingGallery(prev => prev.filter((_,j) => j!==i))}
          />

          {sinhalaText(err && (
            <div style={{ padding:'10px 14px', background:'#FBEDEB', border:'1px solid #F2C9C3', borderRadius:10, fontSize:13, color:'#C0392B', marginBottom:14 }}>
              ⚠ {sinhalaText(err)}
            </div>
          ))}
        </div>

        {/* Sticky footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid #EFEBE4', display:'flex', gap:10, background:'#fff', flexShrink:0, position:'sticky', bottom:0 }}>
          <button onClick={save} disabled={saving}
            style={{ flex:1, padding:'12px', background: saving ? '#8A8F95' : NAVY, color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {sinhalaText(saving ? '⏳ Saving…' : isCreate ? '✓ Create Profile' : '💾 Save Changes')}
          </button>
          <button onClick={onClose} disabled={saving}
            style={{ padding:'12px 18px', background:'#EFEBE4', color:'#3A4046', border:'1px solid #E4E0D9', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>
            අවලංගු කරන්න
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sign-in screen ───────────────────────────────────────────────────────────
function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent]   = useState(false)
  const [err, setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  async function send(e) {
    e.preventDefault()
    if (!email.includes('@')) { setErr('Enter a valid email'); return }
    setLoading(true); setErr('')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setSent(true)
  }

  return (
    <div style={{ minHeight: 'var(--th-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFEBE4' }}>
      <div style={{ ...S.card, maxWidth: 380, width: '100%', textAlign: 'center', padding: 36 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#14171A', marginBottom: 6 }}>වැඩHUB පරිපාලනය</h1>
        {sinhalaText(sent ? (
          <p style={{ fontSize: 14, color: '#6B7076', lineHeight: 1.7 }}>පිවිසුම් සබැඳිය යවන ලදී: <strong>{sinhalaText(email)}</strong>. පිවිසීමට එය ක්ලික් කරන්න.</p>
        ) : (
          <form onSubmit={send}>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }}
              placeholder="admin@email.com" autoFocus
              style={{ width: '100%', padding: '10px 13px', border: `1.5px solid ${err ? '#E3A199' : '#E4E0D9'}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 10 }} />
            {sinhalaText(err && <p style={{ fontSize: 12, color: '#C0392B', marginBottom: 8 }}>⚠ {sinhalaText(err)}</p>)}
            <button type="submit" disabled={loading}
              style={{ ...S.btn(loading ? '#8A8F95' : NAVY), width: '100%', padding: '11px' }}>
              {sinhalaText(loading ? 'Sending…' : 'Send Magic Link →')}
            </button>
          </form>
        ))}
      </div>
    </div>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('provider_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('bids').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('projects').select('id', { count: 'exact', head: true }),
      supabase.from('provider_submissions').select('id', { count: 'exact', head: true }),
      supabase.from('providers').select('id', { count: 'exact', head: true }),
    ]).then(([pend, activeProj, newBids, totalProj, totalSub, totalProviders]) => {
      setStats({
        pendingSubmissions: pend.count ?? 0,
        activeProjects:     activeProj.count ?? 0,
        newBids:            newBids.count ?? 0,
        totalProjects:      totalProj.count ?? 0,
        totalSubmissions:   totalSub.count ?? 0,
        totalProviders:     totalProviders.count ?? 0,
      })
    })
  }, [])

  const cards = stats ? [
    { label: 'Pending Submissions', value: stats.pendingSubmissions, color: stats.pendingSubmissions > 0 ? TERRA : '#6B7076', emoji: '📝' },
    { label: 'Active Projects',     value: stats.activeProjects,     color: '#2F6B4F', emoji: '📋' },
    { label: 'New Bids',            value: stats.newBids,            color: stats.newBids > 0 ? TERRA : '#6B7076', emoji: '💬' },
    { label: 'Total Providers',      value: stats.totalProviders,     color: NAVY, emoji: '👷' },
    { label: 'Total Projects',      value: stats.totalProjects,      color: '#6B7076', emoji: '📊' },
    { label: 'Total Submissions',   value: stats.totalSubmissions,   color: '#6B7076', emoji: '👥' },
  ] : []

  return (
    <div>
      <h2 style={S.h2}>දළ විශ්ලේෂණය</h2>
      {sinhalaText(!stats ? <p style={{ color: '#8A8F95' }}>පූරණය…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14 }}>
          {sinhalaText(cards.map(c => (
            <div key={c.label} style={{ ...S.card, textAlign: 'center' }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{sinhalaText(c.emoji)}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: c.color }}>{sinhalaText(c.value)}</div>
              <div style={{ fontSize: 12, color: '#6B7076', marginTop: 4 }}>{sinhalaText(c.label)}</div>
            </div>
          )))}
        </div>
      ))}
    </div>
  )
}

// ─── Submissions tab ──────────────────────────────────────────────────────────
function SubmissionsTab() {
  const [rows, setRows]           = useState([])
  const [filter, setFilter]       = useState('pending_review')
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(0)
  const [count, setCount]         = useState(0)
  const [approveError, setApproveError] = useState(null)
  const PER = 20

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('provider_submissions').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PER, page * PER + PER - 1)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, count: c } = await q
    setRows(data || [])
    setCount(c || 0)
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [filter])

  async function update(id, patch) {
    await supabase.from('provider_submissions').update(patch).eq('id', id)
    load()
  }

  async function listProvider(sub) {
    setApproveError(null)
    try {
      const res = await fetch('/api/admin/providers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setApproveError('Approve failed: ' + (err.error || `HTTP ${res.status}`))
        load()
        return
      }
    } catch (e) {
      setApproveError('Network error: ' + e.message)
      load()
      return
    }
    load()
  }

  const FILTERS = ['all','pending_review','approved','rejected']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ ...S.h2, marginBottom: 0 }}>සේවා සපයන්නන්ගේ අයදුම්පත්</h2>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {sinhalaText(FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...S.btn(filter === f ? NAVY : '#EFEBE4', filter === f ? '#fff' : '#3A4046') }}>
              {sinhalaText(f === 'all' ? 'All' : f.replace(/_/g,' '))}
            </button>
          )))}
        </div>
      </div>
      {sinhalaText(approveError && (
        <p style={{ color: '#C0392B', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: '#FBEDEB', borderRadius: 8, border: '1px solid #F2C9C3' }}>
          ⚠ {sinhalaText(approveError)}
        </p>
      ))}
      {sinhalaText(loading ? <p style={{ color: '#8A8F95' }}>පූරණය…</p> : (
        <>
          <div style={S.card}>
            <Table
              heads={['Name','City','Services','WhatsApp','Status','Applied','Actions']}
              empty={rows.length === 0 ? 'No submissions found' : null}
            >
              {sinhalaText(rows.map(r => (
                <tr key={r.id}>
                  <td style={S.td}><strong>{sinhalaText(r.name)}</strong></td>
                  <td style={S.td}>{sinhalaText(r.city)}{sinhalaText(r.district ? `, ${r.district}` : '')}</td>
                  <td style={S.td}><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {sinhalaText((r.services || []).slice(0,3).map(s => <span key={s} style={{ fontSize: 10, padding: '2px 7px', background: '#F7EFE9', color: NAVY, borderRadius: 10, fontWeight: 600 }}>{sinhalaText(s)}</span>))}
                    {sinhalaText((r.services || []).length > 3 && <span style={{ fontSize: 10, color: '#8A8F95' }}>+{sinhalaText(r.services.length - 3)}</span>)}
                  </div></td>
                  <td style={S.td}><a href={`https://wa.me/${r.whatsapp?.replace(/\D/g,'')}`} target="_blank" rel="noopener" style={{ color: '#2F6B4F', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>{sinhalaText(r.whatsapp)}</a></td>
                  <td style={S.td}><StatusBadge status={r.status} /></td>
                  <td style={S.td}>{sinhalaText(timeAgo(r.created_at))}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {sinhalaText(r.status !== 'approved'  && <button onClick={() => listProvider(r)}                      style={S.btn('#2F6B4F')}>✓ අනුමත කරන්න</button>)}
                      {sinhalaText(r.status !== 'rejected'  && <button onClick={() => update(r.id, { status: 'rejected' })}  style={S.btn('#C0392B')}>ප්‍රතික්ෂේප කරන්න</button>)}
                      {sinhalaText(r.status !== 'pending_review' && <button onClick={() => update(r.id, { status: 'pending_review' })} style={S.btn('#8A8F95')}>යළි සකසන්න</button>)}
                    </div>
                    {sinhalaText(r.description && (
                      <p style={{ fontSize: 11, color: '#6B7076', marginTop: 6, maxWidth: 260, lineHeight: 1.5 }}>{sinhalaText(r.description.slice(0, 120))}{sinhalaText(r.description.length > 120 ? '…' : '')}</p>
                    ))}
                  </td>
                </tr>
              )))}
            </Table>
          </div>
          <Pagination page={page} setPage={setPage} count={count} perPage={PER} />
        </>
      ))}
    </div>
  )
}


// ─── Projects tab ─────────────────────────────────────────────────────────────
function ProjectsTab() {
  const [rows, setRows]       = useState([])
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(0)
  const [count, setCount]     = useState(0)
  const [bidCounts, setBidCounts] = useState({})
  const PER = 20

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('projects').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PER, page * PER + PER - 1)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, count: c } = await q
    const proj = data || []
    setRows(proj); setCount(c || 0)

    if (proj.length > 0) {
      const ids = proj.map(p => p.id)
      const { data: bids } = await supabase.from('bids').select('job_id').in('job_id', ids)
      const bc = {}
      for (const b of bids || []) bc[b.job_id] = (bc[b.job_id] || 0) + 1
      setBidCounts(bc)
    }
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [filter])

  async function setStatus(id, status) {
    await supabase.from('projects').update({ status }).eq('id', id)
    load()
  }
  async function del(id) {
    if (!confirm(sinhalaText('Delete this project?'))) return
    await supabase.from('projects').delete().eq('id', id)
    load()
  }

  const STATUSES = ['all','pending_review','active','matched','completed']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ ...S.h2, marginBottom: 0 }}>ව්‍යාපෘති</h2>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {sinhalaText(STATUSES.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={S.btn(filter === f ? NAVY : '#EFEBE4', filter === f ? '#fff' : '#3A4046')}>
              {sinhalaText(f === 'all' ? 'All' : f.replace(/_/g,' '))}
            </button>
          )))}
        </div>
      </div>
      {sinhalaText(loading ? <p style={{ color: '#8A8F95' }}>පූරණය…</p> : (
        <>
          <div style={S.card}>
            <Table
              heads={['Title','Location','Customer','WhatsApp','Budget','Status','Bids','Posted','Actions']}
              empty={rows.length === 0 ? 'No projects found' : null}
            >
              {sinhalaText(rows.map(r => (
                <tr key={r.id}>
                  <td style={S.td}><strong>{sinhalaText(r.project_type)}</strong></td>
                  <td style={S.td}>{sinhalaText(r.city)}{sinhalaText(r.district ? `, ${r.district}` : '')}</td>
                  <td style={S.td}>{sinhalaText(r.customer_name)}</td>
                  <td style={S.td}><a href={`https://wa.me/${(r.whatsapp||'').replace(/\D/g,'')}`} target="_blank" rel="noopener" style={{ color: '#2F6B4F', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>{sinhalaText(r.whatsapp)}</a></td>
                  <td style={S.td}>{sinhalaText(r.budget_range || '—')}</td>
                  <td style={S.td}><StatusBadge status={r.status} /></td>
                  <td style={{ ...S.td, textAlign: 'center', fontWeight: 700, color: NAVY }}>{sinhalaText(bidCounts[r.id] || 0)}</td>
                  <td style={S.td}>{sinhalaText(timeAgo(r.created_at))}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <select onChange={e => e.target.value && setStatus(r.id, e.target.value)} defaultValue=""
                        style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #E4E0D9', fontSize: 12, cursor: 'pointer' }}>
                        <option value="" disabled>තත්ත්වය සකසන්න…</option>
                        {sinhalaText(['pending_review','active','matched','completed'].map(s =>
                          <option key={s} value={s}>{sinhalaText(s.replace(/_/g,' '))}</option>
                        ))}
                      </select>
                      <button onClick={() => del(r.id)} style={S.btn('#FBEDEB','#C0392B')}>🗑</button>
                    </div>
                  </td>
                </tr>
              )))}
            </Table>
          </div>
          <Pagination page={page} setPage={setPage} count={count} perPage={PER} />
        </>
      ))}
    </div>
  )
}

// ─── Bids tab ─────────────────────────────────────────────────────────────────
function BidsTab() {
  const [rows, setRows]       = useState([])
  const [projects, setProjects] = useState({})
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(0)
  const [count, setCount]     = useState(0)
  const PER = 20

  const load = useCallback(async () => {
    setLoading(true)
    const { data, count: c } = await supabase.from('bids').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PER, page * PER + PER - 1)
    const bids = data || []
    setRows(bids); setCount(c || 0)

    if (bids.length > 0) {
      const ids = [...new Set(bids.map(b => b.job_id))]
      const { data: proj } = await supabase.from('projects').select('id,project_type,city').in('id', ids)
      const pm = {}; for (const p of proj || []) pm[p.id] = p
      setProjects(pm)
    }
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  async function del(id) {
    if (!confirm(sinhalaText('Delete this bid?'))) return
    await supabase.from('bids').delete().eq('id', id)
    load()
  }

  async function setStatus(id, status) {
    await supabase.from('bids').update({ status }).eq('id', id)
    load()
  }

  return (
    <div>
      <h2 style={S.h2}>මිල ගණන්</h2>
      {sinhalaText(loading ? <p style={{ color: '#8A8F95' }}>පූරණය…</p> : (
        <>
          <div style={S.card}>
            <Table
              heads={['Project','Bidder','Type','WhatsApp','Quote','Timeline','Message','Status','Date','Actions']}
              empty={rows.length === 0 ? 'No bids yet' : null}
            >
              {sinhalaText(rows.map(r => {
                const proj = projects[r.job_id]
                return (
                  <tr key={r.id}>
                    <td style={S.td}>{sinhalaText(proj ? <span>{sinhalaText(proj.project_type)}<br /><span style={{ fontSize: 11, color: '#8A8F95' }}>{sinhalaText(proj.city)}</span></span> : '—')}</td>
                    <td style={S.td}><strong>{sinhalaText(r.bidder_name)}</strong></td>
                    <td style={S.td}><span style={{ fontSize: 11, padding: '2px 7px', background: '#EFEBE4', borderRadius: 8 }}>{sinhalaText(r.bidder_type)}</span></td>
                    <td style={S.td}><a href={`https://wa.me/${(r.bidder_whatsapp||'').replace(/\D/g,'')}`} target="_blank" rel="noopener" style={{ color: '#2F6B4F', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>{sinhalaText(r.bidder_whatsapp)}</a></td>
                    <td style={S.td}>{sinhalaText(r.quote_amount ? `Rs. ${r.quote_amount.toLocaleString()}` : '—')}</td>
                    <td style={S.td}>{sinhalaText(r.timeline || '—')}</td>
                    <td style={{ ...S.td, maxWidth: 200 }}>{sinhalaText(r.message?.slice(0, 80))}{sinhalaText(r.message?.length > 80 ? '…' : '')}</td>
                    <td style={S.td}><StatusBadge status={r.status} /></td>
                    <td style={S.td}>{sinhalaText(timeAgo(r.created_at))}</td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <select onChange={e => e.target.value && setStatus(r.id, e.target.value)} defaultValue=""
                          style={{ fontSize: 11, padding: '4px 6px', borderRadius: 8, border: '1px solid #E4E0D9', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <option value="" disabled>සකසන්න…</option>
                          <option value="new">නව</option>
                          <option value="accepted">පිළිගත්</option>
                          <option value="rejected">ප්‍රතික්ෂේප කළ</option>
                        </select>
                        <button onClick={() => del(r.id)} style={S.btn('#FBEDEB','#C0392B')}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              }))}
            </Table>
          </div>
          <Pagination page={page} setPage={setPage} count={count} perPage={PER} />
        </>
      ))}
    </div>
  )
}

// ─── Reviews tab ──────────────────────────────────────────────────────────────
function ReviewsTab() {
  return <div><h2 style={S.h2}>Job reviews</h2><p>Investigate private evidence and appeals, or browse all job reviews. Every decision keeps an audit record.</p><a href="/my-jobs?moderate=1">Open review moderation →</a></div>
}

// ─── Profiles tab ─────────────────────────────────────────────────────────────
function ProfilesTab({ adminUserId }) {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [page,    setPage]    = useState(0)
  const [count,   setCount]   = useState(0)
  const [search,  setSearch]  = useState('')
  const [editProfile, setEditProfile] = useState(null)
  const [creating,    setCreating]    = useState(false)
  const PER = 20

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    let q = supabase.from('providers').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PER, page * PER + PER - 1)
    if (search.trim()) q = q.ilike('name', `%${search.trim()}%`)
    const { data, error, count: c } = await q
    if (error) {
      console.error('profiles load error:', error)
      setLoadError(error.message)
    } else {
      setRows(data || [])
      setCount(c || 0)
    }
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [search])

  async function del(id) {
    if (!confirm(sinhalaText('Permanently delete this provider profile? This cannot be undone.'))) return
    await supabase.from('providers').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ ...S.h2, marginBottom: 0 }}>පැතිකඩ</h2>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="නමින් සොයන්න…"
          style={{ padding: '7px 12px', border: '1.5px solid #E4E0D9', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', minWidth: 180 }} />
        <button onClick={() => setCreating(true)} style={{ ...S.btn('#2F6B4F'), marginLeft: 'auto' }}>
          + නව සේවා සපයන්නෙක්
        </button>
      </div>

      {sinhalaText(loadError && <p style={{ color: '#C0392B', fontSize: 13, marginBottom: 12 }}>පැතිකඩ ලබාගැනීමේ දෝෂයක්: {sinhalaText(loadError)}</p>)}
      {sinhalaText(loading ? <p style={{ color: '#8A8F95' }}>පූරණය…</p> : (
        <>
          <div style={S.card}>
            <Table
              heads={['Name','Profession','City','WhatsApp','Services','Badge','Actions']}
              empty={rows.length === 0 ? 'No providers found' : null}
            >
              {sinhalaText(rows.map(r => (
                <tr key={r.id}>
                  <td style={S.td}>
                    <strong>{sinhalaText(r.name)}</strong>
                    {sinhalaText(r.slug && <div style={{ fontSize: 10, color: '#8A8F95' }}>/{sinhalaText(r.slug)}</div>)}
                  </td>
                  <td style={S.td}>
                    <span style={{ fontSize: 10, padding: '2px 8px', background: '#F7EFE9', color: NAVY, borderRadius: 20, fontWeight: 700 }}>
                      {sinhalaText((r.provider_type || '').replace(/_/g,' '))}
                    </span>
                  </td>
                  <td style={S.td}>{sinhalaText(r.city)}{sinhalaText(r.district ? `, ${r.district}` : '')}</td>
                  <td style={S.td}>
                    <a href={`https://wa.me/${(r.whatsapp||'').replace(/\D/g,'')}`} target="_blank" rel="noopener"
                      style={{ color: '#2F6B4F', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>
                      {sinhalaText(r.whatsapp)}
                    </a>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {sinhalaText((r.services||[]).slice(0,2).map(s => (
                        <span key={s} style={{ fontSize: 10, padding: '2px 6px', background: '#F7EFE9', color: NAVY, borderRadius: 8, fontWeight: 600 }}>{sinhalaText(s)}</span>
                      )))}
                      {sinhalaText((r.services||[]).length > 2 && <span style={{ fontSize: 10, color: '#8A8F95' }}>+{sinhalaText(r.services.length-2)}</span>)}
                    </div>
                  </td>
                  <td style={S.td}><StatusBadge status={r.verification_status || 'listed'} /></td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        onClick={() => setEditProfile(r)}
                        style={S.btn(NAVY)}>✏️ සංස්කරණය</button>
                      {sinhalaText(r.slug && (
                        <a href={`/providers/${r.slug}`} target="_blank" rel="noopener"
                          style={{ ...S.btn('#EFEBE4','#3A4046'), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>🔗</a>
                      ))}
                      <button onClick={() => del(r.id)} style={S.btn('#FBEDEB','#C0392B')}>🗑</button>
                    </div>
                  </td>
                </tr>
              )))}
            </Table>
          </div>
          <Pagination page={page} setPage={setPage} count={count} perPage={PER} />
        </>
      ))}

      {sinhalaText(editProfile && (
        <ProfileModal
          profile={editProfile}
          profileType="provider"
          adminUserId={adminUserId}
          onClose={() => setEditProfile(null)}
          onSaved={() => { setEditProfile(null); load() }}
        />
      ))}

      {sinhalaText(creating && (
        <ProfileModal
          profile={null}
          profileType="provider"
          adminUserId={adminUserId}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load() }}
        />
      ))}
    </div>
  )
}

// ─── Blogs tab ────────────────────────────────────────────────────────────────
function BlogsTab() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(0)
  const [count,   setCount]   = useState(0)
  const [filter,  setFilter]  = useState('all')
  const PER = 20

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('blogs')
      .select('id,title,slug,status,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PER, page * PER + PER - 1)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, count: c } = await q
    setRows(data || [])
    setCount(c || 0)
    setLoading(false)
  }, [page, filter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [filter])

  async function del(id, title) {
    if (!confirm(sinhalaText(`"${title}" මකාදමන්නද? මෙය ආපසු හැරවිය නොහැක.`))) return
    await supabase.from('blogs').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ ...S.h2, marginBottom: 0 }}>ලිපි</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {sinhalaText(['all', 'draft', 'published', 'archived'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={S.btn(filter === f ? NAVY : '#EFEBE4', filter === f ? '#fff' : '#3A4046')}>
              {sinhalaText(f.charAt(0).toUpperCase() + f.slice(1))}
            </button>
          )))}
        </div>
        <a href="/admin/new-blog" target="_blank" rel="noopener"
          style={{ ...S.btn('#2F6B4F'), marginLeft: 'auto', textDecoration: 'none' }}>
          + නව ලිපියක්
        </a>
      </div>

      {sinhalaText(loading ? <p style={{ color: '#8A8F95' }}>පූරණය…</p> : (
        <>
          <div style={S.card}>
            <Table
              heads={['Title', 'Slug', 'Status', 'Created', 'Actions']}
              empty={rows.length === 0 ? 'No blog posts found' : null}
            >
              {sinhalaText(rows.map(r => (
                <tr key={r.id}>
                  <td style={{ ...S.td, maxWidth: 260 }}><strong>{sinhalaText(r.title)}</strong></td>
                  <td style={{ ...S.td, fontSize: 11, color: '#6B7076' }}>/blog/{sinhalaText(r.slug)}</td>
                  <td style={S.td}><StatusBadge status={r.status} /></td>
                  <td style={S.td}>{sinhalaText(timeAgo(r.created_at))}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <a href={`/admin/edit-blog/${r.id}`} target="_blank" rel="noopener"
                        style={{ ...S.btn(NAVY), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                        ✏️ සංස්කරණය
                      </a>
                      {sinhalaText(r.status === 'published' && (
                        <a href={`https://tilershub.lk/blog/${r.slug}`} target="_blank" rel="noopener"
                          style={{ ...S.btn('#EFEBE4', '#3A4046'), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                          🔗
                        </a>
                      ))}
                      <button onClick={() => del(r.id, r.title)} style={S.btn('#FBEDEB', '#C0392B')}>🗑</button>
                    </div>
                  </td>
                </tr>
              )))}
            </Table>
          </div>
          <Pagination page={page} setPage={setPage} count={count} perPage={PER} />
        </>
      ))}
    </div>
  )
}

// ─── Services tab ────────────────────────────────────────────────────────────
function ServicesTab() {
  return (
    <div>
      <h2 style={S.h2}>සේවා ({sinhalaText(SERVICES.length)})</h2>
      <Table heads={['Icon', 'Label', 'Slug', 'Link']}>
        {sinhalaText(SERVICES.map(s => (
          <tr key={s.slug}>
            <td style={S.td}>{sinhalaText(s.icon)}</td>
            <td style={S.td}>{sinhalaText(s.label)}</td>
            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11, color: '#6B7076' }}>{sinhalaText(s.slug)}</td>
            <td style={S.td}>
              <a href={`/services/${s.slug}`} target="_blank" rel="noopener" style={{ color: TERRA, fontSize: 12, fontWeight: 600 }}>/services/{sinhalaText(s.slug)} ›</a>
            </td>
          </tr>
        )))}
      </Table>
    </div>
  )
}

// ─── Categories tab ──────────────────────────────────────────────────────────
function CategoriesTab() {
  return (
    <div>
      <h2 style={S.h2}>කාණ්ඩ ({sinhalaText(CATEGORIES.length)})</h2>
      <Table heads={['Icon', 'Label', 'Slug', 'Description', 'Link']}>
        {sinhalaText(CATEGORIES.map(c => (
          <tr key={c.slug}>
            <td style={S.td}>{sinhalaText(c.icon)}</td>
            <td style={S.td}>{sinhalaText(c.label)}</td>
            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11, color: '#6B7076' }}>{sinhalaText(c.slug)}</td>
            <td style={{ ...S.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6B7076' }}>{sinhalaText(c.description || '—')}</td>
            <td style={S.td}>
              <a href={`/categories/${c.slug}`} target="_blank" rel="noopener" style={{ color: TERRA, fontSize: 12, fontWeight: 600 }}>/categories/{sinhalaText(c.slug)} ›</a>
            </td>
          </tr>
        )))}
      </Table>
    </div>
  )
}

// ─── Users tab ───────────────────────────────────────────────────────────────
function UsersTab() {
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [page, setPage]     = useState(0)
  const [count, setCount]   = useState(0)
  const PER = 25

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { data, error, count: c } = await supabase
      .from('providers')
      .select('id,name,provider_type,status,whatsapp,created_at,user_id', { count: 'exact' })
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(page * PER, page * PER + PER - 1)
    if (error) {
      setLoadError(error.message)
    } else {
      setRows(data || [])
      setCount(c || 0)
    }
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <h2 style={S.h2}>සේවා සපයන්නන් හා සම්බන්ධ පරිශීලකයන් ({sinhalaText(count)})</h2>
      {sinhalaText(loadError && <p style={{ color: '#C0392B', fontSize: 13, marginBottom: 12 }}>දෝෂය: {sinhalaText(loadError)}</p>)}
      {sinhalaText(loading ? <p style={{ color: '#8A8F95' }}>පූරණය…</p> : (
        <>
          <Table
            heads={['Name', 'Type', 'Status', 'WhatsApp', 'Joined']}
            empty={rows.length === 0 ? 'No provider-linked users found' : undefined}
          >
            {sinhalaText(rows.map(r => (
              <tr key={r.id}>
                <td style={S.td}>{sinhalaText(r.name)}</td>
                <td style={S.td}><StatusBadge status={r.provider_type} /></td>
                <td style={S.td}><StatusBadge status={r.status} /></td>
                <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11 }}>{sinhalaText(r.whatsapp || '—')}</td>
                <td style={{ ...S.td, color: '#8A8F95' }}>{sinhalaText(timeAgo(r.created_at))}</td>
              </tr>
            )))}
          </Table>
          <Pagination page={page} setPage={setPage} count={count} perPage={PER} />
        </>
      ))}
    </div>
  )
}

// ─── Analytics tab ───────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [stats, setStats] = useState(null)
  const [typeBreakdown, setTypeBreakdown] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.from('providers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('projects').select('id', { count: 'exact', head: true }),
      supabase.from('bids').select('id', { count: 'exact', head: true }),
      supabase.from('provider_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('providers').select('provider_type').eq('status', 'active'),
    ]).then(([activeP, totalProj, totalBids, pendingSubs, types]) => {
      setStats({
        activeProviders: activeP.count ?? 0,
        totalProjects:   totalProj.count ?? 0,
        totalBids:       totalBids.count ?? 0,
        pendingReview:   pendingSubs.count ?? 0,
      })
      const counts = {}
      for (const row of (types.data || [])) {
        const t = row.provider_type || 'unknown'
        counts[t] = (counts[t] || 0) + 1
      }
      setTypeBreakdown(Object.entries(counts).sort((a, b) => b[1] - a[1]))
    })
  }, [])

  const cards = stats ? [
    { label: 'Active Providers', value: stats.activeProviders, emoji: '👷', color: NAVY },
    { label: 'Total Projects',   value: stats.totalProjects,   emoji: '📋', color: '#2F6B4F' },
    { label: 'Total Bids',       value: stats.totalBids,       emoji: '💬', color: '#8E3C1E' },
    { label: 'Pending Review',   value: stats.pendingReview,   emoji: '📝', color: stats?.pendingReview > 0 ? TERRA : '#6B7076' },
  ] : []

  const maxCount = typeBreakdown[0]?.[1] || 1

  return (
    <div>
      <h2 style={S.h2}>විශ්ලේෂණ</h2>
      {sinhalaText(!stats ? <p style={{ color: '#8A8F95' }}>පූරණය…</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
            {sinhalaText(cards.map(c => (
              <div key={c.label} style={{ ...S.card, textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>{sinhalaText(c.emoji)}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: c.color }}>{sinhalaText(c.value)}</div>
                <div style={{ fontSize: 12, color: '#6B7076', marginTop: 4 }}>{sinhalaText(c.label)}</div>
              </div>
            )))}
          </div>
          {sinhalaText(typeBreakdown.length > 0 && (
            <div style={S.card}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>සේවා සපයන්නන් වර්ග අනුව</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sinhalaText(typeBreakdown.map(([type, cnt]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 140, fontSize: 12, color: '#3A4046', flexShrink: 0 }}>{sinhalaText(type.replace(/_/g, ' '))}</div>
                    <div style={{ flex: 1, background: '#EFEBE4', borderRadius: 4, height: 14, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: NAVY, borderRadius: 4, width: `${(cnt / maxCount) * 100}%` }} />
                    </div>
                    <div style={{ width: 30, fontSize: 12, fontWeight: 700, color: '#3A4046', textAlign: 'right', flexShrink: 0 }}>{sinhalaText(cnt)}</div>
                  </div>
                )))}
              </div>
            </div>
          ))}
        </>
      ))}
    </div>
  )
}

// ─── Main AdminDashboard ───────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',     label: '📊 Overview' },
  { key: 'profiles',     label: '👥 Profiles' },
  { key: 'submissions',  label: '📝 Submissions' },
  { key: 'projects',     label: '📋 Projects' },
  { key: 'bids',         label: '💬 Bids' },
  { key: 'reviews',      label: '⭐ Reviews' },
  { key: 'social_hub',   label: '📣 Social Hub', badge: 'NEW' },
  { key: 'blogs',        label: '✍️ Blogs' },
  { key: 'services',     label: '🔧 Services' },
  { key: 'categories',   label: '📂 Categories' },
  { key: 'users',        label: '👤 Users' },
  { key: 'analytics',    label: '📈 Analytics' },
]

const GOLD = '#E8B341'
const ADMIN_EMAILS = ['tilershub@gmail.com']

export default function AdminDashboard({ initialUser }) {
  const [loading,   setLoading]   = useState(!initialUser)
  const [user,      setUser]      = useState(initialUser ?? null)
  const [isAdmin,   setIsAdmin]   = useState(initialUser ? ADMIN_EMAILS.includes(initialUser.email) : null)
  const [tab,       setTab]       = useState('overview')
  const [isMobile,  setIsMobile]  = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)

  useEffect(() => {
    if (initialUser) return // server already verified auth
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
      setIsAdmin(u ? ADMIN_EMAILS.includes(u.email) : false)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u !== null) setIsAdmin(ADMIN_EMAILS.includes(u.email))
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: 'var(--th-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6B7076' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
          <p>ප්‍රවේශය පරීක්ෂා කරමින්…</p>
        </div>
      </div>
    )
  }

  if (!user) return <SignIn />

  if (!isAdmin) {
    return (
      <div style={{ minHeight: 'var(--th-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#14171A', marginBottom: 8 }}>ප්‍රවේශය අවසර නැත</h2>
          <p style={{ color: '#6B7076', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
            <strong>{sinhalaText(user.email)}</strong> පරිපාලක ගිණුමක් නොවේ.
          </p>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
            style={S.btn('#EFEBE4','#3A4046')}>ඉවත් වන්න</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...S.page, display: isMobile ? 'block' : 'flex' }}>

      {/* Desktop sidebar — hidden on mobile */}
      {sinhalaText(!isMobile && (
        <aside style={S.sidebar}>
          <div style={{ padding: '24px 20px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, marginBottom: 2 }}>වැඩ<span style={{ color: TERRA }}>HUB</span></div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: 1 }}>පරිපාලනය</div>
          </div>

          <nav style={{ flex: 1, padding: '0 10px' }}>
            {sinhalaText(TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', textAlign: 'left',
                  padding: '10px 14px', borderRadius: 10, marginBottom: 3,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: tab === t.key ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.55)',
                }}>
                <span>{sinhalaText(t.label)}</span>
                {sinhalaText(t.badge && (
                  <span style={{ fontSize: 9, fontWeight: 800, background: GOLD, color: '#14171A', padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>
                    {sinhalaText(t.badge)}
                  </span>
                ))}
              </button>
            )))}
          </nav>

          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, wordBreak: 'break-all' }}>{sinhalaText(user.email)}</div>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
              style={{ ...S.btn('rgba(255,255,255,0.1)', 'rgba(255,255,255,0.7)'), width: '100%', padding: '8px' }}>
              ඉවත් වන්න
            </button>
          </div>
        </aside>
      ))}

      <main style={{
        ...S.main,
        padding: isMobile ? '16px 14px' : '28px 32px',
        paddingBottom: isMobile ? 72 : undefined,
      }}>
        {sinhalaText(tab === 'overview'    && <OverviewTab />)}
        {sinhalaText(tab === 'profiles'    && <ProfilesTab adminUserId={user.id} />)}
        {sinhalaText(tab === 'submissions' && <SubmissionsTab />)}
        {sinhalaText(tab === 'projects'    && <ProjectsTab />)}
        {sinhalaText(tab === 'bids'        && <BidsTab />)}
        {sinhalaText(tab === 'reviews'     && <ReviewsTab />)}
        {sinhalaText(tab === 'social_hub'  && <SocialHub />)}
        {sinhalaText(tab === 'blogs'       && <BlogsTab />)}
        {sinhalaText(tab === 'services'    && <ServicesTab />)}
        {sinhalaText(tab === 'categories'  && <CategoriesTab />)}
        {sinhalaText(tab === 'users'       && <UsersTab />)}
        {sinhalaText(tab === 'analytics'   && <AnalyticsTab />)}
      </main>

      {/* Mobile bottom nav bar — replaces sidebar on small screens */}
      {sinhalaText(isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: NAVY, display: 'flex', overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '6px 4px', gap: 2,
          boxShadow: '0 -2px 16px rgba(0,0,0,0.2)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {sinhalaText(TABS.map(t => {
            const parts = t.label.split(' ')
            const icon = parts[0]
            const label = parts.slice(1).join(' ')
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: tab === t.key ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.45)',
              }}>
                <span style={{ fontSize: 17 }}>{sinhalaText(icon)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>{sinhalaText(label)}</span>
              </button>
            )
          }))}
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
            style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'rgba(255,255,255,0.35)',
            }}>
            <span style={{ fontSize: 17 }}>↩</span>
            <span style={{ fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>පිටවන්න</span>
          </button>
        </nav>
      ))}
    </div>
  )
}
