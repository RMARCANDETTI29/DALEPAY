import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import type { Currency } from '../types'
import { CURRENCY_SYMBOLS } from '../types'

export default function QR() {
  const { user, profile } = useAuthStore()
  const { wallets } = useWalletStore()
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD')
  const [requestAmount, setRequestAmount] = useState('')

  if (!user) return null

  const qrData = JSON.stringify({
    app: 'dalepay',
    email: user.email,
    name: profile?.full_name,
    currency: selectedCurrency,
    amount: requestAmount ? parseFloat(requestAmount) : undefined,
  })

  const selectedWallet = wallets.find(w => w.currency === selectedCurrency)
  const balance = selectedWallet ? Number(selectedWallet.balance) : 0

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full flex flex-col items-center animate-fade-in">
      <h1 className="text-2xl font-extrabold mb-2">Recibir pago</h1>
      <p className="text-text-secondary text-sm mb-6 text-center">
        Comparte este codigo para recibir dinero
      </p>

      {/* QR Code */}
      <div className="glass-strong rounded-3xl p-8 mb-6" style={{ animation: 'pulse-glow 3s infinite' }}>
        <div className="bg-white p-4 rounded-2xl">
          <QRCodeSVG
            value={qrData}
            size={200}
            bgColor="#ffffff"
            fgColor="#0a0a0f"
            level="M"
            includeMargin={false}
          />
        </div>
      </div>

      <div className="text-center mb-6">
        <p className="text-lg font-bold">{profile?.full_name}</p>
        <p className="text-text-secondary text-sm">{user.email}</p>
        {requestAmount && (
          <p className="text-primary-light font-semibold mt-1">
            Solicita: {CURRENCY_SYMBOLS[selectedCurrency]} {parseFloat(requestAmount).toFixed(2)}
          </p>
        )}
      </div>

      {/* Currency & Amount selector */}
      <div className="w-full space-y-3">
        <div className="glass rounded-2xl p-4">
          <label className="text-xs text-text-secondary mb-2 block font-medium">Moneda a recibir</label>
          <div className="flex gap-2">
            {(['USD', 'USDT', 'VES'] as Currency[]).map(c => (
              <button
                key={c}
                onClick={() => setSelectedCurrency(c)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedCurrency === c
                    ? 'gradient-purple text-white'
                    : 'glass text-text-secondary'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Saldo actual: {CURRENCY_SYMBOLS[selectedCurrency]} {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <label className="text-xs text-text-secondary mb-2 block font-medium">Monto a solicitar (opcional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={requestAmount}
            onChange={(e) => setRequestAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 text-text text-lg font-bold placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>
    </div>
  )
}
