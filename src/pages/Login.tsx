import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const { signIn, signUp } = useAuthStore()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await signUp(email, password, fullName)
      } else {
        await signIn(email, password)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de autenticacion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-light tracking-tight">DalePay</h1>
          <p className="text-text-secondary mt-2">Tu wallet digital</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-lighter text-text placeholder:text-text-secondary focus:outline-none focus:border-primary"
            />
          )}
          <input
            type="email"
            placeholder="Correo electronico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-lighter text-text placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
          <input
            type="password"
            placeholder="Contrasena"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-lighter text-text placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />

          {error && <p className="text-danger text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando...' : isRegister ? 'Registrarse' : 'Iniciar Sesion'}
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm mt-6">
          {isRegister ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}{' '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError('') }}
            className="text-primary-light font-medium"
          >
            {isRegister ? 'Iniciar sesion' : 'Registrate'}
          </button>
        </p>
      </div>
    </div>
  )
}
