import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { PUBLIC_DATA_NOTICE } from '../lib/security'
import {
  fetchPublicPublications,
  publicPublicationDownloadUrl,
  type PublicPublication,
} from '../lib/public-api'

const YEARBOOK_TYPES = new Set(['annuaire'])
const REPORT_TYPES = new Set(['rapport_annuel', 'bulletin', 'note'])

export function StatisticsPortalPage() {
  const [items, setItems] = useState<PublicPublication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicPublications()
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const yearbooks = items.filter((p) => YEARBOOK_TYPES.has(p.type_publication))
  const reports = items.filter((p) => REPORT_TYPES.has(p.type_publication))
  const others = items.filter(
    (p) => !YEARBOOK_TYPES.has(p.type_publication) && !REPORT_TYPES.has(p.type_publication),
  )

  return (
    <main>
      <PageBanner
        label="Documentation officielle"
        title="Portail des Statistiques & Rapports"
        description="Annuaires statistiques des ressources humaines en santé et bilans annuels du Ministère de la Santé — téléchargement libre."
      />

      <section className="border-b border-[#e8ecf0] bg-amber-50 py-3">
        <p className="mx-auto max-w-7xl px-4 text-center text-xs text-amber-900 sm:px-6">
          {PUBLIC_DATA_NOTICE} Documents agrégés, sans inscription requise.
        </p>
      </section>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-health-green" /></div>
      ) : error ? (
        <section className="py-14"><EmptyState title="Portail indisponible" description={error} icon={FileSpreadsheet} /></section>
      ) : (
        <>
          <PublicationGroup
            icon={FileSpreadsheet}
            title="Annuaires statistiques des RHS"
            subtitle="Données consolidées par profession, département et secteur."
            emptyTitle="Aucune statistique publiée"
            emptyDescription="Les annuaires statistiques des ressources humaines en santé seront disponibles ici après validation nationale."
            items={yearbooks}
            variant="card"
          />
          <section className="border-t border-[#e8ecf0] bg-light-gray/30">
            <PublicationGroup
              icon={FileText}
              title="Bilans annuels du Ministère de la Santé"
              subtitle="Rapports de performance et synthèses sectorielles."
              emptyTitle="Aucun bilan publié"
              emptyDescription="Les bilans annuels du Ministère de la Santé seront publiés ici une fois disponibles."
              items={reports}
              variant="row"
            />
          </section>
          <PublicationGroup
            icon={FileText}
            title="Autres publications ORHS"
            subtitle="Notes, études et communiqués officiels."
            emptyTitle="Aucune publication"
            emptyDescription="Les rapports et études produits par l'ORHS Bénin apparaîtront ici une fois publiés."
            items={others}
            variant="link"
          />
        </>
      )}
    </main>
  )
}

function PublicationGroup({
  icon: Icon,
  title,
  subtitle,
  emptyTitle,
  emptyDescription,
  items,
  variant,
}: {
  icon: typeof FileText
  title: string
  subtitle: string
  emptyTitle: string
  emptyDescription: string
  items: PublicPublication[]
  variant: 'card' | 'row' | 'link'
}) {
  return (
    <section className="py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex items-center gap-3">
          <Icon className="h-6 w-6 text-health-green" />
          <div>
            <h2 className="text-xl font-semibold text-institutional-blue">{title}</h2>
            <p className="text-sm text-dark-text/60">{subtitle}</p>
          </div>
        </div>
        {items.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} icon={Icon} />
        ) : variant === 'card' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((book) => (
              <article key={book.id} className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
                <span className="rounded bg-health-green/10 px-2 py-0.5 text-xs font-medium text-health-green">
                  {book.type_publication_label} {book.annee ?? ''}
                </span>
                <h3 className="mt-3 font-semibold text-institutional-blue">{book.titre}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-dark-text/50">{book.resume}</p>
                {book.fichier_url ? (
                  <a href={publicPublicationDownloadUrl(book.id)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-health-green hover:underline">
                    <Download className="h-4 w-4" /> Télécharger PDF
                  </a>
                ) : (
                  <Link to={`/publications/${book.slug}`} className="mt-4 inline-flex text-sm font-semibold text-health-green hover:underline">
                    Consulter
                  </Link>
                )}
              </article>
            ))}
          </div>
        ) : variant === 'row' ? (
          <div className="space-y-3">
            {items.map((report) => (
              <article key={report.id} className="flex flex-col gap-4 rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-medium text-gold-accent">{report.annee ?? report.type_publication_label}</span>
                  <h3 className="mt-1 font-semibold text-institutional-blue">{report.titre}</h3>
                  <p className="text-sm text-dark-text/55">{report.resume}</p>
                </div>
                <Link to={`/publications/${report.slug}`} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#e8ecf0] px-4 py-2 text-sm font-medium hover:bg-light-gray">
                  Consulter
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((pub) => (
                <Link key={pub.id} to={`/publications/${pub.slug}`} className="rounded-lg border border-[#e8ecf0] bg-white p-4 transition-colors hover:border-health-green/30">
                  <span className="text-xs font-medium text-health-green">{pub.type_publication_label} · {pub.annee ?? '—'}</span>
                  <h3 className="mt-1 font-medium text-institutional-blue">{pub.titre}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-dark-text/55">{pub.resume}</p>
                </Link>
              ))}
            </div>
            <Link to="/publications" className="mt-6 inline-flex text-sm font-semibold text-health-green hover:underline">
              Voir tout le catalogue →
            </Link>
          </>
        )}
      </div>
    </section>
  )
}
