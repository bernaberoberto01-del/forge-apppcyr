import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { NavLink, useLocation } from 'react-router-dom'

const TODOS_MODULOS = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'clientes', path: '/clientes', label: 'Clientes', icon: '👥' },
  { id: 'rutinas', path: '/rutinas', label: 'Rutinas', icon: '💪' },
  { id: 'sesiones', path: '/sesiones', label: 'Sesiones', icon: '🏋️' },
  { id: 'seguimiento', path: '/seguimiento', label: 'Seguimiento', icon: '📋' },
  { id: 'pagos', path: '/pagos', label: 'Pagos', icon: '💶' },
  { id: 'agenda', path: '/agenda', label: 'Agenda', icon: '📅' },
  { id: 'biblioteca', path: '/biblioteca', label: 'Biblioteca', icon: '📚' },
  { id: 'nutricion', path: '/nutricion', label: 'Nutrición', icon: '🥗' },
  { id: 'mensajes', path: '/mensajes', label: 'Mensajes', icon: '💬' },
]

export default function Layout({ children, session, config }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mensajesNL, setMensajesNL] = useState(0)
  const location = useLocation()

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!config?.modulos?.mensajes) return
    const uid = session?.user?.id
    if (!uid) return
    supabase.from('mensajes_cliente').select('id', { count: 'exact' })
      .eq('entrenador_id', uid).eq('leido', false)
      .then(({ count }) => setMensajesNL(count || 0))
  }, [location.pathname, config])

  const modulosActivos = TODOS_MODULOS.filter(m => !config?.modulos || config.modulos[m.id] !== false)
  const nombre = config?.nombre_entrenador || session?.user?.email?.split('@')[0] || 'Entrenador'
  const negocio = config?.nombre_negocio || 'Forge Studio OS'
  const acento = config?.color_acento || '#FF5C00'

  const NavItem = ({ item }) => {
    const badge = item.id === 'mensajes' && mensajesNL > 0 ? mensajesNL : 0
    return (
      <NavLink to={item.path}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
            ? 'text-white'
            : 'text-white/50 hover:text-white hover:bg-white/5'}`
        }
        style={({ isActive }) => isActive ? { background: acento } : {}}>
        <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
        <span className="flex-1 truncate">{item.label}</span>
        {badge > 0 && (
          <span className="w-5 h-5 bg-[#FF5C00] rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </NavLink>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: acento }}>
            <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
              <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
              <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
              <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold truncate">{negocio}</p>
            <p className="text-white/40 text-xs truncate">{nombre}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {modulosActivos.map(item => <NavItem key={item.id} item={item} />)}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/8 space-y-1">
        <NavLink to="/configuracion"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`
          }
          style={({ isActive }) => isActive ? { background: acento } : {}}>
          <span className="text-base w-5 text-center flex-shrink-0">⚙️</span>
          <span>Configuración</span>
        </NavLink>
        <button onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-white hover:bg-white/5 transition-all">
          <span className="text-base w-5 text-center flex-shrink-0">→</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#F5F5F0]">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-56 bg-[#111] flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#111] flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar móvil */}
        <header className="md:hidden bg-white border-b border-black/5 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-black/5">
            <div className="space-y-1.5">
              <div className="w-5 h-0.5 bg-[#0A0A0A]" />
              <div className="w-5 h-0.5 bg-[#0A0A0A]" />
              <div className="w-5 h-0.5 bg-[#0A0A0A]" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A0A0A] truncate">{negocio}</p>
          </div>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: acento }}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
              <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
              <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
              <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
            </svg>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Nav móvil inferior */}
        <nav className="md:hidden bg-white border-t border-black/5 flex items-center px-2 py-1 flex-shrink-0 safe-bottom">
          {modulosActivos.slice(0, 5).map(item => (
            <NavLink key={item.id} to={item.path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all ${isActive ? 'opacity-100' : 'opacity-40'}`
              }>
              {({ isActive }) => (
                <>
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[10px] font-medium text-[#0A0A0A]">{item.label.split(' ')[0]}</span>
                  {isActive && <div className="w-1 h-1 rounded-full" style={{ background: acento }} />}
                </>
              )}
            </NavLink>
          ))}
          <NavLink to="/configuracion"
            className={({ isActive }) => `flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all ${isActive ? 'opacity-100' : 'opacity-40'}`}>
            {({ isActive }) => (
              <>
                <span className="text-lg">⚙️</span>
                <span className="text-[10px] font-medium text-[#0A0A0A]">Config</span>
                {isActive && <div className="w-1 h-1 rounded-full" style={{ background: acento }} />}
              </>
            )}
          </NavLink>
        </nav>
      </div>
    </div>
  )
}
