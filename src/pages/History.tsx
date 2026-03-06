import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import TransactionItem from '../components/TransactionItem'
import type { Transaction } from '../types'

type Filter = 'all' | 'transfer' | 'conversion'

export default function History() {
  const { user } = useAuthStore()
  const { transactions, fetchTransactions } = useWalletStore()
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (user) fetchTransactions(user.id)
  }, [user, fetchTransactions])

  const filtered: Transaction[] = filter === 'all'
    ? transactions
    : transactions.filter((tx) => tx.type === filter)

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'transfer', label: 'Envios' },
    { value: 'conversion', label: 'Conversiones' },
  ]

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-4">Historial</h1>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-xl px-4">
        {filtered.length === 0 ? (
          <p className="text-text-secondary text-sm py-6 text-center">
            No hay transacciones
          </p>
        ) : (
          filtered.map((tx) => (
            <TransactionItem key={tx.id} tx={tx} userId={user!.id} />
          ))
        )}
      </div>
    </div>
  )
}
