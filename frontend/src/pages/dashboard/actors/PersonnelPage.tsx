/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Filter, Search, User, Download, FileText, UserPlus } from 'lucide-react'
import { PageHeader } from '../../../components/dashboard/PageHeader'
import { SecureActorsNotice } from '../../../components/dashboard/SecureActorsNotice'
import { StatsState } from '../../../components/dashboard/StatsState'
import { AgentCareerPanel } from '../../../components/dashboard/AgentCareerPanel'
import { AgentFicheForm, EMPTY_AGENT_FICHE, ExcelImportBar, type AgentFicheValues } from '../../../components/dashboard/AgentFicheForm'
import { Spinner } from '../../../components/ui/Spinner'
import {
  createAgent,
  downloadAgentsExcel,
  downloadAgentsPdf,
  downloadExcelTemplate,
  fetchAgentDuplicates,
  fetchAgents,
  fetchCollecteFields,
  fetchMouvements,
  fetchStructures,
  importExcelFile,
  type StructureOption,
} from '../../../lib/collecte-api'
import { useDashboardRole } from '../../../contexts/AuthContext'
import type { AgentSante, DuplicateGroup, MouvementAgent } from '../../../types/agent'

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
  { value: 'interimaire', label: 'Intérimaire' },
  { value: 'remplacant', label: 'Remplaçant' },
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

const CAN_MANAGE_AGENTS = new Set(['collecteur', 'validateur', 'coordination', 'admin'])

