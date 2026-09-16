import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect, useRef } from 'react'
import { supabase, buildWhatsAppLink, DISTRICTS, DISTRICTS_EN, PROVIDER_TYPES, VERIFICATION_BADGES } from '../lib/supabase.js'
import CoverImage from './CoverImage.jsx'

// ─── Translations ──────────────────────────────────────────────────────────────
const TRANS = {
  en: {
    searchPh: 'Search by name, service...',
    allDistricts: 'All Districts',
    all: 'All',
    professionalsOpt: '👷 Professionals',
    contractorsOpt: '🏗️ Contractors',
    suppliersOpt: '🏪 Suppliers',
    clear: label => label ? `✕ Clear (${label})` : '✕ Clear',
    found: n => `${n} found`,
    loading: 'Loading providers...',
    noResults: 'No results found',
    noResultsHint: 'Try adjusting your filters or search term',
    clearSearch: 'Clear Search',
    browseAll: 'Browse All',
    verified: '🛡️ Verified',
    community: 'Community',
    from: 'From',
    yrsExp: 'Yrs Experience',
    yearsExpLabel: 'Years Exp.',
    jobsDoneLabel: 'Jobs Done',
    perSqftLabel: 'Per sq.ft',
    reviewsLabel: n => `${n} reviews`,
    servicesLabel: 'Services',
    portfolioLabel: 'Portfolio',
    serviceAreasLabel: 'Service Areas',
    viewProfile: 'View Profile',
    viewShop: 'View Shop ›',
    whatsapp: '💬 WhatsApp',
    call: '📞 Call',
    altNumber: '💬 Alt. Number',
    skilled: '✓ Skilled',
    unverified: 'Unverified',
    unverifiedNotice: 'ℹ️ This profile was added from community-submitted information and has not yet been verified by වැඩHUB.',
    communityProfile: 'Community-submitted profile — not yet verified by වැඩHUB.',
    noTypeListed: type => `No ${type} listed yet`,
    noTypeHint: type => `We're onboarding ${type.toLowerCase()} now. Be the first to list yours — free, direct WhatsApp leads.`,
    joinAs: type => `✅ Join as ${type.replace(/s$/, '')}`,
    whatTheyDo: type => `What ${type} Do`,
    otherProviders: '🏪 Other Providers',
    seeAll: 'See all →',
    topRated: '⭐ Top Rated',
    dayLabel: '/day',
  },
  si: {
    searchPh: 'නමින්, සේවාවෙන් සොයන්න...',
    allDistricts: 'සියලු දිස්ත්‍රික්ක',
    all: 'සියල්ල',
    professionalsOpt: '👷 වෘත්තිකයෝ',
    contractorsOpt: '🏗️ කොන්ත්‍රාත්කරුවන්',
    suppliersOpt: '🏪 සැපයුම්කරුවන්',
    clear: label => label ? `✕ ඉවත් (${label})` : '✕ ඉවත් කරන්න',
    found: n => `${n} ක් හමු විය`,
    loading: 'පූරණය කරමින්…',
    noResults: 'ප්‍රතිඵල නොමැත',
    noResultsHint: 'ෆිල්ටර හෝ සෙවුම් යෙදුම වෙනස් කරන්න',
    clearSearch: 'සෙවුම ඉවත් කරන්න',
    browseAll: 'සියල්ල බලන්න',
    verified: '🛡️ සත්‍යාපිත',
    community: 'ප්‍රජා',
    from: 'සිට',
    yrsExp: 'වසර අත්දැකීම',
    yearsExpLabel: 'අත්දැකීම (වසර)',
    jobsDoneLabel: 'සේවා ගණන',
    perSqftLabel: 'sq.ft. ට',
    reviewsLabel: n => `සමාලෝචන ${n}`,
    servicesLabel: 'සේවාවන්',
    portfolioLabel: 'ගැලරිය',
    serviceAreasLabel: 'සේවා ප්‍රදේශ',
    viewProfile: 'පැතිකඩ බලන්න',
    viewShop: 'සාප්පුව බලන්න ›',
    whatsapp: '💬 WhatsApp',
    call: '📞 ඇමතීම',
    altNumber: '💬 වෙනත් අංකය',
    skilled: '✓ දක්ෂ',
    unverified: 'සත්‍යාපිත නොවේ',
    unverifiedNotice: 'ℹ️ මෙම ගොනුව ප්‍රජාව ඉදිරිපත් කළ තොරතුරු ආශ්‍රිතව වැඩHUB විසින් තවම සත්‍යාපනය කර නොමැත.',
    communityProfile: 'ප්‍රජා-ඉදිරිපත් ගොනුව — වැඩHUB විසින් තවම සත්‍යාපනය කර නොමැත.',
    noTypeListed: type => `${type} ලැයිස්තු ගත නොවේ`,
    noTypeHint: () => 'නොමිලේ ලැයිස්තු කරන්න. WhatsApp ඇමතුම් ලබාගන්න.',
    joinAs: type => `✅ ${type} ලෙස එකතු වන්න`,
    whatTheyDo: type => `${type} කරන දේ`,
    otherProviders: '🏪 වෙනත් සේවා සපයන්නන්',
    seeAll: 'සියල්ල →',
    topRated: '⭐ ඉහළ ශ්‍රේණිය',
    dayLabel: 'දිනකට',
  },
}

