/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { GraduationCap, Stethoscope } from 'lucide-react'
import { PageHeader } from '../../../components/dashboard/PageHeader'
import { SecureActorsNotice } from '../../../components/dashboard/SecureActorsNotice'
import { StatsState } from '../../../components/dashboard/StatsState'
import { fetchCompetences } from '../../../lib/acteurs-api'
import type { CompetencesResponse } from '../../../types/acteurs'

export function CompetencesPage() {
  const [tab, setTab] = useState<'formations' | 'specialisations'>('formations')
  const [data, setData] = useState<CompetencesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = () => {
    setLoading(true)
    setError(null)
    fetchCompetences()
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  const formations = data?.formations ?? []
  const specialisations = data?.specialisations ?? []

  return (
    <div>
      <PageHeader
        title="Suivi des Compétences & Formations"
        description={
          data?.campagne
            ? `Diplômes et spécialisations — ${data.campagne.libelle}`
            : 'Formations continues et spécialisations acquises en cours de carrière.'
        }
      />
      <SecureActorsNotice />

      <div className="mb-6 flex gap-2">
        {(
          [
            ['formations', 'Diplômes & formations', GraduationCap],
            ['specialisations', 'Spécialisations', Stethoscope],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
              tab === id
                ? 'bg-health-green text-white'
                : 'border border-[#e8ecf0] bg-white text-dark-text/70 hover:bg-light-gray'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
            <span className="rounded-full bg-black/10 px-1.5 text-xs">
              {id === 'formations' ? formations.length : specialisations.length}
            </span>
          </button>
        ))}
      </div>

      <StatsState loading={loading} error={error} onRetry={reload}>
        {tab === 'formations' && (
          <>
            {formations.length === 0 ? (
              <p className="rounded-xl border border-[#e8ecf0] bg-white p-8 text-center text-sm text-dark-text/60">
                Aucun diplôme ou formation renseigné dans les fiches agents de votre périmètre.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b bg-light-gray/50 text-xs uppercase text-dark-text/50">
                      <th className="px-4 py-3 font-medium">Agent</th>
                      <th className="px-4 py-3 font-medium">Matricule</th>
                      <th className="px-4 py-3 font-medium">Diplôme</th>
                      <th className="px-4 py-3 font-medium">École</th>
                      <th className="px-4 py-3 font-medium">Année</th>
                      <th className="px-4 py-3 font-medium">Structure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formations.map((t) => (
                      <tr key={t.id} className="border-b border-[#f0f2f5]">
                        <td className="px-4 py-3 font-medium">{t.agent}</td>
                        <td className="px-4 py-3 font-mono text-xs">{t.matricule}</td>
                        <td className="px-4 py-3">{t.diplome || '—'}</td>
                        <td className="px-4 py-3 text-dark-text/60">{t.ecole || '—'}</td>
                        <td className="px-4 py-3">{t.annee ?? '—'}</td>
                        <td className="px-4 py-3 text-dark-text/60">{t.structure}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'specialisations' && (
          <>
            {specialisations.length === 0 ? (
              <p className="rounded-xl border border-[#e8ecf0] bg-white p-8 text-center text-sm text-dark-text/60">
                Aucune spécialisation renseignée dans les fiches agents de votre périmètre.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {specialisations.map((s) => (
                  <article
                    key={s.id}
                    className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm"
                  >
                    <span className="rounded bg-institutional-blue/10 px-2 py-0.5 text-xs font-medium text-institutional-blue">
                      {s.specialite}
                    </span>
                    <h3 className="mt-2 font-semibold text-institutional-blue">{s.agent}</h3>
                    <p className="text-sm text-dark-text/60">{s.profession}</p>
                    <p className="mt-1 font-mono text-xs text-dark-text/45">{s.matricule}</p>
                    <p className="mt-2 text-xs text-dark-text/45">
                      {s.structure} · {s.departement}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </StatsState>
    </div>
  )
}
