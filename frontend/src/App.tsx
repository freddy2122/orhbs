import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ScrollToTop } from './components/layout/ScrollToTop'
import { AboutPage } from './pages/AboutPage'
import { ArchivesPage } from './pages/ArchivesPage'
import { ContactPage } from './pages/ContactPage'
import { DataAccessPage, FocalPointPage } from './pages/FormsPages'
import { FaqPage } from './pages/FaqPage'
import { HomePage } from './pages/HomePage'
import { IndicatorsPage } from './pages/IndicatorsPage'
import { LegalTextsPage } from './pages/LegalTextsPage'
import {
  AccessibilityPage,
  LegalNoticePage,
  PrivacyPage,
  SitemapPage,
} from './pages/LegalPages'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { RoleGuard, RoleSpace } from './components/auth/RoleSpace'
import { DashboardLayout } from './layouts/DashboardLayout'
import { AdminDashboardPage } from './pages/dashboard/AdminDashboardPage'
import { AnalyseDashboardPage } from './pages/dashboard/AnalyseDashboardPage'
import { CollecteDashboardPage } from './pages/dashboard/CollecteDashboardPage'
import { DashboardHomePage } from './pages/dashboard/DashboardHomePage'
import { ExecutiveDashboardPage } from './pages/dashboard/ExecutiveDashboardPage'
import { ValidationDashboardPage } from './pages/dashboard/ValidationDashboardPage'
import { ActorsHubPage } from './pages/dashboard/actors/ActorsHubPage'
import { CompetencesPage } from './pages/dashboard/actors/CompetencesPage'
import { InteroperabilityPage } from './pages/dashboard/actors/InteroperabilityPage'
import { MicroCartographyPage } from './pages/dashboard/actors/MicroCartographyPage'
import { PersonnelPage } from './pages/dashboard/actors/PersonnelPage'
import { PlanificationPage } from './pages/dashboard/actors/PlanificationPage'
import { LoginPage } from './pages/LoginPage'
import { NewsletterUnsubscribePage } from './pages/NewsletterUnsubscribePage'
import { NewsDetailPage, NewsPage } from './pages/NewsPage'
import { PublicationDetailPage } from './pages/PublicationDetailPage'
import { PublicationsPage } from './pages/PublicationsPage'
import { CartographyPage } from './pages/CartographyPage'
import { CompliancePage } from './pages/CompliancePage'
import { PublicSpacePage } from './pages/PublicSpacePage'
import { StatisticsPortalPage } from './pages/StatisticsPortalPage'
import { TrainingDirectoryPage } from './pages/TrainingDirectoryPage'

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          <Route path="connexion" element={<Navigate to="/espace-prive" replace />} />
          <Route path="espace-prive" element={<LoginPage />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
          <Route index element={<DashboardHomePage />} />
          <Route path="executif" element={<DashboardHomePage />} />
          <Route path="collecte" element={<DashboardHomePage />} />
          <Route path="validation" element={<DashboardHomePage />} />
          <Route path="analyse" element={<DashboardHomePage />} />
          <Route path="acteurs/*" element={<DashboardHomePage />} />
          <Route path=":acteur" element={<RoleSpace />}>
            <Route index element={<DashboardHomePage />} />
            <Route
              path="executif"
              element={
                <RoleGuard allow={['decideur', 'coordination', 'analyste']}>
                  <ExecutiveDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="collecte"
              element={
                <RoleGuard allow={['collecteur', 'validateur', 'coordination']}>
                  <CollecteDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="validation"
              element={
                <RoleGuard allow={['validateur', 'coordination']}>
                  <ValidationDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="analyse"
              element={
                <RoleGuard allow={['analyste', 'partenaire', 'coordination', 'decideur']}>
                  <AnalyseDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="organisation"
              element={
                <RoleGuard allow={['admin']}>
                  <AdminDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="contenu"
              element={
                <RoleGuard allow={['admin']}>
                  <AdminDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="config"
              element={
                <RoleGuard allow={['admin']}>
                  <AdminDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="audit"
              element={
                <RoleGuard allow={['admin']}>
                  <AdminDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="integrations"
              element={
                <RoleGuard allow={['admin']}>
                  <AdminDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="monitoring"
              element={
                <RoleGuard allow={['admin']}>
                  <AdminDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="acteurs"
              element={
                <RoleGuard allow={['coordination', 'analyste', 'validateur', 'collecteur', 'admin', 'decideur']}>
                  <ActorsHubPage />
                </RoleGuard>
              }
            />
            <Route
              path="acteurs/personnel"
              element={
                <RoleGuard allow={['coordination', 'analyste', 'validateur', 'collecteur', 'admin', 'decideur']}>
                  <PersonnelPage />
                </RoleGuard>
              }
            />
            <Route
              path="acteurs/planification"
              element={
                <RoleGuard allow={['coordination', 'validateur', 'decideur']}>
                  <PlanificationPage />
                </RoleGuard>
              }
            />
            <Route
              path="acteurs/cartographie"
              element={
                <RoleGuard allow={['coordination', 'validateur', 'collecteur', 'analyste', 'decideur']}>
                  <MicroCartographyPage />
                </RoleGuard>
              }
            />
            <Route
              path="acteurs/competences"
              element={
                <RoleGuard allow={['coordination', 'analyste', 'validateur', 'collecteur', 'partenaire']}>
                  <CompetencesPage />
                </RoleGuard>
              }
            />
            <Route
              path="acteurs/interoperabilite"
              element={
                <RoleGuard allow={['coordination', 'admin', 'analyste']}>
                  <InteroperabilityPage />
                </RoleGuard>
              }
            />
          </Route>
        </Route>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="espace-public" element={<PublicSpacePage />} />
          <Route path="statistiques" element={<StatisticsPortalPage />} />
          <Route path="cartographie" element={<CartographyPage />} />
          <Route path="annuaire" element={<CompliancePage />} />
          <Route path="a-propos" element={<AboutPage />} />
          <Route path="indicateurs" element={<IndicatorsPage />} />
          <Route path="publications" element={<PublicationsPage />} />
          <Route path="publications/archives" element={<ArchivesPage />} />
          <Route path="publications/:id" element={<PublicationDetailPage />} />
          <Route path="actualites" element={<NewsPage />} />
          <Route path="actualites/:slug" element={<NewsDetailPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="textes-officiels" element={<LegalTextsPage />} />
          <Route path="formation" element={<TrainingDirectoryPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="demande-acces" element={<DataAccessPage />} />
          <Route path="inscription-point-focal" element={<FocalPointPage />} />
          <Route path="newsletter/desabonnement" element={<NewsletterUnsubscribePage />} />
          <Route path="confidentialite" element={<PrivacyPage />} />
          <Route path="mentions-legales" element={<LegalNoticePage />} />
          <Route path="accessibilite" element={<AccessibilityPage />} />
          <Route path="plan-du-site" element={<SitemapPage />} />
        </Route>
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
