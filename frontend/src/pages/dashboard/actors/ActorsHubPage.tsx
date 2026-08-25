import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from '../../../components/dashboard/PageHeader'
import { SecureActorsNotice } from '../../../components/dashboard/SecureActorsNotice'
import { localizeDashboardHref } from '../../../constants/dashboard'
import { ACTOR_MODULES, getActorModulesForRole } from '../../../constants/healthActors'
import { useDashboardRole } from '../../../contexts/AuthContext'

export function ActorsHubPage() {
  const { role } = useDashboardRole()
  const modules = getActorModulesForRole(role)

  return (
    <div>
      <PageHeader
        title="Espace Acteurs de la Santé"
        description="Outil de travail quotidien des équipes ORHS, collecteurs et validateurs."
      />
      <SecureActorsNotice />

      {modules.length === 0 ? (
        <p className="rounded-xl border border-[#e8ecf0] bg-white p-8 text-center text-sm text-dark-text/60">
          Votre profil n&apos;a pas accès aux modules acteurs.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {modules.map((mod) => {
            const Icon = mod.icon
            return (
              <article
                key={mod.id}
                className="group flex flex-col rounded-xl border border-[#e8ecf0] bg-white p-6 shadow-sm transition-all hover:border-health-green/30 hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-institutional-blue/10 text-institutional-blue">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h2 className="text-lg font-semibold text-institutional-blue">{mod.title}</h2>
                <p className="mt-2 flex-1 text-sm text-dark-text/65">{mod.description}</p>
                <p className="mt-3 rounded-lg bg-light-gray/50 px-3 py-2 text-xs text-dark-text/55">
                  <span className="font-medium text-health-green">Utilité : </span>
                  {mod.utility}
                </p>
                <Link
                  to={localizeDashboardHref(role, mod.href)}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-health-green group-hover:gap-2.5"
                >
                  Accéder <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            )
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-dark-text/45">
        {modules.length} module{modules.length !== 1 ? 's' : ''} accessible{modules.length !== 1 ? 's' : ''} sur {ACTOR_MODULES.length} — selon votre profil RBAC.
      </p>
    </div>
  )
}
