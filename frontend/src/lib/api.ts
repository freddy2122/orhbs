const raw = import.meta.env.VITE_API_URL as string | undefined

/** Base URL de l'API (sans slash final). Vide en dev → proxy Vite /api. */
export function getApiBaseUrl(): string {
  const url = raw?.trim()
  if (!url) return ''
  return url.replace(/\/$/, '')
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = getApiBaseUrl()
  if (!base) return normalized
  return `${base}${normalized}`
}
