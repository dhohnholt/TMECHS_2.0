import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Search,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Key,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface StudentData {
  id: string
  name: string
  grade: number
  email: string
  violations: StudentViolation[]
}

interface StudentViolation {
  id: string
  violation_type: string
  assigned_date: string
  detention_date: string
  status: string
  users: {
    name: string
  }
}

export default function ParentPortal() {
  const navigate = useNavigate()
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [student, setStudent] = useState<StudentData | null>(null)
  const [verified, setVerified] = useState(false)
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const codeFromURL = query.get('access_code')
    const storedCode = localStorage.getItem('parentAccessCode')

    if (codeFromURL) {
      verifyAccessCode(codeFromURL)
    } else if (storedCode) {
      verifyAccessCode(storedCode)
    }
  }, [])

  const verifyAccessCode = async (code: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select(
          `
          id,
          name,
          grade,
          email,
          parent_verified,
          parent_verified_at,
          violations!violations_student_id_fkey (
            id,
            violation_type,
            assigned_date,
            detention_date,
            status,
            users (
              name
            )
          )
        `
        )
        .eq('parent_access_code', code.toUpperCase())
        .single()

      console.log('🧪 Supabase Data:', data)
      console.log('❌ Supabase Error:', error)

      if (error) throw error

      if (data) {
        if (!data.parent_verified) {
          await supabase
            .from('students')
            .update({
              parent_verified: true,
              parent_verified_at: new Date().toISOString(),
            })
            .eq('id', data.id)
        }

        setStudent(data)
        setVerified(true)
        localStorage.setItem('parentAccessCode', code)
        toast.success('Access verified successfully')
      } else {
        toast.error('Invalid access code')
      }
    } catch (error) {
      console.error('Error verifying access:', error)
      toast.error('Failed to verify access code')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessCode) {
      toast.error('Please enter an access code')
      return
    }
    verifyAccessCode(accessCode)
  }

  const handleLogout = () => {
    localStorage.removeItem('parentAccessCode')
    setStudent(null)
    setVerified(false)
    setAccessCode('')
  }

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('T')[0].split('-')
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).toLocaleDateString()
  }

  if (!verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="ml-8 flex flex-col items-center">
            <img
              src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/TMECHS%20Logo%20Gradient.png"
              alt="TMECHS Logo"
              className="mb-4 h-12 w-12"
            />
            <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
            <p className="mt-2 text-center text-gray-600">
              Enter your access code to view your student's information
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Access Code
              </label>
              <div className="relative text-tmechs-forest">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-100" />
                <input
                  type="text"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value.toUpperCase())}
                  className="w-full rounded-md border border-gray-300 bg-tmechs-forest pl-10 text-gray-100 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                  placeholder="Enter code (e.g., AB123456)"
                  pattern="[A-Z]{2}[0-9]{6}"
                  maxLength={8}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="rounded-md bg-tmechs-sage/10 p-4">
              <div className="flex items-start">
                <AlertCircle className="mr-3 mt-1 text-tmechs-forest" />
                <div className="text-sm text-tmechs-forest">
                  <p className="mb-1 font-medium">Access Code Format:</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>2 letters followed by 6 numbers</li>
                    <li>Found in violation notification emails</li>
                    <li>Case insensitive</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              disabled={loading}
              className={`btn-primary w-full ${loading ? 'cursor-not-allowed opacity-75' : ''}`}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Access Portal'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!student) {
    return null
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        {' '}
        {/* Changed to gap-4 */}
        <h1 className="text-2xl font-bold text-gray-900">
          Student Information
        </h1>
        <div className="ml-auto flex space-x-4">
          {' '}
          {/* Added ml-auto */}
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Sign Out
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-tmechs-forest hover:text-tmechs-forest/80"
          >
            Return to Login
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex-1">
            <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-800">
              <User className="mr-2 h-5 w-5" />
              Student Details
            </h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{student.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Grade</dt>
                <dd className="text-sm text-gray-900">{student.grade}</dd>
              </div>
            </dl>
          </div>

          <div className="flex-1">
            <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-800">
              <AlertCircle className="mr-2 h-5 w-5" />
              Summary
            </h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Total Violations
                </dt>
                <dd className="text-sm text-gray-900">
                  {student.violations.length}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Pending Detentions
                </dt>
                <dd className="text-sm text-gray-900">
                  {
                    student.violations.filter(v => v.status === 'pending')
                      .length
                  }
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Completed Detentions
                </dt>
                <dd className="text-sm text-gray-900">
                  {
                    student.violations.filter(v => v.status === 'attended')
                      .length
                  }
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Violation History
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('desktop')}
              className={`rounded-md px-3 py-1 text-sm ${
                viewMode === 'desktop'
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Desktop
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`rounded-md px-3 py-1 text-sm ${
                viewMode === 'mobile'
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Mobile
            </button>
          </div>
        </div>

        {student.violations.length === 0 ? (
          <p className="py-4 text-center text-gray-500">
            No violations recorded
          </p>
        ) : viewMode === 'desktop' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    Violation
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Assigned By
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Time
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {student.violations.map(violation => (
                  <tr
                    key={violation.id}
                    className="border-b bg-white hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">{violation.violation_type}</td>
                    <td className="px-6 py-4">{violation.users.name}</td>
                    <td className="px-6 py-4">
                      {formatDate(violation.detention_date)}
                    </td>
                    <td className="px-6 py-4">4:10 PM</td>
                    <td className="px-6 py-4">Cafeteria</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          violation.status === 'attended'
                            ? 'bg-green-100 text-green-800'
                            : violation.status === 'absent'
                              ? 'bg-red-100 text-red-800'
                              : violation.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {violation.status.charAt(0).toUpperCase() +
                          violation.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            {student.violations.map(violation => (
              <div
                key={violation.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {violation.violation_type}
                    </p>
                    <p className="text-sm text-gray-500">
                      Assigned by {violation.users.name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {formatDate(violation.detention_date)}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">4:10 PM</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Cafeteria</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      violation.status === 'attended'
                        ? 'bg-green-100 text-green-800'
                        : violation.status === 'absent'
                          ? 'bg-red-100 text-red-800'
                          : violation.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {violation.status.charAt(0).toUpperCase() +
                      violation.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Assigned: {formatDate(violation.detention_date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
