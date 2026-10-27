import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { ContentPreview } from './ContentPreview'
import { WorkflowBadge, WorkflowControls, WorkflowTrail } from './WorkflowControls'
import type { WorkflowAction } from '../../lib/editorial-workflow'
import {
  createCmsPublication,
  deleteCmsPublication,
  fetchCmsPublications,
  uploadCmsPublicationImage,
  uploadCmsPublicationPdf,
  workflowCmsPublication,
  type CmsPublication,
} from '../../lib/public-api'

const TYPE_OPTIONS = [
  { value: 'rapport_annuel', label: 'Rapport annuel' },
  { value: 'annuaire', label: 'Annuaire statistique' },
  { value: 'pdrhs', label: 'Plan stratégique (PDRHS)' },
  { value: 'note', label: 'Note de politique' },
  { value: 'bulletin', label: 'Bulletin trimestriel' },
  { value: 'etude', label: 'Étude thématique' },
  { value: 'communique', label: 'Communiqué' },
  { value: 'autre', label: 'Autre' },
]

export function CmsContentPanel() {
  const [items, setItems] = useState<CmsPublication[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    titre: '',
    type_publication: 'rapport_annuel',
    resume: '',
    annee: String(new Date().getFullYear()),
    mot_cles: '',
  })
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    fetchCmsPublications()
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await createCmsPublication({
        titre: form.titre,
        type_publication: form.type_publication,
        resume: form.resume,
        annee: form.annee ? Number(form.annee) : null,
        mot_cles: form.mot_cles,
      })
      setForm({
        titre: '',
        type_publication: 'rapport_annuel',
        resume: '',
        annee: String(new Date().getFullYear()),
        mot_cles: '',
      })
      setMessage('Brouillon enregistré. Ajoutez un fichier ou une image, puis soumettez-le à relecture.')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (item: CmsPublication, action: WorkflowAction, motif?: string) => {
    setBusyId(item.id)
    setError(null)
    setMessage(null)
    try {
      await workflowCmsPublication(item.id, action, motif)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (item: CmsPublication) => {
    try {
      await deleteCmsPublication(item.id)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  const handleUpload = async (item: CmsPublication, file: File | undefined) => {
    if (!file) return
    try {
      await uploadCmsPublicationPdf(item.id, file)
      setMessage(`PDF joint à « ${item.titre} ».`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload PDF impossible.')
    }
  }

  const handleImageUpload = async (item: CmsPublication, file: File | undefined) => {
    if (!file) return
    try {
      await uploadCmsPublicationImage(item.id, file)
      setMessage(`Image de couverture ajoutée à « ${item.titre} ».`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload image impossible.')
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-institutional-black">Nouvelle publication</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            value={form.titre}
            onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
            placeholder="Titre"
            className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            value={form.type_publication}
            onChange={(e) => setForm((f) => ({ ...f, type_publication: e.target.value }))}
            className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="number"
            value={form.annee}
            onChange={(e) => setForm((f) => ({ ...f, annee: e.target.value }))}
            placeholder="Année"
            className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
          />
          <input
            value={form.mot_cles}
            onChange={(e) => setForm((f) => ({ ...f, mot_cles: e.target.value }))}
            placeholder="Mots-clés (séparés par des virgules)"
            className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            value={form.resume}
            onChange={(e) => setForm((f) => ({ ...f, resume: e.target.value }))}
            placeholder="Résumé"
            rows={3}
            className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm sm:col-span-2"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}
        </button>
        {message && <p className="mt-2 text-sm text-health-green">{message}</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6 text-health-green" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune publication"
          description="Créez une publication pour l’afficher sur le catalogue public."
          icon={FileText}
        />
      ) : (
        <ul className="divide-y divide-[#e8ecf0] rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="h-12 w-16 shrink-0 rounded object-cover" />
                ) : (
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-light-gray text-[10px] text-dark-text/40">
                    Sans image
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-institutional-black">{item.titre}</p>
                    <WorkflowBadge item={item} />
                  </div>
                  <p className="text-xs text-dark-text/50">
                    {item.type_publication_label} · {item.annee ?? '—'}
                    {item.fichier_url ? ' · PDF joint' : ' · sans PDF'}
                  </p>
                  <WorkflowTrail item={item} />
                  <div className="mt-2">
                    <ContentPreview
                      defaultOpen={false}
                      preview={{
                        titre: item.titre,
                        resume: item.resume,
                        contenu: item.contenu,
                        image_url: item.image_url,
                        meta: [item.type_publication_label, String(item.annee ?? '—'), item.auteur_full].filter(Boolean),
                        keywords: item.mot_cles ? item.mot_cles.split(',').map((k) => k.trim()).filter(Boolean) : [],
                        pdf: item.fichier_url
                          ? { path: `/api/cms/publications/${item.id}/download/`, filename: `${item.slug}.pdf` }
                          : null,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                {item.actions_disponibles.includes('edit') && (
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer text-xs font-medium text-institutional-black hover:underline">
                      {item.image_url ? 'Remplacer l’image' : 'Ajouter une image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(item, e.target.files?.[0])}
                      />
                    </label>
                    <label className="cursor-pointer text-xs font-medium text-institutional-black hover:underline">
                      {item.fichier_url ? 'Remplacer le PDF' : 'Joindre un PDF'}
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => handleUpload(item, e.target.files?.[0])}
                      />
                    </label>
                  </div>
                )}
                <WorkflowControls
                  item={item}
                  busy={busyId === item.id}
                  onAction={(action, motif) => handleAction(item, action, motif)}
                  onDelete={() => handleDelete(item)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
