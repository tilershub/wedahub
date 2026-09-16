/// <reference types="astro/client" />
import type { SupabaseClient, User } from '@supabase/supabase-js'

declare namespace App {
  interface Locals {
    supabase: SupabaseClient
    user: User | null
    /** 'si' | 'en' | 'ta', resolved once in middleware so SSR and hydration agree. */
    lang: string
  }
}
