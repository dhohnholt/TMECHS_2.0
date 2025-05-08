import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

function PendingApproval() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-tmechs-dark">
        Account Pending Approval
      </h1>
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center">
          <AlertCircle className="mr-2 h-6 w-6 text-yellow-600" />
          <p className="text-lg text-tmechs-dark">
            Your account is awaiting verification by an administrator.
          </p>
        </div>
        <p className="text-tmechs-gray text-sm">
          Please contact support at 915-526-4237 if you have questions or need
          assistance.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-4 flex items-center rounded-md px-4 py-2 text-tmechs-forest hover:bg-tmechs-sage/10"
        >
          Back to Login
        </button>
      </div>
    </div>
  )
}

export default PendingApproval
