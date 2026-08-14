import { FlagBar } from './FlagBar'

type PageBannerProps = {
  label?: string
  title: string
  description?: string
}

export function PageBanner({ label, title, description }: PageBannerProps) {
  return (
    <div className="relative bg-institutional-blue text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        {label && (
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-gold-accent">
            {label}
          </p>
        )}
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80">
            {description}
          </p>
        )}
      </div>
      <FlagBar className="h-1" />
    </div>
  )
}
