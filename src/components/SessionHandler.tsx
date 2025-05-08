// src/components/SessionHandler.tsx
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function SessionHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()

      // Only attempt exchange if no session already exists
      if (!sessionData.session) {
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')

        if (code) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error(
              '❌ Error exchanging code for session:',
              error.message
            )
          } else if (data?.session) {
            console.log('✅ Session established from magic link.')
            navigate('/homepage')
          }
        }
      }
    })()
  }, [])

  return null
}
