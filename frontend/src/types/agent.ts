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
  salaire: number | null
  date_debut_conge: string | null
  date_fin_conge: string | null
  telephone: string
  email: string
  nationalite: string
  historique_contrats: { type?: string; debut?: string; fin?: string; employeur?: string }[] | null
  actif: boolean
}

export type MouvementAgent = {
  id: number
  agent: number
  agent_nom: string
  type_mouvement: string
  type_mouvement_label: string
  structure_origine: number | null
  structure_origine_nom: string
  structure_destination: number | null
  structure_destination_nom: string
  grade_precedent: string
  grade_nouveau: string
  date_effet: string
  date_fin: string | null
  motif: string
  reference_arrete: string
}

export type AgentQualification = {
  id: number
  agent: number
  intitule: string
  niveau: string
  ecole: string
  date_obtention: string | null
  reference: string
}

export type DuplicateGroup = {
  type: string
  cle: string
  agents: { id: number; matricule: string; nom: string; prenom: string; structure__nom: string; profession: string }[]
}

export type AgentFilters = {
  q?: string
  departement?: string
  zone?: string
  structure?: number
  profession?: string
  secteur?: string
  statut?: string
  sexe?: string
  age_min?: number
  age_max?: number
  type_contrat?: string
}

export type AgentsResponse = {
  count: number
  agents: AgentSante[]
}
