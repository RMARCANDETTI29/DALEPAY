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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-bg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl translate-y-1/2" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-purple flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-3xl font-extrabold text-white">D</span>
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent tracking-tight">
            DalePay
          </h1>
          <p className="text-text-secondary mt-2">Tu wallet digital multidivisa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-xl glass text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          )}
          <input
            type="email"
            placeholder="Correo electronico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3.5 rounded-xl glass text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <input
            type="password"
            placeholder="Contrasena"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3.5 rounded-xl glass text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />

          {error && <p className="text-danger text-sm text-center animate-fade-in">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl gradient-purple text-white font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
          >
            {loading ? 'Cargando...' : isRegister ? 'Registrarse' : 'Iniciar Sesion'}
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm mt-6">
          {isRegister ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}{' '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError('') }}
            className="text-primary-light font-semibold"
          >
            {isRegister ? 'Iniciar sesion' : 'Registrate'}
          </button>
        </p>
      </div>
    </div>
  )
}
