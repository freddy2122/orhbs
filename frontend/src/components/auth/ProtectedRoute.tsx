import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner } from '../ui/Spinner'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f2f5]">
        <Spinner className="h-8 w-8 text-health-green" label="Chargement de votre session…" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/espace-prive" state={{ from: location.pathname }} replace />
  }

  return children
}
