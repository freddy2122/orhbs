import { useEffect, useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { SectionHeader } from '../ui/SectionHeader'
import { MAP_REGIONS } from '../../constants/mapData'
import { territoriesFromDepartementStats } from '../../lib/map-from-stats'
import { fetchPublicDepartementStats } from '../../lib/public-api'
import type { DepartementStatsRow } from '../../types/stats'

export function GeographicMapSection() {
  const [rows, setRows] = useState<DepartementStatsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('atlantique')

  useEffect(() => {
    fetchPublicDepartementStats()
      .then((data) => setRows(data.departements))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  const territories = useMemo(() => territoriesFromDepartementStats(rows), [rows])
  const selected = territories.find((d) => d.id === selectedId) ?? territories[0]
  const hasData = rows.some((d) => d.totals.effectif_total > 0)

  return (
    <section className="bg-white py-14 sm:py-16 lg:py-20" id="carte">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          label="Cartographie"
          title="Répartition géographique des RHS du Bénin"
          description="Explorez la répartition des ressources humaines en santé par département. Cliquez sur un département pour consulter les données agrégées."
        />

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-8 w-8 text-health-green" />
          </div>
        ) : !hasData ? (
          <EmptyState
            title="Aucune donnée cartographique"
            description="Les données de répartition géographique des ressources humaines en santé seront affichées ici après consolidation et validation nationale."
            icon={MapPin}
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
            <div className="rounded-xl border border-[#e8ecf0] bg-light-gray/30 p-4 sm:p-6 lg:col-span-3">
              <svg
                viewBox="0 0 320 340"
                className="mx-auto w-full max-w-md"
                role="img"
                aria-label="Carte interactive des départements du Bénin"
              >
                {MAP_REGIONS.map((region) => {
                  const isSelected = region.id === selectedId
                  return (
                    <g key={region.id}>
                      <path
                        d={region.path}
                        fill={isSelected ? '#0F7B4F' : '#0B3A66'}
                        fillOpacity={isSelected ? 1 : 0.65}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="cursor-pointer transition-all duration-200 hover:fill-opacity-90"
                        onClick={() => setSelectedId(region.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedId(region.id)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Département ${region.name}`}
                        aria-pressed={isSelected}
                      />
                    </g>
                  )
                })}
              </svg>
              <p className="mt-4 text-center text-xs text-dark-text/50">
                Carte simplifiée — données agrégées par département
              </p>
            </div>

            <div className="flex flex-col justify-center lg:col-span-2">
              <div className="rounded-xl border border-health-green/20 bg-health-green/5 p-6 sm:p-8">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-health-green" aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-institutional-blue">
                    {selected?.name ?? '—'}
                  </h3>
                </div>
                <dl className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#e8ecf0] pb-3">
                    <dt className="text-sm text-dark-text/70">Médecins</dt>
                    <dd className="text-lg font-semibold text-institutional-blue">
                      {(selected?.sectors.public.medecins ?? 0).toLocaleString('fr-FR')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#e8ecf0] pb-3">
                    <dt className="text-sm text-dark-text/70">Infirmiers</dt>
                    <dd className="text-lg font-semibold text-institutional-blue">
                      {(selected?.sectors.public.infirmiers ?? 0).toLocaleString('fr-FR')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-dark-text/70">Sages-femmes</dt>
                    <dd className="text-lg font-semibold text-institutional-blue">
                      {(selected?.sectors.public.sagesFemmes ?? 0).toLocaleString('fr-FR')}
                    </dd>
                  </div>
                </dl>
                <p className="mt-5 text-xs text-dark-text/50">
                  Données agrégées — aucune information nominative
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
