import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  FileBarChart,
  Map,
  Newspaper,
  ShieldCheck,
} from 'lucide-react'

export type PublicModule = {
  id: string
  title: string
  description: string
  utility: string
  href: string
  icon: LucideIcon
}

/** 5 modules de l'Espace Grand Public ORHS */
export const PUBLIC_MODULES: PublicModule[] = [
  {
    id: 'statistiques',
    title: 'Portail des Statistiques & Rapports',
    description: 'Annuaires statistiques des RHS et bilans annuels du Ministère de la Santé.',
    utility: 'Données fiables et officielles pour chercheurs et étudiants.',
    href: '/statistiques',
    icon: FileBarChart,
  },
  {
    id: 'indicateurs',
    title: 'Tableau de bord des Indicateurs nationaux',
    description: 'Graphiques interactifs sur la densité médicale et la répartition par corps de métier.',
    utility: 'Comprendre la situation globale de la santé et suivre les efforts de l\'État.',
    href: '/indicateurs',
    icon: BarChart3,
  },
  {
    id: 'cartographie',
    title: 'Cartographie sanitaire publique',
    description: 'Carte interactive du Bénin : personnel par département et infrastructures de santé.',
    utility: 'Visualiser l\'offre de soins dans sa région ou département.',
    href: '/cartographie',
    icon: Map,
  },
  {
    id: 'annuaire',
    title: 'Vérification de conformité',
    description: 'Recherche dans l\'annuaire public des Ordres Nationaux — médecins et cliniques inscrits.',
    utility: 'Protection contre l\'exercice illégal de la médecine et les cliniques clandestines.',
    href: '/annuaire',
    icon: ShieldCheck,
  },
  {
    id: 'actualites',
    title: 'Actualités & Opportunités',
    description: 'Concours, recrutements de l\'État, bourses de formation et communiqués officiels.',
    utility: 'Centraliser les opportunités d\'emploi et informations officielles du secteur.',
    href: '/actualites?tab=opportunites',
    icon: Newspaper,
  },
]

export const PROFESSION_DISTRIBUTION: { profession: string; effectif: number; pct: number }[] = []

export const DENSITY_TREND: { year: string; medecins: number; infirmiers: number; sagesFemmes: number }[] = []

export const SECTOR_DISTRIBUTION: { name: string; value: number }[] = []

export type Opportunity = {
  id: string
  type: 'concours' | 'recrutement' | 'bourse' | 'communique'
  title: string
  organization: string
  deadline?: string
  date: string
  excerpt: string
  link?: string
}

export const OPPORTUNITIES: Opportunity[] = []

export const STATISTICAL_YEARBOOKS: { id: string; title: string; year: number; pages: number; format: string }[] = []

export const MINISTRY_REPORTS: { id: string; title: string; year: number; theme: string }[] = []

export const OPPORTUNITY_TYPE_LABELS: Record<Opportunity['type'], string> = {
  concours: 'Concours',
  recrutement: 'Recrutement',
  bourse: 'Bourse',
  communique: 'Communiqué officiel',
}
