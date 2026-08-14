import { Shield } from 'lucide-react'
import { SECURE_ACTORS_NOTICE } from '../../lib/security'

export function SecureActorsNotice() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-institutional-blue/20 bg-institutional-blue/5 px-4 py-3">
      <Shield className="mt-0.5 h-5 w-5 shrink-0 text-institutional-blue" />
      <p className="text-sm text-dark-text/70">{SECURE_ACTORS_NOTICE}</p>
    </div>
  )
}
