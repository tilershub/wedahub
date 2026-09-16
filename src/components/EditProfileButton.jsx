import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function EditProfileButton({ ownerId, profileType, profileSlug }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && ownerId && user.id === ownerId) setShow(true)
    })
  }, [])

  if (!show) return null

  return (
    <a
      href="/provider?tab=profile"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: '#8A6224', color: '#fff', borderRadius: 12,
        padding: '10px 18px', fontSize: 13, fontWeight: 700,
        textDecoration: 'none', marginTop: 12,
        boxShadow: '0 2px 10px rgba(212,161,94,0.25)',
      }}
    >
      ✏️ මගේ පැතිකඩ සංස්කරණය කරන්න
    </a>
  )
}
