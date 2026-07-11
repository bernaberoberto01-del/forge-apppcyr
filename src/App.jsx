import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { ConfigContext, useConfigLoader } from './hooks/useConfig'
import { CentroProvider } from './hooks/useCentro.jsx'

import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Rutinas from './pages/Rutinas'
import Sesiones from './pages/Sesiones'
import Seguimiento from './pages/Seguimiento'
import Pagos from './pages/Pagos'
import Agenda from './pages/Agenda'
import Configuracion from './pages/Configuracion'
import Mensajes from './pages/Mensajes'
import Nutricion from './pages/Nutricion'
import Biblioteca from './pages/Biblioteca'
import AdminCentro from './pages/AdminCentro'
import NotFound from './pages/NotFound'

// Páginas públicas (sin sesión)
import PortalCliente from './pages/PortalCliente'
import RegistroCliente from './pages/RegistroCliente'
import NutricionCuestionario from './pages/NutricionCuestionario'
import CheckinPublico from './pages/CheckinPublico'
import SesionCliente from './pages/SesionCliente'
import ProgresoCliente from './pages/ProgresoCliente'
import UnirseACentro from './pages/UnirseACentro'

// Rutas privadas con layout
function AppPrivada({ session }) {
  const { config, loading, actualizar } = useConfigLoader(session?.user?.id)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--acento)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <ConfigContext.Provider value={config}>
      <CentroProvider session={session}>
        <Layout session={session} config={config}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard session={session} />} />
            <Route path="/clientes" element={<Clientes session={session} />} />
            <Route path="/rutinas" element={<Rutinas session={session} />} />
            <Route path="/sesiones" element={<Sesiones session={session} />} />
            <Route path="/seguimiento" element={<Seguimiento session={session} />} />
            <Route path="/pagos" element={<Pagos session={session} />} />
            <Route path="/agenda" element={<Agenda session={session} />} />
            <Route path="/nutricion" element={<Nutricion session={session} />} />
            <Route path="/mensajes" element={<Mensajes session={session} />} />
            <Route path="/biblioteca" element={<Biblioteca session={session} />} />
            <Route path="/centro" element={<AdminCentro session={session} />} />
            <Route path="/configuracion" element={<Configuracion session={session} onConfigChange={actualizar} />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </CentroProvider>
    </ConfigContext.Provider>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Cargando sesión
  if (session === undefined) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* ── RUTAS PÚBLICAS ── sin sesión, sin layout, sin contexto */}
          <Route path="/portal/:clienteId" element={<PortalCliente />} />
          <Route path="/registro" element={<RegistroCliente />} />
          <Route path="/nutricion-cuest" element={<NutricionCuestionario />} />
          <Route path="/seguimiento/:clienteId" element={<CheckinPublico />} />
          <Route path="/sesion/:clienteId" element={<SesionCliente />} />
          <Route path="/progreso/:clienteId" element={<ProgresoCliente />} />
          <Route path="/unirse/:token" element={<UnirseACentro />} />

          {/* ── LOGIN ── */}
          <Route path="/login" element={
            session ? <Navigate to="/dashboard" replace /> : <Login />
          } />

          {/* ── RUTAS PRIVADAS ── requieren sesión */}
          <Route path="/*" element={
            session
              ? <AppPrivada session={session} />
              : <Navigate to="/login" replace />
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
