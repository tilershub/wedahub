import { supabase } from './supabase';

export type Engagement = {
  id: string; updated_at: string; version: number; project_id: string; provider_id: string; customer_id: string;
  provider_user_id: string; data: { status: string; title?: string; provider_name?: string; provider_slug?: string;
    events?: { action: string; role: string; at: string }[];
    started?: { customer?: string; provider?: string }; completion_requested_by?: string;
    review?: { rating: number; comment: string; status: string; reply?: string } };
};

const apiBase = process.env.EXPO_PUBLIC_WEB_API_URL?.replace(/\/$/, '');
export const engagementApiConfigured = !!apiBase;

async function request(body?: object) {
  if (!apiBase) throw new Error('api_unconfigured');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('sign_in_required');
  // Never carry bearer credentials to a redirect target or attach browser cookies.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${apiBase}/api/mobile/jobs`, {
      method: body ? 'POST' : 'GET', credentials: 'omit', redirect: 'error', signal: controller.signal,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`api_${response.status}`);
    return await response.json();
  } finally { clearTimeout(timeout); }
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
