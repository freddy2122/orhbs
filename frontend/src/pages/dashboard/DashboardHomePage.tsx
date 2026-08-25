import { Navigate, useLocation } from 'react-router-dom'
import { getRoleMeta } from '../../constants/dashboard'
import { useDashboardRole } from '../../contexts/AuthContext'
import { AdminDashboardPage } from './AdminDashboardPage'

export function DashboardHomePage() {
  const { role } = useDashboardRole()
  const { pathname } = useLocation()
  const target = getRoleMeta(role).defaultRoute

  if (role === 'admin' && pathname === '/dashboard/admin') {
    return <AdminDashboardPage />
  }

  if (pathname === target) {
    return null
  }

  return <Navigate to={target} replace />
}
