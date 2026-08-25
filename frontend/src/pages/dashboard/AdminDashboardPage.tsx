import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Activity,
  Building2,
  Database,
  FileText,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { CmsContentPanel } from '../../components/dashboard/CmsContentPanel'
import { EditorialCmsPanel } from '../../components/dashboard/EditorialCmsPanel'
import { AlertsConfigPanel } from '../../components/dashboard/AlertsConfigPanel'
import { AuditPanel } from '../../components/dashboard/AuditPanel'
import { MonitoringPanel } from '../../components/dashboard/MonitoringPanel'
import { OrganizationPanel } from '../../components/dashboard/OrganizationPanel'
import { EmptyState } from '../../components/ui/EmptyState'
import { fetchOrganization, type OrganizationData } from '../../lib/organization-admin-api'

type Profile = {
  role: string
  role_label: string
  scope: string
  scope_label: string
  poste?: string
  organisation?: string
  departement?: { id: number; nom: string } | null
  structure?: { id: number; nom: string } | null
}

type UserRow = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  profile?: Profile
}

const adminSections = [
  { id: 'users', label: 'Utilisateurs & rôles', icon: Users, path: '/dashboard/admin' },
  { id: 'organisation', label: 'Organisation', icon: Building2, path: '/dashboard/admin/organisation' },
  { id: 'content', label: 'Contenu CMS', icon: FileText, path: '/dashboard/admin/contenu' },
  { id: 'config', label: 'Configuration', icon: Settings, path: '/dashboard/admin/config' },
  { id: 'audit', label: 'Audit & sécurité', icon: Shield, path: '/dashboard/admin/audit' },
  { id: 'integrations', label: 'Intégrations', icon: Database, path: '/dashboard/admin/integrations' },
  { id: 'monitoring', label: 'Monitoring', icon: Activity, path: '/dashboard/admin/monitoring' },
] as const

const ROLE_OPTIONS = [
  'admin',
  'coordination',
  'analyste',
  'validateur',
  'collecteur',
  'decideur',
  'partenaire',
]

const SCOPE_OPTIONS = ['national', 'departemental', 'structure']

function getAdminSection(pathname: string) {
  if (pathname.endsWith('/organisation')) return 'organisation'
  if (pathname.endsWith('/contenu')) return 'content'
  if (pathname.endsWith('/config')) return 'config'
  if (pathname.endsWith('/audit')) return 'audit'
  if (pathname.endsWith('/integrations')) return 'integrations'
  if (pathname.endsWith('/monitoring')) return 'monitoring'
  return 'users'
}

function getCsrfToken(): string | null {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith('csrftoken='))
  return cookie ? decodeURIComponent(cookie.split('=')[1] ?? '') : null
}

