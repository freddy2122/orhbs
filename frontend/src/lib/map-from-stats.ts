import {
  MAP_REGION_CENTROIDS,
  MAP_REGIONS,
  type CommuneStats,
  type TerritoryStats,
} from '../constants/mapData'
import type { FacilityType, HealthFacility } from '../constants/facilitiesData'
import type { DepartementStatsRow, StructureStatsRow, ZoneStatsRow } from '../types/stats'

function hashCode(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash
}

function mapFacilityType(type: string): FacilityType {
  if (type === 'CHU' || type === 'CNHU') return 'CHU'
  if (type === 'HZ' || type === 'DIRECTION') return 'HZ'
  if (type === 'PRIVE') return 'Clinique'
  return 'CSCOM'
}

export function territoriesFromDepartementStats(rows: DepartementStatsRow[]): TerritoryStats[] {
  return MAP_REGIONS.map((region, index) => {
    const row = rows.find((r) => r.departement.code === region.id)
    const med = row?.totals.medecins ?? 0
    const inf = row?.totals.infirmiers ?? 0
    const sf = row?.totals.sages_femmes ?? 0
    return {
      id: region.id,
      name: row?.departement.nom ?? region.name,
      classification: 'public_aggregate' as const,
      population: row?.departement.population ?? 0,
      nationalRank: row?.rang ?? index + 1,
      sectors: {
        public: { medecins: med, infirmiers: inf, sagesFemmes: sf },
        prive: { medecins: 0, infirmiers: 0, sagesFemmes: 0 },
        confessionnel: { medecins: 0, infirmiers: 0, sagesFemmes: 0 },
      },
      path: region.path,
      communes: [],
    }
  })
}

export function facilitiesFromStructureStats(rows: StructureStatsRow[]): HealthFacility[] {
  return rows.map((row) => {
    const centroid = MAP_REGION_CENTROIDS[row.departement.code] ?? { x: 160, y: 170 }
    const hash = hashCode(row.structure.code)
    return {
      id: row.structure.code,
      name: row.structure.nom,
      type: mapFacilityType(row.structure.type_structure),
      dept: row.departement.nom,
      deptId: row.departement.code,
      commune: row.zone?.nom ?? row.departement.nom,
      address: '',
      lat: 0,
      lng: 0,
      mapX: centroid.x + (hash % 21) - 10,
      mapY: centroid.y + ((hash >> 4) % 21) - 10,
      staffTotal: row.effectif_total,
      services: [
        `${row.medecins} médecins`,
        `${row.infirmiers} infirmiers`,
        `${row.sages_femmes} sages-femmes`,
      ],
      openingHours: '',
    }
  })
}

export function zonesToCommunes(zones: ZoneStatsRow[]): CommuneStats[] {
  return zones.map((z) => ({
    id: z.zone.code,
    name: z.zone.nom,
    classification: 'public_aggregate' as const,
    population: 0,
    sectors: {
      public: {
        medecins: z.totals.medecins,
        infirmiers: z.totals.infirmiers,
        sagesFemmes: z.totals.sages_femmes,
      },
      prive: { medecins: 0, infirmiers: 0, sagesFemmes: 0 },
      confessionnel: { medecins: 0, infirmiers: 0, sagesFemmes: 0 },
    },
  }))
}
