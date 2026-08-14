import { Link, useLocation } from 'react-router-dom'
import {
  Activity,
  Database,
  FileText,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'

const adminSections = [
  { id: 'users', label: 'Utilisateurs & rôles', icon: Users, path: '/dashboard/admin' },
  { id: 'content', label: 'Contenu CMS', icon: FileText, path: '/dashboard/admin/contenu' },
  { id: 'config', label: 'Configuration', icon: Settings, path: '/dashboard/admin/config' },
  { id: 'audit', label: 'Audit & sécurité', icon: Shield, path: '/dashboard/admin/audit' },
  { id: 'integrations', label: 'Intégrations', icon: Database, path: '/dashboard/admin/integrations' },
  { id: 'monitoring', label: 'Monitoring', icon: Activity, path: '/dashboard/admin/monitoring' },
] as const

function getAdminSection(pathname: string) {
  if (pathname.endsWith('/contenu')) return 'content'
  if (pathname.endsWith('/config')) return 'config'
  if (pathname.endsWith('/audit')) return 'audit'
  if (pathname.endsWith('/integrations')) return 'integrations'
  if (pathname.endsWith('/monitoring')) return 'monitoring'
  return 'users'
}

export function AdminDashboardPage() {
  const location = useLocation()
  const activeSection = getAdminSection(location.pathname)

  return (
    <div>
      <PageHeader
        title="Administration"
        description="Gestion des comptes, contenu, configuration et supervision technique."
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
          <EmptyState
            title="Aucun utilisateur listé via l'interface"
            description="La gestion des comptes se fait actuellement via Django Admin (/admin/) ou la commande seed_orhsb. Un module CRUD utilisateurs sera ajouté ici."
          />
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

      {activeSection === 'content' && (
        <EmptyState
          title="CMS non configuré"
          description="Aucun contenu éditorial (actualités, publications, FAQ) n'est géré depuis cette interface. Module CMS à développer."
        />
      )}

      {activeSection === 'config' && (
        <EmptyState
          title="Configuration système"
          description="Calendrier de collecte, seuils d'alerte et nomenclatures — à configurer via l'administration Django ou un futur panneau de configuration."
        />
      )}

      {activeSection === 'audit' && (
        <EmptyState
          title="Aucun journal d'audit"
          description="Les traces de connexion et actions sensibles seront enregistrées lorsque le module audit sera activé."
        />
      )}

      {activeSection === 'integrations' && (
        <EmptyState
          title="Aucune intégration active"
          description="DHIS2, Fonction Publique et export NHWA — passerelles à connecter. Seul l'import Excel ORHS est opérationnel."
        />
      )}

      {activeSection === 'monitoring' && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Temps réponse API', value: '—' },
            { label: 'Erreurs 500 (24h)', value: '0' },
            { label: 'Visiteurs site public', value: '—' },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-[#e8ecf0] bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-dark-text/50">{m.label}</p>
              <p className="mt-1 text-2xl font-bold text-dark-text/40">{m.value}</p>
            </div>
          ))}
          <p className="col-span-full text-center text-xs text-dark-text/45">
            Monitoring applicatif non connecté — métriques indisponibles.
          </p>
        </div>
      )}
    </div>
  )
}
