import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Building2, Filter, MapPin, ShieldCheck, X } from 'lucide-react'
import { ChoroplethMap } from '../components/map/ChoroplethMap'
import { HealthFacilitiesMap } from '../components/map/HealthFacilitiesMap'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { FACILITY_TYPES, filterFacilities, type HealthFacility } from '../constants/facilitiesData'
import { getRegistryEntryById } from '../constants/registryData'
import {
  facilitiesFromStructureStats,
  territoriesFromDepartementStats,
  zonesToCommunes,
} from '../lib/map-from-stats'
import {
  fetchPublicDepartementStats,
  fetchPublicStructureStats,
  fetchPublicZoneStats,
} from '../lib/public-api'
import { PUBLIC_DATA_NOTICE } from '../lib/security'
import type { DepartementStatsRow, ZoneStatsRow } from '../types/stats'

export function CartographyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const structureParam = searchParams.get('structure')
  const fromAnnuaire = searchParams.get('from') === 'annuaire'

  const [typeFilter, setTypeFilter] = useState<(typeof FACILITY_TYPES)[number]>('Tous')
  const [deptFilter, setDeptFilter] = useState('Tous')
  const [selectedId, setSelectedId] = useState<string | null>(structureParam)
  const [annuaireBanner, setAnnuaireBanner] = useState(fromAnnuaire && !!structureParam)
  const [deptRows, setDeptRows] = useState<DepartementStatsRow[]>([])
  const [zoneRows, setZoneRows] = useState<ZoneStatsRow[]>([])
  const [facilities, setFacilities] = useState<HealthFacility[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPublicDepartementStats(), fetchPublicStructureStats()])
      .then(([deptData, structureData]) => {
        setDeptRows(deptData.departements)
        setFacilities(facilitiesFromStructureStats(structureData.structures))
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedDeptId) {
      setZoneRows([])
      return
    }
    fetchPublicZoneStats(selectedDeptId)
      .then((data) => setZoneRows(data.zones))
      .catch(() => setZoneRows([]))
  }, [selectedDeptId])

  const territories = useMemo(() => {
    const base = territoriesFromDepartementStats(deptRows)
    if (!selectedDeptId) return base
    return base.map((t) =>
      t.id === selectedDeptId ? { ...t, communes: zonesToCommunes(zoneRows) } : t,
    )
  }, [deptRows, selectedDeptId, zoneRows])

  const departments = useMemo(
    () => ['Tous', ...new Set(facilities.map((f) => f.dept))],
    [facilities],
  )

  const highlightedFacility = structureParam
    ? facilities.find((f) => f.id === structureParam)
    : undefined
  const linkedRegistry = highlightedFacility?.registryId
    ? getRegistryEntryById(highlightedFacility.registryId)
    : undefined

  useEffect(() => {
    if (!structureParam) return
    const facility = facilities.find((f) => f.id === structureParam)
    if (!facility) return
    setSelectedId(structureParam)
    setTypeFilter('Tous')
    setDeptFilter('Tous')
    setAnnuaireBanner(fromAnnuaire)
  }, [structureParam, fromAnnuaire, facilities])

  const filtered = useMemo(
    () => filterFacilities(facilities, typeFilter, deptFilter),
    [facilities, typeFilter, deptFilter],
  )

  const dismissAnnuaireBanner = () => {
    setAnnuaireBanner(false)
    const next = new URLSearchParams(searchParams)
    next.delete('from')
    setSearchParams(next, { replace: true })
  }

  const handleListClick = (facility: HealthFacility) => {
    setSelectedId(facility.id)
    setSearchParams({ structure: facility.id }, { replace: true })
    document.getElementById('facilities-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const hasStats = deptRows.some((d) => d.totals.effectif_total > 0)

  return (
    <main>
      <PageBanner
        label="Cartographie"
        title="Cartographie sanitaire publique"
        description="Répartition du personnel par département et localisation des infrastructures de santé sur carte interactive."
      />

      <section className="border-b border-[#e8ecf0] bg-amber-50 py-3">
        <p className="mx-auto max-w-7xl px-4 text-center text-xs text-amber-900 sm:px-6">
          {PUBLIC_DATA_NOTICE}
        </p>
      </section>

      {annuaireBanner && highlightedFacility && (
        <section className="border-b border-health-green/20 bg-health-green/5 py-4">
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-health-green" />
              <div>
                <p className="font-semibold text-institutional-blue">
                  Localisation depuis l&apos;annuaire de conformité
                </p>
                <p className="mt-1 text-sm text-dark-text/65">
                  {linkedRegistry ? (
                    <>
                      <span className="font-medium">{linkedRegistry.type === 'clinique' ? linkedRegistry.name : `${linkedRegistry.title ?? ''} ${linkedRegistry.name}`.trim()}</span>
                      {' '}— structure cartographiée : <span className="font-medium">{highlightedFacility.name}</span>
                    </>
                  ) : (
                    <>Structure sélectionnée : <span className="font-medium">{highlightedFacility.name}</span></>
                  )}
                </p>
                {linkedRegistry && (
                  <Link
                    to="/annuaire"
                    className="mt-2 inline-flex text-sm font-medium text-health-green hover:underline"
                  >
                    ← Retour à l&apos;annuaire
                  </Link>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={dismissAnnuaireBanner}
              className="shrink-0 rounded-lg p-1 text-dark-text/40 hover:bg-white hover:text-dark-text"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-6 text-xl font-semibold text-institutional-blue">
            Carte choroplèthe — effectifs par territoire
          </h2>
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-8 w-8 text-health-green" />
            </div>
          ) : error ? (
            <EmptyState title="Carte indisponible" description={error} icon={MapPin} />
          ) : !hasStats ? (
            <EmptyState
              title="Aucune donnée cartographique"
              description="Les données de répartition géographique des ressources humaines en santé seront affichées ici après consolidation et validation nationale."
              icon={MapPin}
            />
          ) : (
            <ChoroplethMap
              territories={territories}
              onSelectDepartment={setSelectedDeptId}
            />
          )}
        </div>
      </section>

      <section id="facilities-map" className="border-t border-[#e8ecf0] bg-light-gray/30 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-health-green" />
                <h2 className="text-xl font-semibold text-institutional-blue">Infrastructures sur la carte</h2>
              </div>
              <p className="mt-1 text-sm text-dark-text/60">
                {filtered.length} structure{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''} — cliquez un marqueur ou une fiche ci-dessous.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-4 w-4 text-dark-text/40" />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as typeof typeFilter)
                  setSelectedId(null)
                  setSearchParams({}, { replace: true })
                }}
                className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
              >
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t === 'Tous' ? 'Tous types' : t}</option>
                ))}
              </select>
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value)
                  setSelectedId(null)
                  setSearchParams({}, { replace: true })
                }}
                className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d === 'Tous' ? 'Tous départements' : d}</option>
                ))}
              </select>
            </div>
          </div>

          {facilities.length === 0 ? (
            <EmptyState
              title="Aucune infrastructure publiée"
              description="Les structures sanitaires apparaîtront ici après validation nationale des déclarations."
              icon={Building2}
            />
          ) : (
            <HealthFacilitiesMap
              facilities={facilities}
              typeFilter={typeFilter}
              deptFilter={deptFilter}
              selectedId={selectedId}
              onSelect={(f) => {
                setSelectedId(f?.id ?? null)
                if (f) setSearchParams({ structure: f.id }, { replace: true })
                else setSearchParams({}, { replace: true })
              }}
            />
          )}
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-6 text-lg font-semibold text-institutional-blue">Liste des structures</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((facility) => (
              <button
                key={facility.id}
                type="button"
                onClick={() => handleListClick(facility)}
                className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:border-health-green/40 ${
                  selectedId === facility.id ? 'border-health-green ring-2 ring-health-green/20' : 'border-[#e8ecf0]'
                }`}
              >
                <span className="rounded bg-institutional-blue/10 px-2 py-0.5 text-xs font-medium text-institutional-blue">
                  {facility.type}
                </span>
                <h3 className="mt-2 font-semibold text-institutional-blue">{facility.name}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-dark-text/60">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {facility.commune}, {facility.dept}
                </p>
                <p className="mt-2 text-xs text-dark-text/45">
                  {facility.staffTotal} agents · {facility.services.slice(0, 2).join(', ')}
                </p>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <EmptyState
              title="Aucune donnée cartographique"
              description="Aucune infrastructure ne correspond à ces filtres ou les données n'ont pas encore été publiées."
              icon={Building2}
            />
          )}
        </div>
      </section>
    </main>
  )
}
