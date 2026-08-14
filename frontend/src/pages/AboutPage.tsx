import { Target, Eye, Users, Building2 } from 'lucide-react'
import { GALLERY_ITEMS, ORG_CHART } from '../constants/contentData'
import { OrgChart } from '../components/ui/OrgChart'
import { PageBanner } from '../components/ui/PageBanner'
import { MISSION_CARDS } from '../constants/home'

const VALUES = [
  {
    icon: Target,
    title: 'Mission',
    text: "Observer, analyser et valoriser les ressources humaines en santé pour renforcer le système de santé béninois.",
  },
  {
    icon: Eye,
    title: 'Vision',
    text: "Devenir la référence nationale en matière d'information et d'analyse sur les ressources humaines en santé.",
  },
  {
    icon: Users,
    title: 'Approche',
    text: "Une démarche participative impliquant les acteurs du secteur public, privé et les partenaires techniques.",
  },
  {
    icon: Building2,
    title: 'Tutelle',
    text: "L'ORHS Bénin est placé sous la tutelle du Ministère de la Santé de la République du Bénin.",
  },
]

export function AboutPage() {
  return (
    <main>
      <PageBanner
        label="L'observatoire"
        title="À propos de l'ORHS Bénin"
        description="L'Observatoire des Ressources Humaines en Santé du Bénin est une plateforme nationale dédiée à la production et à la diffusion de données agrégées sur les professionnels de santé."
      />

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((item) => {
              const Icon = item.icon
              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-[#e8ecf0] p-6"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-health-green/10 text-health-green">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-base font-semibold text-institutional-blue">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-dark-text/70">
                    {item.text}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-surface-muted py-14 sm:py-16" id="missions">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-8 text-2xl font-semibold text-institutional-blue">
            Nos missions
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {MISSION_CARDS.map((card) => {
              const Icon = card.icon
              return (
                <article
                  key={card.id}
                  className="flex gap-4 rounded-lg border border-[#e8ecf0] bg-white p-6"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-institutional-blue/10 text-institutional-blue">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-institutional-blue">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-dark-text/70">
                      {card.description}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-8 text-2xl font-semibold text-institutional-blue">Organigramme</h2>
          <OrgChart data={ORG_CHART} />
        </div>
      </section>

      <section className="bg-surface-muted py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-8 text-2xl font-semibold text-institutional-blue">Galerie photos</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {GALLERY_ITEMS.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-lg border border-[#e8ecf0] bg-white">
                <img src={item.src} alt={item.title} className="aspect-video w-full object-cover" />
                <figcaption className="p-3 text-sm font-medium text-institutional-blue">{item.title}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
