import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useRef } from 'react'
import { supabase, DISTRICTS_EN } from '../lib/supabase.js'

// ─── Constants (module scope — no remount on typing) ──────────────────────────

import { SERVICES as SERVICE_CATALOG } from '../lib/services.js'
const ALL_SERVICES = SERVICE_CATALOG.map(s => s.label)

function lbl(text) {
  return { display: 'block', fontSize: 11, fontWeight: 700, color: '#3A4046', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }
}

function inp(hasError) {
  return {
    width: '100%', padding: '10px 13px',
    border: `1.5px solid ${hasError ? '#E3A199' : '#EAE4D7'}`,
    borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit',
    background: hasError ? '#FBEDEB' : '#fff', boxSizing: 'border-box',
  }
}

function Field({ label, error, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={lbl(label)}>{sinhalaText(label)}</label>
      {sinhalaText(children)}
      {sinhalaText(hint && !error && <p style={{ fontSize: 11, color: '#8A8F95', marginTop: 4, lineHeight: 1.5 }}>{sinhalaText(hint)}</p>)}
      {sinhalaText(error && <p style={{ fontSize: 11, color: '#C0392B', marginTop: 4 }}>⚠ {sinhalaText(error)}</p>)}
    </div>
  )
}

function Chip({ label, checked, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: `1.5px solid ${checked ? '#0B2A4A' : '#EAE4D7'}`,
      background: checked ? '#F7F3E8' : '#fff',
      color: checked ? '#0B2A4A' : '#6B7076',
      transition: 'all 0.15s',
    }}>
      {sinhalaText(checked ? '✓ ' : '')}{sinhalaText(label)}
    </button>
  )
}

