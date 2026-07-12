import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function UnirseACentro() {
  const params = new URLSearchParams(window.location.search)
  const token = window.location.pathname.split('/unirse/')[1]
  const [estado, setEstado] = useState('cargando') // cargando | pendiente | exito | error
  const [inv, setInv] = useState(null)
  const [centro, setCentro] = useState(null)
  const [form, setForm] = useState({ email:'', password:'', nombre:'' })
  const [loading, setLoading] = useState(false)
  const [modoLogin, setModoLogin] = useState(false)

  useEffect(() => { cargarInvitacion() }, [])

  async function cargarInvitacion() {
    const { data } = await supabase.from('invitaciones_centro').select('*, centros(nombre, color_acento)')
      .eq('token', token).eq('usado', false).single().catch(()=>({data:null}))
    if (!data) { setEstado('error'); return }
    setInv(data); setCentro(data.centros); setForm(f=>({...f,email:data.email})); setEstado('pendiente')
  }

  async function aceptar() {
    setLoading(true)
    let userId

    if (modoLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (error) { alert('Error: ' + error.message); setLoading(false); return }
      userId = data.user?.id
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { nombre: form.nombre } }
      })
      if (error) { alert('Error: ' + error.message); setLoading(false); return }
      userId = data.user?.id
    }

    if (!userId) { setLoading(false); return }

    // Añadir al centro
    await supabase.from('miembros_centro').upsert({
      centro_id: inv.centro_id, user_id: userId, rol: inv.rol,
      nombre: form.nombre || form.email.split('@')[0], email: form.email, activo: true
    }, { onConflict: 'centro_id,user_id' })

    // Marcar invitación como usada
    await supabase.from('invitaciones_centro').update({ usado: true }).eq('id', inv.id)

    setEstado('exito')
    setTimeout(() => window.location.href = '/portal-entrenador', 2000)
    setLoading(false)
  }

  if (estado === 'cargando') return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (estado === 'error') return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="font-bold text-[#0A0A0A] mb-2">Invitación no válida</h2>
        <p className="text-sm text-[#6B6B6B]">Este enlace ya fue usado o ha expirado. Pide al administrador del centro que te envíe uno nuevo.</p>
      </div>
    </div>
  )

  if (estado === 'exito') return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
        <h2 className="font-bold text-[#0A0A0A] mb-2">¡Bienvenido al centro!</h2>
        <p className="text-sm text-[#6B6B6B]">Accediendo a Forge...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center border-b border-black/5" style={{ background: centro?.color_acento || '#FF5C00' }}>
          <p className="text-white/70 text-sm mb-1">Invitación para unirte a</p>
          <h1 className="text-white text-xl font-bold">{centro?.nombre}</h1>
          <span className="mt-2 inline-block bg-white/20 text-white text-xs px-3 py-1 rounded-full capitalize">{inv?.rol}</span>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Tu nombre</label>
            <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
              placeholder="Nombre completo" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Email</label>
            <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">{modoLogin?'Contraseña':'Crear contraseña'}</label>
            <input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
              placeholder="Mínimo 6 caracteres" />
          </div>
          <button onClick={aceptar} disabled={!form.email||!form.password||loading}
            className="w-full text-white text-sm font-bold py-3 rounded-xl disabled:opacity-40 transition-all"
            style={{ background: centro?.color_acento || '#FF5C00' }}>
            {loading ? 'Entrando...' : modoLogin ? 'Iniciar sesión y unirme' : 'Crear cuenta y unirme'}
          </button>
          <button onClick={()=>setModoLogin(!modoLogin)} className="w-full text-xs text-[#6B6B6B] text-center">
            {modoLogin ? '¿No tienes cuenta? Crear una nueva' : '¿Ya tienes cuenta? Iniciar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
