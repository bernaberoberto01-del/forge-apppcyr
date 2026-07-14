import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPortal({ clienteId, onLogin, nombreNegocio, colorAccento }) {
  const [modo, setModo] = useState('entrar') // entrar | registrar
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const acento = colorAccento || '#FF5C00'

  // Vincula la cuenta con la ficha por email (Edge Function segura). Devuelve true si ok.
  async function vincular() {
    const { data, error } = await supabase.functions.invoke('vincular-cliente', { body: {} })
    if (error || !data?.ok) {
      const code = data?.error
      if (code === 'sin_ficha') setError('No encontramos tu ficha con este email. Usa el mismo email que tu entrenador tiene registrado, o contáctale.')
      else if (code === 'ficha_vinculada_a_otra_cuenta') setError('Este cliente ya está vinculado a otra cuenta. Contacta con tu entrenador.')
      else if (code === 'email_no_confirmado') setError('Confirma tu email desde el correo que te hemos enviado y vuelve a entrar.')
      else setError('No se pudo acceder a tu portal. Contacta con tu entrenador.')
      return false
    }
    return true
  }

  async function handleRegistrar(e) {
    e.preventDefault()
    setLoading(true); setError('')

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre: nombre || email.split('@')[0] } }
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setError('Este email ya tiene cuenta. Usa "Entrar" con tu contraseña.')
      } else {
        setError(error.message)
      }
      setLoading(false); return
    }

    // Con confirmación de email activada no hay sesión hasta confirmar
    if (!data.session) {
      setError('Cuenta creada. Revisa tu email para confirmar la cuenta y luego pulsa "Entrar".')
      setLoading(false); return
    }

    // Sesión inmediata (confirmación desactivada): vincular y entrar
    if (await vincular()) onLogin(data.user)
    setLoading(false)
  }

  async function handleEntrar(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false); return
    }
    if (data.user && await vincular()) {
      onLogin(data.user)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
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

        <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-4">
          {[['entrar','Entrar'],['registrar','Crear cuenta']].map(([v,l]) => (
            <button key={v} onClick={() => { setModo(v); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${modo===v?'bg-white text-[#0A0A0A]':'text-white/50 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <form onSubmit={modo === 'entrar' ? handleEntrar : handleRegistrar} className="space-y-3">
            {modo === 'registrar' && (
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Tu nombre</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Nombre completo" autoFocus
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00] transition-colors" />
              </div>
            )}
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" required autoFocus={modo === 'entrar'}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00] transition-colors" />
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={modo === 'registrar' ? 'Mínimo 6 caracteres' : '••••••••'} required
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00] transition-colors" />
            </div>
            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">{error}</p>}
            <button type="submit" disabled={loading || !email || !password}
              className="w-full text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-40"
              style={{ background: acento }}>
              {loading ? '...' : modo === 'entrar' ? 'Entrar →' : 'Crear cuenta →'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-5">Espacio privado · Solo tú puedes acceder</p>
      </div>
    </div>
  )
}
