import { Spinner } from '../ui/Spinner'

export function StatsState({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean
  error: string | null
  onRetry?: () => void
  children: React.ReactNode
}) {
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-[#e8ecf0] bg-white p-8">
        <Spinner className="h-6 w-6 text-health-green" label="Chargement des données…" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        <p>{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50"
          >
            Réessayer
          </button>
        )}
      </div>
    )
  }
  return children
}

export function formatNumber(n: number) {
  return n.toLocaleString('fr-FR')
}
