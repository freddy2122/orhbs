import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { INSTITUTIONAL_LINKS, LOGOS } from '../../constants/institutional'
import { NAV_ITEMS, type NavItem } from '../../constants/navigation'
import { SearchBar } from '../ui/SearchBar'
import { FlagBar } from '../ui/FlagBar'

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

function NavDropdown({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)

  const show = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const hide = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120)
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <Link
        to={item.href}
        onFocus={show}
        className={`relative flex items-center gap-1 whitespace-nowrap px-1 py-2 text-sm font-semibold transition-colors duration-200 ${
          isActive ? 'text-health-green' : 'text-dark-text hover:text-health-green'
        }`}
        aria-current={isActive ? 'page' : undefined}
        aria-expanded={open}
      >
        {item.label}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        {isActive && (
          <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-health-green" />
        )}
      </Link>

      {open && item.children && (
        <div
          className="absolute left-0 top-full z-30 min-w-56 rounded-lg border border-[#e8ecf0] bg-white py-2 shadow-lg"
          onFocus={show}
          onBlur={hide}
        >
          {item.children.map((child) => (
            <Link
              key={child.href}
              to={child.href}
              className="block whitespace-nowrap px-4 py-2 text-sm font-medium text-dark-text hover:bg-light-gray hover:text-health-green"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
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
      className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_4px_20px_rgba(11,58,102,0.08)]' : ''
      }`}
    >
      <div className="border-b border-[#e8ecf0]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:gap-5 lg:py-3.5">
          <Link to="/" aria-label="Accueil — ORHS Bénin" className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
            <img
              src={LOGOS.ministereSante}
              alt="Ministère de la Santé — République du Bénin"
              className="h-9 w-auto shrink-0 object-contain sm:h-10"
            />
          </Link>

          <div className="hidden min-w-0 flex-1 sm:block">
            <SearchBar className="max-w-md" />
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              className="hidden items-center gap-1.5 rounded border border-institutional-black/15 bg-white px-2.5 py-1 text-xs font-semibold text-institutional-black transition-colors hover:border-health-green/30 hover:text-health-green sm:flex sm:px-3 sm:text-sm"
              aria-label="Langue actuelle : Français"
            >
              FR
            </button>

            <Link
              to="/espace-prive"
              className="hidden rounded bg-health-green px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#005a23] lg:inline-flex"
            >
              Espace privé
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded border border-[#e8ecf0] p-2 text-institutional-black transition-colors hover:bg-light-gray lg:hidden"
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
        className="hidden border-b border-[#e8ecf0] bg-white lg:block"
        aria-label="Navigation principale"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-5 overflow-x-auto px-4 py-2.5 sm:px-6 xl:gap-7">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <NavDropdown key={item.id} item={item} isActive={activeItem === item.id} />
            ) : (
              <NavLinkItem
                key={item.id}
                to={item.href}
                label={item.label}
                isActive={activeItem === item.id}
              />
            ),
          )}
        </div>
      </nav>

      <FlagBar />

      {mobileOpen && (
        <div
          id="mobile-menu"
          className="border-t border-[#e8ecf0] bg-white lg:hidden"
        >
          <nav
            className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6"
            aria-label="Navigation mobile"
          >
            <div className="mb-4 sm:hidden">
              <SearchBar />
            </div>

            {NAV_ITEMS.map((item) => (
              <div key={item.id} className="border-b border-light-gray">
                <Link
                  to={item.href}
                  onClick={closeMobile}
                  className={`block py-3.5 text-sm font-semibold ${
                    activeItem === item.id
                      ? 'text-health-green'
                      : 'text-dark-text hover:text-health-green'
                  }`}
                  aria-current={activeItem === item.id ? 'page' : undefined}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="flex flex-col pb-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        onClick={closeMobile}
                        className="py-2 pl-4 text-sm text-dark-text/70 hover:text-health-green"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-5 flex flex-wrap gap-2">
              {INSTITUTIONAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#e2e8f0] bg-light-gray px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-institutional-black"
                >
                  {link.label}
                </a>
              ))}
            </div>

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
