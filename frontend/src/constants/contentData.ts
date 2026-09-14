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

// Photos d'illustration (libres de droits) en attendant les archives photo
// officielles de l'ORHS — voir le disclaimer affiché sous "Galerie photos"
// dans AboutPage.tsx. Ne pas légender comme des photos d'activités réelles.
export const GALLERY_ITEMS: { id: string; type: 'photo'; title: string; src: string }[] = [
  {
    id: 'collecte-terrain',
    type: 'photo',
    title: 'Illustration — collecte de données sur le terrain',
    src: '/images/gallery/collecte-terrain.jpg',
  },
  {
    id: 'analyse-indicateurs',
    type: 'photo',
    title: 'Illustration — analyse des indicateurs',
    src: '/images/gallery/analyse-indicateurs.jpg',
  },
  {
    id: 'equipe-soignante',
    type: 'photo',
    title: 'Illustration — personnel de santé',
    src: '/images/gallery/equipe-soignante.jpg',
  },
]
