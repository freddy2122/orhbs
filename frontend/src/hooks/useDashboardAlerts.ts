/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import type { DashboardRole } from '../constants/dashboard'
import { buildAlertsForRole, type AdvancedAlertsResponse } from '../lib/dashboard-alerts'
import {
  fetchDeclarations,
  fetchDepartementStats,
  fetchNationalStats,
} from '../lib/stats-api'
import { apiFetch } from '../lib/api-client'
import type { DashboardAlert } from '../types/alerts'
import type {
  Declaration,
  DepartementStatsResponse,
  NationalStats,
} from '../types/stats'

type AlertsState = {
  alerts: DashboardAlert[]
  loading: boolean
  error: string | null
  campagneLabel: string | null
  reload: () => void
}

function needsStats(role: DashboardRole | null) {
  return role === 'coordination' || role === 'decideur' || role === 'analyste' || role === 'admin'
}

function needsDeclarations(role: DashboardRole | null) {
  return role === 'validateur' || role === 'collecteur'
}

function needsAdvanced(role: DashboardRole | null) {
  return (
    role === 'coordination' ||
    role === 'decideur' ||
    role === 'analyste' ||
    role === 'admin' ||
    role === 'validateur'
  )
}

export function useDashboardAlerts(
  role: DashboardRole | null,
  structureId?: number | null,
): AlertsState {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campagneLabel, setCampagneLabel] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!role) {
      setAlerts([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const tasks: Promise<unknown>[] = []
    let national: NationalStats | null = null
    let departements: DepartementStatsResponse | null = null
    let declarations: Declaration[] = []
    let advanced: AdvancedAlertsResponse | null = null

    if (needsStats(role)) {
      tasks.push(
        fetchNationalStats().then((data) => {
          national = data
          setCampagneLabel(data.campagne?.libelle ?? null)
        }),
      )
      tasks.push(fetchDepartementStats().then((data) => {
        departements = data
      }))
    }

    if (needsDeclarations(role)) {
      tasks.push(fetchDeclarations().then((data) => {
        declarations = data
        if (!needsStats(role) && data[0]?.campagne?.libelle) {
          setCampagneLabel(data[0].campagne.libelle)
        }
      }))
    }

    if (needsAdvanced(role)) {
      tasks.push(
        apiFetch<AdvancedAlertsResponse>('/api/alerts/advanced/').then((data) => {
          advanced = data
        }),
      )
    }

    if (!tasks.length) {
      setAlerts([])
      setLoading(false)
      return
    }

    Promise.all(tasks)
      .then(() => {
        setAlerts(
          buildAlertsForRole(role, {
            national,
            departements,
            declarations,
            structureId,
            advanced,
          }),
        )
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [role, structureId])

  useEffect(() => {
    reload()
  }, [reload])

  return { alerts, loading, error, campagneLabel, reload }
}
