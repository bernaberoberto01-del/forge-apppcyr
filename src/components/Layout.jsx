import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/agenda', label: 'Agenda', icon: '📅' },
  { to: '/clientes', label: 'Clientes', icon: '👥' },
  { to: '/rutinas', label: 'Rutinas', icon: '💪' },
  { to: '/pagos', label: 'Pagos', icon: '€' },
  { to: '/seguimiento', label: 'Seguimiento', icon: '📈' },
  { to: '/sesiones', label: 'Sesiones', icon: '🏋️' },
]

export default function Layout({ session }) {
  const navigate = useNavigate()
  const nombre = session?.user?.email?.split('@')[0] || ''
  const inicial = nombre[0]?.toUpperCase() || 'U'

  return (
    <div className="flex min-h-screen bg-[#F5F5F0]">
      <aside className="w-60 bg-[#111] flex flex-col fixed h-full z-20 hidden md:flex">
        <div className="p-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FF5C00] rounded-xl flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
                <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
                <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
                <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
                <path d="M18 18L23 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M19.5 12H23V15.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-base leading-none">Forge</p>
              <p className="text-white/40 text-xs mt-0.5">Studio OS</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? 'bg-[#FF5C00] text-white font-semibold' : 'text-white/50 hover:bg-white/8 hover:text-white'
                }`}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/8">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-8 h-8 bg-[#FF5C00]/20 rounded-full flex items-center justify-center text-[#FF5C00] font-bold text-sm flex-shrink-0">{inicial}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{nombre}</p>
              <p className="text-white/30 text-xs">Entrenador</p>
            </div>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/40 hover:text-white hover:bg-white/8 rounded-xl transition-all">
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 md:ml-60 min-h-screen pb-20 md:pb-0"><Outlet /></main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111] border-t border-white/8 flex z-20">
        {nav.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 transition-all ${isActive ? 'text-[#FF5C00]' : 'text-white/40'}`}>
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[8px] mt-1 font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
