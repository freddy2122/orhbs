import { Link } from 'react-router-dom'
import { PublicationCatalog } from '../components/publications/PublicationCatalog'
import { PageBanner } from '../components/ui/PageBanner'

export function ArchivesPage() {
  return (
    <main>
      <PageBanner
        label="Mémoire institutionnelle"
        title="Archives historiques"
        description="Publications antérieures à 2020 conservées par l'Observatoire des Ressources Humaines en Santé du Bénin."
      />
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <PublicationCatalog archivesOnly />
          <p className="mt-8 text-center">
            <Link to="/publications" className="text-sm font-medium text-health-green hover:underline">
              Retour au catalogue récent
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