const TYPE_LABELS_EN = { tiler: 'Professionals', contractor: 'Contractors', supplier: 'Suppliers' }
const TYPE_LABELS_SI = { tiler: 'වෘත්තිකයෝ', contractor: 'කොන්ත්‍රාත්කරුවන්', supplier: 'සැපයුම්කරුවන්' }

// ─── Shared helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#8A6224','#8A6224','#6B4A18','#8A6224','#2F6B4F','#8A6224','#285C43','#8A6224']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function initials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'TH'
}

const VERIFIED_STATUSES = new Set(['th_master', 'th_certified_pro', 'th_verified', 'verified'])

function VerificationBadge({ status }) {
  const b = VERIFICATION_BADGES[status] || VERIFICATION_BADGES.listed
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: b.bg, color: b.color, border: `1px solid ${b.color}30` }}>
      {sinhalaText(status === 'th_master' ? '★' : status === 'th_certified_pro' ? '✦' : status === 'th_verified' ? '✓' : '·')} {sinhalaText(b.label)}
    </span>
  )
}

// ─── Provider type config ───────────────────────────────────────────────────────
const PROVIDER_TYPE_DISPLAY = {
  tiler:        { label: 'Professional'  },
  contractor:   { label: 'Contractor'    },
  tile_shop:    { label: 'Tile Shop'     },
  supplier:     { label: 'Supplier'      },
  workshop:     { label: 'Workshop'      },
  brand_dealer: { label: 'Brand Dealer'  },
  bathroom_shop:{ label: 'Bathroom Shop' },
  tool_supplier:{ label: 'Tool Supplier' },
}

// Shop types use Card 2 (landscape); all others use Card 1 (portrait)
const SHOP_TYPES = new Set(['tile_shop', 'supplier', 'workshop', 'brand_dealer', 'bathroom_shop', 'tool_supplier'])

// Feature icons shown in shop cards — auto-generated per type
const TYPE_FEATURES = {
  tile_shop:     [{icon:'🔲',label:'Wide Variety'},{icon:'💎',label:'Premium Quality'},{icon:'💰',label:'Best Prices'},{icon:'🚚',label:'Quick Supply'}],
  bathroom_shop: [{icon:'🛁',label:'Complete Range'},{icon:'✦',label:'Premium Brands'},{icon:'🎯',label:'Expert Guidance'},{icon:'✅',label:'Quality Assured'}],
  supplier:      [{icon:'📦',label:'Bulk Supply'},{icon:'💰',label:'Trade Pricing'},{icon:'🚚',label:'Fast Delivery'},{icon:'✅',label:'Quality Assured'}],
  workshop:      [{icon:'✂️',label:'Precision Cut'},{icon:'⚡',label:'Fast Turnaround'},{icon:'🔧',label:'Custom Orders'},{icon:'🏷️',label:'Trade Ready'}],
  brand_dealer:  [{icon:'✦',label:'Authentic'},{icon:'🛡️',label:'Warranty Backed'},{icon:'💡',label:'Expert Guidance'},{icon:'🚚',label:'Island Wide'}],
  tool_supplier: [{icon:'🔧',label:'Pro Equipment'},{icon:'🏷️',label:'Trade Pricing'},{icon:'📦',label:'In Stock'},{icon:'🚚',label:'Fast Delivery'}],
}
const DEFAULT_FEATURES = [{icon:'✅',label:'Verified'},{icon:'💯',label:'Quality'},{icon:'📍',label:'Local'},{icon:'💬',label:'WhatsApp'}]

// ProviderCard routes to the correct card design based on provider_type
function ProviderCard({ provider, onClick, T, savedIds, savingId, onToggleSave }) {
  if (SHOP_TYPES.has(provider.provider_type)) {
    return <ShopCard provider={provider} onClick={onClick} T={T} savedIds={savedIds} savingId={savingId} onToggleSave={onToggleSave} />
  }
  return <ContractorCard provider={provider} onClick={onClick} T={T} savedIds={savedIds} savingId={savingId} onToggleSave={onToggleSave} />
}

function SaveHeartButton({ providerId, savedIds, savingId, onToggleSave }) {
  const isSaved = savedIds.has(providerId)
  const isLoading = savingId === providerId
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggleSave(providerId) }}
      disabled={isLoading}
      style={{
        display:'inline-flex', alignItems:'center', gap:4,
        fontSize:11, fontWeight:700, padding:'5px 10px', borderRadius:8,
        border: isSaved ? '1px solid #F2C9C3' : '1px solid #E2E2E2',
        background: isSaved ? '#FBEDEB' : '#F7F7F7',
        color: isSaved ? '#8A6224' : '#8C8C8C',
        cursor: isLoading ? 'wait' : 'pointer',
        transition:'all 0.15s',
      }}
    >
      {sinhalaText(isLoading ? '…' : isSaved ? '♥ Saved' : '♡ Save')}
    </button>
  )
}

