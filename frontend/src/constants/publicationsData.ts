import type { DataClassification } from '../lib/security'

export type Publication = {
  id: string
  title: string
  summary: string
  authors: string[]
  date: string
  year: number
  type: 'Rapport' | 'Bulletin' | 'Note' | 'Étude' | 'Annuaire'
  theme: string
  department?: string
  keywords: string[]
  downloads: number
  classification: DataClassification
  isArchive: boolean
  pdfUrl?: string
}

export const PUBLICATION_THEMES = [
  'Tous',
  'Genre',
  'Migration',
  'Formation',
  'Secteur privé',
  'Effectifs',
  'Politique',
] as const

export const PUBLICATION_TYPES = ['Tous', 'Rapport', 'Bulletin', 'Note', 'Étude', 'Annuaire'] as const

export const PUBLICATIONS: Publication[] = []

import { apiUrl } from '../lib/api'

export const RSS_FEED_URL = apiUrl('/api/publications/rss.xml')
