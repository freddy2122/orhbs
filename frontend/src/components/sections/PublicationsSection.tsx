import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileText } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { SectionHeader } from '../ui/SectionHeader'
import { fetchPublicPublications, type PublicPublication } from '../../lib/public-api'

export function PublicationsSection() {
  const [items, setItems] = useState<PublicPublication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicPublications()
      .then((data) => setItems(data.slice(0, 4)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="bg-surface-muted py-14 sm:py-16 lg:py-20" id="publications">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          label="Documentation"
          title="Publications et rapports"
          description="Consultez les principaux rapports et études produits par l'ORHS Bénin et ses partenaires."
        />

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-8 w-8 text-health-green" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucune publication"
            description="Les rapports, bulletins et études produits par l'ORHS Bénin seront disponibles ici une fois publiés."
            icon={FileText}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((pub) => (
              <article
                key={pub.id}
                className="group flex flex-col rounded-lg border border-[#e8ecf0] bg-white p-6 shadow-sm transition-all duration-200 hover:border-health-green/30 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-institutional-blue/10 text-institutional-blue">
                  <FileText className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-health-green">
                  {pub.type_publication_label}
                </span>
                <h3 className="mt-2 flex-1 text-base font-semibold leading-snug text-institutional-blue">
                  {pub.titre}
                </h3>
                <p className="mt-3 text-sm text-dark-text/50">{pub.annee ?? '—'}</p>
                <Link
                  to={`/publications/${pub.slug}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-health-green transition-colors hover:text-[#0d6b45]"
                >
                  Consulter
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            to="/publications"
            className="inline-flex items-center gap-2 rounded bg-institutional-blue px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#092d52]"
          >
            Voir toutes les publications
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
