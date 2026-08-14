import { useMemo, useState } from 'react'
import { Check, MessageSquare, X } from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { Spinner } from '../../components/ui/Spinner'
import { StatsState } from '../../components/dashboard/StatsState'
import { EmptyState } from '../../components/ui/EmptyState'
import { useDeclarations } from '../../hooks/useStatsData'
import { validateDeclaration } from '../../lib/stats-api'
import type { Declaration } from '../../types/stats'

const QUEUE_STATUTS = ['soumis', 'valide_departement']

function queueLabel(statut: string) {
  if (statut === 'soumis') return 'En attente'
  if (statut === 'valide_departement') return 'Validé dept. — attente national'
  if (statut === 'rejete') return 'Rejeté'
  return statut
}

export function ValidationDashboardPage() {
  const { data, loading, error, reload } = useDeclarations()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const queue = useMemo(
    () => (data ?? []).filter((d) => QUEUE_STATUTS.includes(d.statut)),
    [data],
  )

  const selected = queue.find((s) => s.id === selectedId) ?? queue[0] ?? null

  const stats = useMemo(() => {
    const all = data ?? []
    return {
      pending: all.filter((d) => d.statut === 'soumis').length,
      deptValidated: all.filter((d) => d.statut === 'valide_departement').length,
      nationalValidated: all.filter((d) => d.statut === 'valide_national').length,
    }
  }, [data])

  const handleValidate = async (
    declaration: Declaration,
    action: 'approve' | 'reject',
    level: 'departement' | 'national' = 'departement',
  ) => {
    setActionLoading(true)
    try {
      await validateDeclaration(declaration.id, action, level)
      reload()
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Validation & contrôle qualité"
        description="File d'attente des déclarations RHS — données issues de la base PostgreSQL."
      />

      <StatsState loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 ? (
          <EmptyState
            title="Aucune déclaration dans votre périmètre"
            description="Aucune donnée de déclaration n'a été saisie pour les structures de votre périmètre. Contactez votre coordinateur ou les collecteurs concernés."
            icon={Check}
          />
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'En attente (département)', value: String(stats.pending), color: 'text-amber-600' },
                { label: 'Validées département', value: String(stats.deptValidated), color: 'text-blue-600' },
                { label: 'Validées national', value: String(stats.nationalValidated), color: 'text-health-green' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase text-dark-text/50">{stat.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <section className="lg:col-span-2 rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
                <h2 className="border-b border-[#e8ecf0] px-4 py-3 text-sm font-semibold text-institutional-blue">
                  File d&apos;attente ({queue.length})
                </h2>
                {queue.length === 0 ? (
                  <p className="p-6 text-sm text-dark-text/55">Aucune déclaration en attente.</p>
                ) : (
                  <ul>
                    {queue.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={`w-full border-b border-[#f0f2f5] px-4 py-3 text-left transition-colors hover:bg-light-gray/50 ${
                            selected?.id === item.id ? 'bg-health-green/5 border-l-4 border-l-health-green' : ''
                          }`}
                        >
                          <p className="font-medium text-sm">{item.structure.nom}</p>
                          <p className="text-xs text-dark-text/50">
                            {item.structure.departement.nom} · {item.structure.type_structure_label}
                          </p>
                          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                            {queueLabel(item.statut)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="lg:col-span-3 rounded-xl border border-[#e8ecf0] bg-white p-6 shadow-sm">
                {selected ? (
                  <>
                    <h2 className="text-lg font-semibold text-institutional-blue">{selected.structure.nom}</h2>
                    <p className="text-sm text-dark-text/55">
                      {selected.structure.zone_sanitaire?.nom ?? '—'} · {selected.structure.departement.nom}
                    </p>
                    <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                      {[
                        ['Effectif total', selected.effectif_total],
                        ['Médecins', selected.medecins],
                        ['Infirmiers', selected.infirmiers],
                        ['Sages-femmes', selected.sages_femmes],
                        ['Dont femmes', selected.dont_femmes],
                      ].map(([label, val]) => (
                        <div key={String(label)} className="rounded-lg bg-light-gray/40 px-4 py-3">
                          <dt className="text-xs text-dark-text/50">{label}</dt>
                          <dd className="text-lg font-semibold text-institutional-blue">{val}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-6 flex flex-wrap gap-3">
                      {selected.statut === 'soumis' && (
                        <>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleValidate(selected, 'approve', 'departement')}
                            className="inline-flex items-center gap-2 rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d6b45] disabled:opacity-60"
                          >
                            {actionLoading ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            Valider (département)
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleValidate(selected, 'reject', 'departement')}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            <X className="h-4 w-4" /> Rejeter
                          </button>
                        </>
                      )}
                      {selected.statut === 'valide_departement' && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleValidate(selected, 'approve', 'national')}
                          className="inline-flex items-center gap-2 rounded-lg bg-institutional-blue px-4 py-2 text-sm font-semibold text-white hover:bg-[#092d52] disabled:opacity-60"
                        >
                          {actionLoading ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          Validation nationale
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#e8ecf0] px-4 py-2 text-sm font-medium hover:bg-light-gray"
                      >
                        <MessageSquare className="h-4 w-4" /> Commentaire
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-dark-text/55">Sélectionnez une déclaration dans la file.</p>
                )}
              </section>
            </div>
          </>
        )}
      </StatsState>
    </div>
  )
}
