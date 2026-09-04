import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PerfilPublico() {
  const { slug } = useParams()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [formData, setFormData] = useState({ nombre:'', email:'', telefono:'', objetivo:'', mensaje:'' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    supabase.from('configuracion')
      .select('*')
      .eq('slug_publico', slug)
      .eq('perfil_publico_activo', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return }
        setConfig(data)
        setLoading(false)
      })
  }, [slug])

  async function enviarContacto(e) {
    e.preventDefault()
    if (!formData.nombre || !formData.email) return
    setEnviando(true)
    // Guardar como cuestionario pendiente
    await supabase.from('cuestionarios').insert({
      entrenador_id: config.entrenador_id,
      nombre: formData.nombre,
      email: formData.email,
      ciudad: formData.telefono ? `Tel: ${formData.telefono}` : null,
      objetivo: formData.objetivo || 'consulta',
      expectativas_30dias: formData.mensaje,
      procesado: false,
    })
    setEnviado(true)
    setEnviando(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-bold text-[#0A0A0A]">Perfil no encontrado</p>
        <p className="text-sm text-[#9B9B9B] mt-1">Comprueba el enlace e inténtalo de nuevo</p>
      </div>
    </div>
  )

  const acento = config.color_acento || '#FF5C00'
  const tarifas = [
    { nombre: 'Asesoría Online — Entrenamiento', precio: '35€/mes', desc: 'Rutina personalizada + seguimiento semanal + mensajería directa', icono: '💪' },
    { nombre: 'Asesoría Online — Nutrición', precio: '29€/mes', desc: 'Plan de alimentación personalizado + ajuste mensual', icono: '🥗' },
    { nombre: 'Asesoría Online — Completo', precio: '49€/mes', desc: 'Entrenamiento + nutrición + seguimiento semanal completo', icono: '⚡' },
  ]

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{background:`linear-gradient(135deg, #0A0A0A 0%, ${acento}22 100%)`}}>
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold"
            style={{background:acento}}>
            {config.nombre_entrenador?.charAt(0) || 'E'}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{config.nombre_entrenador}</h1>
          <p className="text-white/60 text-sm mb-4">{config.nombre_negocio}</p>
          {config.anos_experiencia && (
            <p className="text-white/80 text-sm mb-6">
              {config.anos_experiencia} años de experiencia
            </p>
          )}
          {config.bio && (
            <p className="text-white/70 text-sm leading-relaxed max-w-md mx-auto mb-8">{config.bio}</p>
          )}
          <button onClick={() => setMostrarForm(true)}
            className="px-8 py-4 rounded-2xl text-white font-bold text-base shadow-xl active:scale-95 transition-all"
            style={{background:acento}}>
            Solicitar información →
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Especialidades */}
        {config.especialidades?.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-[#0A0A0A] mb-4">Especialidades</h2>
            <div className="flex flex-wrap gap-2">
              {config.especialidades.map(esp => (
                <span key={esp} className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{background:acento}}>
                  {esp}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Planes */}
        <div>
          <h2 className="text-lg font-bold text-[#0A0A0A] mb-4">Planes y precios</h2>
          <div className="space-y-3">
            {tarifas.map(t => (
              <div key={t.nombre} className="bg-white rounded-2xl border border-black/5 p-4 flex items-start gap-4">
                <span className="text-2xl flex-shrink-0">{t.icono}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#0A0A0A]">{t.nombre}</p>
                  <p className="text-xs text-[#9B9B9B] mt-0.5">{t.desc}</p>
                </div>
                <p className="text-sm font-bold flex-shrink-0" style={{color:acento}}>{t.precio}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cómo funciona */}
        <div>
          <h2 className="text-lg font-bold text-[#0A0A0A] mb-4">Cómo funciona</h2>
          <div className="space-y-3">
            {[
              ['1', 'Rellenas el formulario de diagnóstico', 'Cuéntame tu objetivo, historial y disponibilidad'],
              ['2', 'Recibo tu plan personalizado', 'Rutina, nutrición y todo en tu portal privado en menos de 48h'],
              ['3', 'Check-in semanal', 'Cada semana revisamos tu progreso y ajustamos el plan'],
            ].map(([n, t, s]) => (
              <div key={n} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{background:acento}}>{n}</div>
                <div>
                  <p className="text-sm font-semibold text-[#0A0A0A]">{t}</p>
                  <p className="text-xs text-[#9B9B9B]">{s}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="rounded-2xl p-6 text-center" style={{background:`${acento}12`}}>
          <p className="font-bold text-[#0A0A0A] mb-2">¿Listo para empezar?</p>
          <p className="text-sm text-[#6B6B6B] mb-4">Rellena el formulario y te respondo en menos de 24h</p>
          <button onClick={() => setMostrarForm(true)}
            className="px-6 py-3 rounded-xl text-white font-bold text-sm active:scale-95 transition-all"
            style={{background:acento}}>
            Solicitar información
          </button>
        </div>

        <p className="text-center text-xs text-[#C0C0C0] pb-6">Powered by Forge Studio OS</p>
      </div>

      {/* Modal formulario de contacto */}
      {mostrarForm && !enviado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex items-center justify-between">
              <h3 className="font-bold text-[#0A0A0A]">Solicitar información</h3>
              <button onClick={() => setMostrarForm(false)} className="text-[#9B9B9B] text-xl">×</button>
            </div>
            <form onSubmit={enviarContacto} className="p-5 space-y-3">
              <input required value={formData.nombre} onChange={e=>setFormData(f=>({...f,nombre:e.target.value}))}
                placeholder="Tu nombre *"
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
              <input required type="email" value={formData.email} onChange={e=>setFormData(f=>({...f,email:e.target.value}))}
                placeholder="Tu email *"
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
              <input value={formData.telefono} onChange={e=>setFormData(f=>({...f,telefono:e.target.value}))}
                placeholder="Teléfono (opcional)"
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
              <select value={formData.objetivo} onChange={e=>setFormData(f=>({...f,objetivo:e.target.value}))}
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                <option value="">¿Cuál es tu objetivo?</option>
                <option value="perdida_grasa">Perder grasa</option>
                <option value="ganancia_muscular">Ganar músculo</option>
                <option value="cambio_rapido_30dias">Cambio rápido en 30 días</option>
                <option value="rendimiento">Mejorar rendimiento</option>
                <option value="salud_general">Salud general</option>
              </select>
              <textarea value={formData.mensaje} onChange={e=>setFormData(f=>({...f,mensaje:e.target.value}))}
                placeholder="Cuéntame un poco más sobre ti y lo que buscas..."
                rows={3}
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"/>
              <button type="submit" disabled={enviando || !formData.nombre || !formData.email}
                className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40 transition-all"
                style={{background:acento}}>
                {enviando ? 'Enviando...' : 'Enviar solicitud →'}
              </button>
              <p className="text-xs text-[#9B9B9B] text-center">Te respondo en menos de 24h</p>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación */}
      {mostrarForm && enviado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <p className="text-5xl mb-4">✅</p>
            <p className="font-bold text-[#0A0A0A] text-lg mb-2">¡Solicitud enviada!</p>
            <p className="text-sm text-[#9B9B9B] mb-6">
              {config.nombre_entrenador?.split(' ')[0]} recibirá tu mensaje y te contactará en menos de 24h.
            </p>
            <button onClick={() => { setMostrarForm(false); setEnviado(false) }}
              className="px-6 py-3 rounded-xl text-white font-bold text-sm"
              style={{background:acento}}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
