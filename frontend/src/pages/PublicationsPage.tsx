import { Link } from 'react-router-dom'
import { Archive } from 'lucide-react'
import { PublicationCatalog } from '../components/publications/PublicationCatalog'
import { PageBanner } from '../components/ui/PageBanner'
import { RssLink } from '../components/ui/NewsletterForm'

export function PublicationsPage() {
  return (
    <main>
      <PageBanner
        label="Documentation"
        title="Publications et rapports"
        description="Catalogue paginé des documents publiés par l'ORHS Bénin. Téléchargement PDF gratuit, sans inscription."
      />

      <section className="border-b border-[#e8ecf0] bg-light-gray/30 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <RssLink />
          <Link
            to="/publications/archives"
            className="inline-flex items-center gap-2 text-sm font-medium text-institutional-blue hover:text-health-green"
          >
            <Archive className="h-4 w-4" /> Archives (avant 2020)
          </Link>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <PublicationCatalog />
        </div>
      </section>
    </main>
  )
}
