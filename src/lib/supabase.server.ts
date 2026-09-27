import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { AstroCookies } from 'astro'

const SUPABASE_URL = (import.meta.env.SUPABASE_URL as string) || 'https://ginrgwaciblcvxvkbeyd.supabase.co'
const SUPABASE_ANON_KEY = (import.meta.env.SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbnJnd2FjaWJsY3Z4dmtiZXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjUyODMsImV4cCI6MjA5NDk0MTI4M30.vcfg0gTKSdyKgqggK3OAFwUYwLSfr-QkN2mRFFr_R1M'

export function createSupabaseBearerClient(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

export function createSupabaseServerClient(request: Request, cookies: AstroCookies) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('Cookie') ?? ''),
      setAll: (cookiesToSet) =>
        cookiesToSet.forEach(({ name, value, options }) =>
          cookies.set(name, value, options as Parameters<AstroCookies['set']>[2])),
    },
  })
}
