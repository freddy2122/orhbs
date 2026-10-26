export type EditorialStatut = 'brouillon' | 'en_relecture' | 'publie' | 'rejete'

export type WorkflowAction = 'submit' | 'publish' | 'reject' | 'unpublish'

export type EditorialAvailableAction = WorkflowAction | 'edit' | 'delete'

export type WorkflowFields = {
  statut: EditorialStatut
  statut_label: string
  motif_rejet: string
  cree_par_nom: string
  soumis_par_nom: string
  valide_par_nom: string
  date_soumission: string | null
  date_validation: string | null
  actions_disponibles: EditorialAvailableAction[]
}

export const STATUT_STYLES: Record<EditorialStatut, string> = {
  brouillon: 'bg-light-gray text-dark-text/70',
  en_relecture: 'bg-gold-accent/20 text-gold-deep',
  publie: 'bg-health-green/10 text-health-green',
  rejete: 'bg-red-50 text-red-700',
}
