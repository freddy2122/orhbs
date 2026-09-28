import type { LucideIcon } from 'lucide-react'
import { ClipboardList, Map, Megaphone, Archive } from 'lucide-react'

export type ServiceOffer = {
  id: string
  title: string
  tagline: string
  icon: LucideIcon
  description: string
  deliverables: string[]
  audience: string
}

export const SERVICE_OFFERS: ServiceOffer[] = [
  {
    id: 'plan-rh',
    title: 'Plan RH',
    tagline: 'Planification des ressources humaines en santé',
    icon: ClipboardList,
    description:
      "À partir des déclarations validées par les structures et les départements, l'ORHS accompagne l'élaboration de plans RH fondés sur des effectifs réels — pas des estimations.",
    deliverables: [
      'Diagnostic des besoins par profession, zone sanitaire et département',
      'Projections d\'effectifs à 5 ans (départs à la retraite, postes vacants, postes budgétés)',
      'Scénarios de recrutement priorisés par zone sous-dotée',
    ],
    audience: 'Ministère de la Santé, DDS, partenaires techniques et financiers',
  },
  {
    id: 'carte-sanitaire',
    title: 'Carte sanitaire',
    tagline: 'Cartographie décisionnelle du personnel de santé',
    icon: Map,
    description:
      "Les effectifs déclarés sont rattachés à chaque structure sanitaire, zone et département — de quoi produire des cartes qui montrent où se trouvent, et où manquent, les professionnels de santé.",
    deliverables: [
      'Cartes de répartition du personnel par département, zone ou structure',
      'Identification des zones sous-dotées ou sans médecin',
      'Rapports de couverture sanitaire géographique',
    ],
    audience: 'Bailleurs ciblant un investissement géographique, ONG de santé',
  },
  {
    id: 'plaidoyer',
    title: 'Plaidoyer',
    tagline: 'Données validées à l\'appui du plaidoyer RH santé',
    icon: Megaphone,
    description:
      "Les indicateurs officiels de l'ORHS (ratios de densité, déséquilibres de répartition, alertes structurelles) donnent une base chiffrée et sourcée aux actions de plaidoyer pour le renforcement des effectifs.",
    deliverables: [
      'Notes de plaidoyer construites sur les indicateurs nationaux et départementaux',
      'Comparaisons inter-départementales et suivi du seuil OMS (23 professionnels / 10 000 hab.)',
      'Alertes sur les déséquilibres de genre et les structures sans médecin',
    ],
    audience: 'Société civile, ordres professionnels, PTF, parlementaires',
  },
  {
    id: 'archives',
    title: 'Archives',
    tagline: 'Valorisation des données RHS antérieures à la plateforme',
    icon: Archive,
    description:
      "Avant la mise en service de la plateforme numérique, les données RHS existaient sous forme papier ou dispersées entre services. L'ORHS accompagne leur numérisation et leur consolidation pour permettre des analyses de tendance sur longue période.",
    deliverables: [
      'Numérisation et consolidation de séries historiques',
      'Rapprochement avec les données validées depuis la mise en service de la plateforme',
      'Mise à disposition pour des analyses de tendance pluriannuelles',
    ],
    audience: 'Chercheurs, institutions académiques, partenaires historiques du secteur',
  },
]
