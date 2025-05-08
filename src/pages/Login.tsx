import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Mail, Lock, AlertCircle, Eye, Sparkles, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [isStudent, setIsStudent] = useState(false)
  const [parentCode, setParentCode] = useState('')
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isStudent) {
        if (!parentCode) {
          toast.error('Please enter your parent code')
          setIsLoading(false)
          return
        }

        navigate(`/parent-portal?token=${parentCode}`)
        return
      }

      const email = formData.email.trim().toLowerCase()
      const password = formData.password.trim()

      if (!email || !password) {
        toast.error('Please enter both email and password')
        setIsLoading(false)
        return
      }

      await supabase.auth.signOut()

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        toast.error('Invalid email or password')
        setIsLoading(false)
        return
      }

      let { data: userData } = await supabase
        .from('users')
        .select('name, is_approved, role')
        .eq('id', signInData.user.id)
        .maybeSingle()

      if (!userData) {
        try {
          await fetch(
            `https://zgrxawyginizrshjmkum.supabase.co/functions/v1/sync_user_from_signup`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${signInData.session.access_token}`,
              },
            }
          )

          const res = await supabase
            .from('users')
            .select('name, is_approved, role')
            .eq('id', signInData.user.id)
            .maybeSingle()
          userData = res.data
        } catch (err) {
          toast.error('Could not create user profile')
          await supabase.auth.signOut()
          setIsLoading(false)
          return
        }
      }

      if (!userData) {
        toast.error('User profile not found')
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      if (!userData.is_approved) {
        toast.error('Your account is pending approval')
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      toast.success(`Welcome back, ${userData.name || 'User'}!`)
      window.location.href = '/homepage'
    } catch (err) {
      toast.error('Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const sendReset = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Please enter a valid email')
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://tmechsmonitor.org/reset-password',
    })

    if (error) {
      throw new Error(`Reset email failed: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative z-0 flex h-[28rem] w-full flex-col items-center justify-start bg-[url('https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//tmechs_banner.png')] bg-cover bg-center pt-24 drop-shadow-lg sm:h-[24rem] sm:pt-20 md:h-96 md:pt-8">
        <div className="max-w-2xl rounded-md bg-black/20 px-4 py-4 text-center">
          <h1
            className="animate-fade-slide-up text-3xl font-bold text-white md:text-5xl"
            style={{ textShadow: '2px 4px 3px rgba(0, 0, 0, 0.7)' }}
          >
            Welcome to TMECHS Monitor
          </h1>
          <p
            className="animate-fade-slide-up animation-delay-400 mt-2 text-sm text-white/80 md:text-lg"
            style={{ textShadow: '2px 2px 3px rgba(0, 0, 0, 0.7)' }}
          >
            Sign in to monitor, support, and crush student rebellion!
          </p>
        </div>
      </div>

      {/* Login Box */}
      <div className="relative z-50 mx-auto -mt-20 max-w-md rounded-lg bg-white p-6 shadow-md md:p-8">
        <div className="mb-6 flex justify-center">
          <img
            src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//TMECHS_Logo_Gradient.png"
            alt="TMECHS Logo"
            className="h-12 w-12"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={isStudent}
              onChange={() => setIsStudent(prev => !prev)}
              className="rounded border-gray-300 text-tmechs-forest focus:ring-tmechs-forest"
            />
            <span className="text-gray-700">I am a student</span>
          </label>

          {isStudent ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Enter Parent Code
              </label>
              <input
                type="text"
                value={parentCode}
                onChange={e => setParentCode(e.target.value)}
                placeholder="Parent Access Code"
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
  type="email"
  value={formData.email}
  onChange={e => setFormData({ ...formData, email: e.target.value })}
  placeholder="your.email@episd.org"
  required
  autoComplete="email"
  disabled={isLoading}
  className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
/>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input
  type={showPassword ? 'text' : 'password'}
  value={formData.password}
  onChange={e => setFormData({ ...formData, password: e.target.value })}
  placeholder="••••••••"
  required
  autoComplete="current-password"
  disabled={isLoading}
  className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 pr-10 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
/>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="rounded-md bg-tmechs-sage/10 p-4 text-center text-sm text-tmechs-forest">
            <Sparkles className="mx-auto mb-2" />
            <p className="font-medium">Let’s do this, Mavericks!</p>
            <p>Thank you for participating</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-tmechs-forest py-2 text-white transition hover:bg-tmechs-forest/90 disabled:opacity-50"
          >
            {isLoading
              ? 'Processing...'
              : isStudent
                ? 'View My Violations'
                : 'Sign In'}
          </button>

          {!isStudent && (
            <>
              <div className="mt-4 space-y-2 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-sm text-tmechs-forest hover:underline"
                  disabled={isLoading}
                >
                  Need an account? Register here
                </button>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowReset(true)}
                    className="text-sm text-tmechs-forest hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {showReset && (
                <div className="mt-4">
                  <h3 className="animate-fade-slide-up mb-1 text-sm font-semibold">
                    Reset Your Password
                  </h3>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={e =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="mb-2 w-full rounded border bg-tmechs-forest p-2 text-sm text-white"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await sendReset(formData.email)
                        toast.success('Check your email for a reset link!')
                        setShowReset(false)
                      } catch (err: any) {
                        console.error('Reset error:', err)
                        toast.error('Failed to send reset email.')
                      }
                    }}
                    className="rounded bg-gray-600 px-3 py-1 text-sm text-white transition hover:bg-tmechs-forest active:scale-95"
                    disabled={isLoading}
                  >
                    Send Reset Link
                  </button>
                </div>
              )}
            </>
          )}
        </form>
      </div>

      {/* Custom Animation Styles */}
      <style jsx>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-slide-up {
          animation: fadeSlideUp 0.6s ease-out forwards;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  )
}
