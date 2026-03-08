import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import { formatRate } from '../lib/binanceRate'
import WalletCard from '../components/WalletCard'
import TransactionItem from '../components/TransactionItem'

export default function Home() {
  const { user, profile } = useAuthStore()
  const { wallets, transactions, fetchWallets, fetchTransactions, binanceRate, binanceRateLoading, fetchBinanceRate } = useWalletStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      fetchWallets(user.id)
      fetchTransactions(user.id)
    }
    fetchBinanceRate()
  }, [user, fetchWallets, fetchTransactions, fetchBinanceRate])

  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario'

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full animate-fade-in">
      <div className="mb-6">
        <p className="text-text-secondary text-sm">Hola,</p>
        <h1 className="text-2xl font-extrabold">{firstName}</h1>
      </div>

      {/* Binance Rate Banner */}
      <div className="glass rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ animation: 'pulse-glow 3s infinite' }}>
        <div>
          <p className="text-xs text-text-secondary font-medium">Tasa USD/VES — Binance P2P</p>
          <p className="text-2xl font-extrabold text-success">
            {binanceRateLoading ? '...' : binanceRate ? `${formatRate(binanceRate)} Bs` : '---'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-secondary">1 USDT =</p>
          <p className="text-sm font-bold text-primary-light">
            {binanceRate ? `${formatRate(binanceRate)} VES` : '---'}
          </p>
          <p className="text-xs text-text-secondary mt-1">Actualiza c/30min</p>
        </div>
      </div>

      {/* Wallets Carousel */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
        {wallets.map((w) => (
          <WalletCard key={w.id} wallet={w} />
        ))}
        {wallets.length === 0 && (
          <div className="text-text-secondary text-sm py-8 text-center w-full">
            Cargando wallets...
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        {[
          { label: 'Enviar', path: '/send', icon: '↗', gradient: 'from-violet-600/20 to-purple-600/20' },
          { label: 'Recibir', path: '/qr', icon: '↙', gradient: 'from-emerald-600/20 to-teal-600/20' },
          { label: 'Convertir', path: '/convert', icon: '⇄', gradient: 'from-blue-600/20 to-cyan-600/20' },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className={`glass rounded-2xl p-4 text-center hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
          >
            <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-2`}>
              <span className="text-xl">{action.icon}</span>
            </div>
            <p className="text-sm font-medium text-text-secondary">{action.label}</p>
          </button>
        ))}
      </div>

      {/* Extra Links */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <button
          onClick={() => navigate('/recharge')}
          className="glass rounded-2xl p-3 text-center hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <span className="text-lg">💰</span>
          <p className="text-xs mt-1 text-text-secondary font-medium">Recargar</p>
        </button>
        <button
          onClick={() => navigate('/p2p')}
          className="glass rounded-2xl p-3 text-center hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <span className="text-lg">🔄</span>
          <p className="text-xs mt-1 text-text-secondary font-medium">P2P</p>
        </button>
        <button
          onClick={() => navigate('/merchants/register')}
          className="glass rounded-2xl p-3 text-center hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <span className="text-lg">⚡</span>
          <p className="text-xs mt-1 text-text-secondary font-medium">Comercio</p>
        </button>
      </div>

      {profile?.is_admin && (
        <button
          onClick={() => navigate('/admin')}
          className="w-full glass rounded-2xl p-3 text-center border-primary/30 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 mt-3"
        >
          <span className="text-lg">⚙</span>
          <p className="text-xs mt-1 text-primary-light font-medium">Panel Admin</p>
        </button>
      )}

      {/* Transactions */}
      <div className="mt-6 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Actividad reciente</h2>
          <button onClick={() => navigate('/history')} className="text-xs text-primary-light font-medium">
            Ver todo
          </button>
        </div>
        <div className="glass rounded-2xl px-4">
          {transactions.length === 0 ? (
            <p className="text-text-secondary text-sm py-6 text-center">
              Sin transacciones aun
            </p>
          ) : (
            transactions.slice(0, 10).map((tx) => (
              <TransactionItem key={tx.id} tx={tx} userId={user!.id} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
