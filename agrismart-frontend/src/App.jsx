import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { getUser } from './lib/auth'
import PageTransition from './components/PageTransition'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import TermsPage from './pages/Terms'
import PrivacyPage from './pages/Privacy'
import AboutPage from './pages/About'
import DashboardPage from './pages/Dashboard'
import MarketplacePage from './pages/Marketplace'
import ActivityPage from './pages/Activity'
import FarmsPage from './pages/Farms'
import PricesPage from './pages/Prices'
import WeatherGuidePage from './pages/WeatherGuide'
import SupportPage from './pages/Support'
import BuyerVerification from './pages/BuyerVerification'
import MyPreCommitmentsPage from './pages/MyPreCommitments'
import NotificationsPage from './pages/Notifications'
import AdminBanners from './pages/AdminBanners'
import AdminShell from './components/AdminShell'
import AdminOverview from './pages/admin/AdminOverview'
import AdminUsers from './pages/admin/AdminUsers'
import AdminVerifications from './pages/admin/AdminVerifications'
import AdminCrops from './pages/admin/AdminCrops'
import AdminUnits from './pages/admin/AdminUnits'
import AdminPricing from './pages/admin/AdminPricing'
import AdminUserCroptype from './pages/admin/AdminUserCroptype'
import AdminFarms from './pages/admin/AdminFarms'
import AdminListings from './pages/admin/AdminListings'
import AdminNotifications from './pages/admin/AdminNotifications'
import AdminTransport from './pages/admin/AdminTransport'
import AdminTransactions from './pages/admin/AdminTransactions'
import AdminPreCommitments from './pages/admin/AdminPreCommitments'
import AdminSettings from './pages/admin/AdminSettings'
import AdminActivity from './pages/admin/AdminActivity'
import ProduceDetail from './pages/ProduceDetail'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'

// Reset scroll on every route change so page-enter transitions start from the top.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// Buyers land on the marketplace (their start page); everyone else on the dashboard.
function Home() {
  const user = getUser()
  return user && ['buyer', 'market_seller'].includes(user.role) ? <MarketplacePage /> : <DashboardPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><PrivacyPage /></PageTransition>} />
        <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
        <Route
          path="/"
          element={
            <PageTransition>
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/marketplace"
          element={
            <PageTransition>
              <ProtectedRoute>
                <MarketplacePage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/activity"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ActivityPage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/farms"
          element={
            <PageTransition>
              <ProtectedRoute>
                <FarmsPage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/prices"
          element={
            <PageTransition>
              <ProtectedRoute>
                <PricesPage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/weather"
          element={
            <PageTransition>
              <ProtectedRoute>
                <WeatherGuidePage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/support"
          element={
            <PageTransition>
              <ProtectedRoute>
                <SupportPage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/verify"
          element={
            <PageTransition>
              <ProtectedRoute>
                <BuyerVerification />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/precommitments"
          element={
            <PageTransition>
              <ProtectedRoute>
                <MyPreCommitmentsPage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/notifications"
          element={
            <PageTransition>
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="verifications" element={<AdminVerifications />} />
          <Route path="crops" element={<AdminCrops />} />
          <Route path="units" element={<AdminUnits />} />
          <Route path="pricing" element={<AdminPricing />} />
          <Route path="user-croptype" element={<AdminUserCroptype />} />
          <Route path="farms" element={<AdminFarms />} />
          <Route path="listings" element={<AdminListings />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="transport" element={<AdminTransport />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="precommitments" element={<AdminPreCommitments />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="activity" element={<AdminActivity />} />
        </Route>
        <Route
          path="/produce/:id"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProduceDetail />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/settings"
          element={
            <PageTransition>
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="*"
          element={
            <PageTransition>
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            </PageTransition>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}