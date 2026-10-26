import { useState } from 'react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { PasswordRules } from '../../components/ui/PasswordRules'
import { changePassword } from '../../lib/password-api'

export function ChangePasswordPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (next !== confirm) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.')
      return
    }
    setBusy(true)
    try {
      const result = await changePassword(current, next)
      setMessage(result.detail)
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Mon mot de passe" description="Changez le mot de passe de votre compte." />
      <form onSubmit={submit} className="max-w-md space-y-4 rounded-xl border border-[#e8ecf0] bg-white p-5 shadow-sm">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        <div>
          <label htmlFor="cp-current" className="mb-1.5 block text-sm font-medium text-dark-text">Mot de passe actuel</label>
          <PasswordInput id="cp-current" value={current} onChange={setCurrent} disabled={busy} placeholder="Mot de passe actuel" />
        </div>
        <div>
          <label htmlFor="cp-new" className="mb-1.5 block text-sm font-medium text-dark-text">Nouveau mot de passe</label>
          <PasswordInput id="cp-new" value={next} onChange={setNext} disabled={busy} autoComplete="new-password" placeholder="Nouveau mot de passe" />
          <PasswordRules />
        </div>
        <div>
          <label htmlFor="cp-confirm" className="mb-1.5 block text-sm font-medium text-dark-text">Confirmer</label>
          <PasswordInput id="cp-confirm" value={confirm} onChange={setConfirm} disabled={busy} autoComplete="new-password" placeholder="Confirmer" />
        </div>
        <button type="submit" disabled={busy} className="rounded-lg bg-health-green px-4 py-2 text-sm font-semibold text-white hover:bg-[#005a23] disabled:opacity-60">
          {busy ? 'Enregistrement…' : 'Modifier le mot de passe'}
        </button>
      </form>
    </div>
  )
}
