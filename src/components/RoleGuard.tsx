import React from 'react'
import { Navigate } from 'react-router-dom'
import { UserRole, hasRole, AuthUser } from '../lib/auth'

interface RoleGuardProps {
  children: React.ReactNode
  user: AuthUser | null
  allowedRoles: UserRole[]
  redirectTo?: string
}

export default function RoleGuard({
  children,
  user,
  allowedRoles,
  redirectTo = '/login',
}: RoleGuardProps) {
  if (!user || !hasRole(user, ...allowedRoles)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
