import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Handshake,
  Hospital,
} from 'lucide-react'

export type MissionCard = {
  id: string
  title: string
  description: string
  icon: LucideIcon
}

export type KeyFigure = {
  value: string
  label: string
}

export type DepartmentStats = {
  id: string
  name: string
  medecins: number
  infirmiers: number
  sagesFemmes: number
}

export type PublicationCard = {
  id: string
  title: string
  year: string
  type: string
}

export type LegalDocument = {
  id: string
  title: string
  type: 'Loi' | 'Décret' | 'Arrêté' | 'Statut'
  date: string
}

export type TrainingCategory = {
  id: string
  title: string
  description: string
  count: number
  icon: LucideIcon
}

export type NewsItem = {
  id: string
  title: string
  date: string
  category: string
  icon: LucideIcon
}

export type Partner = {
  id: string
  name: string
  abbr?: string
}

export const MISSION_CARDS: MissionCard[] = [
  {
    id: 'observation',
    title: 'Observation des RHS',
    description:
      'Collecter et analyser les données sur les ressources humaines en santé à l\'échelle nationale.',
    icon: Hospital,
  },
  {
    id: 'indicateurs',
    title: "Production d'indicateurs",
    description:
      'Élaborer des indicateurs fiables pour le suivi et l\'évaluation du secteur de la santé.',
    icon: BarChart3,
  },
  {
    id: 'diffusion',
    title: 'Diffusion des connaissances',
    description:
      'Rendre accessibles les études, rapports et analyses produits par l\'observatoire.',
    icon: BookOpen,
  },
  {
    id: 'appui',
    title: 'Appui à la décision',
    description:
      'Fournir aux décideurs des informations objectives pour orienter les politiques de santé.',
    icon: Handshake,
  },
]

export const KEY_FIGURES: KeyFigure[] = []

export const DEPARTMENTS: DepartmentStats[] = []

export const FEATURED_PUBLICATIONS: PublicationCard[] = []

export const LEGAL_DOCUMENTS: LegalDocument[] = []

export const TRAINING_CATEGORIES: TrainingCategory[] = []

export const NEWS_ITEMS: NewsItem[] = []

export const PARTNERS: Partner[] = [
  { id: 'ms', name: 'Ministère de la Santé', abbr: 'MS' },
  { id: 'oms', name: 'Organisation Mondiale de la Santé', abbr: 'OMS' },
  { id: 'unicef', name: 'UNICEF', abbr: 'UNICEF' },
  { id: 'instad', name: 'Institut National de la Statistique', abbr: 'INStaD' },
  { id: 'snis', name: 'Système National d\'Information Sanitaire', abbr: 'SNIS' },
  { id: 'ordre', name: 'Ordres professionnels de santé', abbr: 'OPS' },
]
