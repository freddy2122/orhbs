import { useEffect, useMemo, useState } from 'react'
import { Filter, Search, User } from 'lucide-react'
import { PageHeader } from '../../../components/dashboard/PageHeader'
import { SecureActorsNotice } from '../../../components/dashboard/SecureActorsNotice'
import { StatsState } from '../../../components/dashboard/StatsState'
import { Spinner } from '../../../components/ui/Spinner'
import { useDepartementStats, useZoneStats } from '../../../hooks/useStatsData'
import {
  fetchAgents,
  fetchCollecteFields,
  fetchStructures,
  type StructureOption,
} from '../../../lib/collecte-api'
import type { AgentSante } from '../../../types/agent'

const SECTEUR_OPTIONS = [
  { value: '', label: 'Tous secteurs' },
  { value: 'public', label: 'Public' },
  { value: 'prive', label: 'Privé' },
  { value: 'confessionnel', label: 'Confessionnel' },
]

const STATUT_OPTIONS = [
  { value: '', label: 'Tous statuts' },
  { value: 'actif', label: 'En activité' },
  { value: 'detache', label: 'Détaché' },
  { value: 'conge', label: 'Congé longue durée' },
  { value: 'retraite', label: 'Retraité' },
  { value: 'suspendu', label: 'Suspendu' },
]

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-dark-text/50">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  )
}

