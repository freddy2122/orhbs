import { PageHeader } from '../../components/dashboard/PageHeader'
import { CmsContentPanel } from '../../components/dashboard/CmsContentPanel'
import { EditorialCmsPanel } from '../../components/dashboard/EditorialCmsPanel'
import { useDashboardRole } from '../../contexts/AuthContext'

export function RedactionDashboardPage() {
  const { role } = useDashboardRole()
  const isReviewer = role === 'coordination'

  return (
    <div className="space-y-10">
      <PageHeader
        title="Rédaction & publication"
        description={
          isReviewer
            ? 'Relisez les contenus soumis, publiez-les ou renvoyez-les avec un motif. Vous ne pouvez pas publier un contenu que vous avez rédigé, modifié ou soumis vous-même.'
            : 'Rédigez vos brouillons puis soumettez-les à relecture. La publication sur le site est faite par la coordination.'
        }
      />
      <section>
        <h2 className="mb-4 text-lg font-semibold text-institutional-black">Publications</h2>
        <CmsContentPanel />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-institutional-black">Contenu du site public</h2>
        <EditorialCmsPanel canManageDirectory={isReviewer} />
      </section>
    </div>
  )
}
