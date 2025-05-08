import { supabase } from './supabase'

export type UserRole = 'student' | 'parent' | 'teacher' | 'admin'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
}

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) return null

    return {
      id: user.id,
      email: user.email!,
      role: userData.role,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export const hasRole = (
  user: AuthUser | null,
  ...roles: UserRole[]
): boolean => {
  if (!user) return false
  return roles.includes(user.role)
}

export const canAccessStudent = async (studentId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('can_access_student', {
      student_id: studentId,
    })

    if (error) throw error
    return !!data
  } catch (error) {
    console.error('Error checking student access:', error)
    return false
  }
}

export const isAdmin = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_admin')
    if (error) throw error
    return !!data
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}
