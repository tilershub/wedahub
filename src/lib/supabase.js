import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://ginrgwaciblcvxvkbeyd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbnJnd2FjaWJsY3Z4dmtiZXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjUyODMsImV4cCI6MjA5NDk0MTI4M30.vcfg0gTKSdyKgqggK3OAFwUYwLSfr-QkN2mRFFr_R1M'

// Uses cookie-based storage so sessions are visible to the SSR server middleware
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const DISTRICTS = [
  'කොළඹ','ගම්පහ','කළුතර','මාතලේ','කෑගල්ල','නුවර',
  'නුවරඑළිය','ගාල්ල','මාතර','හම්බන්තොට','ජාෆ්නා',
  'මන්නාරම','වව්නියාව','මුලතිව්','කිලිනොච්චිය','මඩකළපුව',
  'අම්පාර','ත්‍රිකුණාමළය','කුරුණෑගල','පුත්තලම','අනුරාධපුර',
  'පොළොන්නරුව','බදුල්ල','මොණරාගල','රත්නපුර'
]

export const DISTRICTS_EN = [
  'Colombo','Gampaha','Kalutara','Matale','Kegalle','Kandy',
  'Nuwara Eliya','Galle','Matara','Hambantota','Jaffna',
  'Mannar','Vavuniya','Mullaitivu','Kilinochchi','Batticaloa',
  'Ampara','Trincomalee','Kurunegala','Puttalam','Anuradhapura',
  'Polonnaruwa','Badulla','Monaragala','Ratnapura'
]

export { PROFESSIONS } from './professions.js'
import { PROFESSIONS } from './professions.js'
import { SERVICES as SERVICE_CATALOG } from './services.js'
export const SERVICES_EN = SERVICE_CATALOG.map(s => s.label)
export const SERVICES = SERVICE_CATALOG.map(s => s.si || s.label)
export const PROJECT_TYPES = [...SERVICES_EN, 'Other Service']

export const PROFESSION_LABELS = Object.fromEntries(PROFESSIONS.map(p => [p.value, p.label]))

export const PROVIDER_TYPES = PROFESSIONS

export const VERIFICATION_BADGES = {
  listed: { label: 'Listed', color: '#6B7076', bg: '#F7F3E8' },
  th_verified: { label: 'WedaHUB Verified', color: '#0B2A4A', bg: '#F7F3E8' },
  th_certified_pro: { label: 'Certified Pro', color: '#071827', bg: '#F7F3E8' },
  th_master: { label: 'WedaHUB Master', color: '#071827', bg: '#F7F3E8' },
}

export const BUDGET_RANGES = [
  'Below Rs. 500,000',
  'Rs. 500,000 – 1,000,000',
  'Rs. 1,000,000 – 2,000,000',
  'Above Rs. 2,000,000',
]

// Build the common stored formats of a Sri Lankan phone number so bids/records
// saved in different shapes ("0771…", "+94771…", "94771…", with/without spaces)
// can be matched with a single `.in()` query. Returns a de-duped array.
export function phoneVariants(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length < 9) return raw ? [String(raw).trim()] : []
  const local9 = digits.slice(-9)            // 771234567
  const set = new Set([
    String(raw).trim(),                       // exactly as stored/entered
    digits,                                    // all digits
    local9,                                    // 9-digit core
    '0' + local9,                              // 0771234567
    '94' + local9,                             // 94771234567
    '+94' + local9,                            // +94771234567
  ])
  return [...set].filter(Boolean)
}

export function buildWhatsAppLink(phone, name) {
  const n = (phone || '').replace(/\D/g, '')
  const normalized = n.startsWith('94') ? n : '94' + n.replace(/^0/, '')
  const who = name ? `*${name}*` : 'ඔබව'
  const msg = encodeURIComponent(
    `ආයුබෝවන්! 🙏\n\nමම *වැඩHUB* (wedahub.lk) හරහා ${who} සොයාගතිමි.\n\nඔබගේ සේවාව ගැන දැනගැනීමට කැමැත්තෙමි.\n\n📌 *වැඩHUB.lk* Lead\nස්තූතියි! 🏠`
  )
  return `https://wa.me/${normalized}?text=${msg}`
}

export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadProviderPhoto(submissionId, file, index) {
  const ext = file.name.split('.').pop()
  const path = `submissions/${submissionId}/${index}.${ext}`
  const { error } = await supabase.storage.from('provider-photos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function fetchProviders({ type, district, search } = {}) {
  let q = supabase.from('providers').select('*').eq('status', 'active')
  if (type) q = q.eq('provider_type', type)
  if (district) q = q.contains('service_areas', [district])
  if (search) q = q.ilike('name', `%${search}%`)
  q = q.order('is_featured', { ascending: false }).order('created_at', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function fetchProviderBySlug(slug) {
  const { data, error } = await supabase.from('providers').select('*').eq('slug', slug).eq('status', 'active').single()
  if (error) return null
  return data
}

export async function fetchBrands() {
  const { data } = await supabase.from('brands').select('*').eq('status', 'active').order('is_featured', { ascending: false })
  return data || []
}

export async function fetchBrandBySlug(slug) {
  const { data } = await supabase.from('brands').select('*').eq('slug', slug).eq('status', 'active').single()
  return data || null
}

export async function fetchHeroBanners() {
  const { data } = await supabase.from('hero_banners').select('*').eq('is_active', true).order('sort_order')
  return data || []
}

export async function submitProject(fields) {
  const { error } = await supabase.from('projects').insert(fields)
  if (error) throw error
}

export async function submitProviderApplication(fields) {
  const { error } = await supabase.from('provider_submissions').insert(fields)
  if (error) throw error
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function signInWithOtp(email) {
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : '/auth/callback'
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
}

export async function signInWithGoogle() {
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : 'https://wedahub.lk/auth/callback'
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  return supabase.auth.signOut()
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null))
}
