import type { Database } from '../types/database';
import type { Language } from '../i18n';
import { supabase } from './supabase';

export type Skill = Database['public']['Tables']['skills']['Row'];
export const skillName = (skill: Skill, language: Language) => skill[`name_${language}`];
export function skillPath(skill: Skill, catalogue: Skill[], language: Language): string {
  const parents: string[] = [];
  let current: Skill | undefined = skill;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parents.unshift(skillName(current, language));
    const parentId: string | null = current.parent_id;
    current = catalogue.find(item => item.id === parentId);
  }
  return parents.join(' › ');
}
export async function skillCatalogue(): Promise<Skill[]> {
  const rows: Skill[] = [];
  // Supabase caps a response at 1,000 rows. Keep larger future catalogues complete.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('skills').select('id,parent_id,name_en,name_si,name_ta,selectable,active').order('id').range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function ownedProfiles(userId: string) {
  const { data, error } = await supabase.from('providers')
    .select('id,name,slug,city,provider_type,status,service_areas,provider_skills(skill_id)')
    .eq('user_id', userId).is('merged_into', null).order('name');
  if (error) throw error;
  return data;
}
export type OwnedProfile = Awaited<ReturnType<typeof ownedProfiles>>[number];
export async function setProviderSkill(providerId: string, skillId: string, selected: boolean) {
  // No user ID supplied to a mutation. RLS resolves ownership from the JWT.
  const result = selected
    ? await supabase.from('provider_skills').insert({ provider_id: providerId, skill_id: skillId }).select('skill_id')
    : await supabase.from('provider_skills').delete().eq('provider_id', providerId).eq('skill_id', skillId).select('skill_id');
  if (result.error) throw result.error;
  if (!result.data?.length) throw new Error('skill_not_updated');
}
export async function publicProviderSkills(providerId: string): Promise<Skill[]> {
  const { data, error } = await supabase.from('provider_skills')
    .select('skills(id,parent_id,name_en,name_si,name_ta,selectable,active)').eq('provider_id', providerId);
  if (error) throw error;
  return data.flatMap(row => row.skills?.active ? [row.skills] : []);
}
