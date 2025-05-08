import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Users,
  Mail,
  RefreshCw,
  Search,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ParentAccount {
  student_id: string
  student_name: string
  student_email: string
  parent_email: string
  parent_access_code: string
  parent_verified: boolean
  parent_verified_at: string | null
}

export default function ParentAccounts() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<ParentAccount[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminStatus()
    fetchAccounts()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: teacherData, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (error || !teacherData?.is_admin) {
        toast.error('Unauthorized access')
        navigate('/')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error checking admin status:', error)
      navigate('/')
    }
  }

  const fetchAccounts = async () => {
    try {
      // Fixed query with proper column selection
      const { data, error } = await supabase
        .from('students')
        .select(
          `
          id,
          name,
          email,
          parent_email,
          parent_access_code,
          parent_verified,
          parent_verified_at
        `
        )
        .order('name')

      if (error) throw error

      // Transform the data to match the ParentAccount interface
      const transformedData: ParentAccount[] = (data || []).map(student => ({
        student_id: student.id,
        student_name: student.name,
        student_email: student.email,
        parent_email: student.parent_email,
        parent_access_code: student.parent_access_code,
        parent_verified: student.parent_verified,
        parent_verified_at: student.parent_verified_at,
      }))

      setAccounts(transformedData)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast.error('Failed to load parent accounts')
    } finally {
      setLoading(false)
    }
  }

  const regenerateAccessCode = async (studentId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_parent_access_code')

      if (error) throw error

      const newCode = data

      const { error: updateError } = await supabase
        .from('students')
        .update({
          parent_access_code: newCode,
          parent_verified: false,
          parent_verified_at: null,
        })
        .eq('id', studentId)

      if (updateError) throw updateError

      toast.success('Access code regenerated successfully')
      fetchAccounts()
    } catch (error) {
      console.error('Error regenerating access code:', error)
      toast.error('Failed to regenerate access code')
    }
  }

  const updateParentEmail = async (studentId: string, newEmail: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ parent_email: newEmail })
        .eq('id', studentId)

      if (error) throw error

      toast.success('Parent email updated successfully')
      fetchAccounts()
    } catch (error) {
      console.error('Error updating parent email:', error)
      toast.error('Failed to update parent email')
    }
  }

  const filteredAccounts = accounts.filter(
    account =>
      account.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.parent_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.parent_access_code
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  )

  if (!isAdmin) {
    return null
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="ml-1">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          Parent Account Management
        </h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="rounded-md border border-gray-300 bg-tmechs-forest pl-10 focus:border-tmechs-forest focus:ring-tmechs-forest"
              />
            </div>
          </div>
          <button
            onClick={fetchAccounts}
            className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
          >
            <RefreshCw className="mr-1 h-5 w-5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-tmechs-forest" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Parent Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Access Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredAccounts.map(account => (
                  <tr key={account.student_id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <Users className="mr-2 h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {account.student_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {account.student_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <Mail className="mr-2 h-5 w-5 text-gray-400" />
                        <div className="text-sm text-gray-900">
                          {account.parent_email}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <Key className="mr-2 h-5 w-5 text-gray-400" />
                        <code className="rounded bg-tmechs-forest px-2 py-1 text-sm">
                          {account.parent_access_code}
                        </code>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          account.parent_verified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {account.parent_verified ? (
                          <>
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Verified
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1 h-4 w-4" />
                            Pending
                          </>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => regenerateAccessCode(account.student_id)}
                        className="mr-4 text-tmechs-forest hover:text-tmechs-forest/80"
                        title="Regenerate access code"
                      >
                        <Key className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          const newEmail = prompt(
                            'Enter new parent email:',
                            account.parent_email
                          )
                          if (newEmail && newEmail !== account.parent_email) {
                            updateParentEmail(account.student_id, newEmail)
                          }
                        }}
                        className="text-tmechs-forest hover:text-tmechs-forest/80"
                        title="Update parent email"
                      >
                        <Mail className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 rounded-md bg-yellow-50 p-4">
          <div className="flex items-start">
            <AlertTriangle className="mr-3 mt-1 text-yellow-500" />
            <div className="text-sm text-yellow-700">
              <p className="mb-1 font-medium">Important Notes:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  Regenerating an access code will invalidate the previous one
                </li>
                <li>
                  Parents will need to verify their account again after email
                  changes
                </li>
                <li>
                  Access codes are automatically generated for new students
                </li>
                <li>
                  Verification status is updated automatically when parents
                  first log in
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
