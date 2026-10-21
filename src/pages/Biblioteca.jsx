import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useEquipo } from '../hooks/useCentro'
import { ytEmbed, ytMiniatura } from '../lib/youtube'

const GRUPOS = ['Todos','Pecho','Espalda','Hombros','Bíceps','Tríceps','Piernas','Glúteos','Posterior','Isquios','Core','Full body','Cardio','Cadera','Gemelos','Movilidad']
const NIVELES = ['Todos','principiante','intermedio','avanzado']
const MODALIDADES_LABEL = {
  fuerza:'💪 Fuerza', hipertrofia:'📈 Hipertrofia', perdida_grasa:'🔥 Pérdida de grasa',
  resistencia:'🏃 Resistencia', hibrido:'⚡ Híbrido', crossfit:'🎯 CrossFit',
  potencia:'💥 Potencia', movilidad:'🧘 Movilidad', calistenia:'🤸 Calistenia', wellness:'🌿 Wellness'
}

function VideoModal({ ejercicio, onClose, onVideoGuardado }) {
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
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Error al buscar')
      setSugerencias(data.resultados || [])
      if ((data.resultados || []).length === 0) setErrorBusqueda('No se encontraron vídeos para este ejercicio.')
    } catch (err) {
      setErrorBusqueda(err.message)
    } finally {
      setBuscando(false)
    }
  }

  async function aceptarVideo(video) {
    setGuardando(video.video_id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buscar-video-ejercicio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ nombre: ejercicio.nombre, ejercicio_id: ejercicio.id, guardar: true }),
      })
      // Notificar al padre para actualizar la lista
      onVideoGuardado(ejercicio.id, video.youtube_url, video.video_id)
      onClose()
    } catch (err) {
      setGuardando(null)
    }
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

        {/* Sin video: buscar automáticamente */}
        {!tieneVideo && (
          <div className="p-4 border-b border-white/10">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-white/40 text-sm mb-3">Este ejercicio no tiene vídeo asignado</p>
              {sugerencias.length === 0 && !errorBusqueda && (
                <button
                  onClick={buscarVideo}
                  disabled={buscando}
                  className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2 mx-auto">
                  {buscando ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Buscando...</>
                  ) : (
                    <><span>▶</span> Buscar vídeo en YouTube</>
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

export default function Biblioteca({ session }) {
  const [ejercicios, setEjercicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('Todos')
  const [filtroNivel, setFiltroNivel] = useState('Todos')
  const [filtroModalidad, setFiltroModalidad] = useState('')
  const [videoActivo, setVideoActivo] = useState(null)

  const handleVideoGuardado = useCallback((ejercicioId, youtubeUrl, ytId) => {
    setEjercicios(prev => prev.map(e =>
      e.id === ejercicioId ? { ...e, youtube_url: youtubeUrl, yt_id: ytId } : e
    ))
  }, [])
  const [modalNuevo, setModalNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState({ nombre:'', grupo_muscular:'Pecho', patron:'empuje_horizontal', nivel:'principiante', modalidad:'fuerza', consejos_tecnica:'', youtube_url:'' })
  const uid = session.user.id
  const equipo = useEquipo(uid)

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const { data } = await supabase.from('ejercicios_biblioteca').select('*')
      .in('entrenador_id', equipo).order('grupo_muscular').order('nombre')
    setEjercicios(data || [])
    setLoading(false)
  }

  async function guardarNuevo() {
    await supabase.from('ejercicios_biblioteca').insert({ ...formNuevo, entrenador_id: uid })
    setModalNuevo(false)
    setFormNuevo({ nombre:'', grupo_muscular:'Pecho', patron:'empuje_horizontal', nivel:'principiante', modalidad:'fuerza', consejos_tecnica:'', youtube_url:'' })
    await cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este ejercicio de la biblioteca?')) return
    await supabase.from('ejercicios_biblioteca').delete().eq('id', id)
    await cargar()
  }

  const filtrados = useMemo(() => {
    let r = [...ejercicios]
    if (busqueda) {
      const b = busqueda.toLowerCase()
      r = r.filter(e => e.nombre.toLowerCase().includes(b) || e.sinonimos?.toLowerCase().includes(b) || e.grupo_muscular?.toLowerCase().includes(b))
    }
    if (filtroGrupo !== 'Todos') r = r.filter(e => e.grupo_muscular?.includes(filtroGrupo))
    if (filtroNivel !== 'Todos') r = r.filter(e => e.nivel === filtroNivel)
    if (filtroModalidad) r = r.filter(e => e.modalidad?.includes(filtroModalidad))
    return r
  }, [ejercicios, busqueda, filtroGrupo, filtroNivel, filtroModalidad])

  const nivelColor = n => ({ principiante:'bg-emerald-50 text-emerald-700', intermedio:'bg-amber-50 text-amber-700', avanzado:'bg-red-50 text-red-700' })[n] || 'bg-[#F5F5F0] text-[#6B6B6B]'

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {videoActivo && (
        <VideoModal
          ejercicio={videoActivo}
          onClose={() => setVideoActivo(null)}
          onVideoGuardado={handleVideoGuardado}
        />
      )}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Biblioteca de ejercicios</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {ejercicios.length} ejercicios · {ejercicios.filter(e=>e.youtube_url).length} con vídeo
          </p>
        </div>
        <button onClick={() => setModalNuevo(true)}
          className="bg-acento text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95 flex-shrink-0">
          + Añadir
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar ejercicio, músculo o sinónimo..."
          className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-acento" />
        {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">×</button>}
      </div>

      {/* Filtros grupo muscular */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
        {GRUPOS.map(g => (
          <button key={g} onClick={() => setFiltroGrupo(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroGrupo===g?'bg-acento text-white':'bg-white border border-black/10 text-[#6B6B6B] hover:border-acento'}`}>
            {g}
          </button>
        ))}
      </div>

      {/* Filtros nivel y modalidad */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {NIVELES.map(n => (
          <button key={n} onClick={() => setFiltroNivel(n)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all capitalize ${filtroNivel===n?'bg-[#111] text-white':'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#111]'}`}>
            {n}
          </button>
        ))}
        <div className="w-px bg-black/10 flex-shrink-0" />
        {Object.entries(MODALIDADES_LABEL).map(([k,l]) => (
          <button key={k} onClick={() => setFiltroModalidad(filtroModalidad===k?'':k)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroModalidad===k?'bg-acento text-white':'bg-white border border-black/10 text-[#6B6B6B] hover:border-acento'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Grid ejercicios */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-acento border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
          <p className="text-4xl mb-3">💪</p>
          <p className="font-semibold text-[#0A0A0A]">Sin resultados</p>
          <p className="text-sm text-[#6B6B6B] mt-1">Prueba con otro filtro o añade el ejercicio</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-2">
          {filtrados.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                {/* Thumbnail vídeo o placeholder */}
                <button onClick={() => setVideoActivo(e)}
                  className="w-16 h-16 bg-[#111] rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-acento transition-colors group overflow-hidden">
                  {e.youtube_url ? (
                    <div className="relative w-full h-full">
                      <img
                        src={ytMiniatura(e.youtube_url)}
                        alt={e.nombre}
                        className="w-full h-full object-cover"
                        onError={ev => ev.target.style.display='none'}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-acento/80 transition-colors">
                        <span className="text-white text-xl">▶</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-2xl">💪</span>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => setVideoActivo(e)} className="text-sm font-bold text-[#0A0A0A] hover:text-acento transition-colors text-left leading-tight">
                      {e.nombre}
                    </button>
                    <button onClick={() => eliminar(e.id)} className="text-[#6B6B6B] hover:text-red-500 text-base flex-shrink-0 transition-colors">×</button>
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">{e.grupo_muscular}{e.grupo_secundario ? ` · ${e.grupo_secundario.replace(/;/g,', ')}` : ''}</p>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nivelColor(e.nivel)}`}>{e.nivel}</span>
                    {e.usos > 0 && <span className="text-xs bg-acento/8 text-acento px-2 py-0.5 rounded-full font-medium">{e.usos} usos</span>}
                    {!e.youtube_url && <span className="text-xs bg-[#F5F5F0] text-[#9B9B9B] px-2 py-0.5 rounded-full">Sin vídeo</span>}
                  </div>
                </div>
              </div>

              {/* Consejos técnica colapsables */}
              {e.consejos_tecnica && (
                <details className="mt-2">
                  <summary className="text-xs text-[#6B6B6B] cursor-pointer hover:text-acento transition-colors">
                    📋 Ver técnica
                  </summary>
                  <p className="text-xs text-[#6B6B6B] mt-1.5 leading-relaxed">{e.consejos_tecnica}</p>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal añadir ejercicio */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-4">Añadir ejercicio</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre *</label>
                <input value={formNuevo.nombre} onChange={e => setFormNuevo(f=>({...f,nombre:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"
                  placeholder="Ej: Press de banca" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Grupo muscular</label>
                  <select value={formNuevo.grupo_muscular} onChange={e => setFormNuevo(f=>({...f,grupo_muscular:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento bg-white">
                    {GRUPOS.filter(g=>g!=='Todos').map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nivel</label>
                  <select value={formNuevo.nivel} onChange={e => setFormNuevo(f=>({...f,nivel:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento bg-white">
                    <option value="principiante">Principiante</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Consejos de técnica</label>
                <textarea value={formNuevo.consejos_tecnica} onChange={e => setFormNuevo(f=>({...f,consejos_tecnica:e.target.value}))}
                  rows={3} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento resize-none"
                  placeholder="Puntos clave de ejecución..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">URL YouTube (embed)</label>
                <input value={formNuevo.youtube_url} onChange={e => setFormNuevo(f=>({...f,youtube_url:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"
                  placeholder="https://www.youtube.com/embed/VIDEO_ID" />
                <p className="text-xs text-[#6B6B6B] mt-1">Ve al vídeo en YouTube → Compartir → Insertar → copia la URL del iframe</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalNuevo(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={guardarNuevo} disabled={!formNuevo.nombre}
                className="flex-1 bg-acento text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
