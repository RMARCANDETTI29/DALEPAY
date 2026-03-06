import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { FeeCollected, ExchangeRate } from '../types'

interface FeeSummary {
  today: number
  week: number
  month: number
  total: number
  byConversion: number
  byTransfer: number
}

export default function Admin() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<FeeSummary>({ today: 0, week: 0, month: 0, total: 0, byConversion: 0, byTransfer: 0 })
  const [fees, setFees] = useState<FeeCollected[]>([])
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [editingRate, setEditingRate] = useState<string | null>(null)
  const [newRate, setNewRate] = useState('')
  const [loading, setLoading] = useState(true)
  const [userCount, setUserCount] = useState(0)
  const [txCount, setTxCount] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const [feesRes, ratesRes, profilesRes, txRes] = await Promise.all([
      supabase.from('fees_collected').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('exchange_rates').select('*').order('from_currency'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('transactions').select('id', { count: 'exact', head: true }),
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

      setSummary({
        today: feesData.filter(f => new Date(f.created_at) >= startOfDay).reduce((s, f) => s + Number(f.amount), 0),
        week: feesData.filter(f => new Date(f.created_at) >= startOfWeek).reduce((s, f) => s + Number(f.amount), 0),
        month: feesData.filter(f => new Date(f.created_at) >= startOfMonth).reduce((s, f) => s + Number(f.amount), 0),
        total: byConversion + byTransfer,
        byConversion,
        byTransfer,
      })
    }

    if (ratesRes.data) setRates(ratesRes.data)
    setUserCount(profilesRes.count ?? 0)
    setTxCount(txRes.count ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!profile?.is_admin) { navigate('/'); return }
    fetchData()
  }, [profile, navigate, fetchData])

  const handleUpdateRate = async (id: string) => {
    const val = parseFloat(newRate)
    if (isNaN(val) || val <= 0) return
    await supabase.from('exchange_rates').update({ rate: val, updated_at: new Date().toISOString() }).eq('id', id)
    setEditingRate(null)
    setNewRate('')
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
    { label: 'Por conversiones', value: summary.byConversion, color: 'text-warning' },
    { label: 'Por envios P2P', value: summary.byTransfer, color: 'text-accent' },
    { label: 'Total historico', value: summary.total, color: 'text-primary-light' },
  ]

  return (
    <div className="pb-20 px-4 pt-6 max-w-4xl mx-auto w-full animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">Panel Admin</h1>
        <button onClick={() => navigate('/')} className="text-sm text-primary-light font-medium">Volver</button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <div className="glass rounded-2xl p-4 flex-1 text-center">
          <p className="text-2xl font-extrabold text-primary-light">{userCount}</p>
          <p className="text-xs text-text-secondary mt-1">Usuarios</p>
        </div>
        <div className="glass rounded-2xl p-4 flex-1 text-center">
          <p className="text-2xl font-extrabold text-accent">{txCount}</p>
          <p className="text-xs text-text-secondary mt-1">Transacciones</p>
        </div>
      </div>

      {/* Fee Summary Cards */}
      <h2 className="text-lg font-semibold mb-3">Comisiones Cobradas</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="glass rounded-2xl p-4">
            <p className="text-xs text-text-secondary">{card.label}</p>
            <p className={`text-xl font-extrabold ${card.color}`}>${card.value.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Exchange Rates */}
      <h2 className="text-lg font-semibold mb-3">Tasas de Cambio</h2>
      <div className="glass rounded-2xl p-4 mb-6">
        {rates.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <span className="text-sm font-semibold">{r.from_currency} → {r.to_currency}</span>
            {editingRate === r.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.000001"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-28 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  autoFocus
                />
                <button onClick={() => handleUpdateRate(r.id)} className="text-xs text-success font-semibold">OK</button>
                <button onClick={() => setEditingRate(null)} className="text-xs text-danger font-semibold">X</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{Number(r.rate).toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
                <button
                  onClick={() => { setEditingRate(r.id); setNewRate(String(r.rate)) }}
                  className="text-xs text-primary-light font-medium glass px-2 py-1 rounded-lg"
                >
                  Editar
                </button>
              </div>
            )}
          </div>
        ))}
        {rates.length === 0 && <p className="text-text-secondary text-sm text-center py-4">Sin tasas configuradas</p>}
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
                    f.fee_type === 'conversion' ? 'bg-warning/15 text-warning' : 'bg-accent/15 text-accent'
                  }`}>
                    {f.fee_type === 'conversion' ? 'Conversion' : 'Envio'}
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
    </div>
  )
}
