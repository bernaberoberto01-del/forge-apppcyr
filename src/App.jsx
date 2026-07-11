import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { ConfigContext, useConfigLoader } from './hooks/useConfig'

import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Rutinas from './pages/Rutinas'
import Sesiones from './pages/Sesiones'
import Seguimiento from './pages/Seguimiento'
import Pagos from './pages/Pagos'
import Agenda from './pages/Agenda'
import Configuracion from './pages/Configuracion'
import RegistroCliente from './pages/RegistroCliente'
import PortalCliente from './pages/PortalCliente'
import SesionCliente from './pages/SesionCliente'
import ProgresoCliente from './pages/ProgresoCliente'
import CheckinPublico from './pages/CheckinPublico'
import NotFound from './pages/NotFound'

function Protected({ session, children }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

function AppInner({ session }) {
  const { config, loading, actualizar } = useConfigLoader(session?.user?.id)

  if (loading && session) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--acento)', borderTopColor: 'transparent' }} />
    </div>
  )

  const Wrap = ({ children }) => (
    <Protected session={session}>
      <Layout session={session} config={config}>
        {children}
      </Layout>
    </Protected>
  )

  return (
    <ConfigContext.Provider value={config}>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Wrap><Dashboard session={session} /></Wrap>} />
        <Route path="/clientes" element={<Wrap><Clientes session={session} /></Wrap>} />
        <Route path="/rutinas" element={<Wrap><Rutinas session={session} /></Wrap>} />
        <Route path="/sesiones" element={<Wrap><Sesiones session={session} /></Wrap>} />
        <Route path="/seguimiento" element={<Wrap><Seguimiento session={session} /></Wrap>} />
        <Route path="/pagos" element={<Wrap><Pagos session={session} /></Wrap>} />
        <Route path="/agenda" element={<Wrap><Agenda session={session} /></Wrap>} />
        <Route path="/configuracion" element={<Wrap><Configuracion session={session} onConfigChange={actualizar} /></Wrap>} />
        {/* Rutas públicas cliente */}
        <Route path="/registro" element={<RegistroCliente />} />
        <Route path="/portal/:clienteId" element={<PortalCliente />} />
        <Route path="/sesion/:clienteId" element={<SesionCliente />} />
        <Route path="/progreso/:clienteId" element={<ProgresoCliente />} />
        <Route path="/seguimiento/:clienteId" element={<CheckinPublico />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ConfigContext.Provider>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <BrowserRouter><AppInner session={session} /></BrowserRouter>
}
