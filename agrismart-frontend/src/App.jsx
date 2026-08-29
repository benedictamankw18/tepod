import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { getUser } from './lib/auth'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import DashboardPage from './pages/Dashboard'
import MarketplacePage from './pages/Marketplace'
import ActivityPage from './pages/Activity'
import FarmsPage from './pages/Farms'
import PricesPage from './pages/Prices'
import SupportPage from './pages/Support'
import BuyerVerification from './pages/BuyerVerification'
import AdminBanners from './pages/AdminBanners'
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
          path="/admin/banners"
          element={
            <ProtectedRoute>
              <AdminBanners />
            </ProtectedRoute>
          }
        />
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
