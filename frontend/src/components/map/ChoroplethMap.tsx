import {
  ChevronLeft,
  Download,
  GraduationCap,
  Info,
  MapPin,
  ZoomIn,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  DEPARTMENTS,
  getChoroplethFill,
  getDoctorRatio,
  getStaffCount,
  isMedicalDesert,
  NATIONAL_AVERAGE,
  TRAINING_INSTITUTIONS,
  type CommuneStats,
  type MapViewLevel,
  type ProfessionFilter,
  type Sector,
  type TerritoryStats,
} from '../../constants/mapData'
import { PUBLIC_DATA_NOTICE } from '../../lib/security'

const PROFESSION_OPTIONS: { value: ProfessionFilter; label: string }[] = [
  { value: 'all', label: 'Tous cumulés' },
  { value: 'medecins', label: 'Médecins' },
  { value: 'infirmiers', label: 'Infirmiers' },
  { value: 'sagesFemmes', label: 'Sages-femmes' },
  { value: 'cumul', label: 'Cumul professions' },
]

const SECTOR_OPTIONS: { value: Sector; label: string }[] = [
  { value: 'combined', label: 'Combiné' },
  { value: 'public', label: 'Public' },
  { value: 'prive', label: 'Privé' },
  { value: 'confessionnel', label: 'Confessionnel' },
]

type TooltipData = {
  name: string
  level: string
  medecins: number
  infirmiers: number
  sagesFemmes: number
  total: number
  ratio: number
  rank?: number
  vsNational: string
  isDesert: boolean
}

function buildTooltip(
  territory: TerritoryStats | CommuneStats,
  sector: Sector,
  rank?: number,
): TooltipData {
  const medecins = getStaffCount(territory.sectors, sector, 'medecins')
  const infirmiers = getStaffCount(territory.sectors, sector, 'infirmiers')
  const sagesFemmes = getStaffCount(territory.sectors, sector, 'sagesFemmes')
  const total = getStaffCount(territory.sectors, sector, 'all')
  const ratio = getDoctorRatio(territory.sectors, sector, territory.population)
  const diff = ratio - NATIONAL_AVERAGE.ratioPer10000
  return {
    name: territory.name,
    level: 'nationalRank' in territory ? 'Département' : 'Commune',
    medecins,
    infirmiers,
    sagesFemmes,
    total,
    ratio: Math.round(ratio * 100) / 100,
    rank,
    vsNational: diff >= 0 ? `+${diff.toFixed(1)} vs moyenne` : `${diff.toFixed(1)} vs moyenne`,
    isDesert: isMedicalDesert(territory.sectors, sector, territory.population),
  }
}

