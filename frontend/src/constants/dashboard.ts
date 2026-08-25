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
    label: 'Administrateur ORHS',
    description: 'Pilotage, sécurité et paramétrage de la plateforme',
    icon: Settings,
    defaultRoute: '/dashboard/admin',
  },
  {
    id: 'coordination',
    label: 'Coordination ORHS',
    description: 'Secrétariat permanent — pilotage et coordination',
    icon: Shield,
    defaultRoute: '/dashboard/coordination/executif',
  },
  {
    id: 'analyste',
    label: 'Analyste / Statisticien',
    description: 'Production de rapports et analyses',
    icon: BarChart3,
    defaultRoute: '/dashboard/analyste/analyse',
  },
  {
    id: 'validateur',
    label: 'Validateur',
    description: 'Contrôle qualité des données (DRH, ORHS, DDS)',
    icon: ClipboardCheck,
    defaultRoute: '/dashboard/validateur/validation',
  },
  {
    id: 'collecteur',
    label: 'Collecteur',
    description: 'Saisie et déclaration par structure ou département',
    icon: ClipboardList,
    defaultRoute: '/dashboard/collecteur/collecte',
  },
  {
    id: 'decideur',
    label: 'Décideur',
    description: 'Ministre, DG, comité d\'orientation — lecture exécutive',
    icon: Crown,
    defaultRoute: '/dashboard/decideur/executif',
  },
  {
    id: 'partenaire',
    label: 'Partenaire accrédité',
    description: 'Chercheurs, ONG, bailleurs — accès lecture restreint',
    icon: FlaskConical,
    defaultRoute: '/dashboard/partenaire/analyse',
  },
]

export type NavItem = {
  label: string
  section: string
  icon: LucideIcon
  roles: DashboardRole[]
}

export const DASHBOARD_NAV: NavItem[] = [
  {
    label: 'Vue exécutive',
    section: 'executif',
    icon: Crown,
    roles: ['decideur', 'coordination', 'analyste'],
  },
  {
    label: 'Collecte & saisie',
    section: 'collecte',
    icon: ClipboardList,
    roles: ['collecteur', 'validateur', 'coordination'],
  },
  {
    label: 'Validation & qualité',
    section: 'validation',
    icon: ClipboardCheck,
    roles: ['validateur', 'coordination'],
  },
  {
    label: 'Analyse & rapports',
    section: 'analyse',
    icon: BarChart3,
    roles: ['analyste', 'partenaire', 'coordination', 'decideur'],
  },
  {
    label: 'Administration',
    section: '',
    icon: UserCog,
    roles: ['admin'],
  },
  {
    label: 'Espace acteurs',
    section: 'acteurs',
    icon: Users,
    roles: ['coordination', 'analyste', 'validateur', 'collecteur', 'admin', 'decideur'],
  },
]

export const DASHBOARD_ROLE_SLUGS: DashboardRole[] = DASHBOARD_ROLES.map((role) => role.id)

export function isDashboardRole(value: string): value is DashboardRole {
  return DASHBOARD_ROLE_SLUGS.includes(value as DashboardRole)
}

export function rolePath(role: DashboardRole, section = '') {
  return section ? `/dashboard/${role}/${section}` : `/dashboard/${role}`
}

export function localizeDashboardHref(role: DashboardRole, href: string) {
  if (!href.startsWith('/dashboard/')) return href
  const rest = href.slice('/dashboard/'.length)
  const first = rest.split('/')[0] ?? ''
  if (isDashboardRole(first)) return href
  return rolePath(role, rest)
}

export function getRoleMeta(role: DashboardRole): DashboardRoleMeta {
  return DASHBOARD_ROLES.find((r) => r.id === role) ?? DASHBOARD_ROLES[0]
}
