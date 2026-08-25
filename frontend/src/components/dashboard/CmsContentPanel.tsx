import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import {
  createCmsPublication,
  fetchCmsPublications,
  updateCmsPublication,
  uploadCmsPublicationPdf,
  type PublicPublication,
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
  const [items, setItems] = useState<PublicPublication[]>([])
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
    publie: true,
  })

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
        publie: form.publie,
      })
      setForm({
        titre: '',
        type_publication: 'rapport_annuel',
        resume: '',
        annee: String(new Date().getFullYear()),
        mot_cles: '',
        publie: true,
      })
      setMessage('Publication enregistrée.')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (item: PublicPublication) => {
    try {
      await updateCmsPublication(item.id, { publie: !item.publie })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.')
    }
  }

  const handleUpload = async (item: PublicPublication, file: File | undefined) => {
    if (!file) return
    try {
      await uploadCmsPublicationPdf(item.id, file)
      setMessage(`PDF joint à « ${item.titre} ».`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload PDF impossible.')
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-institutional-blue">Nouvelle publication</h3>
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
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.publie}
            onChange={(e) => setForm((f) => ({ ...f, publie: e.target.checked }))}
          />
          Publier immédiatement sur le site public
        </label>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
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
            <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium text-institutional-blue">{item.titre}</p>
                <p className="text-xs text-dark-text/50">
                  {item.type_publication_label} · {item.annee ?? '—'} · {item.publie ? 'Publié' : 'Brouillon'}
                  {item.fichier_url ? ' · PDF joint' : ' · sans PDF'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-xs font-medium text-institutional-blue hover:underline">
                  {item.fichier_url ? 'Remplacer le PDF' : 'Joindre un PDF'}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleUpload(item, e.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => togglePublish(item)}
                  className="text-xs font-medium text-health-green hover:underline"
                >
                  {item.publie ? 'Dépublier' : 'Publier'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