export function AdminDashboardPage() {
  const location = useLocation()
  const activeSection = getAdminSection(location.pathname)
  const [users, setUsers] = useState<UserRow[]>([])
  const [organization, setOrganization] = useState<OrganizationData>({
    departements: [],
    zones: [],
    structures: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'coordination',
    scope: 'national',
    poste: '',
    departement_id: '',
    structure_id: '',
  })
  const [message, setMessage] = useState<string | null>(null)

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/', {
        method: 'GET',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Impossible de charger les utilisateurs.')
      }
      const data = (await response.json()) as UserRow[]
      setUsers(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.')
    } finally {
      setLoading(false)
    }
  }

  const loadOrganization = async () => {
    try {
      setOrganization(await fetchOrganization())
    } catch {
      /* le panneau organisation affiche déjà l’erreur */
    }
  }

  useEffect(() => {
    void loadUsers()
    void loadOrganization()
  }, [])

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)
    setError(null)
    setMessage(null)

    try {
      const csrfToken = getCsrfToken()
      const isEditing = editingUserId !== null
      const response = await fetch(isEditing ? `/api/admin/users/${editingUserId}/` : '/api/admin/users/', {
        method: isEditing ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          ...(form.password ? { password: form.password } : {}),
          profile: {
            role: form.role,
            scope: form.scope,
            poste: form.poste.trim(),
            organisation: '',
            departement_id: form.departement_id ? Number(form.departement_id) : null,
            structure_id: form.structure_id ? Number(form.structure_id) : null,
          },
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const messageText =
          typeof payload.detail === 'string'
            ? payload.detail
            : typeof payload.non_field_errors?.[0] === 'string'
              ? payload.non_field_errors[0]
              : 'L’enregistrement du compte a échoué.'
        throw new Error(messageText)
      }

      setMessage(editingUserId ? `Compte mis à jour : ${payload.username || form.username}` : `Compte créé : ${payload.username || form.username}`)
      setEditingUserId(null)
      setForm({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: 'coordination',
        scope: 'national',
        poste: '',
        departement_id: '',
        structure_id: '',
      })
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.')
    } finally {
      setCreating(false)
    }
  }

  const emptyUserForm = {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'coordination',
    scope: 'national',
    poste: '',
    departement_id: '',
    structure_id: '',
  }

  const handleEditUser = (user: UserRow) => {
    setEditingUserId(user.id)
    setForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      password: '',
      role: user.profile?.role || 'coordination',
      scope: user.profile?.scope || 'national',
      poste: user.profile?.poste || '',
      departement_id: user.profile?.departement ? String(user.profile.departement.id) : '',
      structure_id: user.profile?.structure ? String(user.profile.structure.id) : '',
    })
  }

  const handleDeleteUser = async (user: UserRow) => {
    if (!window.confirm(`Supprimer le compte ${user.username} ?`)) return
    try {
      const csrfToken = getCsrfToken()
      const response = await fetch(`/api/admin/users/${user.id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
      })
      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.detail || 'La suppression a échoué.')
      }
      setMessage(`Compte supprimé : ${user.username}`)
      if (editingUserId === user.id) {
        setEditingUserId(null)
        setForm(emptyUserForm)
      }
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Administration"
        description="Gestion des comptes, des rôles et de la gouvernance des droits de la plateforme."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {adminSections.map((s) => {
          const Icon = s.icon
          const isActive = activeSection === s.id
          return (
            <Link
              key={s.id}
              to={s.path}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-institutional-blue text-white'
                  : 'border border-[#e8ecf0] bg-white text-dark-text/70 hover:bg-light-gray'
              }`}
            >
              <Icon className="h-4 w-4" /> {s.label}
            </Link>
          )
        })}
      </div>

      {activeSection === 'users' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Utilisateurs', value: String(users.length) },
              { label: 'Admin ORHS', value: String(users.filter((u) => u.profile?.role === 'admin').length) },
              { label: 'Coordination', value: String(users.filter((u) => u.profile?.role === 'coordination').length) },
              { label: 'Collecteurs', value: String(users.filter((u) => u.profile?.role === 'collecteur').length) },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-dark-text/50">{m.label}</p>
                <p className="mt-3 text-2xl font-bold text-institutional-blue">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-institutional-blue">
                {editingUserId ? 'Modifier un compte' : 'Créer un compte'}
              </h2>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateUser}>
              <label className="grid gap-1 text-sm font-medium text-dark-text">
                Identifiant
                <input
                  value={form.username}
                  onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                  required
                  disabled={Boolean(editingUserId)}
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-dark-text">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                  required
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-dark-text">
                Prénom
                <input
                  value={form.first_name}
                  onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
                  className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-dark-text">
                Nom
                <input
                  value={form.last_name}
                  onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
                  className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-dark-text">
                Mot de passe {editingUserId ? '(laisser vide pour conserver)' : ''}
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                  required={!editingUserId}
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-dark-text">
                Poste / fonction
                <input
                  value={form.poste}
                  onChange={(event) => setForm((current) => ({ ...current, poste: event.target.value }))}
                  className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-dark-text">
                Rôle
                <select
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-medium text-dark-text">
                Périmètre
                <select
                  value={form.scope}
                  onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value }))}
                  className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                >
                  {SCOPE_OPTIONS.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope}
                    </option>
                  ))}
                </select>
              </label>

              {form.scope !== 'national' && (
                <label className="grid gap-1 text-sm font-medium text-dark-text">
                  Département
                  <select
                    value={form.departement_id}
                    onChange={(event) => setForm((current) => ({ ...current, departement_id: event.target.value }))}
                    className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                    required={form.scope === 'departemental'}
                  >
                    <option value="">Sélectionner</option>
                    {organization.departements
                      .filter((department) => department.actif !== false)
                      .map((department) => (
                        <option key={department.id} value={String(department.id)}>
                          {department.nom}
                        </option>
                      ))}
                  </select>
                </label>
              )}

              {form.scope === 'structure' && (
                <label className="grid gap-1 text-sm font-medium text-dark-text">
                  Structure
                  <select
                    value={form.structure_id}
                    onChange={(event) => {
                      const structure = organization.structures.find((row) => String(row.id) === event.target.value)
                      setForm((current) => ({
                        ...current,
                        structure_id: event.target.value,
                        departement_id: structure?.departement ? String(structure.departement.id) : current.departement_id,
                      }))
                    }}
                    className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2 outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
                    required
                  >
                    <option value="">Sélectionner</option>
                    {organization.structures
                      .filter((structure) => structure.actif !== false)
                      .filter((structure) => !form.departement_id || String(structure.departement?.id ?? '') === form.departement_id)
                      .map((structure) => (
                        <option key={structure.id} value={String(structure.id)}>
                          {structure.nom}
                        </option>
                      ))}
                  </select>
                </label>
              )}

              <div className="md:col-span-2 flex justify-end gap-2">
                {editingUserId !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUserId(null)
                      setForm(emptyUserForm)
                    }}
                    className="rounded-lg border border-[#e8ecf0] bg-white px-4 py-2 text-sm font-semibold text-dark-text"
                  >
                    Annuler
                  </button>
                )}
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d6b45] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {creating ? 'Enregistrement...' : editingUserId ? 'Mettre à jour' : 'Créer le compte'}
                </button>
              </div>
            </form>

            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {message && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
          </div>

          <div className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-institutional-blue">Utilisateurs enregistrés</h2>

            {loading ? (
              <p className="text-sm text-dark-text/60">Chargement...</p>
            ) : users.length === 0 ? (
              <EmptyState title="Aucun utilisateur" description="Aucun compte n'est encore enregistré dans le système." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[#e8ecf0] text-xs uppercase text-dark-text/50">
                    <tr>
                      <th className="px-3 py-2">Utilisateur</th>
                      <th className="px-3 py-2">Rôle</th>
                      <th className="px-3 py-2">Périmètre</th>
                      <th className="px-3 py-2">Rattachement</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-[#f0f2f5] last:border-none">
                        <td className="px-3 py-3">
                          <div className="font-medium text-dark-text">{user.full_name || user.username}</div>
                          <div className="text-xs text-dark-text/55">@{user.username}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-light-gray px-2 py-1 text-xs font-medium text-dark-text/70">
                            {user.profile?.role_label || user.profile?.role || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-dark-text/70">
                          {user.profile?.scope_label || user.profile?.scope || '—'}
                        </td>
                        <td className="px-3 py-3 text-dark-text/70">
                          {user.profile?.structure?.nom || user.profile?.departement?.nom || 'National'}
                        </td>
                        <td className="px-3 py-3 text-dark-text/70">{user.email || '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleEditUser(user)} className="text-xs text-institutional-blue hover:underline">
                              Éditer
                            </button>
                            <button type="button" onClick={() => void handleDeleteUser(user)} className="text-xs text-red-600 hover:underline">
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-institutional-blue">7 rôles RBAC ORHS</h2>
            <div className="flex flex-wrap gap-2">
              {['Admin', 'Coordination', 'Analyste', 'Validateur', 'Collecteur', 'Décideur', 'Partenaire'].map((r) => (
                <span key={r} className="rounded-full bg-light-gray px-3 py-1 text-xs font-medium text-dark-text/70">
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'organisation' && <OrganizationPanel />}

      {activeSection === 'content' && (
        <div className="space-y-10">
          <div>
            <h2 className="mb-4 text-lg font-semibold text-institutional-blue">Publications</h2>
            <CmsContentPanel />
          </div>
          <div>
            <h2 className="mb-4 text-lg font-semibold text-institutional-blue">Contenu du site public</h2>
            <EditorialCmsPanel />
          </div>
        </div>
      )}

      {activeSection === 'config' && <AlertsConfigPanel />}

      {activeSection === 'audit' && <AuditPanel />}

      {activeSection === 'integrations' && (
        <EmptyState
          title="Aucune intégration active"
          description="DHIS2, Fonction Publique et export NHWA — passerelles à connecter. Seul l'import Excel ORHS est opérationnel."
        />
      )}

      {activeSection === 'monitoring' && <MonitoringPanel />}
    </div>
  )
}
