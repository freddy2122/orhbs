import { apiFetch } from './api-client'

export type ConfigAlerte = {
  id: number
  type_alerte: string
  type_alerte_label: string
  actif: boolean
  seuil_min: number | null
  seuil_max: number | null
  destinataires_defaut: string[]
  frequence_rappel_heures: number | null
  template_sujet: string
  template_corps: string
  dernier_envoi: string | null
}

export type AlerteEmailRow = {
  id: number
  type_alerte: string
  type_alerte_label: string
  statut: string
  statut_label: string
  destinataires: string[]
  sujet: string
  date_envoi: string | null
  erreur_message: string
  nombre_tentatives: number
  action_prise?: string
  date_traitement?: string | null
  created_at: string
}

export type TriggerAlertsResult = {
  alertes_creees: number
  emails_envoyes: number
  emails_erreur: number
}

export function fetchAlertConfigs() {
  return apiFetch<ConfigAlerte[]>('/api/admin/config-alertes/')
}

export function updateAlertConfig(id: number, payload: Record<string, unknown>) {
  return apiFetch<ConfigAlerte>(`/api/admin/config-alertes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchAlertEmails() {
  return apiFetch<AlerteEmailRow[]>('/api/admin/alertes/')
}

export function patchAlertEmail(id: number, action: 'ignore' | 'retry' | 'traiter', actionPrise?: string) {
  return apiFetch<AlerteEmailRow>(`/api/admin/alertes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ action, action_prise: actionPrise }),
  })
}

export function triggerAlerts(send = true) {
  return apiFetch<TriggerAlertsResult>('/api/alerts/trigger/', {
    method: 'POST',
    body: JSON.stringify({ send }),
  })
}
