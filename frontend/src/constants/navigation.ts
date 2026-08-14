export type NavItem = {
  label: string
  href: string
  id: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'accueil', label: 'Accueil', href: '/' },
  { id: 'espace-public', label: 'Espace public', href: '/espace-public' },
  { id: 'indicateurs', label: 'Indicateurs', href: '/indicateurs' },
  { id: 'publications', label: 'Publications', href: '/publications' },
  { id: 'actualites', label: 'Actualités', href: '/actualites' },
  { id: 'a-propos', label: 'À propos', href: '/a-propos' },
]

/** Routes rattachées à un item de navigation pour surlignage actif */
export const NAV_ROUTE_MAP: Record<string, string> = {
  '/': 'accueil',
  '/espace-public': 'espace-public',
  '/statistiques': 'espace-public',
  '/cartographie': 'espace-public',
  '/annuaire': 'espace-public',
  '/indicateurs': 'indicateurs',
  '/publications': 'publications',
  '/publications/archives': 'publications',
  '/actualites': 'actualites',
  '/a-propos': 'a-propos',
  '/textes-officiels': 'a-propos',
  '/formation': 'a-propos',
  '/faq': 'a-propos',
}
