import { QRCodeSVG } from 'qrcode.react'
import { useAuthStore } from '../store/authStore'

export default function QR() {
  const { user, profile } = useAuthStore()

  if (!user) return null

  const qrData = JSON.stringify({
    app: 'dalepay',
    email: user.email,
    name: profile?.full_name,
  })

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-2">Tu codigo QR</h1>
      <p className="text-text-secondary text-sm mb-8 text-center">
        Comparte este codigo para recibir pagos
      </p>

      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <QRCodeSVG
          value={qrData}
          size={220}
          bgColor="#ffffff"
          fgColor="#1E1E2E"
          level="M"
          includeMargin={false}
        />
      </div>

      <div className="mt-6 text-center">
        <p className="text-lg font-semibold">{profile?.full_name}</p>
        <p className="text-text-secondary text-sm">{user.email}</p>
      </div>

      <div className="mt-6 bg-surface rounded-xl p-4 w-full">
        <p className="text-xs text-text-secondary text-center">
          El remitente debe escanear este codigo desde su app DalePay para enviarte dinero
        </p>
      </div>
    </div>
  )
}
