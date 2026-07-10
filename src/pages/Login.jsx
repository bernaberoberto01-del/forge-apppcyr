import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FF5C00] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
              <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
              <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
              <path d="M18 18L23 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M19.5 12H23V15.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-white text-2xl font-bold">Forge</h1>
          <p className="text-white/40 text-sm mt-1">Studio OS</p>
        </div>

        {/* Form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Acceder a tu cuenta</h2>
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" required
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00] transition-colors" />
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00] transition-colors" />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading || !email || !password}
              className="w-full bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold py-3.5 rounded-xl transition-all active:scale-98 disabled:opacity-40 mt-2">
              {loading ? 'Entrando...' : 'Entrar →'}
            </button>
          </form>
        </div>
        <p className="text-white/20 text-xs text-center mt-6">Forge Studio OS · Solo para entrenadores</p>
      </div>
    </div>
  )
}
