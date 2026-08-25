import { apiUrl } from './api'
import { apiFetch } from './api-client'

export type DepartmentRow = {
  id: number
  code: string
  nom: string
  population: number
  actif: boolean
}

export type ZoneRow = {
  id: number
  code: string
  nom: string
  actif: boolean
  departement?: DepartmentRow | null
}

export type StructureRow = {
  id: number
  code: string
  nom: string
  type_structure: string
  type_structure_label: string
  actif: boolean
  departement?: DepartmentRow | null
  zone_sanitaire?: ZoneRow | null
}

export type OrganizationData = {
  departements: DepartmentRow[]
  zones: ZoneRow[]
  structures: StructureRow[]
}

export type OrgKind = 'departement' | 'zone' | 'structure'

export type OrgPayload = {
  kind: OrgKind
  code: string
  nom: string
  population?: number
  departement_id?: number | null
  zone_sanitaire_id?: number | null
  type_structure?: string
  actif?: boolean
}

export function fetchOrganization() {
  return apiFetch<OrganizationData>('/api/admin/organization/')
}

export function createOrganizationEntity(payload: OrgPayload) {
  return apiFetch<{ kind: string; created: boolean; item: DepartmentRow | ZoneRow | StructureRow }>(
    '/api/admin/organization/',
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export function updateOrganizationEntity(kind: OrgKind, id: number, payload: Partial<OrgPayload>) {
  return apiFetch<{ kind: string; item: DepartmentRow | ZoneRow | StructureRow }>(
    `/api/admin/organization/${kind}/${id}/`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  )
}

export async function deleteOrganizationEntity(kind: OrgKind, id: number) {
  const csrf = document.cookie
    .split('; ')
    .find((item) => item.startsWith('csrftoken='))
  const response = await fetch(apiUrl(`/api/admin/organization/${kind}/${id}/`), {
    method: 'DELETE',
    credentials: 'include',
    headers: csrf ? { 'X-CSRFToken': decodeURIComponent(csrf.split('=')[1] ?? '') } : {},
  })
  if (response.status === 204) return
  const payload = await response.json().catch(() => ({}))
  throw new Error((payload as { detail?: string }).detail || 'La suppression a échoué.')
}
