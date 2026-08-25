import { useEffect, useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'
import {
  createOrganizationEntity,
  deleteOrganizationEntity,
  fetchOrganization,
  updateOrganizationEntity,
  type DepartmentRow,
  type OrganizationData,
  type OrgKind,
  type StructureRow,
  type ZoneRow,
} from '../../lib/organization-admin-api'

const STRUCTURE_TYPES = [
  { value: 'CHU', label: 'CHU' },
  { value: 'HZ', label: 'Hôpital de zone' },
  { value: 'CS', label: 'Centre de santé' },
  { value: 'CSCOM', label: 'CSCOM' },
  { value: 'CNHU', label: 'CNHU' },
  { value: 'PRIVE', label: 'Privé' },
  { value: 'DIRECTION', label: 'Direction départementale' },
]

type OrgItem = DepartmentRow | ZoneRow | StructureRow

function isActive(item: OrgItem) {
  return item.actif !== false
}

export function OrganizationPanel() {
  const [organization, setOrganization] = useState<OrganizationData>({
    departements: [],
    zones: [],
    structures: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingKind, setEditingKind] = useState<OrgKind | null>(null)
  const [form, setForm] = useState({
    kind: 'departement' as OrgKind,
    code: '',
    nom: '',
    population: '',
    departement_id: '',
    zone_sanitaire_id: '',
    type_structure: 'CS',
  })
  const [confirm, setConfirm] = useState<{ kind: OrgKind; id: number; action: 'delete' | 'deactivate' } | null>(null)

  const load = async () => {
    try {
      const data = await fetchOrganization()
      setOrganization(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger l’organisation.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const resetForm = (kind: OrgKind = form.kind) => {
    setForm({
      kind,
      code: '',
      nom: '',
      population: '',
      departement_id: '',
      zone_sanitaire_id: '',
      type_structure: 'CS',
    })
    setEditingId(null)
    setEditingKind(null)
  }

  const matches = (item: { nom: string; code: string }) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return item.nom.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
  }

  const visible = useMemo(() => {
    const keep = (item: OrgItem) => matches(item) && (showInactive || isActive(item))
    return {
      departements: organization.departements.filter(keep),
      zones: organization.zones.filter(keep),
      structures: organization.structures.filter(keep),
    }
  }, [organization, query, showInactive])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const payload = {
        kind: form.kind,
        code: form.code.trim(),
        nom: form.nom.trim(),
        ...(form.kind === 'departement' ? { population: Number(form.population || 0) } : {}),
        ...(form.kind === 'zone' ? { departement_id: Number(form.departement_id) } : {}),
        ...(form.kind === 'structure'
          ? {
              departement_id: Number(form.departement_id),
              zone_sanitaire_id: form.zone_sanitaire_id ? Number(form.zone_sanitaire_id) : null,
              type_structure: form.type_structure,
            }
          : {}),
      }
      if (editingId !== null && editingKind === form.kind) {
        await updateOrganizationEntity(form.kind, editingId, payload)
        setMessage('Entité mise à jour.')
      } else {
        await createOrganizationEntity(payload)
        setMessage('Entité enregistrée.')
      }
      resetForm(form.kind)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La sauvegarde a échoué.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (kind: OrgKind, item: OrgItem) => {
    setEditingKind(kind)
    setEditingId(item.id)
    setForm({
      kind,
      code: item.code,
      nom: item.nom,
      population: 'population' in item ? String(item.population ?? '') : '',
      departement_id: 'departement' in item && item.departement ? String(item.departement.id) : '',
      zone_sanitaire_id: 'zone_sanitaire' in item && item.zone_sanitaire ? String(item.zone_sanitaire.id) : '',
      type_structure: 'type_structure' in item ? item.type_structure : 'CS',
    })
  }

  const performConfirm = async () => {
    if (!confirm) return
    const { kind, id, action } = confirm
    setConfirm(null)
    try {
      if (action === 'delete') {
        await deleteOrganizationEntity(kind, id)
        setMessage('Suppression réussie.')
      } else {
        await updateOrganizationEntity(kind, id, { actif: false })
        setMessage('Entité désactivée.')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.')
    }
  }

  const handleReactivate = async (kind: OrgKind, id: number) => {
    try {
      await updateOrganizationEntity(kind, id, { actif: true })
      setMessage('Entité réactivée.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La réactivation a échoué.')
    }
  }

  const renderActions = (kind: OrgKind, item: OrgItem) => (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => handleEdit(kind, item)} className="text-xs text-institutional-blue hover:underline">
        Éditer
      </button>
      {isActive(item) ? (
        <button type="button" onClick={() => setConfirm({ kind, id: item.id, action: 'deactivate' })} className="text-xs text-amber-600 hover:underline">
          Désactiver
        </button>
      ) : (
        <button type="button" onClick={() => handleReactivate(kind, item.id)} className="text-xs text-health-green hover:underline">
          Réactiver
        </button>
      )}
      <button type="button" onClick={() => setConfirm({ kind, id: item.id, action: 'delete' })} className="text-xs text-red-600 hover:underline">
        Supprimer
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">Confirmer l'action</h3>
            <p className="mb-4 text-sm text-dark-text/70">
              {confirm.action === 'delete'
                ? 'Suppression définitive. Impossible s’il reste des entités rattachées.'
                : 'L’entité restera en base mais disparaîtra des statistiques et de la collecte.'}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="rounded-lg border px-4 py-2">
                Annuler
              </button>
              <button type="button" onClick={() => void performConfirm()} className="rounded-lg bg-red-600 px-4 py-2 text-white">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Départements actifs', value: organization.departements.filter(isActive).length },
          { label: 'Zones sanitaires actives', value: organization.zones.filter(isActive).length },
          { label: 'Structures actives', value: organization.structures.filter(isActive).length },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-dark-text/50">{item.label}</p>
            <p className="mt-3 text-2xl font-bold text-institutional-blue">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-institutional-blue" />
          <h2 className="text-lg font-semibold text-institutional-blue">
            {editingId ? 'Modifier une entité' : 'Ajouter une entité'}
          </h2>
        </div>
        <p className="mb-4 text-sm text-dark-text/60">
          L’administrateur saisit ici les départements, zones sanitaires, CHU, hôpitaux de zone, centres de santé et DDS.
        </p>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm font-medium text-dark-text md:col-span-2">
            Type d'entité
            <select
              value={form.kind}
              onChange={(event) => resetForm(event.target.value as OrgKind)}
              className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
            >
              <option value="departement">Département</option>
              <option value="zone">Zone sanitaire</option>
              <option value="structure">Structure</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-dark-text">
            Code
            <input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
              required
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-dark-text">
            Nom
            <input
              value={form.nom}
              onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))}
              className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
              required
            />
          </label>

          {form.kind === 'departement' && (
            <label className="grid gap-1 text-sm font-medium text-dark-text md:col-span-2">
              Population estimée
              <input
                type="number"
                min={0}
                value={form.population}
                onChange={(event) => setForm((current) => ({ ...current, population: event.target.value }))}
                className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
              />
            </label>
          )}

          {form.kind !== 'departement' && (
            <label className="grid gap-1 text-sm font-medium text-dark-text">
              Département
              <select
                value={form.departement_id}
                onChange={(event) => setForm((current) => ({ ...current, departement_id: event.target.value, zone_sanitaire_id: '' }))}
                className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                required
              >
                <option value="">Sélectionner</option>
                {organization.departements.filter(isActive).map((department) => (
                  <option key={department.id} value={String(department.id)}>
                    {department.nom}
                  </option>
                ))}
              </select>
            </label>
          )}

          {form.kind === 'structure' && (
            <>
              <label className="grid gap-1 text-sm font-medium text-dark-text">
                Type de structure
                <select
                  value={form.type_structure}
                  onChange={(event) => setForm((current) => ({ ...current, type_structure: event.target.value }))}
                  className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                >
                  {STRUCTURE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-medium text-dark-text">
                Zone sanitaire
                <select
                  value={form.zone_sanitaire_id}
                  onChange={(event) => setForm((current) => ({ ...current, zone_sanitaire_id: event.target.value }))}
                  className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                >
                  <option value="">Aucune (ex. DDS)</option>
                  {organization.zones
                    .filter((zone) => isActive(zone) && (!form.departement_id || String(zone.departement?.id ?? '') === form.departement_id))
                    .map((zone) => (
                      <option key={zone.id} value={String(zone.id)}>
                        {zone.nom}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}

          <div className="md:col-span-2 flex justify-end items-center gap-2">
            {editingId !== null && (
              <button
                type="button"
                onClick={() => resetForm(form.kind)}
                className="rounded-lg border border-[#e8ecf0] bg-white px-4 py-2 text-sm font-semibold text-dark-text hover:bg-[#fafafa]"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d6b45] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher par nom ou code"
          className="min-w-[220px] flex-1 rounded-lg border border-[#dde3ea] bg-white px-3 py-2 text-sm outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
        />
        <label className="flex items-center gap-2 text-sm text-dark-text/70">
          <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
          Afficher les inactifs
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-institutional-blue">Départements</h3>
          {loading ? (
            <p className="text-sm text-dark-text/60">Chargement...</p>
          ) : visible.departements.length === 0 ? (
            <EmptyState title="Aucun département" description="Ajoutez un département depuis le formulaire." />
          ) : (
            <ul className="space-y-2 text-sm text-dark-text/70">
              {visible.departements.map((department) => (
                <li key={department.id} className="rounded-lg bg-light-gray px-2 py-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div>
                      {department.nom} <span className="text-xs text-dark-text/50">({department.code})</span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${isActive(department) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isActive(department) ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  {renderActions('departement', department)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-institutional-blue">Zones sanitaires</h3>
          {visible.zones.length === 0 ? (
            <p className="text-sm text-dark-text/60">Aucune zone enregistrée.</p>
          ) : (
            <ul className="space-y-2 text-sm text-dark-text/70">
              {visible.zones.map((zone) => (
                <li key={zone.id} className="rounded-lg bg-light-gray px-2 py-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div>
                      {zone.nom} <span className="text-xs text-dark-text/50">({zone.departement?.nom ?? '—'})</span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${isActive(zone) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isActive(zone) ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  {renderActions('zone', zone)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-institutional-blue">Structures</h3>
          {visible.structures.length === 0 ? (
            <p className="text-sm text-dark-text/60">Aucune structure enregistrée.</p>
          ) : (
            <ul className="max-h-[32rem] space-y-2 overflow-y-auto text-sm text-dark-text/70">
              {visible.structures.map((structure) => (
                <li key={structure.id} className="rounded-lg bg-light-gray px-2 py-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div>
                      {structure.nom}{' '}
                      <span className="text-xs text-dark-text/50">
                        ({structure.type_structure_label}
                        {structure.zone_sanitaire ? ` · ${structure.zone_sanitaire.nom}` : ''})
                      </span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${isActive(structure) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isActive(structure) ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  {renderActions('structure', structure)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