// ─── Shop card ─────────────────────────────────────────────────────────────────
const BATH_KWS = ['bathroom', 'sanitary', 'bathware', 'faucet', 'vanity', 'shower', 'basin', 'toilet', 'bathtub']
const TILE_KWS = ['tile', 'floor', 'wall', 'mosaic', 'porcelain', 'ceramic', 'granite', 'marble']

function shopTagline(type, services) {
  const s = (services || []).join(' ').toLowerCase()
  const hasTile = TILE_KWS.some(k => s.includes(k))
  const hasBath = BATH_KWS.some(k => s.includes(k))
  if (hasTile && hasBath) return 'Tiles & Bathware'
  if (type === 'bathroom_shop') return hasTile ? 'Tiles & Bathware' : 'Bathware Specialist'
  if (type === 'brand_dealer') return 'Authorised Brand Dealer'
  return hasBath ? 'Tiles & Bathware' : 'Tile Showroom'
}

function ShopCard({ provider, onClick, T, savedIds, savingId, onToggleSave }) {
  const waPhone = provider.whatsapp || provider.phone
  const waLink = waPhone ? buildWhatsAppLink(waPhone, provider.name) : null
  const tagline = shopTagline(provider.provider_type, provider.services)
  const coverImg = provider.cover_image && !provider.cover_image.includes('picsum') ? provider.cover_image : null
  const rating = provider.avg_rating
  const reviewCount = provider.review_count || 0
  const features = TYPE_FEATURES[provider.provider_type] || DEFAULT_FEATURES
  const isFeatured = provider.is_featured
  const isVerified = VERIFIED_STATUSES.has(provider.verification_status)

  return (
    <div
      onClick={() => provider.slug ? (window.location.href = `/providers/${provider.slug}`) : onClick(provider)}
      style={{ background: '#fff', border: '1px solid #E2E2E2', borderRadius: 20, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'all 0.2s' }}
      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)' }}
      onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* Main row: image left + content right */}
      <div style={{ display: 'flex', minHeight: 168 }}>
        {/* Left image panel */}
        <div style={{ width: '42%', flexShrink: 0, position: 'relative', background: '#E2E2E2' }}>
          <CoverImage src={coverImg} alt={sinhalaText(provider.name)} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} fallback={(
            <div style={{ width: '100%', height: '100%', background: '#ECECEC', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 19px,#E2E2E2 19px,#E2E2E2 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,#E2E2E2 19px,#E2E2E2 20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 34, opacity: 0.15 }}>🏪</span>
            </div>
          )} />
          {/* Badge top-left */}
          {sinhalaText((isFeatured || isVerified) && (
            <div style={{ position: 'absolute', top: 9, left: 9, background: isFeatured ? '#D4A15E' : 'rgba(22,163,74,0.92)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.25)', whiteSpace: 'nowrap' }}>
              {sinhalaText(isFeatured ? '⭐ Top Rated' : '✓ Verified')}
            </div>
          ))}
        </div>

        {/* Right content panel */}
        <div style={{ flex: 1, padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#8C8C8C', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 }}>{sinhalaText(tagline)}</div>
          <div style={{ fontFamily: "var(--th-display)", fontSize: 15, fontWeight: 700, color: '#0B0B0B', lineHeight: 1.2, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sinhalaText(provider.name)}</div>
          {sinhalaText(rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 12 }}>⭐</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#242424' }}>{sinhalaText(Number(rating).toFixed(1))}</span>
              {sinhalaText(reviewCount > 0 && <span style={{ fontSize: 10, color: '#8C8C8C' }}>({sinhalaText(T.reviewsLabel(reviewCount))})</span>)}
            </div>
          ))}
          {sinhalaText(provider.description && (
            <p style={{ fontSize: 11, color: '#6E6E6E', lineHeight: 1.55, margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sinhalaText(provider.description)}</p>
          ))}
          {/* 2×2 feature icons grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 'auto' }}>
            {sinhalaText(features.map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F7F7F7', border: '1px solid #ECECEC', borderRadius: 8, padding: '5px 7px' }}>
                <span style={{ fontSize: 13 }}>{sinhalaText(f.icon)}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#4A4A4A' }}>{sinhalaText(f.label)}</span>
              </div>
            )))}
          </div>
        </div>
      </div>

      {/* Bottom strip: location + Save + View Shop button */}
      <div style={{ borderTop: '1px solid #ECECEC', padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F7F7F7', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#6E6E6E', flexShrink: 0 }}>📍 {sinhalaText(provider.city || provider.district || 'Sri Lanka')}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {sinhalaText(onToggleSave && <SaveHeartButton providerId={provider.id} savedIds={savedIds} savingId={savingId} onToggleSave={onToggleSave} />)}
          {sinhalaText(provider.slug ? (
            <a href={`/providers/${provider.slug}`} onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, fontWeight: 700, background: '#0B0B0B', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {sinhalaText(T.viewShop)} ›
            </a>
          ) : waLink ? (
            <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, fontWeight: 700, background: '#0B0B0B', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {sinhalaText(T.viewShop)} ›
            </a>
          ) : null)}
        </div>
      </div>
    </div>
  )
}

// ─── Tiler card (Card 1 — portrait, full-width image at top) ──────────────────
function TilerCard({ tiler, onClick, T, savedIds, savingId, onToggleSave }) {
  const isVerified = tiler.is_verified
  const color = avatarColor(tiler.full_name)
  const inits = initials(tiler.full_name)
  const phone = tiler.whatsapp || tiler.phone
  const coverSrc = (tiler.gallery || [])[0] || tiler.avatar_url

  return (
    <div
      onClick={() => tiler.slug ? (window.location.href = `/providers/${tiler.slug}`) : onClick(tiler)}
      style={{ background: '#fff', borderRadius: 20, border: '1px solid #E2E2E2', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s,transform 0.2s' }}
      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.12)' }}
      onMouseOut={e  => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* Full-width cover image at top */}
      <div style={{ height: 160, position: 'relative', overflow: 'hidden', background: color }}>
        {sinhalaText(coverSrc
          ? <img src={coverSrc} alt={sinhalaText(tiler.full_name)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 52, fontWeight: 800, color: 'rgba(255,255,255,0.75)' }}>{sinhalaText(inits)}</span>
            </div>)
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.02) 60%, rgba(0,0,0,0.2) 100%)' }} />
        {sinhalaText(isVerified && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: '#2F6B4F', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.22)' }}>
            ✓ සත්‍යාපිත
          </div>
        ))}
      </div>

      {/* Content below image */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#6E6E6E', fontWeight: 600 }}>වෘත්තිකයා</span>
          {sinhalaText(tiler.daily_rate_min > 0 && (
            <span style={{ fontSize: 12, color: '#6E6E6E' }}>{sinhalaText(T.from)} <span style={{ fontSize: 15, fontWeight: 800, color: '#0B0B0B' }}>රු.{sinhalaText(tiler.daily_rate_min)}</span>/{sinhalaText(T.dayLabel)}</span>
          ))}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0B0B0B', marginBottom: 5, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{sinhalaText(tiler.full_name)}</div>
        {sinhalaText(tiler.avg_rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <span>⭐</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#242424' }}>{sinhalaText(Number(tiler.avg_rating).toFixed(1))}</span>
            {sinhalaText(tiler.review_count > 0 && <span style={{ fontSize: 12, color: '#8C8C8C' }}>({sinhalaText(T.reviewsLabel(tiler.review_count))})</span>)}
          </div>
        ))}
        {sinhalaText(tiler.bio && (
          <div style={{ fontSize: 13, color: '#6E6E6E', lineHeight: 1.65, marginBottom: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {sinhalaText(tiler.bio)}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #ECECEC', paddingTop: 12, flexWrap: 'wrap' }}>
          {sinhalaText(tiler.experience_years > 0 && (
            <span style={{ fontSize: 11, color: '#4A4A4A', flexShrink: 0 }}><span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> {sinhalaText(tiler.experience_years)}+ {sinhalaText(T.yrsExp)}</span>
          ))}
          {sinhalaText((tiler.city || tiler.district) && (
            <span style={{ fontSize: 11, color: '#4A4A4A', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>📍 {sinhalaText(tiler.city || tiler.district)}</span>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
            {sinhalaText(onToggleSave && <SaveHeartButton providerId={tiler.id} savedIds={savedIds} savingId={savingId} onToggleSave={onToggleSave} />)}
            {sinhalaText(phone && (
              <a href={buildWhatsAppLink(phone, tiler.full_name)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                style={{ display: 'inline-flex', alignItems: 'center', background: '#E9F1EC', color: '#2F6B4F', border: '1px solid #A9CBB8', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                💬
              </a>
            ))}
            {sinhalaText(tiler.slug && (
              <a href={`/providers/${tiler.slug}`} onClick={e => e.stopPropagation()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#8A6224', color: '#fff', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                {sinhalaText(T.viewProfile)} ›
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Contractor card (Card 1 — portrait, full-width image at top) ─────────────
function ContractorCard({ provider, onClick, T, savedIds, savingId, onToggleSave }) {
  const color = avatarColor(provider.name)
  const inits = initials(provider.name)
  const phone = provider.whatsapp || provider.phone
  const coverSrc = provider.cover_image || provider.profile_image
  const typeLabel = PROVIDER_TYPE_DISPLAY[provider.provider_type]?.label || 'Contractor'
  const isVerified = VERIFIED_STATUSES.has(provider.verification_status)

  return (
    <div
      onClick={() => provider.slug ? (window.location.href = `/providers/${provider.slug}`) : onClick(provider)}
      style={{ background: '#fff', borderRadius: 20, border: '1px solid #E2E2E2', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s,transform 0.2s' }}
      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.12)' }}
      onMouseOut={e  => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* Full-width cover image at top */}
      <div style={{ height: 160, position: 'relative', overflow: 'hidden', background: color }}>
        <CoverImage src={coverSrc} alt={sinhalaText(provider.name)} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          fallback={
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 52, fontWeight: 800, color: 'rgba(255,255,255,0.75)' }}>{sinhalaText(inits)}</span>
            </div>
          } />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.02) 60%, rgba(0,0,0,0.2) 100%)' }} />
        {sinhalaText(isVerified && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: '#2F6B4F', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.22)' }}>
            ✓ සත්‍යාපිත
          </div>
        ))}
      </div>

      {/* Content below image */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#6E6E6E', fontWeight: 600 }}>{sinhalaText(typeLabel)}</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0B0B0B', marginBottom: 5, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{sinhalaText(provider.name)}</div>
        {sinhalaText(provider.avg_rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <span>⭐</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#242424' }}>{sinhalaText(Number(provider.avg_rating).toFixed(1))}</span>
            {sinhalaText(provider.review_count > 0 && <span style={{ fontSize: 12, color: '#8C8C8C' }}>({sinhalaText(T.reviewsLabel(provider.review_count))})</span>)}
          </div>
        ))}
        {sinhalaText(provider.description && (
          <div style={{ fontSize: 13, color: '#6E6E6E', lineHeight: 1.65, marginBottom: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {sinhalaText(provider.description)}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #ECECEC', paddingTop: 12, flexWrap: 'wrap' }}>
          {sinhalaText((provider.city || provider.district) && (
            <span style={{ fontSize: 11, color: '#4A4A4A', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>📍 {sinhalaText(provider.city || provider.district)}</span>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
            {sinhalaText(onToggleSave && <SaveHeartButton providerId={provider.id} savedIds={savedIds} savingId={savingId} onToggleSave={onToggleSave} />)}
            {sinhalaText(phone && (
              <a href={buildWhatsAppLink(phone, provider.name)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                style={{ display: 'inline-flex', alignItems: 'center', background: '#E9F1EC', color: '#2F6B4F', border: '1px solid #A9CBB8', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                💬
              </a>
            ))}
            {sinhalaText(provider.slug && (
              <a href={`/providers/${provider.slug}`} onClick={e => e.stopPropagation()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#8A6224', color: '#fff', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                {sinhalaText(T.viewProfile)} ›
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Profile modal ─────────────────────────────────────────────────────────────
function ProviderModal({ item, onClose, T }) {
  if (!item) return null
  const name = item.name || 'Provider'
  const phone = item.whatsapp || item.phone
  const altWaPhone = item.whatsapp && item.phone && item.whatsapp !== item.phone ? item.phone : null
  const pts = PROVIDER_TYPES.find(p => p.value === item.provider_type)
  const avatarImage = item.profile_image || item.avatar_url
  const coverImage  = item.cover_image

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 160, position: 'relative', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
          {sinhalaText(coverImage
            ? <img src={coverImage} alt={sinhalaText(name)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0B0B0B 0%, #8A6224 100%)' }} />
                <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(255,255,255,0.8) 19px,rgba(255,255,255,0.8) 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(255,255,255,0.8) 19px,rgba(255,255,255,0.8) 20px)' }} />
              </>)
          }
          {sinhalaText(coverImage && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />)}
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>✕</button>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: -32, left: 24, width: 64, height: 64, borderRadius: '50%', border: '3px solid #fff', background: '#8A6224', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
            {sinhalaText(avatarImage ? <img src={avatarImage} alt={sinhalaText(name)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(name))}
          </div>
        </div>

        <div style={{ padding: '10px 24px 24px', paddingTop: 40 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0B0B0B', marginBottom: 3 }}>{sinhalaText(name)}</div>
            <div style={{ fontSize: 13, color: '#6E6E6E' }}>📍 {sinhalaText(item.city || item.district)}{sinhalaText(item.district && item.city ? `, ${item.district}` : '')}</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {sinhalaText(pts && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#F5EEE2', color: '#8A6224' }}>{sinhalaText(pts.icon)} {sinhalaText(pts.label)}</span>)}
            <VerificationBadge status={item.verification_status} />
          </div>

          {sinhalaText(item.verification_status === 'listed' && (
            <div style={{ fontSize: 12, color: '#6E6E6E', background: '#F7F7F7', border: '1px solid #E8DCC6', borderRadius: 10, padding: '10px 14px', marginBottom: 16, lineHeight: 1.6 }}>
              {sinhalaText(T.unverifiedNotice)}
            </div>
          ))}

          {sinhalaText(item.description && (
            <p style={{ fontSize: 13, color: '#4A4A4A', lineHeight: 1.75, marginBottom: 18, padding: 14, background: '#F7F7F7', borderRadius: 10 }}>
              {sinhalaText(item.description)}
            </p>
          ))}

          {sinhalaText((item.experience_years || item.daily_rate_min || item.avg_rating > 0) && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
              {sinhalaText(item.experience_years > 0 && (
                <div style={{ padding: '10px 16px', background: '#F7F7F7', borderRadius: 10, border: '1px solid #E2E2E2', textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#8A6224' }}>{sinhalaText(item.experience_years)}+</div>
                  <div style={{ fontSize: 10, color: '#8C8C8C' }}>{sinhalaText(T.yearsExpLabel)}</div>
                </div>
              ))}
              {sinhalaText(item.daily_rate_min && (
                <div style={{ padding: '10px 16px', background: '#F7F7F7', borderRadius: 10, border: '1px solid #E2E2E2', textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#8A6224' }}>රු.{sinhalaText(item.daily_rate_min)}–{sinhalaText(item.daily_rate_max || '?')}</div>
                  <div style={{ fontSize: 10, color: '#8C8C8C' }}>{sinhalaText(T.perSqftLabel)}</div>
                </div>
              ))}
              {sinhalaText(item.avg_rating > 0 && (
                <div style={{ padding: '10px 16px', background: '#F5EEE2', borderRadius: 10, border: '1px solid #E8DCC6', textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#242424' }}>⭐ {sinhalaText(Number(item.avg_rating).toFixed(1))}</div>
                  <div style={{ fontSize: 10, color: '#8C8C8C' }}>{sinhalaText(T.reviewsLabel(item.review_count || 0))}</div>
                </div>
              ))}
            </div>
          ))}

          {sinhalaText((item.services || []).length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8C8C8C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{sinhalaText(T.servicesLabel)}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sinhalaText((item.services || []).map(s => (
                  <span key={s} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: '#F5EEE2', color: '#8A6224', border: '1px solid #EBE2D2' }}>{sinhalaText(s)}</span>
                )))}
              </div>
            </div>
          ))}

          {sinhalaText((() => {
            const imgs = item.gallery || item.photo_urls || []
            if (!imgs.length) return null
            return (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8C8C8C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{sinhalaText(T.portfolioLabel)}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
                  {sinhalaText(imgs.map((img, i) => <img key={i} src={img} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E2E2' }} />))}
                </div>
              </div>
            )
          })())}

          {sinhalaText((item.service_areas || []).length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8C8C8C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{sinhalaText(T.serviceAreasLabel)}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sinhalaText((item.service_areas || []).map(a => (
                  <span key={a} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#ECECEC', color: '#4A4A4A' }}>{sinhalaText(a)}</span>
                )))}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10 }}>
            {sinhalaText(phone && (
              <a href={buildWhatsAppLink(phone, name)} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                {sinhalaText(T.whatsapp)}
              </a>
            ))}
          </div>
          {sinhalaText(altWaPhone && (
            <a href={buildWhatsAppLink(altWaPhone, name)} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 8, background: '#E9F1EC', color: '#2F6B4F', border: '1px solid #C6DDCF', borderRadius: 12, padding: 11, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              {sinhalaText(T.altNumber)}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Suggested content (empty state) ──────────────────────────────────────────
const TYPE_INFO_CARDS = {
  workshop: [
    { icon: '🔪', title: 'Tile Cutting', body: 'Straight cuts, bevel edges and L-shapes — precision fit for any space.' },
    { icon: '🌀', title: 'Routing & Profiling', body: 'Rounded edges, slots and custom profiles for a flawless finish.' },
    { icon: '💧', title: 'Waterjet Cutting', body: 'Precise curves, mosaic shapes and holes — chip-free and clean.' },
  ],
  supplier: [
    { icon: '📦', title: 'Bulk Supply', body: 'Floor, wall and outdoor tiles — trade quantities for contractors and homeowners.' },
    { icon: '🏷️', title: 'Competitive Pricing', body: 'Porcelain, ceramic and natural stone — sourced direct from importers.' },
    { icon: '🚚', title: 'Island-wide Delivery', body: 'Most suppliers deliver across Sri Lanka. Ask about minimum order quantities.' },
  ],
  contractor: [
    { icon: '🏗️', title: 'Full Renovation', body: 'Bathrooms and kitchens — design to handover under one contract.' },
    { icon: '💧', title: 'Waterproofing', body: 'Certified membrane waterproofing for wet areas and flat roofs.' },
    { icon: '📋', title: 'Project Management', body: 'Tilers, plumbers and finishers — coordinated from a single point.' },
  ],
  tile_shop: [
    { icon: '🏪', title: 'Showroom Experience', body: 'See full-size tiles before buying — patterns, finishes and grout combinations.' },
    { icon: '🪨', title: 'Wide Range', body: 'Budget to premium — porcelain, ceramic, marble and mosaic.' },
    { icon: '💡', title: 'Design Advice', body: 'In-store specialists help you match tiles, grout and fittings.' },
  ],
  brand_dealer: [
    { icon: '🏷️', title: 'Authorised Brands', body: 'Rocell, Lanka Tile, Megatile and imported brands — guaranteed authentic.' },
    { icon: '✅', title: 'Warranty Backed', body: "Official dealers provide manufacturer's warranty on every product." },
    { icon: '🎨', title: 'Full Collection', body: 'Access the complete range of every brand, including limited editions.' },
  ],
  tool_supplier: [
    { icon: '🔧', title: 'Tile Cutters & Saws', body: 'Manual cutters, splash cutters and rail cutters for precise straight cuts.' },
    { icon: '⚙️', title: 'Levelling Systems', body: 'Clips, wedges and pliers for lippage-free, perfectly flat tiles.' },
    { icon: '🦺', title: 'Safety Equipment', body: 'Knee pads, gloves, safety glasses and dust masks.' },
  ],
  bathroom_shop: [
    { icon: '🚿', title: 'Sanitaryware', body: 'Toilets, basins, showers and bathtubs from leading brands.' },
    { icon: '🔩', title: 'Taps & Mixers', body: 'Basin mixers, bath mixers and kitchen taps in all finishes.' },
    { icon: '🪞', title: 'Vanity & Mirrors', body: 'Bathroom vanity units, storage cabinets and LED mirrors.' },
  ],
}

function SuggestedContent({ type, providers, onSelectProvider, T, savedIds, savingId, onToggleSave }) {
  const infoCards = TYPE_INFO_CARDS[type] || []
  const otherProviders = providers.filter(p => p.provider_type !== type).slice(0, 3)
  const typeLabel = TYPE_LABELS_EN[type] || type || 'Providers'

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 16, border: '2px dashed #E2E2E2', padding: '36px 24px', textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🏗️</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0B0B0B', marginBottom: 8 }}>
          {sinhalaText(T.noTypeListed(typeLabel))}
        </h3>
        <p style={{ fontSize: 13, color: '#6E6E6E', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
          {sinhalaText(T.noTypeHint(typeLabel))}
        </p>
        <a href="/join-wedahub" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#8A6224', color: '#fff', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          {sinhalaText(T.joinAs(typeLabel))}
        </a>
      </div>

      {sinhalaText(infoCards.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8C8C8C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            {sinhalaText(T.whatTheyDo(typeLabel))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {sinhalaText(infoCards.map(c => (
              <div key={c.title} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E2E2', padding: '18px 18px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: '#F5EEE2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10 }}>{sinhalaText(c.icon)}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0B0B0B', marginBottom: 4 }}>{sinhalaText(c.title)}</div>
                <div style={{ fontSize: 11, color: '#6E6E6E', lineHeight: 1.65 }}>{sinhalaText(c.body)}</div>
              </div>
            )))}
          </div>
        </div>
      ))}

      {sinhalaText(otherProviders.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8C8C8C', textTransform: 'uppercase', letterSpacing: 1 }}>{sinhalaText(T.otherProviders)}</div>
            <a href="/providers" style={{ fontSize: 12, color: '#8A6224', fontWeight: 600, textDecoration: 'none' }}>{sinhalaText(T.seeAll)}</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {sinhalaText(otherProviders.map(p => <ProviderCard key={p.id} provider={p} onClick={onSelectProvider} T={T} savedIds={savedIds} savingId={savingId} onToggleSave={onToggleSave} />))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ProviderDirectory({ initialType, initialSearch, initialProviders, initialDistrict }) {
  const T = TRANS.si

  const [providers, setProviders] = useState(initialProviders || [])
  const [loading,   setLoading]   = useState(!initialProviders)
  const [loadError, setLoadError] = useState(null)
  const [inputValue, setInputValue] = useState(initialSearch || '')
  const [search,    setSearch]    = useState(initialSearch || '')
  const [district,  setDistrict]  = useState(initialDistrict || '')
  const [type,      setType]      = useState(initialType || '')
  const [selected,  setSelected]  = useState(null)
  const [savedIds,  setSavedIds]  = useState(new Set())
  const [savingId,  setSavingId]  = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (initialProviders && initialProviders.length > 0) return
    async function load() {
      setLoading(true)
      setLoadError(null)
      const { data, error } = await supabase.from('providers').select('*').eq('status', 'active').order('is_featured', { ascending: false }).order('avg_rating', { ascending: false })
      if (error) {
        console.error('providers load error:', error)
        setLoadError(error.message)
      } else {
        setProviders(data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('saved_providers').select('provider_id').eq('user_id', user.id)
      if (data) setSavedIds(new Set(data.map(r => r.provider_id)))
    })
  }, [])

  async function toggleSaveProvider(providerId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setSavingId(providerId)
    if (savedIds.has(providerId)) {
      await supabase.from('saved_providers').delete().eq('user_id', user.id).eq('provider_id', providerId)
      setSavedIds(prev => { const s = new Set(prev); s.delete(providerId); return s })
    } else {
      await supabase.from('saved_providers').insert({ user_id: user.id, provider_id: providerId })
      setSavedIds(prev => new Set([...prev, providerId]))
    }
    setSavingId(null)
  }

  const filteredProviders = providers.filter(p => {
    if (type && p.provider_type !== type && !(type === 'supplier' && SHOP_TYPES.has(p.provider_type))) return false
    if (district && p.district !== district && !(p.service_areas || []).includes(district)) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) || (p.services || []).some(s => s.toLowerCase().includes(q))
    }
    return true
  })

  const total = filteredProviders.length

  const allCards = filteredProviders.map(p => ({
    ...p, _score: (p.is_featured ? 2 : 0) + (VERIFIED_STATUSES.has(p.verification_status) ? 1 : 0)
  })).sort((a, b) => b._score - a._score)

  const clearLabel = type && !inputValue && !district
    ? TYPE_LABELS_EN[type] || type
    : null

  return (
    <div style={{ background: '#F7F7F7', minHeight: '60vh' }}>
      {/* Sticky filter bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E2E2', padding: '16px 0', position: 'sticky', top: 60, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
            <input
              value={inputValue}
              onChange={e => {
                const val = e.target.value
                setInputValue(val)
                clearTimeout(debounceRef.current)
                debounceRef.current = setTimeout(() => setSearch(val), 280)
              }}
              placeholder={sinhalaText(T.searchPh)}
              style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1.5px solid #E2E2E2', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#8A6224'}
              onBlur={e => e.target.style.borderColor = '#E2E2E2'}
            />
          </div>

          {/* Type filter */}
          <select value={type} onChange={e => setType(e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid #E2E2E2', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', fontFamily: 'inherit', cursor: 'pointer' }}>
            <option value="">{sinhalaText(T.all)}</option>
            <option value="tiler">🪚 ටයිල් කාර්මිකයා</option>
            <option value="contractor">🏗️ කොන්ත්‍රාත්කරු</option>
            <option value="electrician">⚡ විදුලි කාර්මිකයා</option>
            <option value="plumber">🔧 ජලනළ කාර්මිකයා</option>
            <option value="carpenter">🪵 වඩු කාර්මිකයා</option>
            <option value="painter">🖌️ පින්තාරුකරු</option>
            <option value="mason">🧱 පෙදරේරුවා</option>
            <option value="interior_designer">🛋️ අභ්‍යන්තර නිර්මාණකරු</option>
            <option value="construction_company">🏢 ඉදිකිරීම් ආයතනය</option>
            <option value="tile_shop">🔲 ටයිල් වෙළෙඳසැල</option>
            <option value="bathroom_shop">🛁 නාන කාමර උපාංග වෙළෙඳසැල</option>
            <option value="supplier">📦 සැපයුම්කරු</option>
            <option value="workshop">✂️ වැඩපොළ</option>
            <option value="brand_dealer">✦ සන්නාම අලෙවිකරු</option>
            <option value="tool_supplier">🔨 මෙවලම් සැපයුම්කරු</option>
          </select>

          {/* District filter */}
          <select value={district} onChange={e => setDistrict(e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid #E2E2E2', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', fontFamily: 'inherit', cursor: 'pointer' }}>
            <option value="">{sinhalaText(T.allDistricts)}</option>
            {sinhalaText(DISTRICTS_EN.map((d, i) => (
              <option key={d} value={d}>{sinhalaText(d)}</option>
            )))}
          </select>

          {sinhalaText((inputValue || type || district) && (
            <button onClick={() => { setInputValue(''); setSearch(''); setType(''); setDistrict('') }} style={{ padding: '9px 14px', background: '#FBEDEB', color: '#C0392B', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {sinhalaText(T.clear(clearLabel))}
            </button>
          ))}

          <span style={{ fontSize: 12, color: '#8C8C8C', marginLeft: 'auto' }}>{sinhalaText(T.found(total))}</span>

        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        {sinhalaText(loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#8C8C8C' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
            <p>{sinhalaText(T.loading)}</p>
          </div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #F2C9C3' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#C0392B', marginBottom: 8 }}>සේවා සපයන්නන් පූරණය කළ නොහැකි විය</h3>
            <p style={{ fontSize: 13, color: '#6E6E6E', marginBottom: 20 }}>{sinhalaText(loadError)}</p>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#8A6224', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              නැවත උත්සාහ කරන්න
            </button>
          </div>
        ) : total === 0 ? (
          type && !search && !district ? (
            <SuggestedContent
              type={type} providers={providers}
              onSelectProvider={item => setSelected(item)}
              T={T} savedIds={savedIds} savingId={savingId} onToggleSave={toggleSaveProvider}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 16, border: '1px solid #E2E2E2' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0B0B0B', marginBottom: 8 }}>{sinhalaText(T.noResults)}</h3>
              <p style={{ color: '#6E6E6E', marginBottom: 24 }}>{sinhalaText(T.noResultsHint)}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {sinhalaText((search || district) && (
                  <button onClick={() => { setSearch(''); setInputValue(''); setDistrict('') }} style={{ padding: '10px 20px', background: '#8A6224', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    {sinhalaText(T.clearSearch)}
                  </button>
                ))}
                <a href="/providers" style={{ padding: '10px 20px', background: '#ECECEC', color: '#4A4A4A', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                  {sinhalaText(T.browseAll)}
                </a>
              </div>
            </div>
          )
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {sinhalaText(allCards.map(item => (
              <ProviderCard key={item.id} provider={item} T={T} onClick={p => setSelected(p)} savedIds={savedIds} savingId={savingId} onToggleSave={toggleSaveProvider} />
            )))}
          </div>
        ))}
      </div>

      {sinhalaText(selected && (
        <ProviderModal item={selected} onClose={() => setSelected(null)} T={T} />
      ))}
    </div>
  )
}
