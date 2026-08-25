import { useEffect, useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { fetchPublicContenus, type ContenuEditorial } from '../lib/editorial-api'

export function FaqPage() {
  const [open, setOpen] = useState<number | null>(0)
  const [items, setItems] = useState<ContenuEditorial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicContenus('faq')
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main>
      <PageBanner label="Aide" title="Questions fréquentes" description="Réponses aux questions sur l'ORHS, les données, les publications et l'accès." />
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="h-7 w-7 text-health-green" /></div>
          ) : error ? (
            <EmptyState title="FAQ indisponible" description={error} icon={HelpCircle} />
          ) : items.length === 0 ? (
            <EmptyState
              title="Aucune donnée disponible"
              description="Les questions fréquentes seront publiées ici dès qu'elles seront disponibles."
              icon={HelpCircle}
            />
          ) : (
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={item.id} className="rounded-lg border border-[#e8ecf0] bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(open === i ? null : i)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold text-institutional-blue"
                  >
                    {item.titre}
                    <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
                  </button>
                  {open === i && (
                    <div className="border-t border-[#e8ecf0] px-5 py-4 text-sm leading-relaxed text-dark-text/70 whitespace-pre-wrap">
                      {item.contenu || item.resume}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
