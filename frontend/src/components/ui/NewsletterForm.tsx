import { useState } from 'react'
import { Mail, Rss } from 'lucide-react'
import { apiUrl } from '../../lib/api'

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <p className="rounded-lg bg-health-green/10 px-4 py-3 text-sm text-health-green">
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
          className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
        />
      </div>
      <button
        type="submit"
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-health-green font-semibold text-white transition-colors hover:bg-[#0d6b45] ${compact ? 'px-4 py-2.5 text-sm' : 'w-full py-3 text-sm'}`}
      >
        <Mail className="h-4 w-4" />
        S&apos;abonner
      </button>
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
