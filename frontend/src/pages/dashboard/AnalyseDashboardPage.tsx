import { useState } from 'react'
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
import { EmptyState } from '../../components/ui/EmptyState'
import { formatNumber, StatsState } from '../../components/dashboard/StatsState'
import { useDepartementStats, useNationalStats, useZoneStats } from '../../hooks/useStatsData'

const analyseTabs = [
  { id: 'overview', label: 'Vue analytique' },
  { id: 'charts', label: 'Générateur graphiques' },
  { id: 'crosstab', label: 'Tableaux croisés' },
  { id: 'nhwa', label: 'Indicateurs NHWA' },
  { id: 'simulation', label: 'Projections' },
  { id: 'drafts', label: 'Brouillons publications' },
] as const

type TabId = (typeof analyseTabs)[number]['id']

export function AnalyseDashboardPage() {
  const [tab, setTab] = useState<TabId>('overview')
  const national = useNationalStats()
  const departements = useDepartementStats()
  const zones = useZoneStats()

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
        <EmptyState
          title="Générateur de graphiques"
          description="Module en développement — vous pourrez construire des visualisations personnalisées à partir des données validées."
        />
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
        <EmptyState
          title="Indicateurs NHWA non calculés"
          description="Les 78 indicateurs de la National Health Workforce Accounts (OMS) seront générés automatiquement à partir des déclarations validées nationalement."
        />
      )}

      {tab === 'simulation' && (
        <EmptyState
          title="Projections RH non disponibles"
          description="Le module de simulation (recrutements, retraites, horizon 5-10 ans) sera connecté aux données de planification en base."
        />
      )}

      {tab === 'drafts' && (
        <EmptyState
          title="Aucun brouillon de publication"
          description="Les rapports en cours de rédaction par l'équipe analyse apparaîtront ici."
        />
      )}
    </div>
  )
}
