import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/clientes', label: 'Clientes', icon: '👥' },
  { to: '/cuestionarios', label: 'Registros', icon: '📋' },
  { to: '/rutinas', label: 'Rutinas', icon: '💪' },
  { to: '/pagos', label: 'Pagos', icon: '€' },
  { to: '/seguimiento', label: 'Seguimiento', icon: '📈' },
  { to: '/sesiones', label: 'Sesiones', icon: '🏋️' },
]

export default function Layout({ session }) {
  const navigate = useNavigate()
  const nombre = session?.user?.email?.split('@')[0] || ''
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-[#111] flex flex-col fixed h-full z-10 hidden md:flex">
        <div className="p-5 border-b border-white/10 flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
              <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
              <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
              <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
              <path d="M18 18L23 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M19.5 12H23V15.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white font-semibold">Forge</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-orange-500 text-white font-medium' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <span>{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <p className="text-xs text-gray-500 px-3 mb-1">{nombre}</p>
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10">
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 md:ml-56 min-h-screen"><Outlet /></main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111] border-t border-white/10 flex z-10">
        {nav.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) => `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${isActive ? 'text-orange-500' : 'text-gray-500'}`}>
            <span className="text-base">{item.icon}</span>
            <span className="text-[9px] mt-0.5 truncate w-full text-center px-0.5">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
