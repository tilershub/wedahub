import { professions } from '../data/professions';
import { normalizeMobile } from './phone';
import { supabase } from './supabase';

export async function registrationState() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') throw error;
  if (!user) return { user: null, submissions: [], hasProfile: false };
  const [submissions, profiles] = await Promise.all([
    supabase.from('provider_submissions').select('id,name,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('providers').select('id').eq('user_id', user.id).is('merged_into', null).limit(1),
  ]);
  if (submissions.error) throw submissions.error;
  if (profiles.error) throw profiles.error;
  return { user, submissions: submissions.data, hasProfile: profiles.data.length > 0 };
}

export type RegistrationFields = { name: string; profession: string; city?: string; district?: string; service?: string };
export async function registerProvider(fields: RegistrationFields) {
  const category = professions.find(item => item.value === fields.profession);
  if (!category || fields.name.trim().length < 2 || fields.name.trim().length > 100
    || (fields.city?.length || 0) > 100 || (fields.district?.length || 0) > 100 || (fields.service?.length || 0) > 1000) throw new Error('invalid_registration');
  const current = await registrationState();
  if (!current.user?.phone_confirmed_at || !current.user.phone) throw new Error('sign_in_required');
  const phone = normalizeMobile(current.user.phone);
  // Keep the existing moderated first-profile registration workflow.
  if (current.hasProfile || current.submissions.some(item => item.status === 'pending_review')) throw new Error('registration_exists');
  const { error } = await supabase.from('provider_submissions').insert({
    user_id: current.user.id, name: fields.name.trim(), provider_type: category.value,
    city: fields.city?.trim() || null, district: fields.district?.trim() || null, whatsapp: phone,
    services: [category.en], description: fields.service?.trim() || null, status: 'pending_review',
  });
  if (error) throw error;
}
