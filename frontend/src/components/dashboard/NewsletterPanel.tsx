import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import {
  createNewsletterCampaign,
  createNewsletterSubscriber,
  fetchNewsletterCampaigns,
  fetchNewsletterSubscribers,
  sendNewsletterCampaign,
  updateNewsletterSubscriber,
  type NewsletterCampaign,
  type NewsletterSubscriber,
} from '../../lib/editorial-api'

export function NewsletterPanel() {
  const [abonnes, setAbonnes] = useState<NewsletterSubscriber[]>([])
  const [campagnes, setCampagnes] = useState<NewsletterCampaign[]>([])
  const [stats, setStats] = useState({ total: 0, actifs: 0, inactifs: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [sujet, setSujet] = useState('')
  const [corps, setCorps] = useState('')

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([fetchNewsletterSubscribers(), fetchNewsletterCampaigns()])
      .then(([subs, camps]) => {
        setAbonnes(subs.abonnes)
        setStats(subs.stats)
        setCampagnes(camps)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await createNewsletterSubscriber(email)
      setEmail('')
      setMessage('Abonné enregistré. Un e-mail de bienvenue est écrit dans le terminal Django (aucun SMTP en local).')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajout impossible.')
    } finally {
      setSaving(false)
    }
  }

  const handleCampaign = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const campagne = await createNewsletterCampaign(sujet, corps)
      const result = await sendNewsletterCampaign(campagne.id)
      setSujet('')
      setCorps('')
      setMessage(
        `Campagne envoyée : ${result.envoi.sent} message(s), ${result.envoi.errors} erreur(s). Consultez le terminal Django pour le contenu.`,
      )
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-institutional-blue">
        Architecture prête, sans serveur SMTP. En local, Django affiche les e-mails dans le terminal
        (console). Branchez un SMTP réel plus tard via <code>EMAIL_HOST</code>.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Abonnés', value: stats.total },
          { label: 'Actifs', value: stats.actifs },
          { label: 'Désinscrits', value: stats.inactifs },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-dark-text/50">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-institutional-blue">{item.value}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-institutional-blue">Ajouter un abonné</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemple.bj"
            className="min-w-[220px] flex-1 rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      </form>

      <form onSubmit={handleCampaign} className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-institutional-blue">Nouvelle campagne</h3>
        <input
          required
          value={sujet}
          onChange={(e) => setSujet(e.target.value)}
          placeholder="Sujet"
          className="mt-3 w-full rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
        />
        <textarea
          required
          value={corps}
          onChange={(e) => setCorps(e.target.value)}
          placeholder="Corps du message (texte). Un lien de désabonnement est ajouté automatiquement."
          rows={5}
          className="mt-2 w-full rounded-lg border border-[#dde3ea] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving || stats.actifs === 0}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-institutional-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          {saving ? 'Envoi…' : 'Créer et envoyer aux abonnés actifs'}
        </button>
      </form>

      {message && <p className="text-sm text-health-green">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6 text-health-green" />
        </div>
      ) : (
        <>
          <section>
            <h3 className="mb-2 text-sm font-semibold text-institutional-blue">Abonnés</h3>
            {abonnes.length === 0 ? (
              <EmptyState
                title="Aucun abonné"
                description="Les inscriptions du site public apparaîtront ici. Vous pouvez aussi en ajouter manuellement."
                icon={Mail}
              />
            ) : (
              <ul className="divide-y divide-[#e8ecf0] rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
                {abonnes.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="font-medium text-institutional-blue">{item.email}</p>
                      <p className="text-xs text-dark-text/50">
                        {item.source_label} · {item.actif ? 'Actif' : 'Désinscrit'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateNewsletterSubscriber(item.id, !item.actif).then(load)}
                      className="text-xs font-medium text-health-green hover:underline"
                    >
                      {item.actif ? 'Désinscrire' : 'Réactiver'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {campagnes.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-institutional-blue">Campagnes</h3>
              <ul className="divide-y divide-[#e8ecf0] rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
                {campagnes.map((item) => (
                  <li key={item.id} className="px-4 py-3">
                    <p className="font-medium text-institutional-blue">{item.sujet}</p>
                    <p className="text-xs text-dark-text/50">
                      {item.statut_label} · {item.envoyes}/{item.destinataires_prevus} envoyés
                      {item.erreurs ? ` · ${item.erreurs} erreur(s)` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
