import { ArrowRight, GraduationCap } from 'lucide-react'
import { TRAINING_CATEGORIES } from '../../constants/home'
import { EmptyState } from '../ui/EmptyState'
import { SectionHeader } from '../ui/SectionHeader'

export function TrainingInstitutionsSection() {
  return (
    <section className="bg-surface-muted py-14 sm:py-16 lg:py-20" id="formation">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          label="Formation"
          title="Institutions de formation"
          description="Répertoire des établissements de formation des professionnels de santé au Bénin."
        />

        {TRAINING_CATEGORIES.length === 0 ? (
          <EmptyState
            title="Aucun établissement"
            description="Le répertoire des établissements de formation des professionnels de santé sera publié ici une fois recensé et validé."
            icon={GraduationCap}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRAINING_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <article
                  key={cat.id}
                  className="group rounded-lg border border-[#e8ecf0] bg-white p-6 shadow-sm transition-all hover:border-health-green/30 hover:shadow-md"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-health-green/10 text-health-green transition-colors group-hover:bg-health-green group-hover:text-white">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    <span className="rounded-full bg-institutional-blue/10 px-2.5 py-0.5 text-xs font-semibold text-institutional-blue">
                      {cat.count}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-institutional-blue">
                    {cat.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-dark-text/70">
                    {cat.description}
                  </p>
                  <a
                    href={`/formation/${cat.id}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-health-green transition-colors hover:text-[#0d6b45]"
                  >
                    Voir les fiches
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
