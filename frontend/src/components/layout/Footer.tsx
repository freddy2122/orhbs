import { Link } from 'react-router-dom'
import {
  FOOTER_CONTACT,
  FOOTER_LEGAL_LINKS,
  FOOTER_USEFUL_LINKS,
} from '../../constants/footer'
import { LOGOS } from '../../constants/institutional'
import { NAV_ITEMS } from '../../constants/navigation'
import { FlagBar } from '../ui/FlagBar'
import { NewsletterForm } from '../ui/NewsletterForm'

function FooterLinkItem({
  label,
  href,
  external,
}: {
  label: string
  href: string
  external?: boolean
}) {
  const className =
    'text-sm text-white/75 transition-colors hover:text-health-green'

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
      </a>
    )
  }

  return (
    <Link to={href} className={className}>
      {label}
    </Link>
  )
}

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gold-accent">
        {title}
      </h3>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  )
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto bg-institutional-blue text-white">
      <FlagBar />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Identité ORHS */}
          <div className="lg:col-span-4">
            <div className="flex items-start gap-3">
              <img
                src={LOGOS.orhsb}
                alt="ORHS Bénin"
                className="h-12 w-12 shrink-0 rounded-full object-contain ring-1 ring-white/20"
              />
              <div>
                <p className="text-lg font-semibold text-white">ORHS Bénin</p>
                <p className="mt-1 text-sm leading-relaxed text-white/70">
                  Observatoire des Ressources Humaines en Santé du Bénin
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">
              Plateforme nationale d&apos;observation, d&apos;analyse et de
              valorisation des ressources humaines en santé, placée sous la
              tutelle du Ministère de la Santé.
            </p>
            <img
              src={LOGOS.ministereSante}
              alt="Ministère de la Santé — République du Bénin"
              className="mt-6 h-10 w-auto object-contain brightness-0 invert opacity-80"
            />
          </div>

          {/* Navigation */}
          <div className="lg:col-span-2">
            <FooterColumn title="Navigation">
              {NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <FooterLinkItem label={item.label} href={item.href} />
                </li>
              ))}
            </FooterColumn>
          </div>

          {/* Liens utiles */}
          <div className="lg:col-span-3">
            <FooterColumn title="Liens utiles">
              {FOOTER_USEFUL_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLinkItem {...link} />
                </li>
              ))}
            </FooterColumn>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3">
            <FooterColumn title="Contact">
              <li>
                <p className="text-sm text-white/75">{FOOTER_CONTACT.address}</p>
              </li>
              <li>
                <a
                  href={`mailto:${FOOTER_CONTACT.email}`}
                  className="text-sm text-white/75 transition-colors hover:text-health-green"
                >
                  {FOOTER_CONTACT.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${FOOTER_CONTACT.phone.replace(/\s/g, '')}`}
                  className="text-sm text-white/75 transition-colors hover:text-health-green"
                >
                  {FOOTER_CONTACT.phone}
                </a>
              </li>
              <li className="pt-2">
                <Link
                  to="/contact"
                  className="text-sm font-medium text-white/75 transition-colors hover:text-health-green"
                >
                  Nous contacter
                </Link>
              </li>
              <li className="pt-4">
                <p className="mb-2 text-sm font-semibold text-white">Newsletter</p>
                <NewsletterForm compact variant="dark" />
              </li>
              <li className="pt-2">
                <Link
                  to="/espace-prive"
                  className="inline-flex items-center rounded bg-health-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d6b45]"
                >
                  Espace privé
                </Link>
              </li>
            </FooterColumn>
          </div>
        </div>
      </div>

      {/* Barre inférieure */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 sm:px-6 md:flex-row">
          <p className="text-center text-xs text-white/55 md:text-left">
            © {year} ORHS Bénin — Ministère de la Santé, République du Bénin.
            Tous droits réservés.
          </p>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
            aria-label="Liens légaux"
          >
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="text-xs text-white/55 transition-colors hover:text-white/90"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
