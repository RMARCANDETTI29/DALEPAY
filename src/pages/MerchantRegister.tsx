import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

type Plan = 'basico' | 'pro'

const PLANS: { id: Plan; name: string; price: number; features: string[] }[] = [
  {
    id: 'basico',
    name: 'Basico',
    price: 10,
    features: ['Recibir pagos con QR', 'Historial de transacciones', 'Soporte por email'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 30,
    features: ['Todo del plan Basico', 'API de pagos', 'Dashboard avanzado', 'Soporte prioritario', 'Multiples puntos de venta'],
  },
]

export default function MerchantRegister() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [rif, setRif] = useState('')
  const [plan, setPlan] = useState<Plan>('basico')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedPlan = PLANS.find(p => p.id === plan)!

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)

      const { error: insertError } = await supabase.from('merchants').insert({
        user_id: user.id,
        business_name: businessName,
        rif,
        plan,
        plan_price: selectedPlan.price,
        expires_at: expiresAt.toISOString(),
      })

      if (insertError) {
        if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
          throw new Error('Este RIF ya esta registrado')
        }
        throw new Error(insertError.message)
      }

      setSuccess('Comercio registrado exitosamente')
      setBusinessName('')
      setRif('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Registro de Comercio</h1>
        <button onClick={() => navigate('/')} className="text-sm text-primary-light">Volver</button>
      </div>

      {/* Plan Selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {PLANS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlan(p.id)}
            className={`rounded-xl p-4 text-left border-2 transition-colors ${
              plan === p.id
                ? 'border-primary bg-primary/10'
                : 'border-surface-lighter bg-surface'
            }`}
          >
            <p className="font-semibold text-lg">{p.name}</p>
            <p className="text-2xl font-bold text-primary-light">${p.price}<span className="text-sm text-text-secondary font-normal">/mes</span></p>
            <ul className="mt-3 space-y-1">
              {p.features.map((f) => (
                <li key={f} className="text-xs text-text-secondary">- {f}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-text-secondary mb-1 block">Nombre del comercio</label>
          <input
            type="text"
            placeholder="Mi Tienda C.A."
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-lighter text-text placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary mb-1 block">RIF</label>
          <input
            type="text"
            placeholder="J-12345678-9"
            value={rif}
            onChange={(e) => setRif(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-lighter text-text placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="bg-surface rounded-xl p-4">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Plan seleccionado</span>
            <span className="font-medium">{selectedPlan.name}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-text-secondary">Costo mensual</span>
            <span className="font-bold text-primary-light">${selectedPlan.price}/mes</span>
          </div>
        </div>

        {error && <p className="text-danger text-sm text-center">{error}</p>}
        {success && <p className="text-success text-sm text-center">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'Registrar Comercio'}
        </button>
      </form>
    </div>
  )
}
