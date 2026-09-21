const CACHE = 'wedahub-navy-v4'

// Static assets to pre-cache on install
const PRECACHE = [
  '/offline',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
]

// ── Install: pre-cache essentials ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

// ── Activate: delete old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request
  const url = new URL(req.url)

  // Only handle GET; skip cross-origin (Supabase, fonts, etc.)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  // Skip auth / API paths — always go to network
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/') || ['/my-jobs', '/account', '/dashboard', '/admin', '/provider', '/login', '/notifications'].some(p => url.pathname === p || url.pathname.startsWith(p + '/'))) return

  // Static assets (_astro chunks, images, fonts) → cache-first
  if (
    url.pathname.startsWith('/_astro/') ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2|woff|ttf|css|js)$/)
  ) {
    event.respondWith(cacheFirst(req))
    return
  }

  // HTML pages → network-first with offline fallback
  event.respondWith(networkFirst(req))
})

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    return cached || new Response('', { status: 503 })
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    // Never persist personalised HTML; only static files are cached.
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    const offline = await caches.match('/offline')
    return offline || new Response('You are offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  }
}
