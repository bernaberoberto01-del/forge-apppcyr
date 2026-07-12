import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function UnirseACentro() {
  const { token } = useParams()
  const [estado, setEstado] = useState('cargando')
  const [inv, setInv] = useState(null)
  const [centro, setCentro] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', nombre: '' })
  const [loading, setLoading] = useState(false)
  const [modoLogin, setModoLogin] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { cargarInvitacion() }, [token])

  async function cargarInvitacion() {
    try {
      const { data } = await supabase
        .from('invitaciones_centro')
        .select('*, centros(nombre, color_acento)')
        .eq('token', token)
        .eq('usado', false)
        .single()

      if (!data) { setEstado('error'); return }
      setInv(data)
      setCentro(data.centros)
      setForm(f => ({ ...f, email: data.email || '' }))
      setEstado('pendiente')
    } catch {
      setEstado('error')
    }
  }

  async function aceptar() {
    setLoading(true)
    setError('')
    let userId

    try {
      if (modoLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (error) { setError('Email o contraseña incorrectos'); setLoading(false); return }
        userId = data.user?.id
      } else {
        if (!form.nombre.trim()) { setError('Introduce tu nombre'); setLoading(false); return }
        if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); setLoading(false); return }
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { nombre: form.nombre.trim() } }
        })
        if (error) { setError(error.message); setLoading(false); return }
        userId = data.user?.id
      }

      if (!userId) { setLoading(false); return }

      // Añadir al centro
      await supabase.from('miembros_centro').upsert({
        centro_id: inv.centro_id,
        user_id: userId,
        rol: inv.rol,
        nombre: form.nombre || form.email.split('@')[0],
        email: form.email,
        activo: true,
        color: '#6366f1'
      }, { onConflict: 'centro_id,user_id' })

      // Marcar invitación como usada
      await supabase.from('invitaciones_centro').update({ usado: true }).eq('id', inv.id)

      setEstado('exito')
      setTimeout(() => window.location.href = '/portal-entrenador', 2500)
    } catch (e) {
      setError(e.message || 'Error inesperado')
    }
    setLoading(false)
  }

  const acento = centro?.color_acento || '#FF5C00'

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
        <p className="text-sm text-[#6B6B6B]">Este enlace ya fue usado o ha expirado. Pide al administrador que te envíe uno nuevo.</p>
      </div>
    </div>
  )

  if (estado === 'exito') return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
        <h2 className="font-bold text-[#0A0A0A] mb-2">¡Bienvenido al equipo!</h2>
        <p className="text-sm text-[#6B6B6B]">Accediendo a tu portal...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header con color del centro */}
        <div className="rounded-2xl overflow-hidden mb-4">
          <div className="p-6 text-center" style={{ background: acento }}>
            <p className="text-white/70 text-sm mb-1">Te han invitado a unirte a</p>
            <h1 className="text-white text-xl font-bold">{centro?.nombre}</h1>
            <span className="mt-2 inline-block bg-white/20 text-white text-xs px-3 py-1 rounded-full capitalize">{inv?.rol}</span>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          {!modoLogin && (
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Tu nombre *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre completo" autoFocus
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
            </div>
          )}
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoFocus={modoLogin}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
          </div>
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">
              {modoLogin ? 'Contraseña' : 'Crear contraseña'}
            </label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && aceptar()}
              placeholder={modoLogin ? '••••••••' : 'Mínimo 6 caracteres'}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">{error}</p>
          )}

          <button onClick={aceptar} disabled={!form.email || !form.password || loading}
            className="w-full text-white text-sm font-bold py-3.5 rounded-xl disabled:opacity-40 transition-all active:scale-95"
            style={{ background: acento }}>
            {loading ? 'Entrando...' : modoLogin ? 'Iniciar sesión y unirme' : 'Crear cuenta y unirme →'}
          </button>

          <button onClick={() => { setModoLogin(!modoLogin); setError('') }}
            className="w-full text-xs text-white/40 text-center hover:text-white/60 transition-colors py-1">
            {modoLogin ? '¿No tienes cuenta? Crear una nueva' : '¿Ya tienes cuenta? Iniciar sesión'}
          </button>
        </div>

        <p className="text-center text-white/20 text-xs mt-5">
          Al unirte aceptas que {centro?.nombre} gestione tus datos de trabajo
        </p>
      </div>
    </div>
  )
}
