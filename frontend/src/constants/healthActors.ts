import type { LucideIcon } from 'lucide-react'
import {
  Database,
  GraduationCap,
  MapPinned,
  Target,
  Users,
} from 'lucide-react'
import type { DashboardRole } from './dashboard'

export type ActorModule = {
  id: string
  title: string
  description: string
  utility: string
  href: string
  icon: LucideIcon
  roles: DashboardRole[]
}

export const ACTOR_MODULES: ActorModule[] = [
  {
    id: 'personnel',
    title: 'Gestion du Personnel & Carrières',
    description: 'Fiche numérique individuelle, diplômes, grade, historique des affectations et postes occupés.',
    utility: 'Suivi en temps réel de chaque agent — éviter les dossiers perdus.',
    href: '/dashboard/acteurs/personnel',
    icon: Users,
    roles: ['coordination', 'analyste', 'validateur', 'collecteur'],
  },
  {
    id: 'planification',
    title: 'Planification opérationnelle',
    description: 'Analyse des besoins en recrutement par zone et alertes départs à la retraite (6 mois / 1 an).',
    utility: 'Anticiper les pénuries et planifier recrutements ou mutations.',
    href: '/dashboard/acteurs/planification',
    icon: Target,
    roles: ['coordination', 'validateur', 'decideur'],
  },
  {
    id: 'cartographie',
    title: 'Cartographie décisionnelle micro-localisée',
    description: 'Effectifs réels par centre de santé précis (ex. HZ Tanguiéta).',
    utility: 'Corriger immédiatement les inégalités de répartition sur le terrain.',
    href: '/dashboard/acteurs/cartographie',
    icon: MapPinned,
    roles: ['coordination', 'validateur', 'collecteur'],
  },
  {
    id: 'competences',
    title: 'Suivi des Compétences & Formations',
    description: 'Formations continues et spécialisations acquises en cours de carrière.',
    utility: 'Vérifier que le personnel possède les compétences requises face aux besoins épidémiologiques.',
    href: '/dashboard/acteurs/competences',
    icon: GraduationCap,
    roles: ['coordination', 'analyste', 'validateur', 'collecteur', 'partenaire'],
  },
  {
    id: 'interoperabilite',
    title: 'Interopérabilité & Collecte',
    description: 'Passerelles DHIS2, fichiers Fonction Publique, import listes diplômés des écoles de santé.',
    utility: 'Éviter la double saisie et assurer la mise à jour automatique du système.',
    href: '/dashboard/acteurs/interoperabilite',
    icon: Database,
    roles: ['coordination', 'admin'],
  },
]

export function getActorModulesForRole(role: DashboardRole): ActorModule[] {
  return ACTOR_MODULES.filter((m) => m.roles.includes(role))
}
