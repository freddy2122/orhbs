/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CircleHelp,
  CloudOff,
  FileSpreadsheet,
  History,
  Save,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { StatsState } from '../../components/dashboard/StatsState'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useCollectionProgress, useDeclarations } from '../../hooks/useStatsData'
import {
  downloadExcelTemplate,
  fetchActiveCampagne,
  fetchCollecteFields,
  fetchStructures,
  importExcelFile,
  saveDeclaration,
  submitDeclaration,
  type CollecteField,
  type StructureOption,
} from '../../lib/collecte-api'
import {
  enqueueOfflineDeclaration,
  fetchOfflinePack,
  isOnline,
  loadOfflinePack,
  loadOfflineQueue,
  saveOfflinePack,
  syncOfflineQueue,
} from '../../lib/offline'
import type { Declaration } from '../../types/stats'

const tabs = [
  { id: 'form', label: 'Déclaration', icon: Save },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'calendar', label: 'Calendrier', icon: Calendar },
  { id: 'upload', label: 'Import Excel', icon: FileSpreadsheet },
  { id: 'offline', label: 'Hors ligne', icon: CloudOff },
] as const

type TabId = (typeof tabs)[number]['id']

type FieldSection = {
  title: string
  fields: CollecteField[]
}

function emptyValues(keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, '0']))
}

function declarationToValues(decl: Declaration): Record<string, string> {
  const numericKeys = [
    'effectif_total', 'dont_femmes', 'dont_hommes', 'medecins', 'medecins_generalistes',
    'medecins_specialistes', 'infirmiers', 'infirmiers_auxiliaires', 'sages_femmes',
    'sages_femmes_auxiliaires', 'pharmaciens', 'techniciens_laboratoire', 'techniciens_imagerie',
    'agents_sante_communautaire', 'chirurgiens_dentistes', 'kinesitherapeutes',
    'autres_paramedicaux', 'administratifs', 'agents_entretien', 'autre_personnel',
    'postes_budgetes', 'postes_pourvus', 'postes_vacants', 'departs_retraite_6_mois',
    'departs_retraite_12_mois',
  ]
  const out: Record<string, string> = { observations: decl.observations ?? '' }
  for (const key of numericKeys) {
    out[key] = String((decl as Record<string, unknown>)[key] ?? 0)
  }
  return out
}

