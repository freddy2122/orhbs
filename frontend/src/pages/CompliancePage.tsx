import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { PageBanner } from '../components/ui/PageBanner'
import { EmptyState } from '../components/ui/EmptyState'
import {
  getCartographyUrl,
  getRegistryDisplayName,
  getRegistryEntryById,
  PRACTICE_MODE_LABELS,
  PUBLIC_REGISTRY,
  REGISTRY_DEPARTMENTS,
  REGISTRY_SPECIALTIES,
  REGISTRY_STATUS_LABELS,
  searchRegistry,
  type RegistryEntry,
  type RegistryStatus,
} from '../constants/registryData'

type SearchType = 'all' | 'medecin' | 'clinique'

const STATUS_STYLES: Record<RegistryStatus, { card: string; badge: string; label: string }> = {
  inscrit: { card: 'border-green-200 bg-green-50', badge: 'bg-green-100 text-green-800', label: 'Inscription confirmée' },
  suspendu: { card: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-800', label: 'Inscription suspendue' },
  radie: { card: 'border-red-200 bg-red-50', badge: 'bg-red-100 text-red-800', label: 'Non inscrit ou radié' },
}

function RegistryResult({ entry }: { entry: RegistryEntry }) {
  const [expanded, setExpanded] = useState(entry.status === 'inscrit')
  const style = STATUS_STYLES[entry.status]
  const displayName = getRegistryDisplayName(entry)
  const mapUrl = getCartographyUrl(entry)

  return (
    <article className={`rounded-xl border p-5 ${style.card}`}>
      <div className="flex items-start gap-3">
        {entry.status === 'inscrit' ? (
          <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
        ) : entry.status === 'suspendu' ? (
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
        ) : (
          <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={`text-sm font-semibold ${entry.status === 'inscrit' ? 'text-green-800' : entry.status === 'suspendu' ? 'text-amber-800' : 'text-red-800'}`}>
                {style.label}
              </p>
              <h3 className="mt-1 text-lg font-bold text-institutional-blue">{displayName}</h3>
              {entry.registrationNumber !== '—' && (
                <p className="mt-0.5 font-mono text-sm text-dark-text/70">N° {entry.registrationNumber}</p>
              )}
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
              {REGISTRY_STATUS_LABELS[entry.status]}
            </span>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Ordre professionnel" value={entry.order} />
            {entry.specialty && <Field label="Spécialité" value={entry.specialty} />}
            <Field label="Département" value={entry.dept} />
            <Field label="Commune" value={entry.commune} />
            <Field
              label="Inscrit depuis"
              value={entry.registeredSince !== '—' ? new Date(entry.registeredSince).toLocaleDateString('fr-FR') : '—'}
            />
            {entry.lastVerificationDate && (
              <Field
                label="Dernière vérification"
                value={new Date(entry.lastVerificationDate).toLocaleDateString('fr-FR')}
              />
            )}
          </dl>

          {entry.suspensions && (
            <p className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-xs font-medium text-red-700">
              {entry.suspensions}
            </p>
          )}

          {mapUrl && (
            <Link
              to={mapUrl}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-institutional-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#092d52]"
            >
              <MapPin className="h-4 w-4" />
              Voir sur la carte
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-health-green hover:underline"
          >
            {expanded ? <><ChevronUp className="h-4 w-4" /> Masquer les détails</> : <><ChevronDown className="h-4 w-4" /> Voir tous les champs</>}
          </button>

          {expanded && entry.status !== 'radie' && (
            <div className="mt-4 border-t border-black/5 pt-4">
              {entry.type === 'medecin' ? (
                <MedecinDetails entry={entry} />
              ) : (
                <CliniqueDetails entry={entry} />
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  if (value === '—' || !value) return null
  return (
    <div>
      <dt className="text-dark-text/50">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function MedecinDetails({ entry }: { entry: RegistryEntry }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {entry.nationality && <Field label="Nationalité" value={entry.nationality} />}
      {entry.university && <Field label="Université de formation" value={entry.university} />}
      {entry.graduationYear && <Field label="Année de diplôme" value={String(entry.graduationYear)} />}
      {entry.practiceMode && <Field label="Mode d'exercice" value={PRACTICE_MODE_LABELS[entry.practiceMode]} />}
      {entry.workplace && (
        <div className="sm:col-span-2">
          <dt className="flex items-center gap-1 text-dark-text/50"><Briefcase className="h-3.5 w-3.5" /> Lieu d'exercice</dt>
          <dd className="font-medium">{entry.workplace}</dd>
        </div>
      )}
      {entry.address && (
        <div className="sm:col-span-2">
          <dt className="flex items-center gap-1 text-dark-text/50"><MapPin className="h-3.5 w-3.5" /> Adresse professionnelle</dt>
          <dd className="font-medium">{entry.address}</dd>
        </div>
      )}
      {entry.phone && (
        <div>
          <dt className="flex items-center gap-1 text-dark-text/50"><Phone className="h-3.5 w-3.5" /> Téléphone</dt>
          <dd className="font-medium">{entry.phone}</dd>
        </div>
      )}
      {entry.email && <Field label="E-mail" value={entry.email} />}
    </dl>
  )
}

function CliniqueDetails({ entry }: { entry: RegistryEntry }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {entry.director && <Field label="Directeur médical" value={entry.director} />}
      {entry.authorizationNumber && <Field label="N° autorisation MS" value={entry.authorizationNumber} />}
      {entry.authorizationExpiry && (
        <div>
          <dt className="flex items-center gap-1 text-dark-text/50"><Calendar className="h-3.5 w-3.5" /> Validité autorisation</dt>
          <dd className="font-medium">{new Date(entry.authorizationExpiry).toLocaleDateString('fr-FR')}</dd>
        </div>
      )}
      {entry.beds !== undefined && <Field label="Capacité" value={`${entry.beds} lits`} />}
      {entry.address && (
        <div className="sm:col-span-2">
          <dt className="flex items-center gap-1 text-dark-text/50"><MapPin className="h-3.5 w-3.5" /> Adresse</dt>
          <dd className="font-medium">{entry.address}</dd>
        </div>
      )}
      {entry.phone && (
        <div>
          <dt className="flex items-center gap-1 text-dark-text/50"><Phone className="h-3.5 w-3.5" /> Téléphone</dt>
          <dd className="font-medium">{entry.phone}</dd>
        </div>
      )}
      {entry.services && entry.services.length > 0 && (
        <div className="sm:col-span-2">
          <dt className="mb-2 text-dark-text/50">Services autorisés</dt>
          <dd className="flex flex-wrap gap-1.5">
            {entry.services.map((s) => (
              <span key={s} className="rounded-full bg-white px-2.5 py-0.5 text-xs ring-1 ring-black/10">{s}</span>
            ))}
          </dd>
        </div>
      )}
    </dl>
  )
}

export function CompliancePage() {
  const [searchParams] = useSearchParams()
  const registryParam = searchParams.get('registry')

  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('all')
  const [dept, setDept] = useState('Tous')
  const [specialty, setSpecialty] = useState('Toutes')
  const [status, setStatus] = useState<RegistryStatus | 'all'>('all')
  const [searched, setSearched] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (!registryParam) return
    const entry = getRegistryEntryById(registryParam)
    if (!entry) return
    setQuery(entry.name)
    setSearchType(entry.type === 'clinique' ? 'clinique' : 'medecin')
    setSearched(true)
  }, [registryParam])

  const stats = useMemo(() => ({
    medecins: PUBLIC_REGISTRY.filter((e) => e.type === 'medecin' && e.status === 'inscrit').length,
    cliniques: PUBLIC_REGISTRY.filter((e) => e.type === 'clinique' && e.status === 'inscrit').length,
    suspendus: PUBLIC_REGISTRY.filter((e) => e.status === 'suspendu').length,
  }), [])

  const results = useMemo(() => {
    if (registryParam) {
      const entry = getRegistryEntryById(registryParam)
      return entry ? [entry] : []
    }
    return searchRegistry(PUBLIC_REGISTRY, { query, type: searchType, dept, specialty, status })
  }, [registryParam, query, searchType, dept, specialty, status])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearched(true)
  }

  return (
    <main>
      <PageBanner
        label="Annuaire public"
        title="Vérification de conformité"
        description="Recherche avancée dans l'annuaire des Ordres Nationaux — médecins et cliniques légalement inscrits."
      />

      <section className="border-b border-[#e8ecf0] bg-institutional-blue py-8">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-4 sm:px-6">
          {[
            { label: 'Médecins inscrits', value: stats.medecins, icon: GraduationCap },
            { label: 'Cliniques agréées', value: stats.cliniques, icon: ShieldCheck },
            { label: 'Suspensions actives', value: stats.suspendus, icon: AlertTriangle },
          ].map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-lg bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                <Icon className="mx-auto h-5 w-5 text-gold-accent" />
                <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/70">{s.label}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="border-b border-[#e8ecf0] bg-amber-50 py-4">
        <div className="mx-auto flex max-w-4xl items-start gap-3 px-4 sm:px-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-dark-text/70">
            En cas de doute, contactez l&apos;Ordre National des Médecins du Bénin. Cet outil est une aide à la vérification, pas un substitut à l&apos;avis officiel de l&apos;Ordre.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {PUBLIC_REGISTRY.length === 0 ? (
            <EmptyState
              title="Aucune donnée disponible"
              description="L'annuaire public des Ordres professionnels sera accessible ici une fois alimenté par les sources officielles."
              icon={ShieldCheck}
            />
          ) : (
            <>
          <form onSubmit={handleSearch} className="rounded-xl border border-[#e8ecf0] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-health-green" />
              <h2 className="font-semibold text-institutional-blue">Rechercher dans l&apos;annuaire</h2>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {([
                ['all', 'Tous'],
                ['medecin', 'Médecins'],
                ['clinique', 'Cliniques'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSearchType(value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    searchType === value ? 'bg-health-green text-white' : 'bg-light-gray text-dark-text/70 hover:bg-[#e8ecf0]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSearched(false) }}
                placeholder="Nom, n° inscription, spécialité, commune, directeur…"
                className="flex-1 rounded-lg border border-[#dde3ea] px-4 py-3 text-sm outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-health-green px-5 py-3 text-sm font-semibold text-white hover:bg-[#0d6b45]"
              >
                <Search className="h-4 w-4" /> Vérifier
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-institutional-blue hover:underline"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Recherche avancée
            </button>

            {showAdvanced && (
              <div className="mt-4 grid gap-4 border-t border-[#e8ecf0] pt-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-dark-text/50">Département</label>
                  <select value={dept} onChange={(e) => setDept(e.target.value)} className="w-full rounded-lg border border-[#dde3ea] px-3 py-2 text-sm">
                    {REGISTRY_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-dark-text/50">Spécialité</label>
                  <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full rounded-lg border border-[#dde3ea] px-3 py-2 text-sm">
                    {REGISTRY_SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-dark-text/50">Statut</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as RegistryStatus | 'all')} className="w-full rounded-lg border border-[#dde3ea] px-3 py-2 text-sm">
                    <option value="all">Tous</option>
                    {(Object.keys(REGISTRY_STATUS_LABELS) as RegistryStatus[]).map((s) => (
                      <option key={s} value={s}>{REGISTRY_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <p className="mt-3 text-xs text-dark-text/45">
              Exemples : « Kouassi », « ONM-BEN-2018 », « Cardiologie », « St Luc »
            </p>
          </form>

          {searched && (
            <div className="mt-8">
              <p className="mb-4 text-sm text-dark-text/60">
                {results.length} résultat{results.length !== 1 ? 's' : ''} trouvé{results.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-4">
                {results.length > 0 ? (
                  results.map((entry) => <RegistryResult key={entry.id} entry={entry} />)
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                    <XCircle className="mx-auto h-10 w-10 text-amber-600" />
                    <p className="mt-3 font-semibold text-amber-900">Aucun résultat trouvé</p>
                    <p className="mt-1 text-sm text-amber-800">
                      Ce praticien ou établissement n&apos;apparaît pas dans l&apos;annuaire public.
                      Signalez toute suspicion d&apos;exercice illégal au Ministère de la Santé.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