export function ChoroplethMap() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewLevel, setViewLevel] = useState<MapViewLevel>('national')
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
  const [selectedCommuneId, setSelectedCommuneId] = useState<string | null>(null)
  const [profession, setProfession] = useState<ProfessionFilter>('all')
  const [sector, setSector] = useState<Sector>('combined')
  const [showTraining, setShowTraining] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const selectedDept = DEPARTMENTS.find((d) => d.id === selectedDeptId)

  const densities = useMemo(() => {
    if (viewLevel === 'national') {
      return DEPARTMENTS.map((d) => ({
        id: d.id,
        density: getStaffCount(d.sectors, sector, profession) / (d.population / 10000),
      }))
    }
    return (selectedDept?.communes ?? []).map((c) => ({
      id: c.id,
      density: getStaffCount(c.sectors, sector, profession) / (c.population / 10000),
    }))
  }, [viewLevel, selectedDept, sector, profession])

  const maxDensity = Math.max(...densities.map((d) => d.density), 1)

  const handleDeptClick = useCallback(
    (dept: TerritoryStats) => {
      setSelectedDeptId(dept.id)
      setSelectedCommuneId(null)
      setTooltip(buildTooltip(dept, sector, dept.nationalRank))
      if (dept.communes?.length) {
        setViewLevel('department')
      }
    },
    [sector],
  )

  const handleCommuneClick = useCallback(
    (commune: CommuneStats) => {
      setSelectedCommuneId(commune.id)
      setTooltip(buildTooltip(commune, sector))
    },
    [sector],
  )

  const exportPNG = () => {
    const svg = svgRef.current
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 680
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx?.drawImage(img, 0, 0)
      const link = document.createElement('a')
      link.download = `orhs-carte-${viewLevel}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`
  }

  const exportPDF = () => window.print()

  return (
    <div className="rounded-xl border border-[#e8ecf0] bg-white p-4 sm:p-6">
      {/* Filtres */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-dark-text/50">
              Profession
            </label>
            <select
              value={profession}
              onChange={(e) => setProfession(e.target.value as ProfessionFilter)}
              className="rounded border border-[#dde3ea] px-3 py-2 text-sm outline-none focus:border-health-green/40"
            >
              {PROFESSION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-dark-text/50">
              Secteur
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value as Sector)}
              className="rounded border border-[#dde3ea] px-3 py-2 text-sm outline-none focus:border-health-green/40"
            >
              {SECTOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={showTraining}
              onChange={(e) => setShowTraining(e.target.checked)}
              className="h-4 w-4 rounded text-health-green"
            />
            <GraduationCap className="h-4 w-4 text-health-green" />
            Structures de formation
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportPNG}
            className="inline-flex items-center gap-1.5 rounded border border-[#dde3ea] px-3 py-2 text-xs font-medium hover:bg-light-gray"
          >
            <Download className="h-3.5 w-3.5" /> PNG
          </button>
          <button
            type="button"
            onClick={exportPDF}
            className="inline-flex items-center gap-1.5 rounded border border-[#dde3ea] px-3 py-2 text-xs font-medium hover:bg-light-gray"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Fil d'Ariane zoom */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setViewLevel('national')
            setSelectedDeptId(null)
            setSelectedCommuneId(null)
            setTooltip(null)
          }}
          className={`font-medium ${viewLevel === 'national' ? 'text-health-green' : 'text-institutional-blue hover:underline'}`}
        >
          National
        </button>
        {selectedDept && (
          <>
            <span className="text-dark-text/30">/</span>
            <button
              type="button"
              onClick={() => {
                setViewLevel('department')
                setSelectedCommuneId(null)
                setTooltip(buildTooltip(selectedDept, sector, selectedDept.nationalRank))
              }}
              className={`font-medium ${viewLevel === 'department' && !selectedCommuneId ? 'text-health-green' : 'text-institutional-blue hover:underline'}`}
            >
              {selectedDept.name}
            </button>
          </>
        )}
        {selectedCommuneId && selectedDept?.communes && (
          <>
            <span className="text-dark-text/30">/</span>
            <span className="font-medium text-health-green">
              {selectedDept.communes.find((c) => c.id === selectedCommuneId)?.name}
            </span>
          </>
        )}
        {viewLevel === 'national' && selectedDeptId && (
          <button
            type="button"
            onClick={() => selectedDept && handleDeptClick(selectedDept)}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-health-green"
          >
            <ZoomIn className="h-3.5 w-3.5" /> Zoom département
          </button>
        )}
        {viewLevel === 'department' && (
          <button
            type="button"
            onClick={() => {
              setViewLevel('national')
              setSelectedCommuneId(null)
            }}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-institutional-blue"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Vue nationale
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <svg
            ref={svgRef}
            viewBox="0 0 320 340"
            className="mx-auto w-full max-w-lg"
            role="img"
            aria-label="Carte choroplèthe des effectifs RHS"
          >
            <defs>
              <pattern id="desert-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#E8112D" strokeWidth="2" opacity="0.6" />
              </pattern>
            </defs>

            {viewLevel === 'national' &&
              DEPARTMENTS.map((dept) => {
                if (!dept.path) return null
                const density = densities.find((d) => d.id === dept.id)?.density ?? 0
                const desert = isMedicalDesert(dept.sectors, sector, dept.population)
                const isActive = dept.id === selectedDeptId || dept.id === hoveredId
                return (
                  <g key={dept.id}>
                    <path
                      d={dept.path}
                      fill={getChoroplethFill(density, maxDensity)}
                      stroke={isActive ? '#0F7B4F' : '#ffffff'}
                      strokeWidth={isActive ? 3 : 2}
                      className="cursor-pointer transition-opacity hover:opacity-90"
                      onClick={() => handleDeptClick(dept)}
                      onMouseEnter={() => {
                        setHoveredId(dept.id)
                        setTooltip(buildTooltip(dept, sector, dept.nationalRank))
                      }}
                      onMouseLeave={() => setHoveredId(null)}
                    />
                    {desert && (
                      <path d={dept.path} fill="url(#desert-hatch)" className="pointer-events-none" />
                    )}
                  </g>
                )
              })}

            {viewLevel === 'department' &&
              selectedDept?.communes?.map((commune, i) => {
                const cols = 2
                const row = Math.floor(i / cols)
                const col = i % cols
                const x = 40 + col * 130
                const y = 40 + row * 100
                const w = 110
                const h = 80
                const density = densities.find((d) => d.id === commune.id)?.density ?? 0
                const desert = isMedicalDesert(commune.sectors, sector, commune.population)
                const isActive = commune.id === selectedCommuneId
                return (
                  <g key={commune.id}>
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx={4}
                      fill={getChoroplethFill(density, maxDensity)}
                      stroke={isActive ? '#0F7B4F' : '#ffffff'}
                      strokeWidth={isActive ? 3 : 2}
                      className="cursor-pointer"
                      onClick={() => handleCommuneClick(commune)}
                      onMouseEnter={() => setTooltip(buildTooltip(commune, sector))}
                    />
                    {desert && (
                      <rect x={x} y={y} width={w} height={h} rx={4} fill="url(#desert-hatch)" className="pointer-events-none" />
                    )}
                    <text x={x + w / 2} y={y + h / 2} textAnchor="middle" className="pointer-events-none fill-white text-[9px] font-medium">
                      {commune.name.length > 14 ? commune.name.slice(0, 12) + '…' : commune.name}
                    </text>
                  </g>
                )
              })}

            {showTraining &&
              TRAINING_INSTITUTIONS.filter(
                (t) => viewLevel === 'national' || t.departmentId === selectedDeptId,
              ).map((inst) => (
                <g key={inst.id}>
                  <circle cx={inst.lat} cy={inst.lng} r={6} fill="#D6A43A" stroke="#fff" strokeWidth={2} />
                  <title>{inst.name}</title>
                </g>
              ))}
          </svg>

          {/* Légende */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-dark-text/60">
            <span>Densité faible</span>
            <div className="flex h-3 w-32 overflow-hidden rounded">
              {[0.2, 0.4, 0.6, 0.8, 1].map((t) => (
                <div key={t} className="flex-1" style={{ background: getChoroplethFill(t * maxDensity, maxDensity) }} />
              ))}
            </div>
            <span>Densité élevée</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-6 bg-[repeating-linear-gradient(45deg,#E8112D,#E8112D_2px,transparent_2px,transparent_4px)]" />
              Désert médical (&lt; seuil OMS)
            </span>
          </div>
        </div>

        {/* Infobulle / panneau */}
        <div className="lg:col-span-2">
          {tooltip ? (
            <div className="rounded-xl border border-health-green/20 bg-health-green/5 p-6">
              <div className="mb-4 flex items-start gap-2">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-health-green" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-health-green">
                    {tooltip.level}
                  </p>
                  <h3 className="text-xl font-semibold text-institutional-blue">{tooltip.name}</h3>
                </div>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-[#e8ecf0] pb-2">
                  <dt>Médecins</dt>
                  <dd className="font-semibold">{tooltip.medecins.toLocaleString('fr-FR')}</dd>
                </div>
                <div className="flex justify-between border-b border-[#e8ecf0] pb-2">
                  <dt>Infirmiers</dt>
                  <dd className="font-semibold">{tooltip.infirmiers.toLocaleString('fr-FR')}</dd>
                </div>
                <div className="flex justify-between border-b border-[#e8ecf0] pb-2">
                  <dt>Sages-femmes</dt>
                  <dd className="font-semibold">{tooltip.sagesFemmes.toLocaleString('fr-FR')}</dd>
                </div>
                <div className="flex justify-between border-b border-[#e8ecf0] pb-2">
                  <dt>Total affiché</dt>
                  <dd className="font-semibold">{tooltip.total.toLocaleString('fr-FR')}</dd>
                </div>
                <div className="flex justify-between border-b border-[#e8ecf0] pb-2">
                  <dt>Ratio médecins / 10 000 hab.</dt>
                  <dd className="font-semibold">{tooltip.ratio}</dd>
                </div>
                {tooltip.rank && (
                  <div className="flex justify-between border-b border-[#e8ecf0] pb-2">
                    <dt>Rang national</dt>
                    <dd className="font-semibold">{tooltip.rank} / 12</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt>Vs moyenne nationale</dt>
                  <dd className={`font-semibold ${tooltip.vsNational.startsWith('+') ? 'text-health-green' : 'text-red-600'}`}>
                    {tooltip.vsNational}
                  </dd>
                </div>
              </dl>
              {tooltip.isDesert && (
                <p className="mt-4 flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  <Info className="h-4 w-4" /> Zone sous le seuil OMS (désert médical)
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[#dde3ea] p-6 text-center text-sm text-dark-text/50">
              Cliquez ou survolez un territoire pour afficher les effectifs agrégés
            </div>
          )}
          <p className="mt-3 flex items-start gap-1.5 text-xs text-dark-text/50">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {PUBLIC_DATA_NOTICE}
          </p>
        </div>
      </div>
    </div>
  )
}
