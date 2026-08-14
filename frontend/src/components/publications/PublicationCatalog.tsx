import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Download, FileText } from 'lucide-react'
import {
  PUBLICATIONS,
  PUBLICATION_THEMES,
  PUBLICATION_TYPES,
  type Publication,
} from '../../constants/publicationsData'
import { EmptyState } from '../ui/EmptyState'
import { PUBLIC_DATA_NOTICE } from '../../lib/security'

type Props = {
  archivesOnly?: boolean
  limit?: number
}

export function PublicationCatalog({ archivesOnly = false, limit }: Props) {
  const [typeFilter, setTypeFilter] = useState('Tous')
  const [themeFilter, setThemeFilter] = useState('Tous')
  const [yearFilter, setYearFilter] = useState('Tous')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = limit ?? 6

  const filtered = useMemo(() => {
    return PUBLICATIONS.filter((p) => {
      if (archivesOnly ? !p.isArchive : p.isArchive) return false
      if (typeFilter !== 'Tous' && p.type !== typeFilter) return false
      if (themeFilter !== 'Tous' && p.theme !== themeFilter) return false
      if (yearFilter !== 'Tous' && p.year !== Number(yearFilter)) return false
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [archivesOnly, typeFilter, themeFilter, yearFilter, search])

  const years = [...new Set(PUBLICATIONS.map((p) => p.year))].sort((a, b) => b - a)
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div>
      {!limit && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            placeholder="Rechercher une publication…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="rounded-lg border border-[#dde3ea] px-4 py-2.5 text-sm outline-none focus:border-health-green/40 sm:col-span-2"
          />
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} className="rounded-lg border border-[#dde3ea] px-3 py-2.5 text-sm">
            {PUBLICATION_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={themeFilter} onChange={(e) => { setThemeFilter(e.target.value); setPage(1) }} className="rounded-lg border border-[#dde3ea] px-3 py-2.5 text-sm">
            {PUBLICATION_THEMES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setPage(1) }} className="rounded-lg border border-[#dde3ea] px-3 py-2.5 text-sm lg:col-start-4">
            <option>Tous</option>
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {paginated.map((pub) => (
          <PublicationCard key={pub.id} pub={pub} />
        ))}
      </div>

      {paginated.length === 0 && (
        <EmptyState
          title="Aucune publication"
          description="Les rapports, bulletins et études produits par l'ORHS Bénin apparaîtront ici une fois publiés."
          icon={FileText}
        />
      )}

      {!limit && totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i + 1)}
              className={`h-9 w-9 rounded text-sm font-medium ${page === i + 1 ? 'bg-health-green text-white' : 'border border-[#dde3ea]'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-dark-text/50">{PUBLIC_DATA_NOTICE}</p>
    </div>
  )
}

function PublicationCard({ pub }: { pub: Publication }) {
  return (
    <article className="group flex flex-col rounded-lg border border-[#e8ecf0] bg-white p-6 shadow-sm transition-all hover:border-health-green/30 hover:shadow-md">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-institutional-blue/10 text-institutional-blue">
        <FileText className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <span className="text-xs font-medium uppercase tracking-wider text-health-green">{pub.type}</span>
      <h3 className="mt-2 flex-1 text-base font-semibold text-institutional-blue">{pub.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-dark-text/60">{pub.summary}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-dark-text/50">
        <span>{pub.year}</span>
        <span>{pub.downloads.toLocaleString('fr-FR')} téléchargements</span>
      </div>
      <div className="mt-4 flex gap-3">
        <Link to={`/publications/${pub.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-health-green">
          Voir la fiche <ArrowRight className="h-4 w-4" />
        </Link>
        <button type="button" className="inline-flex items-center gap-1 text-sm text-dark-text/50 hover:text-health-green">
          <Download className="h-4 w-4" /> PDF
        </button>
      </div>
    </article>
  )
}
