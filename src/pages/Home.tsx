import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import WalletCard from '../components/WalletCard'
import TransactionItem from '../components/TransactionItem'

export default function Home() {
  const { user, profile } = useAuthStore()
  const { wallets, transactions, fetchWallets, fetchTransactions } = useWalletStore()

  useEffect(() => {
    if (user) {
      fetchWallets(user.id)
      fetchTransactions(user.id)
    }
  }, [user, fetchWallets, fetchTransactions])

  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario'

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full">
      <div className="mb-6">
        <p className="text-text-secondary text-sm">Hola,</p>
        <h1 className="text-2xl font-bold">{firstName}</h1>
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
          { label: 'Enviar', href: '/send', emoji: '↗' },
          { label: 'Recibir', href: '/qr', emoji: '↙' },
          { label: 'Convertir', href: '/convert', emoji: '⇄' },
        ].map((action) => (
          <a
            key={action.label}
            href={action.href}
            className="bg-surface rounded-xl p-4 text-center hover:bg-surface-light transition-colors"
          >
            <span className="text-2xl">{action.emoji}</span>
            <p className="text-sm mt-1 text-text-secondary">{action.label}</p>
          </a>
        ))}
      </div>

      {/* Transactions */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Actividad reciente</h2>
        <div className="bg-surface rounded-xl px-4">
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