export function PersonnelPage() {
  const { role } = useDashboardRole()
  const canManageAgents = CAN_MANAGE_AGENTS.has(role)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [departement, setDepartement] = useState('')
  const [zone, setZone] = useState('')
  const [structureId, setStructureId] = useState<number | ''>('')
  const [profession, setProfession] = useState('')
  const [secteur, setSecteur] = useState('')
  const [statut, setStatut] = useState('')
  const [sexe, setSexe] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [mouvements, setMouvements] = useState<MouvementAgent[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])

  const [structures, setStructures] = useState<StructureOption[]>([])
  const [professions, setProfessions] = useState<string[]>([])
  const [metaLoading, setMetaLoading] = useState(true)

  const [agents, setAgents] = useState<AgentSante[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AgentSante | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<AgentFicheValues>(EMPTY_AGENT_FICHE)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

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

  const departementOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const structure of structures) {
      if (structure.departement?.code) {
        map.set(structure.departement.code, structure.departement.nom)
      }
    }
    return [...map.entries()]
      .map(([code, nom]) => ({ code, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [structures])

  const zoneOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const structure of structures) {
      if (departement && structure.departement.code !== departement) continue
      if (structure.zone_sanitaire?.code) {
        map.set(structure.zone_sanitaire.code, structure.zone_sanitaire.nom)
      }
    }
    return [...map.entries()]
      .map(([code, nom]) => ({ code, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [structures, departement])

  const reloadAgents = useCallback(() => {
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
      sexe: sexe || undefined,
      age_min: ageMin ? Number(ageMin) : undefined,
      age_max: ageMax ? Number(ageMax) : undefined,
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
  }, [debouncedQuery, departement, zone, structureId, profession, secteur, statut, sexe, ageMin, ageMax])

  useEffect(() => {
    reloadAgents()
  }, [reloadAgents])

  useEffect(() => {
    fetchAgentDuplicates()
      .then((res) => setDuplicates(res.groupes))
      .catch(() => setDuplicates([]))
  }, [totalCount])

  useEffect(() => {
    if (!selected) {
      setMouvements([])
      return
    }
    fetchMouvements(selected.id)
      .then(setMouvements)
      .catch(() => setMouvements([]))
  }, [selected])

  const currentFilters = {
    q: debouncedQuery || undefined,
    departement: departement || undefined,
    zone: zone || undefined,
    structure: structureId === '' ? undefined : structureId,
    profession: profession || undefined,
    secteur: secteur || undefined,
    statut: statut || undefined,
    sexe: sexe || undefined,
    age_min: ageMin ? Number(ageMin) : undefined,
    age_max: ageMax ? Number(ageMax) : undefined,
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadAgentsExcel(currentFilters)
    } catch {
      setError('Export Excel impossible.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      await downloadAgentsPdf(currentFilters)
    } catch {
      setError('Export PDF impossible.')
    } finally {
      setExportingPdf(false)
    }
  }

  const optionalDate = (value: string) => value || null
  const optionalNumber = (value: string) => (value ? Number(value) : null)

  const handleCreateAgent = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const structure = createForm.structure_id || (filteredStructures[0]?.id ?? structures[0]?.id)
      if (!structure) {
        throw new Error('Aucune structure disponible pour rattacher l’agent.')
      }
      await createAgent({
        matricule: createForm.matricule.trim(),
        nom: createForm.nom.trim(),
        prenom: createForm.prenom.trim(),
        sexe: createForm.sexe,
        date_naissance: optionalDate(createForm.date_naissance),
        nationalite: createForm.nationalite.trim() || 'Béninoise',
        telephone: createForm.telephone.trim(),
        email: createForm.email.trim(),
        profession: createForm.profession.trim(),
        poste_occupe: createForm.poste_occupe.trim(),
        grade: createForm.grade.trim(),
        specialite: createForm.specialite.trim(),
        secteur: createForm.secteur,
        type_contrat: createForm.type_contrat,
        statut_agent: createForm.statut_agent,
        date_prise_service: optionalDate(createForm.date_prise_service),
        date_fin_contrat: optionalDate(createForm.date_fin_contrat),
        depart_retraite_prevu: optionalDate(createForm.depart_retraite_prevu),
        salaire: optionalNumber(createForm.salaire),
        date_debut_conge: optionalDate(createForm.date_debut_conge),
        date_fin_conge: optionalDate(createForm.date_fin_conge),
        diplome_principal: createForm.diplome_principal.trim(),
        ecole_formation: createForm.ecole_formation.trim(),
        annee_diplome: optionalNumber(createForm.annee_diplome),
        structure_id: Number(structure),
      })
      setCreateForm(EMPTY_AGENT_FICHE)
      setShowCreate(false)
      reloadAgents()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Création impossible.')
    } finally {
      setCreating(false)
    }
  }

  const handleImportExcel = async (file: File) => {
    setImporting(true)
    setImportError(null)
    setImportMessage(null)
    try {
      const result = await importExcelFile(file)
      setImportMessage(
        `${result.lignes_ok} fiche(s) importée(s) sur ${result.lignes_total}.` +
          (result.lignes_erreur ? ` ${result.lignes_erreur} ligne(s) en erreur.` : ''),
      )
      reloadAgents()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import impossible.')
    } finally {
      setImporting(false)
    }
  }

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
          disabled={metaLoading}
        >
          <option value="">Tous départements</option>
          {departementOptions.map((d) => (
            <option key={d.code} value={d.code}>
              {d.nom}
            </option>
          ))}
        </select>
        <select
          value={zone}
          onChange={(e) => handleZoneChange(e.target.value)}
          className={selectClass}
          disabled={metaLoading}
        >
          <option value="">Toutes zones</option>
          {zoneOptions.map((z) => (
            <option key={z.code} value={z.code}>
              {z.nom}
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
        <select value={sexe} onChange={(e) => setSexe(e.target.value)} className={selectClass}>
          <option value="">Tous genres</option>
          <option value="F">Femmes</option>
          <option value="M">Hommes</option>
        </select>
        <input
          type="number"
          min={18}
          max={80}
          value={ageMin}
          onChange={(e) => setAgeMin(e.target.value)}
          placeholder="Âge min"
          className={`${selectClass} w-24`}
        />
        <input
          type="number"
          min={18}
          max={80}
          value={ageMax}
          onChange={(e) => setAgeMax(e.target.value)}
          placeholder="Âge max"
          className={`${selectClass} w-24`}
        />
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#dde3ea] bg-white px-3 py-2 text-sm font-medium text-institutional-blue hover:bg-light-gray disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Export…' : 'Exporter Excel'}
        </button>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={exportingPdf || loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#dde3ea] bg-white px-3 py-2 text-sm font-medium text-institutional-blue hover:bg-light-gray disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          {exportingPdf ? 'Export…' : 'Exporter PDF'}
        </button>
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-text/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, matricule, structure, poste…"
            className="w-full rounded-lg border border-[#dde3ea] py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
        {canManageAgents && (
          <button
            type="button"
            onClick={() => {
              setShowCreate((open) => {
                if (!open && !createForm.structure_id && (filteredStructures[0] || structures[0])) {
                  setCreateForm((current) => ({
                    ...current,
                    structure_id: (filteredStructures[0] ?? structures[0]).id,
                  }))
                }
                return !open
              })
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-health-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d6b45]"
          >
            <UserPlus className="h-4 w-4" />
            {showCreate ? 'Masquer le formulaire' : 'Ajouter une fiche agent'}
          </button>
        )}
      </div>

      {canManageAgents && (
      <div className="mb-6 space-y-4">
        <ExcelImportBar
          importing={importing}
          message={importMessage}
          error={importError}
          onDownloadTemplate={() => {
            void downloadExcelTemplate().catch(() => setImportError('Téléchargement du modèle impossible.'))
          }}
          onImport={(file) => void handleImportExcel(file)}
        />

        {showCreate && (
          <AgentFicheForm
            values={createForm}
            onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))}
            structures={filteredStructures.length ? filteredStructures : structures}
            professions={professions}
            submitting={creating}
            error={createError}
            onSubmit={handleCreateAgent}
            onCancel={() => {
              setShowCreate(false)
              setCreateError(null)
            }}
          />
        )}
      </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
          <StatsState loading={loading} error={error} onRetry={reloadAgents}>
            {agents.length === 0 ? (
              <div className="rounded-xl border border-[#e8ecf0] bg-white p-8 text-center text-sm text-dark-text/60">
                <p className="font-medium text-institutional-blue">Aucune fiche agent pour l’instant</p>
                <p className="mt-2">
                  {canManageAgents
                    ? 'Ajoutez une fiche complète ci-dessus ou importez un fichier Excel pour traiter plusieurs agents.'
                    : 'Aucune fiche agent n’est encore enregistrée dans votre périmètre.'}
                </p>
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
              <DetailField label="Prise de fonction" value={formatDate(selected.date_prise_service)} />
              <DetailField label="Fin de contrat" value={formatDate(selected.date_fin_contrat)} />
              <DetailField
                label="Départ retraite prévu"
                value={formatDate(selected.depart_retraite_prevu)}
              />
              <DetailField
                label="Salaire mensuel"
                value={selected.salaire != null ? `${selected.salaire.toLocaleString('fr-FR')} FCFA` : '—'}
              />
              <DetailField label="Début de congé" value={formatDate(selected.date_debut_conge)} />
              <DetailField label="Fin de congé" value={formatDate(selected.date_fin_conge)} />
              <DetailField label="Téléphone" value={selected.telephone} />
              <DetailField label="E-mail" value={selected.email} />
            </dl>

            <div className="mt-6 rounded-lg border border-[#e8ecf0] bg-light-gray/30 p-4 text-sm text-dark-text/60">
              <p>
                Campagne : <span className="font-medium text-dark-text/80">{selected.campagne.libelle}</span>
              </p>
            </div>

            <AgentCareerPanel
              agent={selected}
              structures={structures}
              mouvements={mouvements}
              canEdit={canManageAgents}
              onRefresh={() => {
                reloadAgents()
                fetchMouvements(selected.id).then(setMouvements).catch(() => setMouvements([]))
              }}
            />
          </div>
        )}
      </div>

      {duplicates.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">Doublons potentiels</h3>
          <ul className="mt-2 space-y-2 text-sm text-amber-900/80">
            {duplicates.slice(0, 8).map((group) => (
              <li key={`${group.type}-${group.cle}`}>
                {group.type === 'homonyme' ? 'Homonyme' : 'Matricule'} : {group.cle} ({group.agents.length} fiches)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
