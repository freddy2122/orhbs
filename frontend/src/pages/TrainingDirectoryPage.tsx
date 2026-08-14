import { GraduationCap, Mail, MapPin } from 'lucide-react'
import { TRAINING_INSTITUTIONS_DIR, TRAINING_OFFERS } from '../constants/contentData'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'

export function TrainingDirectoryPage() {
  const hasOffers = TRAINING_OFFERS.length > 0
  const hasInstitutions = TRAINING_INSTITUTIONS_DIR.length > 0

  return (
    <main>
      <PageBanner
        label="Formation"
        title="Annuaire des institutions de formation"
        description="Écoles, facultés et instituts de formation des professionnels de santé au Bénin."
      />

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-6 text-xl font-semibold text-institutional-blue">Offres de formation</h2>
          {!hasOffers ? (
            <EmptyState
              title="Aucun établissement"
              description="Les offres de formation disponibles seront publiées ici une fois recensées."
              icon={GraduationCap}
              className="mb-12"
            />
          ) : (
            <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TRAINING_OFFERS.map((offer) => (
                <article key={offer.id} className="rounded-lg border border-[#e8ecf0] bg-white p-5">
                  <span className="text-xs font-medium uppercase tracking-wider text-health-green">{offer.theme}</span>
                  <h3 className="mt-1 font-semibold text-institutional-blue">{offer.title}</h3>
                  <p className="mt-2 text-sm text-dark-text/60">{offer.organization}</p>
                  <p className="mt-2 text-xs text-dark-text/50">Clôture : {new Date(offer.deadline).toLocaleDateString('fr-FR')}</p>
                </article>
              ))}
            </div>
          )}

          <h2 className="mb-6 text-xl font-semibold text-institutional-blue">Institutions</h2>
          {!hasInstitutions ? (
            <EmptyState
              title="Aucun établissement"
              description="Le répertoire des établissements de formation des professionnels de santé sera publié ici une fois recensé et validé."
              icon={GraduationCap}
            />
          ) : (
            <div className="space-y-4">
              {TRAINING_INSTITUTIONS_DIR.map((inst) => (
                <article key={inst.id} className="rounded-lg border border-[#e8ecf0] bg-white p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-health-green/10 text-health-green">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-institutional-blue">{inst.name}</h3>
                        <p className="text-sm text-dark-text/60">{inst.type} — {inst.department}</p>
                        <p className="mt-2 text-sm">Capacité : {inst.capacity} places/an</p>
                        <p className="mt-1 text-sm text-dark-text/70">Formations : {inst.programs.join(', ')}</p>
                      </div>
                    </div>
                    <div className="text-sm text-dark-text/60">
                      <p className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {inst.department}</p>
                      <p className="mt-1 flex items-center gap-1"><Mail className="h-4 w-4" /> {inst.contact}</p>
                    </div>
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
