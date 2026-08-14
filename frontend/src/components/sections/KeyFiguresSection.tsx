import { BarChart3 } from 'lucide-react'
import { KEY_FIGURES } from '../../constants/home'
import { EmptyState } from '../ui/EmptyState'
import { SectionHeader } from '../ui/SectionHeader'

export function KeyFiguresSection() {
  return (
    <section className="border-y border-[#e8ecf0] bg-institutional-blue py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          label="Données agrégées"
          title="Chiffres clés nationaux"
          description="Indicateurs consolidés à l'échelle nationale. Aucune donnée nominative n'est publiée sur cette plateforme."
          light
          align="center"
        />

        {KEY_FIGURES.length === 0 ? (
          <EmptyState
            title="Aucune statistique publiée"
            description="Les chiffres clés nationaux apparaîtront ici après validation par les autorités compétentes et consolidation des données de collecte."
            icon={BarChart3}
            className="border-white/20 bg-white/5"
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {KEY_FIGURES.map((figure) => (
                <div
                  key={figure.label}
                  className="rounded-lg border border-white/10 bg-white/5 px-6 py-8 text-center backdrop-blur-sm"
                >
                  <p className="text-3xl font-bold text-gold-accent sm:text-4xl">
                    {figure.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/85">
                    {figure.label}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-white/50">
              Données agrégées uniquement — aucune information nominative
            </p>
          </>
        )}
      </div>
    </section>
  )
}
