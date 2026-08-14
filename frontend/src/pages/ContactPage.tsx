import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone, Shield, Users } from 'lucide-react'
import { FOOTER_CONTACT } from '../constants/footer'
import { PageBanner } from '../components/ui/PageBanner'

const CONTACT_INFO = [
  { icon: MapPin, title: 'Adresse', value: FOOTER_CONTACT.address },
  { icon: Mail, title: 'E-mail', value: FOOTER_CONTACT.email, href: `mailto:${FOOTER_CONTACT.email}` },
  { icon: Phone, title: 'Téléphone', value: FOOTER_CONTACT.phone, href: `tel:${FOOTER_CONTACT.phone.replace(/\s/g, '')}` },
]

const SUBJECTS = ['Information générale', 'Publication', 'Indicateurs', 'Partenariat', 'Presse', 'Autre']

export function ContactPage() {
  const [tab, setTab] = useState<'general' | 'data' | 'focal'>('general')

  return (
    <main>
      <PageBanner
        label="Nous contacter"
        title="Contact"
        description="Formulaires de contact, demande d'accès aux données et inscription point focal."
      />

      <section className="border-b border-[#e8ecf0] bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {([
            ['general', 'Contact général', Mail],
            ['data', 'Accès données', Shield],
            ['focal', 'Point focal', Users],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
                tab === id ? 'border-health-green text-health-green' : 'border-transparent text-dark-text/60'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {tab === 'general' && (
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-6">
                {CONTACT_INFO.map((info) => {
                  const Icon = info.icon
                  return (
                    <div key={info.title} className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-health-green/10 text-health-green">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-medium uppercase tracking-wider text-dark-text/50">{info.title}</h2>
                        {info.href ? (
                          <a href={info.href} className="mt-1 block font-medium text-institutional-blue hover:text-health-green">{info.value}</a>
                        ) : (
                          <p className="mt-1 font-medium text-institutional-blue">{info.value}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <form className="rounded-lg border border-[#e8ecf0] bg-white p-6 shadow-sm sm:p-8" onSubmit={(e) => e.preventDefault()}>
                <h2 className="text-lg font-semibold text-institutional-blue">Envoyer un message</h2>
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="nom" className="mb-1 block text-sm font-medium">Nom</label>
                      <input id="nom" type="text" className="w-full rounded border border-[#dde3ea] px-3 py-2 text-sm" required />
                    </div>
                    <div>
                      <label htmlFor="org" className="mb-1 block text-sm font-medium">Organisation</label>
                      <input id="org" type="text" className="w-full rounded border border-[#dde3ea] px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium">E-mail</label>
                    <input id="email" type="email" className="w-full rounded border border-[#dde3ea] px-3 py-2 text-sm" required />
                  </div>
                  <div>
                    <label htmlFor="objet" className="mb-1 block text-sm font-medium">Objet</label>
                    <select id="objet" className="w-full rounded border border-[#dde3ea] px-3 py-2 text-sm">
                      {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="message" className="mb-1 block text-sm font-medium">Message</label>
                    <textarea id="message" rows={5} className="w-full rounded border border-[#dde3ea] px-3 py-2 text-sm" required />
                  </div>
                  <p className="text-xs text-dark-text/50">reCAPTCHA v3 sera intégré en production.</p>
                  <button type="submit" className="rounded bg-health-green px-6 py-3 text-sm font-semibold text-white hover:bg-[#0d6b45]">
                    Envoyer
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'data' && (
            <div className="text-center">
              <p className="mb-4 text-sm text-dark-text/70">Demande d&apos;accès aux données pour chercheurs et partenaires.</p>
              <Link to="/demande-acces" className="inline-flex rounded-lg bg-institutional-blue px-6 py-3 text-sm font-semibold text-white hover:bg-[#092d52]">
                Accéder au formulaire de demande
              </Link>
            </div>
          )}

          {tab === 'focal' && (
            <div className="text-center">
              <p className="mb-4 text-sm text-dark-text/70">Rejoindre le réseau de collecte des données RHS.</p>
              <Link to="/inscription-point-focal" className="inline-flex rounded-lg bg-health-green px-6 py-3 text-sm font-semibold text-white hover:bg-[#0d6b45]">
                Formulaire d&apos;inscription
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
