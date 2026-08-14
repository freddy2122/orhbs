import { INSTITUTIONAL_LINKS, LOGOS } from '../../constants/institutional'
import { SearchBar } from '../ui/SearchBar'
import { FlagBar } from '../ui/FlagBar'

export function TopBar() {
  return (
    <div className="border-b border-[#e8ecf0] bg-[#f8fafb]">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 sm:px-6 lg:gap-5">
        <a
          href="https://www.gouv.bj"
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center"
        >
          <img
            src={LOGOS.ministereSante}
            alt="Ministère de la Santé"
            className="hidden h-8 w-auto object-contain md:block lg:h-9"
          />
        </a>

        <div className="min-w-0 px-1 sm:px-2">
          <SearchBar />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          
          <button
            type="button"
            className="flex items-center gap-1.5 rounded border border-institutional-blue/15 bg-white px-2.5 py-1 text-xs font-semibold text-institutional-blue transition-colors hover:border-health-green/30 hover:text-health-green sm:px-3 sm:text-sm"
            aria-label="Langue actuelle : Français"
          >
            FR
          </button>
        </div>
      </div>

      <FlagBar />

     

      <div className="border-t border-[#eef2f6] px-4 py-2 lg:hidden">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-0.5">
          {INSTITUTIONAL_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-institutional-blue"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
