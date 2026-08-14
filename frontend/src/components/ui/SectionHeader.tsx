type SectionHeaderProps = {
  label?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  light?: boolean
}

export function SectionHeader({
  label,
  title,
  description,
  align = 'left',
  light = false,
}: SectionHeaderProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left'
  const maxWidth = align === 'center' ? 'max-w-2xl' : 'max-w-3xl'

  return (
    <div className={`mb-10 sm:mb-12 ${alignClass} ${maxWidth}`}>
      {label && (
        <p
          className={`mb-2 text-xs font-medium uppercase tracking-[0.2em] ${
            light ? 'text-gold-accent' : 'text-health-green'
          }`}
        >
          {label}
        </p>
      )}
      <h2
        className={`text-2xl font-semibold leading-tight sm:text-3xl ${
          light ? 'text-white' : 'text-institutional-blue'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-3 text-base leading-relaxed ${
            light ? 'text-white/80' : 'text-dark-text/70'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  )
}
