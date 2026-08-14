import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { DEPARTMENTS } from '../../constants/home'
import { EmptyState } from '../ui/EmptyState'
import { SectionHeader } from '../ui/SectionHeader'

type MapRegion = {
  id: string
  name: string
  path: string
}

const MAP_REGIONS: MapRegion[] = [
  { id: 'alibori', name: 'Alibori', path: 'M 180 20 L 240 15 L 260 50 L 250 90 L 200 85 Z' },
  { id: 'atacora', name: 'Atacora', path: 'M 120 30 L 180 20 L 200 85 L 160 110 L 110 80 Z' },
  { id: 'borgou', name: 'Borgou', path: 'M 200 85 L 250 90 L 270 130 L 240 170 L 190 150 Z' },
  { id: 'donga', name: 'Donga', path: 'M 110 80 L 160 110 L 150 160 L 100 150 Z' },
  { id: 'collines', name: 'Collines', path: 'M 150 160 L 190 150 L 200 200 L 160 220 Z' },
  { id: 'plateau', name: 'Plateau', path: 'M 200 200 L 240 170 L 260 210 L 230 240 Z' },
  { id: 'zou', name: 'Zou', path: 'M 160 220 L 200 200 L 230 240 L 200 270 Z' },
  { id: 'couffo', name: 'Couffo', path: 'M 100 150 L 150 160 L 160 220 L 120 240 L 80 200 Z' },
  { id: 'atlantique', name: 'Atlantique', path: 'M 80 200 L 120 240 L 100 280 L 50 260 Z' },
  { id: 'littoral', name: 'Littoral', path: 'M 50 260 L 100 280 L 90 310 L 40 300 Z' },
  { id: 'oueme', name: 'Ouémé', path: 'M 200 270 L 230 240 L 260 260 L 250 300 L 210 310 Z' },
  { id: 'mono', name: 'Mono', path: 'M 120 240 L 160 220 L 200 270 L 180 310 L 130 300 Z' },
]

export function GeographicMapSection() {
  const [selectedId, setSelectedId] = useState('atlantique')

  const selected =
    DEPARTMENTS.find((d) => d.id === selectedId) ?? DEPARTMENTS[0]

  return (
    <section className="bg-white py-14 sm:py-16 lg:py-20" id="carte">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          label="Cartographie"
          title="Répartition géographique des RHS"
          description="Explorez la répartition des ressources humaines en santé par département. Cliquez sur un département pour consulter les données agrégées."
        />

        {DEPARTMENTS.length === 0 ? (
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
                      <text
                        x={
                          region.id === 'littoral'
                            ? 65
                            : region.id === 'alibori'
                              ? 215
                              : 170
                        }
                        y={
                          region.id === 'littoral'
                            ? 285
                            : region.id === 'alibori'
                              ? 55
                              : 180
                        }
                        className="pointer-events-none select-none text-[8px] font-medium fill-white"
                        textAnchor="middle"
                      >
                        {region.name.length > 8
                          ? region.name.slice(0, 6) + '.'
                          : region.name}
                      </text>
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
                    {selected.name}
                  </h3>
                </div>
                <dl className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#e8ecf0] pb-3">
                    <dt className="text-sm text-dark-text/70">Médecins</dt>
                    <dd className="text-lg font-semibold text-institutional-blue">
                      {selected.medecins.toLocaleString('fr-FR')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#e8ecf0] pb-3">
                    <dt className="text-sm text-dark-text/70">Infirmiers</dt>
                    <dd className="text-lg font-semibold text-institutional-blue">
                      {selected.infirmiers.toLocaleString('fr-FR')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-dark-text/70">Sages-femmes</dt>
                    <dd className="text-lg font-semibold text-institutional-blue">
                      {selected.sagesFemmes.toLocaleString('fr-FR')}
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
