import { apiFetch } from './api-client'

export type AuditLogRow = {
  id: number
  user: { id: number; username: string; full_name?: string } | null
  action: string
  action_label: string
  model_name: string
  object_id: string
  object_repr: string
  description: string
  ip_address: string | null
  created_at: string
}

export type SystemHealth = {
  timestamp: string
  overall_status: string
  database: { status: string; details: Record<string, unknown> }
  storage: { status: string; details: Record<string, unknown> }
  services: { status: string; details: unknown }
}

export type MonitoringMetrics = {
  database: Record<string, number | string>
  application: Record<string, number | string>
  performance: Record<string, number | string>
}

export type BackupRow = {
  filename: string
  size: number
  size_mb: number
  created: string
}

export type BackupResult = {
  success: boolean
  backup_file?: string
  size?: number
  timestamp?: string
  format?: string
  error?: string
}

export function fetchAuditLogs(params?: { action?: string; model?: string; limit?: number }) {
  const search = new URLSearchParams()
  if (params?.action) search.set('action', params.action)
  if (params?.model) search.set('model', params.model)
  search.set('limit', String(params?.limit ?? 150))
  return apiFetch<AuditLogRow[]>(`/api/admin/audit/?${search.toString()}`)
}

export function fetchSystemHealth() {
  return apiFetch<SystemHealth>('/api/monitoring/health/')
}

export function fetchMonitoringMetrics() {
  return apiFetch<MonitoringMetrics>('/api/monitoring/metrics/')
}

export function fetchBackupHistory() {
  return apiFetch<BackupRow[]>('/api/monitoring/backup/history/')
}

export function triggerBackup() {
  return apiFetch<BackupResult>('/api/monitoring/backup/trigger/', { method: 'POST' })
}
