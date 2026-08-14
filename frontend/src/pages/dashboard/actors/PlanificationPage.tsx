import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, Target } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../../../components/dashboard/PageHeader'
import { SecureActorsNotice } from '../../../components/dashboard/SecureActorsNotice'
import { StatsState } from '../../../components/dashboard/StatsState'
import { fetchPlanification } from '../../../lib/acteurs-api'
import type { PlanificationResponse } from '../../../types/acteurs'

const PRIORITE_STYLES = {
  Haute: 'bg-red-100 text-red-800',
  Moyenne: 'bg-amber-100 text-amber-800',
  Basse: 'bg-green-100 text-green-800',
}

export function PlanificationPage() {
  const [data, setData] = useState<PlanificationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = () => {
    setLoading(true)
    setError(null)
    fetchPlanification()
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  const besoins = data?.besoins_recruitement ?? []
  const retraites = data?.alertes_retraite ?? []

  const chartData = besoins.slice(0, 12).map((z) => ({
    zone: z.zone.nom.replace(/^Zone sanitaire /, '').replace(/^HZ /, ''),
    total: z.besoin_medecins + z.besoin_infirmiers + z.besoin_sages_femmes,
  }))

  return (
    <div>
      <PageHeader
        title="Planification opérationnelle"
        description={
          data?.campagne
            ? `Besoins en recrutement et alertes retraite — ${data.campagne.libelle}`
            : 'Besoins en recrutement par zone et alertes de départ à la retraite.'
        }
      />
      <SecureActorsNotice />

      <StatsState loading={loading} error={error} onRetry={reload}>
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-institutional-blue">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alertes départs à la retraite
          </h2>
          {retraites.length === 0 ? (
            <p className="rounded-xl border border-[#e8ecf0] bg-white p-6 text-sm text-dark-text/60">
              Aucun départ à la retraite prévu dans les 12 prochains mois pour votre périmètre.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {retraites.map((alert) => (
                <article
                  key={alert.id}
                  className={`rounded-xl border p-4 ${
                    alert.horizon === '6 mois'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-institutional-blue">{alert.agent}</p>
                      <p className="text-sm text-dark-text/60">
                        {alert.profession} — {alert.structure}
                      </p>
                      <p className="text-xs text-dark-text/45">{alert.departement}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        alert.horizon === '6 mois'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-blue-200 text-blue-900'
                      }`}
                    >
                      {alert.horizon}
                    </span>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-xs text-dark-text/55">
                    <Calendar className="h-3.5 w-3.5" />
                    Échéance : {new Date(alert.echeance).toLocaleDateString('fr-FR')}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-institutional-blue">
            <Target className="h-5 w-5 text-health-green" />
            Besoins en recrutement par zone
          </h2>

          {besoins.length === 0 ? (
            <p className="rounded-xl border border-[#e8ecf0] bg-white p-6 text-sm text-dark-text/60">
              Aucune déclaration disponible pour calculer les besoins de recrutement.
            </p>
          ) : (
            <>
              <div className="mb-6 h-64 rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                    <XAxis dataKey="zone" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="total"
                      name="Postes à pourvoir (estimés)"
                      fill="#0F7B4F"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b bg-light-gray/50 text-xs uppercase text-dark-text/50">
                      <th className="px-4 py-3 font-medium">Zone</th>
                      <th className="px-4 py-3 font-medium">Département</th>
                      <th className="px-4 py-3 text-center">Médecins</th>
                      <th className="px-4 py-3 text-center">Infirmiers</th>
                      <th className="px-4 py-3 text-center">Sages-femmes</th>
                      <th className="px-4 py-3 text-center">Vacants</th>
                      <th className="px-4 py-3 font-medium">Priorité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {besoins.map((row) => (
                      <tr key={row.zone.code} className="border-b border-[#f0f2f5]">
                        <td className="px-4 py-3 font-medium">{row.zone.nom}</td>
                        <td className="px-4 py-3">{row.departement.nom}</td>
                        <td className="px-4 py-3 text-center">{row.besoin_medecins}</td>
                        <td className="px-4 py-3 text-center">{row.besoin_infirmiers}</td>
                        <td className="px-4 py-3 text-center">{row.besoin_sages_femmes}</td>
                        <td className="px-4 py-3 text-center font-medium text-red-600">
                          {row.postes_vacants}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITE_STYLES[row.priorite]}`}
                          >
                            {row.priorite}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </StatsState>
    </div>
  )
}
