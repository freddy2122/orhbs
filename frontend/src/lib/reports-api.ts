import { apiDownload, apiFetch } from './api-client'

export type ReportModel = {
  key: string
  nom: string
  description: string
  indicateurs: string[]
}

export type ReportData = {
  modele: string
  nom_modele: string
  description: string
  date_generation: string
  campagne: string | null
  indicateurs: Record<string, unknown>
}

export type ReportHistoryRow = {
  id: number
  modele: string
  nom_modele: string
  parametres: Record<string, string | null>
  created_at: string
  cree_par_nom: string
}

function reportQuery(modele: string, extra?: { departement?: string; zone?: string; export?: string }) {
  const search = new URLSearchParams({ modele })
  if (extra?.departement) search.set('departement', extra.departement)
  if (extra?.zone) search.set('zone', extra.zone)
  search.set('export', extra?.export ?? 'json')
  return search
}

export async function fetchReportModels(): Promise<ReportModel[]> {
  const data = await apiFetch<Record<string, Omit<ReportModel, 'key'>>>('/api/reports/modeles/')
  return Object.entries(data).map(([key, value]) => ({ key, ...value }))
}

export function fetchReportData(modele: string, extra?: { departement?: string; zone?: string }) {
  return apiFetch<ReportData>(`/api/reports/generate/?${reportQuery(modele, extra)}`)
}

export function downloadReport(
  modele: string,
  format: 'pdf' | 'excel' | 'csv',
  extra?: { departement?: string; zone?: string },
) {
  const ext = format === 'excel' ? 'xlsx' : format
  return apiDownload(
    `/api/reports/generate/?${reportQuery(modele, { ...extra, export: format })}`,
    `rapport_${modele}.${ext}`,
  )
}

export function fetchReportHistory() {
  return apiFetch<ReportHistoryRow[]>('/api/reports/history/')
}

export function regenerateReport(id: number, format: 'pdf' | 'excel' | 'csv' | 'json' = 'json') {
  return apiFetch<ReportData>('/api/reports/history/', {
    method: 'POST',
    body: JSON.stringify({ id, export: format }),
  })
}