export function CollecteDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('form')
  const [fieldSections, setFieldSections] = useState<FieldSection[]>([])
  const [structures, setStructures] = useState<StructureOption[]>([])
  const [campagneId, setCampagneId] = useState<number | null>(null)
  const [campagneLabel, setCampagneLabel] = useState('Collecte en cours')
  const [structureId, setStructureId] = useState<number | ''>('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [declarationId, setDeclarationId] = useState<number | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importReport, setImportReport] = useState<string | null>(null)
  const [online, setOnline] = useState(isOnline())
  const [queueCount, setQueueCount] = useState(loadOfflineQueue().length)
  const [packDate, setPackDate] = useState(loadOfflinePack()?.date_export ?? null)
  const [offlineBusy, setOfflineBusy] = useState(false)

  const progress = useCollectionProgress()
  const declarations = useDeclarations()

  const allFieldKeys = useMemo(
    () => fieldSections.flatMap((s) => s.fields.map((f) => f.key)),
    [fieldSections],
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [fields, structList, campagne] = await Promise.all([
          fetchCollecteFields(),
          fetchStructures(),
          fetchActiveCampagne(),
        ])
        if (cancelled) return
        setFieldSections([
          { title: 'Effectifs globaux', fields: fields.effectifs },
          { title: 'Professionnels de santé', fields: fields.professions },
          { title: 'Planification & postes', fields: fields.planification },
        ])
        setStructures(structList)
        setCampagneId(campagne.id)
        setCampagneLabel(campagne.libelle)
        const keys = [
          ...fields.effectifs,
          ...fields.professions,
          ...fields.planification,
        ].map((f) => f.key)
        setValues(emptyValues(keys))
        if (structList.length === 1) setStructureId(structList[0].id)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.')
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const update = () => setOnline(isOnline())
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    if (!structureId || !declarations.data?.length) return
    const existing = declarations.data.find((d) => d.structure.id === structureId)
    if (existing) {
      setDeclarationId(existing.id)
      setValues((v) => ({ ...v, ...declarationToValues(existing) }))
    }
  }, [structureId, declarations.data])

  const setField = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  const buildPayload = () => {
    const numeric: Record<string, number> = {}
    for (const key of allFieldKeys) {
      if (key === 'observations') continue
      numeric[key] = Number(values[key] || 0)
    }
    return {
      campagne_id: campagneId,
      structure_id: structureId,
      observations: values.observations ?? '',
      ...numeric,
    }
  }

  const handleSave = async () => {
    if (!campagneId || !structureId) {
      setError('Sélectionnez une structure.')
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const decl = await saveDeclaration(buildPayload())
      setDeclarationId(decl.id)
      setMessage('Brouillon enregistré en base de données.')
      declarations.reload()
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Enregistrement impossible.'
      if (!isOnline() || text.includes('joindre')) {
        enqueueOfflineDeclaration(buildPayload() as { structure_id: number } & Record<string, unknown>)
        setQueueCount(loadOfflineQueue().length)
        setMessage('Connexion indisponible — brouillon enregistré hors ligne. Il sera synchronisé à la reconnexion.')
        setError(null)
      } else {
        setError(text)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const decl = await saveDeclaration(buildPayload())
      const submitted = await submitDeclaration(decl.id)
      setDeclarationId(submitted.id)
      setMessage('Déclaration soumise pour validation.')
      declarations.reload()
      progress.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Soumission impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImport = async (file: File) => {
    setImporting(true)
    setImportReport(null)
    setError(null)
    try {
      const result = await importExcelFile(file)
      setImportReport(
        `${result.lignes_ok} ligne(s) importée(s), ${result.lignes_erreur} erreur(s).`,
      )
      if (result.rapport_erreurs?.length) {
        setImportReport(
          (prev) =>
            `${prev}\n${result.rapport_erreurs
              .slice(0, 5)
              .map((e) => `Ligne ${e.ligne}: ${e.erreur}`)
              .join('\n')}`,
        )
      }
      declarations.reload()
      progress.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import impossible.')
    } finally {
      setImporting(false)
    }
  }

  if (loadingMeta) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner className="h-8 w-8 text-health-green" label="Chargement du formulaire…" />
      </div>
    )
  }

  if (structures.length === 0) {
    return (
      <div>
        <PageHeader
          title="Collecte & saisie de données"
          description="Déclaration RHS par structure — saisie en ligne ou import Excel des fiches agents."
        />
        <EmptyState
          title="Aucune structure dans votre périmètre"
          description="Aucune structure sanitaire n'a été assignée à votre compte. Contactez l'administrateur système pour configurer votre périmètre d'accès."
          icon={CloudOff}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Collecte & saisie de données"
        description="Déclaration RHS par structure — saisie en ligne ou import Excel des fiches agents."
        actions={
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            online ? 'bg-health-green/10 text-health-green' : 'bg-amber-50 text-amber-800'
          }`}>
            <CloudOff className="h-3.5 w-3.5" />
            {online ? 'En ligne' : 'Hors ligne'}
            {queueCount > 0 ? ` · ${queueCount} en attente` : ''}
          </span>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-[#e8ecf0] pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-health-green/10 text-health-green'
                  : 'text-dark-text/60 hover:bg-light-gray'
              }`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {activeTab === 'form' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <form
            className="lg:col-span-2 space-y-6 rounded-xl border border-[#e8ecf0] bg-white p-6 shadow-sm"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-health-green">Période en cours</p>
                <h2 className="text-lg font-semibold text-institutional-blue">{campagneLabel}</h2>
              </div>
              {declarationId && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Brouillon #{declarationId}
                </span>
              )}
            </div>

            <p className="rounded-lg bg-light-gray/70 px-3 py-2 text-xs text-dark-text/65">
              Cette déclaration compte les <strong>effectifs agrégés</strong> (totaux).
              Elle ne crée pas de fiches nominatives. Pour voir des agents dans Personnel,
              ajoutez-les un par un ou importez un Excel (onglet Import Excel).
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium">Structure sanitaire *</label>
              <select
                value={structureId}
                onChange={(e) => setStructureId(Number(e.target.value) || '')}
                className="w-full rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
                required
              >
                <option value="">— Sélectionner —</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom} ({s.type_structure_label}) — {s.departement.nom}
                  </option>
                ))}
              </select>
            </div>

            {fieldSections.map((section) => (
              <fieldset key={section.title} className="space-y-4 border-t border-[#f0f2f5] pt-4">
                <legend className="text-sm font-semibold text-institutional-blue">{section.title}</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <div key={field.key}>
                      <label htmlFor={field.key} className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                        <span title="Effectif entier (nombre entier)">
                          <CircleHelp className="h-3.5 w-3.5 text-dark-text/30" aria-hidden="true" />
                        </span>
                      </label>
                      {field.key === 'observations' ? (
                        <textarea
                          id={field.key}
                          value={values.observations ?? ''}
                          onChange={(e) => setField('observations', e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
                        />
                      ) : (
                        <input
                          id={field.key}
                          type="number"
                          min={0}
                          value={values[field.key] ?? '0'}
                          onChange={(e) => setField(field.key, e.target.value)}
                          className="w-full rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}

            <div>
              <label htmlFor="observations" className="mb-1 block text-sm font-medium">
                Observations / commentaires DRH
              </label>
              <textarea
                id="observations"
                value={values.observations ?? ''}
                onChange={(e) => setField('observations', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
                placeholder="Précisions sur la situation RH, difficultés de recrutement, etc."
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={saving || submitting}
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg border border-[#e8ecf0] px-4 py-2 text-sm font-medium hover:bg-light-gray disabled:opacity-60"
              >
                {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                Enregistrer brouillon
              </button>
              <button
                type="button"
                disabled={saving || submitting}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d6b45] disabled:opacity-60"
              >
                {submitting ? <Spinner className="h-4 w-4" /> : null}
                Soumettre pour validation
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-institutional-blue">Avancement par département</h3>
              {progress.loading ? (
                <div className="mt-4 flex justify-center py-6">
                  <Spinner className="h-5 w-5 text-health-green" />
                </div>
              ) : (
                <ul className="mt-4 max-h-96 space-y-3 overflow-y-auto">
                  {(progress.data?.progress ?? []).map((d) => (
                    <li key={d.departement.code}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{d.departement.nom}</span>
                        <span className={d.taux_reponse < 60 ? 'font-medium text-red-500' : ''}>
                          {d.taux_reponse}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#e8ecf0]">
                        <div
                          className={`h-full rounded-full ${d.taux_reponse < 60 ? 'bg-red-400' : 'bg-health-green'}`}
                          style={{ width: `${d.taux_reponse}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'history' && (
        <StatsState loading={declarations.loading} error={declarations.error} onRetry={declarations.reload}>
          <div className="overflow-x-auto rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e8ecf0] bg-light-gray/50 text-xs uppercase text-dark-text/50">
                  <th className="px-4 py-3 font-medium">Structure</th>
                  <th className="px-4 py-3 font-medium">Période</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Effectif</th>
                </tr>
              </thead>
              <tbody>
                {(declarations.data ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-[#f0f2f5]">
                    <td className="px-4 py-3">{row.structure.nom}</td>
                    <td className="px-4 py-3">{row.campagne.libelle}</td>
                    <td className="px-4 py-3">{row.statut_label}</td>
                    <td className="px-4 py-3">{row.effectif_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StatsState>
      )}

      {activeTab === 'calendar' && (
        <div className="rounded-xl border border-[#e8ecf0] bg-white p-6 shadow-sm">
          <p className="text-sm text-dark-text/60">
            Campagne active : <strong>{campagneLabel}</strong>. Les échéances et rappels automatiques seront configurés par la coordination ORHS.
          </p>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="mx-auto max-w-xl rounded-xl border-2 border-dashed border-[#dde3ea] bg-white p-10 text-center">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-health-green" />
          <h2 className="mt-4 text-lg font-semibold text-institutional-blue">Import Excel — fiches agents</h2>
          <p className="mt-2 text-sm text-dark-text/60">
            Une ligne = un agent (matricule, identité, profession, diplômes, affectation…). Les totaux de la déclaration structure sont recalculés automatiquement.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => downloadExcelTemplate()}
              className="rounded-lg border border-[#e8ecf0] px-4 py-2 text-sm font-medium hover:bg-light-gray"
            >
              Télécharger le modèle
            </button>
            <label className="cursor-pointer rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d6b45]">
              {importing ? 'Import…' : 'Choisir un fichier'}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleImport(f)
                }}
              />
            </label>
          </div>
          {importing && (
            <div className="mt-4 flex justify-center">
              <Spinner className="h-6 w-6 text-health-green" label="Import en cours…" />
            </div>
          )}
          {importReport && (
            <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-light-gray/60 p-4 text-left text-xs text-dark-text/70">
              {importReport}
            </pre>
          )}
        </div>
      )}

      {activeTab === 'offline' && (
        <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-[#e8ecf0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-institutional-blue">Collecte hors ligne</h2>
          <p className="text-sm text-dark-text/60">
            Téléchargez un pack (structures, déclarations, agents du périmètre) pour travailler sans réseau.
            Les brouillons non synchronisés restent dans ce navigateur jusqu&apos;à la reconnexion.
          </p>
          <p className="text-sm text-dark-text/70">
            Pack local : {packDate ? new Date(packDate).toLocaleString('fr-FR') : 'aucun'}
            {' · '}
            File d&apos;attente : {queueCount} déclaration(s)
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={offlineBusy || !online}
              onClick={async () => {
                setOfflineBusy(true)
                setError(null)
                try {
                  const pack = await fetchOfflinePack()
                  saveOfflinePack(pack)
                  setPackDate(pack.date_export)
                  setMessage(`Pack hors ligne enregistré (${pack.structures.length} structure(s), ${pack.declarations.length} déclaration(s)).`)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Téléchargement du pack impossible.')
                } finally {
                  setOfflineBusy(false)
                }
              }}
              className="rounded-lg bg-institutional-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {offlineBusy ? 'Traitement…' : 'Télécharger le pack'}
            </button>
            <button
              type="button"
              disabled={offlineBusy || !online || queueCount === 0}
              onClick={async () => {
                setOfflineBusy(true)
                setError(null)
                try {
                  const result = await syncOfflineQueue()
                  setQueueCount(loadOfflineQueue().length)
                  setMessage(
                    `Synchronisation : ${result.sent} envoyée(s), ${result.errors} erreur(s), ${result.conflicts} conflit(s).`,
                  )
                  declarations.reload()
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Synchronisation impossible.')
                } finally {
                  setOfflineBusy(false)
                }
              }}
              className="rounded-lg border border-[#dde3ea] px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Synchroniser la file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
