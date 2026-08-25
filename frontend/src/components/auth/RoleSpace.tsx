import type { ReactNode } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { isDashboardRole, rolePath, type DashboardRole } from '../../constants/dashboard'
import { useDashboardRole } from '../../contexts/AuthContext'

export function RoleSpace() {
  const { acteur } = useParams()
  const { role } = useDashboardRole()

  if (!acteur || !isDashboardRole(acteur)) {
    return <Navigate to={rolePath(role)} replace />
  }

  if (acteur !== role) {
    return <Navigate to={rolePath(role)} replace />
  }

  return <Outlet />
}

export function RoleGuard({
  allow,
  children,
}: {
  allow: DashboardRole[]
  children: ReactNode
}) {
  const { role } = useDashboardRole()
  if (!allow.includes(role)) {
    return <Navigate to={rolePath(role)} replace />
  }
  return children
}
