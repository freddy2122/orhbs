/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, Calendar, Clock, MapPin, Newspaper } from 'lucide-react'
import { OPPORTUNITY_TYPE_LABELS, type Opportunity } from '../constants/publicSpace'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { NewsletterForm } from '../components/ui/NewsletterForm'
import { Spinner } from '../components/ui/Spinner'
import { fetchPublicContenus, fetchPublicContenu, type ContenuEditorial } from '../lib/editorial-api'

type TabId = 'news' | 'events' | 'opportunites'

const TAB_LABELS: Record<TabId, string> = {
  news: 'Actualités',
  events: 'Agenda',
  opportunites: 'Opportunités',
}

const OPPORTUNITY_COLORS: Record<string, string> = {
  concours: 'bg-blue-100 text-blue-800',
  recrutement: 'bg-green-100 text-green-800',
  bourse: 'bg-purple-100 text-purple-800',
  communique: 'bg-amber-100 text-amber-800',
}

export function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab: TabId =
    tabParam === 'opportunites' ? 'opportunites' : tabParam === 'events' ? 'events' : 'news'
  const [tab, setTab] = useState<TabId>(initialTab)
  const [oppFilter, setOppFilter] = useState<Opportunity['type'] | 'all'>('all')
  const [news, setNews] = useState<ContenuEditorial[]>([])
  const [events, setEvents] = useState<ContenuEditorial[]>([])
  const [opps, setOpps] = useState<ContenuEditorial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (tabParam === 'opportunites') setTab('opportunites')
    else if (tabParam === 'events') setTab('events')
    else if (tabParam === 'news') setTab('news')
  }, [tabParam])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchPublicContenus('actualite'),
      fetchPublicContenus('evenement'),
      fetchPublicContenus('opportunite'),
    ])
      .then(([n, e, o]) => {
        setNews(n)
        setEvents(e)
        setOpps(o)
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const switchTab = (t: TabId) => {
    setTab(t)
    setSearchParams(t === 'news' ? {} : { tab: t })
  }

  const filteredOpportunities = oppFilter === 'all'
    ? opps
    : opps.filter((o) => o.categorie === oppFilter)

  return (
    <main>
      <PageBanner
        label="Veille"
        title="Actualités & Opportunités"
        description="Communiqués officiels, concours, recrutements de l'État, bourses de formation et agenda des événements."
      />

      <section className="border-b border-[#e8ecf0] bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {(['news', 'events', 'opportunites'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                tab === t ? 'border-health-green text-health-green' : 'border-transparent text-dark-text/60 hover:text-institutional-blue'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="h-7 w-7 text-health-green" /></div>
          ) : error ? (
            <EmptyState title="Contenu indisponible" description={error} icon={Newspaper} />
          ) : tab === 'news' ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {news.length === 0 ? (
                  <EmptyState
                    title="Aucune actualité"
                    description="Les communiqués et annonces de l'ORHS Bénin seront publiés ici dès qu'ils seront disponibles."
                    icon={Newspaper}
                  />
                ) : (
                  news.map((article) => (
                    <Link
                      key={article.id}
                      to={`/actualites/${article.slug}`}
                      className="group flex gap-4 rounded-lg border border-[#e8ecf0] bg-white p-5 transition-all hover:border-health-green/30 hover:shadow-sm sm:p-6"
                    >
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wider text-health-green">{article.categorie || 'Actualité'}</span>
                        <h2 className="mt-1 text-lg font-semibold text-institutional-blue group-hover:text-health-green">{article.titre}</h2>
                        <p className="mt-2 line-clamp-2 text-sm text-dark-text/60">{article.resume}</p>
                        {article.date_publication && (
                          <time className="mt-2 block text-xs text-dark-text/50">{new Date(article.date_publication).toLocaleDateString('fr-FR')}</time>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
              <aside className="rounded-xl border border-[#e8ecf0] bg-light-gray/30 p-6">
                <h3 className="font-semibold text-institutional-blue">Newsletter</h3>
                <p className="mt-2 text-sm text-dark-text/60">Recevez publications et actualités par e-mail.</p>
                <div className="mt-4"><NewsletterForm /></div>
              </aside>
            </div>
          ) : tab === 'events' ? (
            events.length === 0 ? (
              <EmptyState
                title="Aucun événement"
                description="L'agenda des événements et activités de l'ORHS Bénin sera publié ici prochainement."
                icon={Calendar}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {events.map((event) => (
                  <article key={event.id} className="rounded-lg border border-[#e8ecf0] bg-white p-6">
                    <span className="rounded bg-gold-accent/15 px-2 py-0.5 text-xs font-medium text-[#9a7a2a]">{event.categorie || 'Événement'}</span>
                    <h3 className="mt-2 font-semibold text-institutional-blue">{event.titre}</h3>
                    {(event.date_debut || event.date_publication) && (
                      <p className="mt-3 flex items-center gap-2 text-sm text-dark-text/60">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.date_debut || event.date_publication || '').toLocaleDateString('fr-FR')}
                        {event.date_fin && ` — ${new Date(event.date_fin).toLocaleDateString('fr-FR')}`}
                      </p>
                    )}
                    {event.lieu && (
                      <p className="mt-1 flex items-center gap-2 text-sm text-dark-text/60">
                        <MapPin className="h-4 w-4" /> {event.lieu}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )
          ) : (
            <div>
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOppFilter('all')}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    oppFilter === 'all' ? 'bg-health-green text-white' : 'bg-light-gray text-dark-text/70'
                  }`}
                >
                  Tous
                </button>
                {(Object.keys(OPPORTUNITY_TYPE_LABELS) as Opportunity['type'][]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOppFilter(type)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                      oppFilter === type ? 'bg-health-green text-white' : 'bg-light-gray text-dark-text/70'
                    }`}
                  >
                    {OPPORTUNITY_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
              {filteredOpportunities.length === 0 ? (
                <EmptyState
                  title="Aucune opportunité"
                  description="Les concours, recrutements et bourses seront publiés ici dès qu'ils seront disponibles."
                  icon={Briefcase}
                />
              ) : (
                <div className="space-y-4">
                  {filteredOpportunities.map((opp) => (
                    <article key={opp.id} className="rounded-xl border border-[#e8ecf0] bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${OPPORTUNITY_COLORS[opp.categorie] || 'bg-blue-100 text-blue-800'}`}>
                          {OPPORTUNITY_TYPE_LABELS[opp.categorie as Opportunity['type']] || opp.categorie || 'Opportunité'}
                        </span>
                        {opp.date_fin && (
                          <span className="flex items-center gap-1 text-xs text-dark-text/50">
                            <Clock className="h-3.5 w-3.5" />
                            Échéance : {new Date(opp.date_fin).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-institutional-blue">{opp.titre}</h3>
                      {opp.organisation && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-dark-text/55">
                          <Briefcase className="h-4 w-4" /> {opp.organisation}
                        </p>
                      )}
                      <p className="mt-3 text-sm leading-relaxed text-dark-text/70">{opp.resume}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export function NewsDetailPage() {
  const { slug } = useParams()
  const [article, setArticle] = useState<ContenuEditorial | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }
    fetchPublicContenu(slug)
      .then(setArticle)
      .catch(() => setArticle(null))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <main className="py-20">
        <div className="flex justify-center"><Spinner className="h-7 w-7 text-health-green" /></div>
      </main>
    )
  }

  if (!article) {
    return (
      <main className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <EmptyState
            title="Aucune actualité"
            description="Cet article n'existe pas ou n'a pas encore été publié."
            icon={Newspaper}
          />
          <div className="mt-6 text-center">
            <Link to="/actualites" className="text-health-green">Retour aux actualités</Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main>
      <PageBanner label={article.categorie || 'Actualité'} title={article.titre} />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex flex-wrap gap-4 text-sm text-dark-text/60">
          {article.date_publication && <time>{new Date(article.date_publication).toLocaleDateString('fr-FR')}</time>}
          {article.auteur_full && <span>{article.auteur_full}</span>}
        </div>
        <div className="prose prose-sm max-w-none leading-relaxed text-dark-text/80 whitespace-pre-wrap">
          <p>{article.contenu || article.resume}</p>
        </div>
        <nav className="mt-12 border-t border-[#e8ecf0] pt-8">
          <Link to="/actualites" className="inline-flex items-center gap-2 text-sm font-medium text-institutional-blue">
            <ArrowLeft className="h-4 w-4" /> Retour aux actualités
          </Link>
        </nav>
      </article>
    </main>
  )
}
