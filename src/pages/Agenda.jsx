import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ClienteQuickView from '../components/ClienteQuickView'
import { useCentro } from '../hooks/useCentro.jsx'

const HORAS = Array.from({ length: 17 }, (_, i) => i + 6) // 6:00 a 22:00
const DIAS_LABEL = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const HORA_INICIO = 6
const PIXELS_POR_HORA = 80
const TIPOS_EXTRA = [
  { id: 'desplazamiento', label: 'Desplazamiento', icon: '🚗' },
  { id: 'reunion', label: 'Reunión', icon: '🤝' },
  { id: 'preparacion', label: 'Preparación', icon: '📋' },
  { id: 'admin', label: 'Admin', icon: '💻' },
  { id: 'formacion', label: 'Formación', icon: '📚' },
  { id: 'otro', label: 'Otro', icon: '⏱' },
]
const COLORES_CLIENTE = ['#FF5C00','#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#8b5cf6','#14b8a6']
const clienteColor = (id) => COLORES_CLIENTE[(id || '').charCodeAt(0) % COLORES_CLIENTE.length]

function getLunes(fecha) {
  const d = new Date(fecha)
  const dia = d.getDay()
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1))
  d.setHours(0,0,0,0)
  return d
}
function formatFecha(f) { return f.toISOString().split('T')[0] }
function horaAMin(h) { const [hh,mm] = h.split(':').map(Number); return hh*60+mm }
function minAHora(m) { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}` }
function formatH(m) { const h=Math.floor(m/60),min=m%60; return min?`${h}h ${min}m`:`${h}h` }

function Toast({ msg, tipo='ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[80] text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 ${tipo==='error'?'bg-red-600':'bg-[#111]'}`}>
      <span>{tipo==='error'?'⚠':'✓'}</span> {msg}
    </div>
  )
}


