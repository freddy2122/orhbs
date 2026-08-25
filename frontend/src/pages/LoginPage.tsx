import { ArrowLeft, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LOGOS } from '../constants/institutional'
import { FlagBar } from '../components/ui/FlagBar'
import { PasswordInput } from '../components/ui/PasswordInput'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Spinner className="h-8 w-8 text-health-green" label="Vérification de la session…" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 lg:block">
        <img
          src="/images/hero/slide-1.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-institutional-blue/80" />
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-12">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour à l&apos;accueil
          </Link>

          <div className="flex flex-col items-center text-center">
            <img
              src={LOGOS.ministereSante}
              alt="Ministère de la Santé — République du Bénin"
              className="mb-8 h-20 w-auto object-contain brightness-0 invert xl:h-24"
            />
            <p className="max-w-sm text-sm font-medium uppercase tracking-[0.2em] text-gold-accent">
              République du Bénin
            </p>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-white xl:text-3xl">
              Observatoire des Ressources Humaines en Santé
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
              Plateforme nationale d&apos;observation et d&apos;analyse des
              ressources humaines en santé.
            </p>
          </div>

          <FlagBar className="h-1 rounded-full opacity-90" />
        </div>
      </div>

      <div className="flex w-full flex-col bg-white lg:w-1/2">
        <div className="flex items-center justify-between border-b border-[#e8ecf0] px-6 py-4 lg:hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-institutional-blue"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Accueil
          </Link>
          <img
            src={LOGOS.orhsb}
            alt="ORHS Bénin"
            className="h-9 w-9 rounded-full object-contain"
          />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 hidden lg:flex lg:justify-center">
              <img
                src={LOGOS.orhsb}
                alt="ORHS Bénin"
                className="h-14 w-14 rounded-full object-contain ring-2 ring-[#e8ecf0]"
              />
            </div>

            <div className="mb-8 text-center lg:text-left">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-health-green/10 text-health-green">
                <Shield className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-health-green">
                Accès sécurisé
              </p>
              <h2 className="mt-2 text-2xl font-bold text-institutional-blue sm:text-3xl">
                Espace privé
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-dark-text/65">
                Accès réservé aux utilisateurs autorisés du Ministère de la Santé
                et des partenaires institutionnels.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              )}
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-sm font-medium text-dark-text"
                >
                  Identifiant
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={submitting}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Votre identifiant"
                  className="w-full rounded-lg border border-[#dde3ea] px-4 py-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-dark-text/40 focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15 disabled:cursor-not-allowed disabled:bg-light-gray/40"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-dark-text"
                >
                  Mot de passe
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  disabled={submitting}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-health-green py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0d6b45] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <Spinner className="h-4 w-4" label="Accès en cours…" />
                ) : (
                  "Accéder à l'espace privé"
                )}
              </button>
            </form>

            <p className="mt-6 rounded-lg bg-light-gray/60 px-4 py-3 text-xs text-dark-text/55">
              Les comptes sont attribués par l&apos;administrateur de la plateforme.
              <br />
              Contactez le service ORHS pour obtenir vos identifiants et votre accès.
            </p>

            <p className="mt-4 text-center text-xs text-dark-text/50 lg:text-left">
              En cas de problème d&apos;accès, contactez l&apos;administrateur
              de l&apos;ORHS Bénin.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
