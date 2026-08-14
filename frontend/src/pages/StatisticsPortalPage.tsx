import { Link } from 'react-router-dom'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import {
  MINISTRY_REPORTS,
  STATISTICAL_YEARBOOKS,
} from '../constants/publicSpace'
import { PUBLICATIONS } from '../constants/publicationsData'
import { PUBLIC_DATA_NOTICE } from '../lib/security'

export function StatisticsPortalPage() {
  const relatedPublications = PUBLICATIONS.filter(
    (p) => p.type === 'Annuaire' || p.type === 'Rapport',
  ).slice(0, 4)

  return (
    <main>
      <PageBanner
        label="Documentation officielle"
        title="Portail des Statistiques & Rapports"
        description="Annuaires statistiques des ressources humaines en santé et bilans annuels du Ministère de la Santé — téléchargement libre."
      />

      <section className="border-b border-[#e8ecf0] bg-amber-50 py-3">
        <p className="mx-auto max-w-7xl px-4 text-center text-xs text-amber-900 sm:px-6">
          {PUBLIC_DATA_NOTICE} Documents agrégés, sans inscription requise.
        </p>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-health-green" />
            <div>
              <h2 className="text-xl font-semibold text-institutional-blue">Annuaires statistiques des RHS</h2>
              <p className="text-sm text-dark-text/60">Données consolidées par profession, département et secteur.</p>
            </div>
          </div>

          {STATISTICAL_YEARBOOKS.length === 0 ? (
            <EmptyState
              title="Aucune statistique publiée"
              description="Les annuaires statistiques des ressources humaines en santé seront disponibles ici après validation nationale."
              icon={FileSpreadsheet}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STATISTICAL_YEARBOOKS.map((book) => (
              <article key={book.id} className="rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
                <span className="rounded bg-health-green/10 px-2 py-0.5 text-xs font-medium text-health-green">
                  Annuaire {book.year}
                </span>
                <h3 className="mt-3 font-semibold text-institutional-blue">{book.title}</h3>
                <p className="mt-1 text-xs text-dark-text/50">{book.pages} pages · {book.format}</p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-health-green hover:underline"
                >
                  <Download className="h-4 w-4" /> Télécharger PDF
                </button>
              </article>
            ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-[#e8ecf0] bg-light-gray/30 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex items-center gap-3">
            <FileText className="h-6 w-6 text-institutional-blue" />
            <div>
              <h2 className="text-xl font-semibold text-institutional-blue">Bilans annuels du Ministère de la Santé</h2>
              <p className="text-sm text-dark-text/60">Rapports de performance et synthèses sectorielles.</p>
            </div>
          </div>

          {MINISTRY_REPORTS.length === 0 ? (
            <EmptyState
              title="Aucune statistique publiée"
              description="Les bilans annuels du Ministère de la Santé seront publiés ici une fois disponibles."
              icon={FileText}
            />
          ) : (
            <div className="space-y-3">
              {MINISTRY_REPORTS.map((report) => (
              <article
                key={report.id}
                className="flex flex-col gap-4 rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="text-xs font-medium text-gold-accent">{report.year}</span>
                  <h3 className="mt-1 font-semibold text-institutional-blue">{report.title}</h3>
                  <p className="text-sm text-dark-text/55">Thème : {report.theme}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#e8ecf0] px-4 py-2 text-sm font-medium hover:bg-light-gray"
                >
                  <Download className="h-4 w-4" /> PDF
                </button>
              </article>
            ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-6 text-xl font-semibold text-institutional-blue">Autres publications ORHS</h2>
          {relatedPublications.length === 0 ? (
            <EmptyState
              title="Aucune publication"
              description="Les rapports et études produits par l'ORHS Bénin apparaîtront ici une fois publiés."
              icon={FileText}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedPublications.map((pub) => (
              <Link
                key={pub.id}
                to={`/publications/${pub.id}`}
                className="rounded-lg border border-[#e8ecf0] bg-white p-4 transition-colors hover:border-health-green/30"
              >
                <span className="text-xs font-medium text-health-green">{pub.type} · {pub.year}</span>
                <h3 className="mt-1 font-medium text-institutional-blue">{pub.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-dark-text/55">{pub.summary}</p>
                </Link>
              ))}
              </div>
              <Link
                to="/publications"
                className="mt-6 inline-flex text-sm font-semibold text-health-green hover:underline"
              >
                Voir tout le catalogue →
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
