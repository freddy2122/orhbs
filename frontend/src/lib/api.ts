const raw = import.meta.env.VITE_API_URL as string | undefined

/** Base URL de l'API (sans slash final). Vide → same-origin /api (proxy Vite ou Vercel). */
export function getApiBaseUrl(): string {
  // Production Vercel : appels same-origin, réécrits vers Render (cookies + pas de CORS).
  if (import.meta.env.PROD) return ''
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
