import type { DataClassification } from '../lib/security'

export type Sector = 'public' | 'prive' | 'confessionnel' | 'combined'

export type ProfessionFilter =
  | 'all'
  | 'medecins'
  | 'infirmiers'
  | 'sagesFemmes'
  | 'cumul'

export type MapViewLevel = 'national' | 'department'

export type StaffBySector = {
  public: { medecins: number; infirmiers: number; sagesFemmes: number }
  prive: { medecins: number; infirmiers: number; sagesFemmes: number }
  confessionnel: { medecins: number; infirmiers: number; sagesFemmes: number }
}

export type TerritoryStats = {
  id: string
  name: string
  classification: DataClassification
  population: number
  nationalRank: number
  sectors: StaffBySector
  path?: string
  communes?: CommuneStats[]
}

export type CommuneStats = {
  id: string
  name: string
  classification: DataClassification
  population: number
  sectors: StaffBySector
}

export type TrainingInstitution = {
  id: string
  name: string
  type: string
  departmentId: string
  lat: number
  lng: number
  capacity: number
}

export const NATIONAL_AVERAGE = {
  ratioPer10000: 0,
  medecins: 0,
  infirmiers: 0,
  sagesFemmes: 0,
}

const ZERO_SECTORS: StaffBySector = {
  public: { medecins: 0, infirmiers: 0, sagesFemmes: 0 },
  prive: { medecins: 0, infirmiers: 0, sagesFemmes: 0 },
  confessionnel: { medecins: 0, infirmiers: 0, sagesFemmes: 0 },
}

export const MAP_REGIONS = [
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
] as const

/** Départements — géométrie carte conservée, effectifs à 0 tant qu'aucune stat publique validée */
export const DEPARTMENTS: TerritoryStats[] = MAP_REGIONS.map((region, index) => ({
  id: region.id,
  name: region.name,
  classification: 'public_aggregate',
  population: 0,
  nationalRank: index + 1,
  sectors: ZERO_SECTORS,
  path: region.path,
}))

export const MAP_REGION_CENTROIDS: Record<string, { x: number; y: number }> = {
  alibori: { x: 220, y: 50 },
  atacora: { x: 150, y: 70 },
  borgou: { x: 230, y: 130 },
  donga: { x: 130, y: 125 },
  collines: { x: 175, y: 185 },
  plateau: { x: 230, y: 210 },
  zou: { x: 190, y: 240 },
  couffo: { x: 120, y: 185 },
  atlantique: { x: 85, y: 245 },
  littoral: { x: 70, y: 285 },
  oueme: { x: 230, y: 275 },
  mono: { x: 155, y: 270 },
}

export const TRAINING_INSTITUTIONS: TrainingInstitution[] = []

export function getStaffCount(
  sectors: StaffBySector,
  sector: Sector,
  profession: ProfessionFilter,
): number {
  const pool =
    sector === 'combined'
      ? ['public', 'prive', 'confessionnel'] as const
      : [sector]

  let total = 0
  for (const s of pool) {
    const data = sectors[s]
    if (profession === 'all' || profession === 'cumul') {
      total += data.medecins + data.infirmiers + data.sagesFemmes
    } else if (profession === 'medecins') total += data.medecins
    else if (profession === 'infirmiers') total += data.infirmiers
    else if (profession === 'sagesFemmes') total += data.sagesFemmes
  }
  return total
}

export function getDoctorRatio(sectors: StaffBySector, sector: Sector, population: number): number {
  const doctors = getStaffCount(sectors, sector, 'medecins')
  return population > 0 ? (doctors / population) * 10000 : 0
}

export function isMedicalDesert(sectors: StaffBySector, sector: Sector, population: number): boolean {
  return getDoctorRatio(sectors, sector, population) < 1.0
}

export function getChoroplethColor(density: number, maxDensity: number): string {
  const t = maxDensity > 0 ? Math.min(density / maxDensity, 1) : 0
  const r = Math.round(232 - t * 200)
  const g = Math.round(245 - t * 80)
  const b = Math.round(240 - t * 120)
  return `rgb(${r},${g},${b})`
}

export function getChoroplethFill(density: number, maxDensity: number): string {
  const t = maxDensity > 0 ? Math.min(density / maxDensity, 1) : 0
  const lightness = Math.round(92 - t * 42)
  return `hsl(152, 45%, ${lightness}%)`
}
