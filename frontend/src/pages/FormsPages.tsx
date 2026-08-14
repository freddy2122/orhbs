import { Shield } from 'lucide-react'
import { PageBanner } from '../components/ui/PageBanner'
import { RESTRICTED_DATA_NOTICE } from '../lib/security'

export function DataAccessPage() {
  return (
    <main>
      <PageBanner
        label="Accès restreint"
        title="Demande d'accès aux données"
        description="Formulaire réservé aux chercheurs et partenaires institutionnels. Toute demande est soumise à approbation."
      />
      <section className="border-b border-amber-200 bg-amber-50 py-4">
        <div className="mx-auto flex max-w-3xl items-start gap-3 px-4 sm:px-6">
          <Shield className="h-5 w-5 text-amber-700" />
          <p className="text-sm text-amber-900">{RESTRICTED_DATA_NOTICE}</p>
        </div>
      </section>
      <section className="py-14 sm:py-16">
        <form className="mx-auto max-w-2xl space-y-5 px-4 sm:px-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="mb-1 block text-sm font-medium">Institution</label>
            <input type="text" className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nom du responsable</label>
            <input type="text" className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail professionnel</label>
            <input type="email" className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Objet de la recherche</label>
            <input type="text" className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Données souhaitées (agrégées uniquement)</label>
            <textarea rows={3} className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Justification</label>
            <textarea rows={4} className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm" required />
          </div>
          <p className="text-xs text-dark-text/50">Aucune demande de données nominatives ne sera traitée via ce formulaire public.</p>
          <button type="submit" className="rounded-lg bg-institutional-blue px-6 py-3 text-sm font-semibold text-white hover:bg-[#092d52]">
            Soumettre la demande
          </button>
        </form>
      </section>
    </main>
  )
}

export function FocalPointPage() {
  return (
    <main>
      <PageBanner
        label="Réseau de collecte"
        title="Inscription comme point focal"
        description="Structures souhaitant rejoindre le réseau de collecte des données RHS."
      />
      <section className="py-14 sm:py-16">
        <form className="mx-auto max-w-2xl space-y-5 px-4 sm:px-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="mb-1 block text-sm font-medium">Type de structure</label>
            <select className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm">
              <option>Formation sanitaire publique</option>
              <option>Formation sanitaire privée</option>
              <option>Direction départementale</option>
              <option>Autre</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Département</label>
            <select className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm">
              <option>Atlantique</option>
              <option>Littoral</option>
              <option>Ouémé</option>
              <option>Autre</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nom de la structure</label>
            <input type="text" className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Personne contact</label>
            <input type="text" className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input type="email" className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Téléphone</label>
            <input type="tel" className="w-full rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm" />
          </div>
          <button type="submit" className="rounded-lg bg-health-green px-6 py-3 text-sm font-semibold text-white hover:bg-[#0d6b45]">
            Soumettre la candidature
          </button>
          <p className="text-xs text-dark-text/50">Approbation par l&apos;administration ORHS après examen du dossier.</p>
        </form>
      </section>
    </main>
  )
}
