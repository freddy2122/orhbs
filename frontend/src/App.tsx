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
          <Route path="executif" element={<ExecutiveDashboardPage />} />
          <Route path="collecte" element={<CollecteDashboardPage />} />
          <Route path="validation" element={<ValidationDashboardPage />} />
          <Route path="analyse" element={<AnalyseDashboardPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/contenu" element={<AdminDashboardPage />} />
          <Route path="admin/config" element={<AdminDashboardPage />} />
          <Route path="admin/audit" element={<AdminDashboardPage />} />
          <Route path="admin/integrations" element={<AdminDashboardPage />} />
          <Route path="admin/monitoring" element={<AdminDashboardPage />} />
          <Route path="acteurs" element={<ActorsHubPage />} />
          <Route path="acteurs/personnel" element={<PersonnelPage />} />
          <Route path="acteurs/planification" element={<PlanificationPage />} />
          <Route path="acteurs/cartographie" element={<MicroCartographyPage />} />
          <Route path="acteurs/competences" element={<CompetencesPage />} />
          <Route path="acteurs/interoperabilite" element={<InteroperabilityPage />} />
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
