import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { LOGOS } from '../constants/institutional'
import { PasswordInput } from '../components/ui/PasswordInput'
import { PasswordRules } from '../components/ui/PasswordRules'
import { Spinner } from '../components/ui/Spinner'
import { requestPasswordReset, setPasswordFromLink } from '../lib/password-api'

function AuthShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-md">
        <Link to="/espace-prive" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-institutional-black">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour à la connexion
        </Link>
        <img src={LOGOS.ministereSante} alt="Ministère de la Santé — République du Bénin" className="mb-6 h-14 w-auto object-contain" />
        <h1 className="text-2xl font-bold text-institutional-black">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-dark-text/65">{intro}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

const INPUT =
  'w-full rounded-lg border border-[#dde3ea] px-4 py-3 text-sm outline-none focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15 disabled:bg-light-gray/40'
const SUBMIT =
  'flex w-full items-center justify-center gap-2 rounded-lg bg-health-green py-3.5 text-sm font-semibold text-white hover:bg-[#005a23] disabled:cursor-not-allowed disabled:opacity-70'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await requestPasswordReset(email.trim())
      setMessage(result.detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demande impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      intro="Saisissez l’adresse e-mail rattachée à votre compte. Si elle est reconnue, vous recevrez un lien pour choisir un nouveau mot de passe."
    >
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <label htmlFor="email" className="block text-sm font-medium text-dark-text">Adresse e-mail</label>
          <input id="email" type="email" required autoComplete="email" disabled={busy} value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
          <button type="submit" disabled={busy} className={SUBMIT}>
            {busy ? <Spinner className="h-4 w-4" label="Envoi…" /> : 'Envoyer le lien'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export function ActivationPage() {
  const [params] = useSearchParams()
  const uid = params.get('uid') ?? ''
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setBusy(true)
    try {
      const result = await setPasswordFromLink(uid, token, password)
      setDone(result.username)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    } finally {
      setBusy(false)
    }
  }

  if (!uid || !token) {
    return (
      <AuthShell title="Lien incomplet" intro="Ce lien d’activation est incomplet. Ouvrez-le depuis l’e-mail reçu ou demandez-en un nouveau.">
        <Link to="/mot-de-passe-oublie" className="text-sm font-medium text-health-green hover:underline">Demander un nouveau lien</Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title="Mot de passe enregistré" intro={`Votre mot de passe est défini. Votre identifiant est « ${done} ».`}>
        <Link to="/espace-prive" className={SUBMIT}>Se connecter</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Définir mon mot de passe" intro="Choisissez le mot de passe de votre compte ORHS Bénin. Ce lien est à usage unique.">
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-dark-text">Nouveau mot de passe</label>
          <PasswordInput id="new-password" value={password} onChange={setPassword} disabled={busy} autoComplete="new-password" placeholder="Nouveau mot de passe" />
          <PasswordRules />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-dark-text">Confirmer</label>
          <PasswordInput id="confirm-password" value={confirm} onChange={setConfirm} disabled={busy} autoComplete="new-password" placeholder="Confirmer le mot de passe" />
        </div>
        <button type="submit" disabled={busy} className={SUBMIT}>
          {busy ? <Spinner className="h-4 w-4" label="Enregistrement…" /> : 'Enregistrer le mot de passe'}
        </button>
      </form>
    </AuthShell>
  )
}
