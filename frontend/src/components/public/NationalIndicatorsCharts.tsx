import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { OMS_DOCTOR_RATIO_THRESHOLD } from '../../lib/security'
import { fetchPublicNationalStats } from '../../lib/public-api'
import type { NationalStats } from '../../types/stats'

const COLORS = ['#0F7B4F', '#0B3A66', '#D6A43A', '#6B7280']
const SECTOR_COLORS = ['#0F7B4F', '#0B3A66', '#D6A43A']

function professionsFromStats(stats: NationalStats) {
  const autres = Math.max(
    0,
    stats.effectif_total - stats.medecins - stats.infirmiers - stats.sages_femmes,
  )
  const rows = [
    { profession: 'Médecins', effectif: stats.medecins },
    { profession: 'Infirmiers', effectif: stats.infirmiers },
    { profession: 'Sages-femmes', effectif: stats.sages_femmes },
    { profession: 'Autres', effectif: autres },
  ].filter((row) => row.effectif > 0)
  const total = rows.reduce((sum, row) => sum + row.effectif, 0) || 1
  return rows.map((row) => ({ ...row, pct: Math.round((row.effectif / total) * 100) }))
}

function sectorsFromStats(stats: NationalStats) {
  const rows = [
    { name: 'Public', value: stats.effectif_public ?? 0 },
    { name: 'Privé', value: stats.effectif_prive ?? 0 },
    { name: 'Confessionnel', value: stats.effectif_confessionnel ?? 0 },
  ].filter((row) => row.value > 0)
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1
  return rows.map((row) => ({
    ...row,
    pct: Math.round((row.value / total) * 100),
  }))
}

export function NationalIndicatorsCharts() {
  const [current, setCurrent] = useState<NationalStats | null>(null)
  const [previous, setPrevious] = useState<NationalStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchPublicNationalStats(),
      fetchPublicNationalStats('collecte-2025').catch(() => null),
    ])
      .then(([live, hist]) => {
        if (cancelled) return
        setCurrent(live.effectif_total > 0 ? live : null)
        setPrevious(
          hist && hist.campagne?.code === 'collecte-2025' && hist.effectif_total > 0 ? hist : null,
        )
      })
      .catch(() => {
        if (!cancelled) setCurrent(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const professionData = useMemo(
    () => (current ? professionsFromStats(current) : []),
    [current],
  )
  const sectorData = useMemo(() => (current ? sectorsFromStats(current) : []), [current])
  const densityData = useMemo(() => {
    const points = []
    if (previous) {
      points.push({
        year: String(previous.campagne?.annee ?? 2025),
        medecins: previous.ratio_medecins,
        infirmiers: previous.ratio_infirmiers,
        sagesFemmes: previous.ratio_sages_femmes ?? 0,
      })
    }
    if (current) {
      points.push({
        year: String(current.campagne?.annee ?? 2026),
        medecins: current.ratio_medecins,
        infirmiers: current.ratio_infirmiers,
        sagesFemmes: current.ratio_sages_femmes ?? 0,
      })
    }
    return points
  }, [current, previous])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-health-green" />
      </div>
    )
  }

  if (!current) {
    return (
      <EmptyState
        title="Aucun indicateur national publié"
        description="Les graphiques seront alimentés automatiquement après validation nationale des déclarations RHS."
      />
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <article className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        <h3 className="mb-1 font-semibold text-institutional-blue">Densité médicale (pour 10 000 hab.)</h3>
        <p className="mb-4 text-xs text-dark-text/50">
          Seuil indicatif OMS médecins : {OMS_DOCTOR_RATIO_THRESHOLD} / 10 000 hab.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={densityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="medecins" name="Médecins" stroke="#0F7B4F" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="infirmiers" name="Infirmiers" stroke="#0B3A66" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="sagesFemmes" name="Sages-femmes" stroke="#D6A43A" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-institutional-blue">Répartition par grand corps de métier</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={professionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="profession" type="category" width={100} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString('fr-FR'), 'Effectif']} />
              <Bar dataKey="effectif" name="Effectif" radius={[0, 4, 4, 0]}>
                {professionData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm lg:col-span-2">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 font-semibold text-institutional-blue">Répartition par secteur d&apos;exercice</h3>
            {sectorData.length === 0 ? (
              <EmptyState
                title="Aucune donnée sectorielle"
                description="Les secteurs proviennent des fiches agents validées."
                className="py-8"
              />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${Math.round((percent ?? 0) * 100)}%`
                      }
                    >
                      {sectorData.map((_, i) => (
                        <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}
