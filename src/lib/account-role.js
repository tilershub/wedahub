export async function accountRole(db, user) {
  if (!user) return 'client'
  const [providers, submissions] = await Promise.all([
    db.from('providers').select('id').eq('user_id', user.id).limit(1),
    db.from('provider_submissions').select('status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
  ])
  if (providers.error || submissions.error) throw new Error('Unable to resolve account role')
  return providers.data?.length || ['pending_review', 'approved', 'listed'].includes(submissions.data?.[0]?.status) ? 'provider' : 'client'
}
