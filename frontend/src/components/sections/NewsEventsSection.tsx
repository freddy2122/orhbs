import { ArrowRight, Newspaper } from 'lucide-react'
import { NEWS_ITEMS } from '../../constants/home'
import { EmptyState } from '../ui/EmptyState'
import { SectionHeader } from '../ui/SectionHeader'

export function NewsEventsSection() {
  return (
    <section className="bg-white py-14 sm:py-16 lg:py-20" id="actualites">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          label="Veille"
          title="Actualités et événements"
          description="Suivez les activités, publications et partenariats de l'ORHS Bénin."
        />

        {NEWS_ITEMS.length === 0 ? (
          <EmptyState
            title="Aucune actualité"
            description="Les communiqués, événements et annonces de l'ORHS Bénin seront publiés ici dès qu'ils seront disponibles."
            icon={Newspaper}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {NEWS_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <article
                  key={item.id}
                  className="group flex gap-4 rounded-lg border border-[#e8ecf0] p-5 transition-all hover:border-health-green/30 hover:shadow-sm sm:p-6"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold-accent/15 text-[#9a7a2a]">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-health-green">
                      {item.category}
                    </span>
                    <h3 className="mt-1 text-base font-semibold leading-snug text-institutional-blue group-hover:text-health-green">
                      {item.title}
                    </h3>
                    <time className="mt-2 block text-sm text-dark-text/50">
                      {item.date}
                    </time>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          <a
            href="/actualites"
            className="inline-flex items-center gap-2 text-sm font-semibold text-institutional-blue transition-colors hover:text-health-green"
          >
            Toutes les actualités
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
