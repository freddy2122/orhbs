import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageBanner } from '../components/ui/PageBanner'
import { confirmNewsletterUnsubscribe, fetchNewsletterUnsubscribe } from '../lib/editorial-api'

export function NewsletterUnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [email, setEmail] = useState<string | null>(null)
  const [actif, setActif] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Lien de désabonnement manquant.')
      return
    }
    fetchNewsletterUnsubscribe(token)
      .then((data) => {
        setEmail(data.email)
        setActif(data.actif)
        if (!data.actif) setDone(true)
      })
      .catch((err: Error) => setError(err.message))
  }, [token])

  const handleConfirm = async () => {
    setSaving(true)
    setError(null)
    try {
      await confirmNewsletterUnsubscribe(token)
      setDone(true)
      setActif(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Désabonnement impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main>
      <PageBanner label="Newsletter" title="Désabonnement" />
      <section className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-[#e8ecf0] bg-light-gray/30 p-6">
          {error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : done ? (
            <p className="text-sm text-health-green">
              {email ? `${email} ` : ''}n&apos;est plus abonné à la newsletter ORHS Bénin.
            </p>
          ) : (
            <>
              <p className="text-sm text-dark-text/70">
                Confirmer le désabonnement{email ? ` de ${email}` : ''} ?
              </p>
              <button
                type="button"
                disabled={saving || !actif}
                onClick={() => void handleConfirm()}
                className="mt-4 w-full rounded-lg bg-health-green py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Se désabonner'}
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
