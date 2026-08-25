import type { CampagneRef } from './stats'

export type RecruitmentNeedRow = {
  zone: { code: string; nom: string }
  departement: { code: string; nom: string }
  medecins: number
  infirmiers: number
  sages_femmes: number
  postes_vacants: number
  postes_budgetes: number
  departs_retraite_6_mois: number
  departs_retraite_12_mois: number
  structures_count: number
  besoin_medecins: number
  besoin_infirmiers: number
  besoin_sages_femmes: number
  priorite: 'Haute' | 'Moyenne' | 'Basse'
}

export type RetirementAlert = {
  id: number
  agent: string
  matricule: string
  profession: string
  structure: string
  departement: string
  echeance: string
  horizon: '6 mois' | '12 mois'
}

export type PlanificationResponse = {
  campagne: CampagneRef | null
  besoins_recruitement: RecruitmentNeedRow[]
  alertes_retraite: RetirementAlert[]
}

export type CartographyStructureRow = {
  structure: {
    id: number
    code: string
    nom: string
    type_structure: string
    type_structure_label: string
  }
  departement: { code: string; nom: string }
  zone: { code: string; nom: string } | null
  effectif_total: number
  medecins: number
  infirmiers: number
  sages_femmes: number
  pharmaciens: number
  techniciens: number
  postes_vacants: number
  postes_budgetes: number
  statut: string | null
  statut_label: string
  a_declaration: boolean
}

export type CartographyResponse = {
  campagne: CampagneRef | null
  structures: CartographyStructureRow[]
  population_density?: {
    departement: { code: string; nom: string }
    population: number
    effectif_total: number
    ratio_10k: number
  }[]
}

export type FormationRecord = {
  id: number | string
  agent: string
  matricule: string
  diplome: string
  ecole: string
  annee: number | null
  structure: string
  departement: string
}

export type SpecialisationRecord = {
  id: number
  agent: string
  matricule: string
  specialite: string
  profession: string
  structure: string
  departement: string
}

export type CompetencesResponse = {
  campagne: CampagneRef | null
  formations: FormationRecord[]
  specialisations: SpecialisationRecord[]
}

export type IntegrationSource = {
  id: string
  name: string
  description: string
  status: 'connecté' | 'en attente' | 'non connecté' | 'erreur'
  last_sync: string | null
  records: number
}

export type ImportHistoryRow = {
  id: number
  nom_fichier: string
  statut: string
  lignes_total: number
  lignes_ok: number
  lignes_erreur: number
  structure: string | null
  importe_par: string | null
  created_at: string
}

export type InteroperabiliteResponse = {
  campagne: CampagneRef | null
  sources: IntegrationSource[]
  total_agents: number
  historique_imports: ImportHistoryRow[]
}
