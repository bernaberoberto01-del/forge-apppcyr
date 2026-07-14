import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const GRUPOS = ['Todos','Pecho','Espalda','Hombros','Bíceps','Tríceps','Piernas','Glúteos','Posterior','Isquios','Core','Full body','Cardio','Cadera','Gemelos','Movilidad']
const NIVELES = ['Todos','principiante','intermedio','avanzado']
const MODALIDADES_LABEL = {
  fuerza:'💪 Fuerza', hipertrofia:'📈 Hipertrofia', perdida_grasa:'🔥 Pérdida de grasa',
  resistencia:'🏃 Resistencia', hibrido:'⚡ Híbrido', crossfit:'🎯 CrossFit',
  potencia:'💥 Potencia', movilidad:'🧘 Movilidad', calistenia:'🤸 Calistenia', wellness:'🌿 Wellness'
}

function VideoModal({ ejercicio, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl w-full max-w-2xl overflow-hidden" onClick={e = onClick={e = onClick={e => e.stopPropagation()}> e.stopPropagation()}> e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold">{ejercicio.nombre}</h2>
            <p className="text-white/50 text-xs mt-0.5">{ejercicio.grupo_muscular} · {ejercicio.nivel}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {/* Video YouTube embed */}
        {ejercicio.youtube_url && (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={`${ejercicio.youtube_url}?autoplay=1&rel=0&modestbranding=1`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={ejercicio.nombre}
            />
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Músculos */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-[#FF5C00]/20 text-[#FF5C00] px-2.5 py-1 rounded-full font-medium">
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
  const [modalNuevo, setModalNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState({ nombre:'', grupo_muscular:'Pecho', patron:'empuje_horizontal', nivel:'principiante', modalidad:'fuerza', consejos_tecnica:'', youtube_url:'' })
  const uid = session.user.id

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const { data } = await supabase.from('ejercicios_biblioteca').select('*')
      .eq('entrenador_id', uid).order('grupo_muscular').order('nombre')
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
      {videoActivo && <VideoModal ejercicio={videoActivo} onClose={() => setVideoActivo(null)} />}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Biblioteca de ejercicios</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">{ejercicios.length} ejercicios · Vídeos explicativos y consejos de técnica</p>
        </div>
        <button onClick={() => setModalNuevo(true)}
          className="bg-[#FF5C00] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95 flex-shrink-0">
          + Añadir
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar ejercicio, músculo o sinónimo..."
          className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
        {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">×</button>}
      </div>

      {/* Filtros grupo muscular */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
        {GRUPOS.map(g => (
          <button key={g} onClick={() => setFiltroGrupo(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroGrupo===g?'bg-[#FF5C00] text-white':'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
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
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroModalidad===k?'bg-[#FF5C00] text-white':'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Grid ejercicios */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/>
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
                  className="w-16 h-16 bg-[#111] rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-[#FF5C00] transition-colors group overflow-hidden">
                  {e.youtube_url ? (
                    <div className="relative w-full h-full">
                      <img
                        src={`https://img.youtube.com/vi/${e.youtube_url.split('/').pop()}/mqdefault.jpg`}
                        alt={e.nombre}
                        className="w-full h-full object-cover"
                        onError={ev => ev.target.style.display='none'}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-[#FF5C00]/80 transition-colors">
                        <span className="text-white text-xl">▶</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-2xl">💪</span>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => setVideoActivo(e)} className="text-sm font-bold text-[#0A0A0A] hover:text-[#FF5C00] transition-colors text-left leading-tight">
                      {e.nombre}
                    </button>
                    <button onClick={() => eliminar(e.id)} className="text-[#6B6B6B] hover:text-red-500 text-base flex-shrink-0 transition-colors">×</button>
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">{e.grupo_muscular}{e.grupo_secundario ? ` · ${e.grupo_secundario.replace(/;/g,', ')}` : ''}</p>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nivelColor(e.nivel)}`}>{e.nivel}</span>
                    {e.usos > 0 && <span className="text-xs bg-[#FF5C00]/8 text-[#FF5C00] px-2 py-0.5 rounded-full font-medium">{e.usos} usos</span>}
                  </div>
                </div>
              </div>

              {/* Consejos técnica colapsables */}
              {e.consejos_tecnica && (
                <details className="mt-2">
                  <summary className="text-xs text-[#6B6B6B] cursor-pointer hover:text-[#FF5C00] transition-colors">
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
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
                  placeholder="Ej: Press de banca" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Grupo muscular</label>
                  <select value={formNuevo.grupo_muscular} onChange={e => setFormNuevo(f=>({...f,grupo_muscular:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                    {GRUPOS.filter(g=>g!=='Todos').map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nivel</label>
                  <select value={formNuevo.nivel} onChange={e => setFormNuevo(f=>({...f,nivel:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                    <option value="principiante">Principiante</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Consejos de técnica</label>
                <textarea value={formNuevo.consejos_tecnica} onChange={e => setFormNuevo(f=>({...f,consejos_tecnica:e.target.value}))}
                  rows={3} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                  placeholder="Puntos clave de ejecución..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">URL YouTube (embed)</label>
                <input value={formNuevo.youtube_url} onChange={e => setFormNuevo(f=>({...f,youtube_url:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
                  placeholder="https://www.youtube.com/embed/VIDEO_ID" />
                <p className="text-xs text-[#6B6B6B] mt-1">Ve al vídeo en YouTube → Compartir → Insertar → copia la URL del iframe</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalNuevo(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={guardarNuevo} disabled={!formNuevo.nombre}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
