import React, { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'

interface Violation {
  id: string
  violation_type: string
  assigned_date: string
  detention_date: string
  status: string
  teachers?: {
    name: string
  }
}

export default function StudentViolations() {
  const [params] = useSearchParams()
  const parentCode = params.get('student_id')

  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchViolations()
  }, [])

  const fetchViolations = async () => {
    try {
      let barcode = ''

      if (parentCode) {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('barcode, name')
          .eq('parent_access_code', parentCode)
          .single()
          .headers({ 'parent-code': parentCode })

        if (studentError || !student) {
          console.error('Student lookup failed:', studentError)
          setViolations([])
          return
        }

        barcode = student.barcode
        setStudentName(student.name || null)
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setViolations([])
          return
        }

        barcode = user.id

        const { data: teacher, error: teacherError } = await supabase
          .from('teachers')
          .select('name, role')
          .eq('id', user.id)
          .single()

        if (!teacherError && teacher) {
          setIsAdmin(teacher.role === 'admin')
          setStudentName(teacher.name)
        }
      }

      const { data, error } = await supabase
        .from('violations')
        .select('*')
        .eq('barcode', barcode)
        .order('assigned_date', { ascending: false })
        .headers({ 'parent-code': parentCode })

      if (error) throw error

      // Sort by status first, then by date
      const sorted = (data || []).sort((a, b) => {
        const statusOrder = { pending: 0, absent: 1, attended: 2 }
        const compare = statusOrder[a.status] - statusOrder[b.status]
        if (compare !== 0) return compare
        return (
          new Date(a.detention_date).getTime() -
          new Date(b.detention_date).getTime()
        )
      })

      setViolations(sorted)
    } catch (error) {
      console.error('Error fetching violations:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="rounded-b-xl bg-tmechs-forest px-4 py-6 text-center shadow">
        <h1 className="text-2xl font-bold text-tmechs-light">
          Welcome{studentName ? ` ${studentName}` : ' Student'}
        </h1>
      </header>

      {isAdmin && (
        <div className="mt-4 text-center">
          <a
            href="/homepage"
            className="text-sm text-tmechs-forest underline hover:text-tmechs-forest/80"
          >
            ← Back to Admin Home
          </a>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-white p-6 shadow-md">
        {loading ? (
          <div className="py-4 text-center">Loading...</div>
        ) : violations.length === 0 ? (
          <div className="py-4 text-center text-gray-500">
            No violations found
          </div>
        ) : (
          <div className="space-y-4">
            {violations.map(violation => (
              <div
                key={violation.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {violation.violation_type}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {format(
                          new Date(violation.detention_date),
                          'MMMM d, yyyy'
                        )}
                      </span>
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
                    Assigned:{' '}
                    {format(new Date(violation.assigned_date), 'MMMM d, yyyy')}
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
