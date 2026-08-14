export type HeroSlide = {
  id: string
  eyebrow?: string
  title: string
  description: string
  image: string
  imageAlt: string
  buttons: {
    label: string
    href: string
    variant: 'primary' | 'secondary' | 'outline'
  }[]
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'mission',
    title: 'Observatoire des Ressources Humaines en Santé du Bénin',
    description:
      "Une plateforme nationale dédiée à l'observation, l'analyse et la valorisation des ressources humaines en santé au Bénin.",
    image: '/images/hero/slide-1.jpg',
    imageAlt: 'Professionnelle de santé africaine en consultation avec un patient',
    buttons: [
      { label: "Découvrir l'ORHS", href: '/a-propos', variant: 'primary' },
      { label: 'Nos missions', href: '/a-propos#missions', variant: 'outline' },
    ],
  },
  {
    id: 'connaissances',
    title: 'Produire des connaissances pour renforcer le système de santé',
    description:
      "L'ORHS accompagne les acteurs du secteur de la santé à travers la production d'informations, d'études et d'analyses sur les ressources humaines en santé.",
    image: '/images/hero/slide-2.jpg',
    imageAlt: 'Médecin africain analysant des données de santé',
    buttons: [
      { label: 'En savoir plus', href: '/a-propos', variant: 'primary' },
    ],
  },
  {
    id: 'publications',
    title: 'Publications et actualités',
    description:
      'Consultez les rapports, études, communiqués et actualités publiés par l\'ORHS et ses partenaires.',
    image: '/images/hero/slide-3.jpg',
    imageAlt: 'Médecin africaine consultant un dossier médical',
    buttons: [
      { label: 'Voir les publications', href: '/publications', variant: 'primary' },
      { label: 'Actualités', href: '/actualites', variant: 'outline' },
    ],
  },
]
