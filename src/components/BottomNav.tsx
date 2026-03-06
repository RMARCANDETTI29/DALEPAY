import { NavLink } from 'react-router-dom'
import { IoHomeOutline, IoHome, IoSendOutline, IoSend, IoQrCodeOutline, IoQrCode, IoSwapHorizontalOutline, IoSwapHorizontal, IoPersonOutline, IoPerson } from 'react-icons/io5'

const tabs = [
  { path: '/', label: 'Inicio', Icon: IoHomeOutline, ActiveIcon: IoHome },
  { path: '/send', label: 'Enviar', Icon: IoSendOutline, ActiveIcon: IoSend },
  { path: '/qr', label: 'QR', Icon: IoQrCodeOutline, ActiveIcon: IoQrCode },
  { path: '/convert', label: 'Convertir', Icon: IoSwapHorizontalOutline, ActiveIcon: IoSwapHorizontal },
  { path: '/profile', label: 'Perfil', Icon: IoPersonOutline, ActiveIcon: IoPerson },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-lighter z-50">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {tabs.map(({ path, label, Icon, ActiveIcon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs transition-colors ${
                isActive ? 'text-primary-light' : 'text-text-secondary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <ActiveIcon size={22} /> : <Icon size={22} />}
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
