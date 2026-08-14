export type FooterLink = {
  label: string
  href: string
  external?: boolean
}

export const FOOTER_USEFUL_LINKS: FooterLink[] = [
  { label: 'Présidence de la République', href: 'https://presidence.bj', external: true },
  { label: 'Gouvernement du Bénin', href: 'https://www.gouv.bj', external: true },
  { label: 'Ministère de la Santé', href: 'https://sante.gouv.bj', external: true },
  { label: 'Service Public', href: 'https://service-public.bj', external: true },
  { label: 'Lois et décrets', href: 'https://sgg.gouv.bj', external: true },
]

export const FOOTER_LEGAL_LINKS: FooterLink[] = [
  { label: 'Mentions légales', href: '/mentions-legales' },
  { label: 'Politique de confidentialité', href: '/confidentialite' },
  { label: 'Accessibilité', href: '/accessibilite' },
  { label: 'Plan du site', href: '/plan-du-site' },
]

export const FOOTER_CONTACT = {
  address: 'Cotonou, République du Bénin',
  email: 'contact@orhsb.bj',
  phone: '+229 XX XX XX XX',
} as const
