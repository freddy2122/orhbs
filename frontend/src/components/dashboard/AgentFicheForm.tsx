import type { FormEvent, ReactNode } from 'react'
import { FileSpreadsheet, Save, X } from 'lucide-react'
import type { StructureOption } from '../../lib/collecte-api'

export type AgentFicheValues = {
  matricule: string
  nom: string
  prenom: string
  sexe: string
  date_naissance: string
  nationalite: string
  telephone: string
  email: string
  structure_id: number | ''
  profession: string
  poste_occupe: string
  grade: string
  specialite: string
  secteur: string
  type_contrat: string
  statut_agent: string
  date_prise_service: string
  date_fin_contrat: string
  depart_retraite_prevu: string
  salaire: string
  date_debut_conge: string
  date_fin_conge: string
  diplome_principal: string
  ecole_formation: string
  annee_diplome: string
}

export const EMPTY_AGENT_FICHE: AgentFicheValues = {
  matricule: '',
  nom: '',
  prenom: '',
  sexe: 'F',
  date_naissance: '',
  nationalite: 'Béninoise',
  telephone: '',
  email: '',
  structure_id: '',
  profession: 'Médecin généraliste',
  poste_occupe: '',
  grade: '',
  specialite: '',
  secteur: 'public',
  type_contrat: 'permanent',
  statut_agent: 'actif',
  date_prise_service: '',
  date_fin_contrat: '',
  depart_retraite_prevu: '',
  salaire: '',
  date_debut_conge: '',
  date_fin_conge: '',
  diplome_principal: '',
  ecole_formation: '',
  annee_diplome: '',
}

const inputClass =
  'w-full rounded-lg border border-[#dde3ea] bg-white px-3 py-2 text-sm text-dark-text/80 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-dark-text">
      <span>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
    </label>
  )
}

