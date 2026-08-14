export type FacilityType = 'CHU' | 'HZ' | 'CSCOM' | 'Clinique'

export type HealthFacility = {
  id: string
  name: string
  type: FacilityType
  dept: string
  deptId: string
  commune: string
  address: string
  lat: number
  lng: number
  mapX: number
  mapY: number
  beds?: number
  staffTotal: number
  services: string[]
  openingHours: string
  phone?: string
  registryId?: string
}

export const FACILITY_TYPE_COLORS: Record<FacilityType, string> = {
  CHU: '#0B3A66',
  HZ: '#0F7B4F',
  CSCOM: '#D6A43A',
  Clinique: '#7C3AED',
}

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  CHU: 'Centre Hospitalier Universitaire',
  HZ: 'Hôpital de Zone',
  CSCOM: 'Centre de Santé Communautaire',
  Clinique: 'Clinique privée agréée',
}

/** Structures sanitaires — alimentées par API cartographie publique */
export const HEALTH_FACILITIES: HealthFacility[] = []

export const FACILITY_TYPES = ['Tous', 'CHU', 'HZ', 'CSCOM', 'Clinique'] as const

export function filterFacilities(
  facilities: HealthFacility[],
  type: (typeof FACILITY_TYPES)[number],
  dept: string,
): HealthFacility[] {
  return facilities.filter((f) => {
    if (type !== 'Tous' && f.type !== type) return false
    if (dept !== 'Tous' && f.dept !== dept) return false
    return true
  })
}

export function getFacilityById(id: string): HealthFacility | undefined {
  return HEALTH_FACILITIES.find((f) => f.id === id)
}
