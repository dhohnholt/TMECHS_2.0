import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronDown,
  UserCog,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface User {
  id: string
  name: string
  email: string
  is_approved: boolean
  role: string
  created_at: string
}

export default function TeacherApproval() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null)

  useEffect(() => {
    checkAdminStatus()
    fetchUsers()
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

      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || userData?.role !== 'admin') {
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

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (userId: string, approve: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_approved: approve })
        .eq('id', userId)

      if (error) throw error

      toast.success(`User ${approve ? 'approved' : 'unapproved'} successfully`)
      fetchUsers()

      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-magic-link`
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            userEmail: users.find(u => u.id === userId)?.email,
          }),
        })
      } catch (emailError) {
        console.error('Failed to send magic link:', emailError)
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user status')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      toast.success(`User role updated to ${newRole}`)
      setShowRoleDropdown(null)
      fetchUsers()
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Failed to update role')
    }
  }

  const filteredUsers = users.filter(
    user =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAdmin) return null

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
        <h1 className="text-2xl font-bold text-gray-800">Teacher Approval</h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="rounded-md border border-gray-300 pl-10 focus:border-tmechs-forest focus:ring-tmechs-forest"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
          >
            <RefreshCw className="mr-1 h-5 w-5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-tmechs-forest" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Registration Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <Shield
                          className={`mr-2 h-5 w-5 ${user.is_approved ? 'text-green-500' : 'text-gray-400'}`}
                        />
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${user.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                      >
                        {user.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowRoleDropdown(
                              showRoleDropdown === user.id ? null : user.id
                            )
                          }
                          className="flex items-center text-sm text-gray-700 hover:text-gray-900"
                        >
                          <UserCog className="mr-1 h-4 w-4" />
                          {user.role}
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </button>

                        {showRoleDropdown === user.id && (
                          <div className="absolute z-10 mt-1 w-36 rounded-md bg-white shadow-lg">
                            <div className="py-1">
                              <button
                                onClick={() =>
                                  handleRoleChange(user.id, 'teacher')
                                }
                                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Teacher
                              </button>
                              <button
                                onClick={() =>
                                  handleRoleChange(user.id, 'admin')
                                }
                                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Admin
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      {user.is_approved ? (
                        <button
                          onClick={() => handleApproval(user.id, false)}
                          className="text-red-600 hover:text-red-900"
                          title="Revoke Approval"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproval(user.id, true)}
                          className="text-green-600 hover:text-green-900"
                          title="Approve User"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                      )}
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
                  Only approved teachers can assign detentions and sign up for
                  monitoring
                </li>
                <li>
                  Teachers will be notified by email when their status changes
                </li>
                <li>Review teacher information carefully before approval</li>
                <li>
                  Admin users have full system access and can manage other users
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
