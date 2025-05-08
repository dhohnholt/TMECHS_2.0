import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

export default function TeacherAuth() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [isStudent, setIsStudent] = useState(false)
  const [parentCode, setParentCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) {
      ;(async () => {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Error exchanging code:', error)
          toast.error('Login failed. Invalid or expired link.')
        } else {
          toast.success('Login successful!')
          navigate('/homepage')
        }
      })()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isStudent) {
        if (!parentCode) {
          toast.error('Please enter a parent code.')
          return
        }
        navigate(`/student-violations?student_id=${parentCode}`)
        return
      }

      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { name: form.name },
        },
      })

      if (error) throw error

      toast.success('Check your email to confirm your account', {
        duration: 5000,
      })
      navigate('/login')
    } catch (err) {
      toast.error('Registration failed')
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-tmechs-sage/10 to-white py-6 sm:py-12">
      <div className="mx-auto max-w-md px-4 sm:px-6">
        <div className="mb-6 flex justify-center sm:mb-8">
          <img
            src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/TMECHS%20Logo%20Gradient.png"
            alt="TMECHS Logo"
            className="h-20 transition-all duration-300 hover:scale-105 sm:h-24"
          />
        </div>
        <div className="rounded-xl bg-white/80 p-6 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl sm:p-8">
          <h2 className="mb-2 text-center text-2xl font-bold tracking-wide text-tmechs-forest sm:mb-3 sm:text-3xl">
            Teacher Registration
          </h2>
          <p className="mb-6 text-center text-sm text-gray-700 sm:mb-8 sm:text-base">
            Create your account to start monitoring student behavior
          </p>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isStudent}
                onChange={() => setIsStudent(prev => !prev)}
                className="h-4 w-4 rounded border-gray-300 text-tmechs-forest focus:ring-tmechs-forest sm:h-5 sm:w-5"
              />
              <span className="text-sm tracking-wide text-gray-700 sm:text-base">
                I am a student
              </span>
            </label>

            {isStudent ? (
              <label className="block">
                <span className="text-sm font-medium tracking-wide text-tmechs-forest sm:text-base">
                  Enter Parent Code
                </span>
                <input
                  type="text"
                  value={parentCode}
                  onChange={e => setParentCode(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 pl-3 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:mt-2 sm:p-3 sm:text-base"
                  placeholder="Enter parent code"
                />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="text-sm font-medium tracking-wide text-tmechs-forest sm:text-base">
                    Full Name
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e =>
                      setForm(prev => ({ ...prev, name: e.target.value }))
                    }
                    required
                    placeholder="Jane Doe"
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 pl-3 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:mt-2 sm:p-3 sm:text-base"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium tracking-wide text-tmechs-forest sm:text-base">
                    School Email
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e =>
                      setForm(prev => ({ ...prev, email: e.target.value }))
                    }
                    required
                    placeholder="name@episd.org"
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 pl-3 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:mt-2 sm:p-3 sm:text-base"
                  />
                </label>
                <label className="relative block">
                  <span className="text-sm font-medium tracking-wide text-tmechs-forest sm:text-base">
                    Password
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e =>
                      setForm(prev => ({ ...prev, password: e.target.value }))
                    }
                    required
                    placeholder="**************"
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 pl-3 pr-10 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:mt-2 sm:p-3 sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-tmechs-forest to-tmechs-forest/80 px-4 py-2 text-sm text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:py-3 sm:text-base"
            >
              {loading
                ? isStudent
                  ? 'Loading...'
                  : 'Creating Account...'
                : isStudent
                  ? 'View My Violations'
                  : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md sm:mt-8 sm:p-6">
            <h3 className="mb-2 text-sm font-semibold text-gray-800 sm:mb-3 sm:text-base">
              Important Notes:
            </h3>
            <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed text-gray-700 sm:text-sm">
              <li>Use your official school email (@episd.org)</li>
              <li>Password must be at least 8 characters</li>
              <li>You'll need admin approval to access all features</li>
            </ul>
          </div>

          <p className="mt-6 text-center text-sm text-gray-700 sm:mt-8 sm:text-base">
            Already have an account?{' '}
            <a
              href="/login"
              className="font-medium text-tmechs-forest transition-all duration-300 hover:underline"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
