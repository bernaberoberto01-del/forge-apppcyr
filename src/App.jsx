import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { ConfigContext, useConfigLoader } from './hooks/useConfig'
import { CentroProvider } from './hooks/useCentro.jsx'

import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Rutinas from './pages/Rutinas'
import Seguimiento from './pages/Seguimiento'
import Pagos from './pages/Pagos'
import Agenda from './pages/Agenda'
import Configuracion from './pages/Configuracion'
import Mensajes from './pages/Mensajes'
import Nutricion from './pages/Nutricion'
import Biblioteca from './pages/Biblioteca'
import AdminCentro from './pages/AdminCentro'
import ImportarDatos from './pages/ImportarDatos'
import PortalEntrenador from './pages/PortalEntrenador'
import NotFound from './pages/NotFound'

// Páginas públicas (sin sesión)
import PortalCliente from './pages/PortalCliente'
import RegistroCliente from './pages/RegistroCliente'
import NutricionCuestionario from './pages/NutricionCuestionario'
import CheckinPublico from './pages/CheckinPublico'
import SesionCliente from './pages/SesionCliente'
import ProgresoCliente from './pages/ProgresoCliente'
import UnirseACentro from './pages/UnirseACentro'
import HealthCheck from './pages/HealthCheck'

// Rutas privadas con layout
function AppPrivada({ session }) {
  const { config, loading, actualizar } = useConfigLoader(session?.user?.id)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--acento)', borderTopColor: 'transparent' }} />
    </div>
  )

  // Si no tiene config propia (no es owner/admin, o la cuenta ni siquiera es de
  // un entrenador) → portal entrenador. Se comprueba en TODAS las rutas privadas,
  // no solo en "/", para que no baste con teclear /dashboard directamente.
  if (!config?.nombre_negocio) {
    return <Navigate to="/portal-entrenador" replace />
  }

  return (
    <ConfigContext.Provider value={config}>
      <CentroProvider session={session}>
        <Layout session={session} config={config}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard session={session} />} />
            <Route path="/clientes" element={<Clientes session={session} />} />
            <Route path="/rutinas" element={<Rutinas session={session} />} />
            <Route path="/seguimiento" element={<Seguimiento session={session} />} />
            <Route path="/pagos" element={<Pagos session={session} />} />
            <Route path="/agenda" element={<Agenda session={session} />} />
            <Route path="/nutricion" element={<Nutricion session={session} />} />
            <Route path="/mensajes" element={<Mensajes session={session} />} />
            <Route path="/biblioteca" element={<Biblioteca session={session} />} />
            <Route path="/centro" element={<AdminCentro session={session} />} />
            <Route path="/importar" element={<ImportarDatos session={session} />} />
            <Route path="/configuracion" element={<Configuracion session={session} onConfigChange={actualizar} />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </CentroProvider>
    </ConfigContext.Provider>
  )
}

// Ruta portal entrenador — redirige a app completa si es admin/owner
function PortalEntrenadorRoute({ session }) {
  if (!session) return <Navigate to="/login" replace />
  return <PortalEntrenador session={session} />
}

// Detecta el rol de la cuenta autenticada y enruta:
//   cliente (tiene ficha vinculada) → portal del cliente
//   resto (entrenador) → app del entrenador de siempre
function AreaPrivada({ session }) {
  const [esCliente, setEsCliente] = useState(undefined) // undefined=comprobando

  useEffect(() => {
    let vivo = true
    async function detectar() {
      const uid = session.user.id
      let { data: cli } = await supabase.from('clientes').select('id').eq('auth_user_id', uid).maybeSingle()
      if (!cli) {
        // Primer acceso: intentar vincular por email
        const res = await supabase.functions.invoke('vincular-cliente', { body: {} }).catch(() => ({ data: null }))
        // Si es entrenador no vincular — ir al dashboard directamente
        if (res?.data?.error === 'es_entrenador' || res?.error?.message?.includes('es_entrenador')) {
          if (vivo) setEsCliente(false)
          return
        }
        const r = await supabase.from('clientes').select('id').eq('auth_user_id', uid).maybeSingle()
        cli = r.data
      }
      if (vivo) setEsCliente(!!cli)
    }
    detectar()
    return () => { vivo = false }
  }, [session])

  if (esCliente === undefined) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Cliente: portal + sus flujos (registrar entreno, check-in), todo por sesión
  if (esCliente) return (
    <Routes>
      <Route path="/sesion" element={<SesionCliente />} />
      <Route path="/seguimiento" element={<CheckinPublico />} />
      <Route path="/*" element={<PortalCliente />} />
    </Routes>
  )

  // Entrenador
  return <AppPrivada session={session} />
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
          {/* ── Enlaces ANTIGUOS con ID de cliente en la URL ──
              Ya no se usan: el cliente entra, inicia sesión y el sistema sabe
              quién es. Se redirigen para no romper enlaces guardados. */}
          <Route path="/portal/:clienteId" element={<Navigate to="/" replace />} />
          <Route path="/sesion/:clienteId" element={<Navigate to="/sesion" replace />} />
          <Route path="/seguimiento/:clienteId" element={<Navigate to="/seguimiento" replace />} />

          {/* ── OTRAS RUTAS PÚBLICAS ── */}
          <Route path="/registro" element={<RegistroCliente />} />
          <Route path="/nutricion-cuest" element={<NutricionCuestionario />} />
          <Route path="/progreso/:clienteId" element={<ProgresoCliente />} />
          <Route path="/portal-entrenador" element={<PortalEntrenadorRoute session={session} />} />
          <Route path="/unirse/:token" element={<UnirseACentro />} />

          {/* ── LOGIN ── */}
          <Route path="/health" element={<HealthCheck session={session} />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={
            session ? <Navigate to="/" replace /> : <Login />
          } />

          {/* ── ÁREA PRIVADA ── requiere sesión; el rol decide qué se ve */}
          <Route path="/*" element={
            session
              ? <AreaPrivada session={session} />
              : <Navigate to="/login" replace />
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
