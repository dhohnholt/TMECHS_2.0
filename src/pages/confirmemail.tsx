import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Loader2 } from 'lucide-react'

function ConfirmEmail() {
  const [status, setStatus] = useState('Verifying...')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    async function verifyEmail() {
      const token = searchParams.get('token')
      if (!token) {
        setStatus('Invalid confirmation link.')
        return
      }

      try {
        const response = await fetch(`/api/confirm-email?token=${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          const { error } = await response.json()
          throw new Error(error || 'Failed to confirm email')
        }

        setStatus('Email updated successfully!')
        toast.success('Your email has been updated.')
        setTimeout(() => navigate('/portal/profile'), 2000)
      } catch (error) {
        console.error('Error confirming email:', error)
        setStatus(error.message || 'Failed to confirm email.')
        toast.error(error.message || 'Failed to confirm email.')
      }
    }
    verifyEmail()
  }, [searchParams, navigate])

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-tmechs-dark">
        Email Confirmation
      </h1>
      <div className="flex min-h-[60vh] items-center justify-center">
        {status === 'Verifying...' ? (
          <Loader2 className="h-8 w-8 animate-spin text-tmechs-forest" />
        ) : (
          <p className="text-lg text-tmechs-dark">{status}</p>
        )}
      </div>
    </div>
  )
}

export default ConfirmEmail
