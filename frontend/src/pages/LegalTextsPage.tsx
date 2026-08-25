import { useEffect, useState } from 'react'
import { Scale } from 'lucide-react'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { fetchPublicContenus, type ContenuEditorial } from '../lib/editorial-api'

export function LegalTextsPage() {
  const [items, setItems] = useState<ContenuEditorial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicContenus('texte_legal')
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main>
      <PageBanner
        label="Réglementation"
        title="Bibliothèque de textes officiels"
        description="Décrets, lois, politiques nationales et textes encadrant les ressources humaines en santé."
      />
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="h-7 w-7 text-health-green" /></div>
          ) : error ? (
            <EmptyState title="Textes indisponibles" description={error} icon={Scale} />
          ) : items.length === 0 ? (
            <EmptyState
              title="Aucun texte juridique"
              description="Les décrets, lois et politiques nationales encadrant les ressources humaines en santé seront référencés ici dès leur mise en ligne."
              icon={Scale}
            />
          ) : (
            <div className="space-y-3">
              {items.map((doc) => (
                <article key={doc.id} className="flex items-center gap-4 rounded-lg border border-[#e8ecf0] bg-white p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-institutional-blue/10 text-institutional-blue">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-health-green">{doc.categorie || 'Texte'}</span>
                    <h2 className="font-semibold text-institutional-blue">{doc.titre}</h2>
                    <p className="text-xs text-dark-text/50">{doc.annee ?? (doc.date_publication ? new Date(doc.date_publication).getFullYear() : '—')}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
