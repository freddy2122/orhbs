import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Download, FileText, Share2, Tag } from 'lucide-react'
import { PUBLICATIONS } from '../constants/publicationsData'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { PUBLIC_DATA_NOTICE } from '../lib/security'

export function PublicationDetailPage() {
  const { id } = useParams()
  const pub = PUBLICATIONS.find((p) => p.id === id)
  const index = PUBLICATIONS.findIndex((p) => p.id === id)
  const prev = index > 0 ? PUBLICATIONS[index - 1] : null
  const next = index < PUBLICATIONS.length - 1 ? PUBLICATIONS[index + 1] : null

  if (!pub) {
    return (
      <main className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <EmptyState
            title="Aucune publication"
            description="Cette publication n'existe pas ou n'a pas encore été mise en ligne."
            icon={FileText}
          />
          <div className="mt-6 text-center">
            <Link to="/publications" className="text-health-green">Retour au catalogue</Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main>
      <PageBanner label={pub.type} title={pub.title} description={pub.summary} />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex flex-wrap gap-4 text-sm text-dark-text/60">
          <span>Publié le {new Date(pub.date).toLocaleDateString('fr-FR')}</span>
          <span>•</span>
          <span>{pub.downloads.toLocaleString('fr-FR')} téléchargements</span>
          <span>•</span>
          <span className="rounded bg-health-green/10 px-2 py-0.5 text-xs font-medium text-health-green">{pub.theme}</span>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-dark-text/50">Auteurs</h2>
          <p className="mt-1">{pub.authors.join(', ')}</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {pub.keywords.map((kw) => (
            <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-light-gray px-3 py-1 text-xs">
              <Tag className="h-3 w-3" /> {kw}
            </span>
          ))}
        </div>

        <p className="leading-relaxed text-dark-text/80">{pub.summary}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-health-green px-6 py-3 text-sm font-semibold text-white hover:bg-[#0d6b45]">
            <Download className="h-4 w-4" /> Télécharger PDF (gratuit)
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-[#dde3ea] px-6 py-3 text-sm font-medium hover:bg-light-gray">
            <Share2 className="h-4 w-4" /> Partager
          </button>
        </div>

        <p className="mt-6 text-xs text-dark-text/50">{PUBLIC_DATA_NOTICE}</p>

        <nav className="mt-12 flex justify-between border-t border-[#e8ecf0] pt-8">
          {prev ? (
            <Link to={`/publications/${prev.id}`} className="flex items-center gap-2 text-sm font-medium text-institutional-blue hover:text-health-green">
              <ArrowLeft className="h-4 w-4" /> {prev.title.slice(0, 40)}…
            </Link>
          ) : <span />}
          {next && (
            <Link to={`/publications/${next.id}`} className="flex items-center gap-2 text-sm font-medium text-institutional-blue hover:text-health-green">
              {next.title.slice(0, 40)}… <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </nav>
      </article>
    </main>
  )
}
