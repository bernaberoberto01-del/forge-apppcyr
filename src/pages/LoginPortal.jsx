import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPortal({ clienteId, onLogin, nombreNegocio, colorAccento }) {
  const [modo, setModo] = useState('magic') // magic | password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [esNuevo, setEsNuevo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const acento = colorAccento || '#FF5C00'

  async function enviarMagicLink() {
    if (!email) return
    setLoading(true); setError('')
    const redirectUrl = `${window.location.origin}/portal/${clienteId}`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl }
    })
    if (error) setError(error.message)
    else setEnviado(true)
    setLoading(false)
  }

  async function entrarConContrasena() {
    if (!email || !password) return
    setLoading(true); setError('')
    if (esNuevo) {
      // Crear cuenta nueva y vincular con el cliente
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { nombre: nombre || email.split('@')[0] } }
      })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.user) {
        // Vincular auth_user_id con el cliente
        await supabase.from('clientes').update({ auth_user_id: data.user.id }).eq('id', clienteId)
        onLogin(data.user)
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('Email o contraseña incorrectos'); setLoading(false); return }
      onLogin(data.user)
    }
    setLoading(false)
  }

  if (enviado) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-8 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl" style={{ background: `${acento}15` }}>✉️</div>
        <h2 className="text-xl font-bold text-[#0A0A0A] mb-2">Revisa tu email</h2>
        <p className="text-sm text-[#6B6B6B] leading-relaxed">
          Te hemos enviado un enlace de acceso a <span className="font-semibold text-[#0A0A0A]">{email}</span>.<br/>
          Pulsa el enlace del email para entrar.
        </p>
        <button onClick={() => setEnviado(false)} className="mt-6 text-sm text-[#6B6B6B] underline">
          Volver
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: acento }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
              <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
              <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold">{nombreNegocio || 'Tu portal'}</h1>
          <p className="text-white/40 text-sm mt-1">Accede a tu espacio personal</p>
        </div>

        {/* Toggle magic / password */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-5">
          <button onClick={() => setModo('magic')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${modo === 'magic' ? 'bg-white text-[#0A0A0A]' : 'text-white/50 hover:text-white'}`}>
            ✉️ Magic link
          </button>
          <button onClick={() => setModo('password')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${modo === 'password' ? 'bg-white text-[#0A0A0A]' : 'text-white/50 hover:text-white'}`}>
            🔑 Contraseña
          </button>
        </div>

        <div className="bg-white rounded-2xl p-5 space-y-3">
          {/* Magic link */}
          {modo === 'magic' && (
            <>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Introduce tu email y te enviamos un enlace para entrar directamente. Sin contraseña.
              </p>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && enviarMagicLink()}
                  placeholder="tu@email.com" autoFocus
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={enviarMagicLink} disabled={!email || loading}
                className="w-full text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
                style={{ background: acento }}>
                {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
              </button>
            </>
          )}

          {/* Email + contraseña */}
          {modo === 'password' && (
            <>
              {esNuevo && (
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre" autoFocus
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" autoFocus={!esNuevo}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && entrarConContrasena()}
                  placeholder={esNuevo ? 'Mínimo 6 caracteres' : '••••••••'}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={entrarConContrasena} disabled={!email || !password || loading}
                className="w-full text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
                style={{ background: acento }}>
                {loading ? (esNuevo ? 'Creando cuenta...' : 'Entrando...') : (esNuevo ? 'Crear cuenta y entrar' : 'Entrar')}
              </button>
              <button onClick={() => { setEsNuevo(!esNuevo); setError('') }}
                className="w-full text-xs text-[#6B6B6B] text-center py-1">
                {esNuevo ? '¿Ya tienes cuenta? Inicia sesión' : '¿Primera vez? Crea tu cuenta'}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Este es tu espacio privado — solo tú puedes acceder
        </p>
      </div>
    </div>
  )
}
