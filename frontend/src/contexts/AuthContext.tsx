import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DASHBOARD_ROLES,
  getRoleMeta,
  type DashboardRole,
} from '../constants/dashboard'
import {
  clearTokens,
  fetchCurrentUser,
  getAccessToken,
  loginRequest,
  setTokens,
} from '../lib/auth-api'
import type { AuthUser } from '../types/auth'

type AuthContextValue = {
  user: AuthUser | null
  role: DashboardRole | null
  roleMeta: (typeof DASHBOARD_ROLES)[number] | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const current = await fetchCurrentUser()
      setUser(current)
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  const login = useCallback(async (username: string, password: string) => {
    const data = await loginRequest(username, password)
    setTokens(data.access, data.refresh)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const role = user?.profile.role ?? null
  const roleMeta = role ? getRoleMeta(role) : null

  const value = useMemo(
    () => ({
      user,
      role,
      roleMeta,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, role, roleMeta, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Compatibilité avec les pages dashboard existantes */
export function useDashboardRole() {
  const { role, roleMeta, user } = useAuth()
  if (!role || !roleMeta || !user) {
    throw new Error('Utilisateur non connecté ou profil incomplet')
  }
  return {
    role,
    roleMeta,
    user,
  }
}
