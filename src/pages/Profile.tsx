import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { IoLogOutOutline, IoPersonCircleOutline } from 'react-icons/io5'
import { isTelegram } from '../lib/telegram'

export default function Profile() {
  const { user, profile, signOut, updateProfile } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({ full_name: fullName, phone })
      setEditing(false)
    } catch {
      // handle silently
    } finally {
      setSaving(false)
    }
  }

  const inTelegram = isTelegram()

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full animate-fade-in">
      <h1 className="text-2xl font-extrabold mb-6">Perfil</h1>

      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full gradient-purple flex items-center justify-center mb-3 shadow-lg shadow-primary/20">
          <IoPersonCircleOutline size={48} className="text-white" />
        </div>
        <h2 className="text-xl font-bold">{profile?.full_name}</h2>
        <p className="text-text-secondary text-sm">{user?.email}</p>
        {inTelegram && (
          <span className="mt-2 text-xs glass px-3 py-1 rounded-full text-accent font-medium">
            Telegram Mini App
          </span>
        )}
      </div>

      <div className="glass rounded-2xl p-4 space-y-4">
        {editing ? (
          <>
            <div>
              <label className="text-sm text-text-secondary mb-1 block font-medium">Nombre</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1 block font-medium">Telefono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+58 412 1234567"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl gradient-purple text-white font-semibold transition-all disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-3 rounded-xl glass text-text font-semibold transition-all"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-text-secondary">Nombre</span>
              <span className="font-medium">{profile?.full_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-text-secondary">Correo</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-text-secondary">Telefono</span>
              <span className="font-medium">{profile?.phone || 'No registrado'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-secondary">Miembro desde</span>
              <span className="font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-VE') : '-'}</span>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="w-full py-3 rounded-xl glass text-text font-semibold transition-all hover:bg-white/10"
            >
              Editar perfil
            </button>
          </>
        )}
      </div>

      <button
        onClick={signOut}
        className="mt-6 w-full py-3 rounded-xl bg-danger/10 text-danger font-semibold flex items-center justify-center gap-2 transition-all hover:bg-danger/20 active:scale-[0.98]"
      >
        <IoLogOutOutline size={20} />
        Cerrar sesion
      </button>
    </div>
  )
}
