export type CampagneRef = {
  id: number
  code: string
  libelle: string
  annee: number
  periode: string
  date_debut: string
  date_fin: string
  active: boolean
}

export type TotalsBlock = {
  effectif_total: number
  medecins: number
  infirmiers: number
  sages_femmes: number
  dont_femmes: number
  structures_count: number
}

export type NationalStats = {
  campagne: CampagneRef | null
  effectif_total: number
  medecins: number
  infirmiers: number
  sages_femmes: number
  dont_femmes: number
  ratio_medecins: number
  ratio_infirmiers: number
  ratio_sages_femmes?: number
  ratio_rhs_10k?: number
  ratio_personnel_qualifie_10k?: number
  seuil_oms_rhs?: number
  conforme_oms_rhs?: boolean
  effectif_public?: number
  effectif_prive?: number
  effectif_confessionnel?: number
  population: number
  structures_actives: number
  structures_declarantes: number
  taux_reponse: number
  departements_couverts: number
  departements_total: number
  en_attente_validation: number
}

export type DepartementStatsRow = {
  departement: { code: string; nom: string; population: number }
  rang: number
  totals: TotalsBlock
  ratio_medecins: number
  structures_total: number
  structures_declarantes: number
  taux_reponse: number
}

export type DepartementStatsResponse = {
  campagne: CampagneRef | null
  departements: DepartementStatsRow[]
}

export type ZoneStatsRow = {
  zone: { code: string; nom: string }
  departement: { code: string; nom: string }
  totals: TotalsBlock
  ratio_medecins: number
  structures_total: number
  structures_declarantes: number
  taux_reponse: number
}

export type ZoneStatsResponse = {
  campagne: CampagneRef | null
  zones: ZoneStatsRow[]
}

export type StructureStatsRow = {
  structure: {
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
  dont_femmes: number
  date_validation: string | null
}

export type StructureStatsResponse = {
  campagne: CampagneRef | null
  structures: StructureStatsRow[]
}

export type CollectionProgressRow = {
  departement: { code: string; nom: string }
  structures_total: number
  structures_soumises: number
  structures_validees: number
  taux_reponse: number
}

export type CollectionProgressResponse = {
  campagne: CampagneRef | null
  progress: CollectionProgressRow[]
}

export type Declaration = {
  id: number
  campagne: CampagneRef
  structure: {
    id: number
    code: string
    nom: string
    type_structure: string
    type_structure_label: string
    departement: { code: string; nom: string }
    zone_sanitaire: { code: string; nom: string } | null
  }
  statut: string
  statut_label: string
  effectif_total: number
  dont_femmes: number
  dont_hommes?: number
  medecins: number
  medecins_generalistes?: number
  medecins_specialistes?: number
  infirmiers: number
  infirmiers_auxiliaires?: number
  sages_femmes: number
  sages_femmes_auxiliaires?: number
  pharmaciens?: number
  techniciens_laboratoire?: number
  techniciens_imagerie?: number
  agents_sante_communautaire?: number
  chirurgiens_dentistes?: number
  kinesitherapeutes?: number
  autres_paramedicaux?: number
  administratifs?: number
  agents_entretien?: number
  autre_personnel?: number
  postes_budgetes?: number
  postes_pourvus?: number
  postes_vacants?: number
  departs_retraite_6_mois?: number
  departs_retraite_12_mois?: number
  observations?: string
  commentaire_rejet?: string
  date_soumission: string | null
  date_valide_dept: string | null
  date_valide_national: string | null
}
