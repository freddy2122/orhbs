import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { AlertsBell } from '../components/dashboard/AlertsBell'
import { LOGOS } from '../constants/institutional'
import { DASHBOARD_NAV, rolePath } from '../constants/dashboard'
import { useAuth, useDashboardRole } from '../contexts/AuthContext'
import { fetchActiveCampagne } from '../lib/collecte-api'
import { FlagBar } from '../components/ui/FlagBar'

export function DashboardLayout() {
  const { role, roleMeta, user } = useDashboardRole()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navItems = DASHBOARD_NAV.filter((item) => item.roles.includes(role))
  const isActorsSpace = pathname.includes('/acteurs')

  const scopeLabel =
    user.profile.structure?.nom ??
    user.profile.departement?.nom ??
    user.profile.scope_label

  const [campagneLabel, setCampagneLabel] = useState<string | null>(null)

  useEffect(() => {
    fetchActiveCampagne()
      .then((c) => setCampagneLabel(c.libelle))
      .catch(() => setCampagneLabel(null))
  }, [])

  const lastUpdateLabel = campagneLabel
    ? `${campagneLabel} — données en base`
    : 'Chargement…'

  const handleLogout = () => {
    logout()
    navigate('/espace-prive')
  }

  return (
    <div className="flex min-h-screen bg-[#f0f2f5]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#e2e8f0] bg-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#e8ecf0] p-4">
          <div className="flex items-center gap-2">
            <img src={LOGOS.orhsb} alt="" className="h-9 w-9 rounded-full" />
            <div>
              <p className="text-sm font-semibold text-institutional-blue">ORHS</p>
              <p className="text-[10px] text-dark-text/50">
                {isActorsSpace ? 'Espace acteurs' : 'Espace sécurisé'}
              </p>
            </div>
          </div>
          <button type="button" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-[#e8ecf0] p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-dark-text/50">
            Profil connecté
          </p>
          <p className="mt-1 text-sm font-semibold text-institutional-blue">{user.full_name}</p>
          <p className="text-xs text-health-green">{roleMeta.label}</p>
          <p className="mt-1 text-[10px] text-dark-text/45">{scopeLabel}</p>
          {user.profile.poste && (
            <p className="mt-0.5 text-[10px] text-dark-text/45">{user.profile.poste}</p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const path = rolePath(role, item.section)
              return (
                <li key={path}>
                  <NavLink
                    to={path}
                    end={item.section === ''}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-health-green/10 text-health-green'
                          : 'text-dark-text/70 hover:bg-light-gray hover:text-institutional-blue'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-[#e8ecf0] p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-dark-text/60 hover:bg-light-gray"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Site public
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-dark-text/60 hover:bg-light-gray"
          >
            <LogOut className="h-3.5 w-3.5" /> Déconnexion
          </button>
        </div>
        <FlagBar className="h-0.5" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[#e8ecf0] bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button type="button" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5 text-institutional-blue" />
              </button>
              <div>
                <p className="text-xs text-dark-text/50">Dernière actualisation</p>
                <p className="text-sm font-medium text-institutional-blue">{lastUpdateLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertsBell role={role} structureId={user.profile.structure?.id ?? null} />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-institutional-blue">{user.full_name}</p>
                <p className="text-xs text-health-green">{roleMeta.label}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
