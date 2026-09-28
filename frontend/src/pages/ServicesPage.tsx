import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Handshake } from 'lucide-react'
import { PageBanner } from '../components/ui/PageBanner'
import { LOGOS } from '../constants/institutional'
import { SERVICE_OFFERS } from '../constants/services'

export function ServicesPage() {
  return (
    <main>
      <PageBanner
        label="Partenariats"
        title="Offres de services"
        description="Ce que l'ORHS Bénin met à disposition des partenaires techniques et financiers, à partir des données réelles et validées collectées sur le terrain."
      />

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Handshake className="mx-auto h-10 w-10 text-health-green" strokeWidth={1.5} />
          <p className="mt-4 text-base leading-relaxed text-dark-text/70">
            L&apos;ORHS Bénin observe, valide et consolide les données sur les ressources humaines en
            santé à l&apos;échelle nationale. Ces données servent de socle à quatre offres concrètes
            pour les institutions et partenaires qui investissent dans le renforcement du système de
            santé béninois.
          </p>
        </div>
      </section>

      <section className="border-t border-[#e8ecf0] bg-surface-muted py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-6">
            {SERVICE_OFFERS.map((offer) => {
              const Icon = offer.icon
              return (
                <article
                  key={offer.id}
                  id={offer.id}
                  className="grid gap-6 rounded-xl border border-[#e8ecf0] bg-white p-7 shadow-sm sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
                >
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-health-green/10 text-health-green">
                      <Icon className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-institutional-blue">{offer.title}</h2>
                    <p className="mt-1 text-sm font-medium text-health-green">{offer.tagline}</p>
                    <p className="mt-3 text-sm leading-relaxed text-dark-text/70">{offer.description}</p>
                    <p className="mt-4 inline-flex rounded-lg bg-light-gray/60 px-3 py-2 text-xs text-dark-text/60">
                      <span className="font-medium text-institutional-blue">Pour&nbsp;: </span>
                      <span className="ml-1">{offer.audience}</span>
                    </p>
                  </div>

                  <div className="border-t border-[#e8ecf0] pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-dark-text/50">
                      Ce que nous produisons
                    </p>
                    <ul className="mt-3 space-y-2.5">
                      {offer.deliverables.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-dark-text/75">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-health-green" strokeWidth={1.75} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-[#e8ecf0] bg-institutional-blue py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <img
            src={LOGOS.ministereSante}
            alt=""
            className="mx-auto h-14 w-auto object-contain brightness-0 invert"
          />
          <h2 className="mt-4 text-xl font-semibold text-white">Devenir partenaire</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
            Pour toute demande sur l&apos;une de ces offres — plan RH, cartographie, plaidoyer ou
            valorisation d&apos;archives — contactez le secrétariat permanent de l&apos;ORHS Bénin.
          </p>
          <Link
            to="/contact"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gold-accent px-6 py-2.5 text-sm font-semibold text-institutional-blue hover:bg-[#c49430]"
          >
            Nous contacter <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
