import { useState } from 'react'
import { PARTNERS, type Partner } from '../../constants/home'
import { SectionHeader } from '../ui/SectionHeader'

function PartnerLogo({ partner }: { partner: Partner }) {
  const [failed, setFailed] = useState(false)

  if (!partner.logo || failed) {
    return (
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-institutional-blue/10">
        <span className="text-xs font-bold text-institutional-blue">{partner.abbr}</span>
      </div>
    )
  }

  return (
    <img
      src={partner.logo}
      alt=""
      className="mb-3 h-12 w-auto max-w-full object-contain"
      onError={() => setFailed(true)}
    />
  )
}

export function PartnersSection() {
  return (
    <section className="border-y border-[#e8ecf0] bg-light-gray/50 py-14 sm:py-16" id="partenaires">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          label="Collaboration"
          title="Écosystème de partenaires"
          description="L'ORHS Bénin s'appuie sur un réseau d'institutions nationales et internationales pour produire des données fiables."
          align="center"
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {PARTNERS.map((partner) => (
            <div
              key={partner.id}
              className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-[#e8ecf0] bg-white px-4 py-6 text-center shadow-sm transition-all hover:border-health-green/30 hover:shadow-md"
            >
              <PartnerLogo partner={partner} />
              <p className="text-xs font-medium leading-snug text-dark-text/70">
                {partner.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
