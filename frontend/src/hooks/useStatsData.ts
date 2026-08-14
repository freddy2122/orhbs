import { useCallback, useEffect, useState } from 'react'
import {
  fetchCollectionProgress,
  fetchDeclarations,
  fetchDepartementStats,
  fetchNationalStats,
  fetchStructureStats,
  fetchZoneStats,
} from '../lib/stats-api'
import type {
  CollectionProgressResponse,
  Declaration,
  DepartementStatsResponse,
  NationalStats,
  StructureStatsResponse,
  ZoneStatsResponse,
} from '../types/stats'

type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    loader()
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, deps)

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload }
}

export function useNationalStats() {
  return useAsyncData(fetchNationalStats)
}

export function useDepartementStats() {
  return useAsyncData(fetchDepartementStats)
}

export function useZoneStats(departement?: string) {
  return useAsyncData(() => fetchZoneStats(departement), [departement])
}

export function useStructureStats(params?: {
  departement?: string
  zone?: string
  type?: string
}) {
  return useAsyncData(
    () => fetchStructureStats(params),
    [params?.departement, params?.zone, params?.type],
  )
}

export function useCollectionProgress() {
  return useAsyncData(fetchCollectionProgress)
}

export function useDeclarations(statut?: string) {
  return useAsyncData(() => fetchDeclarations(statut), [statut])
}

export type { NationalStats, DepartementStatsResponse, ZoneStatsResponse, StructureStatsResponse, CollectionProgressResponse, Declaration }
