import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { FeeCollected, ExchangeRate } from '../types'

interface FeeSummary {
  today: number
  week: number
  month: number
  byConversion: number
  byTransfer: number
}

export default function Admin() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [fees, setFees] = useState<FeeCollected[]>([])
  const [summary, setSummary] = useState<FeeSummary>({ today: 0, week: 0, month: 0, byConversion: 0, byTransfer: 0 })
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [editingRate, setEditingRate] = useState<string | null>(null)
  const [newRate, setNewRate] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: feesData } = await supabase
      .from('fees_collected')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (feesData) {
      setFees(feesData)
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(startOfDay)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      setSummary({
        today: feesData.filter(f => new Date(f.created_at) >= startOfDay).reduce((s, f) => s + Number(f.amount), 0),
        week: feesData.filter(f => new Date(f.created_at) >= startOfWeek).reduce((s, f) => s + Number(f.amount), 0),
        month: feesData.filter(f => new Date(f.created_at) >= startOfMonth).reduce((s, f) => s + Number(f.amount), 0),
        byConversion: feesData.filter(f => f.fee_type === 'conversion').reduce((s, f) => s + Number(f.amount), 0),
        byTransfer: feesData.filter(f => f.fee_type === 'transfer').reduce((s, f) => s + Number(f.amount), 0),
      })
    }

    const { data: ratesData } = await supabase.from('exchange_rates').select('*').order('from_currency')
    if (ratesData) setRates(ratesData)

    setLoading(false)
  }, [])

  useEffect(() => {
    if (!profile?.is_admin) {
      navigate('/')
      return
    }
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

  return (
    <div className="pb-20 px-4 pt-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Panel de Admin</h1>
        <button onClick={() => navigate('/')} className="text-sm text-primary-light">Volver</button>
      </div>

      {/* Fee Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs text-text-secondary">Hoy</p>
          <p className="text-xl font-bold text-success">${summary.today.toFixed(2)}</p>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs text-text-secondary">Esta semana</p>
          <p className="text-xl font-bold text-success">${summary.week.toFixed(2)}</p>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs text-text-secondary">Este mes</p>
          <p className="text-xl font-bold text-success">${summary.month.toFixed(2)}</p>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs text-text-secondary">Por conversiones</p>
          <p className="text-xl font-bold text-warning">${summary.byConversion.toFixed(2)}</p>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs text-text-secondary">Por envios P2P</p>
          <p className="text-xl font-bold text-accent">${summary.byTransfer.toFixed(2)}</p>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs text-text-secondary">Total historico</p>
          <p className="text-xl font-bold text-primary-light">${(summary.byConversion + summary.byTransfer).toFixed(2)}</p>
        </div>
      </div>

      {/* Exchange Rates */}
      <h2 className="text-lg font-semibold mb-3">Tasas de Cambio</h2>
      <div className="bg-surface rounded-xl p-4 mb-6">
        {rates.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-2 border-b border-surface-lighter last:border-0">
            <span className="text-sm font-medium">{r.from_currency} → {r.to_currency}</span>
            {editingRate === r.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.000001"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-28 px-2 py-1 rounded bg-surface-light border border-surface-lighter text-text text-sm focus:outline-none focus:border-primary"
                  autoFocus
                />
                <button onClick={() => handleUpdateRate(r.id)} className="text-xs text-success font-medium">OK</button>
                <button onClick={() => setEditingRate(null)} className="text-xs text-danger font-medium">X</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{Number(r.rate).toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
                <button
                  onClick={() => { setEditingRate(r.id); setNewRate(String(r.rate)) }}
                  className="text-xs text-primary-light"
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
      <div className="bg-surface rounded-xl px-4">
        {fees.length === 0 ? (
          <p className="text-text-secondary text-sm py-6 text-center">Sin comisiones registradas</p>
        ) : (
          fees.slice(0, 20).map((f) => (
            <div key={f.id} className="flex items-center justify-between py-3 border-b border-surface-lighter last:border-0">
              <div>
                <p className="text-sm">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${f.fee_type === 'conversion' ? 'bg-warning/20 text-warning' : 'bg-accent/20 text-accent'}`}>
                    {f.fee_type === 'conversion' ? 'Conversion' : 'Envio'}
                  </span>
                  {f.currency}
                </p>
                <p className="text-xs text-text-secondary">{new Date(f.created_at).toLocaleString('es-VE')}</p>
              </div>
              <p className="text-sm font-semibold text-success">${Number(f.amount).toFixed(2)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
