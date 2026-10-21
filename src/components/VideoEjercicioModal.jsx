import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ytEmbed } from '../lib/youtube'

export const MODALIDADES_LABEL = {
  fuerza:'💪 Fuerza', hipertrofia:'📈 Hipertrofia', perdida_grasa:'🔥 Pérdida de grasa',
  resistencia:'🏃 Resistencia', hibrido:'⚡ Híbrido', crossfit:'🎯 CrossFit',
  potencia:'💥 Potencia', movilidad:'🧘 Movilidad', calistenia:'🤸 Calistenia', wellness:'🌿 Wellness'
}

// Ver el vídeo de un ejercicio de la biblioteca o, si no tiene, buscar uno en
// YouTube (edge function buscar-video-ejercicio) y asignarlo.
export default function VideoEjercicioModal({ ejercicio, onClose, onVideoGuardado }) {
  const [buscando, setBuscando] = useState(false)
  const [sugerencias, setSugerencias] = useState([])
  const [errorBusqueda, setErrorBusqueda] = useState(null)
  const [guardando, setGuardando] = useState(null) // video_id del que se está guardando

  async function buscarVideo() {
    setBuscando(true)
    setErrorBusqueda(null)
    setSugerencias([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buscar-video-ejercicio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ nombre: ejercicio.nombre }),
      })
      const data = await res.json().catch(() => ({}))
      // Centro sin la función desplegada o sin clave de YouTube: mensaje claro
      if (res.status === 404 || /YOUTUBE_API_KEY/.test(data.error || '')) throw new Error('La búsqueda de vídeos no está configurada en este centro.')
      if (!res.ok || data.error) throw new Error(data.error || 'Error al buscar')
      setSugerencias(data.resultados || [])
      if ((data.resultados || []).length === 0) setErrorBusqueda('No se encontraron vídeos para este ejercicio.')
    } catch (err) {
      setErrorBusqueda(err.message)
    } finally {
      setBuscando(false)
    }
  }

  // Guarda el vídeo ELEGIDO (antes se volvía a llamar a la función, que repetía la
  // búsqueda y guardaba siempre el primer resultado) y con el permiso del equipo
  // (la función solo dejaba al dueño del ejercicio; en un centro, el resto no guardaba).
  async function aceptarVideo(video) {
    setGuardando(video.video_id)
    const url = `https://www.youtube.com/embed/${video.video_id}`
    const { error } = await supabase.from('ejercicios_biblioteca')
      .update({ youtube_url: url, yt_id: video.video_id }).eq('id', ejercicio.id)
    if (error) { setErrorBusqueda('No se pudo guardar el vídeo: ' + error.message); setGuardando(null); return }
    onVideoGuardado(ejercicio.id, url, video.video_id)
    onClose()
  }

  const tieneVideo = !!ytEmbed(ejercicio.youtube_url)

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold">{ejercicio.nombre}</h2>
            <p className="text-white/50 text-xs mt-0.5">{ejercicio.grupo_muscular} · {ejercicio.nivel}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {/* Video YouTube embed */}
        {tieneVideo && (
          <div className="relative w-full" style={{ paddingBottom:'56.25%' }}>
            <iframe
              src={`${ytEmbed(ejercicio.youtube_url)}?autoplay=1&rel=0&modestbranding=1`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={ejercicio.nombre}
            />
          </div>
        )}

        {/* Buscar en YouTube: sin vídeo, o para cambiarlo (vídeos borrados o poco
            adecuados). No en la vista previa de un ejercicio aún sin guardar. */}
        {ejercicio.id && ejercicio.id !== 'preview' && (
          <div className="p-4 border-b border-white/10">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-white/40 text-sm mb-3">{tieneVideo ? '¿El vídeo no funciona o no es el adecuado?' : 'Este ejercicio no tiene vídeo asignado'}</p>
              {sugerencias.length === 0 && !errorBusqueda && (
                <button
                  onClick={buscarVideo}
                  disabled={buscando}
                  className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2 mx-auto">
                  {buscando ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Buscando...</>
                  ) : (
                    <><span>▶</span> {tieneVideo ? 'Buscar otro vídeo' : 'Buscar vídeo en YouTube'}</>
                  )}
                </button>
              )}
              {errorBusqueda && (
                <div className="space-y-2">
                  <p className="text-red-400 text-xs">{errorBusqueda}</p>
                  <button onClick={buscarVideo} className="text-white/50 hover:text-white text-xs underline">Reintentar</button>
                </div>
              )}
            </div>

            {/* Sugerencias de YouTube */}
            {sugerencias.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">Sugerencias — elige el mejor:</p>
                {sugerencias.map(v => (
                  <div key={v.video_id} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-2.5 transition-all">
                    <a href={v.youtube_url} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 relative w-20 h-14 rounded-lg overflow-hidden group">
                      {v.thumbnail && <img src={v.thumbnail} alt={v.titulo} className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-red-600/80 transition-colors">
                        <span className="text-white text-lg">▶</span>
                      </div>
                    </a>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium line-clamp-2 leading-tight">{v.titulo}</p>
                      <p className="text-white/40 text-xs mt-0.5">{v.canal}</p>
                    </div>
                    <button
                      onClick={() => aceptarVideo(v)}
                      disabled={!!guardando}
                      className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50">
                      {guardando === v.video_id ? '...' : '✓ Usar'}
                    </button>
                  </div>
                ))}
                <button onClick={buscarVideo} disabled={buscando} className="text-white/40 hover:text-white/70 text-xs mt-1 underline transition-colors">
                  🔄 Buscar de nuevo
                </button>
              </div>
            )}
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Músculos */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-acento/20 text-acento px-2.5 py-1 rounded-full font-medium">
              🎯 {ejercicio.grupo_muscular}
            </span>
            {ejercicio.grupo_secundario && ejercicio.grupo_secundario.split(';').map(g => (
              <span key={g} className="text-xs bg-white/10 text-white/60 px-2.5 py-1 rounded-full">{g}</span>
            ))}
          </div>

          {/* Consejos técnica */}
          {ejercicio.consejos_tecnica && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-400 mb-1.5">📋 Técnica correcta</p>
              <p className="text-sm text-white/80 leading-relaxed">{ejercicio.consejos_tecnica}</p>
            </div>
          )}

          {/* Modalidades */}
          {ejercicio.modalidad && (
            <div className="flex flex-wrap gap-1.5">
              {ejercicio.modalidad.split(';').map(m => (
                <span key={m} className="text-xs bg-white/8 text-white/50 px-2 py-1 rounded-lg">
                  {MODALIDADES_LABEL[m] || m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
