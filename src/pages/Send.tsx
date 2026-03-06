import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import type { Currency } from '../types'
import { CURRENCY_SYMBOLS, TRANSFER_FEE_RATE } from '../types'
import { showMainButton, hideMainButton, hapticFeedback, isTelegram } from '../lib/telegram'

export default function Send() {
  const { user } = useAuthStore()
  const { wallets, sendMoney, loading, fetchWallets } = useWalletStore()
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedWallet = wallets.find((w) => w.currency === currency)
  const balance = selectedWallet ? Number(selectedWallet.balance) : 0
  const numAmount = parseFloat(amount) || 0
  const fee = Math.round(numAmount * TRANSFER_FEE_RATE * 100) / 100
  const netAmount = numAmount - fee

  const canSend = numAmount > 0 && email && !loading && numAmount <= balance

  useEffect(() => {
    if (user) fetchWallets(user.id)
  }, [user, fetchWallets])

  useEffect(() => {
    if (isTelegram() && canSend) {
      showMainButton('Confirmar envio', () => handleSend())
    } else {
      hideMainButton()
    }
    return () => hideMainButton()
  }, [canSend, email, amount, currency])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!user || !canSend) return
    setError('')
    setSuccess('')
    try {
      await sendMoney(user.id, user.email!, email, numAmount, currency, description)
      hapticFeedback('success')
      setSuccess(`Enviado ${CURRENCY_SYMBOLS[currency]} ${netAmount.toFixed(2)} exitosamente`)
      setEmail('')
      setAmount('')
      setDescription('')
    } catch (err: unknown) {
      hapticFeedback('error')
      setError(err instanceof Error ? err.message : 'Error al enviar')
    }
  }

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full animate-fade-in">
      <h1 className="text-2xl font-extrabold mb-6">Enviar dinero</h1>

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="text-sm text-text-secondary mb-1 block font-medium">Destinatario</label>
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3.5 rounded-xl glass text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary mb-1 block font-medium">Moneda</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="w-full px-4 py-3.5 rounded-xl glass text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          >
            <option value="USD">USD - Dolares</option>
            <option value="USDT">USDT - Tether</option>
            <option value="VES">VES - Bolivares</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-text-secondary mb-1 block font-medium">
            Monto {selectedWallet && (
              <span className="text-xs text-primary-light">(Disponible: {CURRENCY_SYMBOLS[currency]} {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
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
            className="w-full px-4 py-3.5 rounded-xl glass text-text text-2xl font-bold placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        {numAmount > 0 && (
          <div className="glass rounded-2xl p-4 space-y-2 animate-slide-up">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Comision (0.3%)</span>
              <span>{CURRENCY_SYMBOLS[currency]} {fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-2">
              <span>El destinatario recibe</span>
              <span className="text-success">{CURRENCY_SYMBOLS[currency]} {netAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm text-text-secondary mb-1 block font-medium">Descripcion (opcional)</label>
          <input
            type="text"
            placeholder="Pago por..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl glass text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        {error && <p className="text-danger text-sm text-center animate-fade-in">{error}</p>}
        {success && <p className="text-success text-sm text-center animate-fade-in">{success}</p>}

        <button
          type="submit"
          disabled={loading || !canSend}
          className="w-full py-3.5 rounded-xl gradient-purple text-white font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  )
}
