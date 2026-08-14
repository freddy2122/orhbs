export type RegistryStatus = 'inscrit' | 'suspendu' | 'radie'

export type PracticeMode = 'liberal' | 'public' | 'mixte'

export type RegistryEntry = {
  id: string
  type: 'medecin' | 'clinique'
  name: string
  registrationNumber: string
  order: string
  specialty?: string
  dept: string
  commune: string
  status: RegistryStatus
  registeredSince: string
  /** Champs enrichis annuaire public */
  title?: string
  nationality?: string
  university?: string
  graduationYear?: number
  practiceMode?: PracticeMode
  workplace?: string
  address?: string
  phone?: string
  email?: string
  lastVerificationDate?: string
  /** Cliniques uniquement */
  director?: string
  authorizationNumber?: string
  authorizationExpiry?: string
  beds?: number
  services?: string[]
  suspensions?: string
  /** Lien vers une structure sur la cartographie sanitaire */
  linkedFacilityId?: string
}

export const REGISTRY_SPECIALTIES = [
  'Toutes',
  'Médecine générale',
  'Pédiatrie',
  'Chirurgie',
  'Gynécologie-obstétrique',
  'Cardiologie',
] as const

export const REGISTRY_DEPARTMENTS = [
  'Tous',
  'Littoral',
  'Ouémé',
  'Atlantique',
  'Borgou',
  'Zou',
  'Mono',
  'Atacora',
] as const

export const REGISTRY_STATUS_LABELS: Record<RegistryStatus, string> = {
  inscrit: 'Inscrit',
  suspendu: 'Suspendu',
  radie: 'Radié',
}

export const PRACTICE_MODE_LABELS: Record<PracticeMode, string> = {
  liberal: 'Exercice libéral',
  public: 'Fonction publique',
  mixte: 'Public + libéral',
}

/** Annuaire public — alimenté par API (module Ordres professionnels) */
export const PUBLIC_REGISTRY: RegistryEntry[] = []

export function getRegistryDisplayName(entry: RegistryEntry): string {
  if (entry.type === 'medecin' && entry.title) {
    return `${entry.title} ${entry.name}`
  }
  return entry.name
}

export function getCartographyUrl(entry: RegistryEntry): string | null {
  if (!entry.linkedFacilityId || entry.status === 'radie') return null
  return `/cartographie?structure=${entry.linkedFacilityId}&from=annuaire`
}

export function getRegistryEntryById(id: string): RegistryEntry | undefined {
  return PUBLIC_REGISTRY.find((e) => e.id === id)
}

export function searchRegistry(
  entries: RegistryEntry[],
  options: {
    query: string
    type: 'all' | 'medecin' | 'clinique'
    dept: string
    specialty: string
    status: RegistryStatus | 'all'
  },
): RegistryEntry[] {
  const q = options.query.toLowerCase().trim()
  return entries.filter((entry) => {
    if (options.type !== 'all' && entry.type !== options.type) return false
    if (options.dept !== 'Tous' && entry.dept !== options.dept) return false
    if (options.specialty !== 'Toutes' && entry.specialty !== options.specialty) return false
    if (options.status !== 'all' && entry.status !== options.status) return false
    if (!q) return true
    const haystack = [
      entry.name,
      entry.title,
      entry.registrationNumber,
      entry.specialty,
      entry.commune,
      entry.workplace,
      entry.director,
      entry.authorizationNumber,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}
