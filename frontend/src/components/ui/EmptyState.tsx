import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

export function EmptyState({
  title = 'Aucune donnée disponible',
  description = 'Les informations apparaîtront ici une fois publiées ou enregistrées en base.',
  icon: Icon = Inbox,
  className = '',
  light = false,
}: {
  title?: string
  description?: string
  icon?: LucideIcon
  className?: string
  light?: boolean
}) {
  return (
    <div
      className={`rounded-xl border border-dashed px-6 py-12 text-center ${
        light
          ? 'border-white/25 bg-white/10'
          : 'border-[#dde3ea] bg-white'
      } ${className}`}
    >
      <Icon
        className={`mx-auto h-10 w-10 ${light ? 'text-gold-accent' : 'text-dark-text/25'}`}
        strokeWidth={1.5}
      />
      <p className={`mt-4 text-sm font-semibold ${light ? 'text-white' : 'text-dark-text'}`}>
        {title}
      </p>
      <p
        className={`mx-auto mt-2 max-w-md text-sm ${
          light ? 'text-white/75' : 'text-dark-text/55'
        }`}
      >
        {description}
      </p>
    </div>
  )
}
