import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { localizeDashboardHref, type DashboardRole } from '../../constants/dashboard'
import { useDashboardAlerts } from '../../hooks/useDashboardAlerts'
import type { DashboardAlert } from '../../types/alerts'
import { Spinner } from '../ui/Spinner'

function alertStyles(type: DashboardAlert['type']) {
  switch (type) {
    case 'critical':
      return 'border-red-100 bg-red-50 text-red-800'
    case 'warning':
      return 'border-amber-100 bg-amber-50 text-amber-900'
    default:
      return 'border-blue-100 bg-blue-50 text-blue-900'
  }
}

function alertLabel(type: DashboardAlert['type']) {
  switch (type) {
    case 'critical':
      return 'Alerte'
    case 'warning':
      return 'Attention'
    default:
      return 'Info'
  }
}

export function AlertsBell({ role, structureId }: { role: DashboardRole | null; structureId?: number | null }) {
  const { alerts, loading, error, reload } = useDashboardAlerts(role, structureId)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const count = alerts.length

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-[#e8ecf0] p-2 hover:bg-light-gray"
        title="Alertes"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5 text-institutional-blue" />
        {!loading && count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-[#e8ecf0] bg-white shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b border-[#e8ecf0] px-4 py-3">
            <p className="text-sm font-semibold text-institutional-blue">Alertes</p>
            {loading && <Spinner className="h-4 w-4 text-health-green" />}
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-center text-xs text-red-700">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={reload}
                  className="mt-2 font-medium underline"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!error && !loading && alerts.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-dark-text/50">
                Aucune alerte pour le moment.
              </p>
            )}

            {!error &&
              alerts.map((alert) => {
                const content = (
                  <div
                    className={`rounded-lg border px-3 py-2.5 text-sm ${alertStyles(alert.type)}`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                      {alertLabel(alert.type)}
                    </p>
                    <p className="mt-0.5 leading-snug">{alert.message}</p>
                    {alert.date && (
                      <p className="mt-1 text-[10px] opacity-60">{alert.date}</p>
                    )}
                  </div>
                )

                return alert.href ? (
                  <Link
                    key={alert.id}
                    to={role ? localizeDashboardHref(role, alert.href) : alert.href}
                    onClick={() => setOpen(false)}
                    className="mb-2 block last:mb-0 hover:opacity-90"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={alert.id} className="mb-2 last:mb-0">
                    {content}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
