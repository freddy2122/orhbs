import { Link } from 'react-router-dom'
import { Building2, BedDouble, Clock, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MAP_REGIONS } from '../../constants/mapData'
import {
  FACILITY_TYPE_COLORS,
  FACILITY_TYPE_LABELS,
  filterFacilities,
  HEALTH_FACILITIES,
  type FacilityType,
  type HealthFacility,
} from '../../constants/facilitiesData'
import { PUBLIC_DATA_NOTICE } from '../../lib/security'

type HealthFacilitiesMapProps = {
  typeFilter?: (typeof import('../../constants/facilitiesData').FACILITY_TYPES)[number]
  deptFilter?: string
  selectedId?: string | null
  onSelect?: (facility: HealthFacility | null) => void
}

export function HealthFacilitiesMap({
  typeFilter = 'Tous',
  deptFilter = 'Tous',
  selectedId,
  onSelect,
}: HealthFacilitiesMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [internalSelected, setInternalSelected] = useState<string | null>(null)

  const activeId = selectedId ?? internalSelected
  const facilities = useMemo(
    () => filterFacilities(HEALTH_FACILITIES, typeFilter, deptFilter),
    [typeFilter, deptFilter],
  )

  const selected = facilities.find((f) => f.id === activeId) ?? HEALTH_FACILITIES.find((f) => f.id === activeId)

  const handleSelect = (facility: HealthFacility) => {
    const next = activeId === facility.id ? null : facility
    setInternalSelected(next?.id ?? null)
    onSelect?.(next)
  }

  return (
    <div className="rounded-xl border border-[#e8ecf0] bg-white p-4 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <svg
            viewBox="0 0 320 340"
            className="mx-auto w-full max-w-lg"
            role="img"
            aria-label="Carte des infrastructures de santé au Bénin"
          >
            {MAP_REGIONS.map((region) => (
              <path
                key={region.id}
                d={region.path}
                fill="#e8ecf0"
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}

            {facilities.map((facility) => {
              const isActive = facility.id === activeId
              const isHovered = facility.id === hoveredId
              const color = FACILITY_TYPE_COLORS[facility.type]
              const r = isActive ? 9 : isHovered ? 8 : 6

              return (
                <g key={facility.id}>
                  {isActive && (
                    <circle
                      cx={facility.mapX}
                      cy={facility.mapY}
                      r={14}
                      fill={color}
                      opacity={0.25}
                      className="pointer-events-none"
                    />
                  )}
                  <circle
                    cx={facility.mapX}
                    cy={facility.mapY}
                    r={r}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={isActive ? 3 : 2}
                    className="cursor-pointer transition-all hover:opacity-90"
                    onClick={() => handleSelect(facility)}
                    onMouseEnter={() => setHoveredId(facility.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                  <title>{facility.name} — {facility.type}</title>
                </g>
              )
            })}
          </svg>

          <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-dark-text/60">
            {(Object.keys(FACILITY_TYPE_COLORS) as FacilityType[]).map((type) => (
              <span key={type} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: FACILITY_TYPE_COLORS[type] }}
                />
                {type}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <FacilityPanel facility={selected} />
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-[#dde3ea] p-6 text-center text-sm text-dark-text/50">
              Cliquez sur un marqueur pour afficher les détails de la structure
            </div>
          )}
          <p className="mt-3 text-xs text-dark-text/45">{PUBLIC_DATA_NOTICE}</p>
        </div>
      </div>
    </div>
  )
}

function FacilityPanel({ facility }: { facility: HealthFacility }) {
  const color = FACILITY_TYPE_COLORS[facility.type]

  return (
    <div className="rounded-xl border border-[#e8ecf0] bg-light-gray/20 p-5">
      <span
        className="rounded px-2 py-0.5 text-xs font-semibold text-white"
        style={{ background: color }}
      >
        {facility.type}
      </span>
      <h3 className="mt-2 text-lg font-bold text-institutional-blue">{facility.name}</h3>
      <p className="text-xs text-dark-text/50">{FACILITY_TYPE_LABELS[facility.type]}</p>

      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-health-green" />
          <div>
            <dt className="text-dark-text/50">Localisation</dt>
            <dd className="font-medium">{facility.commune}, {facility.dept}</dd>
            <dd className="text-xs text-dark-text/55">{facility.address}</dd>
          </div>
        </div>
        {facility.beds !== undefined ? (
          <div className="flex gap-2">
            <BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-institutional-blue" />
            <div>
              <dt className="text-dark-text/50">Capacité</dt>
              <dd className="font-medium">{facility.beds} lits · {facility.staffTotal} agents recensés</dd>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-institutional-blue" />
            <div>
              <dt className="text-dark-text/50">Effectif recensé</dt>
              <dd className="font-medium">{facility.staffTotal} agents (données agrégées)</dd>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-accent" />
          <div>
            <dt className="text-dark-text/50">Horaires</dt>
            <dd className="font-medium">{facility.openingHours}</dd>
          </div>
        </div>
        {facility.phone && (
          <div className="flex gap-2">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-dark-text/40" />
            <div>
              <dt className="text-dark-text/50">Contact</dt>
              <dd className="font-medium">{facility.phone}</dd>
            </div>
          </div>
        )}
      </dl>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-dark-text/45">Services</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {facility.services.map((s) => (
            <span key={s} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-dark-text/70 ring-1 ring-[#e8ecf0]">
              {s}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 font-mono text-[10px] text-dark-text/35">
        GPS : {facility.lat.toFixed(2)}°N, {facility.lng.toFixed(2)}°E
      </p>

      {facility.registryId && (
        <Link
          to={`/annuaire?registry=${facility.registryId}`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-health-green hover:underline"
        >
          <ShieldCheck className="h-4 w-4" />
          Vérifier l&apos;inscription à l&apos;Ordre
        </Link>
      )}
    </div>
  )
}
