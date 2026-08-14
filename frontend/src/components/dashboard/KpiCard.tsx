import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react'

type KpiStatus = 'ok' | 'warn' | 'alert'

type KpiCardProps = {
  label: string
  value: string
  trend: string
  status: KpiStatus
}

const statusStyles: Record<KpiStatus, { border: string; icon: typeof CheckCircle; iconColor: string }> = {
  ok: { border: 'border-l-health-green', icon: CheckCircle, iconColor: 'text-health-green' },
  warn: { border: 'border-l-gold-accent', icon: TrendingUp, iconColor: 'text-gold-accent' },
  alert: { border: 'border-l-red-500', icon: AlertTriangle, iconColor: 'text-red-500' },
}

export function KpiCard({ label, value, trend, status }: KpiCardProps) {
  const style = statusStyles[status]
  const Icon = style.icon

  return (
    <article className={`rounded-xl border border-[#e8ecf0] border-l-4 bg-white p-4 shadow-sm ${style.border}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-dark-text/50">{label}</p>
        <Icon className={`h-4 w-4 shrink-0 ${style.iconColor}`} />
      </div>
      <p className="mt-2 text-2xl font-bold text-institutional-blue">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-dark-text/55">
        {status === 'alert' ? (
          <TrendingDown className="h-3 w-3 text-red-500" />
        ) : (
          <TrendingUp className="h-3 w-3" />
        )}
        {trend}
      </p>
    </article>
  )
}
