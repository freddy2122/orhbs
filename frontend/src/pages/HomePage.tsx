import { GeographicMapSection } from '../components/sections/GeographicMapSection'
import { HeroCarousel } from '../components/sections/HeroCarousel'
import { KeyFiguresSection } from '../components/sections/KeyFiguresSection'
import { LegalFrameworkSection } from '../components/sections/LegalFrameworkSection'
import { MissionSection } from '../components/sections/MissionSection'
import { NewsEventsSection } from '../components/sections/NewsEventsSection'
import { PartnersSection } from '../components/sections/PartnersSection'
import { PublicationsSection } from '../components/sections/PublicationsSection'
import { SecureAccessSection } from '../components/sections/SecureAccessSection'
import { TrainingInstitutionsSection } from '../components/sections/TrainingInstitutionsSection'

export function HomePage() {
  return (
    <main>
      <HeroCarousel />
      <MissionSection />
      <KeyFiguresSection />
      <GeographicMapSection />
      <PublicationsSection />
      <LegalFrameworkSection />
      <TrainingInstitutionsSection />
      <NewsEventsSection />
      <PartnersSection />
      <SecureAccessSection />
    </main>
  )
}