export function PersonnelPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [departement, setDepartement] = useState('')
  const [zone, setZone] = useState('')
  const [structureId, setStructureId] = useState<number | ''>('')
  const [profession, setProfession] = useState('')
  const [secteur, setSecteur] = useState('')
  const [statut, setStatut] = useState('')

  const [structures, setStructures] = useState<StructureOption[]>([])
  const [professions, setProfessions] = useState<string[]>([])
  const [metaLoading, setMetaLoading] = useState(true)

  const [agents, setAgents] = useState<AgentSante[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AgentSante | null>(null)

  const departements = useDepartementStats()
  const zones = useZoneStats(departement || undefined)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setMetaLoading(true)
    Promise.all([fetchStructures(), fetchCollecteFields()])
      .then(([structs, fields]) => {
        setStructures(structs)
        setProfessions(fields.professions_sante ?? [])
      })
      .catch(() => {})
      .finally(() => setMetaLoading(false))
  }, [])

  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      if (departement && s.departement.code !== departement) return false
      if (zone && s.zone_sanitaire?.code !== zone) return false
      return true
    })
  }, [structures, departement, zone])

  const reloadAgents = () => {
    setLoading(true)
    setError(null)
    fetchAgents({
      q: debouncedQuery || undefined,
      departement: departement || undefined,
      zone: zone || undefined,
      structure: structureId === '' ? undefined : structureId,
      profession: profession || undefined,
      secteur: secteur || undefined,
      statut: statut || undefined,
    })
      .then((res) => {
        setAgents(res.agents)
        setTotalCount(res.count)
        setSelected((prev) => {
          if (prev && res.agents.some((a) => a.id === prev.id)) return prev
          return res.agents[0] ?? null
        })
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reloadAgents()
  }, [debouncedQuery, departement, zone, structureId, profession, secteur, statut])

  const handleDepartementChange = (code: string) => {
    setDepartement(code)
    setZone('')
    setStructureId('')
  }

  const handleZoneChange = (code: string) => {
    setZone(code)
    setStructureId('')
  }

  const selectClass =
    'rounded-lg border border-[#dde3ea] bg-white px-3 py-2 text-sm text-dark-text/80'

  return (
    <div>
      <PageHeader
        title="Gestion du Personnel & Carrières"
        description="Fiches numériques individuelles — suivi des agents du secteur public et privé."
      />
      <SecureActorsNotice />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
        <Filter className="h-4 w-4 text-institutional-blue" />
        <select
          value={departement}
          onChange={(e) => handleDepartementChange(e.target.value)}
          className={selectClass}
          disabled={departements.loading}
        >
          <option value="">Tous départements</option>
          {departements.data?.departements.map((d) => (
            <option key={d.departement.code} value={d.departement.code}>
              {d.departement.nom}
            </option>
          ))}
        </select>
        <select
          value={zone}
          onChange={(e) => handleZoneChange(e.target.value)}
          className={selectClass}
          disabled={!departement || zones.loading}
        >
          <option value="">Toutes zones</option>
          {zones.data?.zones.map((z) => (
            <option key={z.zone.code} value={z.zone.code}>
              {z.zone.nom}
            </option>
          ))}
        </select>
        <select
          value={structureId}
          onChange={(e) => setStructureId(e.target.value ? Number(e.target.value) : '')}
          className={selectClass}
          disabled={metaLoading}
        >
          <option value="">Toutes structures</option>
          {filteredStructures.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </select>
        <select
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          className={selectClass}
          disabled={metaLoading}
        >
          <option value="">Toutes professions</option>
          {professions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={secteur} onChange={(e) => setSecteur(e.target.value)} className={selectClass}>
          {SECTEUR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={statut} onChange={(e) => setStatut(e.target.value)} className={selectClass}>
          {STATUT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-dark-text/50">
          {loading ? (
            <span className="inline-flex items-center gap-1">
              <Spinner className="h-3 w-3" /> Chargement…
            </span>
          ) : (
            `${totalCount} agent${totalCount > 1 ? 's' : ''}`
          )}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-text/40" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, matricule, structure, poste…"
              className="w-full rounded-lg border border-[#dde3ea] py-2.5 pl-10 pr-4 text-sm"
            />
          </div>

          <StatsState loading={loading} error={error} onRetry={reloadAgents}>
            {agents.length === 0 ? (
              <div className="rounded-xl border border-[#e8ecf0] bg-white p-8 text-center text-sm text-dark-text/60">
                Aucun agent ne correspond aux critères sélectionnés.
              </div>
            ) : (
              <ul className="max-h-[520px] overflow-y-auto rounded-xl border border-[#e8ecf0] bg-white shadow-sm">
                {agents.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className={`w-full border-b border-[#f0f2f5] px-4 py-3 text-left transition-colors hover:bg-light-gray/50 ${
                        selected?.id === p.id
                          ? 'bg-health-green/5 border-l-4 border-l-health-green'
                          : ''
                      }`}
                    >
                      <p className="font-medium text-institutional-blue">
                        {p.prenom} {p.nom}
                      </p>
                      <p className="text-xs text-dark-text/50">
                        {p.matricule} · {p.profession}
                      </p>
                      <p className="text-xs text-dark-text/45">{p.structure.nom}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </StatsState>
        </div>

        {selected && !loading && !error && (
          <div className="lg:col-span-3 rounded-xl border border-[#e8ecf0] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-institutional-blue/10 text-institutional-blue">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-institutional-blue">
                  {selected.prenom} {selected.nom}
                </h2>
                <p className="font-mono text-sm text-dark-text/60">{selected.matricule}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="inline-block rounded bg-health-green/10 px-2 py-0.5 text-xs font-medium text-health-green">
                    {selected.secteur_label}
                  </span>
                  <span className="inline-block rounded bg-institutional-blue/10 px-2 py-0.5 text-xs font-medium text-institutional-blue">
                    {selected.statut_label}
                  </span>
                </div>
              </div>
            </div>

            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <DetailField label="Profession" value={selected.profession} />
              <DetailField label="Grade" value={selected.grade} />
              <DetailField label="Spécialité" value={selected.specialite} />
              <DetailField label="Sexe" value={selected.sexe_label} />
              <DetailField label="Nationalité" value={selected.nationalite} />
              <DetailField label="Date de naissance" value={formatDate(selected.date_naissance)} />
              <DetailField label="Structure actuelle" value={selected.structure.nom} />
              <DetailField
                label="Type de structure"
                value={selected.structure.type_structure_label}
              />
              <DetailField
                label="Département"
                value={selected.structure.departement.nom}
              />
              <DetailField
                label="Zone sanitaire"
                value={selected.structure.zone_sanitaire?.nom ?? '—'}
              />
              <DetailField label="Poste occupé" value={selected.poste_occupe} />
              <DetailField label="Type de contrat" value={selected.type_contrat_label} />
              <DetailField label="Prise de service" value={formatDate(selected.date_prise_service)} />
              <DetailField label="Fin de contrat" value={formatDate(selected.date_fin_contrat)} />
              <DetailField
                label="Départ retraite prévu"
                value={formatDate(selected.depart_retraite_prevu)}
              />
              <DetailField label="Téléphone" value={selected.telephone} />
              <DetailField label="E-mail" value={selected.email} />
            </dl>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-institutional-blue">Formation</h3>
              <ul className="mt-2 space-y-1 text-sm text-dark-text/70">
                {selected.diplome_principal ? (
                  <li className="rounded bg-light-gray/50 px-3 py-2">
                    {selected.diplome_principal}
                    {selected.annee_diplome ? ` (${selected.annee_diplome})` : ''}
                  </li>
                ) : (
                  <li className="text-dark-text/45">Aucun diplôme renseigné</li>
                )}
                {selected.ecole_formation && (
                  <li className="rounded bg-light-gray/50 px-3 py-2">{selected.ecole_formation}</li>
                )}
              </ul>
            </div>

            <div className="mt-6 rounded-lg border border-[#e8ecf0] bg-light-gray/30 p-4 text-sm text-dark-text/60">
              <p>
                Campagne : <span className="font-medium text-dark-text/80">{selected.campagne.libelle}</span>
              </p>
              <p className="mt-1 text-xs">
                L&apos;historique des affectations sera disponible lorsque le module mobilité sera
                connecté à la base.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
