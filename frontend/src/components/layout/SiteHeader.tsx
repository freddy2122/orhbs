import { Header } from './Header'
import { TopBar } from './TopBar'

type SiteHeaderProps = {
  activeItem?: string
}

export function SiteHeader({ activeItem }: SiteHeaderProps) {
  return (
    <div className="sticky top-0 z-50">
      <TopBar />
      <Header activeItem={activeItem} />
    </div>
  )
}
