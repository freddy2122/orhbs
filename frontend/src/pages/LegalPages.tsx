import { Link } from 'react-router-dom'
import { PageBanner } from '../components/ui/PageBanner'
import { PUBLIC_DATA_NOTICE, RESTRICTED_DATA_NOTICE } from '../lib/security'

export function PrivacyPage() {
  return (
    <main>
      <PageBanner label="Données personnelles" title="Politique de confidentialité" />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 prose prose-sm max-w-none">
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-institutional-blue">Données collectées</h2>
          <p className="mt-2 text-sm leading-relaxed text-dark-text/70">
            L&apos;ORHS Bénin collecte uniquement les données nécessaires au fonctionnement du site : formulaires de contact, demandes d&apos;accès, inscriptions newsletter et connexion à l&apos;espace sécurisé.
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-institutional-blue">Usage des données</h2>
          <p className="mt-2 text-sm leading-relaxed text-dark-text/70">
            Les données sont utilisées exclusivement dans le cadre des missions de l&apos;observatoire. Aucune revente ni partage non autorisé.
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-institutional-blue">Données de santé publiées</h2>
          <p className="mt-2 text-sm leading-relaxed text-dark-text/70">{PUBLIC_DATA_NOTICE}</p>
          <p className="mt-2 text-sm leading-relaxed text-dark-text/70">{RESTRICTED_DATA_NOTICE}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-institutional-blue">Vos droits</h2>
          <p className="mt-2 text-sm leading-relaxed text-dark-text/70">
            Conformément à la législation béninoise sur la protection des données personnelles, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression. Pour la newsletter, un lien de désabonnement figure dans chaque e-mail. Contact : contact@orhsb.bj
          </p>
        </section>
      </article>
    </main>
  )
}

export function LegalNoticePage() {
  return (
    <main>
      <PageBanner label="Informations légales" title="Mentions légales" />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-institutional-blue">Éditeur</h2>
          <p className="mt-2 text-sm text-dark-text/70">
            Observatoire des Ressources Humaines en Santé du Bénin (ORHS Bénin)<br />
            Ministère de la Santé — République du Bénin<br />
            Cotonou, Bénin
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-institutional-blue">Hébergeur</h2>
          <p className="mt-2 text-sm text-dark-text/70">À définir lors du déploiement en production.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-institutional-blue">Propriété intellectuelle</h2>
          <p className="mt-2 text-sm text-dark-text/70">
            Les contenus publiés sur ce site sont la propriété de l&apos;ORHS Bénin ou de ses partenaires. Toute reproduction nécessite une autorisation préalable.
          </p>
        </section>
      </article>
    </main>
  )
}

export function AccessibilityPage() {
  return (
    <main>
      <PageBanner label="Accessibilité" title="Accessibilité du site" description="Engagement de l'ORHS Bénin pour un site accessible à tous." />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 text-sm leading-relaxed text-dark-text/70">
        <p>Ce site vise la conformité aux bonnes pratiques d&apos;accessibilité numérique (contraste, navigation clavier, textes alternatifs). Signalez toute difficulté à contact@orhsb.bj.</p>
      </article>
    </main>
  )
}

export function SitemapPage() {
  const links = [
    {
      section: 'Espace Grand Public',
      items: [
        ['Hub Espace public', '/espace-public'],
        ['Statistiques & rapports', '/statistiques'],
        ['Indicateurs nationaux', '/indicateurs'],
        ['Cartographie sanitaire', '/cartographie'],
        ['Vérification conformité', '/annuaire'],
        ['Actualités & opportunités', '/actualites?tab=opportunites'],
      ],
    },
    { section: 'Navigation', items: [['Accueil', '/'], ['À propos', '/a-propos'], ['Publications', '/publications'], ['Actualités', '/actualites'], ['Contact', '/contact']] },
    { section: 'Ressources', items: [['Archives', '/publications/archives'], ['Textes officiels', '/textes-officiels'], ['Annuaire formation', '/formation'], ['FAQ', '/faq']] },
    { section: 'Légal', items: [['Mentions légales', '/mentions-legales'], ['Confidentialité', '/confidentialite'], ['Demande accès données', '/demande-acces']] },
  ]
  return (
    <main>
      <PageBanner label="Navigation" title="Plan du site" />
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 grid gap-8 sm:grid-cols-3">
          {links.map((group) => (
            <div key={group.section}>
              <h2 className="font-semibold text-institutional-blue">{group.section}</h2>
              <ul className="mt-3 space-y-2">
                {group.items.map(([label, href]) => (
                  <li key={href}><Link to={href} className="text-sm text-dark-text/70 hover:text-health-green">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
