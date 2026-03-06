import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Home from './pages/Home'
import Send from './pages/Send'
import QR from './pages/QR'
import Convert from './pages/Convert'
import History from './pages/History'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import MerchantRegister from './pages/MerchantRegister'

function AppContent() {
  const { user, loading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-purple flex items-center justify-center">
            <span className="text-2xl font-extrabold text-white">D</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
            DalePay
          </h1>
          <p className="text-text-secondary text-sm mt-2">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div className="min-h-screen bg-bg">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/send" element={<Send />} />
        <Route path="/qr" element={<QR />} />
        <Route path="/convert" element={<Convert />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/merchants/register" element={<MerchantRegister />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}
