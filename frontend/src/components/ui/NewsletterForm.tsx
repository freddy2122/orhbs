import { useState } from 'react'
import { Mail, Rss } from 'lucide-react'
import { apiUrl } from '../../lib/api'
import { subscribeNewsletter } from '../../lib/editorial-api'

export function NewsletterForm({
  compact = false,
  variant = 'light',
}: {
  compact?: boolean
  variant?: 'light' | 'dark'
}) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await subscribeNewsletter(email)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible.')
    } finally {
      setSaving(false)
    }
  }

  const isDark = variant === 'dark'

  if (submitted) {
    return (
      <p className={`rounded-lg px-4 py-3 text-sm ${isDark ? 'bg-white/10 text-health-green' : 'bg-health-green/10 text-health-green'}`}>
        Inscription enregistrée. Vous recevrez les publications et actualités par e-mail.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'flex gap-2' : 'space-y-3'}>
      <div className={compact ? 'flex-1' : ''}>
        <label htmlFor="newsletter-email" className="sr-only">E-mail</label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Votre adresse e-mail"
          className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15 ${
            isDark
              ? 'border-white/20 bg-white/10 text-white placeholder:text-white/45'
              : 'border-[#dde3ea] bg-white'
          }`}
        />
      </div>
      <button
        type="submit"
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-health-green font-semibold text-white transition-colors hover:bg-[#0d6b45] disabled:opacity-50 ${compact ? 'px-4 py-2.5 text-sm' : 'w-full py-3 text-sm'}`}
        disabled={saving}
      >
        <Mail className="h-4 w-4" />
        S&apos;abonner
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  )
}

export function RssLink() {
  return (
    <a
      href={apiUrl('/api/publications/rss.xml')}
      className="inline-flex items-center gap-2 text-sm font-medium text-health-green hover:underline"
    >
      <Rss className="h-4 w-4" />
      Flux RSS des publications
    </a>
  )
}
