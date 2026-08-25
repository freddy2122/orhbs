import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { NewsletterPanel } from './NewsletterPanel'
import {
  createCmsAnnuaire,
  createCmsContenu,
  fetchCmsAnnuaire,
  fetchCmsContenus,
  updateCmsAnnuaire,
  updateCmsContenu,
  type ContenuEditorial,
  type EditorialType,
  type InscriptionOrdre,
} from '../../lib/editorial-api'

type CmsTab = EditorialType | 'annuaire' | 'newsletter'

const EDITORIAL_TABS: { id: CmsTab; label: string }[] = [
  { id: 'actualite', label: 'Actualités' },
  { id: 'evenement', label: 'Agenda' },
  { id: 'opportunite', label: 'Opportunités' },
  { id: 'faq', label: 'FAQ' },
  { id: 'texte_legal', label: 'Textes juridiques' },
  { id: 'formation', label: 'Formations' },
  { id: 'annuaire', label: 'Annuaire Ordres' },
  { id: 'newsletter', label: 'Newsletter' },
]

const emptyEditorial = {
  titre: '',
  resume: '',
  contenu: '',
  categorie: '',
  lieu: '',
  organisation: '',
  date_debut: '',
  date_fin: '',
  annee: String(new Date().getFullYear()),
  publie: true,
}

