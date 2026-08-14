import { apiFetch } from './api-client'
import { getAccessToken } from './auth-api'
import { apiUrl } from './api'
import type { AgentFilters, AgentsResponse } from '../types/agent'
import type { CampagneRef, Declaration } from '../types/stats'

export type CollecteField = {
  key: string
  label: string
  required: boolean
}

export type CollecteFieldsResponse = {
  effectifs: CollecteField[]
  professions: CollecteField[]
  planification: CollecteField[]
  professions_sante: string[]
}

export type StructureOption = {
  id: number
  code: string
  nom: string
  type_structure: string
  type_structure_label: string
  departement: { code: string; nom: string }
  zone_sanitaire: { code: string; nom: string } | null
}

export type ImportResult = {
  id: number
  nom_fichier: string
  statut: string
  lignes_total: number
  lignes_ok: number
  lignes_erreur: number
  rapport_erreurs: { ligne: number; erreur: string }[]
}

export function fetchCollecteFields() {
  return apiFetch<CollecteFieldsResponse>('/api/collecte/fields/')
}

export function fetchStructures() {
  return apiFetch<StructureOption[]>('/api/collecte/structures/')
}

export function fetchActiveCampagne() {
  return apiFetch<CampagneRef>('/api/collecte/campagne/')
}

export function saveDeclaration(payload: Record<string, unknown>) {
  return apiFetch<Declaration>('/api/collecte/declarations/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitDeclaration(id: number) {
  return apiFetch<Declaration>(`/api/collecte/declarations/${id}/submit/`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function downloadExcelTemplate() {
  const token = getAccessToken()
  const response = await fetch(apiUrl('/api/collecte/template-excel/'), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error('Téléchargement impossible.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modele-agents-orhs.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

export async function importExcelFile(file: File): Promise<ImportResult> {
  const token = getAccessToken()
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(apiUrl('/api/collecte/import-excel/'), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail ?? 'Import échoué.')
  return data as ImportResult
}

export function fetchAgents(filters?: AgentFilters) {
  const search = new URLSearchParams()
  if (filters?.q) search.set('q', filters.q)
  if (filters?.departement) search.set('departement', filters.departement)
  if (filters?.zone) search.set('zone', filters.zone)
  if (filters?.structure) search.set('structure', String(filters.structure))
  if (filters?.profession) search.set('profession', filters.profession)
  if (filters?.secteur) search.set('secteur', filters.secteur)
  if (filters?.statut) search.set('statut', filters.statut)
  const q = search.toString() ? `?${search}` : ''
  return apiFetch<AgentsResponse>(`/api/collecte/agents/${q}`)
}
