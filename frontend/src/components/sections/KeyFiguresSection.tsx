import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { SectionHeader } from '../ui/SectionHeader'
import { fetchPublicNationalStats } from '../../lib/public-api'
import type { NationalStats } from '../../types/stats'

export function KeyFiguresSection() {
  const [stats, setStats] = useState<NationalStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicNationalStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const figures = stats
    ? [
        { label: 'Effectif total validé', value: stats.effectif_total.toLocaleString('fr-FR') },
        {
          label: 'Personnel qualifié / 10 000 hab.',
          value: String(stats.ratio_personnel_qualifie_10k ?? stats.ratio_medecins),
        },
        {
          label: 'Seuil OMS (23 / 10 000)',
          value: stats.conforme_oms_rhs ? 'Atteint' : 'Non atteint',
        },
        {
          label: 'Public / privé',
          value: `${(stats.effectif_public ?? 0).toLocaleString('fr-FR')} / ${(stats.effectif_prive ?? 0).toLocaleString('fr-FR')}`,
        },
      ]
    : []
  const hasData = Boolean(stats && stats.effectif_total > 0)

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

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-8 w-8 text-gold-accent" />
          </div>
        ) : !hasData ? (
          <EmptyState
            title="Aucune statistique publiée"
            description="Les chiffres clés nationaux apparaîtront ici après validation par les autorités compétentes et consolidation des données de collecte."
            icon={BarChart3}
            light
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {figures.map((figure) => (
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
              {stats?.campagne?.libelle ? `${stats.campagne.libelle} — ` : ''}
              Données agrégées uniquement — aucune information nominative
            </p>
          </>
        )}
      </div>
    </section>
  )
}