function ServiceTextInput({ value, onChange }) {
  const [text, setText] = useState('')
  function add() {
    const s = text.trim()
    if (s && !value.includes(s)) onChange([...value, s])
    setText('')
  }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        placeholder="සේවාවක් එකතු කරන්න…"
        style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #EAE4D7', borderRadius: 10, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
      <button type="button" onClick={add} style={{ padding: '8px 14px', background: '#F7F3E8', color: '#0B2A4A', border: '1.5px solid #EAE4D7', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ එකතු</button>
    </div>
  )
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

  const height = aspect === 'cover' ? 140 : 110

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={lbl(label)}>{sinhalaText(label)}</div>
      <div onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}
        style={{ position: 'relative', height, borderRadius: 12, border: `2px dashed ${dragging ? '#0B2A4A' : '#D6D0C6'}`, background: dragging ? '#F7F3E8' : preview ? '#000' : '#FAF8F2', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
        {sinhalaText(preview ? (
          <>
            <img src={preview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
            <div style={{ position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 600 }}>වෙනස් කිරීමට ක්ලික් කරන්න</div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#8A8F95', pointerEvents: 'none' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{sinhalaText(aspect === 'cover' ? '🖼️' : '👤')}</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>ක්ලික් කරන්න හෝ ඇද දමන්න</div>
            <div style={{ fontSize: 10, marginTop: 2 }}>JPG, PNG, WebP · උපරිම 5 MB</div>
          </div>
        ))}
      </div>
      {sinhalaText(hint && <p style={{ fontSize: 11, color: '#8A8F95', marginTop: 4, lineHeight: 1.5 }}>{sinhalaText(hint)}</p>)}
      <input ref={ref} type="file" accept="image/*" onChange={e => handle(e.target.files[0])} style={{ display: 'none' }} />
    </div>
  )
}

const MAX_GALLERY = 8

function GalleryEditor({ existing, newFiles, onNewFiles, onRemoveExisting }) {
  const ref = useRef(null)

  function addFiles(files) {
    const combined = [...newFiles, ...Array.from(files)].slice(0, MAX_GALLERY - existing.length)
    onNewFiles(combined)
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={lbl('ව්‍යාපෘති ගැලරිය')}> ව්‍යාපෘති ගැලරිය <span style={{ fontSize: 10, color: '#8A8F95', textTransform: 'none', fontWeight: 400 }}>(ඡායාරූප {sinhalaText(MAX_GALLERY)}ක් දක්වා)</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 8, marginBottom: 8 }}>
        {sinhalaText(existing.map((url, i) => (
          <div key={url} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid #EAE4D7' }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button type="button" onClick={() => onRemoveExisting(i)} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        )))}
        {sinhalaText(newFiles.map((f, i) => (
          <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid #C6DDCF' }}>
            <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button type="button" onClick={() => onNewFiles(newFiles.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        )))}
        {sinhalaText((existing.length + newFiles.length) < MAX_GALLERY && (
          <div onClick={() => ref.current?.click()} style={{ aspectRatio: '1', borderRadius: 10, border: '2px dashed #D6D0C6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#FAF8F2', gap: 4 }}>
            <span style={{ fontSize: 20, color: '#8A8F95' }}>+</span>
            <span style={{ fontSize: 10, color: '#8A8F95' }}>එකතු</span>
          </div>
        ))}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple onChange={e => addFiles(e.target.files)} style={{ display: 'none' }} />
      <p style={{ fontSize: 11, color: '#8A8F95', margin: 0 }}>JPG/PNG/WebP. ඔබේ හොඳම කාර්ය ඉදිරිපත් කරන්න.</p>
    </div>
  )
}

async function uploadImage(file, folder, userId) {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('provider-assets').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('provider-assets').getPublicUrl(path)
  return data.publicUrl
}

export default function ProfileEditor({ profile, profileType, userId }) {
  const isTiler = profileType === 'tiler'
  const table = isTiler ? 'tilers' : 'providers'

  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  // Form state — initialised from profile
  const [name, setName]           = useState(isTiler ? (profile.full_name || '') : (profile.name || ''))
  const [whatsapp, setWhatsapp]   = useState(profile.whatsapp || '')
  const [city, setCity]           = useState(profile.city || '')
  const [district, setDistrict]   = useState(profile.district || '')
  const [bio, setBio]             = useState(isTiler ? (profile.bio || '') : (profile.description || ''))
  const [services, setServices]   = useState(profile.services || [])
  const [serviceAreas, setServiceAreas] = useState(profile.service_areas || [])
  const [expYears, setExpYears]   = useState(profile.experience_years || '')
  const [rateMin, setRateMin]     = useState(profile.daily_rate_min || '')
  const [rateMax, setRateMax]     = useState(profile.daily_rate_max || '')
  const [website, setWebsite]     = useState(profile.website_url || '')
  const [existingGallery, setExistingGallery] = useState(profile.gallery || [])
  const [newGalleryFiles, setNewGalleryFiles] = useState([])

  // Image file states (null = no change)
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [coverImageFile, setCoverImageFile]     = useState(null)

  function toggleArr(arr, setArr, val) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  // Current display values for the summary view
  const displayName  = isTiler ? (profile.full_name || 'Profile') : (profile.name || 'Profile')
  const displayImg   = isTiler ? profile.avatar_url : profile.profile_image
  const profilePath  = profile.slug
    ? (isTiler ? `/tilers/${profile.slug}` : `/providers/${profile.slug}`)
    : null

  async function save() {
    setSaving(true); setSaveErr('')
    try {
      let profileImageUrl = undefined
      let coverImageUrl   = undefined
      const newGalleryUrls = []

      if (profileImageFile) {
        profileImageUrl = await uploadImage(profileImageFile, 'profiles', userId)
      }
      if (coverImageFile) {
        coverImageUrl = await uploadImage(coverImageFile, 'covers', userId)
      }
      for (const f of newGalleryFiles) {
        newGalleryUrls.push(await uploadImage(f, 'portfolio', userId))
      }

      const payload = {
        [isTiler ? 'full_name' : 'name']: name.trim(),
        whatsapp: whatsapp.replace(/\s/g, ''),
        city: city.trim(),
        district: district || null,
        [isTiler ? 'bio' : 'description']: bio.trim() || null,
        services: services.length ? services : null,
        service_areas: serviceAreas.length ? serviceAreas : null,
        gallery: [...existingGallery, ...newGalleryUrls],
      }

      if (isTiler) {
        if (expYears) payload.experience_years = parseInt(expYears, 10)
        if (rateMin)  payload.daily_rate_min   = parseInt(rateMin, 10)
        if (rateMax)  payload.daily_rate_max   = parseInt(rateMax, 10)
        if (profileImageUrl !== undefined) payload.avatar_url   = profileImageUrl
        if (coverImageUrl   !== undefined) payload.cover_image  = coverImageUrl
      } else {
        if (website) payload.website_url = website.trim()
        if (profileImageUrl !== undefined) payload.profile_image = profileImageUrl
        if (coverImageUrl   !== undefined) payload.cover_image   = coverImageUrl
      }

      const { error } = await supabase.from(table).update(payload).eq('id', profile.id).eq('user_id', userId)
      if (error) throw error

      setSaved(true)
      setEditing(false)
      setNewGalleryFiles([])
    } catch (e) {
      setSaveErr(e?.message || 'ගැටළුවක් ඇති විය. නැවත උත්සාහ කරන්න.')
    } finally {
      setSaving(false)
    }
  }

  // ── Summary (non-editing) ──────────────────────────────────────────────────
  if (!editing) {
    return (
      <div style={{ background: '#fff', border: '1px solid #EAE4D7', borderRadius: 16, padding: 24 }}>
        {sinhalaText(saved && (
          <div style={{ padding: '10px 14px', background: '#E9F1EC', border: '1px solid #C6DDCF', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#285C43', fontWeight: 600 }}>✓ පැතිකඩ යාවත්කාලීන විය!</span>
            {sinhalaText(profilePath && (
              <a href={profilePath} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#0B2A4A', fontWeight: 700, textDecoration: 'none' }}>පැතිකඩ →</a>
            ))}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: '#0B2A4A', border: '2px solid #EAE4D7', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff' }}>
            {sinhalaText(displayImg
              ? <img src={displayImg} alt={sinhalaText(displayName)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase())
            }
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#071827' }}>{sinhalaText(displayName)}</div>
            <div style={{ fontSize: 12, color: '#6B7076', marginTop: 2 }}>
              {sinhalaText(isTiler ? 'ටයිලර්' : 'සේවා සපයන්නා')} · {sinhalaText(profile.city || '—')}
            </div>
            {sinhalaText(profilePath && (
              <a href={profilePath} target="_blank" rel="noopener" style={{ fontSize: 11, color: '#0B2A4A', fontWeight: 600, textDecoration: 'none' }}>
                පොදු පැතිකඩ →
              </a>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => { setEditing(true); setSaved(false) }}
            style={{ padding: '10px 22px', background: '#0B2A4A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ✏️ පැතිකඩ සංස්කරණය
          </button>
          {sinhalaText(profilePath && (
            <a href={profilePath} target="_blank" rel="noopener"
              style={{ padding: '10px 18px', background: '#F7F3E8', color: '#3A4046', border: '1px solid #EAE4D7', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              🔗 පැතිකඩ
            </a>
          ))}
        </div>
      </div>
    )
  }

  // ── Editing form ───────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#fff', border: '1px solid #EAE4D7', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h3 style={{ fontFamily: "var(--th-display)", fontSize: 18, fontWeight: 700, color: '#071827', margin: 0 }}>පැතිකඩ සංස්කරණය</h3>
        <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', color: '#8A8F95', fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
      </div>

      {/* Images */}
      {sinhalaText(!isTiler ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
          <ImageUploadBox label="පැතිකඩ ඡායාරූපය" hint="ඔබේ ඡායාරූපය හෝ ලාංඡනය" aspect="profile"
            value={isTiler ? profile.avatar_url : profile.profile_image}
            onChange={setProfileImageFile} />
          <ImageUploadBox label="කවර රූපය" hint="ඔබේ පැතිකඩ ඉහලින් පෙන්වන රූපය" aspect="cover"
            value={profile.cover_image} onChange={setCoverImageFile} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
          <ImageUploadBox label="පැතිකඩ ඡායාරූපය" hint="කාඩ් මත පෙන්වන ඔබේ ඡායාරූපය" aspect="profile"
            value={profile.avatar_url} onChange={setProfileImageFile} />
          <ImageUploadBox label="කවර රූපය" hint="ඔබේ කාඩ් සහ පැතිකඩ ඉහලින් පෙන්වන රූපය" aspect="cover"
            value={profile.cover_image} onChange={setCoverImageFile} />
        </div>
      ))}

      {/* Name */}
      <Field label={isTiler ? 'සම්පූර්ණ නම' : 'නම / ව්‍යාපාරය'}>
        <input value={name} onChange={e => setName(e.target.value)} style={inp(false)} placeholder={sinhalaText(isTiler ? 'ඔබේ සම්පූර්ණ නම' : 'ඔබේ නම හෝ ව්‍යාපාර නාමය')} />
      </Field>

      {/* City + District */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="නගරය / ගම">
          <input value={city} onChange={e => setCity(e.target.value)} style={inp(false)} placeholder="නිදා: නුගේගොඩ" />
        </Field>
        <Field label="දිස්ත්‍රික්කය">
          <select value={district} onChange={e => setDistrict(e.target.value)} style={{ ...inp(false), WebkitAppearance: 'none', cursor: 'pointer' }}>
            <option value="">දිස්ත්‍රික්කය තෝරන්න…</option>
            {sinhalaText(DISTRICTS_EN.map(d => <option key={d} value={d}>{sinhalaText(d)}</option>))}
          </select>
        </Field>
      </div>

      {/* WhatsApp */}
      <Field label="WhatsApp අංකය" hint="ගනුදෙනුකරුවන් ඔබ හා සම්බන්ධ වේ">
        <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={inp(false)} placeholder="+94771234567" type="tel" />
      </Field>

      {/* Bio / Description */}
      <Field label={isTiler ? 'ජීව කතාව' : 'විස්තරය'} hint="ඔබේ අත්දැකීම් සහ විශේෂත්වය විස්තර කරන්න">
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
          placeholder={sinhalaText(isTiler ? 'ව්‍යාපෘති, විශේෂීකරණ, ප්‍රදේශ...' : 'සේවාවන්, කණ්ඩායම සහ ඔබේ විශේෂත්වය...')}
          style={{ ...inp(false), resize: 'vertical' }} />
      </Field>

      {/* Tiler-specific */}
      {sinhalaText(isTiler && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Field label="අත්දැකීම් (වසර)">
            <input value={expYears} onChange={e => setExpYears(e.target.value)} style={inp(false)} placeholder="නිදා: 8" type="number" min="0" />
          </Field>
          <Field label="අඩු ගාස්තු (රු/sqft)">
            <input value={rateMin} onChange={e => setRateMin(e.target.value)} style={inp(false)} placeholder="නිදා: 180" type="number" min="0" />
          </Field>
          <Field label="වැඩි ගාස්තු (රු/sqft)">
            <input value={rateMax} onChange={e => setRateMax(e.target.value)} style={inp(false)} placeholder="නිදා: 300" type="number" min="0" />
          </Field>
        </div>
      ))}

      {/* Website (providers only) */}
      {sinhalaText(!isTiler && (
        <Field label="වෙබ් URL" hint="අවශ්‍ය නම">
          <input value={website} onChange={e => setWebsite(e.target.value)} style={inp(false)} placeholder="https://yoursite.lk" type="url" />
        </Field>
      ))}

      {/* Services */}
      <Field label="ඔබ සපයන සේවාවන්" hint="අදාළ ඒවා සියල්ල තෝරන්න — හෝ ඔබේම සේවාව ලියන්න">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
          {sinhalaText(ALL_SERVICES.map(s => (
            <Chip key={s} label={s} checked={services.includes(s)} onClick={() => toggleArr(services, setServices, s)} />
          )))}
        </div>
        <ServiceTextInput value={services} onChange={setServices} />
      </Field>

      {/* Service Areas */}
      <Field label="සේවා ප්‍රදේශ" hint="ඔබ ආවරණය කරන දිස්ත්‍රික්ක">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {sinhalaText(DISTRICTS_EN.map(d => (
            <Chip key={d} label={d} checked={serviceAreas.includes(d)} onClick={() => toggleArr(serviceAreas, setServiceAreas, d)} />
          )))}
        </div>
      </Field>

      {/* Gallery */}
      <GalleryEditor
        existing={existingGallery}
        newFiles={newGalleryFiles}
        onNewFiles={setNewGalleryFiles}
        onRemoveExisting={i => setExistingGallery(existingGallery.filter((_, j) => j !== i))}
      />

      {sinhalaText(saveErr && (
        <div style={{ padding: '10px 14px', background: '#FBEDEB', border: '1px solid #F2C9C3', borderRadius: 10, fontSize: 13, color: '#C0392B', marginBottom: 16 }}>
          ⚠ {sinhalaText(saveErr)}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={save} disabled={saving}
          style={{ flex: 1, padding: '13px', background: saving ? '#8A8F95' : '#0B2A4A', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
          {sinhalaText(saving ? '⏳ සුරකිමින්…' : '💾 වෙනස්කම් සුරකින්න')}
        </button>
        <button onClick={() => setEditing(false)} disabled={saving}
          style={{ padding: '13px 20px', background: '#F7F3E8', color: '#3A4046', border: '1px solid #EAE4D7', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          අවලංගු කරන්න
        </button>
      </div>
    </div>
  )
}
