/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Database, RefreshCw, Upload } from 'lucide-react'
import { PageHeader } from '../../../components/dashboard/PageHeader'
import { SecureActorsNotice } from '../../../components/dashboard/SecureActorsNotice'
import { StatsState } from '../../../components/dashboard/StatsState'
import { Spinner } from '../../../components/ui/Spinner'
import {
  downloadExcelTemplate,
  importExcelFile,
} from '../../../lib/collecte-api'
import { fetchInteroperabilite } from '../../../lib/acteurs-api'
import type { InteroperabiliteResponse } from '../../../types/acteurs'

const STATUS_STYLES: Record<string, string> = {
  connecté: 'bg-green-100 text-green-800',
  'en attente': 'bg-amber-100 text-amber-800',
  'non connecté': 'bg-gray-100 text-gray-700',
  erreur: 'bg-red-100 text-red-800',
}

function formatSyncDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR')
}

export function InteroperabilityPage() {
  const [data, setData] = useState<InteroperabiliteResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const reload = () => {
    setLoading(true)
    setError(null)
    fetchInteroperabilite()
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  const handleImport = async (file: File) => {
    setImporting(true)
    setImportMessage(null)
    try {
      const result = await importExcelFile(file)
      setImportMessage(
        `Import terminé : ${result.lignes_ok} ligne(s) OK, ${result.lignes_erreur} erreur(s).`,
      )
      reload()
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : 'Import échoué.')
    } finally {
      setImporting(false)
    }
  }

  const sources = data?.sources ?? []
  const historique = data?.historique_imports ?? []

  return (
    <div>
      <PageHeader
        title="Interopérabilité & Collecte de données"
        description="Sources de données connectées et historique des imports Excel ORHS."
        actions={
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d6b45] disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        }
      />
      <SecureActorsNotice />

      <StatsState loading={loading} error={error} onRetry={reload}>
        {data && (
          <p className="mb-4 text-sm text-dark-text/60">
            {data.total_agents} agent(s) recensé(s) dans votre périmètre
            {data.campagne ? ` — ${data.campagne.libelle}` : ''}.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {sources.map((source) => (
            <article
              key={source.id}
              className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-institutional-blue/10 text-institutional-blue">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-institutional-blue">{source.name}</h3>
                    <p className="text-xs text-dark-text/50">{source.description}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[source.status] ?? STATUS_STYLES['non connecté']}`}
                >
                  {source.status}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-dark-text/50">Dernière sync</dt>
                  <dd className="font-medium">{formatSyncDate(source.last_sync)}</dd>
                </div>
                <div>
                  <dt className="text-dark-text/50">Enregistrements</dt>
                  <dd className="font-medium">{source.records.toLocaleString('fr-FR')}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        {historique.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-institutional-blue">
              Historique des imports Excel
            </h2>
            <div className="overflow-x-auto rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-light-gray/50 text-xs uppercase text-dark-text/50">
                    <th className="px-4 py-3 text-left">Fichier</th>
                    <th className="px-4 py-3 text-left">Structure</th>
                    <th className="px-4 py-3 text-center">OK</th>
                    <th className="px-4 py-3 text-center">Erreurs</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((row) => (
                    <tr key={row.id} className="border-b border-[#f0f2f5]">
                      <td className="px-4 py-3 font-medium">{row.nom_fichier}</td>
                      <td className="px-4 py-3">{row.structure ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-health-green">{row.lignes_ok}</td>
                      <td className="px-4 py-3 text-center text-red-500">{row.lignes_erreur}</td>
                      <td className="px-4 py-3">{row.statut}</td>
                      <td className="px-4 py-3 text-xs">
                        {formatSyncDate(row.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mt-8 rounded-xl border border-dashed border-[#dde3ea] bg-white p-8 text-center">
          <Upload className="mx-auto h-10 w-10 text-health-green" />
          <h3 className="mt-3 font-semibold text-institutional-blue">
            Import Excel — fiches agents
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-dark-text/60">
            Téléchargez le modèle ORHS, remplissez les fiches agents et importez pour mettre à jour
            la base PostgreSQL.
          </p>
          {importMessage && (
            <p className="mx-auto mt-3 max-w-md rounded-lg bg-light-gray/60 px-4 py-2 text-sm text-dark-text/70">
              {importMessage}
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => downloadExcelTemplate()}
              className="rounded-lg border border-[#e8ecf0] px-4 py-2 text-sm font-medium hover:bg-light-gray"
            >
              Télécharger modèle
            </button>
            <label className="cursor-pointer rounded-lg bg-institutional-blue px-4 py-2 text-sm font-semibold text-white hover:bg-[#092d52]">
              {importing ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" /> Import…
                </span>
              ) : (
                'Choisir un fichier'
              )}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleImport(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </section>
      </StatsState>
    </div>
  )
}
