import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserCircle, School2 } from 'lucide-react'

export default function PortalLanding() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-4xl px-4">
        <div className="mb-12 text-center">
          <img
            src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/TMECHS%20Logo%20Gradient.png"
            alt="TMECHS Logo"
            className="mx-auto mb-6 h-24 w-24"
          />
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            Welcome to TMECHS Monitor
          </h1>
          <p className="text-xl text-gray-600">
            Choose your portal to continue
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Teacher Portal */}
          <button
            onClick={() => navigate('/login')}
            className="group rounded-lg bg-white p-6 text-left shadow-md transition-shadow hover:shadow-lg"
          >
            <div className="mb-4 flex items-center">
              <School2 className="h-8 w-8 text-tmechs-forest group-hover:text-tmechs-forest/80" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Teacher Portal
            </h2>
            <p className="text-gray-600">
              Access violation records, manage detentions, and view analytics.
            </p>
            <div className="mt-4 text-tmechs-forest group-hover:text-tmechs-forest/80">
              Sign in as teacher →
            </div>
          </button>

          {/* Parent Portal */}
          <button
            onClick={() => navigate('/parent-portal')}
            className="group rounded-lg bg-white p-6 text-left shadow-md transition-shadow hover:shadow-lg"
          >
            <div className="mb-4 flex items-center">
              <Users className="h-8 w-8 text-tmechs-forest group-hover:text-tmechs-forest/80" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Parent Portal
            </h2>
            <p className="text-gray-600">
              Monitor your student's behavior records and detention schedule.
            </p>
            <div className="mt-4 text-tmechs-forest group-hover:text-tmechs-forest/80">
              Access parent portal →
            </div>
          </button>

          {/* Student Portal */}
          <button
            onClick={() => navigate('/student-portal')}
            className="group rounded-lg bg-white p-6 text-left shadow-md transition-shadow hover:shadow-lg"
          >
            <div className="mb-4 flex items-center">
              <UserCircle className="h-8 w-8 text-tmechs-forest group-hover:text-tmechs-forest/80" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Student Portal
            </h2>
            <p className="text-gray-600">
              View your violations, check detention schedule, and stay informed.
            </p>
            <div className="mt-4 text-tmechs-forest group-hover:text-tmechs-forest/80">
              Access student portal →
            </div>
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact the school office at (915) 780-1858
          </p>
        </div>
      </div>
    </div>
  )
}
