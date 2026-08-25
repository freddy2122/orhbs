import { useEffect, useState } from 'react'
import { ArrowRight, GraduationCap } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { SectionHeader } from '../ui/SectionHeader'
import { Spinner } from '../ui/Spinner'
import { fetchPublicContenus, type ContenuEditorial } from '../../lib/editorial-api'

export function TrainingInstitutionsSection() {
  const [items, setItems] = useState<ContenuEditorial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicContenus('formation')
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="bg-surface-muted py-14 sm:py-16 lg:py-20" id="formation">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          label="Formation"
          title="Institutions de formation"
          description="Répertoire des établissements de formation des professionnels de santé au Bénin."
        />

        {loading ? (
          <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-health-green" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucun établissement"
            description="Le répertoire des établissements de formation des professionnels de santé sera publié ici une fois recensé et validé."
            icon={GraduationCap}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.slice(0, 8).map((cat) => (
              <article
                key={cat.id}
                className="group rounded-lg border border-[#e8ecf0] bg-white p-6 shadow-sm transition-all hover:border-health-green/30 hover:shadow-md"
              >
                <h3 className="text-base font-semibold text-institutional-blue">{cat.titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dark-text/70">{cat.resume || cat.categorie}</p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <a
            href="/formation"
            className="inline-flex items-center gap-2 text-sm font-semibold text-institutional-blue transition-colors hover:text-health-green"
          >
            Voir l'annuaire
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
