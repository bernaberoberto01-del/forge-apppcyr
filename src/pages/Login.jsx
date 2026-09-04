import { useState } from 'react'
import { supabase } from '../lib/supabase'

const LOGO = (
  <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
    <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
    <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
    <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
  </svg>
)

export default function Login() {
  const [modo, setModo] = useState('cliente') // cliente | entrenador | registrar
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [registrado, setRegistrado] = useState(false)
  const [recuperar, setRecuperar] = useState(false)
  const [recuperarEnviado, setRecuperarEnviado] = useState(false)

  async function handleMagicLink(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/portal` }
    })
    if (error) setError('No se pudo enviar el link. Comprueba el email.')
    else setEnviado(true)
    setLoading(false)
  }

  async function handleEntrar(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    setLoading(false)
  }

  async function handleRecuperar(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) setError(error.message)
    else setRecuperarEnviado(true)
    setLoading(false)
  }

  async function handleRegistrar(e) {
    e.preventDefault()
    if (!nombre.trim()) { setError('Pon tu nombre'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre: nombre.trim() } }
    })
    if (error) setError(error.message)
    else setRegistrado(true)
    setLoading(false)
  }

  if (enviado) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">📧</div>
        <h2 className="text-white text-xl font-bold mb-2">Revisa tu email</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-2">
          Te hemos enviado un link de acceso a
        </p>
        <p className="text-white font-semibold text-sm mb-6">{email}</p>
        <p className="text-white/30 text-xs leading-relaxed mb-6">
          Pulsa el enlace del email para entrar directamente a tu portal. Válido durante 1 hora.
        </p>
        <button onClick={() => { setEnviado(false); setEmail('') }}
          className="text-[#FF5C00] text-sm font-semibold">
          ← Usar otro email
        </button>
      </div>
    </div>
  )

  if (registrado) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h2 className="text-white text-xl font-bold mb-2">Cuenta creada</h2>
        <p className="text-white/50 text-sm leading-relaxed">
          Revisa tu email para confirmar la cuenta.
        </p>
        <button onClick={() => { setRegistrado(false); setModo('entrenador') }}
          className="mt-6 text-[#FF5C00] text-sm font-semibold">Ir al login →</button>
      </div>
    </div>
  )

  if (recuperarEnviado) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h2 className="text-white text-xl font-bold mb-2">Email enviado</h2>
        <p className="text-white/50 text-sm">
          Si <strong className="text-white/80">{email}</strong> tiene una cuenta, recibirás el enlace en breve.
        </p>
        <button onClick={() => { setRecuperarEnviado(false); setRecuperar(false); setModo('entrenador') }}
          className="mt-6 text-[#FF5C00] text-sm font-semibold">← Volver</button>
      </div>
    </div>
  )

  if (recuperar) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-white text-xl font-bold">Recuperar contraseña</h1>
          <p className="text-white/40 text-sm mt-1">Te mandamos un enlace a tu email</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <form onSubmit={handleRecuperar} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required autoFocus
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
            <button type="submit" disabled={loading || !email}
              className="w-full bg-[#FF5C00] text-white font-bold py-3.5 rounded-xl disabled:opacity-40">
              {loading ? '...' : 'Enviar enlace →'}
            </button>
            <button type="button" onClick={() => { setRecuperar(false); setError('') }}
              className="w-full text-white/50 text-sm py-2 text-center">← Volver</button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FF5C00] rounded-2xl flex items-center justify-center mx-auto mb-4">{LOGO}</div>
          <h1 className="text-white text-2xl font-bold">Forge</h1>
          <p className="text-white/40 text-sm mt-1">Studio OS</p>
        </div>

        {/* Tabs principales */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-4">
          {[['cliente','Soy cliente'],['entrenador','Soy entrenador']].map(([v,l]) => (
            <button key={v} onClick={() => { setModo(v); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${modo===v?'bg-white text-[#0A0A0A]':'text-white/50 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Cliente — magic link, sin contraseña */}
        {modo === 'cliente' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-white/50 text-xs text-center mb-5 leading-relaxed">
              Pon tu email y te enviamos un enlace directo a tu portal. Sin contraseñas.
            </p>
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" required autoFocus
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
              {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
              <button type="submit" disabled={loading || !email}
                className="w-full bg-[#FF5C00] text-white font-bold py-3.5 rounded-xl disabled:opacity-40 active:scale-95 transition-all">
                {loading ? '...' : 'Enviarme el link →'}
              </button>
            </form>
            <p className="text-white/20 text-xs text-center mt-4">El link llega en segundos · Válido 1 hora</p>
          </div>
        )}

        {/* Entrenador — contraseña o crear cuenta */}
        {(modo === 'entrenador' || modo === 'registrar') && (
          <>
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-4">
              {[['entrenador','Entrar'],['registrar','Crear cuenta']].map(([v,l]) => (
                <button key={v} onClick={() => { setModo(v); setError('') }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${modo===v?'bg-white/20 text-white':'text-white/40 hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <form onSubmit={modo === 'entrenador' ? handleEntrar : handleRegistrar} className="space-y-3">
                {modo === 'registrar' && (
                  <input value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
                )}
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" required autoFocus
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
                <div>
                  {modo === 'entrenador' && (
                    <div className="flex justify-end mb-1.5">
                      <button type="button" onClick={() => { setRecuperar(true); setError('') }}
                        className="text-[#FF5C00] text-xs font-medium hover:underline">
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={modo === 'registrar' ? 'Mínimo 6 caracteres' : '••••••••'} required
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
                </div>
                {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
                <button type="submit" disabled={loading || !email || !password}
                  className="w-full bg-[#FF5C00] text-white font-bold py-3.5 rounded-xl disabled:opacity-40 active:scale-95 transition-all">
                  {loading ? '...' : modo === 'entrenador' ? 'Entrar →' : 'Crear cuenta →'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
