/**
 * Règles de classification des données ORHS Bénin.
 * Toute donnée exposée publiquement DOIT passer par sanitizePublicAggregate().
 */

export type DataClassification = 'public_aggregate' | 'restricted' | 'confidential'

export type PublicAggregate = {
  classification: 'public_aggregate'
  /** Jamais de nom, prénom, matricule, adresse personnelle */
  aggregatedCount: number
  territoryLevel: 'national' | 'department' | 'commune'
  territoryCode: string
}

/** Seuil OMS indicatif : médecins pour 10 000 habitants */
export const OMS_DOCTOR_RATIO_THRESHOLD = 1.0

export function sanitizePublicAggregate<T extends Record<string, unknown>>(
  data: T,
  allowedKeys: (keyof T)[],
): Partial<T> {
  const sensitivePatterns =
    /nom|prenom|name|email|phone|telephone|matricule|address|adresse|birth|naissance|nin|identifiant/i

  const sanitized: Partial<T> = {}
  for (const key of allowedKeys) {
    if (sensitivePatterns.test(String(key))) continue
    sanitized[key] = data[key]
  }
  return sanitized
}

export function assertPublicData(classification: DataClassification): boolean {
  return classification === 'public_aggregate'
}

export const PUBLIC_DATA_NOTICE =
  'Données agrégées uniquement — aucune information nominative publiée sur cette plateforme.'

export const RESTRICTED_DATA_NOTICE =
  'Les données détaillées ou nominatives sont accessibles uniquement via l\'espace sécurisé, après autorisation.'

export const SECURE_ACTORS_NOTICE =
  'Espace sécurisé — données nominatives et confidentielles. Accès tracé et restreint par profil utilisateur.'
