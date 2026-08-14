import { Download, Scale } from 'lucide-react'
import { LEGAL_DOCUMENTS } from '../constants/home'
import { LEGAL_TEXTS } from '../constants/contentData'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'

export function LegalTextsPage() {
  const allTexts = [
    ...LEGAL_TEXTS.map((t) => ({ ...t, source: 'official' as const })),
    ...LEGAL_DOCUMENTS.map((d) => ({ id: d.id, title: d.title, type: d.type, year: d.date, source: 'orhs' as const })),
  ]

  return (
    <main>
      <PageBanner
        label="Réglementation"
        title="Bibliothèque de textes officiels"
        description="Décrets, lois, politiques nationales et textes encadrant les ressources humaines en santé."
      />
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {allTexts.length === 0 ? (
            <EmptyState
              title="Aucun texte juridique"
              description="Les décrets, lois et politiques nationales encadrant les ressources humaines en santé seront référencés ici dès leur mise en ligne."
              icon={Scale}
            />
          ) : (
            <div className="space-y-3">
              {allTexts.map((doc) => (
              <article key={doc.id} className="flex items-center gap-4 rounded-lg border border-[#e8ecf0] bg-white p-5 hover:border-health-green/30">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-institutional-blue/10 text-institutional-blue">
                  <Scale className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-health-green">{doc.type}</span>
                  <h2 className="font-semibold text-institutional-blue">{doc.title}</h2>
                  <p className="text-xs text-dark-text/50">{doc.year}</p>
                </div>
                <button type="button" className="shrink-0 rounded p-2 text-dark-text/40 hover:bg-health-green/10 hover:text-health-green">
                  <Download className="h-5 w-5" />
                </button>
              </article>
            ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
