/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, MapPin, Shield, TrendingUp } from 'lucide-react'
import { ChoroplethMap } from '../components/map/ChoroplethMap'
import { NationalIndicatorsCharts } from '../components/public/NationalIndicatorsCharts'
import { KeyFiguresSection } from '../components/sections/KeyFiguresSection'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import {
  DENSITY_TREND,
  PROFESSION_DISTRIBUTION,
  SECTOR_DISTRIBUTION,
} from '../constants/publicSpace'
import { territoriesFromDepartementStats } from '../lib/map-from-stats'
import { fetchPublicDepartementStats } from '../lib/public-api'
import { PUBLIC_DATA_NOTICE, RESTRICTED_DATA_NOTICE } from '../lib/security'
import type { DepartementStatsRow } from '../types/stats'

const INDICATOR_CATEGORIES = [
  { icon: BarChart3, title: 'Effectifs par profession', description: 'Répartition agrégée par catégorie professionnelle et secteur.' },
  { icon: MapPin, title: 'Répartition géographique', description: 'Navigation nationale → département → commune.' },
  { icon: TrendingUp, title: 'Évolution temporelle', description: 'Suivi des tendances sur plusieurs années (données agrégées).' },
]

export function IndicatorsPage() {
  const hasChartData =
    DENSITY_TREND.length > 0 ||
    PROFESSION_DISTRIBUTION.length > 0 ||
    SECTOR_DISTRIBUTION.length > 0
  const [deptRows, setDeptRows] = useState<DepartementStatsRow[]>([])
  const [mapLoading, setMapLoading] = useState(true)

  useEffect(() => {
    fetchPublicDepartementStats()
      .then((data) => setDeptRows(data.departements))
      .catch(() => setDeptRows([]))
      .finally(() => setMapLoading(false))
  }, [])

  const territories = useMemo(() => territoriesFromDepartementStats(deptRows), [deptRows])
  const hasMapData = deptRows.some((d) => d.totals.effectif_total > 0)

  return (
    <main>
      <PageBanner
        label="Données"
        title="Tableau de bord des Indicateurs nationaux"
        description="Graphiques interactifs sur la densité médicale et la répartition des professionnels — données exclusivement agrégées."
      />

      <section className="border-b border-[#e8ecf0] bg-amber-50 py-4">
        <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 sm:px-6">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Protection des données</p>
            <p className="mt-1">{PUBLIC_DATA_NOTICE} {RESTRICTED_DATA_NOTICE}</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-8 text-2xl font-semibold text-institutional-blue">Indicateurs interactifs</h2>
          {hasChartData ? (
            <NationalIndicatorsCharts />
          ) : (
            <EmptyState
              title="Aucune statistique publiée"
              description="Les indicateurs nationaux apparaîtront ici après validation et consolidation des données de collecte."
              icon={BarChart3}
            />
          )}
        </div>
      </section>

      <section className="border-t border-[#e8ecf0] bg-light-gray/30 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {INDICATOR_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <article key={cat.title} className="rounded-lg border border-[#e8ecf0] p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-health-green/10 text-health-green">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h2 className="font-semibold text-institutional-blue">{cat.title}</h2>
                  <p className="mt-2 text-sm text-dark-text/70">{cat.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold text-institutional-blue">Carte choroplèthe des effectifs</h2>
            <Link
              to="/cartographie"
              className="text-sm font-semibold text-health-green hover:underline"
            >
              Cartographie complète →
            </Link>
          </div>
          {mapLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8 text-health-green" />
            </div>
          ) : !hasMapData ? (
            <EmptyState
              title="Aucune donnée cartographique"
              description="Les données de répartition géographique seront affichées ici après consolidation et validation nationale."
              icon={MapPin}
            />
          ) : (
            <ChoroplethMap territories={territories} />
          )}
        </div>
      </section>

      <KeyFiguresSection />
    </main>
  )
}
