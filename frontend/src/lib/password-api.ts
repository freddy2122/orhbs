import { apiFetch } from './api-client'

export const PASSWORD_RULES = [
  '12 caractères minimum (14 pour les comptes d’administration, de coordination et de validation)',
  'Ne pas contenir « ORHS », « Bénin » ni de motif trivial (azerty, password…)',
  'Ne pas être un mot de passe courant, uniquement numérique, ou proche de votre identifiant',
  'Différent de vos 5 derniers mots de passe',
]

export function requestPasswordReset(email: string) {
  return apiFetch<{ detail: string }>('/api/auth/password/forgot/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function setPasswordFromLink(uid: string, token: string, password: string) {
  return apiFetch<{ detail: string; username: string }>('/api/auth/password/set/', {
    method: 'POST',
    body: JSON.stringify({ uid, token, password }),
  })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ detail: string }>('/api/auth/password/change/', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}
