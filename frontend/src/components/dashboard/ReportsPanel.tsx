import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { useDepartementStats, useZoneStats } from '../../hooks/useStatsData'
import {
  downloadReport,
  fetchReportData,
  fetchReportHistory,
  fetchReportModels,
  regenerateReport,
  type ReportData,
  type ReportHistoryRow,
  type ReportModel,
} from '../../lib/reports-api'

export function ReportsPanel() {
  const [models, setModels] = useState<ReportModel[]>([])
  const [modele, setModele] = useState('mensuel_drh')
  const [departement, setDepartement] = useState('')
  const [zone, setZone] = useState('')
  const [preview, setPreview] = useState<ReportData | null>(null)
  const [history, setHistory] = useState<ReportHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const departements = useDepartementStats()
  const zones = useZoneStats(departement || undefined)

  const extra = {
    departement: departement || undefined,
    zone: zone || undefined,
  }

  useEffect(() => {
    Promise.all([fetchReportModels(), fetchReportHistory()])
      .then(([items, rows]) => {
        setModels(items)
        if (items[0]) setModele(items[0].key)
        setHistory(rows)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const generate = async () => {
    setGenerating(true)
    setError(null)
    try {
      setPreview(await fetchReportData(modele, extra))
      setHistory(await fetchReportHistory())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Génération impossible.')
    } finally {
      setGenerating(false)
    }
  }

  const download = async (format: 'pdf' | 'excel' | 'csv') => {
    setError(null)
    try {
      await downloadReport(modele, format, extra)
      setHistory(await fetchReportHistory())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Téléchargement impossible.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-health-green" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase text-dark-text/50">Modèle</span>
          <select
            value={modele}
            onChange={(e) => setModele(e.target.value)}
            className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
          >
            {models.map((item) => (
              <option key={item.key} value={item.key}>{item.nom}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase text-dark-text/50">Département</span>
          <select
            value={departement}
            onChange={(e) => {
              setDepartement(e.target.value)
              setZone('')
            }}
            className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
          >
            <option value="">National</option>
            {departements.data?.departements.map((row) => (
              <option key={row.departement.code} value={row.departement.code}>
                {row.departement.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase text-dark-text/50">Zone sanitaire</span>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            disabled={!departement}
            className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Toutes zones</option>
            {zones.data?.zones.map((row) => (
              <option key={row.zone.code} value={row.zone.code}>
                {row.zone.nom}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="rounded-lg bg-institutional-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {generating ? 'Génération…' : 'Prévisualiser'}
        </button>
        <button
          type="button"
          onClick={() => download('excel')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
        >
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </button>
        <button
          type="button"
          onClick={() => download('pdf')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
        >
          <FileText className="h-4 w-4" /> PDF
        </button>
        <button
          type="button"
          onClick={() => download('csv')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
        >
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {preview ? (
        <div className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-institutional-blue">{preview.nom_modele}</h3>
          <p className="mt-1 text-sm text-dark-text/60">
            {preview.campagne ?? 'Campagne active'} · {new Date(preview.date_generation).toLocaleString('fr-FR')}
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(preview.indicateurs).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-light-gray/50 p-3">
                <dt className="text-xs uppercase tracking-wider text-dark-text/50">{key.replace(/_/g, ' ')}</dt>
                <dd className="mt-1 text-sm text-dark-text/80">
                  {typeof value === 'object' ? JSON.stringify(value, null, 0).slice(0, 180) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <EmptyState
          title="Aucun rapport généré"
          description="Choisissez un modèle, une période géographique, puis prévisualisez ou téléchargez."
          icon={FileText}
        />
      )}
      {history.length > 0 && (
        <div className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-institutional-blue">Historique des exports</h3>
          <ul className="space-y-2 text-sm">
            {history.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3">
                <span>
                  {row.nom_modele} · {new Date(row.created_at).toLocaleString('fr-FR')}
                  {row.cree_par_nom ? ` · ${row.cree_par_nom}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => regenerateReport(row.id).then(setPreview)}
                  className="text-xs text-health-green hover:underline"
                >
                  Rééditer
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
