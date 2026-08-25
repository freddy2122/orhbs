import { useEffect, useState } from 'react'
import { Activity, Database, HardDrive } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import {
  fetchBackupHistory,
  fetchMonitoringMetrics,
  fetchSystemHealth,
  triggerBackup,
  type BackupRow,
  type MonitoringMetrics,
  type SystemHealth,
} from '../../lib/admin-ops-api'

function statusClass(status?: string) {
  if (status === 'healthy' || status === 'ok') return 'text-health-green'
  if (status === 'warning' || status === 'degraded') return 'text-amber-600'
  return 'text-red-600'
}

export function MonitoringPanel() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null)
  const [backups, setBackups] = useState<BackupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([fetchSystemHealth(), fetchMonitoringMetrics(), fetchBackupHistory()])
      .then(([h, m, b]) => {
        setHealth(h)
        setMetrics(m)
        setBackups(b)
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleBackup = async () => {
    setRunning(true)
    setMessage(null)
    try {
      const result = await triggerBackup()
      setMessage(result.success ? `Sauvegarde créée (${result.format ?? 'ok'}).` : result.error ?? 'Échec')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible.')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-health-green" />
      </div>
    )
  }

  if (error && !health) {
    return <EmptyState title="Monitoring indisponible" description={error} icon={Activity} />
  }

  const app = metrics?.application ?? {}
  const perf = metrics?.performance ?? {}
  const db = metrics?.database ?? {}

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'État global', value: health?.overall_status ?? '—', icon: Activity, status: health?.overall_status },
          { label: 'Base de données', value: health?.database.status ?? '—', icon: Database, status: health?.database.status },
          { label: 'Stockage', value: health?.storage.status ?? '—', icon: HardDrive, status: health?.storage.status },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs uppercase text-dark-text/50">
              <card.icon className="h-4 w-4" /> {card.label}
            </p>
            <p className={`mt-1 text-2xl font-bold capitalize ${statusClass(card.status)}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Temps requête SQL', value: perf.avg_query_time_ms != null ? `${perf.avg_query_time_ms} ms` : '—' },
          { label: 'Taille base', value: db.database_size_mb != null ? `${db.database_size_mb} Mo` : '—' },
          { label: 'Agents actifs', value: app.agents_count ?? '—' },
          { label: 'Déclarations', value: app.declarations_count ?? '—' },
          { label: 'Structures', value: app.structures_count ?? '—' },
          { label: 'Utilisateurs', value: app.users_count ?? '—' },
          { label: 'Journaux d’audit', value: app.audit_logs_count ?? '—' },
          { label: 'Espace libre', value: typeof health?.storage.details?.free_percent === 'number' ? `${health.storage.details.free_percent} %` : '—' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-dark-text/50">{card.label}</p>
            <p className="mt-1 text-xl font-bold text-institutional-blue">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-institutional-blue">Sauvegardes</h3>
          <button
            type="button"
            onClick={handleBackup}
            disabled={running}
            className="rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {running ? 'Sauvegarde…' : 'Lancer une sauvegarde'}
          </button>
        </div>
        {message && <p className="mb-3 text-sm text-health-green">{message}</p>}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {backups.length === 0 ? (
          <p className="text-sm text-dark-text/55">Aucune sauvegarde enregistrée pour le moment.</p>
        ) : (
          <ul className="divide-y divide-[#e8ecf0]">
            {backups.map((item) => (
              <li key={item.filename} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono text-xs">{item.filename}</span>
                <span className="text-dark-text/50">
                  {item.size_mb} Mo · {new Date(item.created).toLocaleString('fr-FR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
