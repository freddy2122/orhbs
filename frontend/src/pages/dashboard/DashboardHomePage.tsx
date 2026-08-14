import { Navigate } from 'react-router-dom'
import { useDashboardRole } from '../../contexts/AuthContext'

export function DashboardHomePage() {
  const { roleMeta } = useDashboardRole()
  return <Navigate to={roleMeta.defaultRoute} replace />
}
