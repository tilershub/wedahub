import { SERVICES } from '../lib/services.js'
import { jobPath } from '../lib/jobs.js'
import { DISTRICT_INFO, LOCATION_SERVICE_SLUGS, districtPath, serviceDistrictPath } from '../lib/locations.js'

export const prerender = false

const BASE = 'https://wedahub.lk'

const STATIC = [
  { loc: '/',               priority: '1.0', changefreq: 'daily'   },
  { loc: '/providers',      priority: '0.9', changefreq: 'daily'   },
  { loc: '/jobs',           priority: '0.9', changefreq: 'hourly'  },
  { loc: '/post-project',   priority: '0.8', changefreq: 'monthly' },
  { loc: '/join-wedahub', priority: '0.7', changefreq: 'monthly' },
  { loc: '/categories',     priority: '0.7', changefreq: 'weekly'  },
  { loc: '/about',          priority: '0.5', changefreq: 'monthly' },
  { loc: '/contact',        priority: '0.5', changefreq: 'monthly' },
  { loc: '/privacy-policy', priority: '0.3', changefreq: 'yearly'  },
  { loc: '/terms',          priority: '0.3', changefreq: 'yearly'  },
]

function url(loc, lastmod, changefreq, priority) {
  return `  <url>\n    <loc>${BASE}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

export async function GET({ locals }) {
  const today = new Date().toISOString().split('T')[0]

  // No `tilers` block: that legacy table's slugs are people, but /tilers/<slug>
  // only serves districts and 301s anything else to /providers/<slug> — a
  // sitemap should list canonical 200s, and district URLs are added below.
  const [{ data: providerRows }, { data: projectRows }, { data: coverageRows }] = await Promise.all([
    locals.supabase.from('providers').select('slug,updated_at').eq('status', 'active').not('provider_type','in','(tile_shop,bathroom_shop,supplier,brand_dealer,tool_supplier)').not('slug', 'is', null),
    locals.supabase.from('projects').select('id,project_type,city,district,created_at').eq('status', 'active').order('created_at', { ascending: false }).limit(500),
    locals.supabase.from('providers').select('city,district,service_areas').eq('status', 'active'),
  ])

  // A district page is only worth submitting once something is actually on it.
  // The page itself applies the same rule via `noindex`, so an empty district
  // is reachable but neither indexed nor advertised — and rejoins the sitemap
  // by itself as soon as a provider covers it or a project is posted there.
  const covered = new Set()
  for (const p of coverageRows || []) {
    if (p.district) covered.add(p.district)
    if (p.city) covered.add(p.city)
    for (const area of p.service_areas || []) covered.add(area)
  }
  for (const p of projectRows || []) {
    if (p.district) covered.add(p.district)
  }
  const liveDistricts = DISTRICT_INFO.filter(d =>
    [...covered].some(name => name && name.toLowerCase().includes(d.name.toLowerCase()))
  )

  const urls = [
    ...STATIC.map(u => url(u.loc, today, u.changefreq, u.priority)),
    ...SERVICES.map(s => url(`/services/${s.slug}`, today, 'weekly', '0.8')),
    ...(providerRows || []).filter(r => r.slug).map(p =>
      url(`/providers/${p.slug}`, p.updated_at ? p.updated_at.split('T')[0] : today, 'weekly', '0.7')
    ),
    ...(projectRows || []).map(p =>
      url(jobPath(p), p.created_at ? p.created_at.split('T')[0] : today, 'daily', '0.7')
    ),
    ...liveDistricts.flatMap(d =>
      LOCATION_SERVICE_SLUGS.map(s => url(serviceDistrictPath(s, d), today, 'weekly', '0.7'))
    ),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
