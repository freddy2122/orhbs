import { apiUrl } from './api'

function getCsrfToken(): string | null {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith('csrftoken='))
  return cookie ? decodeURIComponent(cookie.split('=')[1] ?? '') : null
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const csrfToken = getCsrfToken()

  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(method !== 'GET' && method !== 'HEAD' && csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new Error('Impossible de joindre le serveur API.')
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error('Réponse serveur invalide.')
  }

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail ?? 'Erreur API.')
  }
  return data as T
}

export async function apiDownload(path: string, filename: string) {
  let response: Response
  try {
    response = await fetch(apiUrl(path), { credentials: 'include' })
  } catch {
    throw new Error('Impossible de joindre le serveur API.')
  }
  if (!response.ok) {
    throw new Error('Téléchargement impossible.')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const csrfToken = getCsrfToken()
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
      body: form,
    })
  } catch {
    throw new Error('Impossible de joindre le serveur API.')
  }
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail ?? 'Envoi du fichier impossible.')
  }
  return data as T
}
