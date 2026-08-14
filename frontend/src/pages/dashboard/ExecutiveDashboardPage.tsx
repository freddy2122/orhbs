import { Download, Filter } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { formatNumber, StatsState } from '../../components/dashboard/StatsState'
import { EmptyState } from '../../components/ui/EmptyState'
import { buildExecutiveAlerts } from '../../lib/dashboard-alerts'
import { useDepartementStats, useNationalStats } from '../../hooks/useStatsData'

const heatColors = {
  high: 'bg-health-green text-white',
  medium: 'bg-gold-accent text-white',
  low: 'bg-orange-400 text-white',
  critical: 'bg-red-500 text-white',
}

function heatLevel(ratio: number, taux: number): keyof typeof heatColors {
  if (ratio < 1.5 || taux < 50) return 'critical'
  if (ratio < 2.5 || taux < 65) return 'low'
  if (ratio < 4) return 'medium'
  return 'high'
}

export function ExecutiveDashboardPage() {
  const national = useNationalStats()
  const departements = useDepartementStats()

  const n = national.data
  const avgRatio =
    departements.data && departements.data.departements.length
      ? departements.data.departements.reduce((s, d) => s + d.ratio_medecins, 0) /
        departements.data.departements.length
      : 0

  const professionData = n
    ? [
        { categorie: 'Médecins', effectif: n.medecins },
        { categorie: 'Infirmiers', effectif: n.infirmiers },
        { categorie: 'Sages-femmes', effectif: n.sages_femmes },
      ]
    : []

  const alerts = buildExecutiveAlerts(n ?? null, departements.data)

  return (
    <div>
      <PageHeader
        title="Tableau de bord exécutif"
        description={
          n?.campagne
            ? `Données officielles — ${n.campagne.libelle} (validées nationalement)`
            : 'Vue synthétique nationale des ressources humaines en santé.'
        }
        actions={
          <>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-[#e8ecf0] bg-white px-4 py-2 text-sm font-medium text-institutional-blue hover:bg-light-gray"
            >
              <Filter className="h-4 w-4" /> Filtres
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-institutional-blue px-4 py-2 text-sm font-semibold text-white hover:bg-[#092d52]"
            >
              <Download className="h-4 w-4" /> Rapport PDF
            </button>
          </>
        }
      />

      <StatsState
        loading={national.loading || departements.loading}
        error={national.error ?? departements.error}
        onRetry={() => {
          national.reload()
          departements.reload()
        }}
      >
        {n && departements.data?.departements && departements.data.departements.length > 0 ? (
          <>
            {alerts.length > 0 && (
              <section className="mb-6 space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                      alert.type === 'critical'
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  >
                    <span className="font-semibold">
                      {alert.type === 'critical' ? 'Alerte' : 'Attention'}
                    </span>
                    <span className="flex-1">{alert.message}</span>
                    <span className="text-xs opacity-70">{alert.date}</span>
                  </div>
                ))}
              </section>
            )}

            <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Professionnels recensés"
                value={formatNumber(n.effectif_total)}
                trend={`${n.structures_declarantes} structures`}
                status="ok"
              />
              <KpiCard
                label="Ratio médecins / 10 000 hab."
                value={String(n.ratio_medecins)}
                trend={`Infirmiers : ${n.ratio_infirmiers}`}
                status={n.ratio_medecins < 2.3 ? 'alert' : n.ratio_medecins < 4 ? 'warn' : 'ok'}
              />
              <KpiCard
                label="Taux de réponse collecte"
                value={`${n.taux_reponse}%`}
                trend={`${n.structures_declarantes}/${n.structures_actives} structures`}
                status={n.taux_reponse < 60 ? 'alert' : n.taux_reponse < 80 ? 'warn' : 'ok'}
              />
              <KpiCard
                label="Départements couverts"
                value={`${n.departements_couverts} / ${n.departements_total}`}
                trend="Données validées"
                status={n.departements_couverts === n.departements_total ? 'ok' : 'warn'}
              />
            </section>

            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-institutional-blue">
                  Effectifs par catégorie professionnelle
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={professionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                      <XAxis dataKey="categorie" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => formatNumber(Number(v ?? 0))} />
                      <Legend />
                      <Bar dataKey="effectif" name="Effectif" fill="#0F7B4F" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-institutional-blue">
                  Couverture par département
                </h2>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {departements.data.departements.map((dept) => {
                    const level = heatLevel(dept.ratio_medecins, dept.taux_reponse)
                    return (
                      <div
                        key={dept.departement.code}
                        className={`rounded-lg px-2 py-3 text-center text-xs font-medium ${heatColors[level]}`}
                        title={`Ratio médecins : ${dept.ratio_medecins} — Réponse : ${dept.taux_reponse}%`}
                      >
                        {dept.departement.nom}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-dark-text/60">
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-health-green" /> Bonne couverture</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-gold-accent" /> Moyenne</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-orange-400" /> Faible</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500" /> Critique</span>
                </div>
              </section>
            </div>

            <section className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-institutional-blue">
                Comparaison inter-départements — médecins (données validées)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e8ecf0] text-xs uppercase tracking-wide text-dark-text/50">
                      <th className="pb-3 pr-4 font-medium">Rang</th>
                      <th className="pb-3 pr-4 font-medium">Département</th>
                      <th className="pb-3 pr-4 font-medium">Médecins</th>
                      <th className="pb-3 pr-4 font-medium">Effectif total</th>
                      <th className="pb-3 pr-4 font-medium">Ratio / 10 000 hab.</th>
                      <th className="pb-3 font-medium">Taux réponse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departements.data.departements.map((row) => {
                      const vsAvg =
                        avgRatio > 0
                          ? `${((row.ratio_medecins / avgRatio - 1) * 100).toFixed(0)}%`
                          : '—'
                      const vsPositive = row.ratio_medecins >= avgRatio
                      return (
                        <tr key={row.departement.code} className="border-b border-[#f0f2f5] last:border-0">
                          <td className="py-3 pr-4 font-semibold text-institutional-blue">#{row.rang}</td>
                          <td className="py-3 pr-4">{row.departement.nom}</td>
                          <td className="py-3 pr-4">{formatNumber(row.totals.medecins)}</td>
                          <td className="py-3 pr-4">{formatNumber(row.totals.effectif_total)}</td>
                          <td className="py-3 pr-4">{row.ratio_medecins}</td>
                          <td className={`py-3 font-medium ${vsPositive ? 'text-health-green' : 'text-red-500'}`}>
                            {vsPositive ? '+' : ''}{vsAvg} · {row.taux_reponse}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : n ? (
          <EmptyState
            title="Aucune donnée validée disponible"
            description="Aucune déclaration n'a encore été validée au niveau national. Les statistiques comparatives inter-départements seront affichées une fois les données validées disponibles."
            icon={Filter}
          />
        ) : null}
      </StatsState>
    </div>
  )
}
