import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import type { Currency } from '../types'
import { CURRENCY_SYMBOLS, TRANSFER_FEE_RATE } from '../types'

export default function Send() {
  const { user } = useAuthStore()
  const { wallets, sendMoney, loading } = useWalletStore()
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedWallet = wallets.find((w) => w.currency === currency)
  const numAmount = parseFloat(amount) || 0
  const fee = Math.round(numAmount * TRANSFER_FEE_RATE * 100) / 100
  const netAmount = numAmount - fee

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')
    setSuccess('')
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Monto invalido')
      return
    }
    try {
      await sendMoney(user.id, user.email!, email, numAmount, currency, description)
      setSuccess(`Enviado ${CURRENCY_SYMBOLS[currency]} ${netAmount.toFixed(2)} exitosamente (comision: ${CURRENCY_SYMBOLS[currency]} ${fee.toFixed(2)})`)
      setEmail('')
      setAmount('')
      setDescription('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar')
    }
  }

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">Enviar dinero</h1>

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="text-sm text-text-secondary mb-1 block">Destinatario</label>
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-lighter text-text placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary mb-1 block">Moneda</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-lighter text-text focus:outline-none focus:border-primary"
          >
            <option value="USD">USD - Dolares</option>
            <option value="USDT">USDT - Tether</option>
            <option value="VES">VES - Bolivares</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-text-secondary mb-1 block">
            Monto {selectedWallet && (
              <span className="text-xs">(Disponible: {CURRENCY_SYMBOLS[currency]} {selectedWallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
            )}
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-lighter text-text text-xl font-semibold placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
        </div>

        {numAmount > 0 && (
          <div className="bg-surface rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Comision (0.3%)</span>
              <span>{CURRENCY_SYMBOLS[currency]} {fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-surface-lighter pt-2">
              <span>El destinatario recibe</span>
              <span className="text-success">{CURRENCY_SYMBOLS[currency]} {netAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm text-text-secondary mb-1 block">Descripcion (opcional)</label>
          <input
            type="text"
            placeholder="Pago por..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-lighter text-text placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
        </div>

        {error && <p className="text-danger text-sm text-center">{error}</p>}
        {success && <p className="text-success text-sm text-center">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  )
}
