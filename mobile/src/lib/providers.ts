import { supabase } from './supabase';
import type { Database } from '../types/database';

export type Provider = Pick<Database['public']['Tables']['providers']['Row'],
  'id' | 'name' | 'slug' | 'provider_type' | 'city' | 'district' | 'services' |
  'profile_image' | 'avg_rating' | 'review_count' | 'verification_status' | 'service_areas'> & { completed_jobs: number; badge_kinds: string[]; confirmed_review_count: number };
export type ProviderDetail = Provider & Pick<Database['public']['Tables']['providers']['Row'],
  'cover_image' | 'description' | 'experience_years' | 'daily_rate_min' | 'daily_rate_max' | 'visit_fee' | 'service_areas' | 'gallery'> & { badges: PublicBadge[] };
export type PublicBadge = Pick<Database['public']['Tables']['provider_badges']['Row'], 'id' | 'kind' | 'subject' | 'verified_at' | 'expires_at'>;

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
    .select('id,name,slug,provider_type,city,district,services,profile_image,avg_rating,review_count,verification_status,cover_image,description,experience_years,daily_rate_min,daily_rate_max,visit_fee,service_areas,gallery')
    .eq('slug', slug).eq('status', 'active').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const evidence = await supabase.rpc('discover_service_providers', { provider_slug: slug });
  if (evidence.error) throw evidence.error;
  const summary = evidence.data?.[0];
  if (!summary) return null;
  const now = new Date().toISOString();
  const badges = await supabase.from('provider_badges').select('id,kind,subject,verified_at,expires_at')
    .eq('provider_id', data.id).is('revoked_at', null).lte('verified_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`).order('kind');
  if (badges.error) throw badges.error;
  return { ...data, ...summary, badges: badges.data || [] };
}

export type PublicReview = Pick<Database['public']['Tables']['reviews']['Row'],'id'|'rating'|'comment'|'reviewer_name'|'created_at'|'confirmed_job'|'provider_reply'>;
export async function providerReviews(providerId: string, page = 0): Promise<PublicReview[]> {
 const {data,error}=await supabase.from('reviews').select('id,rating,comment,reviewer_name,created_at,confirmed_job,provider_reply')
 .eq('provider_id',providerId).eq('status','published').order('created_at',{ascending:false}).order('id').range(page*20,page*20+19);
 if(error)throw error;return data;
}
