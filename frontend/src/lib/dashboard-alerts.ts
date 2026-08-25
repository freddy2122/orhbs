import type { DashboardRole } from '../constants/dashboard'
import type { DashboardAlert } from '../types/alerts'
import type {
  Declaration,
  DepartementStatsResponse,
  NationalStats,
} from '../types/stats'

export type AdvancedAlertsResponse = {
  structures_sans_medecin: {
    structure: string
    departement: string
    jours_sans_medecin: number
  }[]
  desequilibres_genre: {
    type: string
    nom?: string
    departement?: string
    ratio_femmes: number
  }[]
  zones_penurie_critique: {
    zone: string
    departement: string
    ratio_medecins_10k: number
    niveau: string
  }[]
  total_alertes: number
}

export function buildExecutiveAlerts(
  national: NationalStats | null,
  departements: DepartementStatsResponse | null,
): DashboardAlert[] {
  if (!national) return []

  const alerts: DashboardAlert[] = []

  if (national.conforme_oms_rhs === false) {
    alerts.push({
      id: 'ratio-oms-23',
      type: 'critical',
      message: `Densité du personnel de santé qualifié : ${national.ratio_personnel_qualifie_10k} / 10 000 hab. (seuil OMS : 23).`,
      date: 'Indicateurs',
      href: '/dashboard/analyse',
    })
  }

  if (national.ratio_medecins < 2.3) {
    alerts.push({
      id: 'ratio-medecins',
      type: 'critical',
      message: `Ratio médecins national (${national.ratio_medecins}/10 000 hab.) sous le seuil OMS`,
      date: national.campagne?.libelle ?? '',
    })
  }

  const lowDepts =
    departements?.departements.filter((d) => d.taux_reponse < 60) ?? []
  if (lowDepts.length) {
    alerts.push({
      id: 'taux-reponse-faible',
      type: 'warning',
      message: `Taux de réponse collecte < 60% — ${lowDepts.map((d) => d.departement.nom).join(', ')}`,
      date: national.campagne?.libelle ?? '',
      href: '/dashboard/executif',
    })
  }

  if (national.en_attente_validation > 0) {
    alerts.push({
      id: 'validations-en-attente',
      type: 'warning',
      message: `${national.en_attente_validation} déclaration(s) en attente de validation`,
      date: 'Validation',
      href: '/dashboard/validation',
    })
  }

  if (national.taux_reponse < 60) {
    alerts.push({
      id: 'taux-reponse-national',
      type: 'warning',
      message: `Taux de réponse national faible (${national.taux_reponse}%) — ${national.structures_declarantes}/${national.structures_actives} structures`,
      date: national.campagne?.libelle ?? '',
      href: '/dashboard/collecte',
    })
  }

  return alerts
}

export function buildValidatorAlerts(declarations: Declaration[]): DashboardAlert[] {
  const pending = declarations.filter((d) =>
    ['soumis', 'valide_departement'].includes(d.statut),
  )
  if (!pending.length) return []

  const soumis = pending.filter((d) => d.statut === 'soumis')
  const deptValidated = pending.filter((d) => d.statut === 'valide_departement')

  const alerts: DashboardAlert[] = []

  if (soumis.length) {
    alerts.push({
      id: 'validation-dept',
      type: 'warning',
      message: `${soumis.length} déclaration(s) à valider au niveau départemental`,
      date: 'Validation',
      href: '/dashboard/validation',
    })
  }

  if (deptValidated.length) {
    alerts.push({
      id: 'validation-national',
      type: 'info',
      message: `${deptValidated.length} déclaration(s) en attente de validation nationale`,
      date: 'Validation',
      href: '/dashboard/validation',
    })
  }

  return alerts
}

export function buildCollecteurAlerts(
  declarations: Declaration[],
  structureId?: number | null,
): DashboardAlert[] {
  const mine = structureId
    ? declarations.filter((d) => d.structure.id === structureId)
    : declarations

  const alerts: DashboardAlert[] = []
  const brouillon = mine.filter((d) => d.statut === 'brouillon')
  const rejete = mine.filter((d) => d.statut === 'rejete')

  if (brouillon.length) {
    alerts.push({
      id: 'declaration-brouillon',
      type: 'info',
      message: 'Déclaration RHS en brouillon — finalisez et soumettez votre saisie',
      date: brouillon[0].campagne.libelle,
      href: '/dashboard/collecte',
    })
  }

  if (rejete.length) {
    alerts.push({
      id: 'declaration-rejetee',
      type: 'critical',
      message: `Déclaration rejetée — ${rejete[0].commentaire_rejet || 'correction requise'}`,
      date: rejete[0].campagne.libelle,
      href: '/dashboard/collecte',
    })
  }

  return alerts
}

export function buildAdvancedAlerts(data: AdvancedAlertsResponse | null): DashboardAlert[] {
  if (!data) return []
  const alerts: DashboardAlert[] = []

  data.structures_sans_medecin.slice(0, 5).forEach((item, index) => {
    alerts.push({
      id: `sans-medecin-${index}`,
      type: 'critical',
      message: `${item.structure} (${item.departement}) sans médecin depuis ${item.jours_sans_medecin} jours`,
      date: 'Couverture',
      href: '/dashboard/acteurs/cartographie',
    })
  })

  data.zones_penurie_critique.slice(0, 5).forEach((item, index) => {
    alerts.push({
      id: `penurie-${index}`,
      type: item.niveau === 'critique' ? 'critical' : 'warning',
      message: `Pénurie ${item.zone} (${item.departement}) — ${item.ratio_medecins_10k} médecins / 10 000 hab.`,
      date: 'Densité',
      href: '/dashboard/executif',
    })
  })

  data.desequilibres_genre.slice(0, 3).forEach((item, index) => {
    const nom = item.nom || item.departement || 'territoire'
    alerts.push({
      id: `genre-${index}`,
      type: 'warning',
      message: `Déséquilibre de genre (${item.ratio_femmes}% de femmes) — ${nom}`,
      date: 'Genre',
      href: '/dashboard/acteurs/personnel',
    })
  })

  return alerts
}

export function buildAlertsForRole(
  role: DashboardRole | null,
  data: {
    national: NationalStats | null
    departements: DepartementStatsResponse | null
    declarations: Declaration[]
    structureId?: number | null
    advanced?: AdvancedAlertsResponse | null
  },
): DashboardAlert[] {
  if (!role) return []

  switch (role) {
    case 'coordination':
    case 'decideur':
    case 'analyste':
    case 'admin':
      return [
        ...buildExecutiveAlerts(data.national, data.departements),
        ...buildAdvancedAlerts(data.advanced ?? null),
      ]
    case 'validateur':
      return [
        ...buildValidatorAlerts(data.declarations),
        ...buildAdvancedAlerts(data.advanced ?? null),
      ]
    case 'collecteur':
      return buildCollecteurAlerts(data.declarations, data.structureId)
    default:
      return []
  }
}
