import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Agenda from './pages/Agenda'
import Clientes from './pages/Clientes'
import Pagos from './pages/Pagos'
import Seguimiento from './pages/Seguimiento'
import Sesiones from './pages/Sesiones'
import Rutinas from './pages/Rutinas'
import CheckinPublico from './pages/CheckinPublico'
import PortalCliente from './pages/PortalCliente'
import RegistroCliente from './pages/RegistroCliente'
import SesionCliente from './pages/SesionCliente'
import ProgresoCliente from './pages/ProgresoCliente'

import NotFound from './pages/NotFound'
import Configuracion from './pages/Configuracion'

function Protected({ session, children }) {
  return session ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]"><div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/></div>
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/seguimiento/:clienteId" element={<CheckinPublico />} />
        <Route path="/portal/:clienteId" element={<PortalCliente />} />
        <Route path="/sesion/:clienteId" element={<SesionCliente />} />
        <Route path="/progreso/:clienteId" element={<ProgresoCliente />} />
        <Route path="/registro" element={<RegistroCliente />} />
        <Route path="/" element={<Protected session={session}><Layout session={session} /></Protected>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard session={session} />} />
          <Route path="agenda" element={<Agenda session={session} />} />
          <Route path="clientes" element={<Clientes session={session} />} />
          <Route path="rutinas" element={<Rutinas session={session} />} />
          <Route path="pagos" element={<Pagos session={session} />} />
          <Route path="seguimiento" element={<Seguimiento session={session} />} />
          <Route path="sesiones" element={<Sesiones session={session} />} />
        </Route>
          <Route path="/configuracion" element={<Protected session={session}><Layout session={session}><Configuracion session={session} /></Layout></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
