import { Lock, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SecureAccessSection() {
  return (
    <section className="bg-institutional-blue py-12 sm:py-14">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <div className="flex max-w-xl items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-gold-accent">
            <Shield className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Espace sécurisé
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Accès réservé aux utilisateurs autorisés du Ministère de la Santé
              et des partenaires institutionnels.
            </p>
          </div>
        </div>
        <Link
          to="/espace-prive"
          className="inline-flex shrink-0 items-center gap-2 rounded bg-health-green px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0d6b45]"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          Accéder à l&apos;espace privé
        </Link>
      </div>
    </section>
  )
}