function VistaMensual({ mesVista, setMesVista, sesiones, hoy, abrirModalEnDia, setSesionDetalle, miembros, clienteColor }) {
  const primerDia = new Date(mesVista.getFullYear(), mesVista.getMonth(), 1)
  const ultimoDia = new Date(mesVista.getFullYear(), mesVista.getMonth()+1, 0)
  const diasMes = ultimoDia.getDate()
  const offsetInicio = (primerDia.getDay() + 6) % 7

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMesVista(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}
          className="w-8 h-8 flex items-center justify-center border border-black/10 rounded-lg text-[#6B6B6B] hover:bg-[#F5F5F0]">‹</button>
        <p className="text-sm font-bold text-[#0A0A0A] capitalize">
          {mesVista.toLocaleDateString('es-ES',{month:'long',year:'numeric'})}
        </p>
        <button onClick={() => setMesVista(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}
          className="w-8 h-8 flex items-center justify-center border border-black/10 rounded-lg text-[#6B6B6B] hover:bg-[#F5F5F0]">›</button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-black/5 rounded-xl overflow-hidden">
        {['L','M','X','J','V','S','D'].map(d => (
          <div key={d} className="bg-white py-2 text-center text-xs font-semibold text-[#6B6B6B]">{d}</div>
        ))}
        {Array.from({length: offsetInicio}, (_,i) => (
          <div key={`e${i}`} className="bg-white min-h-[72px]" />
        ))}
        {Array.from({length: diasMes}, (_,i) => {
          const dia = i+1
          const fechaDia = `${mesVista.getFullYear()}-${String(mesVista.getMonth()+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
          const sessDia = sesiones.filter(s => s.fecha === fechaDia)
          const esHoyDia = fechaDia === hoy
          return (
            <div key={dia} onClick={() => abrirModalEnDia(new Date(fechaDia+'T12:00'), '09:00')}
              className={`bg-white min-h-[72px] p-1.5 cursor-pointer hover:bg-[#F5F5F0] transition-all ${esHoyDia?'bg-[#FF5C00]/5':''}`}>
              <p className={`text-xs font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${esHoyDia?'bg-[#FF5C00] text-white':'text-[#0A0A0A]'}`}>{dia}</p>
              <div className="space-y-0.5">
                {sessDia.slice(0,3).map((s,si) => {
                  const miem = miembros?.find(m => m.user_id === s.entrenador_id)
                  const col = miem?.color || clienteColor(s.cliente_id)
                  return (
                    <div key={si} onClick={e => { e.stopPropagation(); setSesionDetalle(s) }}
                      className="text-[10px] px-1 py-0.5 rounded truncate leading-tight"
                      style={{ background: s._esVirtual ? 'transparent' : col, color: s._esVirtual ? col : 'white', border: s._esVirtual ? `1px dashed ${col}` : 'none' }}>
                      {s.hora?.slice(0,5)} {s.clientes?.nombre?.split(' ')[0]}
                    </div>
                  )
                })}
                {sessDia.length > 3 && <p className="text-[10px] text-[#6B6B6B]">+{sessDia.length-3}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Agenda({ session }) {
  const [semanaBase, setSemanaBase] = useState(() => getLunes(new Date()))
  const [sesiones, setSesiones] = useState([])
  const [recurrentes, setRecurrentes] = useState([])
  const [clientes, setClientes] = useState([])
  const [horasExtra, setHorasExtra] = useState([])
  const [vista, setVista] = useState('timeline') // timeline | mes
  const [modal, setModal] = useState(false)
  const [modalRecurrente, setModalRecurrente] = useState(false)
  const [modalExtra, setModalExtra] = useState(false)
  const [modalResumen, setModalResumen] = useState(false)
  const [modalGestionRec, setModalGestionRec] = useState(false)
  const [diaClick, setDiaClick] = useState(null)
  const [horaClick, setHoraClick] = useState('09:00')
  const [sesionDetalle, setSesionDetalle] = useState(null)
  const [editando, setEditando] = useState(false)
  const [formEdit, setFormEdit] = useState({})
  const [quickView, setQuickView] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ cliente_id:'', hora:'09:00', duracion_minutos:60, tipo:'presencial', notas:'' })
  const [formRec, setFormRec] = useState({ cliente_id:'', hora:'09:00', duracion_minutos:60, tipo:'presencial', dias_semana:[], fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin:'', notas:'' })
  const [formExtra, setFormExtra] = useState({ fecha: new Date().toISOString().split('T')[0], concepto:'', horas:'1', tipo:'desplazamiento' })
  const [loading, setLoading] = useState(false)
  const [filtroEntrenador, setFiltroEntrenador] = useState('todos')
  const [mesVista, setMesVista] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const { centro, miembros, esAdmin } = useCentro() || {}
  const timelineRef = useRef()
  const uid = session.user.id

  const diasSemana = useMemo(() => Array.from({length:7},(_,i)=>{ const d=new Date(semanaBase); d.setDate(d.getDate()+i); return d }), [semanaBase])
  const hoy = formatFecha(new Date())
  const horaActual = new Date().getHours() + new Date().getMinutes()/60
  const inicioSemana = formatFecha(semanaBase)
  const finSemana = formatFecha(diasSemana[6])
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  useEffect(() => { cargar() }, [uid, semanaBase])

  // Scroll al inicio del día laboral al montar
  useEffect(() => {
    if (timelineRef.current && vista === 'timeline') {
      setTimeout(() => { timelineRef.current.scrollTop = (7-HORA_INICIO) * PIXELS_POR_HORA }, 100)
    }
  }, [vista])

  async function cargar() {
    const hace60 = new Date(Date.now() - 60*864e5).toISOString().split('T')[0]
    const [{ data: se }, { data: cl }, { data: he }, { data: rc }] = await Promise.all([
      centro
        ? supabase.from('sesiones').select('*, clientes(nombre,tipo)').eq('centro_id', centro.id).gte('fecha', hace60).order('fecha').order('hora')
        : supabase.from('sesiones').select('*, clientes(nombre,tipo)').eq('entrenador_id', uid).gte('fecha', hace60).order('fecha').order('hora'),
      supabase.from('clientes').select('id,nombre,tipo,horas_semana').eq('entrenador_id', uid).eq('estado','activo'),
      supabase.from('horas_extra').select('*').eq('entrenador_id', uid).gte('fecha', hace60).order('fecha', { ascending: false }),
      supabase.from('sesiones_recurrentes').select('*, clientes(nombre)').eq('entrenador_id', uid).eq('activa', true),
    ])
    setSesiones(se || [])
    setClientes(cl || [])
    setHorasExtra(he || [])
    setRecurrentes(rc || [])
  }

  // Generar sesiones virtuales de recurrentes para la semana actual
  const sesionesConRecurrentes = useMemo(() => {
    const resultado = [...sesiones]
    recurrentes.forEach(rec => {
      diasSemana.forEach((dia, diaIdx) => {
        const diaSemana = diaIdx + 1 // 1=lun...7=dom
        const fechaDia = formatFecha(dia)
        if (!rec.dias_semana.includes(diaSemana)) return
        if (fechaDia < rec.fecha_inicio) return
        if (rec.fecha_fin && fechaDia > rec.fecha_fin) return
        // Comprobar que no existe ya sesión real para ese día y cliente
        const yaExiste = sesiones.some(s => s.fecha === fechaDia && s.cliente_id === rec.cliente_id && s.hora === rec.hora)
        if (!yaExiste) {
          resultado.push({
            id: `rec_${rec.id}_${fechaDia}`,
            entrenador_id: uid,
            cliente_id: rec.cliente_id,
            fecha: fechaDia,
            hora: rec.hora,
            duracion_minutos: rec.duracion_minutos,
            tipo: rec.tipo,
            completada: false,
            notas: rec.notas,
            clientes: rec.clientes,
            _esVirtual: true,
            _recurrenteId: rec.id
          })
        }
      })
    })
    return resultado.sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora))
  }, [sesiones, recurrentes, diasSemana])

  async function guardarSesion() {
    if (!form.cliente_id) return
    setLoading(true)
    const fecha = diaClick || formatFecha(diasSemana[0])
    const { error } = await supabase.from('sesiones').insert({
      entrenador_id: uid, cliente_id: form.cliente_id,
      fecha, hora: form.hora, tipo: form.tipo,
      duracion_minutos: form.duracion_minutos,
      completada: false, notas: form.notas
    })
    if (error) setToast({ msg: 'Error al guardar', tipo: 'error' })
    else setToast({ msg: 'Sesión añadida' })
    setModal(false)
    setForm({ cliente_id:'', hora:'09:00', duracion_minutos:60, tipo:'presencial', notas:'' })
    await cargar()
    setLoading(false)
  }

  async function guardarRecurrente() {
    if (!formRec.cliente_id || !formRec.dias_semana.length) return
    setLoading(true)
    const { error } = await supabase.from('sesiones_recurrentes').insert({
      entrenador_id: uid, cliente_id: formRec.cliente_id,
      hora: formRec.hora, duracion_minutos: formRec.duracion_minutos,
      tipo: formRec.tipo, dias_semana: formRec.dias_semana,
      fecha_inicio: formRec.fecha_inicio, fecha_fin: formRec.fecha_fin || null,
      notas: formRec.notas, activa: true
    })
    if (error) setToast({ msg: 'Error', tipo: 'error' })
    else setToast({ msg: 'Sesión recurrente creada' })
    setModalRecurrente(false)
    setFormRec({ cliente_id:'', hora:'09:00', duracion_minutos:60, tipo:'presencial', dias_semana:[], fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin:'', notas:'' })
    await cargar()
    setLoading(false)
  }

  async function guardarEdicion() {
    if (!sesionDetalle?.id) return
    setLoading(true)
    await supabase.from('sesiones').update({
      hora: formEdit.hora,
      duracion_minutos: Number(formEdit.duracion_minutos),
      tipo: formEdit.tipo,
      notas: formEdit.notas
    }).eq('id', sesionDetalle.id)
    setEditando(false)
    setSesionDetalle(null)
    setToast({ msg: 'Sesión actualizada' })
    await cargar()
    setLoading(false)
  }

  async function confirmarSesionVirtual(sesion) {
    // Convertir sesión virtual en real
    const { error } = await supabase.from('sesiones').insert({
      entrenador_id: uid, cliente_id: sesion.cliente_id,
      fecha: sesion.fecha, hora: sesion.hora, tipo: sesion.tipo,
      duracion_minutos: sesion.duracion_minutos, completada: true,
      notas: sesion.notas, es_recurrente: true, recurrente_id: sesion._recurrenteId
    })
    if (!error) { setToast({ msg: 'Sesión confirmada ✓' }); setSesionDetalle(null); await cargar() }
  }

  async function toggleCompletada(id, completada) {
    await supabase.from('sesiones').update({ completada: !completada }).eq('id', id)
    await cargar()
  }

  async function eliminarSesion(id) {
    if (!confirm('¿Eliminar esta sesión?')) return
    await supabase.from('sesiones').delete().eq('id', id)
    setSesionDetalle(null)
    await cargar()
  }

  async function pausarRecurrente(id, activa) {
    await supabase.from('sesiones_recurrentes').update({ activa: !activa }).eq('id', id)
    setToast({ msg: activa ? 'Regla pausada' : 'Regla activada' })
    await cargar()
  }

  async function eliminarRecurrente(id) {
    if (!confirm('¿Eliminar esta regla recurrente? No afecta a las sesiones ya registradas.')) return
    await supabase.from('sesiones_recurrentes').delete().eq('id', id)
    await cargar()
  }

  async function guardarExtra() {
    if (!formExtra.concepto || !formExtra.horas) return
    setLoading(true)
    await supabase.from('horas_extra').insert({ entrenador_id: uid, ...formExtra, horas: Number(formExtra.horas) })
    setToast({ msg: 'Horas extra registradas' })
    setModalExtra(false)
    setFormExtra({ fecha: new Date().toISOString().split('T')[0], concepto:'', horas:'1', tipo:'desplazamiento' })
    await cargar()
    setLoading(false)
  }

  // Stats de horas
  const sesionesSemana = sesionesConRecurrentes.filter(s => s.fecha >= inicioSemana && s.fecha <= finSemana)
  const sesCompletadasSemana = sesiones.filter(s => s.fecha >= inicioSemana && s.fecha <= finSemana && s.completada)
  const sesCompletadasMes = sesiones.filter(s => s.fecha >= inicioMes && s.completada)
  const horasAutoSemana = sesCompletadasSemana.reduce((s,x) => s + (x.duracion_minutos||60), 0)
  const horasAutoMes = sesCompletadasMes.reduce((s,x) => s + (x.duracion_minutos||60), 0)
  const extraSemana = horasExtra.filter(h => h.fecha >= inicioSemana && h.fecha <= finSemana).reduce((s,x) => s+Number(x.horas),0)
  const extraMes = horasExtra.filter(h => h.fecha >= inicioMes).reduce((s,x) => s+Number(x.horas),0)

  function abrirModalEnDia(dia, hora) {
    setDiaClick(formatFecha(dia))
    setHoraClick(hora || '09:00')
    setForm(f => ({ ...f, hora: hora || '09:00' }))
    setModal(true)
  }

  const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      {quickView && <ClienteQuickView clienteId={quickView} onClose={() => setQuickView(null)} />}

      {/* Header fijo */}
      <div className="bg-white border-b border-black/5 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {/* Navegación semana */}
        <button onClick={() => setSemanaBase(d => { const n=new Date(d); n.setDate(n.getDate()-7); return n })}
          className="w-8 h-8 flex items-center justify-center border border-black/10 rounded-lg text-[#6B6B6B] hover:bg-[#F5F5F0]">‹</button>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold text-[#0A0A0A]">
            {diasSemana[0].toLocaleDateString('es-ES',{day:'numeric',month:'short'})} — {diasSemana[6].toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}
          </p>
          <p className="text-xs text-[#6B6B6B]">{sesionesSemana.length} sesiones · {sesCompletadasSemana.length} completadas</p>
        </div>

        {centro && miembros?.length > 1 && (
          <select value={filtroEntrenador} onChange={e => setFiltroEntrenador(e.target.value)}
            className="text-xs border border-black/10 rounded-lg px-2 py-1.5 bg-white text-[#6B6B6B] focus:outline-none focus:border-[#FF5C00]">
            <option value="todos">Todos</option>
            {miembros.map(m => <option key={m.id} value={m.user_id}>{m.nombre||m.email?.split('@')[0]}</option>)}
          </select>
        )}
        <button onClick={() => setSemanaBase(getLunes(new Date()))}
          className="px-2 py-1 text-xs border border-black/10 rounded-lg text-[#6B6B6B] hover:bg-[#F5F5F0]">Hoy</button>
        <div className="flex gap-1 bg-black/5 p-0.5 rounded-lg">
          {[['timeline','⏱'],['mes','📅']].map(([v,ic]) => (
            <button key={v} onClick={() => setVista(v)}
              className={`px-2 py-1 text-xs rounded-md transition-all ${vista===v?'bg-white shadow-sm text-[#0A0A0A]':'text-[#6B6B6B]'}`}>
              {ic}
            </button>
          ))}
        </div>
        <button onClick={() => setSemanaBase(d => { const n=new Date(d); n.setDate(n.getDate()+7); return n })}
          className="w-8 h-8 flex items-center justify-center border border-black/10 rounded-lg text-[#6B6B6B] hover:bg-[#F5F5F0]">›</button>
      </div>

      {/* Acciones */}
      <div className="bg-white border-b border-black/5 px-4 py-2 flex items-center gap-2 flex-shrink-0 justify-between">
        <div className="flex gap-1.5">
          <button onClick={() => setModalGestionRec(true)}
            className="border border-[#6366f1]/30 text-[#6366f1] text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#6366f1]/5">
            🔄 Recurrentes {recurrentes.length > 0 ? `(${recurrentes.length})` : ''}
          </button>
          <button onClick={() => setModalRecurrente(true)}
            className="border border-[#FF5C00]/30 text-[#FF5C00] text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#FF5C00]/5">↻ Nueva regla</button>
        </div>
        <button onClick={() => { setDiaClick(hoy); setModal(true) }}
          className="bg-[#FF5C00] text-white text-xs font-semibold px-3 py-1.5 rounded-lg">+ Sesión</button>
      </div>

      {/* VISTA MENSUAL */}
      {vista === 'mes' && (
        <VistaMensual
          mesVista={mesVista} setMesVista={setMesVista}
          sesiones={sesionesConRecurrentes} hoy={hoy}
          abrirModalEnDia={abrirModalEnDia} setSesionDetalle={setSesionDetalle}
          miembros={miembros} clienteColor={clienteColor}
        />
      )}

      {/* TIMELINE */}
      <div className={`flex-1 overflow-hidden flex flex-col ${vista === 'mes' ? 'hidden' : ''}`}>
        {/* Cabecera días */}
        <div className="bg-white border-b border-black/5 flex flex-shrink-0">
          <div className="w-12 flex-shrink-0" /> {/* espacio horas */}
          {diasSemana.map((dia, i) => {
            const esHoy = formatFecha(dia) === hoy
            const nSes = sesionesConRecurrentes.filter(s => s.fecha === formatFecha(dia)).length
            return (
              <div key={i} className={`flex-1 text-center py-2 border-l border-black/5 cursor-pointer hover:bg-[#F5F5F0] transition-all ${esHoy ? 'bg-[#FF5C00]/5' : ''}`}
                onClick={() => abrirModalEnDia(dia, '09:00')}>
                <p className={`text-xs font-medium ${esHoy ? 'text-[#FF5C00]' : 'text-[#6B6B6B]'}`}>{DIAS_LABEL[i]}</p>
                <p className={`text-sm font-bold ${esHoy ? 'text-[#FF5C00]' : 'text-[#0A0A0A]'}`}>{dia.getDate()}</p>
                {nSes > 0 && <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-0.5 ${esHoy ? 'bg-[#FF5C00]' : 'bg-black/30'}`} />}
              </div>
            )
          })}
        </div>

        {/* Grid timeline scrollable */}
        <div ref={timelineRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="flex" style={{ height: HORAS.length * PIXELS_POR_HORA }}>
            {/* Columna horas */}
            <div className="w-12 flex-shrink-0 relative">
              {HORAS.map(h => (
                <div key={h} className="absolute flex items-start justify-end pr-2 w-full"
                  style={{ top: (h - HORA_INICIO) * PIXELS_POR_HORA, height: PIXELS_POR_HORA }}>
                  <span className="text-xs text-[#6B6B6B] -mt-2">{h}:00</span>
                </div>
              ))}
            </div>

            {/* Columnas días */}
            {diasSemana.map((dia, diaIdx) => {
              const fechaDia = formatFecha(dia)
              const esHoy = fechaDia === hoy
              const sesionesDia = sesionesConRecurrentes.filter(s => s.fecha === fechaDia)
                .sort((a,b) => (a.hora||'00:00').localeCompare(b.hora||'00:00'))

              return (
                <div key={diaIdx} className={`flex-1 border-l border-black/5 relative ${esHoy ? 'bg-[#FF5C00]/2' : ''}`}
                  style={{ height: HORAS.length * PIXELS_POR_HORA }}>
                  {/* Líneas de hora */}
                  {HORAS.map(h => (
                    <div key={h} className="absolute w-full border-t border-black/5 cursor-pointer hover:bg-black/3 transition-colors"
                      style={{ top: (h - HORA_INICIO) * PIXELS_POR_HORA, height: PIXELS_POR_HORA }}
                      onClick={() => abrirModalEnDia(dia, `${String(h).padStart(2,'0')}:00`)} />
                  ))}

                  {/* Línea hora actual */}
                  {esHoy && horaActual >= HORA_INICIO && horaActual <= HORA_INICIO + HORAS.length && (
                    <div className="absolute w-full z-20 pointer-events-none"
                      style={{ top: (horaActual - HORA_INICIO) * PIXELS_POR_HORA }}>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
                        <div className="flex-1 h-px bg-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Sesiones posicionadas — con detección de solapamiento */}
                  {(() => {
                    // Calcular columnas para evitar solapamiento
                    const sesOrdenadas = [...sesionesDia].sort((a,b) => horaAMin(a.hora||'09:00') - horaAMin(b.hora||'09:00'))
                    const columnas = [] // array de arrays de sesiones
                    
                    for (const s of sesOrdenadas) {
                      const ini = horaAMin(s.hora || '09:00')
                      const fin = ini + (s.duracion_minutos || 60)
                      // Buscar la primera columna donde no hay solapamiento
                      let colocada = false
                      for (const col of columnas) {
                        const ultima = col[col.length - 1]
                        const uIni = horaAMin(ultima.hora || '09:00')
                        const uFin = uIni + (ultima.duracion_minutos || 60)
                        if (ini >= uFin) { col.push(s); colocada = true; break }
                      }
                      if (!colocada) columnas.push([s])
                    }
                    
                    const numCols = columnas.length || 1
                    // Mapear sesión → (colIdx, totalCols)
                    const sesMap = new Map()
                    columnas.forEach((col, ci) => col.forEach(s => sesMap.set(s.id || s._key, { ci, numCols })))

                    return sesionesDia.map((s, idx) => {
                      const horaMin = horaAMin(s.hora || '09:00')
                      const top = (horaMin / 60 - HORA_INICIO) * PIXELS_POR_HORA
                      const durMin = s.duracion_minutos || 60
                      const height = Math.max((durMin / 60) * PIXELS_POR_HORA - 4, 24)
                      const entrenadorMiembro = miembros?.find(m => m.user_id === s.entrenador_id)
                      const color = entrenadorMiembro ? (entrenadorMiembro.color || clienteColor(s.cliente_id)) : clienteColor(s.cliente_id)
                      const esVirtual = s._esVirtual
                      const { ci = 0, numCols: nc = 1 } = sesMap.get(s.id || s._key) || {}
                      const ancho = 100 / nc
                      const left = ancho * ci

                      return (
                        <div key={s.id || idx}
                          onClick={e => { e.stopPropagation(); setSesionDetalle(s) }}
                          className={`absolute rounded-lg px-1.5 py-1 cursor-pointer z-10 transition-all hover:brightness-95 ${s.completada ? 'opacity-60' : ''} ${esVirtual ? 'border-dashed border-2' : ''}`}
                          style={{
                            top: top + 2,
                            height,
                            left: `calc(${left}% + 2px)`,
                            width: `calc(${ancho}% - 4px)`,
                            background: esVirtual ? 'white' : color,
                            borderColor: color,
                            overflow: 'hidden'
                          }}>
                          <p className={`text-xs font-bold truncate leading-tight ${esVirtual ? '' : 'text-white'}`}
                            style={esVirtual ? { color } : {}}>
                            {s.clientes?.nombre?.split(' ')[0]}
                          </p>
                          {height > 30 && (
                            <p className={`text-xs truncate ${esVirtual ? 'text-[#6B6B6B]' : 'text-white/80'}`}>
                              {s.hora} · {durMin}min
                            </p>
                          )}
                          {s.completada && (
                            <div className="absolute top-1 right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-[8px]">✓</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal detalle sesión */}
      {sesionDetalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: clienteColor(sesionDetalle.cliente_id) }}>
                {ini(sesionDetalle.clientes?.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <button onClick={() => { setQuickView(sesionDetalle.cliente_id); setSesionDetalle(null) }}
                  className="font-bold text-[#0A0A0A] hover:text-[#FF5C00] transition-colors text-left">
                  {sesionDetalle.clientes?.nombre}
                </button>
                <p className="text-xs text-[#6B6B6B]">
                  {new Date(sesionDetalle.fecha).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
                </p>
              </div>
              <button onClick={() => { setSesionDetalle(null); setEditando(false) }} className="text-[#6B6B6B] text-xl">×</button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                ['🕐', sesionDetalle.hora || '—'],
                ['⏱', `${sesionDetalle.duracion_minutos||60}min`],
                ['📍', sesionDetalle.tipo],
              ].map(([ic,v])=>(
                <div key={ic} className="bg-[#F5F5F0] rounded-xl p-2.5 text-center">
                  <p className="text-base">{ic}</p>
                  <p className="text-xs font-semibold text-[#0A0A0A] mt-0.5">{v}</p>
                </div>
              ))}
            </div>

            {sesionDetalle.notas && (
              <div className="bg-amber-50 rounded-xl p-3 mb-3">
                <p className="text-xs text-amber-800">{sesionDetalle.notas}</p>
              </div>
            )}

            {sesionDetalle._esVirtual ? (
              <div className="space-y-2">
                <div className="bg-[#6366f1]/8 rounded-xl p-3 text-center mb-2">
                  <p className="text-xs text-[#6366f1] font-medium">↻ Sesión recurrente programada</p>
                </div>
                <button onClick={() => confirmarSesionVirtual(sesionDetalle)}
                  className="w-full bg-emerald-500 text-white text-sm font-semibold py-2.5 rounded-xl">
                  ✓ Confirmar como completada
                </button>
                <button onClick={() => setSesionDetalle(null)}
                  className="w-full border border-black/10 text-[#6B6B6B] text-sm py-2.5 rounded-xl">
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => toggleCompletada(sesionDetalle.id, sesionDetalle.completada)}
                  className={`flex-1 text-sm font-semibold py-2.5 rounded-xl ${sesionDetalle.completada ? 'bg-[#F5F5F0] text-[#6B6B6B]' : 'bg-emerald-500 text-white'}`}>
                  {sesionDetalle.completada ? 'Marcar pendiente' : '✓ Completada'}
                </button>
                <button onClick={() => eliminarSesion(sesionDetalle.id)}
                  className="border border-red-200 text-red-500 text-sm px-3 py-2.5 rounded-xl hover:bg-red-50">🗑</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal nueva sesión */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-4">
              Nueva sesión — {diaClick ? new Date(diaClick+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'}) : ''}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente *</label>
                <select value={form.cliente_id} onChange={e => setForm(f=>({...f,cliente_id:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Hora</label>
                  <input type="time" value={form.hora} onChange={e => setForm(f=>({...f,hora:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Duración</label>
                  <select value={form.duracion_minutos} onChange={e => setForm(f=>({...f,duracion_minutos:Number(e.target.value)}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                    {[30,45,60,75,90,120].map(v=><option key={v} value={v}>{v}min</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f=>({...f,tipo:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="presencial">📍 Presencial</option>
                  <option value="online">🌐 Online</option>
                  <option value="pareja_grupo">👥 Pareja/Grupo</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Notas</label>
                <input value={form.notas} onChange={e => setForm(f=>({...f,notas:e.target.value}))}
                  placeholder="Ej: Día de pierna, traer rodilleras..."
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={guardarSesion} disabled={!form.cliente_id || loading}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {loading ? 'Guardando...' : 'Añadir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sesión recurrente */}
      {modalRecurrente && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModalRecurrente(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-[#0A0A0A] mb-1">Nueva sesión recurrente</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">Se repite automáticamente cada semana los días que selecciones</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente *</label>
                <select value={formRec.cliente_id} onChange={e => setFormRec(f=>({...f,cliente_id:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Días de la semana *</label>
                <div className="flex gap-1.5">
                  {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((d,i) => {
                    const diaNum = i+1
                    const sel = formRec.dias_semana.includes(diaNum)
                    return (
                      <button key={d} type="button" onClick={() => setFormRec(f=>({...f, dias_semana: sel ? f.dias_semana.filter(x=>x!==diaNum) : [...f.dias_semana,diaNum]}))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${sel?'bg-[#FF5C00] text-white':'border border-black/10 text-[#6B6B6B]'}`}>
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Hora</label>
                  <input type="time" value={formRec.hora} onChange={e => setFormRec(f=>({...f,hora:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Duración</label>
                  <select value={formRec.duracion_minutos} onChange={e => setFormRec(f=>({...f,duracion_minutos:Number(e.target.value)}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                    {[30,45,60,75,90,120].map(v=><option key={v} value={v}>{v}min</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Desde</label>
                  <input type="date" value={formRec.fecha_inicio} onChange={e => setFormRec(f=>({...f,fecha_inicio:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Hasta (opcional)</label>
                  <input type="date" value={formRec.fecha_fin} onChange={e => setFormRec(f=>({...f,fecha_fin:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Tipo</label>
                <select value={formRec.tipo} onChange={e => setFormRec(f=>({...f,tipo:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="presencial">📍 Presencial</option>
                  <option value="online">🌐 Online</option>
                  <option value="pareja_grupo">👥 Pareja/Grupo</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Notas</label>
                <input value={formRec.notas} onChange={e => setFormRec(f=>({...f,notas:e.target.value}))}
                  placeholder="Ej: L/X/V 9am Carlos+Pablo"
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalRecurrente(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={guardarRecurrente} disabled={!formRec.cliente_id || !formRec.dias_semana.length || loading}
                className="flex-1 bg-[#6366f1] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {loading ? 'Guardando...' : '↻ Crear regla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestión recurrentes */}
      {modalGestionRec && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModalGestionRec(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-[#0A0A0A]">Sesiones recurrentes</h2>
                <p className="text-xs text-[#6B6B6B]">{recurrentes.length} reglas activas</p>
              </div>
              <button onClick={() => setModalGestionRec(false)} className="text-[#6B6B6B] text-xl">×</button>
            </div>
            <div className="p-4 space-y-3">
              {recurrentes.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">↻</p>
                  <p className="text-sm font-semibold text-[#0A0A0A]">Sin reglas recurrentes</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Crea una para que las sesiones se repitan automáticamente</p>
                </div>
              ) : recurrentes.map(r => {
                const diasLabel = ['','Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
                return (
                  <div key={r.id} className={`border rounded-xl p-3.5 ${r.activa ? 'border-[#6366f1]/20 bg-[#6366f1]/3' : 'border-black/5 bg-[#F5F5F0]'}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A0A0A]">{r.clientes?.nombre}</p>
                        <p className="text-xs text-[#6B6B6B]">
                          {r.dias_semana.map(d=>diasLabel[d]).join('/')} · {r.hora} · {r.duracion_minutos}min
                        </p>
                        <p className="text-xs text-[#6B6B6B]">Desde {new Date(r.fecha_inicio+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}{r.fecha_fin ? ` hasta ${new Date(r.fecha_fin+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}` : ''}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${r.activa?'bg-emerald-50 text-emerald-700':'bg-gray-100 text-gray-500'}`}>
                        {r.activa ? 'Activa' : 'Pausada'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => pausarRecurrente(r.id, r.activa)}
                        className="flex-1 border border-black/10 text-xs font-medium py-1.5 rounded-lg text-[#6B6B6B] hover:bg-black/5">
                        {r.activa ? '⏸ Pausar' : '▶ Activar'}
                      </button>
                      <button onClick={() => eliminarRecurrente(r.id)}
                        className="border border-red-100 text-red-500 text-xs px-3 py-1.5 rounded-lg hover:bg-red-50">🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal horas extra */}
      {modalExtra && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModalExtra(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-1">Registrar horas extra</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">Desplazamientos, reuniones, preparación de programas...</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS_EXTRA.map(t => (
                    <button key={t.id} type="button" onClick={() => setFormExtra(f=>({...f,tipo:t.id}))}
                      className={`p-2 rounded-xl border text-center transition-all ${formExtra.tipo===t.id?'bg-[#FF5C00] border-[#FF5C00]':'border-black/10 hover:border-[#FF5C00]/50'}`}>
                      <p className="text-lg">{t.icon}</p>
                      <p className={`text-xs font-medium mt-0.5 ${formExtra.tipo===t.id?'text-white':'text-[#0A0A0A]'}`}>{t.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Descripción</label>
                <input value={formExtra.concepto} onChange={e => setFormExtra(f=>({...f,concepto:e.target.value}))}
                  placeholder="Ej: Desplazamiento a casa de Carlos y Pablo"
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Horas</label>
                  <input type="number" step="0.25" min="0.25" value={formExtra.horas} onChange={e => setFormExtra(f=>({...f,horas:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Fecha</label>
                  <input type="date" value={formExtra.fecha} onChange={e => setFormExtra(f=>({...f,fecha:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalExtra(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={guardarExtra} disabled={!formExtra.concepto || !formExtra.horas || loading}
                className="flex-1 bg-[#6366f1] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {loading ? 'Guardando...' : '⏱ Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal resumen horas */}
      {modalResumen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModalResumen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#0A0A0A]">Resumen de horas</h2>
              <button onClick={() => setModalResumen(false)} className="text-[#6B6B6B] text-xl">×</button>
            </div>
            <div className="space-y-3">
              <div className="bg-[#111] rounded-xl p-4">
                <p className="text-white/40 text-xs mb-2">Esta semana</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-[#FF5C00] font-bold">{formatH(horasAutoSemana)}</p><p className="text-white/40 text-xs">Sesiones</p></div>
                  <div><p className="text-[#6366f1] font-bold">{extraSemana}h</p><p className="text-white/40 text-xs">Extras</p></div>
                  <div><p className="text-white font-bold">{formatH(horasAutoSemana + extraSemana*60)}</p><p className="text-white/40 text-xs">Total</p></div>
                </div>
              </div>
              <div className="bg-[#F5F5F0] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#0A0A0A]">{(horasAutoMes/60 + extraMes).toFixed(1)}h</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5">Total horas este mes · {sesCompletadasMes.length} sesiones</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
