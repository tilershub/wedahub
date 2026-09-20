import { useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const DRAFT_KEY = 'tilershub_draft_token'

async function linkPending(user) {
  // Link anonymous draft project to signed-in account
  const token = localStorage.getItem(DRAFT_KEY)
  if (token) {
    const response = await fetch('/api/projects/link-draft', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
    })
    if (response.ok) localStorage.removeItem(DRAFT_KEY)
  }
}

export default function DraftLinker() {
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) linkPending(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        linkPending(session.user)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return null
}
