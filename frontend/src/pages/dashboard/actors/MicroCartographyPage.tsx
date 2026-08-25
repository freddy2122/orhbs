/* eslint-disable react-hooks/set-state-in-effect */
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
import { PageHeader } from '../../../components/dashboard/PageHeader'
import { SecureActorsNotice } from '../../../components/dashboard/SecureActorsNotice'
import { StatsState } from '../../../components/dashboard/StatsState'
import { fetchCartography } from '../../../lib/acteurs-api'
import type { CartographyResponse, CartographyStructureRow } from '../../../types/acteurs'

export function MicroCartographyPage() {
  const [data, setData] = useState<CartographyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const reload = () => {
    setLoading(true)
    setError(null)
    fetchCartography()
      .then((res) => {
        setData(res)
        setSelectedId((prev) => {
          if (prev && res.structures.some((s) => s.structure.id === prev)) return prev
          return res.structures[0]?.structure.id ?? null
        })
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  const structures = data?.structures ?? []
  const structure = structures.find((s) => s.structure.id === selectedId) ?? null

  const chartData = structure
    ? [
        { profession: 'Médecins', effectif: structure.medecins },
        { profession: 'Infirmiers', effectif: structure.infirmiers },
        { profession: 'Sages-femmes', effectif: structure.sages_femmes },
        { profession: 'Pharmaciens', effectif: structure.pharmaciens },
        { profession: 'Techniciens', effectif: structure.techniciens },
      ].filter((d) => d.effectif > 0)
    : []

  return (
    <div>
      <PageHeader
        title="Cartographie décisionnelle micro-localisée"
        description={
          data?.campagne
            ? `Effectifs par structure — ${data.campagne.libelle}`
            : 'Effectifs réels par centre de santé — vision opérationnelle pour corriger les inégalités.'
        }
      />
      <SecureActorsNotice />

      <StatsState loading={loading} error={error} onRetry={reload}>
        {structures.length === 0 ? (
          <p className="rounded-xl border border-[#e8ecf0] bg-white p-8 text-center text-sm text-dark-text/60">
            Aucune structure dans votre périmètre.
          </p>
        ) : (
          <>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-dark-text">
                Structure sanitaire
              </label>
              <select
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="w-full max-w-md rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm"
              >
                {structures.map((s) => (
                  <option key={s.structure.id} value={s.structure.id}>
                    {s.structure.nom} — {s.departement.nom}
                    {!s.a_declaration ? ' (sans déclaration)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {structure && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    {
                      label: 'Total agents',
                      value: structure.effectif_total,
                      color: 'text-institutional-blue',
                    },
                    { label: 'Médecins', value: structure.medecins, color: 'text-health-green' },
                    { label: 'Infirmiers', value: structure.infirmiers, color: 'text-health-green' },
                    {
                      label: 'Sages-femmes',
                      value: structure.sages_femmes,
                      color: 'text-health-green',
                    },
                    {
                      label: 'Postes vacants',
                      value: structure.postes_vacants,
                      color: 'text-red-500',
                    },
                    {
                      label: 'Statut déclaration',
                      value: structure.statut_label,
                      color: 'text-dark-text/70',
                      small: true,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm"
                    >
                      <p className="text-xs uppercase text-dark-text/50">{stat.label}</p>
                      <p
                        className={`mt-1 font-bold ${stat.small ? 'text-sm' : 'text-2xl'} ${stat.color}`}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
                  <h3 className="mb-4 font-semibold text-institutional-blue">
                    Répartition — {structure.structure.nom}
                  </h3>
                  {chartData.length === 0 ? (
                    <p className="py-8 text-center text-sm text-dark-text/50">
                      {structure.a_declaration
                        ? 'Effectifs nuls dans la déclaration.'
                        : 'Aucune déclaration enregistrée pour cette structure.'}
                    </p>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis
                            dataKey="profession"
                            type="category"
                            width={90}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip />
                          <Bar dataKey="effectif" fill="#0B3A66" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 overflow-x-auto rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-light-gray/50 text-xs uppercase text-dark-text/50">
                    <th className="px-4 py-3 text-left">Structure</th>
                    <th className="px-4 py-3 text-left">Département</th>
                    <th className="px-4 py-3 text-center">Méd.</th>
                    <th className="px-4 py-3 text-center">Inf.</th>
                    <th className="px-4 py-3 text-center">SF</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-center">Vacants</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {structures.map((s) => (
                    <StructureTableRow
                      key={s.structure.id}
                      row={s}
                      selected={s.structure.id === selectedId}
                      onSelect={() => setSelectedId(s.structure.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </StatsState>
    </div>
  )
}

function StructureTableRow({
  row,
  selected,
  onSelect,
}: {
  row: CartographyStructureRow
  selected: boolean
  onSelect: () => void
}) {
  return (
    <tr
      className={`cursor-pointer border-b border-[#f0f2f5] hover:bg-light-gray/30 ${
        selected ? 'bg-health-green/5' : ''
      } ${!row.a_declaration ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      <td className="px-4 py-3 font-medium">{row.structure.nom}</td>
      <td className="px-4 py-3">{row.departement.nom}</td>
      <td className="px-4 py-3 text-center">{row.medecins}</td>
      <td className="px-4 py-3 text-center">{row.infirmiers}</td>
      <td className="px-4 py-3 text-center">{row.sages_femmes}</td>
      <td className="px-4 py-3 text-center font-semibold">{row.effectif_total}</td>
      <td className="px-4 py-3 text-center font-medium text-red-500">{row.postes_vacants}</td>
      <td className="px-4 py-3 text-xs">{row.statut_label}</td>
    </tr>
  )
}
