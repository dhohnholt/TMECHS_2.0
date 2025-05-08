import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

export default function ResetPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔍 Auth event:', event, session)
        if (event === 'PASSWORD_RECOVERY') {
          console.log('✅ PASSWORD_RECOVERY event detected')
          setIsSessionReady(true)
        }
      }
    )
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search)
    let access_token = queryParams.get('access_token')
    let refresh_token = queryParams.get('refresh_token')
    const code = queryParams.get('code')

    if (!access_token && !refresh_token) {
      const hashParams = new URLSearchParams(
        location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
      )
      access_token = hashParams.get('access_token')
      refresh_token = hashParams.get('refresh_token')
    }

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (error) {
            toast.error('Invalid or expired reset link.')
            setSessionError(true)
          } else {
            setIsSessionReady(true)
          }
        })
    } else if (code) {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error || !session) {
          toast.error('Invalid or expired reset link.')
          setSessionError(true)
        } else {
          setIsSessionReady(true)
        }
      })
    } else {
      toast.error('Missing reset credentials.')
      setSessionError(true)
    }
  }, [location])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast.error('Failed to reset password: ' + error.message)
      } else {
        await supabase.auth.signOut()
        toast.success('Password updated! Redirecting to login...')
        setResetSuccess(true)
        setTimeout(() => navigate('/login'), 2000)
      }
    } catch (err) {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sessionError) {
    return (
      <div className="mt-20 px-4 text-center">
        <h2 className="text-xl font-bold text-red-600">
          Invalid or Expired Reset Link
        </h2>
        <p className="mt-2 text-gray-600">
          Please request a new reset link from the login page.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-4 rounded bg-tmechs-forest px-4 py-2 text-white"
        >
          Back to Login
        </button>
      </div>
    )
  }

  if (!isSessionReady) {
    return <div className="mt-20 text-center">Verifying reset link...</div>
  }

  if (resetSuccess) {
    return (
      <div className="mt-20 px-4 text-center">
        <h2 className="text-xl font-bold text-green-700">
          Password Reset Successful!
        </h2>
        <p className="mt-2 text-gray-700">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <form
        onSubmit={handleReset}
        className="w-full max-w-md rounded bg-white p-6 shadow-md"
      >
        <h2 className="mb-4 text-xl font-bold">Reset Your Password</h2>

        {/* New Password Field */}
        <div className="relative mb-4">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="New password (min 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded border p-2 pr-10"
            required
            minLength={6}
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 transform text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {/* Confirm Password Field */}
        <div className="mb-4">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full rounded border p-2"
            required
            disabled={isSubmitting}
          />
          {confirmPassword && confirmPassword !== password && (
            <p className="mt-1 text-sm text-red-600">Passwords do not match.</p>
          )}
        </div>

        {/* Button Group */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="submit"
            disabled={isSubmitting || confirmPassword !== password}
            className="flex-1 rounded bg-tmechs-forest py-2 text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex-1 rounded bg-gray-200 py-2 text-gray-800 hover:bg-gray-300"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
