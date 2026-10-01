import type { Database } from '../types/database';
import { supabase } from './supabase';

export type Job = Pick<Database['public']['Tables']['projects']['Row'],
  'id' | 'project_type' | 'city' | 'district' | 'description' | 'budget_range' | 'status' | 'created_at' | 'user_id'>;
export type Bid = Pick<Database['public']['Tables']['bids']['Row'],
  'id' | 'job_id' | 'bidder_name' | 'message' | 'status' | 'quote_amount' | 'created_at' | 'user_id' | 'provider_slug'>;

const projectColumns = 'id,project_type,city,district,description,budget_range,status,created_at,user_id';
const bidColumns = 'id,job_id,bidder_name,message,status,quote_amount,created_at,user_id,provider_slug';

export async function availableJobs(): Promise<Job[]> {
  const { data, error } = await supabase.from('projects').select(projectColumns)
    .in('status', ['active', 'published', 'featured']).order('created_at', { ascending: false }).limit(80);
  if (error) throw error;
  return data;
}

export async function myProjects(userId: string): Promise<Job[]> {
  const { data, error } = await supabase.from('projects').select(projectColumns)
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data;
}

export async function myBids(userId: string): Promise<Bid[]> {
  const { data, error } = await supabase.from('bids').select(bidColumns)
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data;
}

export async function bidsForProjects(projectIds: string[]): Promise<Bid[]> {
  if (!projectIds.length) return [];
  const { data, error } = await supabase.from('bids').select(bidColumns)
    .in('job_id', projectIds).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data;
}

export async function createProject(fields: {
  userId: string; customerName: string; phone: string; service: string;
  city: string; description: string; budget?: string;
}) {
  const { error } = await supabase.from('projects').insert({
    user_id: fields.userId, customer_name: fields.customerName.trim(), whatsapp: fields.phone,
    project_type: fields.service.trim(), city: fields.city.trim(), description: fields.description.trim(),
    budget_range: fields.budget?.trim() || null, status: 'active',
  });
  if (error) throw error;
}

export async function expressInterest(fields: {
  userId: string; jobId: string; name: string; phone: string; message: string; providerSlug: string;
}) {
  const { error } = await supabase.from('bids').insert({
    user_id: fields.userId, job_id: fields.jobId, bidder_name: fields.name,
    bidder_whatsapp: fields.phone, bidder_type: 'provider', provider_slug: fields.providerSlug,
    message: fields.message.trim(), status: 'new',
  });
  if (error) throw error;
}
