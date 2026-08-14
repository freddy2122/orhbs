import { apiFetch } from './api-client'
import type {
  CollectionProgressResponse,
  Declaration,
  DepartementStatsResponse,
  NationalStats,
  StructureStatsResponse,
  ZoneStatsResponse,
} from '../types/stats'

export function fetchNationalStats() {
  return apiFetch<NationalStats>('/api/stats/national/')
}

export function fetchDepartementStats() {
  return apiFetch<DepartementStatsResponse>('/api/stats/departements/')
}

export function fetchZoneStats(departement?: string) {
  const q = departement ? `?departement=${departement}` : ''
  return apiFetch<ZoneStatsResponse>(`/api/stats/zones/${q}`)
}

export function fetchStructureStats(params?: {
  departement?: string
  zone?: string
  type?: string
}) {
  const search = new URLSearchParams()
  if (params?.departement) search.set('departement', params.departement)
  if (params?.zone) search.set('zone', params.zone)
  if (params?.type) search.set('type', params.type)
  const q = search.toString() ? `?${search}` : ''
  return apiFetch<StructureStatsResponse>(`/api/stats/structures/${q}`)
}

export function fetchCollectionProgress() {
  return apiFetch<CollectionProgressResponse>('/api/collecte/progress/')
}

export function fetchDeclarations(statut?: string) {
  const q = statut ? `?statut=${statut}` : ''
  return apiFetch<Declaration[]>(`/api/collecte/declarations/${q}`)
}

export function validateDeclaration(
  id: number,
  action: 'approve' | 'reject',
  level: 'departement' | 'national' = 'departement',
  commentaire?: string,
) {
  return apiFetch<Declaration>(`/api/collecte/declarations/${id}/validate/`, {
    method: 'POST',
    body: JSON.stringify({ action, level, commentaire: commentaire ?? '' }),
  })
}
