import type { CampagneRef } from './stats'

export type AgentStructureRef = {
  id: number
  code: string
  nom: string
  type_structure: string
  type_structure_label: string
  departement: { code: string; nom: string }
  zone_sanitaire: { code: string; nom: string } | null
}

export type AgentSante = {
  id: number
  campagne: CampagneRef
  structure: AgentStructureRef
  matricule: string
  nom: string
  prenom: string
  sexe: 'M' | 'F'
  sexe_label: string
  date_naissance: string | null
  profession: string
  grade: string
  specialite: string
  diplome_principal: string
  ecole_formation: string
  annee_diplome: number | null
  secteur: string
  secteur_label: string
  statut_agent: string
  statut_label: string
  type_contrat: string
  type_contrat_label: string
  poste_occupe: string
  date_prise_service: string | null
  date_fin_contrat: string | null
  depart_retraite_prevu: string | null
  telephone: string
  email: string
  nationalite: string
  actif: boolean
}

export type AgentsResponse = {
  count: number
  agents: AgentSante[]
}

export type AgentFilters = {
  q?: string
  departement?: string
  zone?: string
  structure?: number
  profession?: string
  secteur?: string
  statut?: string
}
