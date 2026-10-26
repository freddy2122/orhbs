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
  type StructureNiveau,
  type StructureRow,
  type ZoneRow,
} from '../../lib/organization-admin-api'

/** Pyramide sanitaire du Bénin : niveau → types de structures. */
const PYRAMIDE: { niveau: StructureNiveau; label: string; types: { value: string; label: string }[] }[] = [
  {
    niveau: 'central',
    label: 'Niveau central',
    types: [{ value: 'CNHU', label: 'Centre national hospitalier universitaire (CNHU)' }],
  },
  {
    niveau: 'intermediaire',
    label: 'Niveau intermédiaire — département',
    types: [
      { value: 'DIRECTION', label: 'Direction départementale de la santé (DDS)' },
      { value: 'CHU', label: 'Centre hospitalier universitaire départemental (CHUD)' },
    ],
  },
  {
    niveau: 'peripherique',
    label: 'Niveau périphérique — zone sanitaire',
    types: [
      { value: 'HZ', label: 'Hôpital de zone' },
      { value: 'CSCOM', label: 'Centre de santé de commune' },
      { value: 'CS', label: 'Centre de santé d’arrondissement' },
      { value: 'UVS', label: 'Unité villageoise de santé' },
      { value: 'DISPENSAIRE', label: 'Dispensaire / maternité isolé(e)' },
    ],
  },
  {
    niveau: 'prive',
    label: 'Secteur privé et confessionnel',
    types: [
      { value: 'PRIVE', label: 'Établissement privé' },
      { value: 'CONFESSIONNEL', label: 'Établissement confessionnel / associatif' },
    ],
  },
]

