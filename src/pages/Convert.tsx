import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import type { Currency } from '../types'
import { CURRENCY_SYMBOLS, COMMISSION_RATE } from '../types'

export default function Convert() {
  const { user } = useAuthStore()
  const { wallets, convertCurrency, loading, fetchExchangeRates, getRate } = useWalletStore()
  const [from, setFrom] = useState<Currency>('USD')
  const [to, setTo] = useState<Currency>('VES')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchExchangeRates()
  }, [fetchExchangeRates])

  const rate = getRate(from, to)
  const numAmount = parseFloat(amount) || 0
  const fee = numAmount * COMMISSION_RATE
  const netAmount = numAmount - fee
  const convertedAmount = netAmount * rate

  const fromWallet = wallets.find((w) => w.currency === from)

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')
    setSuccess('')
    if (from === to) {
      setError('Selecciona monedas diferentes')
      return
    }
    if (numAmount <= 0) {
      setError('Monto invalido')
      return
    }
    try {
      await convertCurrency(user.id, from, to, numAmount)
      setSuccess('Conversion realizada exitosamente')
      setAmount('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en la conversion')
    }
  }

  const currencies: Currency[] = ['USD', 'USDT', 'VES']

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">Convertir moneda</h1>

      <form onSubmit={handleConvert} className="space-y-4">
        <div>
          <label className="text-sm text-text-secondary mb-1 block">De</label>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value as Currency)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-lighter text-text focus:outline-none focus:border-primary"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-text-secondary mb-1 block">
            Monto {fromWallet && (
              <span className="text-xs">(Disponible: {CURRENCY_SYMBOLS[from]} {fromWallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
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

        <div>
          <label className="text-sm text-text-secondary mb-1 block">A</label>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value as Currency)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-lighter text-text focus:outline-none focus:border-primary"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {numAmount > 0 && from !== to && (
          <div className="bg-surface rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Tasa de cambio</span>
              <span>1 {from} = {rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} {to}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Comision (0.5%)</span>
              <span>{CURRENCY_SYMBOLS[from]} {fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-surface-lighter pt-2">
              <span>Recibiras</span>
              <span className="text-success">{CURRENCY_SYMBOLS[to]} {convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {error && <p className="text-danger text-sm text-center">{error}</p>}
        {success && <p className="text-success text-sm text-center">{success}</p>}

        <button
          type="submit"
          disabled={loading || from === to}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Convirtiendo...' : 'Convertir'}
        </button>
      </form>
    </div>
  )
}
