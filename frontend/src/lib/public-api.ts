import { apiFetch, apiUpload } from './api-client'
import { apiUrl } from './api'
import type {
  DepartementStatsResponse,
  NationalStats,
  StructureStatsResponse,
  ZoneStatsResponse,
} from '../types/stats'

export type PublicPublication = {
  id: number
  titre: string
  slug: string
  type_publication: string
  type_publication_label: string
  categorie: { id: number; nom: string; code: string } | null
  resume: string
  contenu: string
  fichier_url: string | null
  annee: number | null
  mot_cles: string
  auteur: string
  auteur_full: string
  publie: boolean
  date_publication: string | null
  telechargements: number
  vues: number
}

export function fetchPublicNationalStats() {
  return apiFetch<NationalStats>('/api/public/stats/national/')
}

export function fetchPublicDepartementStats() {
  return apiFetch<DepartementStatsResponse>('/api/public/stats/departements/')
}

export function fetchPublicZoneStats(departement?: string) {
  const q = departement ? `?departement=${departement}` : ''
  return apiFetch<ZoneStatsResponse>(`/api/public/stats/zones/${q}`)
}

export function fetchPublicStructureStats(params?: { departement?: string; type?: string }) {
  const search = new URLSearchParams()
  if (params?.departement) search.set('departement', params.departement)
  if (params?.type) search.set('type', params.type)
  const q = search.toString() ? `?${search}` : ''
  return apiFetch<StructureStatsResponse>(`/api/public/stats/structures/${q}`)
}

export function fetchPublicPublications(params?: { q?: string; type?: string; annee?: string }) {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.type) search.set('type', params.type)
  if (params?.annee) search.set('annee', params.annee)
  const q = search.toString() ? `?${search}` : ''
  return apiFetch<PublicPublication[]>(`/api/public/publications/${q}`)
}

export function fetchPublicPublication(slug: string) {
  return apiFetch<PublicPublication>(`/api/public/publications/${slug}/`)
}

export function publicPublicationDownloadUrl(id: number) {
  return apiUrl(`/api/public/publications/${id}/download/`)
}

export function fetchCmsPublications() {
  return apiFetch<PublicPublication[]>('/api/cms/publications/')
}

export function createCmsPublication(payload: Record<string, unknown>) {
  return apiFetch<PublicPublication>('/api/cms/publications/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCmsPublication(id: number, payload: Record<string, unknown>) {
  return apiFetch<PublicPublication>(`/api/cms/publications/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function uploadCmsPublicationPdf(id: number, file: File) {
  const form = new FormData()
  form.append('fichier_pdf', file)
  return apiUpload<PublicPublication>(`/api/cms/publications/${id}/upload/`, form)
}
