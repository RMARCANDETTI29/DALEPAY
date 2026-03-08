import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { DEPOSIT_ADDRESS } from '../types'
import type { UsdtDeposit } from '../types'

const BOT_TOKEN = '8644307550:AAHjIKb096GGpJxhgi7w2DJmbR2BNB1FO0k'
const ADMIN_CHAT_ID = import.meta.env.VITE_ADMIN_CHAT_ID || ''

async function notifyAdminTelegram(deposit: { amount: number; tx_hash: string; userEmail: string }) {
  if (!ADMIN_CHAT_ID) return
  const text = `🔔 <b>Nueva recarga USDT pendiente</b>\n\n` +
    `👤 Usuario: ${deposit.userEmail}\n` +
    `💰 Monto: ${deposit.amount} USDT\n` +
    `🔗 Hash: <code>${deposit.tx_hash}</code>\n` +
    `🌐 Red: TRC20\n\n` +
    `Revisa en el panel de admin para aprobar.`

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text, parse_mode: 'HTML' }),
    })
  } catch { /* silent */ }
}

export default function Recharge() {
  const { user } = useAuthStore()
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState('')
  const [deposits, setDeposits] = useState<UsdtDeposit[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) fetchDeposits()
  }, [user])

  const fetchDeposits = async () => {
    if (!user) return
    const { data } = await supabase
      .from('usdt_deposits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setDeposits(data)
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(DEPOSIT_ADDRESS)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback */ }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')
    setSuccess('')
    setLoading(true)

    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      setError('Monto invalido')
      setLoading(false)
      return
    }
    if (!txHash.trim()) {
      setError('Ingresa el hash de la transaccion')
      setLoading(false)
      return
    }

    try {
      const { error: insertError } = await supabase.from('usdt_deposits').insert({
        user_id: user.id,
        amount: numAmount,
        tx_hash: txHash.trim(),
        network: 'TRC20',
        deposit_address: DEPOSIT_ADDRESS,
        status: 'pending',
      })

      if (insertError) throw new Error(insertError.message)

      await notifyAdminTelegram({
        amount: numAmount,
        tx_hash: txHash.trim(),
        userEmail: user.email || '',
      })

      setSuccess('Recarga enviada. Un administrador la revisara pronto.')
      setAmount('')
      setTxHash('')
      fetchDeposits()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar recarga')
    } finally {
      setLoading(false)
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    approved: 'bg-success/15 text-success',
    rejected: 'bg-danger/15 text-danger',
  }
  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  }

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full animate-fade-in">
      <h1 className="text-2xl font-extrabold mb-2">Recargar USDT</h1>
      <p className="text-text-secondary text-sm mb-6">Red TRC20 (TRON) — Comision mas baja</p>

      {/* QR and Address */}
      <div className="glass rounded-2xl p-6 mb-4 flex flex-col items-center">
        <p className="text-xs text-text-secondary mb-3 font-medium">Envia USDT (TRC20) a esta direccion:</p>
        <div className="bg-white p-3 rounded-xl mb-4">
          <QRCodeSVG
            value={DEPOSIT_ADDRESS}
            size={180}
            bgColor="#ffffff"
            fgColor="#0a0a0f"
            level="M"
          />
        </div>
        <div className="w-full">
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white/5 rounded-lg px-3 py-2 break-all font-mono">
              {DEPOSIT_ADDRESS}
            </code>
            <button
              onClick={copyAddress}
              className="px-3 py-2 rounded-lg glass text-xs font-semibold text-primary-light shrink-0"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs text-warning mt-2 text-center">Solo envia USDT por red TRC20</p>
        </div>
      </div>

      {/* Submit deposit */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div className="glass rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-sm text-text-secondary mb-1 block font-medium">Monto enviado (USDT)</label>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-text text-xl font-bold placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block font-medium">Hash de la transaccion (TXID)</label>
            <input
              type="text"
              placeholder="Pega aqui el hash/TXID de tu transaccion"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-text text-sm font-mono placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        {error && <p className="text-danger text-sm text-center animate-fade-in">{error}</p>}
        {success && <p className="text-success text-sm text-center animate-fade-in">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl gradient-green text-white font-semibold transition-all disabled:opacity-50 hover:shadow-lg active:scale-[0.98]"
        >
          {loading ? 'Enviando...' : 'Confirmar recarga'}
        </button>
      </form>

      {/* Deposit history */}
      {deposits.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Mis recargas</h2>
          <div className="glass rounded-2xl px-4">
            {deposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-semibold">{Number(d.amount).toFixed(2)} USDT</p>
                  <p className="text-xs text-text-secondary font-mono">{d.tx_hash.slice(0, 12)}...{d.tx_hash.slice(-6)}</p>
                  <p className="text-xs text-text-secondary">{new Date(d.created_at).toLocaleString('es-VE')}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${statusColors[d.status]}`}>
                  {statusLabels[d.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
