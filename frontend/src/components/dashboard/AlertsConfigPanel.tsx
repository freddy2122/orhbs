import { useEffect, useState } from 'react'
import { Bell, Mail } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import {
  fetchAlertConfigs,
  fetchAlertEmails,
  patchAlertEmail,
  triggerAlerts,
  updateAlertConfig,
  type AlerteEmailRow,
  type ConfigAlerte,
} from '../../lib/alerts-admin-api'

function recipientsToText(value: string[] | string | null | undefined) {
  if (!value) return ''
  if (Array.isArray(value)) return value.join(', ')
  return value
}

function textToRecipients(value: string) {
  return value.split(/[,;\s]+/).map((item) => item.trim()).filter(Boolean)
}

export function AlertsConfigPanel() {
  const [configs, setConfigs] = useState<ConfigAlerte[]>([])
  const [emails, setEmails] = useState<AlerteEmailRow[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<number, { destinataires: string; seuil_min: string }>>({})

  const load = () => {
    setLoading(true)
    Promise.all([fetchAlertConfigs(), fetchAlertEmails()])
      .then(([cfg, rows]) => {
        setConfigs(cfg)
        setEmails(rows)
        setDrafts(
          Object.fromEntries(
            cfg.map((c) => [
              c.id,
              {
                destinataires: recipientsToText(c.destinataires_defaut),
                seuil_min: c.seuil_min == null ? '' : String(c.seuil_min),
              },
            ]),
          ),
        )
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const saveConfig = async (config: ConfigAlerte) => {
    const draft = drafts[config.id]
    if (!draft) return
    setError(null)
    setMessage(null)
    try {
      await updateAlertConfig(config.id, {
        destinataires_defaut: textToRecipients(draft.destinataires),
        seuil_min: draft.seuil_min === '' ? null : Number(draft.seuil_min),
      })
      setMessage(`Configuration « ${config.type_alerte_label} » enregistrée.`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    }
  }

  const toggleActif = async (config: ConfigAlerte) => {
    try {
      await updateAlertConfig(config.id, { actif: !config.actif })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.')
    }
  }

  const runNow = async () => {
    setRunning(true)
    setError(null)
    setMessage(null)
    try {
      const result = await triggerAlerts(true)
      setMessage(
        `${result.alertes_creees} alerte(s) créée(s) — ${result.emails_envoyes} email(s) envoyé(s), ${result.emails_erreur} erreur(s). En développement, les mails s'affichent dans la console Django.`,
      )
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Déclenchement impossible.')
    } finally {
      setRunning(false)
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
        <div>
          <h3 className="font-semibold text-institutional-blue">Alertes email</h3>
          <p className="mt-1 text-sm text-dark-text/60">
            Génération quotidienne via cron : <code className="text-xs">python manage.py run_scheduled_jobs</code>
          </p>
        </div>
        <button
          type="button"
          onClick={runNow}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Bell className="h-4 w-4" />
          {running ? 'Traitement…' : 'Générer et envoyer maintenant'}
        </button>
      </div>

      {message && <p className="text-sm text-health-green">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {configs.length === 0 ? (
        <EmptyState
          title="Aucune configuration d'alerte"
          description="Cliquez sur « Générer et envoyer maintenant » pour créer les modèles par défaut."
          icon={Mail}
        />
      ) : (
        <div className="space-y-3">
          {configs.map((config) => {
            const draft = drafts[config.id] ?? { destinataires: '', seuil_min: '' }
            return (
              <article key={config.id} className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-institutional-blue">{config.type_alerte_label}</p>
                    <p className="text-xs text-dark-text/50">
                      Rappel toutes les {config.frequence_rappel_heures ?? '—'} h
                      {config.dernier_envoi
                        ? ` · dernier envoi ${new Date(config.dernier_envoi).toLocaleString('fr-FR')}`
                        : ''}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.actif}
                      onChange={() => toggleActif(config)}
                    />
                    Actif
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    value={draft.destinataires}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [config.id]: { ...draft, destinataires: e.target.value },
                      }))
                    }
                    placeholder="destinataires@orhsb.bj"
                    className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm sm:col-span-2"
                  />
                  <input
                    type="number"
                    value={draft.seuil_min}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [config.id]: { ...draft, seuil_min: e.target.value },
                      }))
                    }
                    placeholder="Seuil"
                    className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => saveConfig(config)}
                  className="mt-3 text-sm font-medium text-health-green hover:underline"
                >
                  Enregistrer
                </button>
              </article>
            )
          })}
        </div>
      )}

      <div>
        <h3 className="mb-3 font-semibold text-institutional-blue">File d&apos;envoi récente</h3>
        {emails.length === 0 ? (
          <p className="text-sm text-dark-text/50">Aucun email généré pour le moment.</p>
        ) : (
          <ul className="divide-y divide-[#e8ecf0] rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
            {emails.slice(0, 20).map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-institutional-blue">{row.sujet}</p>
                  <p className="text-xs text-dark-text/50">
                    {row.type_alerte_label} · {row.statut_label}
                    {row.erreur_message ? ` · ${row.erreur_message}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {row.statut !== 'ignore' && (
                    <button
                      type="button"
                      onClick={() => patchAlertEmail(row.id, 'ignore').then(load)}
                      className="text-xs text-dark-text/50 hover:underline"
                    >
                      Ignorer
                    </button>
                  )}
                  {row.statut !== 'envoye' && row.statut !== 'traite' && (
                    <button
                      type="button"
                      onClick={() => patchAlertEmail(row.id, 'retry').then(load)}
                      className="text-xs text-health-green hover:underline"
                    >
                      Renvoyer
                    </button>
                  )}
                  {row.statut !== 'traite' && (
                    <button
                      type="button"
                      onClick={() => {
                        const note = window.prompt('Action prise (suivi métier) :', row.action_prise || '')
                        if (note === null) return
                        patchAlertEmail(row.id, 'traiter', note).then(load)
                      }}
                      className="text-xs text-institutional-blue hover:underline"
                    >
                      Marquer traité
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
