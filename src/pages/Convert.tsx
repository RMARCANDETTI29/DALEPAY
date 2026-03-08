import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import { formatRate } from '../lib/binanceRate'
import type { Currency } from '../types'
import { CURRENCY_SYMBOLS, COMMISSION_RATE } from '../types'
import { showMainButton, hideMainButton, hapticFeedback, isTelegram } from '../lib/telegram'

export default function Convert() {
  const { user } = useAuthStore()
  const { wallets, convertCurrency, loading, fetchExchangeRates, fetchWallets, getRate, binanceRate, fetchBinanceRate } = useWalletStore()
  const [from, setFrom] = useState<Currency>('USD')
  const [to, setTo] = useState<Currency>('VES')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchExchangeRates()
    fetchBinanceRate()
    if (user) fetchWallets(user.id)
  }, [fetchExchangeRates, fetchBinanceRate, fetchWallets, user])

  const rate = getRate(from, to)
  const numAmount = parseFloat(amount) || 0
  const fee = Math.round(numAmount * COMMISSION_RATE * 100) / 100
  const netAmount = numAmount - fee
  const convertedAmount = netAmount * rate

  const fromWallet = wallets.find((w) => w.currency === from)
  const fromBalance = fromWallet ? Number(fromWallet.balance) : 0
  const canConvert = numAmount > 0 && from !== to && !loading && numAmount <= fromBalance

  useEffect(() => {
    if (isTelegram() && canConvert) {
      showMainButton('Confirmar conversion', () => handleConvert())
    } else {
      hideMainButton()
    }
    return () => hideMainButton()
  }, [canConvert, from, to, amount])

  const handleConvert = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!user) return
    setError('')
    setSuccess('')
    if (from === to) { setError('Selecciona monedas diferentes'); return }
    if (numAmount <= 0) { setError('Monto invalido'); return }
    try {
      await convertCurrency(user.id, from, to, numAmount)
      hapticFeedback('success')
      setSuccess(`Convertido exitosamente: ${CURRENCY_SYMBOLS[to]} ${convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
      setAmount('')
    } catch (err: unknown) {
      hapticFeedback('error')
      setError(err instanceof Error ? err.message : 'Error en la conversion')
    }
  }

  const currencies: Currency[] = ['USD', 'USDT', 'VES']

  const swapCurrencies = () => {
    setFrom(to)
    setTo(from)
    setAmount('')
  }

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full animate-fade-in">
      <h1 className="text-2xl font-extrabold mb-2">Convertir moneda</h1>

      {/* Binance Rate */}
      {binanceRate && (
        <div className="glass rounded-2xl p-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary">Tasa Binance P2P</p>
            <p className="text-lg font-extrabold text-success">1 USD = {formatRate(binanceRate)} Bs</p>
          </div>
          <span className="px-2 py-1 rounded-lg bg-success/15 text-success text-xs font-semibold">En vivo</span>
        </div>
      )}

      <form onSubmit={handleConvert} className="space-y-4">
        <div className="glass rounded-2xl p-4">
          <label className="text-sm text-text-secondary mb-2 block font-medium">De</label>
          <div className="flex gap-2 mb-3">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFrom(c)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  from === c ? 'gradient-purple text-white' : 'bg-white/5 text-text-secondary'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-3 rounded-xl bg-white/5 text-text text-2xl font-bold placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <p className="text-xs text-text-secondary mt-2">
            Disponible: {CURRENCY_SYMBOLS[from]} {fromBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={swapCurrencies}
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-primary-light hover:scale-110 active:scale-95 transition-all"
          >
            ⇅
          </button>
        </div>

        <div className="glass rounded-2xl p-4">
          <label className="text-sm text-text-secondary mb-2 block font-medium">A</label>
          <div className="flex gap-2 mb-3">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setTo(c)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  to === c ? 'gradient-blue text-white' : 'bg-white/5 text-text-secondary'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="px-3 py-3 rounded-xl bg-white/5 text-2xl font-bold text-success">
            {numAmount > 0 && from !== to
              ? `${CURRENCY_SYMBOLS[to]} ${convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : <span className="text-text-secondary">0.00</span>
            }
          </div>
        </div>

        {numAmount > 0 && from !== to && (
          <div className="glass rounded-2xl p-4 space-y-2 animate-slide-up">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Tasa de cambio</span>
              <span>1 {from} = {rate.toLocaleString('en-US', { maximumFractionDigits: 6 })} {to}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Comision (0.5%)</span>
              <span>{CURRENCY_SYMBOLS[from]} {fee.toFixed(2)}</span>
            </div>
            {binanceRate && (from === 'VES' || to === 'VES') && (
              <div className="flex justify-between text-sm border-t border-white/5 pt-2">
                <span className="text-text-secondary">Ref. Binance P2P</span>
                <span className="text-success">{formatRate(binanceRate)} Bs/USD</span>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-danger text-sm text-center animate-fade-in">{error}</p>}
        {success && <p className="text-success text-sm text-center animate-fade-in">{success}</p>}

        <button
          type="submit"
          disabled={!canConvert}
          className="w-full py-3.5 rounded-xl gradient-purple text-white font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
        >
          {loading ? 'Convirtiendo...' : 'Convertir'}
        </button>
      </form>
    </div>
  )
}
