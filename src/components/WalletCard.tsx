import type { Wallet, Currency } from '../types'
import { CURRENCY_LABELS, CURRENCY_SYMBOLS } from '../types'

const gradients: Record<Currency, string> = {
  USD: 'from-green-600 to-green-800',
  USDT: 'from-emerald-500 to-teal-700',
  VES: 'from-primary to-primary-dark',
}

interface Props {
  wallet: Wallet
}

export default function WalletCard({ wallet }: Props) {
  const formatted = wallet.currency === 'VES'
    ? wallet.balance.toLocaleString('es-VE', { minimumFractionDigits: 2 })
    : wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })

  return (
    <div className={`bg-gradient-to-br ${gradients[wallet.currency]} rounded-2xl p-5 min-w-[280px] snap-center shrink-0`}>
      <p className="text-sm text-white/70 mb-1">{CURRENCY_LABELS[wallet.currency]}</p>
      <p className="text-2xl font-bold text-white">
        {CURRENCY_SYMBOLS[wallet.currency]} {formatted}
      </p>
      <p className="text-xs text-white/50 mt-3">{wallet.currency}</p>
    </div>
  )
}
