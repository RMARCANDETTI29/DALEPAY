import type { Wallet, Currency } from '../types'
import { CURRENCY_LABELS, CURRENCY_SYMBOLS } from '../types'

const gradients: Record<Currency, string> = {
  USD: 'gradient-green',
  USDT: 'gradient-teal',
  VES: 'gradient-purple',
}

const icons: Record<Currency, string> = {
  USD: '$',
  USDT: '₮',
  VES: 'Bs',
}

interface Props {
  wallet: Wallet
}

export default function WalletCard({ wallet }: Props) {
  const balance = Number(wallet.balance)
  const formatted = wallet.currency === 'VES'
    ? balance.toLocaleString('es-VE', { minimumFractionDigits: 2 })
    : balance.toLocaleString('en-US', { minimumFractionDigits: 2 })

  return (
    <div className={`${gradients[wallet.currency]} rounded-2xl p-5 min-w-[280px] snap-center shrink-0 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-10 -translate-x-10" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-white/70 font-medium">{CURRENCY_LABELS[wallet.currency]}</p>
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
            <span className="text-xs font-bold text-white">{icons[wallet.currency]}</span>
          </div>
        </div>
        <p className="text-3xl font-extrabold text-white tracking-tight">
          {CURRENCY_SYMBOLS[wallet.currency]} {formatted}
        </p>
        <p className="text-xs text-white/40 mt-3 font-medium">{wallet.currency} Wallet</p>
      </div>
    </div>
  )
}
