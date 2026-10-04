import type { Engagement } from './engagements';
import type { Bid, Job } from './jobs';
export type InboxItem = { id: string; kind: 'applicationReceived' | 'applicationUpdate' | 'engagementUpdate'; title: string; at: string };
// RLS/server authorization remains authoritative; reject unrelated rows here too.
export function notificationItems(userId: string, projects: Job[], bids: Bid[], engagements: Engagement[]): InboxItem[] {
  const owned = new Map(projects.filter(p => p.user_id === userId).map(p => [p.id, p]));
  const items: InboxItem[] = [];
  for (const bid of bids) {
    const project = owned.get(bid.job_id);
    if (project && bid.user_id !== userId) items.push({ id: `bid:${bid.id}`, kind: 'applicationReceived', title: project.project_type, at: bid.created_at || '' });
    else if (bid.user_id === userId) items.push({ id: `application:${bid.id}:${bid.status}`, kind: 'applicationUpdate', title: bid.provider_slug || '', at: bid.created_at || '' });
  }
  for (const job of engagements) {
    const role = job.customer_id === userId ? 'customer' : job.provider_user_id === userId ? 'provider' : null;
    if (!role) continue;
    const last = job.data.events?.at(-1);
    if (last?.role === role) continue;
    items.push({ id: `engagement:${job.id}:${job.version}`, kind: 'engagementUpdate', title: job.data.title || job.id, at: last?.at || job.updated_at });
  }
  return [...new Map(items.map(item => [item.id, item])).values()].filter(item => Number.isFinite(Date.parse(item.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id)).slice(0, 100);
}
