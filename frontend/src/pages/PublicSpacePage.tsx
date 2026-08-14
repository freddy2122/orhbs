import { Link } from 'react-router-dom'
import { ArrowRight, Globe, Shield } from 'lucide-react'
import { PageBanner } from '../components/ui/PageBanner'
import { PUBLIC_MODULES } from '../constants/publicSpace'
import { PUBLIC_DATA_NOTICE } from '../lib/security'

export function PublicSpacePage() {
  return (
    <main>
      <PageBanner
        label="Accès libre"
        title="Espace Grand Public"
        description="Vitrine transparente de l'ORHS Bénin — citoyens, chercheurs, journalistes et étudiants. Informations officielles sans données nominatives ni confidentielles."
      />

      <section className="border-b border-[#e8ecf0] bg-health-green/5 py-4">
        <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 sm:px-6">
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-health-green" />
          <div className="text-sm text-dark-text/75">
            <p className="font-semibold text-institutional-blue">Transparence et protection</p>
            <p className="mt-1">{PUBLIC_DATA_NOTICE}</p>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {PUBLIC_MODULES.map((mod) => {
              const Icon = mod.icon
              return (
                <article
                  key={mod.id}
                  className="group flex flex-col rounded-xl border border-[#e8ecf0] bg-white p-6 shadow-sm transition-all hover:border-health-green/30 hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-health-green/10 text-health-green">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-lg font-semibold text-institutional-blue">{mod.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-dark-text/65">{mod.description}</p>
                  <p className="mt-3 rounded-lg bg-light-gray/50 px-3 py-2 text-xs text-dark-text/55">
                    <span className="font-medium text-health-green">Utilité : </span>
                    {mod.utility}
                  </p>
                  <Link
                    to={mod.href}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-health-green transition-colors group-hover:gap-2.5"
                  >
                    Accéder <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-[#e8ecf0] bg-institutional-blue py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <Shield className="mx-auto h-8 w-8 text-gold-accent" />
          <h2 className="mt-4 text-xl font-semibold text-white">Besoin de données détaillées ?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
            Les données nominatives et les analyses approfondies sont accessibles via l&apos;espace sécurisé, sur demande et après validation.
          </p>
          <Link
            to="/demande-acces"
            className="mt-6 inline-flex rounded-lg bg-gold-accent px-6 py-2.5 text-sm font-semibold text-institutional-blue hover:bg-[#c49430]"
          >
            Demander un accès
          </Link>
        </div>
      </section>
    </main>
  )
}
