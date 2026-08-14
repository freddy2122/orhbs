import { apiUrl } from './api'
import type { AuthUser, LoginResponse } from '../types/auth'

const ACCESS_TOKEN_KEY = 'orhsb_access_token'
const REFRESH_TOKEN_KEY = 'orhsb_refresh_token'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

async function parseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Le serveur est indisponible. Vérifiez que Django tourne (python manage.py runserver).',
    )
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail =
      typeof data.detail === 'string'
        ? data.detail
        : data.non_field_errors?.[0] ??
          (response.status === 401
            ? 'Identifiant ou mot de passe incorrect.'
            : 'Une erreur est survenue.')
    throw new Error(detail)
  }
  return data as T
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResponse> {
  let response: Response
  try {
    response = await fetch(apiUrl('/api/auth/login/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    throw new Error(
      'Impossible de joindre le serveur. Vérifiez que le backend Django est démarré.',
    )
  }
  return parseJson<LoginResponse>(response)
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const token = getAccessToken()
  if (!token) throw new Error('Non authentifié')

  const response = await fetch(apiUrl('/api/auth/me/'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  return parseJson<AuthUser>(response)
}
