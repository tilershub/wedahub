// Shared helpers for job (project) pages: SEO-friendly URLs + display meta.

export const JOB_TYPE_ICONS = {
  'Floor Tiling': '⬜', 'Bathroom Tiling': '🚿', 'Bathroom Renovation': '🛁',
  'Granite Works': '💎', 'Tile Cutting': '✂️', 'Routering': '🔧',
  'Waterproofing': '💧', 'Tile Shop Inquiry': '🏪', 'Large Format Tiling': '📏',
  'Mosaic Tiling': '🎨', 'Pool Tiling': '🏊', 'Outdoor Tiling': '🏡',
  'Glass Railing': '✨', 'Aluminium & Glass Works': '🪟', 'House Painting': '🎨',
  'Landscaping & Gardening': '🌿', 'Carpentry Works': '🪵', 'Demolition Work': '⚒️',
  'Site Cleaning': '🧹', 'Gypsum Ceiling': '🏛️', 'IPanel Ceiling': '🏠',
  'Electrical Repairs': '🔌', 'House Wiring': '⚡', 'House Lighting': '💡',
  'Shower Cubicle': '🚿', 'Bathroom Plumbing': '🚽', 'Debris Removal': '🚛',
  'Granite Countertops': '🪨', 'Aluminium Doors & Windows': '🚪',
}

export const JOB_TYPE_COLORS = {
  'Floor Tiling': '#8A6224', 'Bathroom Tiling': '#8A6224', 'Bathroom Renovation': '#8A6224',
  'Granite Works': '#6B4A18', 'Tile Cutting': '#8A6224', 'Waterproofing': '#2F6B4F',
  'Tile Shop Inquiry': '#8A6224', 'Large Format Tiling': '#6B4A18', 'Mosaic Tiling': '#6B4A18',
  'House Painting': '#8A6224', 'Landscaping & Gardening': '#285C43', 'Carpentry Works': '#242424',
  'Glass Railing': '#2F6B4F', 'Aluminium & Glass Works': '#4A4A4A', 'Electrical Repairs': '#6B4A18',
  'House Wiring': '#6B4A18', 'Gypsum Ceiling': '#22513B', 'IPanel Ceiling': '#22513B',
  'Demolition Work': '#8A6224', 'Debris Removal': '#6E6E6E', 'Granite Countertops': '#4A4A4A',
  'Pool Tiling': '#2F6B4F', 'Outdoor Tiling': '#285C43',
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Canonical SEO path for a project: /jobs/<type>-<district-or-city>-<uuid>
// The full UUID stays as the trailing segment so lookup never depends on the
// cosmetic slug text. Requires p.id; project_type/district/city optional.
export function jobPath(p) {
  const slug = slugify(`${p.project_type || 'tiling-project'}-${p.district || p.city || 'sri-lanka'}`)
  return `/jobs/${slug ? slug + '-' : ''}${p.id}`
}

// Pull the trailing UUID out of a /jobs/[slug] param. Returns null if absent.
export function extractJobId(slugParam) {
  const m = String(slugParam || '').match(UUID_RE)
  return m ? m[0].toLowerCase() : null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Formatted by hand rather than via toLocaleDateString: the server and the
// browser don't always carry the same locale data (Node rendered Sinhala month
// names while the browser rendered English ones), and a mismatch inside an
// SSR'd component breaks React hydration.
export function shortDate(ts, withYear = false) {
  const d = new Date(ts)
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return withYear ? `${base} ${d.getFullYear()}` : base
}

// Relative time depends on Date.now(), which differs between the server
// render and hydration — enough to cross a bucket boundary and break
// hydration. Components that render during SSR should show shortDate first
// and call this from an effect. See JobCard.
export function timeAgo(ts, lang = 'en') {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  const si = lang === 'si'
  if (diff < 60)     return si ? 'දැන්ම' : 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}${si ? ' මිනි' : 'm ago'}`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}${si ? ' පැය' : 'h ago'}`
  if (diff < 604800) return `${Math.floor(diff / 86400)}${si ? ' දින' : 'd ago'}`
  return shortDate(ts, true)
}
