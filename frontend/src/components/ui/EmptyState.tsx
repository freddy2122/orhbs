import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

export function EmptyState({
  title = 'Aucune donnée disponible',
  description = 'Les informations apparaîtront ici une fois publiées ou enregistrées en base.',
  icon: Icon = Inbox,
  className = '',
}: {
  title?: string
  description?: string
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-dashed border-[#dde3ea] bg-white px-6 py-12 text-center ${className}`}>
      <Icon className="mx-auto h-10 w-10 text-dark-text/25" strokeWidth={1.5} />
      <p className="mt-4 text-sm font-semibold text-institutional-blue">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-dark-text/55">{description}</p>
    </div>
  )
}
