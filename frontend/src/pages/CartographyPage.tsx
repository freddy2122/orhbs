import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Building2, Download, Filter, MapPin, ShieldCheck, X } from 'lucide-react'
import { ChoroplethMap } from '../components/map/ChoroplethMap'
import { HealthFacilitiesMap } from '../components/map/HealthFacilitiesMap'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { DEPARTMENTS as HOME_DEPARTMENTS } from '../constants/home'
import {
  FACILITY_TYPES,
  filterFacilities,
  getFacilityById,
  HEALTH_FACILITIES,
  type HealthFacility,
} from '../constants/facilitiesData'
import { getRegistryEntryById } from '../constants/registryData'
import { PUBLIC_DATA_NOTICE } from '../lib/security'

export function CartographyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const structureParam = searchParams.get('structure')
  const fromAnnuaire = searchParams.get('from') === 'annuaire'

  const [typeFilter, setTypeFilter] = useState<(typeof FACILITY_TYPES)[number]>('Tous')
  const [deptFilter, setDeptFilter] = useState('Tous')
  const [genderFilter, setGenderFilter] = useState<'Tous' | 'F' | 'M'>('Tous')
  const [selectedId, setSelectedId] = useState<string | null>(structureParam)
  const [annuaireBanner, setAnnuaireBanner] = useState(fromAnnuaire && !!structureParam)

  const departments = useMemo(
    () => ['Tous', ...new Set(HEALTH_FACILITIES.map((f) => f.dept))],
    [],
  )

  const highlightedFacility = structureParam ? getFacilityById(structureParam) : undefined
  const linkedRegistry = highlightedFacility?.registryId
    ? getRegistryEntryById(highlightedFacility.registryId)
    : undefined

  useEffect(() => {
    if (!structureParam) return
    const facility = getFacilityById(structureParam)
    if (!facility) return

    setSelectedId(structureParam)
    setTypeFilter('Tous')
    setDeptFilter('Tous')
    setAnnuaireBanner(fromAnnuaire)

    const timer = window.setTimeout(() => {
      document.getElementById('facilities-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)

    return () => window.clearTimeout(timer)
  }, [structureParam, fromAnnuaire])

  const filtered = useMemo(
    () => filterFacilities(HEALTH_FACILITIES, typeFilter, deptFilter),
    [typeFilter, deptFilter],
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
          {HOME_DEPARTMENTS.length === 0 ? (
            <EmptyState
              title="Aucune donnée cartographique"
              description="Les données de répartition géographique des ressources humaines en santé seront affichées ici après consolidation et validation nationale."
              icon={MapPin}
            />
          ) : (
            <ChoroplethMap />
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
              <select
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value as 'Tous' | 'F' | 'M')
                  setSelectedId(null)
                  setSearchParams({}, { replace: true })
                }}
                className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
              >
                <option value="Tous">Tous genres</option>
                <option value="F">Femmes</option>
                <option value="M">Hommes</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  // Export de la carte en PNG (fonctionnalité disponible après installation de html2canvas)
                  alert('Export PNG/PDF sera disponible après installation de la librairie html2canvas')
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-[#e8ecf0] bg-white px-3 py-2 text-sm font-medium text-institutional-blue hover:bg-light-gray"
              >
                <Download className="h-4 w-4" /> Exporter
              </button>
            </div>
          </div>

          <HealthFacilitiesMap
            typeFilter={typeFilter}
            deptFilter={deptFilter}
            selectedId={selectedId}
            onSelect={(f) => {
              setSelectedId(f?.id ?? null)
              if (f) setSearchParams({ structure: f.id }, { replace: true })
              else setSearchParams({}, { replace: true })
            }}
          />
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
                {facility.registryId && (
                  <span className="mt-2 inline-block text-xs font-medium text-health-green">
                    Inscrit à l&apos;Ordre ✓
                  </span>
                )}
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
