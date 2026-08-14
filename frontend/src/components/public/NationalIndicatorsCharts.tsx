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
import {
  DENSITY_TREND,
  PROFESSION_DISTRIBUTION,
  SECTOR_DISTRIBUTION,
} from '../../constants/publicSpace'
import { EmptyState } from '../ui/EmptyState'
import { OMS_DOCTOR_RATIO_THRESHOLD } from '../../lib/security'

const COLORS = ['#0F7B4F', '#0B3A66', '#D6A43A', '#2E86AB', '#6B7280', '#94A3B8']
const SECTOR_COLORS = ['#0F7B4F', '#0B3A66', '#D6A43A']

const hasData =
  DENSITY_TREND.length > 0 ||
  PROFESSION_DISTRIBUTION.length > 0 ||
  SECTOR_DISTRIBUTION.length > 0

export function NationalIndicatorsCharts() {
  if (!hasData) {
    return (
      <EmptyState
        title="Aucun indicateur national publié"
        description="Les graphiques seront alimentés automatiquement après validation nationale des déclarations RHS et publication des statistiques officielles."
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
        {DENSITY_TREND.length === 0 ? (
          <EmptyState
            title="Aucune série temporelle"
            description="Les tendances apparaîtront lorsque plusieurs campagnes validées seront disponibles."
            className="py-8"
          />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DENSITY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 6]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="medecins" name="Médecins" stroke="#0F7B4F" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="infirmiers" name="Infirmiers" stroke="#0B3A66" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="sagesFemmes" name="Sages-femmes" stroke="#D6A43A" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>

      <article className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-institutional-blue">Répartition par grand corps de métier</h3>
        {PROFESSION_DISTRIBUTION.length === 0 ? (
          <EmptyState
            title="Aucune répartition disponible"
            description="Effectifs par profession — en attente de données validées."
            className="py-8"
          />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PROFESSION_DISTRIBUTION} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="profession" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [Number(v).toLocaleString('fr-FR'), 'Effectif']} />
                <Bar dataKey="effectif" name="Effectif" radius={[0, 4, 4, 0]}>
                  {PROFESSION_DISTRIBUTION.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>

      <article className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm lg:col-span-2">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 font-semibold text-institutional-blue">Répartition par secteur d&apos;exercice</h3>
            {SECTOR_DISTRIBUTION.length === 0 ? (
              <EmptyState
                title="Aucune donnée sectorielle"
                description="Public / privé / confessionnel — en attente de publication."
                className="py-8"
              />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={SECTOR_DISTRIBUTION}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name} ${value}%`}
                    >
                      {SECTOR_DISTRIBUTION.map((_, i) => (
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
