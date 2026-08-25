import { apiUrl } from './api'
import type { AuthUser, LoginResponse } from '../types/auth'

function getCsrfToken(): string | null {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith('csrftoken='))
  return cookie ? decodeURIComponent(cookie.split('=')[1] ?? '') : null
}

export function getAccessToken(): string | null {
  return null
}

export function setTokens(_access: string, _refresh: string): void {
  return
}

export function clearTokens(): void {
  return
}

export async function logoutRequest(): Promise<void> {
  const csrfToken = getCsrfToken()
  try {
    await fetch(apiUrl('/api/auth/logout/'), {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
    })
  } catch {
    // Ignore logout errors; cookies are cleared server-side when possible.
  }
}

function unavailableMessage(): string {
  return import.meta.env.PROD
    ? "Impossible de joindre l'API."
    : 'Le serveur est indisponible. Vérifiez que Django tourne (python manage.py runserver).'
}

async function parseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(unavailableMessage())
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

async function postLogin(username: string, password: string): Promise<Response> {
  const csrfToken = getCsrfToken()
  return fetch(apiUrl('/api/auth/login/'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  })
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResponse> {
  let response: Response
  try {
    response = await postLogin(username, password)
  } catch {
    throw new Error(unavailableMessage())
  }
  return parseJson<LoginResponse>(response)
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await fetch(apiUrl('/api/auth/me/'), {
    method: 'GET',
    credentials: 'include',
  })
  return parseJson<AuthUser>(response)
}
