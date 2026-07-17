import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [sesionValida, setSesionValida] = useState(undefined) // undefined=comprobando, false=inválida, true=ok
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hecho, setHecho] = useState(false)

  useEffect(() => {
    // Supabase intercambia el token del enlace del email por una sesión temporal
    // de tipo "recovery" automáticamente al cargar la página.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesionValida(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesionValida(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else setHecho(true)
    setLoading(false)
  }

  if (sesionValida === undefined) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (sesionValida === false) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-3xl mb-3">🔗</p>
        <h2 className="text-white text-xl font-bold mb-2">Enlace no válido o caducado</h2>
        <p className="text-white/50 text-sm leading-relaxed">
          Vuelve a pedir "¿Has olvidado tu contraseña?" desde el login para recibir un enlace nuevo.
        </p>
        <a href="/login" className="inline-block mt-6 text-[#FF5C00] text-sm font-semibold">Ir al login →</a>
      </div>
    </div>
  )

  if (hecho) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h2 className="text-white text-xl font-bold mb-2">Contraseña actualizada</h2>
        <p className="text-white/50 text-sm leading-relaxed">Ya puedes entrar con tu nueva contraseña.</p>
        <a href="/login" className="inline-block mt-6 text-[#FF5C00] text-sm font-semibold">Ir al login →</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-white text-xl font-bold">Nueva contraseña</h1>
          <p className="text-white/40 text-sm mt-1">Elige una contraseña nueva para tu cuenta</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <form onSubmit={guardar} className="space-y-3">
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Nueva contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" required autoFocus
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00] transition-colors" />
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Repite la contraseña</label>
              <input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00] transition-colors" />
            </div>
            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
            <button type="submit" disabled={loading || !password || !password2}
              className="w-full bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-40 mt-1">
              {loading ? '...' : 'Guardar contraseña →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