const TYPE_ORDER = PYRAMIDE.flatMap((level) => level.types.map((type) => type.value))
const NIVEAU_PAR_TYPE: Record<string, StructureNiveau> = Object.fromEntries(
  PYRAMIDE.flatMap((level) => level.types.map((type) => [type.value, level.niveau])),
)

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
      <button type="button" onClick={() => handleEdit(kind, item)} className="text-xs text-institutional-black hover:underline">
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

  const statusBadge = (item: OrgItem) => (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
        isActive(item) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {isActive(item) ? 'Actif' : 'Inactif'}
    </span>
  )

  const renderStructure = (structure: StructureRow) => (
    <li key={structure.id} className="rounded-lg bg-light-gray px-3 py-2 text-sm text-dark-text/80">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span>
          {structure.nom} <span className="text-xs text-dark-text/50">({structure.code})</span>
        </span>
        {statusBadge(structure)}
      </div>
      {renderActions('structure', structure)}
    </li>
  )

  const tree = useMemo(() => {
    const q = query.trim().toLowerCase()
    const hit = (item: { nom: string; code: string }) =>
      !q || item.nom.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
    const keep = (item: OrgItem) => showInactive || isActive(item)
    const typeRank = (type: string) => {
      const index = TYPE_ORDER.indexOf(type)
      return index === -1 ? TYPE_ORDER.length : index
    }
    const typeLabel = (structure: StructureRow) => structure.type_structure_label

    const structures = organization.structures.filter(keep)
    const central = structures.filter((st) => st.niveau === 'central' && hit(st))

    const departements = organization.departements
      .filter(keep)
      .map((department) => {
        const deptHit = hit(department)
        const deptStructures = structures.filter((st) => st.departement?.id === department.id && st.niveau !== 'central')
        const match = (st: StructureRow) => deptHit || hit(st)

        const zones = organization.zones
          .filter((zone) => keep(zone) && zone.departement?.id === department.id)
          .map((zone) => {
            const zoneHit = deptHit || hit(zone)
            const inZone = deptStructures.filter(
              (st) => st.zone_sanitaire?.id === zone.id && st.niveau !== 'intermediaire',
            )
            const shown = inZone.filter((st) => zoneHit || hit(st))
            const groups = [...new Set(shown.map((st) => st.type_structure))]
              .sort((a, b) => typeRank(a) - typeRank(b))
              .map((type) => {
                const items = shown.filter((st) => st.type_structure === type)
                return { type, label: typeLabel(items[0]), items }
              })
            return { zone, count: shown.length, groups, visible: zoneHit || shown.length > 0 }
          })
          .filter((node) => node.visible)

        const intermediate = deptStructures.filter((st) => st.niveau === 'intermediaire' && match(st))
        const unassigned = deptStructures.filter(
          (st) => st.niveau !== 'intermediaire' && !st.zone_sanitaire && match(st),
        )
        const total =
          zones.reduce((sum, node) => sum + node.count, 0) + intermediate.length + unassigned.length
        return { department, zones, intermediate, unassigned, total, visible: deptHit || total > 0 || zones.length > 0 }
      })
      .filter((node) => node.visible)

    return { central, departements }
  }, [organization, query, showInactive])

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
            <p className="mt-3 text-2xl font-bold text-institutional-black">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-institutional-black" />
          <h2 className="text-lg font-semibold text-institutional-black">
            {editingId ? 'Modifier une entité' : 'Ajouter une entité'}
          </h2>
        </div>
        <p className="mb-4 text-sm text-dark-text/60">
          Organisation selon la pyramide sanitaire : un département contient ses zones sanitaires, et chaque zone regroupe ses structures par type.
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
              <option value="structure">Structure (par type)</option>
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
                  {PYRAMIDE.map((level) => (
                    <optgroup key={level.niveau} label={level.label}>
                      {level.types.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </optgroup>
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
                  <option value="">
                    {NIVEAU_PAR_TYPE[form.type_structure] === 'peripherique' ? 'Sélectionner (obligatoire)' : 'Aucune (rattachée au département)'}
                  </option>
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
              className="rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white hover:bg-[#005a23] disabled:cursor-not-allowed disabled:opacity-70"
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

      {loading ? (
        <p className="text-sm text-dark-text/60">Chargement...</p>
      ) : (
        <div className="space-y-4">
          {tree.central.length > 0 && (
            <section className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-semibold text-institutional-black">Niveau central</h3>
              <ul className="space-y-2">{tree.central.map(renderStructure)}</ul>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="font-semibold text-institutional-black">
              Niveau intermédiaire et périphérique — par département
            </h3>
            {tree.departements.length === 0 ? (
              <EmptyState title="Aucun résultat" description="Ajustez la recherche ou ajoutez un département." />
            ) : (
              tree.departements.map((node) => (
                <details
                  key={node.department.id}
                  open={query.trim() !== ''}
                  className="rounded-xl border border-[#e8ecf0] bg-white shadow-sm"
                >
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="font-medium text-institutional-black">
                      {node.department.nom}{' '}
                      <span className="text-xs font-normal text-dark-text/50">({node.department.code})</span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-dark-text/60">
                      {node.zones.length} zone(s) · {node.total} structure(s)
                      {statusBadge(node.department)}
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-[#e8ecf0] px-4 py-4">
                    {renderActions('departement', node.department)}

                    {node.intermediate.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-dark-text/60">
                          Niveau intermédiaire — DDS et hôpitaux départementaux
                        </h4>
                        <ul className="space-y-2">{node.intermediate.map(renderStructure)}</ul>
                      </div>
                    )}

                    {node.zones.map((zoneNode) => (
                      <details key={zoneNode.zone.id} open={query.trim() !== ''} className="rounded-lg border border-[#e8ecf0]">
                        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 bg-light-gray px-3 py-2 text-sm">
                          <span className="font-medium">{zoneNode.zone.nom}</span>
                          <span className="flex items-center gap-2 text-xs text-dark-text/60">
                            {zoneNode.count} structure(s)
                            {statusBadge(zoneNode.zone)}
                          </span>
                        </summary>
                        <div className="space-y-3 px-3 py-3">
                          {renderActions('zone', zoneNode.zone)}
                          {zoneNode.groups.length === 0 && (
                            <p className="text-xs text-dark-text/50">Aucune structure enregistrée dans cette zone.</p>
                          )}
                          {zoneNode.groups.map((group) => (
                            <div key={group.type}>
                              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-dark-text/60">
                                {group.label} ({group.items.length})
                              </h4>
                              <ul className="space-y-2">{group.items.map(renderStructure)}</ul>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}

                    {node.unassigned.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                          Sans zone sanitaire — à rattacher ({node.unassigned.length})
                        </h4>
                        <ul className="space-y-2">{node.unassigned.map(renderStructure)}</ul>
                      </div>
                    )}
                  </div>
                </details>
              ))
            )}
          </section>
        </div>
      )}
    </div>
  )
}