export function AgentFicheForm({
  values,
  onChange,
  structures,
  professions,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  values: AgentFicheValues
  onChange: (patch: Partial<AgentFicheValues>) => void
  structures: StructureOption[]
  professions: string[]
  submitting: boolean
  error: string | null
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
}) {
  const set = (key: keyof AgentFicheValues, value: string | number | '') => {
    onChange({ [key]: value })
  }

  return (
    <form onSubmit={onSubmit} className="w-full rounded-xl border border-[#e8ecf0] bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-institutional-blue">Nouvelle fiche nominative</h2>
          <p className="text-sm text-dark-text/55">
            Identité, affectation, contrat, congé et rémunération — enregistrez une fiche complète.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-sm text-dark-text/60 hover:text-dark-text">
          <X className="h-4 w-4" /> Fermer
        </button>
      </div>

      <section className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-dark-text/45">Identité</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Matricule" required>
            <input required value={values.matricule} onChange={(e) => set('matricule', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Nom" required>
            <input required value={values.nom} onChange={(e) => set('nom', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Prénom" required>
            <input required value={values.prenom} onChange={(e) => set('prenom', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Sexe" required>
            <select value={values.sexe} onChange={(e) => set('sexe', e.target.value)} className={inputClass}>
              <option value="F">Femme</option>
              <option value="M">Homme</option>
            </select>
          </Field>
          <Field label="Date de naissance">
            <input type="date" value={values.date_naissance} onChange={(e) => set('date_naissance', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Nationalité">
            <input value={values.nationalite} onChange={(e) => set('nationalite', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Téléphone">
            <input value={values.telephone} onChange={(e) => set('telephone', e.target.value)} className={inputClass} />
          </Field>
          <Field label="E-mail">
            <input type="email" value={values.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-dark-text/45">Affectation</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Structure" required>
            <select
              required
              value={values.structure_id}
              onChange={(e) => set('structure_id', e.target.value ? Number(e.target.value) : '')}
              className={inputClass}
            >
              <option value="">Sélectionner</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} — {s.departement.nom}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Profession" required>
            <input
              required
              list="professions-orhs"
              value={values.profession}
              onChange={(e) => set('profession', e.target.value)}
              className={inputClass}
            />
            <datalist id="professions-orhs">
              {professions.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="Poste occupé">
            <input value={values.poste_occupe} onChange={(e) => set('poste_occupe', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Grade">
            <input value={values.grade} onChange={(e) => set('grade', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Spécialité">
            <input value={values.specialite} onChange={(e) => set('specialite', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Secteur">
            <select value={values.secteur} onChange={(e) => set('secteur', e.target.value)} className={inputClass}>
              <option value="public">Public</option>
              <option value="prive">Privé</option>
              <option value="confessionnel">Confessionnel</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-dark-text/45">Contrat, prise de fonction et rémunération</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Type de contrat">
            <select value={values.type_contrat} onChange={(e) => set('type_contrat', e.target.value)} className={inputClass}>
              <option value="permanent">Permanent</option>
              <option value="contractuel">Contractuel</option>
              <option value="prestataire">Prestataire</option>
              <option value="stagiaire">Stagiaire</option>
              <option value="interimaire">Intérimaire</option>
              <option value="remplacant">Remplaçant</option>
            </select>
          </Field>
          <Field label="Statut">
            <select value={values.statut_agent} onChange={(e) => set('statut_agent', e.target.value)} className={inputClass}>
              <option value="actif">En activité</option>
              <option value="conge">En congé</option>
              <option value="detache">Détaché</option>
              <option value="suspendu">Suspendu</option>
              <option value="retraite">Retraité</option>
              <option value="interimaire">Intérimaire</option>
              <option value="remplacant">Remplaçant</option>
            </select>
          </Field>
          <Field label="Date de prise de fonction">
            <input type="date" value={values.date_prise_service} onChange={(e) => set('date_prise_service', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Fin de contrat">
            <input type="date" value={values.date_fin_contrat} onChange={(e) => set('date_fin_contrat', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Départ retraite prévu">
            <input type="date" value={values.depart_retraite_prevu} onChange={(e) => set('depart_retraite_prevu', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Salaire mensuel (FCFA)">
            <input
              type="number"
              min={0}
              value={values.salaire}
              onChange={(e) => set('salaire', e.target.value)}
              placeholder="Ex. 250000"
              className={inputClass}
            />
          </Field>
          <Field label="Début de congé">
            <input type="date" value={values.date_debut_conge} onChange={(e) => set('date_debut_conge', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Fin de congé">
            <input type="date" value={values.date_fin_conge} onChange={(e) => set('date_fin_conge', e.target.value)} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-dark-text/45">Formation</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Diplôme principal">
            <input value={values.diplome_principal} onChange={(e) => set('diplome_principal', e.target.value)} className={inputClass} />
          </Field>
          <Field label="École de formation">
            <input value={values.ecole_formation} onChange={(e) => set('ecole_formation', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Année du diplôme">
            <input type="number" min={1960} max={2100} value={values.annee_diplome} onChange={(e) => set('annee_diplome', e.target.value)} className={inputClass} />
          </Field>
        </div>
      </section>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-[#e8ecf0] px-4 py-2 text-sm font-semibold text-dark-text">
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-institutional-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {submitting ? 'Enregistrement…' : 'Enregistrer la fiche'}
        </button>
      </div>
    </form>
  )
}

export function ExcelImportBar({
  importing,
  message,
  error,
  onDownloadTemplate,
  onImport,
}: {
  importing: boolean
  message: string | null
  error: string | null
  onDownloadTemplate: () => void
  onImport: (file: File) => void
}) {
  return (
    <div className="rounded-xl border border-dashed border-health-green/40 bg-health-green/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 text-health-green" />
          <div>
            <p className="text-sm font-semibold text-institutional-blue">Import Excel — traitement par lot</p>
            <p className="text-xs text-dark-text/55">
              Téléchargez le modèle, remplissez les fiches, puis importez. Les lignes valides créent ou mettent à jour les agents.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 text-sm font-medium text-institutional-blue"
          >
            Télécharger le modèle
          </button>
          <label className="cursor-pointer rounded-lg bg-health-green px-3 py-2 text-sm font-semibold text-white hover:bg-[#0d6b45]">
            {importing ? 'Import en cours…' : 'Importer un fichier'}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={importing}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onImport(file)
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </div>
      {message && <p className="mt-3 text-sm text-health-green">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  )
}
