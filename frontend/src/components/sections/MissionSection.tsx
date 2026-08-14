import { MISSION_CARDS } from '../../constants/home'
import { SectionHeader } from '../ui/SectionHeader'

export function MissionSection() {
  return (
    <section className="bg-white py-14 sm:py-16 lg:py-20" id="missions">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          label="Notre mission"
          title="Mission de l'ORHS Bénin"
          description="L'Observatoire des Ressources Humaines en Santé accompagne le Ministère de la Santé dans la production, l'analyse et la diffusion de données agrégées sur les professionnels de santé."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MISSION_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <article
                key={card.id}
                className="group rounded-lg border border-[#e8ecf0] bg-light-gray/50 p-6 transition-all duration-200 hover:border-health-green/30 hover:bg-white hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-health-green/10 text-health-green transition-colors group-hover:bg-health-green group-hover:text-white">
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-institutional-blue">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-dark-text/70">
                  {card.description}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
