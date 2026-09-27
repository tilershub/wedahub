/// <reference types="astro/client" />
import type { SupabaseClient, User } from '@supabase/supabase-js'

declare namespace App {
  interface Locals {
    supabase: SupabaseClient
    user: User | null
    // Set only by the mobile API after server-side token verification.
    apiAuth?: 'bearer'
    accountRole: () => Promise<'client' | 'provider'>
  }
}
