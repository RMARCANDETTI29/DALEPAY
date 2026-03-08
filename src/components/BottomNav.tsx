import { NavLink } from 'react-router-dom'
import { IoHomeOutline, IoHome, IoSendOutline, IoSend, IoSwapHorizontalOutline, IoSwapHorizontal, IoPersonOutline, IoPerson, IoPeopleOutline, IoPeople } from 'react-icons/io5'

const tabs = [
  { path: '/', label: 'Inicio', Icon: IoHomeOutline, ActiveIcon: IoHome },
  { path: '/send', label: 'Enviar', Icon: IoSendOutline, ActiveIcon: IoSend },
  { path: '/p2p', label: 'P2P', Icon: IoPeopleOutline, ActiveIcon: IoPeople },
  { path: '/convert', label: 'Cambio', Icon: IoSwapHorizontalOutline, ActiveIcon: IoSwapHorizontal },
  { path: '/profile', label: 'Perfil', Icon: IoPersonOutline, ActiveIcon: IoPerson },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-strong z-50 safe-bottom">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {tabs.map(({ path, label, Icon, ActiveIcon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs transition-all duration-200 ${
                isActive ? 'text-primary-light scale-105' : 'text-text-secondary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <ActiveIcon size={22} /> : <Icon size={22} />}
                <span className="font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
