import { supabase } from './supabase';

export type Engagement = {
  id: string; version: number; project_id: string; provider_id: string; customer_id: string;
  provider_user_id: string; data: { status: string; title?: string; provider_name?: string; provider_slug?: string;
    started?: { customer?: string; provider?: string }; completion_requested_by?: string;
    review?: { rating: number; comment: string; status: string; reply?: string } };
};

const apiBase = process.env.EXPO_PUBLIC_WEB_API_URL?.replace(/\/$/, '');
export const engagementApiConfigured = !!apiBase;

async function request(body?: object) {
  if (!apiBase) throw new Error('api_unconfigured');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('sign_in_required');
  const response = await fetch(`${apiBase}/api/mobile/jobs`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`api_${response.status}`);
  return response.json();
}

export async function myEngagements(): Promise<Engagement[]> {
  const response = await request();
  return response.jobs || [];
}
export async function invite(projectId: string, providerSlug: string) {
  await request({ action: 'invite', project_id: projectId, provider_slug: providerSlug });
}
export async function transition(job: Engagement, action: string, extras: object = {}) {
  await request({ id: job.id, version: job.version, action, ...extras });
}
