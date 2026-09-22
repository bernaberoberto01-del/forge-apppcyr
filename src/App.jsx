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
import Grupos from './pages/Grupos'
import AdminCentro from './pages/AdminCentro'
import ImportarDatos from './pages/ImportarDatos'
import PortalEntrenador from './pages/PortalEntrenador'
import NotFound from './pages/NotFound'

// Captura el hash/query de la URL en el momento en que se evalúa este módulo —
// lo más pronto posible, antes de que el propio Supabase (detectSessionInUrl)
// consuma y limpie la URL tras procesar un magic link. Sirve para distinguir
// "este enlace ha caducado/ya se usó" de "esta cuenta es de un entrenador".
const urlAuthInfo = (() => {
  const hash = typeof window !== 'undefined' ? (window.location.hash || '') : ''
  const search = typeof window !== 'undefined' ? (window.location.search || '') : ''
  return {
    tieneError: /error=/.test(hash) || /error=/.test(search) || /error_description=/.test(hash),
    hashVacio: !hash,
  }
})()

// Páginas públicas (sin sesión)
import PortalCliente from './pages/PortalForge'
import RegistroCliente from './pages/RegistroCliente'
import NutricionCuestionario from './pages/NutricionCuestionario'
import CheckinPublico from './pages/CheckinPublico'
import PerfilPublico from './pages/PerfilPublico'
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
            <Route path="/grupos" element={<Grupos session={session} />} />
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

// Lee el mensaje de error real de una respuesta de Edge Function. supabase-js
// no rellena `data` cuando la función responde con un status distinto de 2xx
// (p.ej. el 403 de "es_entrenador") — el body real hay que leerlo de
// error.context, si no error.message suele ser un texto genérico inútil
// ("Edge Function returned a non-2xx status code").
async function extraerErrorEdgeFunction(error) {
  if (!error) return null
  if (error.context && typeof error.context.json === 'function') {
    try { const body = await error.context.clone().json(); if (body?.error) return body.error } catch {}
  }
  return error.message || null
}

// Entrada pública del portal de cliente (/portal): no exige sesión previa como
// el resto del área privada — así, si no hay sesión, se ve el login de CLIENTE
// (LoginPortal, dentro de PortalForge.jsx) en vez de caer en el Login.jsx
// genérico de entrenador. Si hay sesión, detecta el rol y distingue 3 casos:
// cliente vinculado, cuenta de entrenador, o magic link caducado/ya usado
// (la sesión de entrenador persiste porque el intercambio de sesión falló).
function PortalEntrada({ session }) {
  const [estado, setEstado] = useState(undefined) // undefined=comprobando | 'cliente' | 'entrenador' | 'link_caducado' | 'sin_vincular'

  useEffect(() => {
    if (!session) { setEstado(undefined); return }
    let vivo = true
    async function detectar() {
      const uid = session.user.id
      const { data: cli } = await supabase.from('clientes').select('id').eq('auth_user_id', uid).maybeSingle()
      if (cli) { if (vivo) setEstado('cliente'); return }

      const res = await supabase.functions.invoke('vincular-cliente', { body: {} }).catch(e => ({ data: null, error: e }))
      let errorVinculo = res?.data?.error || null
      if (!errorVinculo && res?.error) errorVinculo = await extraerErrorEdgeFunction(res.error)

      if (errorVinculo === 'es_entrenador') { if (vivo) setEstado('entrenador'); return }

      // vincular-cliente pudo haber enlazado la ficha en este mismo intento — recomprobar
      const r = await supabase.from('clientes').select('id').eq('auth_user_id', uid).maybeSingle()
      if (r.data) { if (vivo) setEstado('cliente'); return }

      // No es entrenador y no hay ficha vinculada: distinguir link caducado de cuenta sin vincular
      if (!vivo) return
      setEstado(urlAuthInfo.tieneError || urlAuthInfo.hashVacio ? 'link_caducado' : 'sin_vincular')
    }
    detectar()
    return () => { vivo = false }
  }, [session])

  // Sin sesión: PortalCliente (PortalForge.jsx) detecta !sesion internamente y muestra LoginPortal
  if (!session) return <PortalCliente />

  if (estado === undefined) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (estado === 'cliente') return <PortalCliente />

  const MENSAJES = {
    entrenador: { icono: '👤', titulo: 'Esta es una cuenta de entrenador', texto: 'Has iniciado sesión como entrenador en este navegador. Cierra sesión para acceder como cliente.' },
    link_caducado: { icono: '⏰', titulo: 'Enlace caducado', texto: 'Este enlace ha caducado o ya fue usado. Pide a tu entrenador un enlace nuevo.' },
    sin_vincular: { icono: '🔗', titulo: 'Cuenta no vinculada', texto: 'Este email no está asociado a ningún cliente. Contacta con tu entrenador.' },
  }
  const msg = MENSAJES[estado] || MENSAJES.sin_vincular

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F2F1EE' }}>
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border border-black/5">
        <p className="text-5xl mb-4">{msg.icono}</p>
        <p className="font-bold text-xl mb-2 text-[#0A0A0A]">{msg.titulo}</p>
        <p className="text-sm text-[#6B6B6B] mb-6 leading-relaxed">{msg.texto}</p>
        <button onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/portal' })}
          className="w-full font-bold py-3.5 rounded-2xl text-white text-sm" style={{ background: '#FF5C00' }}>Cerrar sesión y volver</button>
      </div>
    </div>
  )
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
      <Route path="/p/:slug" element={<PerfilPublico />} />
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
          <Route path="/portal" element={<PortalEntrada session={session} />} />
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

