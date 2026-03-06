import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { IoLogOutOutline, IoPersonCircleOutline } from 'react-icons/io5'

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

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">Perfil</h1>

      <div className="flex flex-col items-center mb-6">
        <IoPersonCircleOutline size={80} className="text-primary-light mb-2" />
        <h2 className="text-xl font-semibold">{profile?.full_name}</h2>
        <p className="text-text-secondary text-sm">{user?.email}</p>
      </div>

      <div className="bg-surface rounded-xl p-4 space-y-4">
        {editing ? (
          <>
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Nombre</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-light border border-surface-lighter text-text focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Telefono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+58 412 1234567"
                className="w-full px-4 py-3 rounded-xl bg-surface-light border border-surface-lighter text-text placeholder:text-text-secondary focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-3 rounded-xl bg-surface-lighter text-text font-semibold hover:bg-surface-light transition-colors"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between py-2 border-b border-surface-lighter">
              <span className="text-text-secondary">Nombre</span>
              <span>{profile?.full_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-lighter">
              <span className="text-text-secondary">Correo</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-lighter">
              <span className="text-text-secondary">Telefono</span>
              <span>{profile?.phone || 'No registrado'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-secondary">Miembro desde</span>
              <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-VE') : '-'}</span>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="w-full py-3 rounded-xl bg-surface-lighter text-text font-semibold hover:bg-surface-light transition-colors"
            >
              Editar perfil
            </button>
          </>
        )}
      </div>

      <button
        onClick={signOut}
        className="mt-6 w-full py-3 rounded-xl bg-danger/20 text-danger font-semibold flex items-center justify-center gap-2 hover:bg-danger/30 transition-colors"
      >
        <IoLogOutOutline size={20} />
        Cerrar sesion
      </button>
    </div>
  )
}
