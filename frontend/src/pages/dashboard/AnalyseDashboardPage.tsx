import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { ReportsPanel } from '../../components/dashboard/ReportsPanel'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatNumber, StatsState } from '../../components/dashboard/StatsState'
import { useDepartementStats, useNationalStats, useZoneStats } from '../../hooks/useStatsData'
import { fetchReportData, type ReportData } from '../../lib/reports-api'

const analyseTabs = [
  { id: 'overview', label: 'Vue analytique' },
  { id: 'charts', label: 'Générateur graphiques' },
  { id: 'crosstab', label: 'Tableaux croisés' },
  { id: 'nhwa', label: 'Indicateurs NHWA' },
  { id: 'simulation', label: 'Projections' },
  { id: 'rapports', label: 'Rapports PDF/Excel' },
] as const

type TabId = (typeof analyseTabs)[number]['id']

export function AnalyseDashboardPage() {
  const [tab, setTab] = useState<TabId>('overview')
  const national = useNationalStats()
  const departements = useDepartementStats()
  const zones = useZoneStats()
  const [annuel, setAnnuel] = useState<ReportData | null>(null)
  const [oms, setOms] = useState<ReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const loadReports = () => {
    setReportLoading(true)
    setReportError(null)
    Promise.all([fetchReportData('annuel_orhs'), fetchReportData('oms_unfpa')])
      .then(([a, o]) => {
        setAnnuel(a)
        setOms(o)
      })
      .catch((err: Error) => setReportError(err.message))
      .finally(() => setReportLoading(false))
  }

  useEffect(() => {
    loadReports()
  }, [])

  const deptChartData =
    departements.data?.departements.map((d) => ({
      dept: d.departement.nom,
      medecins: d.totals.medecins,
      infirmiers: d.totals.infirmiers,
      effectif: d.totals.effectif_total,
    })) ?? []

  const nationalChart = national.data
    ? [
        { categorie: 'Médecins', effectif: national.data.medecins },
        { categorie: 'Infirmiers', effectif: national.data.infirmiers },
        { categorie: 'Sages-femmes', effectif: national.data.sages_femmes },
      ]
    : []

  return (
    <div>
      <PageHeader
        title="Analyse & production de rapports"
        description="Tableau de bord analytique complet — statisticiens et analystes DRH."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {analyseTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-institutional-blue text-white' : 'bg-white text-dark-text/70 border border-[#e8ecf0] hover:bg-light-gray'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <StatsState
          loading={departements.loading || national.loading}
          error={departements.error ?? national.error}
          onRetry={() => {
            departements.reload()
            national.reload()
          }}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-institutional-blue">
                Médecins par département (validés)
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="dept" type="category" width={80} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="medecins" name="Médecins" fill="#0F7B4F" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-institutional-blue">
                Répartition nationale par profession
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nationalChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categorie" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatNumber(Number(v))} />
                    <Bar dataKey="effectif" fill="#0B3A66" name="Effectif" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </StatsState>
      )}

      {tab === 'charts' && (
        <StatsState loading={reportLoading} error={reportError} onRetry={loadReports}>
          {(() => {
            const pyramide = annuel?.indicateurs.pyramide_ages as Record<string, number> | undefined
            const chartData = pyramide
              ? Object.entries(pyramide).map(([tranche, effectif]) => ({ tranche, effectif }))
              : []
            if (!chartData.length) {
              return (
                <EmptyState
                  title="Aucune pyramide des âges"
                  description="Renseignez les dates de naissance des agents pour construire le graphique."
                />
              )
            }
            return (
              <section className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
                <h2 className="mb-4 font-semibold text-institutional-blue">Pyramide des âges (agents en base)</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tranche" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => formatNumber(Number(v))} />
                      <Bar dataKey="effectif" fill="#0F7B4F" name="Agents" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )
          })()}
        </StatsState>
      )}

      {tab === 'crosstab' && (
        <StatsState
          loading={zones.loading}
          error={zones.error}
          onRetry={zones.reload}
        >
          {!zones.data?.zones.length ? (
            <EmptyState
              title="Aucune donnée pour les tableaux croisés"
              description="Les statistiques par zone sanitaire apparaîtront après validation nationale des déclarations."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-light-gray/50 text-xs uppercase text-dark-text/50">
                    <th className="px-4 py-3 text-left">Zone sanitaire</th>
                    <th className="px-4 py-3 text-left">Département</th>
                    <th className="px-4 py-3">Médecins</th>
                    <th className="px-4 py-3">Infirmiers</th>
                    <th className="px-4 py-3">Effectif total</th>
                    <th className="px-4 py-3">Taux réponse</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.data.zones.map((row) => (
                    <tr key={row.zone.code} className="border-b border-[#f0f2f5]">
                      <td className="px-4 py-3 font-medium">{row.zone.nom}</td>
                      <td className="px-4 py-3">{row.departement.nom}</td>
                      <td className="px-4 py-3 text-center">{formatNumber(row.totals.medecins)}</td>
                      <td className="px-4 py-3 text-center">{formatNumber(row.totals.infirmiers)}</td>
                      <td className="px-4 py-3 text-center">{formatNumber(row.totals.effectif_total)}</td>
                      <td className="px-4 py-3 text-center">{row.taux_reponse}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </StatsState>
      )}

      {tab === 'nhwa' && (
        <StatsState loading={reportLoading} error={reportError} onRetry={loadReports}>
          {(() => {
            const ratios = oms?.indicateurs.ratios_oms as Record<string, number | boolean> | undefined
            if (!ratios) {
              return (
                <EmptyState
                  title="Indicateurs OMS indisponibles"
                  description="Les ratios médecins/infirmiers pour 10 000 habitants apparaîtront après validation nationale."
                />
              )
            }
            return (
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Personnel qualifié / 10 000 hab. (seuil OMS 23)', value: ratios.ratio_personnel_qualifie, ok: ratios.conforme_oms_rhs },
                  { label: 'Tous agents / 10 000 hab.', value: ratios.ratio_rhs_10k, ok: Number(ratios.ratio_rhs_10k) >= 23 },
                  { label: 'Médecins / 10 000 hab.', value: ratios.ratio_medecins, ok: ratios.conforme_medecins },
                  { label: 'Infirmiers / 10 000 hab.', value: ratios.ratio_infirmiers, ok: ratios.conforme_infirmiers },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase text-dark-text/50">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold text-institutional-blue">{String(item.value)}</p>
                    <p className={`mt-2 text-sm ${item.ok ? 'text-health-green' : 'text-amber-700'}`}>
                      {item.ok ? 'Conforme à la référence OMS' : 'Sous le seuil de référence OMS'}
                    </p>
                  </div>
                ))}
                <p className="col-span-full text-xs text-dark-text/50">
                  Densité OMS historique : 23 personnels de santé qualifiés (médecins, infirmiers, sages-femmes) pour 10 000 habitants. Les 78 indicateurs NHWA complets restent à brancher.
                </p>
              </div>
            )
          })()}
        </StatsState>
      )}

      {tab === 'simulation' && (
        <StatsState loading={reportLoading} error={reportError} onRetry={loadReports}>
          {(() => {
            const retraites = annuel?.indicateurs.retraites as Record<string, number> | undefined
            const evolution = annuel?.indicateurs.evolution as { annee: number; effectif: number }[] | undefined
            if (!evolution?.length && !retraites) {
              return (
                <EmptyState
                  title="Pas encore d'historique de campagnes"
                  description="Les projections s'appuient sur l'évolution des effectifs validés d'une année sur l'autre."
                />
              )
            }
            return (
              <div className="space-y-6">
                {evolution?.length ? (
                  <section className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
                    <h2 className="mb-4 font-semibold text-institutional-blue">Évolution des effectifs validés</h2>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={evolution}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => formatNumber(Number(v))} />
                          <Bar dataKey="effectif" fill="#0B3A66" name="Effectif" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                ) : null}
                {retraites ? (
                  <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {[
                      ['6 mois', retraites.prochaines_6_mois],
                      ['12 mois', retraites.prochaines_12_mois],
                      ['24 mois', retraites.prochaines_24_mois],
                      ['5 ans', retraites.prochaines_5_ans],
                      ['10 ans', retraites.prochaines_10_ans],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase text-dark-text/50">Départs retraite {label}</p>
                        <p className="mt-2 text-2xl font-bold text-institutional-blue">{formatNumber(Number(value ?? 0))}</p>
                      </div>
                    ))}
                  </section>
                ) : null}
              </div>
            )
          })()}
        </StatsState>
      )}

      {tab === 'rapports' && <ReportsPanel />}
    </div>
  )
}
