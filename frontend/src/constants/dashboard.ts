import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Crown,
  FlaskConical,
  Settings,
  Shield,
  UserCog,
  Users,
} from 'lucide-react'

/** 7 rôles RBAC ORHS Bénin */
export type DashboardRole =
  | 'admin'
  | 'coordination'
  | 'analyste'
  | 'validateur'
  | 'collecteur'
  | 'decideur'
  | 'partenaire'

export type UserScope = 'national' | 'departemental' | 'structure'

export type DashboardRoleMeta = {
  id: DashboardRole
  label: string
  description: string
  icon: LucideIcon
  defaultRoute: string
}

export const DASHBOARD_ROLES: DashboardRoleMeta[] = [
  {
    id: 'admin',
    label: 'Administrateur système',
    description: 'Comptes, sécurité, configuration technique',
    icon: Settings,
    defaultRoute: '/dashboard/admin',
  },
  {
    id: 'coordination',
    label: 'Coordination ORHS',
    description: 'Secrétariat permanent — pilotage et coordination',
    icon: Shield,
    defaultRoute: '/dashboard/executif',
  },
  {
    id: 'analyste',
    label: 'Analyste / Statisticien',
    description: 'Production de rapports et analyses',
    icon: BarChart3,
    defaultRoute: '/dashboard/analyse',
  },
  {
    id: 'validateur',
    label: 'Validateur',
    description: 'Contrôle qualité des données (DRH, ORHS, DDS)',
    icon: ClipboardCheck,
    defaultRoute: '/dashboard/validation',
  },
  {
    id: 'collecteur',
    label: 'Collecteur',
    description: 'Saisie et déclaration par structure ou département',
    icon: ClipboardList,
    defaultRoute: '/dashboard/collecte',
  },
  {
    id: 'decideur',
    label: 'Décideur',
    description: 'Ministre, DG, comité d\'orientation — lecture exécutive',
    icon: Crown,
    defaultRoute: '/dashboard/executif',
  },
  {
    id: 'partenaire',
    label: 'Partenaire accrédité',
    description: 'Chercheurs, ONG, bailleurs — accès lecture restreint',
    icon: FlaskConical,
    defaultRoute: '/dashboard/analyse',
  },
]

export type NavItem = {
  label: string
  path: string
  icon: LucideIcon
  roles: DashboardRole[]
}

export const DASHBOARD_NAV: NavItem[] = [
  {
    label: 'Vue exécutive',
    path: '/dashboard/executif',
    icon: Crown,
    roles: ['decideur', 'coordination', 'analyste'],
  },
  {
    label: 'Collecte & saisie',
    path: '/dashboard/collecte',
    icon: ClipboardList,
    roles: ['collecteur', 'coordination'],
  },
  {
    label: 'Validation & qualité',
    path: '/dashboard/validation',
    icon: ClipboardCheck,
    roles: ['validateur', 'coordination'],
  },
  {
    label: 'Analyse & rapports',
    path: '/dashboard/analyse',
    icon: BarChart3,
    roles: ['analyste', 'partenaire', 'coordination', 'decideur'],
  },
  {
    label: 'Administration',
    path: '/dashboard/admin',
    icon: UserCog,
    roles: ['admin'],
  },
  {
    label: 'Espace acteurs',
    path: '/dashboard/acteurs',
    icon: Users,
    roles: ['coordination', 'analyste', 'validateur', 'collecteur'],
  },
]

export function getRoleMeta(role: DashboardRole): DashboardRoleMeta {
  return DASHBOARD_ROLES.find((r) => r.id === role) ?? DASHBOARD_ROLES[0]
}
