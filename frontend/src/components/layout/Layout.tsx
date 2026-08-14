import { Outlet, useLocation } from 'react-router-dom'
import { NAV_ITEMS, NAV_ROUTE_MAP } from '../../constants/navigation'
import { Footer } from './Footer'
import { SiteHeader } from './SiteHeader'

function getActiveNavId(pathname: string): string {
  if (pathname === '/contact') return ''
  if (NAV_ROUTE_MAP[pathname]) return NAV_ROUTE_MAP[pathname]
  if (pathname.startsWith('/publications/')) return 'publications'
  if (pathname.startsWith('/actualites/')) return 'actualites'
  const item = NAV_ITEMS.find((nav) => nav.href === pathname)
  return item?.id ?? 'accueil'
}

export function Layout() {
  const { pathname } = useLocation()
  const activeItem = getActiveNavId(pathname)

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <SiteHeader activeItem={activeItem} />
      <Outlet />
      <Footer />
    </div>
  )
}
