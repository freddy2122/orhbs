import { useEffect, useState } from 'react'
import {
  createMouvement,
  createQualification,
  fetchQualifications,
  updateAgent,
  type StructureOption,
} from '../../lib/collecte-api'
import type { AgentQualification, AgentSante, MouvementAgent } from '../../types/agent'

const MOUVEMENT_TYPES = [
  { value: 'affectation', label: 'Affectation' },
  { value: 'mutation', label: 'Mutation' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'detachment', label: 'Détachement' },
  { value: 'mise_disposition', label: 'Mise à disposition' },
  { value: 'conge_ld', label: 'Congé longue durée' },
  { value: 'retraite', label: 'Retraite' },
  { value: 'demission', label: 'Démission' },
  { value: 'revocation', label: 'Révocation' },
  { value: 'deces', label: 'Décès' },
  { value: 'rentree', label: 'Retour de congé/détachement' },
  { value: 'interim', label: 'Intérim' },
  { value: 'remplacement', label: 'Remplacement' },
]

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

type Props = {
  agent: AgentSante
  structures: StructureOption[]
  mouvements: MouvementAgent[]
  canEdit?: boolean
  onRefresh: () => void
}

export function AgentCareerPanel({ agent, structures, mouvements, canEdit = true, onRefresh }: Props) {
  const [quals, setQuals] = useState<AgentQualification[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mvt, setMvt] = useState({
    type_mouvement: 'mutation',
    structure_destination: '',
    date_effet: new Date().toISOString().slice(0, 10),
    date_fin: '',
    grade_nouveau: '',
    motif: '',
    reference_arrete: '',
  })
  const [qual, setQual] = useState({ intitule: '', niveau: '', ecole: '', date_obtention: '' })
  const [contrat, setContrat] = useState({
    type: agent.type_contrat,
    debut: agent.date_prise_service ?? '',
    fin: agent.date_fin_contrat ?? '',
    employeur: agent.structure.nom,
  })

  useEffect(() => {
    fetchQualifications(agent.id)
      .then(setQuals)
      .catch(() => setQuals([]))
  }, [agent.id])

  const submitMouvement = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createMouvement({
        agent: agent.id,
        type_mouvement: mvt.type_mouvement,
        structure_destination: mvt.structure_destination ? Number(mvt.structure_destination) : null,
        date_effet: mvt.date_effet,
        date_fin: mvt.date_fin || null,
        grade_nouveau: mvt.grade_nouveau,
        motif: mvt.motif,
        reference_arrete: mvt.reference_arrete,
      })
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement du mouvement impossible.')
    } finally {
      setSaving(false)
    }
  }

  const submitQual = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createQualification({
        agent: agent.id,
        intitule: qual.intitule,
        niveau: qual.niveau,
        ecole: qual.ecole,
        date_obtention: qual.date_obtention || null,
      })
      setQual({ intitule: '', niveau: '', ecole: '', date_obtention: '' })
      setQuals(await fetchQualifications(agent.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajout de qualification impossible.')
    } finally {
      setSaving(false)
    }
  }

  const submitContrat = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const historique = [...(agent.historique_contrats ?? []), contrat]
      await updateAgent(agent.id, {
        type_contrat: contrat.type,
        date_prise_service: contrat.debut || null,
        date_fin_contrat: contrat.fin || null,
        historique_contrats: historique,
      })
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour du contrat impossible.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'rounded-lg border border-[#dde3ea] px-3 py-2 text-sm'

  return (
    <div className="mt-6 space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <h3 className="text-sm font-semibold text-institutional-blue">Qualifications</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {agent.diplome_principal && (
            <li className="rounded bg-light-gray/50 px-3 py-2">
              {agent.diplome_principal}
              {agent.annee_diplome ? ` (${agent.annee_diplome})` : ''} — diplôme principal
            </li>
          )}
          {quals.map((item) => (
            <li key={item.id} className="rounded bg-light-gray/50 px-3 py-2">
              {item.intitule}
              {item.niveau ? ` · ${item.niveau}` : ''}
              {item.ecole ? ` — ${item.ecole}` : ''}
              {item.date_obtention ? ` (${formatDate(item.date_obtention)})` : ''}
            </li>
          ))}
          {!agent.diplome_principal && quals.length === 0 && (
            <li className="text-dark-text/45">Aucune qualification enregistrée.</li>
          )}
        </ul>
        {canEdit && (
        <form onSubmit={submitQual} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input required className={inputClass} placeholder="Intitulé" value={qual.intitule} onChange={(e) => setQual((q) => ({ ...q, intitule: e.target.value }))} />
          <input className={inputClass} placeholder="Niveau" value={qual.niveau} onChange={(e) => setQual((q) => ({ ...q, niveau: e.target.value }))} />
          <input className={inputClass} placeholder="École" value={qual.ecole} onChange={(e) => setQual((q) => ({ ...q, ecole: e.target.value }))} />
          <input type="date" className={inputClass} value={qual.date_obtention} onChange={(e) => setQual((q) => ({ ...q, date_obtention: e.target.value }))} />
          <button type="submit" disabled={saving} className="rounded-lg bg-institutional-blue px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            Ajouter une qualification
          </button>
        </form>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-institutional-blue">Contrat</h3>
        {canEdit ? (
        <form onSubmit={submitContrat} className="mt-2 grid gap-2 sm:grid-cols-2">
          <select className={inputClass} value={contrat.type} onChange={(e) => setContrat((c) => ({ ...c, type: e.target.value }))}>
            <option value="permanent">Permanent</option>
            <option value="contractuel">Contractuel</option>
            <option value="prestataire">Prestataire</option>
            <option value="stagiaire">Stagiaire</option>
            <option value="interimaire">Intérimaire</option>
            <option value="remplacant">Remplaçant</option>
          </select>
          <input className={inputClass} placeholder="Employeur" value={contrat.employeur} onChange={(e) => setContrat((c) => ({ ...c, employeur: e.target.value }))} />
          <input type="date" className={inputClass} value={contrat.debut} onChange={(e) => setContrat((c) => ({ ...c, debut: e.target.value }))} />
          <input type="date" className={inputClass} value={contrat.fin} onChange={(e) => setContrat((c) => ({ ...c, fin: e.target.value }))} />
          <button type="submit" disabled={saving} className="rounded-lg border border-[#dde3ea] px-3 py-2 text-sm font-medium text-institutional-blue">
            Enregistrer le contrat
          </button>
        </form>
        ) : null}
        {(agent.historique_contrats ?? []).length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-dark-text/60">
            {agent.historique_contrats?.map((row, index) => (
              <li key={`${row.debut}-${index}`}>
                {row.type ?? 'contrat'} · {row.debut ?? '—'} → {row.fin ?? 'en cours'}
                {row.employeur ? ` · ${row.employeur}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-institutional-blue">Mouvements RH</h3>
        {mouvements.length === 0 ? (
          <p className="mt-2 text-sm text-dark-text/45">Aucun mouvement enregistré pour cet agent.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {mouvements.map((item) => (
              <li key={item.id} className="rounded-lg border border-[#e8ecf0] bg-white px-3 py-2 text-sm">
                <p className="font-medium text-institutional-blue">{item.type_mouvement_label}</p>
                <p className="text-xs text-dark-text/55">
                  {formatDate(item.date_effet)}
                  {item.structure_origine_nom || item.structure_destination_nom
                    ? ` · ${item.structure_origine_nom || '—'} → ${item.structure_destination_nom || '—'}`
                    : ''}
                  {item.grade_nouveau ? ` · grade ${item.grade_nouveau}` : ''}
                </p>
                {item.motif && <p className="mt-1 text-xs text-dark-text/60">{item.motif}</p>}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
        <form onSubmit={submitMouvement} className="mt-3 grid gap-2 sm:grid-cols-2">
          <select className={inputClass} value={mvt.type_mouvement} onChange={(e) => setMvt((v) => ({ ...v, type_mouvement: e.target.value }))}>
            {MOUVEMENT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select className={inputClass} value={mvt.structure_destination} onChange={(e) => setMvt((v) => ({ ...v, structure_destination: e.target.value }))}>
            <option value="">Structure de destination</option>
            {structures.map((s) => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>
          <input type="date" required className={inputClass} value={mvt.date_effet} onChange={(e) => setMvt((v) => ({ ...v, date_effet: e.target.value }))} />
          <input type="date" className={inputClass} value={mvt.date_fin} onChange={(e) => setMvt((v) => ({ ...v, date_fin: e.target.value }))} />
          <input className={inputClass} placeholder="Nouveau grade (promotion)" value={mvt.grade_nouveau} onChange={(e) => setMvt((v) => ({ ...v, grade_nouveau: e.target.value }))} />
          <input className={inputClass} placeholder="Référence arrêté" value={mvt.reference_arrete} onChange={(e) => setMvt((v) => ({ ...v, reference_arrete: e.target.value }))} />
          <input className={`${inputClass} sm:col-span-2`} placeholder="Motif" value={mvt.motif} onChange={(e) => setMvt((v) => ({ ...v, motif: e.target.value }))} />
          <button type="submit" disabled={saving} className="rounded-lg bg-health-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Enregistrer le mouvement
          </button>
        </form>
        )}
      </div>
    </div>
  )
}
