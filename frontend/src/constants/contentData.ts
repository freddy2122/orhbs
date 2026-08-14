import type { LucideIcon } from 'lucide-react'

export type NewsCategory =
  | 'Institutionnel'
  | 'Formation'
  | 'Publication'
  | 'Partenariat'

export type NewsArticle = {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  date: string
  author: string
  category: NewsCategory
  image?: string
  icon: LucideIcon
}

export type EventItem = {
  id: string
  title: string
  date: string
  endDate?: string
  location: string
  type: 'Journée scientifique' | 'Webinaire' | 'Atelier' | 'Formation' | 'Réunion publique'
}

export type TrainingOffer = {
  id: string
  title: string
  organization: string
  deadline: string
  theme: string
}

export type OrgNode = {
  id: string
  title: string
  role: string
  missions: string[]
  children?: OrgNode[]
}

export const NEWS_ARTICLES: NewsArticle[] = []

export const EVENTS: EventItem[] = []

export const TRAINING_OFFERS: TrainingOffer[] = []

export const ORG_CHART: OrgNode = {
  id: 'root',
  title: 'ORHS Bénin',
  role: 'Observatoire national',
  missions: [],
  children: [],
}

export const FAQ_ITEMS: { q: string; a: string }[] = []

export const LEGAL_TEXTS: { id: string; title: string; type: string; year: string }[] = []

export const TRAINING_INSTITUTIONS_DIR: {
  id: string
  name: string
  type: string
  department: string
  capacity: number
  programs: string[]
  contact: string
}[] = []

export const GALLERY_ITEMS: { id: string; type: 'photo'; title: string; src: string }[] = []
