import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Tag } from 'lucide-react'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { fetchPublicPublication, publicPublicationDownloadUrl, type PublicPublication } from '../lib/public-api'
import { PUBLIC_DATA_NOTICE } from '../lib/security'

export function PublicationDetailPage() {
  const { id } = useParams()
  const [pub, setPub] = useState<PublicPublication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchPublicPublication(id)
      .then((data) => {
        setPub(data)
        setError(null)
      })
      .catch((err: Error) => {
        setPub(null)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <main className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-health-green" />
      </main>
    )
  }

  if (!pub) {
    return (
      <main className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <EmptyState
            title="Aucune publication"
            description={error || "Cette publication n'existe pas ou n'a pas encore été mise en ligne."}
            icon={FileText}
          />
          <div className="mt-6 text-center">
            <Link to="/publications" className="text-health-green">Retour au catalogue</Link>
          </div>
        </div>
      </main>
    )
  }

  const keywords = pub.mot_cles.split(',').map((k) => k.trim()).filter(Boolean)
  const dateLabel = pub.date_publication
    ? new Date(pub.date_publication).toLocaleDateString('fr-FR')
    : pub.annee

  return (
    <main>
      <PageBanner label={pub.type_publication_label} title={pub.titre} description={pub.resume} />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex flex-wrap gap-4 text-sm text-dark-text/60">
          {dateLabel && <span>Publié le {dateLabel}</span>}
          <span>•</span>
          <span>{pub.telechargements.toLocaleString('fr-FR')} téléchargements</span>
          {pub.categorie && (
            <>
              <span>•</span>
              <span className="rounded bg-health-green/10 px-2 py-0.5 text-xs font-medium text-health-green">
                {pub.categorie.nom}
              </span>
            </>
          )}
        </div>

        {(pub.auteur_full || pub.auteur) && (
          <div className="mb-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-dark-text/50">Auteur</h2>
            <p className="mt-1">{pub.auteur_full || pub.auteur}</p>
          </div>
        )}

        {keywords.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-light-gray px-3 py-1 text-xs">
                <Tag className="h-3 w-3" /> {kw}
              </span>
            ))}
          </div>
        )}

        {pub.resume && <p className="leading-relaxed text-dark-text/80">{pub.resume}</p>}
        {pub.contenu && (
          <div className="mt-6 whitespace-pre-line leading-relaxed text-dark-text/80">{pub.contenu}</div>
        )}

        {pub.fichier_url && (
          <div className="mt-8">
            <a
              href={publicPublicationDownloadUrl(pub.id)}
              className="inline-flex items-center gap-2 rounded-lg bg-health-green px-6 py-3 text-sm font-semibold text-white hover:bg-[#0d6b45]"
            >
              <Download className="h-4 w-4" /> Télécharger PDF (gratuit)
            </a>
          </div>
        )}

        <p className="mt-6 text-xs text-dark-text/50">{PUBLIC_DATA_NOTICE}</p>

        <nav className="mt-12 border-t border-[#e8ecf0] pt-8">
          <Link to="/publications" className="inline-flex items-center gap-2 text-sm font-medium text-institutional-blue hover:text-health-green">
            <ArrowLeft className="h-4 w-4" /> Retour au catalogue
          </Link>
        </nav>
      </article>
    </main>
  )
}
