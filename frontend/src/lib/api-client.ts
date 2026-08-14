import { apiUrl } from './api'
import { getAccessToken } from './auth-api'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
