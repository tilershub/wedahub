import { supabase } from './supabase';
import type { Database } from '../types/database';

export type Provider = Pick<Database['public']['Tables']['providers']['Row'],
  'id' | 'name' | 'slug' | 'provider_type' | 'city' | 'district' | 'services' |
  'profile_image' | 'avg_rating' | 'review_count' | 'verification_status' | 'service_areas'> & { completed_jobs: number; badge_kinds: string[]; confirmed_review_count: number };
export type ProviderDetail = Provider & Pick<Database['public']['Tables']['providers']['Row'],
  'description' | 'experience_years' | 'daily_rate_min' | 'daily_rate_max' | 'visit_fee' | 'service_areas' | 'gallery'>;

// Existing SECURITY INVOKER RPC returns explicit public columns and applies
// active-provider filtering. Never fetch provider `*` into a public mobile UI.
export async function searchProviders(query: string, district = '', page = 0, profession = ''): Promise<Provider[]> {
  const { data, error } = await supabase.rpc('discover_service_providers', {
    search_text: query.trim(), profession, area_filter: district, page_number: page,
  });
  if (error) throw error;
  return data || [];
}

export async function providerBySlug(slug: string): Promise<ProviderDetail | null> {
  const { data, error } = await supabase.from('providers')
    .select('id,name,slug,provider_type,city,district,services,profile_image,avg_rating,review_count,verification_status,description,experience_years,daily_rate_min,daily_rate_max,visit_fee,service_areas,gallery')
    .eq('slug', slug).eq('status', 'active').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const evidence = await supabase.rpc('discover_service_providers', { provider_slug: slug });
  if (evidence.error) throw evidence.error;
  const summary = evidence.data?.[0];
  return summary ? { ...data, ...summary } : null;
}
