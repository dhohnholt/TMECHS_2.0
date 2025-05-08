import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { Outlet, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { applyTheme } from '../lib/theme'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function ProtectedLayout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!loading && !user) {
      toast.error('Session expired. Please log in.')
      navigate('/', { replace: true })
      return
    }

    if (user?.role && user.role !== 'student' && user.role !== 'parent') {
      const loadTheme = async () => {
        const { data, error } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single()

        if (!error && data?.preferences?.theme) {
          applyTheme(data.preferences.theme)
        }
      }
      loadTheme()
    }
  }, [user, loading, navigate])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-tmechs-forest dark:text-tmechs-light" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <header className="bg-[var(--color-card)] shadow-md dark:shadow-tmechs-forest/50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <Header isAdmin={user.role === 'admin'} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl flex-grow px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}