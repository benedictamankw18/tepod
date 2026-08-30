import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { getUser } from './lib/auth'
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

// Buyers land on the marketplace (their start page); everyone else on the dashboard.
function Home() {
  const user = getUser()
  return user && ['buyer', 'market_seller'].includes(user.role) ? <MarketplacePage /> : <DashboardPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <MarketplacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <ActivityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farms"
          element={
            <ProtectedRoute>
              <FarmsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prices"
          element={
            <ProtectedRoute>
              <PricesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/verify"
          element={
            <ProtectedRoute>
              <BuyerVerification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/precommitments"
          element={
            <ProtectedRoute>
              <MyPreCommitmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
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
            <ProtectedRoute>
              <ProduceDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
