import { apiFetch, apiDownload } from './api-client'
import { apiUrl } from './api'
import type {
  AgentFilters,
  AgentsResponse,
  AgentQualification,
  DuplicateGroup,
  MouvementAgent,
} from '../types/agent'
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

function agentSearch(filters?: AgentFilters) {
  const search = new URLSearchParams()
  if (filters?.q) search.set('q', filters.q)
  if (filters?.departement) search.set('departement', filters.departement)
  if (filters?.zone) search.set('zone', filters.zone)
  if (filters?.structure) search.set('structure', String(filters.structure))
  if (filters?.profession) search.set('profession', filters.profession)
  if (filters?.secteur) search.set('secteur', filters.secteur)
  if (filters?.statut) search.set('statut', filters.statut)
  if (filters?.sexe) search.set('sexe', filters.sexe)
  if (filters?.age_min) search.set('age_min', String(filters.age_min))
  if (filters?.age_max) search.set('age_max', String(filters.age_max))
  if (filters?.type_contrat) search.set('type_contrat', filters.type_contrat)
  return search
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
  const response = await fetch(apiUrl('/api/collecte/template-excel/'), {
    credentials: 'include',
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
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(apiUrl('/api/collecte/import-excel/'), {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail ?? 'Import échoué.')
  return data as ImportResult
}

export function createAgent(payload: Record<string, unknown>) {
  return apiFetch<import('../types/agent').AgentSante>('/api/collecte/agents/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchAgents(filters?: AgentFilters) {
  const search = agentSearch(filters)
  const q = search.toString() ? `?${search}` : ''
  return apiFetch<AgentsResponse>(`/api/collecte/agents/${q}`)
}

export async function downloadAgentsExcel(filters?: AgentFilters) {
  const search = agentSearch(filters)
  search.set('export', 'excel')
  const response = await fetch(apiUrl(`/api/collecte/agents/?${search}`), {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Export Excel impossible.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'agents-orhs.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadAgentsPdf(filters?: AgentFilters) {
  const search = agentSearch(filters)
  search.set('export', 'pdf')
  return apiDownload(`/api/collecte/agents/?${search}`, 'agents-orhs.pdf')
}

export function fetchMouvements(agentId?: number) {
  const q = agentId ? `?agent=${agentId}` : ''
  return apiFetch<MouvementAgent[]>(`/api/admin/mouvements/${q}`)
}

export function createMouvement(payload: Record<string, unknown>) {
  return apiFetch<MouvementAgent>('/api/admin/mouvements/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchQualifications(agentId: number) {
  return apiFetch<AgentQualification[]>(`/api/admin/qualifications/?agent=${agentId}`)
}

export function createQualification(payload: Record<string, unknown>) {
  return apiFetch<AgentQualification>('/api/admin/qualifications/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAgent(id: number, payload: Record<string, unknown>) {
  return apiFetch(`/api/collecte/agents/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchAgentDuplicates() {
  return apiFetch<{ groupes: DuplicateGroup[] }>('/api/collecte/agents/doublons/')
}
