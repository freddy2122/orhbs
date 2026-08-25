import { useEffect, useState } from 'react'
import { ArrowRight, Newspaper } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { SectionHeader } from '../ui/SectionHeader'
import { Spinner } from '../ui/Spinner'
import { fetchPublicContenus, type ContenuEditorial } from '../../lib/editorial-api'

export function NewsEventsSection() {
  const [items, setItems] = useState<ContenuEditorial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchPublicContenus('actualite'), fetchPublicContenus('evenement')])
      .then(([news, events]) => setItems([...news, ...events].slice(0, 4)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="bg-white py-14 sm:py-16 lg:py-20" id="actualites">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          label="Veille"
          title="Actualités et événements"
          description="Suivez les activités, publications et partenariats de l'ORHS Bénin."
        />

        {loading ? (
          <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-health-green" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucune actualité"
            description="Les communiqués, événements et annonces de l'ORHS Bénin seront publiés ici dès qu'ils seront disponibles."
            icon={Newspaper}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.type_contenu === 'actualite' ? `/actualites/${item.slug}` : '/actualites?tab=events'}
                className="group flex gap-4 rounded-lg border border-[#e8ecf0] p-5 transition-all hover:border-health-green/30 hover:shadow-sm sm:p-6"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-health-green">
                    {item.categorie || item.type_contenu_label}
                  </span>
                  <h3 className="mt-1 text-base font-semibold leading-snug text-institutional-blue group-hover:text-health-green">
                    {item.titre}
                  </h3>
                  {item.date_publication && (
                    <time className="mt-2 block text-sm text-dark-text/50">
                      {new Date(item.date_publication).toLocaleDateString('fr-FR')}
                    </time>
                  )}
                </div>
              </a>
            ))}
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
