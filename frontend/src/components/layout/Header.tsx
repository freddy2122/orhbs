import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LOGOS } from '../../constants/institutional'
import { NAV_ITEMS } from '../../constants/navigation'

type HeaderProps = {
  activeItem?: string
}

function NavLinkItem({
  to,
  label,
  isActive,
  onClick,
}: {
  to: string
  label: string
  isActive: boolean
  onClick?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative whitespace-nowrap px-1 py-2 text-sm font-semibold transition-colors duration-200 ${
        isActive
          ? 'text-health-green'
          : 'text-dark-text hover:text-health-green'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
      {isActive && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-health-green" />
      )}
    </Link>
  )
}

export function Header({ activeItem = 'accueil' }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const closeMobile = () => setMobileOpen(false)

  return (
    <header
      className={`bg-white transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_4px_20px_rgba(11,58,102,0.08)]' : ''
      }`}
    >
      <div className="border-b border-[#e8ecf0]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:gap-6 lg:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <img
              src={LOGOS.orhsb}
              alt="ORHS Bénin"
              className="h-10 w-10 shrink-0 rounded-full object-contain ring-1 ring-[#e8ecf0] sm:h-11 sm:w-11"
            />
            <div className="min-w-0 border-l border-[#e8ecf0] pl-2.5 sm:pl-3">
              <p className="truncate text-sm font-semibold leading-tight text-institutional-blue sm:text-base lg:text-lg">
                ORHS Bénin
              </p>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-5 xl:flex xl:gap-7"
            aria-label="Navigation principale"
          >
            {NAV_ITEMS.map((item) => (
              <NavLinkItem
                key={item.id}
                to={item.href}
                label={item.label}
                isActive={activeItem === item.id}
              />
            ))}
          </nav>

          <div className="hidden items-center gap-2.5 lg:flex">
            <Link
              to="/espace-prive"
              className="rounded bg-health-green px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0d6b45]"
            >
              Espace privé
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded border border-[#e8ecf0] p-2 text-institutional-blue transition-colors hover:bg-light-gray lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      <nav
        className="hidden border-b border-[#e8ecf0] bg-white lg:block xl:hidden"
        aria-label="Navigation tablette"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-5 overflow-x-auto px-4 py-2.5 sm:px-6">
          {NAV_ITEMS.map((item) => (
            <NavLinkItem
              key={item.id}
              to={item.href}
              label={item.label}
              isActive={activeItem === item.id}
            />
          ))}
        </div>
      </nav>

      {mobileOpen && (
        <div
          id="mobile-menu"
          className="border-t border-[#e8ecf0] bg-white lg:hidden"
        >
          <nav
            className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6"
            aria-label="Navigation mobile"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                onClick={closeMobile}
                className={`border-b border-light-gray py-3.5 text-sm font-semibold ${
                  activeItem === item.id
                    ? 'text-health-green'
                    : 'text-dark-text hover:text-health-green'
                }`}
                aria-current={activeItem === item.id ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-5 flex flex-col gap-3">
              <Link
                to="/espace-prive"
                onClick={closeMobile}
                className="rounded bg-health-green px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Espace privé
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
