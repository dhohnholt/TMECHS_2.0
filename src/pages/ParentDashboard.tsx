import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, AlertTriangle, User, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

interface Student {
  id: string
  name: string
  grade: number
  violations: {
    id: string
    violation_type: string
    assigned_date: string
    detention_date: string
    status: string
  }[]
}

export default function ParentDashboard() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data, error } = await supabase
        .from('parent_student_relations')
        .select(
          `
          students (
            id,
            name,
            grade,
            violations (
              id,
              violation_type,
              assigned_date,
              detention_date,
              status
            )
          )
        `
        )
        .eq('parent_id', user.id)

      if (error) throw error
      setStudents(data?.map(r => r.students) || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="ml-1">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Parent Dashboard</h1>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="py-4 text-center">Loading...</div>
        ) : students.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow-md">
            No students found
          </div>
        ) : (
          students.map(student => (
            <div key={student.id} className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <User className="mr-2 h-6 w-6 text-tmechs-forest" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {student.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Grade {student.grade}
                    </p>
                  </div>
                </div>
              </div>

              {student.violations.length > 0 ? (
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
                            Assigned:{' '}
                            {format(
                              new Date(violation.assigned_date),
                              'MMMM d, yyyy'
                            )}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center text-sm">
                            <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              {format(
                                new Date(violation.detention_date),
                                'MMMM d, yyyy'
                              )}
                            </span>
                          </div>
                          <span
                            className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-gray-500">
                  No violations recorded
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
