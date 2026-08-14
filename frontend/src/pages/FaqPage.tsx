import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { FAQ_ITEMS } from '../constants/contentData'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'

export function FaqPage() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <main>
      <PageBanner label="Aide" title="Questions fréquentes" description="Réponses aux questions sur l'ORHS, les données, les publications et l'accès." />
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {FAQ_ITEMS.length === 0 ? (
            <EmptyState
              title="Aucune donnée disponible"
              description="Les questions fréquentes seront publiées ici dès qu'elles seront disponibles."
              icon={HelpCircle}
            />
          ) : (
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
              <div key={item.q} className="rounded-lg border border-[#e8ecf0] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold text-institutional-blue"
                >
                  {item.q}
                  <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                {open === i && (
                  <div className="border-t border-[#e8ecf0] px-5 py-4 text-sm leading-relaxed text-dark-text/70">
                    {item.a}
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
