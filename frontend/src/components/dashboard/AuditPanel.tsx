import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { fetchAuditLogs, type AuditLogRow } from '../../lib/admin-ops-api'

const ACTION_OPTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'login', label: 'Connexion' },
  { value: 'logout', label: 'Déconnexion' },
  { value: 'create', label: 'Création' },
  { value: 'update', label: 'Modification' },
  { value: 'delete', label: 'Suppression' },
  { value: 'submit', label: 'Soumission' },
  { value: 'validate', label: 'Validation' },
  { value: 'reject', label: 'Rejet' },
  { value: 'import', label: 'Import' },
  { value: 'export', label: 'Export' },
]

export function AuditPanel() {
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchAuditLogs({ action: action || undefined })
      .then(setRows)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [action])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-health-green" />
      </div>
    )
  }

  if (error) {
    return <EmptyState title="Journal indisponible" description={error} icon={Shield} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-dark-text/60">{rows.length} événement(s) récent(s)</p>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="Aucun journal d'audit"
          description="Les connexions et actions sensibles apparaîtront ici dès qu'elles seront enregistrées."
          icon={Shield}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-light-gray/50 text-xs uppercase text-dark-text/50">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Objet</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ecf0]">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-dark-text/70">
                    {new Date(row.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">{row.user?.full_name || row.user?.username || '—'}</td>
                  <td className="px-4 py-3 font-medium text-institutional-blue">{row.action_label}</td>
                  <td className="px-4 py-3">
                    <p>{row.description || row.object_repr || '—'}</p>
                    {row.model_name && (
                      <p className="text-xs text-dark-text/45">{row.model_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-dark-text/50">{row.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
