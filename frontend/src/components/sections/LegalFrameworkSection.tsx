import { Download, Scale } from 'lucide-react'
import { LEGAL_DOCUMENTS } from '../../constants/home'
import { EmptyState } from '../ui/EmptyState'
import { SectionHeader } from '../ui/SectionHeader'

const TYPE_COLORS: Record<string, string> = {
  Loi: 'bg-institutional-blue/10 text-institutional-blue',
  Décret: 'bg-health-green/10 text-health-green',
  Arrêté: 'bg-gold-accent/15 text-[#9a7a2a]',
  Statut: 'bg-dark-text/10 text-dark-text',
}

export function LegalFrameworkSection() {
  const types = ['Loi', 'Décret', 'Arrêté', 'Statut'] as const

  return (
    <section className="bg-white py-14 sm:py-16 lg:py-20" id="cadre-juridique">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          label="Réglementation"
          title="Cadre juridique et réglementaire"
          description="Bibliothèque documentaire des textes officiels encadrant les ressources humaines en santé au Bénin."
        />

        {LEGAL_DOCUMENTS.length === 0 ? (
          <EmptyState
            title="Aucun texte juridique"
            description="Les lois, décrets et arrêtés encadrant les ressources humaines en santé seront référencés ici dès leur mise en ligne."
            icon={Scale}
          />
        ) : (
          <>
            <div className="mb-8 flex flex-wrap gap-2">
              {types.map((type) => (
                <span
                  key={type}
                  className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider ${TYPE_COLORS[type]}`}
                >
                  {type}s
                </span>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {LEGAL_DOCUMENTS.map((doc) => (
                <article
                  key={doc.id}
                  className="group flex items-start gap-4 rounded-lg border border-[#e8ecf0] bg-light-gray/30 p-5 transition-all hover:border-health-green/30 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-institutional-blue/10 text-institutional-blue">
                    <Scale className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${TYPE_COLORS[doc.type]}`}
                      >
                        {doc.type}
                      </span>
                      <span className="text-xs text-dark-text/50">{doc.date}</span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold leading-snug text-institutional-blue">
                      {doc.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded p-2 text-dark-text/40 transition-colors hover:bg-health-green/10 hover:text-health-green"
                    aria-label={`Télécharger ${doc.title}`}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
