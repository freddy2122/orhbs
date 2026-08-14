type SearchBarProps = {
  className?: string
  placeholder?: string
}

export function SearchBar({
  className = '',
  placeholder = 'Rechercher publications, actualités, pages…',
}: SearchBarProps) {
  return (
    <form
      role="search"
      className={`relative w-full ${className}`}
      onSubmit={(e) => e.preventDefault()}
    >
      <label htmlFor="site-search" className="sr-only">
        Recherche full-text
      </label>
      <input
        id="site-search"
        type="search"
        name="q"
        placeholder={placeholder}
        className="w-full rounded-full border border-[#dde3ea] bg-white py-2 pl-10 pr-4 text-sm text-dark-text shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-dark-text/45 focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15"
        autoComplete="off"
      />
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-text/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
        />
      </svg>
    </form>
  )
}
