import { PASSWORD_RULES } from '../../lib/password-api'

export function PasswordRules() {
  return (
    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-dark-text/60">
      {PASSWORD_RULES.map((rule) => (
        <li key={rule}>{rule}</li>
      ))}
    </ul>
  )
}
