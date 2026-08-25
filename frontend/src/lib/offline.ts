import { apiFetch } from './api-client'

const PACK_KEY = 'orhsb-offline-pack'
const QUEUE_KEY = 'orhsb-offline-queue'

export type OfflineDeclarationPayload = Record<string, unknown> & {
  structure_id: number
}

export type OfflineQueueItem = {
  id: string
  savedAt: string
  declaration: OfflineDeclarationPayload
}

export type OfflinePack = {
  version: string
  date_export: string
  campagne: { id: number; code: string; libelle: string; annee: number }
  structures: { id: number; nom: string; code: string }[]
  declarations: Record<string, unknown>[]
  agents?: Record<string, unknown>[]
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export function loadOfflinePack(): OfflinePack | null {
  try {
    const raw = localStorage.getItem(PACK_KEY)
    return raw ? (JSON.parse(raw) as OfflinePack) : null
  } catch {
    return null
  }
}

export function saveOfflinePack(pack: OfflinePack) {
  localStorage.setItem(PACK_KEY, JSON.stringify(pack))
}

export function loadOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as OfflineQueueItem[]) : []
  } catch {
    return []
  }
}

export function enqueueOfflineDeclaration(declaration: OfflineDeclarationPayload) {
  const queue = loadOfflineQueue().filter((item) => item.declaration.structure_id !== declaration.structure_id)
  queue.push({
    id: `${declaration.structure_id}-${Date.now()}`,
    savedAt: new Date().toISOString(),
    declaration: { ...declaration, updated_at: new Date().toISOString() },
  })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return queue
}

export function clearOfflineQueue() {
  localStorage.setItem(QUEUE_KEY, '[]')
}

export function removeQueueItem(id: string) {
  const next = loadOfflineQueue().filter((item) => item.id !== id)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(next))
  return next
}

export function fetchOfflinePack() {
  return apiFetch<OfflinePack>('/api/offline/export/')
}

export function syncOfflineDeclaration(declaration: OfflineDeclarationPayload) {
  return apiFetch<{ success: boolean; declaration_id?: number; error?: string; conflict?: boolean }>(
    '/api/offline/sync/',
    {
      method: 'POST',
      body: JSON.stringify({ type: 'declaration', declaration }),
    },
  )
}

export async function syncOfflineQueue() {
  const queue = loadOfflineQueue()
  const results = { sent: 0, errors: 0, conflicts: 0 }
  for (const item of queue) {
    try {
      const result = await syncOfflineDeclaration(item.declaration)
      if (result.conflict) {
        results.conflicts += 1
      } else if (result.success) {
        results.sent += 1
        removeQueueItem(item.id)
      } else {
        results.errors += 1
      }
    } catch {
      results.errors += 1
    }
  }
  return results
}