export function EditorialCmsPanel() {
  const [tab, setTab] = useState<CmsTab>('actualite')
  const [items, setItems] = useState<ContenuEditorial[]>([])
  const [annuaire, setAnnuaire] = useState<InscriptionOrdre[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState(emptyEditorial)
  const [ordreForm, setOrdreForm] = useState({
    type_entree: 'medecin',
    nom: '',
    numero_inscription: '',
    specialite: '',
    departement: '',
    commune: '',
    statut: 'inscrit',
    publie: true,
  })

  const load = () => {
    if (tab === 'newsletter') {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    if (tab === 'annuaire') {
      fetchCmsAnnuaire()
        .then(setAnnuaire)
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false))
      return
    }
    fetchCmsContenus(tab)
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      if (tab === 'annuaire') {
        await createCmsAnnuaire(ordreForm)
        setOrdreForm({
          type_entree: 'medecin',
          nom: '',
          numero_inscription: '',
          specialite: '',
          departement: '',
          commune: '',
          statut: 'inscrit',
          publie: true,
        })
        setMessage('Inscription enregistrée.')
      } else {
        await createCmsContenu({
          type_contenu: tab,
          titre: form.titre,
          resume: form.resume,
          contenu: form.contenu,
          categorie: form.categorie,
          lieu: form.lieu,
          organisation: form.organisation,
          date_debut: form.date_debut || null,
          date_fin: form.date_fin || null,
          annee: form.annee ? Number(form.annee) : null,
          publie: form.publie,
        })
        setForm(emptyEditorial)
        setMessage('Contenu enregistré.')
      }
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {EDITORIAL_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setTab(item.id); setMessage(null); setError(null) }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === item.id ? 'bg-health-green text-white' : 'bg-light-gray text-dark-text/70'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'newsletter' ? (
        <NewsletterPanel />
      ) : (
      <form onSubmit={handleCreate} className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        {tab === 'annuaire' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={ordreForm.type_entree}
              onChange={(e) => setOrdreForm((f) => ({ ...f, type_entree: e.target.value }))}
              className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
            >
              <option value="medecin">Médecin</option>
              <option value="clinique">Clinique</option>
            </select>
            <select
              value={ordreForm.statut}
              onChange={(e) => setOrdreForm((f) => ({ ...f, statut: e.target.value }))}
              className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
            >
              <option value="inscrit">Inscrit</option>
              <option value="suspendu">Suspendu</option>
              <option value="radie">Radié</option>
            </select>
            <input required value={ordreForm.nom} onChange={(e) => setOrdreForm((f) => ({ ...f, nom: e.target.value }))} placeholder="Nom" className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm sm:col-span-2" />
            <input value={ordreForm.numero_inscription} onChange={(e) => setOrdreForm((f) => ({ ...f, numero_inscription: e.target.value }))} placeholder="N° d'inscription" className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm" />
            <input value={ordreForm.specialite} onChange={(e) => setOrdreForm((f) => ({ ...f, specialite: e.target.value }))} placeholder="Spécialité" className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm" />
            <input value={ordreForm.departement} onChange={(e) => setOrdreForm((f) => ({ ...f, departement: e.target.value }))} placeholder="Département" className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm" />
            <input value={ordreForm.commune} onChange={(e) => setOrdreForm((f) => ({ ...f, commune: e.target.value }))} placeholder="Commune" className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <input required value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} placeholder={tab === 'faq' ? 'Question' : 'Titre'} className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm sm:col-span-2" />
            <input value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))} placeholder="Catégorie / type" className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm" />
            <input value={form.organisation} onChange={(e) => setForm((f) => ({ ...f, organisation: e.target.value }))} placeholder="Organisation" className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm" />
            <input value={form.lieu} onChange={(e) => setForm((f) => ({ ...f, lieu: e.target.value }))} placeholder="Lieu" className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm" />
            <input type="number" value={form.annee} onChange={(e) => setForm((f) => ({ ...f, annee: e.target.value }))} placeholder="Année" className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm" />
            <input type="date" value={form.date_debut} onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))} className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm" />
            <input type="date" value={form.date_fin} onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))} className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm" />
            <textarea value={form.resume} onChange={(e) => setForm((f) => ({ ...f, resume: e.target.value }))} placeholder={tab === 'faq' ? 'Réponse courte' : 'Résumé'} rows={2} className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm sm:col-span-2" />
            <textarea value={form.contenu} onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))} placeholder={tab === 'faq' ? 'Réponse complète' : 'Contenu'} rows={4} className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm sm:col-span-2" />
          </div>
        )}
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tab === 'annuaire' ? ordreForm.publie : form.publie}
            onChange={(e) => {
              if (tab === 'annuaire') setOrdreForm((f) => ({ ...f, publie: e.target.checked }))
              else setForm((f) => ({ ...f, publie: e.target.checked }))
            }}
          />
          Publier sur le site public
        </label>
        <button type="submit" disabled={saving} className="mt-4 rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {message && <p className="mt-2 text-sm text-health-green">{message}</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>
      )}

      {tab !== 'newsletter' && (loading ? (
        <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-health-green" /></div>
      ) : tab === 'annuaire' ? (
        annuaire.length === 0 ? (
          <EmptyState title="Aucun inscrit" description="Ajoutez une inscription d'ordre professionnel pour l'afficher dans l'annuaire public." icon={FileText} />
        ) : (
          <ul className="divide-y divide-[#e8ecf0] rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
            {annuaire.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium text-institutional-blue">{item.nom}</p>
                  <p className="text-xs text-dark-text/50">{item.type_entree_label} · {item.statut_label} · {item.departement || '—'}</p>
                </div>
                <button type="button" onClick={() => updateCmsAnnuaire(item.id, { publie: !item.publie }).then(load)} className="text-xs font-medium text-health-green hover:underline">
                  {item.publie ? 'Dépublier' : 'Publier'}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : items.length === 0 ? (
        <EmptyState title="Aucun contenu" description="Créez une entrée pour l'afficher sur le site public." icon={FileText} />
      ) : (
        <ul className="divide-y divide-[#e8ecf0] rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium text-institutional-blue">{item.titre}</p>
                <p className="text-xs text-dark-text/50">{item.categorie || item.type_contenu_label} · {item.publie ? 'Publié' : 'Brouillon'}</p>
              </div>
              <button type="button" onClick={() => updateCmsContenu(item.id, { publie: !item.publie }).then(load)} className="text-xs font-medium text-health-green hover:underline">
                {item.publie ? 'Dépublier' : 'Publier'}
              </button>
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}
