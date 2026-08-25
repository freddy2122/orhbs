import { useEffect, useState } from 'react'
import { GraduationCap, MapPin } from 'lucide-react'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { fetchPublicContenus, type ContenuEditorial } from '../lib/editorial-api'

export function TrainingDirectoryPage() {
  const [items, setItems] = useState<ContenuEditorial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicContenus('formation')
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const offers = items.filter((item) => item.categorie.toLowerCase().includes('offre') || item.date_fin)
  const institutions = items.filter((item) => !offers.includes(item))

  return (
    <main>
      <PageBanner
        label="Formation"
        title="Annuaire des institutions de formation"
        description="Écoles, facultés et instituts de formation des professionnels de santé au Bénin."
      />

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="h-7 w-7 text-health-green" /></div>
          ) : error ? (
            <EmptyState title="Annuaire indisponible" description={error} icon={GraduationCap} />
          ) : (
            <>
              <h2 className="mb-6 text-xl font-semibold text-institutional-blue">Offres de formation</h2>
              {offers.length === 0 ? (
                <EmptyState
                  title="Aucune offre"
                  description="Les offres de formation disponibles seront publiées ici une fois recensées."
                  icon={GraduationCap}
                  className="mb-12"
                />
              ) : (
                <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {offers.map((offer) => (
                    <article key={offer.id} className="rounded-lg border border-[#e8ecf0] bg-white p-5">
                      <span className="text-xs font-medium uppercase tracking-wider text-health-green">{offer.categorie || 'Formation'}</span>
                      <h3 className="mt-1 font-semibold text-institutional-blue">{offer.titre}</h3>
                      <p className="mt-2 text-sm text-dark-text/60">{offer.organisation}</p>
                      {offer.date_fin && (
                        <p className="mt-2 text-xs text-dark-text/50">Clôture : {new Date(offer.date_fin).toLocaleDateString('fr-FR')}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}

              <h2 className="mb-6 text-xl font-semibold text-institutional-blue">Institutions</h2>
              {institutions.length === 0 ? (
                <EmptyState
                  title="Aucun établissement"
                  description="Le répertoire des établissements de formation des professionnels de santé sera publié ici une fois recensé et validé."
                  icon={GraduationCap}
                />
              ) : (
                <div className="space-y-4">
                  {institutions.map((inst) => (
                    <article key={inst.id} className="rounded-lg border border-[#e8ecf0] bg-white p-6">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-health-green/10 text-health-green">
                          <GraduationCap className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-institutional-blue">{inst.titre}</h3>
                          <p className="text-sm text-dark-text/60">{inst.categorie || 'Institution'} — {inst.lieu || inst.organisation}</p>
                          <p className="mt-2 text-sm text-dark-text/70">{inst.resume}</p>
                          {inst.lieu && (
                            <p className="mt-1 flex items-center gap-1 text-sm text-dark-text/60"><MapPin className="h-4 w-4" /> {inst.lieu}</p>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
