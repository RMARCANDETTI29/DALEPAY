import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import { formatRate } from '../lib/binanceRate'
import type { FeeCollected, ExchangeRate, UsdtDeposit } from '../types'

interface FeeSummary {
  today: number
  week: number
  month: number
  total: number
  byConversion: number
  byTransfer: number
  byP2p: number
}

export default function Admin() {
  const { user, profile } = useAuthStore()
  const { binanceRate, fetchBinanceRate } = useWalletStore()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<FeeSummary>({ today: 0, week: 0, month: 0, total: 0, byConversion: 0, byTransfer: 0, byP2p: 0 })
  const [fees, setFees] = useState<FeeCollected[]>([])
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [deposits, setDeposits] = useState<UsdtDeposit[]>([])
  const [editingRate, setEditingRate] = useState<string | null>(null)
  const [newRate, setNewRate] = useState('')
  const [loading, setLoading] = useState(true)
  const [userCount, setUserCount] = useState(0)
  const [txCount, setTxCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'deposits' | 'rates'>('overview')

  const fetchData = useCallback(async () => {
    setLoading(true)

    const [feesRes, ratesRes, profilesRes, txRes, depositsRes] = await Promise.all([
      supabase.from('fees_collected').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('exchange_rates').select('*').order('from_currency'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('transactions').select('id', { count: 'exact', head: true }),
      supabase.from('usdt_deposits').select('*').order('created_at', { ascending: false }).limit(50),
    ])

    if (feesRes.data) {
      const feesData = feesRes.data
      setFees(feesData)
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(startOfDay)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const byConversion = feesData.filter(f => f.fee_type === 'conversion').reduce((s, f) => s + Number(f.amount), 0)
      const byTransfer = feesData.filter(f => f.fee_type === 'transfer').reduce((s, f) => s + Number(f.amount), 0)
      const byP2p = feesData.filter(f => f.fee_type === 'p2p').reduce((s, f) => s + Number(f.amount), 0)

      setSummary({
        today: feesData.filter(f => new Date(f.created_at) >= startOfDay).reduce((s, f) => s + Number(f.amount), 0),
        week: feesData.filter(f => new Date(f.created_at) >= startOfWeek).reduce((s, f) => s + Number(f.amount), 0),
        month: feesData.filter(f => new Date(f.created_at) >= startOfMonth).reduce((s, f) => s + Number(f.amount), 0),
        total: byConversion + byTransfer + byP2p,
        byConversion,
        byTransfer,
        byP2p,
      })
    }

    if (ratesRes.data) setRates(ratesRes.data)
    if (depositsRes.data) setDeposits(depositsRes.data)
    setUserCount(profilesRes.count ?? 0)
    setTxCount(txRes.count ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!profile?.is_admin) { navigate('/'); return }
    fetchData()
    fetchBinanceRate()
  }, [profile, navigate, fetchData, fetchBinanceRate])

  const handleUpdateRate = async (id: string) => {
    const val = parseFloat(newRate)
    if (isNaN(val) || val <= 0) return
    await supabase.from('exchange_rates').update({ rate: val, updated_at: new Date().toISOString() }).eq('id', id)
    setEditingRate(null)
    setNewRate('')
    fetchData()
  }

  const handleApproveDeposit = async (deposit: UsdtDeposit) => {
    if (!user) return
    // Approve: update status, credit user wallet
    const { error: updateError } = await supabase
      .from('usdt_deposits')
      .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', deposit.id)

    if (updateError) { alert('Error: ' + updateError.message); return }

    // Credit USDT to user
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', deposit.user_id)
      .eq('currency', 'USDT')
      .single()

    if (wallet) {
      await supabase
        .from('wallets')
        .update({ balance: Number(wallet.balance) + Number(deposit.amount) })
        .eq('id', wallet.id)
    }

    // Record deposit transaction
    await supabase.from('transactions').insert({
      sender_id: deposit.user_id,
      receiver_id: deposit.user_id,
      amount: deposit.amount,
      currency: 'USDT',
      type: 'deposit',
      status: 'completed',
      description: `Recarga USDT TRC20 - ${deposit.tx_hash.slice(0, 12)}...`,
    })

    fetchData()
  }

  const handleRejectDeposit = async (deposit: UsdtDeposit) => {
    if (!user) return
    await supabase
      .from('usdt_deposits')
      .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', deposit.id)
    fetchData()
  }

  if (!profile?.is_admin) return null

  if (loading) {
    return (
      <div className="pb-20 px-4 pt-6 max-w-4xl mx-auto w-full">
        <p className="text-text-secondary text-center py-8">Cargando...</p>
      </div>
    )
  }

  const cards = [
    { label: 'Hoy', value: summary.today, color: 'text-success' },
    { label: 'Esta semana', value: summary.week, color: 'text-success' },
    { label: 'Este mes', value: summary.month, color: 'text-success' },
    { label: 'Conversiones', value: summary.byConversion, color: 'text-warning' },
    { label: 'Envios P2P', value: summary.byTransfer, color: 'text-accent' },
    { label: 'P2P Market', value: summary.byP2p, color: 'text-primary-light' },
  ]

  const pendingDeposits = deposits.filter(d => d.status === 'pending')

  return (
    <div className="pb-20 px-4 pt-6 max-w-4xl mx-auto w-full animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">Panel Admin</h1>
        <button onClick={() => navigate('/')} className="text-sm text-primary-light font-medium">Volver</button>
      </div>

      {/* Binance Rate */}
      {binanceRate && (
        <div className="glass rounded-2xl p-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary">Tasa Binance P2P</p>
            <p className="text-lg font-extrabold text-success">1 USD = {formatRate(binanceRate)} Bs</p>
          </div>
          <button onClick={() => fetchBinanceRate()} className="text-xs text-primary-light font-semibold glass px-3 py-1.5 rounded-lg">
            Actualizar
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-3 mb-4">
        <div className="glass rounded-2xl p-4 flex-1 text-center">
          <p className="text-2xl font-extrabold text-primary-light">{userCount}</p>
          <p className="text-xs text-text-secondary mt-1">Usuarios</p>
        </div>
        <div className="glass rounded-2xl p-4 flex-1 text-center">
          <p className="text-2xl font-extrabold text-accent">{txCount}</p>
          <p className="text-xs text-text-secondary mt-1">Transacciones</p>
        </div>
        {pendingDeposits.length > 0 && (
          <div className="glass rounded-2xl p-4 flex-1 text-center border border-warning/30">
            <p className="text-2xl font-extrabold text-warning">{pendingDeposits.length}</p>
            <p className="text-xs text-text-secondary mt-1">Recargas pend.</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([['overview', 'Resumen'], ['deposits', `Recargas (${pendingDeposits.length})`], ['rates', 'Tasas']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === t ? 'gradient-purple text-white' : 'glass text-text-secondary'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Fee Summary Cards */}
          <h2 className="text-lg font-semibold mb-3">Comisiones Cobradas</h2>
          <p className="text-xs text-text-secondary mb-3">Wallet: TBTeqEJ4PAVxBrcSvWaACCkVzGwM6Sk6Zt</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {cards.map((card) => (
              <div key={card.label} className="glass rounded-2xl p-4">
                <p className="text-xs text-text-secondary">{card.label}</p>
                <p className={`text-xl font-extrabold ${card.color}`}>${card.value.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="glass rounded-2xl p-4 mb-6">
            <p className="text-xs text-text-secondary">Total historico</p>
            <p className="text-2xl font-extrabold text-success">${summary.total.toFixed(2)}</p>
          </div>

          {/* Recent Fees */}
          <h2 className="text-lg font-semibold mb-3">Comisiones Recientes</h2>
          <div className="glass rounded-2xl px-4">
            {fees.length === 0 ? (
              <p className="text-text-secondary text-sm py-6 text-center">Sin comisiones registradas</p>
            ) : (
              fees.slice(0, 20).map((f) => (
                <div key={f.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold mr-2 ${
                        f.fee_type === 'conversion' ? 'bg-warning/15 text-warning' :
                        f.fee_type === 'p2p' ? 'bg-primary/15 text-primary-light' :
                        'bg-accent/15 text-accent'
                      }`}>
                        {f.fee_type === 'conversion' ? 'Conversion' : f.fee_type === 'p2p' ? 'P2P' : 'Envio'}
                      </span>
                      {f.currency}
                    </p>
                    <p className="text-xs text-text-secondary">{new Date(f.created_at).toLocaleString('es-VE')}</p>
                  </div>
                  <p className="text-sm font-bold text-success">${Number(f.amount).toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'deposits' && (
        <>
          <h2 className="text-lg font-semibold mb-3">Recargas USDT</h2>
          <div className="space-y-3">
            {deposits.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-text-secondary text-sm">Sin recargas</p>
              </div>
            ) : (
              deposits.map((d) => {
                const statusColors: Record<string, string> = {
                  pending: 'bg-warning/15 text-warning',
                  approved: 'bg-success/15 text-success',
                  rejected: 'bg-danger/15 text-danger',
                }
                return (
                  <div key={d.id} className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">{Number(d.amount).toFixed(2)} USDT</span>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${statusColors[d.status]}`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary font-mono mb-1">TX: {d.tx_hash}</p>
                    <p className="text-xs text-text-secondary mb-1">Red: {d.network}</p>
                    <p className="text-xs text-text-secondary mb-2">{new Date(d.created_at).toLocaleString('es-VE')}</p>
                    {d.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveDeposit(d)}
                          className="flex-1 py-2 rounded-xl gradient-green text-white text-sm font-semibold">
                          Aprobar
                        </button>
                        <button onClick={() => handleRejectDeposit(d)}
                          className="flex-1 py-2 rounded-xl bg-danger/20 text-danger text-sm font-semibold">
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'rates' && (
        <>
          <h2 className="text-lg font-semibold mb-3">Tasas de Cambio</h2>
          <div className="glass rounded-2xl p-4 mb-6">
            {rates.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <span className="text-sm font-semibold">{r.from_currency} → {r.to_currency}</span>
                {editingRate === r.id ? (
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.000001" value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      className="w-28 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      autoFocus />
                    <button onClick={() => handleUpdateRate(r.id)} className="text-xs text-success font-semibold">OK</button>
                    <button onClick={() => setEditingRate(null)} className="text-xs text-danger font-semibold">X</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{Number(r.rate).toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
                    <button onClick={() => { setEditingRate(r.id); setNewRate(String(r.rate)) }}
                      className="text-xs text-primary-light font-medium glass px-2 py-1 rounded-lg">
                      Editar
                    </button>
                  </div>
                )}
              </div>
            ))}
            {rates.length === 0 && <p className="text-text-secondary text-sm text-center py-4">Sin tasas configuradas</p>}
          </div>
        </>
      )}
    </div>
  )
}
