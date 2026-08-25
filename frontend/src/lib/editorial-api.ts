import { apiFetch } from './api-client'
import type { RegistryEntry, RegistryStatus } from '../constants/registryData'

export type EditorialType =
  | 'actualite'
  | 'evenement'
  | 'opportunite'
  | 'faq'
  | 'texte_legal'
  | 'formation'

export type ContenuEditorial = {
  id: number
  type_contenu: EditorialType
  type_contenu_label: string
  titre: string
  slug: string
  resume: string
  contenu: string
  categorie: string
  lieu: string
  organisation: string
  date_debut: string | null
  date_fin: string | null
  annee: number | null
  publie: boolean
  date_publication: string | null
  auteur_full: string
}

export type InscriptionOrdre = {
  id: number
  type_entree: 'medecin' | 'clinique'
  type_entree_label: string
  nom: string
  numero_inscription: string
  ordre: string
  specialite: string
  departement: string
  commune: string
  statut: RegistryStatus
  statut_label: string
  inscrit_depuis: string | null
  titre: string
  nationalite: string
  universite: string
  annee_diplome: number | null
  mode_exercice: string
  lieu_exercice: string
  adresse: string
  telephone: string
  email: string
  directeur: string
  numero_autorisation: string
  lits: number | null
  publie: boolean
}

export type AnnuaireResponse = {
  stats: { medecins: number; cliniques: number; suspendus: number; total: number }
  resultats: InscriptionOrdre[]
}

export function fetchPublicContenus(type?: EditorialType) {
  const q = type ? `?type=${type}` : ''
  return apiFetch<ContenuEditorial[]>(`/api/public/contenus/${q}`)
}

export function fetchPublicContenu(slug: string) {
  return apiFetch<ContenuEditorial>(`/api/public/contenus/${slug}/`)
}

export function subscribeNewsletter(email: string) {
  return apiFetch<{ detail: string; email: string }>('/api/public/newsletter/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function fetchNewsletterUnsubscribe(token: string) {
  return apiFetch<{ email: string; actif: boolean }>(
    `/api/public/newsletter/desabonnement/?token=${encodeURIComponent(token)}`,
  )
}

export function confirmNewsletterUnsubscribe(token: string) {
  return apiFetch<{ detail: string; email: string }>('/api/public/newsletter/desabonnement/', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export type NewsletterSubscriber = {
  id: number
  email: string
  actif: boolean
  source: string
  source_label: string
  date_desabonnement: string | null
  created_at: string
}

export type NewsletterCampaign = {
  id: number
  sujet: string
  corps: string
  statut: string
  statut_label: string
  destinataires_prevus: number
  envoyes: number
  erreurs: number
  date_envoi: string | null
  created_by_nom: string
  created_at: string
}

export function fetchNewsletterSubscribers(params?: { q?: string; actif?: string }) {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.actif) search.set('actif', params.actif)
  const q = search.toString() ? `?${search}` : ''
  return apiFetch<{
    stats: { total: number; actifs: number; inactifs: number }
    abonnes: NewsletterSubscriber[]
  }>(`/api/cms/newsletter/abonnes/${q}`)
}

export function createNewsletterSubscriber(email: string) {
  return apiFetch<NewsletterSubscriber>('/api/cms/newsletter/abonnes/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function updateNewsletterSubscriber(id: number, actif: boolean) {
  return apiFetch<NewsletterSubscriber>(`/api/cms/newsletter/abonnes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ actif }),
  })
}

export function fetchNewsletterCampaigns() {
  return apiFetch<NewsletterCampaign[]>('/api/cms/newsletter/campagnes/')
}

export function createNewsletterCampaign(sujet: string, corps: string) {
  return apiFetch<NewsletterCampaign>('/api/cms/newsletter/campagnes/', {
    method: 'POST',
    body: JSON.stringify({ sujet, corps }),
  })
}

export function sendNewsletterCampaign(id: number) {
  return apiFetch<{ campagne: NewsletterCampaign; envoi: { sent: number; errors: number } }>(
    `/api/cms/newsletter/campagnes/${id}/envoyer/`,
    { method: 'POST' },
  )
}

export function fetchPublicAnnuaire(params?: {
  q?: string
  type?: string
  statut?: string
  departement?: string
  specialite?: string
}) {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.type && params.type !== 'all') search.set('type', params.type)
  if (params?.statut && params.statut !== 'all') search.set('statut', params.statut)
  if (params?.departement && params.departement !== 'Tous') search.set('departement', params.departement)
  if (params?.specialite && params.specialite !== 'Toutes') search.set('specialite', params.specialite)
  const q = search.toString() ? `?${search}` : ''
  return apiFetch<AnnuaireResponse>(`/api/public/annuaire/${q}`)
}

export function fetchCmsContenus(type?: EditorialType) {
  const q = type ? `?type=${type}` : ''
  return apiFetch<ContenuEditorial[]>(`/api/cms/contenus/${q}`)
}

export function createCmsContenu(payload: Record<string, unknown>) {
  return apiFetch<ContenuEditorial>('/api/cms/contenus/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCmsContenu(id: number, payload: Record<string, unknown>) {
  return apiFetch<ContenuEditorial>(`/api/cms/contenus/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchCmsAnnuaire() {
  return apiFetch<InscriptionOrdre[]>('/api/cms/annuaire/')
}

export function createCmsAnnuaire(payload: Record<string, unknown>) {
  return apiFetch<InscriptionOrdre>('/api/cms/annuaire/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCmsAnnuaire(id: number, payload: Record<string, unknown>) {
  return apiFetch<InscriptionOrdre>(`/api/cms/annuaire/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function inscriptionToRegistryEntry(row: InscriptionOrdre): RegistryEntry {
  return {
    id: String(row.id),
    type: row.type_entree,
    name: row.nom,
    registrationNumber: row.numero_inscription || '—',
    order: row.ordre,
    specialty: row.specialite || undefined,
    dept: row.departement,
    commune: row.commune,
    status: row.statut,
    registeredSince: row.inscrit_depuis || '—',
    title: row.titre || undefined,
    nationality: row.nationalite || undefined,
    university: row.universite || undefined,
    graduationYear: row.annee_diplome ?? undefined,
    practiceMode: (row.mode_exercice as RegistryEntry['practiceMode']) || undefined,
    workplace: row.lieu_exercice || undefined,
    address: row.adresse || undefined,
    phone: row.telephone || undefined,
    email: row.email || undefined,
    director: row.directeur || undefined,
    authorizationNumber: row.numero_autorisation || undefined,
    beds: row.lits ?? undefined,
  }
}
