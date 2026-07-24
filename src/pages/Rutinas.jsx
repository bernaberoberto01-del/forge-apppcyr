import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useCentro } from '../hooks/useCentro.jsx'
import ClienteQuickView from '../components/ClienteQuickView'
import EjercicioInput from '../components/EjercicioInput'

const PATRONES = ['empuje_horizontal','empuje_vertical','tiron_vertical','tiron_horizontal','sentadilla','bisagra','hip_extension','core','cardio','aislamiento','movilidad']
const GRUPOS_MUSCULARES = ['Pecho','Espalda','Hombros','Bíceps','Tríceps','Piernas','Glúteos','Posterior','Isquios','Core','Full body','Cardio','Cadera','Gemelos','Movilidad']
const initEj = () => ({ nombre:'', patron:'empuje_horizontal', series:3, reps:'8-10', descanso:'90s', notas:'' })
const initDia = (n) => ({ dia:n, nombre:`Día ${String.fromCharCode(64+n)}`, patron_principal:'', ejercicios:[initEj()] })
const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

function Toast({ msg, tipo='ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 whitespace-nowrap ${tipo==='error'?'bg-red-600':'bg-[#111]'}`}>
      <span>{tipo==='error'?'⚠':'✓'}</span> {msg}
    </div>
  )
}

function VideoModal({ ejercicio, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <p className="text-white font-bold">{ejercicio.nombre}</p>
            <p className="text-white/50 text-xs mt-0.5">{ejercicio.grupo_muscular} · {ejercicio.nivel}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">×</button>
        </div>
        {ejercicio.youtube_url && (
          <div className="relative w-full" style={{ paddingBottom:'56.25%' }}>
            <iframe src={`${ejercicio.youtube_url}?autoplay=1&rel=0&modestbranding=1`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen title={ejercicio.nombre} />
          </div>
        )}
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-[#FF5C00]/20 text-[#FF5C00] px-2.5 py-1 rounded-full font-medium">🎯 {ejercicio.grupo_muscular}</span>
            {ejercicio.grupo_secundario && ejercicio.grupo_secundario.split(';').map(g=>(
              <span key={g} className="text-xs bg-white/10 text-white/60 px-2.5 py-1 rounded-full">{g}</span>
            ))}
          </div>
          {ejercicio.consejos_tecnica && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-400 mb-1.5">📋 Técnica correcta</p>
              <p className="text-sm text-white/80 leading-relaxed">{ejercicio.consejos_tecnica}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Rutinas({ session }) {
  const [tabPrincipal, setTabPrincipal] = useState('rutinas') // rutinas | biblioteca
  const [rutinas, setRutinas] = useState([])
  const [clientes, setClientes] = useState([])
  const [biblioteca, setBiblioteca] = useState([])
  const [generando, setGenerando] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [rutinaBorrador, setRutinaBorrador] = useState(null)
  const [contextoIA, setContextoIA] = useState('')
  const [mostrarContextoIA, setMostrarContextoIA] = useState(false)
  const [notasEdit, setNotasEdit] = useState('')
  const [msgModal, setMsgModal] = useState(null)
  const [msgTexto, setMsgTexto] = useState('')
  const [modalManual, setModalManual] = useState(false)
  const [manualClienteId, setManualClienteId] = useState('')
  const [manualNombre, setManualNombre] = useState('')
  const [manualDescripcion, setManualDescripcion] = useState('')
  const [manualDias, setManualDias] = useState([initDia(1), initDia(2), initDia(3)])
  const [guardandoManual, setGuardandoManual] = useState(false)
  const [toast, setToast] = useState('')
  const [quickView, setQuickView] = useState(null)
  const [plantillas, setPlantillas] = useState([])
  const [plantillasCentro, setPlantillasCentro] = useState([])
  const [modalPlantillas, setModalPlantillas] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activas')
  // Biblioteca states
  const [bibBusqueda, setBibBusqueda] = useState('')
  const [bibGrupo, setBibGrupo] = useState('Todos')
  const [bibNivel, setBibNivel] = useState('Todos')
  const [videoActivo, setVideoActivo] = useState(null)
  const [modalEditarEj, setModalEditarEj] = useState(null) // ejercicio a editar
  const [modalNuevoEj, setModalNuevoEj] = useState(false)
  const [formEj, setFormEj] = useState({ nombre:'', sinonimos:'', grupo_muscular:'Pecho', grupo_secundario:'', patron:'empuje_horizontal', nivel:'principiante', modalidad:'fuerza', consejos_tecnica:'', youtube_url:'' })
  const uid = session.user.id
  const { centro } = useCentro() || {}

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const [{ data: ru }, { data: cl }, { data: pl }, { data: bib }] = await Promise.all([
      supabase.from('rutinas').select('*, clientes(nombre,tipo,objetivo)').eq('entrenador_id', uid).order('created_at', { ascending: false }),
      supabase.from('clientes').select('id,nombre,objetivo,nivel,tipo').eq('entrenador_id', uid).eq('estado','activo'),
      supabase.from('plantillas_rutina').select('*').eq('entrenador_id', uid).order('usos', { ascending: false }),
      supabase.from('ejercicios_biblioteca').select('*').eq('entrenador_id', uid).order('grupo_muscular').order('nombre'),
    ])
    setRutinas(ru || [])
    setClientes(cl || [])
    setPlantillas(pl || [])
    setBiblioteca(bib || [])
  }

  // ===== RUTINAS =====
  async function generarEvaluacion(clienteId) {
    setGenerando(clienteId)
    const { data, error } = await supabase.functions.invoke('generar-evaluacion', {
      body: { cliente_id: clienteId }
    })
    if (error || !data?.ok) {
      alert('Error al generar la evaluación')
    } else {
      const tipo = data.es_inicial ? 'inicial' : `nº ${data.numero}`
      alert(`✓ Evaluación ${tipo} generada — revísala en la lista de borradores y publícala`)
      cargar()
    }
    setGenerando(null)
  }

  async function generarRutina(clienteId, contextoExtra = '') {
    setGenerando(clienteId)
    const { data } = await supabase.functions.invoke('generar-rutina', {
      body: { cliente_id: clienteId, contexto_extra: contextoExtra }
    }).catch(e => ({ data: { error: e.message } }))
    setGenerando(null)
    if (data.ok) { setToast('✓ Rutina generada — revísala y publícala'); await cargar() }
    else setToast('Error: ' + (data.error || 'desconocido'))
  }

  async function guardarManual() {
    if (!manualClienteId || !manualNombre) return
    setGuardandoManual(true)
    const cliente = clientes.find(c => c.id === manualClienteId)
    const borrador = { nombre: manualNombre, descripcion: manualDescripcion, semanas: 4, dias: manualDias.filter(d => d.ejercicios.some(e => e.nombre)) }
    await supabase.from('rutinas').insert({ cliente_id: manualClienteId, entrenador_id: uid, nombre: manualNombre, objetivo: cliente?.objetivo, semanas: 4, dias_semana: borrador.dias.length, borrador, estado: 'borrador' })
    setModalManual(false); setManualClienteId(''); setManualNombre(''); setManualDescripcion(''); setManualDias([initDia(1), initDia(2), initDia(3)]); setGuardandoManual(false)
    setToast('Rutina creada como borrador'); await cargar()
  }

  async function publicar(rutina) {
    await supabase.from('rutinas').update({ estado: 'publicada', contenido: rutina.borrador, notas_entrenador: notasEdit }).eq('id', rutina.id)
    setDetalle(null); setToast(`✓ Rutina publicada para ${rutina.clientes?.nombre}`); await cargar()
  }

  async function guardarComoPlantilla(rutina) {
    const nombre = prompt('Nombre de la plantilla:', rutina.borrador?.nombre || 'Mi plantilla')
    if (!nombre) return
    await supabase.from('plantillas_rutina').insert({ entrenador_id: uid, nombre, objetivo: rutina.objetivo, dias_semana: rutina.dias_semana, descripcion: rutina.borrador?.descripcion || '', contenido: rutina.borrador || rutina.contenido })
    setToast('✓ Guardada como plantilla'); await cargar()
  }

  async function aplicarPlantilla(plantilla, clienteId) {
    if (!clienteId) return
    await supabase.from('plantillas_rutina').update({ usos: (plantilla.usos||0)+1 }).eq('id', plantilla.id)
    await supabase.from('rutinas').insert({ cliente_id: clienteId, entrenador_id: uid, nombre: plantilla.nombre, objetivo: plantilla.objetivo, semanas: 4, dias_semana: plantilla.dias_semana, borrador: plantilla.contenido, estado: 'borrador' })
    setModalPlantillas(false); setToast('Plantilla aplicada — revisa y publica'); await cargar()
  }

  async function eliminarPlantilla(id) {
    if (!confirm('¿Eliminar plantilla?')) return
    await supabase.from('plantillas_rutina').delete().eq('id', id); await cargar()
  }

  async function enviarMensaje(clienteId) {
    if (!msgTexto.trim()) return
    await supabase.from('mensajes_cliente').insert({ entrenador_id: uid, cliente_id: clienteId, contenido: msgTexto.trim() })
    setMsgTexto(''); setMsgModal(null); setToast('Mensaje enviado')
  }

  const updateDia = (di, field, val) => setManualDias(prev => prev.map((d,i) => i===di ? {...d,[field]:val} : d))
  const updateEj = (di, ei, field, val) => setManualDias(prev => prev.map((d,i) => i===di ? {...d, ejercicios: d.ejercicios.map((e,j) => j===ei ? {...e,[field]:val} : e)} : d))
  const addEj = (di) => setManualDias(prev => prev.map((d,i) => i===di ? {...d, ejercicios:[...d.ejercicios, initEj()]} : d))
  const removeEj = (di, ei) => setManualDias(prev => prev.map((d,i) => i===di ? {...d, ejercicios:d.ejercicios.filter((_,j)=>j!==ei)} : d))
  const addDia = () => setManualDias(prev => [...prev, initDia(prev.length+1)])
  const removeDia = (di) => setManualDias(prev => prev.filter((_,i)=>i!==di))

  const clientesSinRutina = clientes.filter(c => c.tipo === 'online' && !rutinas.find(r => r.cliente_id === c.id && r.estado !== 'archivada'))

  const rutinasFiltradas = useMemo(() => {
    let r = rutinas.filter(x => x.estado !== 'archivada')
    if (filtroEstado === 'borrador') r = r.filter(x => x.estado === 'borrador')
    if (filtroEstado === 'publicada') r = r.filter(x => x.estado === 'publicada')
    if (busqueda) { const b = busqueda.toLowerCase(); r = r.filter(x => x.clientes?.nombre?.toLowerCase().includes(b) || x.nombre?.toLowerCase().includes(b)) }
    return r
  }, [rutinas, filtroEstado, busqueda])

  const stats = { total: rutinas.filter(r=>r.estado!=='archivada').length, borradores: rutinas.filter(r=>r.estado==='borrador').length, publicadas: rutinas.filter(r=>r.estado==='publicada').length }

  // ===== BIBLIOTECA =====
  const bibFiltrada = useMemo(() => {
    let r = [...biblioteca]
    if (bibBusqueda) { const b = bibBusqueda.toLowerCase(); r = r.filter(e => e.nombre.toLowerCase().includes(b) || e.sinonimos?.toLowerCase().includes(b) || e.grupo_muscular?.toLowerCase().includes(b)) }
    if (bibGrupo !== 'Todos') r = r.filter(e => e.grupo_muscular?.includes(bibGrupo))
    if (bibNivel !== 'Todos') r = r.filter(e => e.nivel === bibNivel)
    return r
  }, [biblioteca, bibBusqueda, bibGrupo, bibNivel])

  async function guardarEjercicio(isEdit) {
    const data = { ...formEj, entrenador_id: uid }
    if (isEdit && modalEditarEj) {
      await supabase.from('ejercicios_biblioteca').update(data).eq('id', modalEditarEj.id)
      setToast('Ejercicio actualizado')
      setModalEditarEj(null)
    } else {
      await supabase.from('ejercicios_biblioteca').insert(data)
      setToast('Ejercicio añadido a la biblioteca')
      setModalNuevoEj(false)
    }
    setFormEj({ nombre:'', sinonimos:'', grupo_muscular:'Pecho', grupo_secundario:'', patron:'empuje_horizontal', nivel:'principiante', modalidad:'fuerza', consejos_tecnica:'', youtube_url:'' })
    await cargar()
  }

  function abrirEditar(ej) {
    setFormEj({
      nombre: ej.nombre||'', sinonimos: ej.sinonimos||'', grupo_muscular: ej.grupo_muscular||'Pecho',
      grupo_secundario: ej.grupo_secundario||'', patron: ej.patron||'empuje_horizontal',
      nivel: ej.nivel||'principiante', modalidad: ej.modalidad||'fuerza',
      consejos_tecnica: ej.consejos_tecnica||'', youtube_url: ej.youtube_url||''
    })
    setModalEditarEj(ej)
  }

  async function eliminarEjercicio(id) {
    if (!confirm('¿Eliminar este ejercicio de la biblioteca?')) return
    await supabase.from('ejercicios_biblioteca').delete().eq('id', id)
    setToast('Ejercicio eliminado'); await cargar()
  }

  const FormEjercicio = ({ onSave, onCancel, isEdit }) => (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre *</label>
        <input value={formEj.nombre} onChange={e => setFormEj(f=>({...f,nombre:e.target.value}))}
          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
          placeholder="Ej: Press de banca" />
      </div>
      <div>
        <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Sinónimos (separados por coma)</label>
        <input value={formEj.sinonimos} onChange={e => setFormEj(f=>({...f,sinonimos:e.target.value}))}
          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
          placeholder="bench press, press banca, press con barra" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Grupo muscular</label>
          <select value={formEj.grupo_muscular} onChange={e => setFormEj(f=>({...f,grupo_muscular:e.target.value}))}
            className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
            {GRUPOS_MUSCULARES.map(g=><option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nivel</label>
          <select value={formEj.nivel} onChange={e => setFormEj(f=>({...f,nivel:e.target.value}))}
            className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Grupo secundario</label>
          <input value={formEj.grupo_secundario} onChange={e => setFormEj(f=>({...f,grupo_secundario:e.target.value}))}
            className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
            placeholder="Tríceps;Hombros" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Patrón</label>
          <select value={formEj.patron} onChange={e => setFormEj(f=>({...f,patron:e.target.value}))}
            className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
            {PATRONES.map(p=><option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Consejos de técnica</label>
        <textarea value={formEj.consejos_tecnica} onChange={e => setFormEj(f=>({...f,consejos_tecnica:e.target.value}))}
          rows={3} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
          placeholder="Puntos clave de ejecución correcta..." />
      </div>
      <div>
        <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">URL YouTube (embed)</label>
        <input value={formEj.youtube_url} onChange={e => setFormEj(f=>({...f,youtube_url:e.target.value}))}
          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
          placeholder="https://www.youtube.com/embed/VIDEO_ID" />
        <p className="text-xs text-[#6B6B6B] mt-1">YouTube → Compartir → Insertar → copia la URL del src del iframe</p>
        {formEj.youtube_url && (
          <button onClick={() => setVideoActivo({ ...formEj, id:'preview' })}
            className="mt-2 text-xs text-[#FF5C00] font-medium">▶ Previsualizar vídeo</button>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
        <button onClick={onSave} disabled={!formEj.nombre}
          className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
          {isEdit ? '💾 Guardar cambios' : '+ Añadir'}
        </button>
      </div>
    </div>
  )

  const nivelColor = n => ({ principiante:'bg-emerald-50 text-emerald-700', intermedio:'bg-amber-50 text-amber-700', avanzado:'bg-red-50 text-red-700' })[n] || 'bg-[#F5F5F0] text-[#6B6B6B]'

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      {videoActivo && <VideoModal ejercicio={videoActivo} onClose={() => setVideoActivo(null)} />}

      <div>

      {/* Cabecera con tabs principales */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Rutinas</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Genera con IA, crea manualmente o aplica plantillas</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {tabPrincipal === 'rutinas' && (
            <>
              {plantillas.length > 0 && (
                <button onClick={() => setModalPlantillas(true)}
                  className="border border-[#6366f1]/30 text-[#6366f1] text-sm font-semibold px-3 py-2.5 rounded-xl hover:bg-[#6366f1]/5">
                  📋 {plantillas.length}
                </button>
              )}
              <button onClick={() => setModalManual(true)} className="bg-[#111] text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
                ✍️ Manual
              </button>
            </>
          )}
          {tabPrincipal === 'biblioteca' && (
            <button onClick={() => { setFormEj({ nombre:'', sinonimos:'', grupo_muscular:'Pecho', grupo_secundario:'', patron:'empuje_horizontal', nivel:'principiante', modalidad:'fuerza', consejos_tecnica:'', youtube_url:'' }); setModalNuevoEj(true) }}
              className="bg-[#FF5C00] text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
              + Ejercicio
            </button>
          )}
        </div>
      </div>

      {/* Tabs Rutinas | Biblioteca */}
      <div className="flex gap-1 bg-black/5 p-1 rounded-xl mb-5">
        <button onClick={() => setTabPrincipal('rutinas')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tabPrincipal==='rutinas'?'bg-white shadow-sm text-[#0A0A0A]':'text-[#6B6B6B] hover:text-[#0A0A0A]'}`}>
          💪 Rutinas ({stats.total})
        </button>
        <button onClick={() => setTabPrincipal('biblioteca')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tabPrincipal==='biblioteca'?'bg-white shadow-sm text-[#0A0A0A]':'text-[#6B6B6B] hover:text-[#0A0A0A]'}`}>
          📚 Biblioteca ({biblioteca.length})
        </button>
      </div>

      {/* ===== TAB RUTINAS ===== */}
      {tabPrincipal === 'rutinas' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[['Total',stats.total,'#FF5C00'],['Borradores',stats.borradores,'#f59e0b'],['Publicadas',stats.publicadas,'#10b981']].map(([l,v,c])=>(
              <div key={l} className="bg-white rounded-xl border border-black/5 shadow-sm p-3.5 text-center">
                <p className="text-2xl font-bold" style={{color:c}}>{v}</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5">{l}</p>
              </div>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por cliente o nombre de rutina..."
              className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
            {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">×</button>}
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {[['activas','Todas'],['borrador','Borradores'],['publicada','Publicadas']].map(([v,l])=>(
              <button key={v} onClick={() => setFiltroEstado(v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroEstado===v?'bg-[#FF5C00] text-white':'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Clientes sin rutina */}
          {clientesSinRutina.length > 0 && !busqueda && filtroEstado === 'activas' && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-amber-700 mb-3">⚠ Sin rutina · online ({clientesSinRutina.length})</p>
              <div className="space-y-2">
                {clientesSinRutina.map(c => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#FF5C00] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{ini(c.nombre)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0A0A0A] truncate">{c.nombre}</p>
                      <p className="text-xs text-[#6B6B6B]">{c.nivel} · {c.tipo}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => generarRutina(c.id)} disabled={generando === c.id}
                        className="bg-[#FF5C00] text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
                        {generando === c.id ? '⏳' : '✨ IA'}
                      </button>
                      <button onClick={() => generarEvaluacion(c.id)} disabled={generando === c.id}
                        title="Generar sesión de evaluación"
                        className="border border-[#6366f1] text-[#6366f1] text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#6366f1]/5 disabled:opacity-50">
                        📋
                      </button>
                      <button onClick={() => { setManualClienteId(c.id); setModalManual(true) }}
                        className="border border-black/15 text-[#6B6B6B] text-xs font-medium px-3 py-1.5 rounded-lg hover:border-[#111]">✍️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista rutinas */}
          <div className="space-y-2">
            {rutinasFiltradas.length === 0 ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
                <p className="text-4xl mb-3">💪</p>
                <p className="font-semibold text-[#0A0A0A]">{busqueda ? 'Sin resultados' : 'Sin rutinas'}</p>
                <p className="text-sm text-[#6B6B6B] mt-1">{busqueda ? `No hay resultados para "${busqueda}"` : 'Genera una con IA o créala manualmente'}</p>
              </div>
            ) : rutinasFiltradas.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center text-[#FF5C00] font-bold text-xs flex-shrink-0">{ini(r.clientes?.nombre)}</div>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setQuickView(r.cliente_id)} className="text-sm font-semibold text-[#0A0A0A] hover:text-[#FF5C00] transition-colors truncate block text-left">{r.clientes?.nombre}</button>
                    <p className="text-xs text-[#6B6B6B] truncate">{r.borrador?.nombre || r.contenido?.nombre || 'Rutina'} · {r.dias_semana} días/sem</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${r.estado==='publicada'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>
                    {r.estado==='publicada'?'✓ Publicada':'Borrador'}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setDetalle(r); setNotasEdit(r.notas_entrenador||''); setModoEdicion(false); setRutinaBorrador(null); setContextoIA(''); setMostrarContextoIA(false) }}
                    className="flex-1 border border-black/10 text-[#0A0A0A] text-xs font-medium py-2 rounded-lg hover:bg-[#F5F5F0]">Ver rutina</button>
                  <button onClick={() => setMsgModal(r.cliente_id)} className="border border-black/10 text-[#6B6B6B] text-xs py-2 px-3 rounded-lg hover:bg-[#F5F5F0]">✉️</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== TAB BIBLIOTECA ===== */}
      {tabPrincipal === 'biblioteca' && (
        <>
          {/* Buscador biblioteca */}
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
            <input value={bibBusqueda} onChange={e => setBibBusqueda(e.target.value)} placeholder="Buscar ejercicio, músculo o sinónimo..."
              className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
            {bibBusqueda && <button onClick={() => setBibBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">×</button>}
          </div>

          {/* Filtros grupo muscular */}
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {['Todos', ...GRUPOS_MUSCULARES].map(g => (
              <button key={g} onClick={() => setBibGrupo(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${bibGrupo===g?'bg-[#FF5C00] text-white':'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
                {g}
              </button>
            ))}
          </div>

          {/* Filtros nivel */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {['Todos','principiante','intermedio','avanzado'].map(n => (
              <button key={n} onClick={() => setBibNivel(n)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all capitalize ${bibNivel===n?'bg-[#111] text-white':'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#111]'}`}>
                {n}
              </button>
            ))}
          </div>

          {/* Grid ejercicios */}
          <div className="grid md:grid-cols-2 gap-2">
            {bibFiltrada.length === 0 ? (
              <div className="col-span-2 bg-white rounded-2xl border border-black/5 p-10 text-center">
                <p className="text-3xl mb-2">📚</p>
                <p className="font-semibold text-[#0A0A0A]">Sin resultados</p>
              </div>
            ) : bibFiltrada.map(e => (
              <div key={e.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <button onClick={() => e.youtube_url && setVideoActivo(e)}
                    className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${e.youtube_url ? 'cursor-pointer' : 'bg-[#F5F5F0] cursor-default'}`}>
                    {e.youtube_url ? (
                      <div className="relative w-full h-full">
                        <img src={`https://img.youtube.com/vi/${e.youtube_url.split('/').pop()}/mqdefault.jpg`}
                          alt={e.nombre} className="w-full h-full object-cover"
                          onError={ev => { ev.target.style.display='none'; ev.target.nextSibling.style.display='flex' }} />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center hover:bg-[#FF5C00]/80 transition-colors">
                          <span className="text-white text-lg">▶</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-2xl">💪</span>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-[#0A0A0A] leading-tight">{e.nombre}</p>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => abrirEditar(e)}
                          className="text-[#6B6B6B] hover:text-[#FF5C00] transition-colors text-sm p-1">✏️</button>
                        <button onClick={() => eliminarEjercicio(e.id)}
                          className="text-[#6B6B6B] hover:text-red-500 transition-colors text-sm p-1">×</button>
                      </div>
                    </div>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">
                      {e.grupo_muscular}{e.grupo_secundario ? ` · ${e.grupo_secundario.replace(/;/g,', ')}` : ''}
                    </p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nivelColor(e.nivel)}`}>{e.nivel}</span>
                      {e.usos > 0 && <span className="text-xs bg-[#FF5C00]/8 text-[#FF5C00] px-2 py-0.5 rounded-full">{e.usos} usos</span>}
                      {!e.youtube_url && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Sin vídeo</span>}
                    </div>
                  </div>
                </div>
                {e.consejos_tecnica && (
                  <details className="mt-2">
                    <summary className="text-xs text-[#6B6B6B] cursor-pointer hover:text-[#FF5C00]">📋 Ver técnica</summary>
                    <p className="text-xs text-[#6B6B6B] mt-1.5 leading-relaxed">{e.consejos_tecnica}</p>
                  </details>
                )}
              </div>
            ))}
          </div>
        </>
      )}


      {/* Modal detalle rutina — overlay móvil + panel fijo derecho escritorio */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 md:bg-transparent md:inset-auto md:right-6 md:top-6 md:bottom-6 md:w-[440px]" onClick={() => setDetalle(null)}>
          <div className="absolute inset-x-0 bottom-0 md:inset-0 bg-white rounded-t-2xl md:rounded-2xl md:shadow-2xl md:border md:border-black/8 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-[#0A0A0A] text-sm">{detalle.borrador?.nombre||detalle.contenido?.nombre}</h2>
                <button onClick={() => setQuickView(detalle.cliente_id)} className="text-xs text-[#6B6B6B] hover:text-[#FF5C00] transition-colors">{detalle.clientes?.nombre} →</button>
              </div>
              <button onClick={() => { setDetalle(null); setModoEdicion(false); setRutinaBorrador(null) }} className="text-[#6B6B6B] text-xl w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-xl">×</button>
            </div>
            <div className="p-4 space-y-3">
              {/* Barra modo edición */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#6B6B6B]">{modoEdicion ? '✏️ Editando — toca cualquier campo' : 'Solo lectura'}</p>
                <button onClick={() => {
                  if (!modoEdicion) {
                    setRutinaBorrador(JSON.parse(JSON.stringify(detalle.borrador || detalle.contenido)))
                    setModoEdicion(true)
                  } else {
                    setModoEdicion(false); setRutinaBorrador(null)
                  }
                }} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${modoEdicion ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-[#FF5C00]/10 text-[#FF5C00]'}`}>
                  {modoEdicion ? '✗ Cancelar edición' : '✏️ Editar rutina'}
                </button>
              </div>

              {(modoEdicion ? rutinaBorrador?.dias : (detalle.borrador?.dias||detalle.contenido?.dias||[])).map((dia, diaIdx) => (
                <div key={dia.dia} className="border border-black/8 rounded-xl overflow-hidden">
                  <div className="bg-[#0A0A0A] px-4 py-2.5 flex items-center justify-between">
                    {modoEdicion ? (
                      <input value={dia.nombre} onChange={e => {
                        const d = {...rutinaBorrador}
                        d.dias[diaIdx].nombre = e.target.value
                        setRutinaBorrador(d)
                      }} className="bg-transparent text-white text-sm font-semibold border-b border-white/20 focus:outline-none focus:border-[#FF5C00] flex-1 mr-2" />
                    ) : (
                      <p className="text-white text-sm font-semibold">{dia.nombre}</p>
                    )}
                    {dia.patron_principal && <p className="text-white/40 text-xs">{dia.patron_principal}</p>}
                  </div>
                  <div className="divide-y divide-black/5">
                    {dia.ejercicios?.map((ej, ejIdx) => {
                      const ejBib = biblioteca.find(b => b.nombre.toLowerCase() === ej.nombre?.toLowerCase() || b.sinonimos?.toLowerCase().split(',').some(s => s.trim() === ej.nombre?.toLowerCase()))
                      return modoEdicion ? (
                        <div key={ejIdx} className="px-3 py-3 space-y-2 bg-amber-50/30">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#6B6B6B] w-4 text-center flex-shrink-0">{ejIdx+1}</span>
                            <input value={ej.nombre} onChange={e => {
                              const d = {...rutinaBorrador}
                              d.dias[diaIdx].ejercicios[ejIdx].nombre = e.target.value
                              setRutinaBorrador(d)
                            }} className="flex-1 text-sm font-medium border border-black/10 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF5C00] bg-white" placeholder="Nombre del ejercicio" />
                            <button onClick={() => {
                              const d = {...rutinaBorrador}
                              d.dias[diaIdx].ejercicios.splice(ejIdx, 1)
                              setRutinaBorrador(d)
                            }} className="text-red-400 hover:text-red-600 text-lg flex-shrink-0 w-7 text-center">×</button>
                          </div>
                          <div className="flex gap-2 pl-6">
                            <div className="flex-1">
                              <label className="text-xs text-[#6B6B6B]">Series × Reps</label>
                              <div className="flex gap-1 mt-0.5">
                                <input value={ej.series} onChange={e => {
                                  const d = {...rutinaBorrador}; d.dias[diaIdx].ejercicios[ejIdx].series = e.target.value; setRutinaBorrador(d)
                                }} className="w-14 text-sm font-bold text-[#FF5C00] border border-black/10 rounded-lg px-2 py-1 focus:outline-none focus:border-[#FF5C00] text-center bg-white" placeholder="4" />
                                <span className="text-[#6B6B6B] self-center">×</span>
                                <input value={ej.reps} onChange={e => {
                                  const d = {...rutinaBorrador}; d.dias[diaIdx].ejercicios[ejIdx].reps = e.target.value; setRutinaBorrador(d)
                                }} className="flex-1 text-sm border border-black/10 rounded-lg px-2 py-1 focus:outline-none focus:border-[#FF5C00] bg-white" placeholder="12-15" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-[#6B6B6B]">Descanso</label>
                              <input value={ej.descanso} onChange={e => {
                                const d = {...rutinaBorrador}; d.dias[diaIdx].ejercicios[ejIdx].descanso = e.target.value; setRutinaBorrador(d)
                              }} className="w-full text-sm border border-black/10 rounded-lg px-2 py-1.5 mt-0.5 focus:outline-none focus:border-[#FF5C00] bg-white" placeholder="60s" />
                            </div>
                          </div>
                          <div className="pl-6">
                            <input value={ej.notas||''} onChange={e => {
                              const d = {...rutinaBorrador}; d.dias[diaIdx].ejercicios[ejIdx].notas = e.target.value; setRutinaBorrador(d)
                            }} className="w-full text-xs border border-black/10 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF5C00] text-[#6B6B6B] bg-white" placeholder="Notas técnicas (opcional)" />
                          </div>
                        </div>
                      ) : (
                        <div key={ejIdx} className="px-4 py-3 flex items-start gap-3">
                          {ejBib?.youtube_url ? (
                            <button onClick={() => setVideoActivo(ejBib)}
                              className="w-8 h-8 bg-[#111] hover:bg-[#FF5C00] rounded-lg flex items-center justify-center flex-shrink-0 transition-colors mt-0.5">
                              <span className="text-white text-xs">▶</span>
                            </button>
                          ) : (
                            <div className="w-6 h-6 bg-[#FF5C00]/10 text-[#FF5C00] rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{ej.orden||ejIdx+1}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0A0A0A]">{ej.nombre}</p>
                            {ej.notas && <p className="text-xs text-[#6B6B6B] mt-0.5">{ej.notas}</p>}
                            {ejBib?.consejos_tecnica && (
                              <details className="mt-0.5"><summary className="text-xs text-[#FF5C00] cursor-pointer">📋 Técnica</summary>
                              <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">{ejBib.consejos_tecnica}</p></details>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-[#FF5C00]">{ej.series}×{ej.reps}</p>
                            <p className="text-xs text-[#6B6B6B]">{ej.descanso}</p>
                          </div>
                        </div>
                      )
                    })}
                    {modoEdicion && (
                      <button onClick={() => {
                        const d = {...rutinaBorrador}
                        d.dias[diaIdx].ejercicios.push({ nombre: '', series: 3, reps: '10-12', descanso: '60s', notas: '' })
                        setRutinaBorrador(d)
                      }} className="w-full text-center text-xs text-[#FF5C00] py-2.5 hover:bg-[#FF5C00]/5 transition-colors">
                        + Añadir ejercicio
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Botón guardar cambios (modo edición) */}
              {modoEdicion && (
                <button onClick={async () => {
                  const contenido = { ...(detalle.borrador || detalle.contenido), dias: rutinaBorrador.dias }
                  await supabase.from('rutinas').update({ borrador: contenido, contenido }).eq('id', detalle.id)
                  setDetalle(d => ({ ...d, borrador: contenido, contenido }))
                  setModoEdicion(false); setRutinaBorrador(null)
                  setToast('✓ Rutina guardada')
                }} className="w-full bg-emerald-500 text-white text-sm font-bold py-3 rounded-xl">
                  ✓ Guardar cambios
                </button>
              )}

              {/* Campo contexto adicional para IA */}
              {!modoEdicion && (
                <div>
                  <button onClick={() => setMostrarContextoIA(!mostrarContextoIA)}
                    className="text-xs text-[#6B6B6B] hover:text-[#FF5C00] transition-colors flex items-center gap-1">
                    🤖 {mostrarContextoIA ? 'Ocultar' : 'Regenerar con más contexto'}
                  </button>
                  {mostrarContextoIA && (
                    <div className="mt-2 space-y-2">
                      <textarea value={contextoIA} onChange={e => setContextoIA(e.target.value)} rows={3}
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                        placeholder="Ej: Sustituir sentadilla por prensa porque tiene dolor de rodilla. Añadir más trabajo de espalda. Quitar ejercicios de impacto." />
                      <button onClick={async () => {
                        if (!confirm('¿Regenerar con este contexto adicional?')) return
                        await supabase.from('rutinas').delete().eq('id', detalle.id)
                        setDetalle(null); setMostrarContextoIA(false)
                        await generarRutina(detalle.cliente_id, contextoIA)
                        setContextoIA('')
                      }} disabled={generando===detalle.cliente_id}
                        className="w-full bg-[#6366f1] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                        🔄 Regenerar con este contexto
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Disclaimer legal */}
              <div className="bg-[#F5F5F0] border border-black/8 rounded-xl p-3 flex gap-2">
                <span className="text-sm flex-shrink-0">⚖️</span>
                <p className="text-xs text-[#6B6B6B] leading-relaxed"><span className="font-semibold text-[#0A0A0A]">Aviso:</span> Este programa es una guía de entrenamiento. Si tienes dudas sobre tu estado de salud, consulta con un profesional médico.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Notas para el cliente</label>
                <textarea value={notasEdit} onChange={e => setNotasEdit(e.target.value)} rows={3}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                  placeholder="Indicaciones especiales..." />
              </div>
              <div className="flex gap-2">
                {detalle.estado==='borrador' && (
                  <button onClick={() => publicar(detalle)} className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl">✅ Publicar</button>
                )}
                <button onClick={() => guardarComoPlantilla(detalle)} className="border border-[#6366f1]/30 text-[#6366f1] text-sm py-3 px-3 rounded-xl hover:bg-[#6366f1]/5">📋</button>
                <button onClick={async () => {
                  if (!confirm('¿Regenerar con IA? Se eliminará la actual.')) return
                  await supabase.from('rutinas').delete().eq('id', detalle.id); setDetalle(null)
                  await generarRutina(detalle.cliente_id)
                }} disabled={generando===detalle.cliente_id}
                  className="border border-black/10 text-[#6B6B6B] text-sm py-3 px-3 rounded-xl hover:bg-[#F5F5F0] disabled:opacity-40">
                  {generando===detalle.cliente_id?'⏳':'🔄'}
                </button>
                <button onClick={async () => { if(!confirm('¿Eliminar?')) return; await supabase.from('rutinas').delete().eq('id',detalle.id); setDetalle(null); await cargar() }}
                  className="border border-black/10 text-[#6B6B6B] text-sm py-3 px-3 rounded-xl hover:bg-[#F5F5F0]">🗑</button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ===== MODALES ===== */}

      {/* Modal rutina manual */}
      {modalManual && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModalManual(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}><div className="p-4 border-b border-black/5 sticky top-0 bg-white z-10 flex items-center justify-between">
              <h2 className="font-bold text-[#0A0A0A]">Crear rutina manual</h2>
              <button onClick={() => setModalManual(false)} className="text-[#6B6B6B] text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente *</label>
                <select value={manualClienteId} onChange={e => setManualClienteId(e.target.value)}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre de la rutina *</label>
                <input value={manualNombre} onChange={e => setManualNombre(e.target.value)} placeholder="Ej: Rutina Full Body 3 días"
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Descripción</label>
                <input value={manualDescripcion} onChange={e => setManualDescripcion(e.target.value)} placeholder="Breve descripción del enfoque"
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
              {manualDias.map((dia, di) => (
                <div key={di} className="border border-black/8 rounded-2xl overflow-hidden">
                  <div className="bg-[#F5F5F0] px-4 py-3 flex items-center gap-2">
                    <input value={dia.nombre} onChange={e => updateDia(di,'nombre',e.target.value)}
                      className="flex-1 bg-transparent text-sm font-bold text-[#0A0A0A] focus:outline-none" />
                    {manualDias.length > 1 && <button onClick={() => removeDia(di)} className="text-[#6B6B6B] hover:text-red-500 text-lg">×</button>}
                  </div>
                  <div className="p-3 space-y-2">
                    {dia.ejercicios.map((ej, ei) => (
                      <div key={ei} className="space-y-1.5 border-b border-black/5 pb-2.5 last:border-0 last:pb-0">
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <EjercicioInput
                              value={ej.nombre}
                              onChange={val => updateEj(di,ei,'nombre',val)}
                              onSelect={e2 => { updateEj(di,ei,'nombre',e2.nombre); if(e2.patron) updateEj(di,ei,'patron',e2.patron) }}
                              uid={uid}
                              placeholder="Ejercicio (escribe para buscar)"
                              className="text-xs" />
                          </div>
                          {dia.ejercicios.length > 1 && <button onClick={() => removeEj(di,ei)} className="text-[#6B6B6B] hover:text-red-500 px-1">×</button>}
                        </div>
                        {/* Mostrar botón vídeo si existe en biblioteca */}
                        {ej.nombre && (() => {
                          const ejBib = biblioteca.find(b => b.nombre.toLowerCase() === ej.nombre.toLowerCase() || b.sinonimos?.toLowerCase().split(',').some(s => s.trim() === ej.nombre.toLowerCase()))
                          return ejBib?.youtube_url ? (
                            <button onClick={() => setVideoActivo(ejBib)} className="flex items-center gap-1 text-xs text-[#FF5C00] font-medium">
                              ▶ Ver vídeo técnica
                            </button>
                          ) : null
                        })()}
                        <div className="grid grid-cols-3 gap-1.5">
                          {[['series','Series','number'],['reps','Reps','text'],['descanso','Descanso','text']].map(([k,l,t])=>(
                            <div key={k}>
                              <label className="text-xs text-[#6B6B6B] mb-0.5 block">{l}</label>
                              <input type={t} value={ej[k]} onChange={e => updateEj(di,ei,k,t==='number'?Number(e.target.value):e.target.value)}
                                className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:border-[#FF5C00]" />
                            </div>
                          ))}
                        </div>
                        <input value={ej.notas} onChange={e => updateEj(di,ei,'notas',e.target.value)} placeholder="Notas del ejercicio (opcional)"
                          className="w-full border border-black/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#FF5C00]" />
                      </div>
                    ))}
                    <button onClick={() => addEj(di)} className="w-full border border-dashed border-black/15 text-xs text-[#6B6B6B] py-2 rounded-lg hover:border-[#FF5C00] hover:text-[#FF5C00]">+ Ejercicio</button>
                  </div>
                </div>
              ))}
              <button onClick={addDia} className="w-full border-2 border-dashed border-black/15 text-sm font-medium text-[#6B6B6B] py-3 rounded-2xl hover:border-[#FF5C00] hover:text-[#FF5C00]">+ Añadir día</button>
            </div>
            <div className="p-4 border-t border-black/5 sticky bottom-0 bg-white flex gap-2">
              <button onClick={() => setModalManual(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm font-medium py-3 rounded-xl">Cancelar</button>
              <button onClick={guardarManual} disabled={!manualClienteId||!manualNombre||guardandoManual}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-bold py-3 rounded-xl disabled:opacity-40">
                {guardandoManual?'Guardando...':'💾 Guardar rutina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal añadir ejercicio a biblioteca */}
      {modalNuevoEj && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-4">Añadir ejercicio a la biblioteca</h2>
            <FormEjercicio onSave={() => guardarEjercicio(false)} onCancel={() => setModalNuevoEj(false)} isEdit={false} />
          </div>
        </div>
      )}

      {/* Modal editar ejercicio */}
      {modalEditarEj && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-4">Editar ejercicio</h2>
            <FormEjercicio onSave={() => guardarEjercicio(true)} onCancel={() => setModalEditarEj(null)} isEdit={true} />
          </div>
        </div>
      )}

      {/* Modal plantillas */}
      {modalPlantillas && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModalPlantillas(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}><div className="p-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-bold text-[#0A0A0A]">Plantillas de rutina</h2>
              <button onClick={() => setModalPlantillas(false)} className="text-[#6B6B6B] text-xl">×</button>
            </div>
            <div className="p-4 space-y-3">
              {plantillas.map(p => (
                <div key={p.id} className="border border-black/8 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div><p className="font-semibold text-sm text-[#0A0A0A]">{p.nombre}</p><p className="text-xs text-[#6B6B6B] mt-0.5">{p.dias_semana} días/sem · {p.usos} usos</p></div>
                    <button onClick={() => eliminarPlantilla(p.id)} className="text-[#6B6B6B] hover:text-red-500 text-lg">×</button>
                  </div>
                  <select onChange={e => e.target.value && aplicarPlantilla(p, e.target.value)}
                    className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                    <option value="">Aplicar a cliente →</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal mensaje */}
      {msgModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setMsgModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}><h2 className="font-bold text-[#0A0A0A] mb-3">Enviar mensaje</h2>
            <textarea value={msgTexto} onChange={e => setMsgTexto(e.target.value)} rows={4}
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none mb-3" placeholder="Escribe tu mensaje..." />
            <div className="flex gap-2">
              <button onClick={() => setMsgModal(null)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={() => enviarMensaje(msgModal)} disabled={!msgTexto.trim()}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">Enviar ✉️</button>
            </div>
          </div>
        </div>
      )}

      {quickView && <ClienteQuickView clienteId={quickView} onClose={() => setQuickView(null)} />}
    </div>
  )
}
