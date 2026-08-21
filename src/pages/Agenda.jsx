import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ClienteQuickView from '../components/ClienteQuickView'
import { useCentro } from '../hooks/useCentro.jsx'

const HORAS = Array.from({ length: 17 }, (_, i) => i + 6) // 6:00 a 22:00
const DIAS_LABEL = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const HORA_INICIO = 6
const PIXELS_POR_HORA = 64
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
function formatFecha(f) {
  const y = f.getFullYear()
  const m = String(f.getMonth()+1).padStart(2,'0')
  const d = String(f.getDate()).padStart(2,'0')
  return `${y}-${m}-${d}`
}
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


function VistaMensual({ mesVista, setMesVista, sesiones, hoy, abrirModalEnDia, setSesionDetalle, miembros, clienteColor, grupos, gruposMap, excepcionesGrupo }) {
  const primerDia = new Date(mesVista.getFullYear(), mesVista.getMonth(), 1)
  const ultimoDia = new Date(mesVista.getFullYear(), mesVista.getMonth()+1, 0)
  const diasMes = ultimoDia.getDate()
  const offsetInicio = (primerDia.getDay() + 6) % 7

  // Expandir grupos para todo el mes
  const sesionesConGrupos = useMemo(() => {
    const resultado = [...sesiones]
    const excGrupoMap = {}
    ;(excepcionesGrupo||[]).forEach(e => { excGrupoMap[`${e.grupo_id}_${e.fecha_original}`] = e })

    ;(grupos||[]).forEach(g => {
      if (!g.hora || !g.dias_semana?.length) return
      const miembrosG = (g.grupo_clientes||[]).filter(m=>m.activo)
      if (!miembrosG.length) return

      for (let dia = 1; dia <= diasMes; dia++) {
        const fecha = new Date(mesVista.getFullYear(), mesVista.getMonth(), dia)
        const diaSemana = ((fecha.getDay() + 6) % 7) + 1 // 1=Lun..7=Dom
        if (!g.dias_semana.includes(diaSemana)) continue
        const fechaStr = `${mesVista.getFullYear()}-${String(mesVista.getMonth()+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`

        // ¿Excepción?
        const exc = excGrupoMap[`${g.id}_${fechaStr}`]
        if (exc) {
          // Mostrar en nueva fecha si no está cancelada
          if (!exc.cancelada && !resultado.some(s => s.grupo_id === g.id && s.fecha === exc.nueva_fecha)) {
            resultado.push({ id: `exc_m_${exc.id}`, fecha: exc.nueva_fecha, hora: exc.nueva_hora?.slice(0,5), grupo_id: g.id, _esGrupo: true, _grupoData: g, _esVirtual: true, cliente_id: miembrosG[0].cliente_id, clientes: { nombre: (gruposMap[g.id]?.miembros||[]).map(m=>m.nombre.split(' ')[0]).join(' + ') } })
          }
          continue
        }

        // ¿Ya confirmada?
        const yaConfirmada = resultado.some(s => s.grupo_id === g.id && s.fecha === fechaStr)
        if (yaConfirmada) continue

        resultado.push({
          id: `grupo_m_${g.id}_${fechaStr}`,
          fecha: fechaStr, hora: g.hora?.slice(0,5),
          grupo_id: g.id, _esGrupo: true, _grupoData: g, _esVirtual: true,
          cliente_id: miembrosG[0].cliente_id,
          clientes: { nombre: (gruposMap[g.id]?.miembros||[]).map(m=>m.nombre.split(' ')[0]).join(' + ') }
        })
      }
    })
    return resultado
  }, [sesiones, grupos, gruposMap, excepcionesGrupo, mesVista, diasMes])

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
          const sessDia = sesionesConGrupos.filter(s => s.fecha === fechaDia)
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
  const [gruposMap, setGruposMap] = useState({})
  const [grupos, setGrupos] = useState([])
  const [excepcionesGrupo, setExcepcionesGrupo] = useState([])
  const [excepcionesInd, setExcepcionesInd] = useState([])
  const [miembrosAgenda, setMiembrosAgenda] = useState([])
  const [horasExtra, setHorasExtra] = useState([])
  const [vista, setVista] = useState(() => window.innerWidth < 768 ? 'lista' : 'timeline')
  const [modal, setModal] = useState(false)
  const [modalRecurrente, setModalRecurrente] = useState(false)
  const [editandoRecId, setEditandoRecId] = useState(null)
  const [modalExtra, setModalExtra] = useState(false)
  const [modalResumen, setModalResumen] = useState(false)
  const [modalGestionRec, setModalGestionRec] = useState(false)
  const [diaClick, setDiaClick] = useState(null)
  const [horaClick, setHoraClick] = useState('09:00')
  const [sesionDetalle, setSesionDetalle] = useState(null)
  const [editando, setEditando] = useState(false)
  const [moverForm, setMoverForm] = useState(null)
  const [entrenadorSel, setEntrenadorSel] = useState(null)
  const [editGrupoModal, setEditGrupoModal] = useState(null) // grupo a editar
  const [refreshKey, setRefreshKey] = useState(0) // entrenador seleccionado para la sesión
  const [formEdit, setFormEdit] = useState({})
  const [quickView, setQuickView] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ cliente_id:'', hora:'09:00', duracion_minutos:60, tipo:'presencial', notas:'', entrenador_id:'' })
  const [formRec, setFormRec] = useState({ cliente_id:'', hora:'09:00', duracion_minutos:60, tipo:'presencial', dias_semana:[], fecha_inicio: formatFecha(new Date()), fecha_fin:'', notas:'', entrenador_id:'' })
  const [formExtra, setFormExtra] = useState({ fecha: formatFecha(new Date()), concepto:'', horas:'1', tipo:'desplazamiento' })
  const [loading, setLoading] = useState(false)
  const [filtroEntrenador, setFiltroEntrenador] = useState('todos')
  const [mesVista, setMesVista] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const { centro, miembros, esAdmin } = useCentro() || {}
  const timelineRef = useRef()
  const uid = session.user.id
  const [pxH, setPxH] = useState(PIXELS_POR_HORA)

  useEffect(() => {
    function calcular() {
      const disponible = Math.max(window.innerHeight - 220, HORAS.length * 40)
      setPxH(Math.max(Math.floor(disponible / HORAS.length), 40))
    }
    calcular()
    window.addEventListener('resize', calcular)
    return () => window.removeEventListener('resize', calcular)
  }, [])

  // Scroll al día de hoy en vista lista
  useEffect(() => {
    if (vista === 'lista') {
      setTimeout(() => {
        const el = document.getElementById('dia-hoy')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [vista])

  const diasSemana = useMemo(() => Array.from({length:7},(_,i)=>{ const d=new Date(semanaBase); d.setDate(d.getDate()+i); return d }), [semanaBase])
  const hoy = formatFecha(new Date())
  const horaActual = new Date().getHours() + new Date().getMinutes()/60
  const inicioSemana = formatFecha(semanaBase)
  const finSemana = formatFecha(diasSemana[6])
  const inicioMes = formatFecha(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  useEffect(() => { cargar() }, [uid, semanaBase])

  // Auto-completar sesiones reales cuando pasa la hora de finalización
  useEffect(() => {
    async function autoCompletar() {
      const ahora = new Date()
      const hoy = ahora.toISOString().split('T')[0]
      const horaActual = ahora.getHours() * 60 + ahora.getMinutes()
      // Buscar sesiones de hoy no completadas cuya hora de fin ya pasó
      const sesionesHoy = sesiones.filter(s =>
        s.fecha === hoy && !s.completada && !s.cancelada && s.hora &&
        s.tipo !== 'online' // solo presenciales — las online las registra el cliente
      )
      const paraCompletar = sesionesHoy.filter(s => {
        const [h, m] = s.hora.split(':').map(Number)
        const horaFin = h * 60 + m + (s.duracion_minutos || 60)
        return horaActual >= horaFin
      })
      if (paraCompletar.length > 0) {
        await supabase.from('sesiones')
          .update({ completada: true })
          .in('id', paraCompletar.map(s => s.id))
        await cargar()
      }
    }
    autoCompletar()
    const intervalo = setInterval(autoCompletar, 60000) // cada minuto
    return () => clearInterval(intervalo)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll al inicio del día laboral al montar
  useEffect(() => {
    if (timelineRef.current && vista === 'timeline') {
      setTimeout(() => { timelineRef.current.scrollTop = 0 }, 100)
    }
  }, [vista])

  async function cargar() {
    const hace60 = formatFecha(new Date(Date.now() - 60*864e5))
    const [{ data: se }, { data: cl }, { data: he }, { data: rc }, { data: gs }, { data: excGrupo }, { data: excInd }, { data: miem }] = await Promise.all([
      centro
        ? supabase.from('sesiones').select('*, clientes(nombre,tipo)').eq('centro_id', centro.id).neq('tipo','online').gte('fecha', hace60).order('fecha').order('hora')
        : supabase.from('sesiones').select('*, clientes(nombre,tipo)').or(`entrenador_id.eq.${uid},grupo_id.not.is.null`).neq('tipo','online').gte('fecha', hace60).order('fecha').order('hora'),
      centro
        ? supabase.from('clientes').select('id,nombre,tipo,horas_semana,entrenador_id').eq('centro_id', centro.id).eq('estado','activo')
        : supabase.from('clientes').select('id,nombre,tipo,horas_semana,entrenador_id').eq('entrenador_id', uid).eq('estado','activo'),
      supabase.from('horas_extra').select('*').eq('entrenador_id', uid).gte('fecha', hace60).order('fecha', { ascending: false }),
      centro
        ? supabase.from('sesiones_recurrentes').select('*, clientes(nombre)').eq('centro_id', centro.id).eq('activa', true)
        : supabase.from('sesiones_recurrentes').select('*, clientes(nombre)').eq('activa', true),
      supabase.from('grupos').select('id,nombre,tipo,hora,duracion_minutos,dias_semana,grupo_clientes(cliente_id,activo,clientes(id,nombre))').eq('entrenador_id', uid).eq('activo', true),
      // Cargar miembros del centro directamente — no depender del timing de useCentro
      supabase.from('miembros_centro').select('user_id,nombre,rol,color,email').eq('activo', true),
      // Excepciones de grupos
      supabase.from('sesiones_excepcion').select('*').eq('entrenador_id', uid),
      // Excepciones individuales
      supabase.from('sesiones_excepcion_individual').select('*').eq('entrenador_id', uid),
    ])
    setSesiones(se || [])
    setClientes(cl || [])
    setHorasExtra(he || [])
    setRecurrentes(rc || [])
    setExcepcionesGrupo(excGrupo || [])
    setExcepcionesInd(excInd || [])
    setMiembrosAgenda(miem || [])
    // Construir mapa grupo_id → info completa
    const gm = {}
    ;(gs || []).forEach(g => {
      const miembros = (g.grupo_clientes||[]).filter(m=>m.activo).map(m=>m.clientes).filter(Boolean)
      gm[g.id] = { nombre: g.nombre, tipo: g.tipo, hora: g.hora, duracion_minutos: g.duracion_minutos, dias_semana: g.dias_semana, miembros }
    })
    setGruposMap(gm)
    setGrupos(gs || [])
    setRefreshKey(k => k + 1)
  }

  // Generar sesiones virtuales de recurrentes y grupos para la semana actual
  const sesionesConRecurrentes = useMemo(() => {
    // Sesiones sin grupo_id van directo al resultado
    const sesionesIndividuales = sesiones.filter(s => !s.grupo_id)
    const resultado = [...sesionesIndividuales]

    // Sesiones con grupo_id: agrupar por (grupo_id, fecha, hora) → una sola tarjeta
    const sesionesGrupoReal = sesiones.filter(s => s.grupo_id)
    const gruposRealesMap = {} // key: grupo_id_fecha_hora
    sesionesGrupoReal.forEach(s => {
      const key = `${s.grupo_id}_${s.fecha}_${s.hora?.slice(0,5)}`
      if (!gruposRealesMap[key]) {
        const grupoInfo = gruposMap[s.grupo_id]
        gruposRealesMap[key] = {
          ...s,
          id: `real_grupo_${key}`,
          _esGrupoReal: true,
          _grupoData: grupos.find(g => g.id === s.grupo_id),
          // Nombre: todos los miembros del grupo
          clientes: { nombre: grupoInfo?.miembros?.map(m => m.nombre.split(' ')[0]).join(' + ') || s.clientes?.nombre },
        }
      }
    })
    resultado.push(...Object.values(gruposRealesMap))

    // Mapas de excepciones para lookup rápido
    const excGrupoMap = {} // grupo_id_fecha_original → excepcion
    excepcionesGrupo.forEach(e => { excGrupoMap[`${e.grupo_id}_${e.fecha_original}`] = e })
    const excIndMap = {}   // recurrente_id_fecha_original → excepcion
    excepcionesInd.forEach(e => { excIndMap[`${e.recurrente_id}_${e.fecha_original}`] = e })

    // Fechas de sesiones reales ya confirmadas (no duplicar virtual)
    const sesionesRealesKey = new Set(
      sesiones.map(s => `${s.cliente_id}_${s.fecha}_${s.hora?.slice(0,5)}`)
    )

    // ── Sesiones recurrentes individuales ──
    recurrentes.forEach(rec => {
      diasSemana.forEach((dia, diaIdx) => {
        const diaSemana = diaIdx + 1
        const fechaDia = formatFecha(dia)
        if (!rec.dias_semana?.includes(diaSemana)) return
        if (rec.fecha_inicio && fechaDia < rec.fecha_inicio) return
        if (rec.fecha_fin && fechaDia > rec.fecha_fin) return

        // ¿Hay excepción individual para este día?
        const exc = excIndMap[`${rec.id}_${fechaDia}`]
        if (exc) {
          // Mostrar en la nueva fecha/hora si no está cancelada
          if (!exc.cancelada) {
            const key = `${rec.cliente_id}_${exc.nueva_fecha}_${exc.nueva_hora?.slice(0,5)}`
            if (!sesionesRealesKey.has(key)) {
              resultado.push({
                id: `exc_ind_${exc.id}`,
                entrenador_id: exc.entrenador_id || uid,
                cliente_id: rec.cliente_id,
                fecha: exc.nueva_fecha,
                hora: exc.nueva_hora?.slice(0,5),
                duracion_minutos: exc.duracion_minutos || rec.duracion_minutos,
                tipo: rec.tipo, completada: exc.completada,
                clientes: rec.clientes,
                _esVirtual: true, _recurrenteId: rec.id,
                _excepcionId: exc.id, _esExcepcion: true,
                _fechaOriginal: fechaDia,
              })
            }
          }
          return // No mostrar la virtual en el día original
        }

        // Sin excepción — mostrar virtual normal si no hay sesión real
        const key = `${rec.cliente_id}_${fechaDia}_${rec.hora?.slice(0,5)}`
        if (!sesionesRealesKey.has(key)) {
          resultado.push({
            id: `rec_${rec.id}_${fechaDia}`,
            entrenador_id: rec.entrenador_id || uid,
            cliente_id: rec.cliente_id,
            fecha: fechaDia, hora: rec.hora?.slice(0,5),
            duracion_minutos: rec.duracion_minutos, tipo: rec.tipo,
            completada: false, notas: rec.notas, clientes: rec.clientes,
            _esVirtual: true, _recurrenteId: rec.id,
            _fechaOriginal: fechaDia,
          })
        }
      })
    })

    // ── Grupos ──
    grupos.forEach(g => {
      const miembros = (g.grupo_clientes||[]).filter(m=>m.activo)
      if (!miembros.length || !g.hora || !g.dias_semana?.length) return

      diasSemana.forEach((dia, diaIdx) => {
        const diaSemana = diaIdx + 1
        const fechaDia = formatFecha(dia)
        if (!g.dias_semana.includes(diaSemana)) return

        // ¿Hay excepción de grupo para este día?
        const exc = excGrupoMap[`${g.id}_${fechaDia}`]
        if (exc) {
          if (!exc.cancelada) {
            // Mostrar en la nueva fecha/hora
            const yaConfirmado = sesionesGrupoReal.some(s =>
              s.grupo_id === g.id && s.fecha === exc.nueva_fecha
            )
            if (!yaConfirmado) {
              resultado.push({
                id: `exc_grupo_${exc.id}`,
                entrenador_id: exc.entrenador_id || uid,
                cliente_id: miembros[0].cliente_id,
                fecha: exc.nueva_fecha,
                hora: exc.nueva_hora?.slice(0,5),
                duracion_minutos: exc.duracion_minutos || g.duracion_minutos || 60,
                tipo: 'presencial', completada: exc.completada,
                grupo_id: g.id,
                _esVirtual: true, _esGrupo: true, _grupoData: g,
                _excepcionId: exc.id, _esExcepcion: true,
                _fechaOriginal: fechaDia,
                clientes: miembros[0].clientes,
              })
            }
          }
          return // No mostrar virtual en el día original
        }

        // Sin excepción — virtual normal si no hay sesión real del grupo ese día
        const yaConfirmado = sesionesGrupoReal.some(s =>
          s.grupo_id === g.id && s.fecha === fechaDia
        )
        if (!yaConfirmado) {
          resultado.push({
            id: `grupo_${g.id}_${fechaDia}`,
            entrenador_id: uid,
            cliente_id: miembros[0].cliente_id,
            fecha: fechaDia, hora: g.hora?.slice(0,5),
            duracion_minutos: g.duracion_minutos || 60,
            tipo: 'presencial', completada: false,
            grupo_id: g.id,
            _esVirtual: true, _esGrupo: true, _grupoData: g,
            _fechaOriginal: fechaDia,
            clientes: miembros[0].clientes,
          })
        }
      })
    })

    return resultado.sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora))
  }, [sesiones, recurrentes, grupos, excepcionesGrupo, excepcionesInd, diasSemana])

  async function guardarSesion() {
    if (!form.cliente_id) return
    setLoading(true)
    const fecha = diaClick || formatFecha(diasSemana[0])
    const { error } = await supabase.from('sesiones').insert({
      entrenador_id: form.entrenador_id || uid, cliente_id: form.cliente_id,
      centro_id: centro?.id || null,
      fecha, hora: form.hora, tipo: form.tipo,
      duracion_minutos: form.duracion_minutos,
      completada: false, notas: form.notas
    })
    if (error) setToast({ msg: 'Error al guardar', tipo: 'error' })
    else setToast({ msg: 'Sesión añadida' })
    setModal(false)
    setForm({ cliente_id:'', hora:'09:00', duracion_minutos:60, tipo:'presencial', notas:'', entrenador_id:'' })
    await cargar()
    setLoading(false)
  }

  async function guardarRecurrente() {
    if (!formRec.cliente_id || !formRec.dias_semana.length) return
    setLoading(true)
    const payload = {
      entrenador_id: formRec.entrenador_id || uid, cliente_id: formRec.cliente_id,
      centro_id: centro?.id || null,
      hora: formRec.hora, duracion_minutos: formRec.duracion_minutos,
      tipo: formRec.tipo, dias_semana: formRec.dias_semana,
      fecha_inicio: formRec.fecha_inicio, fecha_fin: formRec.fecha_fin || null,
      notas: formRec.notas
    }
    const { error } = editandoRecId
      ? await supabase.from('sesiones_recurrentes').update(payload).eq('id', editandoRecId)
      : await supabase.from('sesiones_recurrentes').insert({ ...payload, activa: true })
    if (error) setToast({ msg: 'Error', tipo: 'error' })
    else setToast({ msg: editandoRecId ? 'Regla actualizada' : 'Sesión recurrente creada' })
    setModalRecurrente(false)
    setEditandoRecId(null)
    setFormRec({ cliente_id:'', hora:'09:00', duracion_minutos:60, tipo:'presencial', dias_semana:[], fecha_inicio: formatFecha(new Date()), fecha_fin:'', notas:'', entrenador_id:'' })
    await cargar()
    setLoading(false)
  }

  function editarRecurrente(r) {
    setFormRec({
      cliente_id: r.cliente_id, hora: r.hora, duracion_minutos: r.duracion_minutos,
      tipo: r.tipo, dias_semana: r.dias_semana, fecha_inicio: r.fecha_inicio,
      fecha_fin: r.fecha_fin || '', notas: r.notas || '', entrenador_id: r.entrenador_id || ''
    })
    setEditandoRecId(r.id)
    setModalGestionRec(false)
    setModalRecurrente(true)
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
    const entrenadorId = entrenadorSel || sesion.entrenador_id || uid
    const esGrupo = sesion._esGrupo && sesion._grupoData
    const clienteIds = esGrupo
      ? (sesion._grupoData.grupo_clientes||[]).filter(m=>m.activo).map(m=>m.cliente_id)
      : [sesion.cliente_id]

    // 1. Crear sesiones reales confirmadas en la tabla sesiones
    const rows = clienteIds.map(cid => ({
      entrenador_id: entrenadorId, cliente_id: cid,
      centro_id: centro?.id || null,
      fecha: sesion.fecha, hora: sesion.hora,
      tipo: 'presencial', duracion_minutos: sesion.duracion_minutos,
      completada: true,
      grupo_id: esGrupo ? sesion._grupoData.id : null,
      es_recurrente: true,
    }))
    await supabase.from('sesiones').insert(rows)

    // 2. Si venía de una excepción, eliminarla (ya está confirmada como sesión real)
    if (sesion._excepcionId) {
      if (esGrupo) {
        await supabase.from('sesiones_excepcion').delete().eq('id', sesion._excepcionId)
      } else {
        await supabase.from('sesiones_excepcion_individual').delete().eq('id', sesion._excepcionId)
      }
    }

    setToast({ msg: clienteIds.length > 1 ? `✓ Sesión completada para ${clienteIds.length} miembros` : 'Sesión confirmada ✓' })
    setSesionDetalle(null); setMoverForm(null); setEntrenadorSel(null); await cargar()
  }

  async function moverSesionVirtual(sesion, nuevaFecha, nuevaHora) {
    const entrenadorId = entrenadorSel || sesion.entrenador_id || uid
    const esGrupo = sesion._esGrupo && sesion._grupoData
    const fechaOriginal = sesion._fechaOriginal || sesion.fecha

    if (esGrupo) {
      // Upsert en sesiones_excepcion con UNIQUE(grupo_id, fecha_original)
      await supabase.from('sesiones_excepcion').upsert({
        grupo_id: sesion._grupoData.id,
        entrenador_id: entrenadorId,
        fecha_original: fechaOriginal,
        nueva_fecha: nuevaFecha,
        nueva_hora: nuevaHora,
        duracion_minutos: sesion.duracion_minutos || 60,
        completada: false,
      }, { onConflict: 'grupo_id,fecha_original' })
    } else {
      // Upsert en sesiones_excepcion_individual con UNIQUE(recurrente_id, fecha_original)
      await supabase.from('sesiones_excepcion_individual').upsert({
        recurrente_id: sesion._recurrenteId,
        entrenador_id: entrenadorId,
        fecha_original: fechaOriginal,
        nueva_fecha: nuevaFecha,
        nueva_hora: nuevaHora,
        duracion_minutos: sesion.duracion_minutos,
        completada: false,
      }, { onConflict: 'recurrente_id,fecha_original' })
    }

    const label = new Date(nuevaFecha+'T12:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})
    setToast({ msg: `Sesión movida al ${label} a las ${nuevaHora}` })
    setSesionDetalle(null); setMoverForm(null); setEntrenadorSel(null); await cargar()
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
    setFormExtra({ fecha: formatFecha(new Date()), concepto:'', horas:'1', tipo:'desplazamiento' })
    await cargar()
    setLoading(false)
  }

  const sesionesFiltradas = useMemo(() =>
    filtroEntrenador === 'todos' ? sesionesConRecurrentes : sesionesConRecurrentes.filter(s => s.entrenador_id === filtroEntrenador)
  , [sesionesConRecurrentes, filtroEntrenador])

  // Stats de horas
  const sesionesSemana = sesionesFiltradas.filter(s => s.fecha >= inicioSemana && s.fecha <= finSemana)
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
      <div className="bg-white border-b border-black/5 px-4 py-2 flex items-center gap-3 flex-shrink-0">
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
          <div className="flex items-center gap-2 flex-wrap">
            {/* Leyenda colores entrenadores */}
            {miembros.map(m => (
              <button key={m.id}
                onClick={() => setFiltroEntrenador(filtroEntrenador === m.user_id ? 'todos' : m.user_id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all border ${filtroEntrenador === m.user_id ? 'border-current shadow-sm' : 'border-transparent bg-black/5 opacity-70 hover:opacity-100'}`}
                style={{ color: m.color || '#FF5C00', background: filtroEntrenador === m.user_id ? `${m.color || '#FF5C00'}15` : '' }}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color || '#FF5C00' }} />
                {(m.nombre || m.email?.split('@')[0])?.split(' ')[0]}
              </button>
            ))}
            {filtroEntrenador !== 'todos' && (
              <button onClick={() => setFiltroEntrenador('todos')} className="text-xs text-[#6B6B6B] px-2 py-1 rounded-lg bg-black/5 hover:bg-black/10">
                Ver todos
              </button>
            )}
          </div>
        )}
        <button onClick={() => setSemanaBase(getLunes(new Date()))}
          className="px-2 py-1 text-xs border border-black/10 rounded-lg text-[#6B6B6B] hover:bg-[#F5F5F0]">Hoy</button>
        <div className="flex gap-1 bg-black/5 p-0.5 rounded-lg">
          {[['lista','☰'],['timeline','⏱'],['mes','📅']].map(([v,ic]) => (
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
          <button onClick={() => { setEditandoRecId(null); setModalRecurrente(true) }}
            className="border border-[#FF5C00]/30 text-[#FF5C00] text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#FF5C00]/5">↻ Nueva regla</button>
        </div>
        <button onClick={() => { setDiaClick(hoy); setModal(true) }}
          className="bg-[#FF5C00] text-white text-xs font-semibold px-3 py-1.5 rounded-lg">+ Sesión</button>
      </div>

      {/* VISTA MENSUAL */}
      {vista === 'mes' && (
        <VistaMensual
          mesVista={mesVista} setMesVista={setMesVista}
          sesiones={sesionesFiltradas} hoy={hoy}
          abrirModalEnDia={abrirModalEnDia} setSesionDetalle={setSesionDetalle}
          miembros={miembros} clienteColor={clienteColor}
          grupos={grupos} gruposMap={gruposMap}
          excepcionesGrupo={excepcionesGrupo}
        />
      )}

      {/* VISTA LISTA — ideal para móvil */}
      {vista === 'lista' && (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
          {diasSemana.map((dia, i) => {
            const fechaDia = formatFecha(dia)
            const esHoy = fechaDia === hoy
            const sesionesDia = sesionesFiltradas
              .filter(s => s.fecha === fechaDia)
              .sort((a,b) => (a.hora||'').localeCompare(b.hora||''))
            const totalMin = sesionesDia.reduce((s, ses) => s + (ses.duracion_minutos || 60), 0)
            return (
              <div key={i} id={esHoy ? 'dia-hoy' : undefined}>
                {/* Cabecera del día */}
                <div className={`flex items-center justify-between mb-2 px-1`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${esHoy ? 'text-white' : 'bg-[#F5F5F0] text-[#6B6B6B]'}`}
                      style={esHoy ? {background:'var(--acento,#FF5C00)'} : {}}>
                      {dia.getDate()}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${esHoy ? 'text-[#FF5C00]' : 'text-[#0A0A0A]'}`}>
                        {DIAS_LABEL[i]}{esHoy ? ' — Hoy' : ''}
                      </p>
                      {sesionesDia.length > 0 && (
                        <p className="text-xs text-[#9B9B9B]">{sesionesDia.length} sesión{sesionesDia.length > 1 ? 'es' : ''} · {totalMin}min</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => abrirModalEnDia(dia, '09:00')}
                    className="w-8 h-8 flex items-center justify-center border border-black/10 rounded-xl text-[#6B6B6B] hover:bg-[#F5F5F0] text-lg font-light">
                    +
                  </button>
                </div>

                {/* Sesiones */}
                {sesionesDia.length === 0 ? (
                  <div className="bg-white border border-dashed border-black/10 rounded-xl px-4 py-3 ml-11">
                    <p className="text-xs text-[#C0C0C0]">Sin sesiones</p>
                  </div>
                ) : (
                  <div className="space-y-2 ml-11">
                    {sesionesDia.map((s, si) => {
                      const color = miembros?.find(m => m.user_id === s.entrenador_id)?.color || clienteColor(s.cliente_id)
                      const completada = s.completada
                      const cancelada = s.cancelada
                      return (
                        <div key={si} onClick={() => setSesionDetalle(s)}
                          className={`bg-white border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all ${completada ? 'border-emerald-100' : cancelada ? 'border-red-100 opacity-60' : 'border-black/6 hover:shadow-sm'}`}>
                          <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{background: color}} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                              {s.grupo_id && gruposMap[s.grupo_id]
                                ? gruposMap[s.grupo_id].miembros.map(m=>m.nombre.split(' ')[0]).join(' + ')
                                : s.clientes?.nombre || 'Cliente'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-[#6B6B6B]">{s.hora} · {s.duracion_minutos || 60}min</p>
                              {s.tipo && s.tipo !== 'presencial' && (
                                <span className="text-xs bg-[#6366f1]/10 text-[#6366f1] px-1.5 py-0.5 rounded-md font-medium">{s.tipo}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {completada
                              ? <span className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">✓</span>
                              : cancelada
                              ? <span className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center text-sm">✕</span>
                              : <span className="text-xs font-bold text-[#6B6B6B] bg-[#F5F5F0] px-2 py-1 rounded-lg">{s.hora}</span>
                            }
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {/* VISTA TIMELINE */}
      {vista === 'timeline' && (<>
        {/* Cabecera días */}
        <div className="bg-white border-b border-black/5 flex flex-shrink-0">
          <div className="w-12 flex-shrink-0" /> {/* espacio horas */}
          {diasSemana.map((dia, i) => {
            const esHoy = formatFecha(dia) === hoy
            const nSes = sesionesFiltradas.filter(s => s.fecha === formatFecha(dia)).length
            return (
              <div key={i} className={`flex-1 text-center py-1.5 border-l border-black/5 cursor-pointer hover:bg-[#F5F5F0] transition-all ${esHoy ? 'bg-[#FF5C00]/8 border-b-2 border-b-[#FF5C00]' : ''}`}
                onClick={() => abrirModalEnDia(dia, '09:00')}>
                <p className={`text-xs font-bold ${esHoy ? 'text-[#FF5C00]' : 'text-[#6B6B6B]'}`}>{DIAS_LABEL[i]}</p>
                <p className={`text-sm font-bold leading-tight ${esHoy ? 'text-[#FF5C00]' : 'text-[#0A0A0A]'}`}>
                  {esHoy ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FF5C00] text-white text-xs">{dia.getDate()}</span> : dia.getDate()}
                </p>
                {nSes > 0 && <div className={`w-1 h-1 rounded-full mx-auto mt-0.5 ${esHoy ? 'bg-[#FF5C00]' : 'bg-black/30'}`} />}
              </div>
            )
          })}
        </div>

        {/* Grid timeline - sin scroll en escritorio, scroll solo si no cabe */}
        <div ref={timelineRef} className="overflow-y-auto overflow-x-hidden relative flex-1"
          style={{ height: 'calc(100vh - 220px)' }}>
          <div className="flex" style={{ height: HORAS.length * pxH }}>
            {/* Columna horas */}
            <div className="w-12 flex-shrink-0 relative">
              {HORAS.map(h => (
                <div key={h} className="absolute flex items-start justify-end pr-2 w-full"
                  style={{ top: (h - HORA_INICIO) * pxH, height: pxH }}>
                  <span className="text-xs text-[#6B6B6B] -mt-2">{h}:00</span>
                </div>
              ))}
            </div>

            {/* Columnas días */}
            {diasSemana.map((dia, diaIdx) => {
              const fechaDia = formatFecha(dia)
              const esHoy = fechaDia === hoy
              const sesionesDia = sesionesFiltradas.filter(s => s.fecha === fechaDia)
                .sort((a,b) => (a.hora||'00:00').localeCompare(b.hora||'00:00'))

              return (
                <div key={diaIdx} className={`flex-1 border-l border-black/5 relative ${esHoy ? 'bg-[#FF5C00]/5' : ''}`}
                  style={{ height: HORAS.length * pxH }}>
                  {/* Líneas de hora */}
                  {HORAS.map(h => (
                    <div key={h} className="absolute w-full border-t border-black/5 cursor-pointer hover:bg-black/3 transition-colors"
                      style={{ top: (h - HORA_INICIO) * pxH, height: pxH }}
                      onClick={() => abrirModalEnDia(dia, `${String(h).padStart(2,'0')}:00`)} />
                  ))}

                  {/* Línea hora actual */}
                  {esHoy && horaActual >= HORA_INICIO && horaActual <= HORA_INICIO + HORAS.length && (
                    <div className="absolute w-full z-20 pointer-events-none"
                      style={{ top: (horaActual - HORA_INICIO) * pxH }}>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
                        <div className="flex-1 h-px bg-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Sesiones — algoritmo Apple Calendar */}
                  {(() => {
                    // Algoritmo: agrupar sesiones que se solapan, distribuir ancho dentro del grupo
                    const sesOrdenadas = [...sesionesDia].map(s => ({
                      ...s,
                      _ini: horaAMin(s.hora || '09:00'),
                      _fin: horaAMin(s.hora || '09:00') + (s.duracion_minutos || 60)
                    })).sort((a,b) => a._ini - b._ini)

                    // Agrupar por solapamiento
                    const grupos = [] // cada grupo es un array de sesiones que se solapan entre sí
                    for (const s of sesOrdenadas) {
                      let añadida = false
                      for (const g of grupos) {
                        // Se solapa con alguna del grupo?
                        if (g.some(gs => s._ini < gs._fin && s._fin > gs._ini)) {
                          g.push(s); añadida = true; break
                        }
                      }
                      if (!añadida) grupos.push([s])
                    }

                    // Para cada grupo, asignar columna greedy
                    const sesMap = new Map()
                    for (const grupo of grupos) {
                      const cols = [] // cols[i] = fin de la última sesión en esa columna
                      for (const s of grupo) {
                        let col = cols.findIndex(fin => s._ini >= fin)
                        if (col === -1) { col = cols.length; cols.push(0) }
                        cols[col] = s._fin
                        sesMap.set(s.id || s._key || s._ini + '_' + s.cliente_id, { col, totalCols: 0 })
                      }
                      // Actualizar totalCols para todo el grupo
                      const total = cols.length
                      for (const s of grupo) {
                        const entry = sesMap.get(s.id || s._key || s._ini + '_' + s.cliente_id)
                        if (entry) entry.totalCols = total
                      }
                    }

                    return sesionesDia.map((s, idx) => {
                      const horaMin = horaAMin(s.hora || '09:00')
                      const top = (horaMin / 60 - HORA_INICIO) * pxH
                      const durMin = s.duracion_minutos || 60
                      const height = Math.max((durMin / 60) * pxH - 4, 24)
                      const entrenadorMiembro = miembros?.find(m => m.user_id === s.entrenador_id)
                      const color = entrenadorMiembro ? (entrenadorMiembro.color || clienteColor(s.cliente_id)) : clienteColor(s.cliente_id)
                      const esVirtual = s._esVirtual
                      const _key = s.id || s._key || (horaAMin(s.hora||'09:00') + '_' + s.cliente_id)
                      const { col = 0, totalCols: nc = 1 } = sesMap.get(_key) || {}
                      const ancho = 100 / nc
                      const left = ancho * col

                      const entNombre = entrenadorMiembro?.nombre || entrenadorMiembro?.email?.split('@')[0] || ''
                      const entIni = entNombre.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
                      const grupo = s.grupo_id ? gruposMap[s.grupo_id] : null
                      const nombreCliente = grupo
                        ? grupo.miembros.map(m=>m.nombre.split(' ')[0]).join(' + ')
                        : s.clientes?.nombre?.split(' ')[0] || '—'
                      const colorSesion = grupo ? clienteColor(s.cliente_id) : col
                      
                      return (
                        <div key={s.id || idx}
                          onClick={e => { e.stopPropagation(); setSesionDetalle(s) }}
                          className={`absolute cursor-pointer z-10 transition-all hover:shadow-md hover:scale-[1.01] ${s.completada ? 'opacity-55' : ''}`}
                          style={{
                            top: top + 2,
                            height,
                            left: `calc(${left}% + 2px)`,
                            width: `calc(${ancho}% - 4px)`,
                            overflow: 'hidden',
                            borderRadius: '8px',
                          }}>
                          {/* Fondo con borde izquierdo de color */}
                          <div className="absolute inset-0 rounded-lg"
                            style={{ background: esVirtual ? 'white' : `${color}18`, border: `1.5px solid ${color}`, borderLeft: `3px solid ${color}` }} />
                          <div className="relative px-1.5 py-1 h-full flex flex-col justify-between">
                            <div className="flex items-start gap-1 min-w-0">
                              {nc > 1 && height > 36 && (
                                <div className="w-4 h-4 rounded flex items-center justify-center text-white flex-shrink-0 mt-0.5"
                                  style={{ background: color, fontSize: '8px', fontWeight: 700 }}>
                                  {entIni || '?'}
                                </div>
                              )}
                              <p className="text-xs font-bold truncate leading-tight" style={{ color }}>
                                {nombreCliente}
                              </p>
                            </div>
                            {height > 32 && (
                              <div className="flex items-center justify-between">
                                <p className="text-xs truncate" style={{ color: `${color}99` }}>
                                  {s.hora}
                                </p>
                                {s.completada && (
                                  <div className="w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white" style={{ fontSize: '7px' }}>✓</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      </>)}

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
                  {new Date(sesionDetalle.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
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
                <div className="bg-[#6366f1]/8 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#6366f1] font-medium">
                        {sesionDetalle._esGrupo ? `👥 ${sesionDetalle._grupoData?.nombre}` : '↻ Sesión recurrente programada'}
                      </p>
                      <p className="text-xs text-[#6366f1]/60 mt-0.5">La regla semanal no cambia — solo esta ocurrencia</p>
                    </div>
                    {sesionDetalle._esGrupo && sesionDetalle._grupoData && (
                      <button onClick={() => setEditGrupoModal(sesionDetalle._grupoData)}
                        className="text-xs border border-[#6366f1]/30 text-[#6366f1] px-2.5 py-1.5 rounded-lg hover:bg-[#6366f1]/10 flex-shrink-0 ml-2">
                        ✏️ Editar grupo
                      </button>
                    )}
                  </div>
                </div>

                {/* Selector de entrenador */}
                {miembrosAgenda.length > 1 ? (
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Entrenador que imparte</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {miembrosAgenda.map(m => {
                        const seleccionado = (entrenadorSel || sesionDetalle.entrenador_id) === m.user_id
                        return (
                          <button key={m.user_id} type="button"
                            onClick={e => { e.stopPropagation(); setEntrenadorSel(m.user_id) }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${seleccionado ? 'text-white border-transparent' : 'border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}
                            style={seleccionado ? {background: m.color || '#FF5C00'} : {}}>
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{background: m.color || '#FF5C00'}}/>
                            {m.nombre?.split(' ')[0] || m.email?.split('@')[0]}
                            {seleccionado && <span className="ml-0.5">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Formulario mover */}
                {moverForm ? (
                  <div className="bg-[#F5F5F0] rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-[#0A0A0A]">Mover esta sesión a:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-[#6B6B6B] mb-1 block">Día</label>
                        <input type="date" value={moverForm.fecha}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={e => setMoverForm(f => ({...f, fecha: e.target.value}))}
                          className="w-full border border-black/10 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#FF5C00]"/>
                      </div>
                      <div>
                        <label className="text-xs text-[#6B6B6B] mb-1 block">Hora</label>
                        <input type="time" value={moverForm.hora}
                          onChange={e => setMoverForm(f => ({...f, hora: e.target.value}))}
                          className="w-full border border-black/10 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#FF5C00]"/>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setMoverForm(null)}
                        className="flex-1 border border-black/10 text-[#6B6B6B] text-xs py-2 rounded-xl">
                        Cancelar
                      </button>
                      <button onClick={() => moverSesionVirtual(sesionDetalle, moverForm.fecha, moverForm.hora)}
                        disabled={!moverForm.fecha || !moverForm.hora}
                        className="flex-1 bg-[#FF5C00] text-white text-xs font-semibold py-2 rounded-xl disabled:opacity-40">
                        Confirmar cambio
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setMoverForm({ fecha: sesionDetalle.fecha, hora: sesionDetalle.hora })}
                    className="w-full border border-[#FF5C00]/30 text-[#FF5C00] text-sm font-semibold py-2.5 rounded-xl hover:bg-[#FF5C00]/5">
                    📅 Mover esta sesión
                  </button>
                )}

                <button onClick={() => confirmarSesionVirtual(sesionDetalle)}
                  className="w-full bg-emerald-500 text-white text-sm font-semibold py-2.5 rounded-xl">
                  ✓ Confirmar como completada
                </button>
                <button onClick={() => { setSesionDetalle(null); setMoverForm(null); setEntrenadorSel(null) }}
                  className="w-full border border-black/10 text-[#6B6B6B] text-sm py-2.5 rounded-xl">
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Selector entrenador en sesiones reales */}
                {miembrosAgenda.length > 1 && (
                  <div className="pb-1">
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Entrenador</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {miembrosAgenda.map(m => {
                        const seleccionado = (entrenadorSel || sesionDetalle.entrenador_id) === m.user_id
                        return (
                          <button key={m.user_id} type="button"
                            onClick={async e => {
                              e.stopPropagation()
                              setEntrenadorSel(m.user_id)
                              await supabase.from('sesiones').update({ entrenador_id: m.user_id }).eq('id', sesionDetalle.id)
                              await cargar()
                              setToast({ msg: `Entrenador cambiado a ${m.nombre?.split(' ')[0]}` })
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${seleccionado ? 'text-white border-transparent' : 'border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}
                            style={seleccionado ? {background: m.color || '#FF5C00'} : {}}>
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{background: m.color || '#FF5C00'}}/>
                            {m.nombre?.split(' ')[0] || m.email?.split('@')[0]}
                            {seleccionado && <span>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => toggleCompletada(sesionDetalle.id, sesionDetalle.completada)}
                    className={`flex-1 text-sm font-semibold py-2.5 rounded-xl ${sesionDetalle.completada ? 'bg-[#F5F5F0] text-[#6B6B6B]' : 'bg-emerald-500 text-white'}`}>
                    {sesionDetalle.completada ? 'Marcar pendiente' : '✓ Completada'}
                  </button>
                  <button onClick={() => eliminarSesion(sesionDetalle.id)}
                    className="border border-red-200 text-red-500 text-sm px-3 py-2.5 rounded-xl hover:bg-red-50">🗑</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal nueva sesión */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[#0A0A0A] mb-4">
              Nueva sesión — {diaClick ? new Date(diaClick+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'}) : ''}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente *</label>
                <select value={form.cliente_id} onChange={e => {
                    const cli = clientes.find(c => c.id === e.target.value)
                    setForm(f => ({ ...f, cliente_id: e.target.value, entrenador_id: f.entrenador_id || cli?.entrenador_id || '' }))
                  }}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {centro && miembros?.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Asignar a</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {miembros.map(m => (
                      <button key={m.id} type="button" onClick={() => setForm(f => ({ ...f, entrenador_id: m.user_id }))}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        style={{
                          color: (form.entrenador_id || uid) === m.user_id ? 'white' : (m.color || '#FF5C00'),
                          background: (form.entrenador_id || uid) === m.user_id ? (m.color || '#FF5C00') : `${m.color || '#FF5C00'}10`,
                          borderColor: (form.entrenador_id || uid) === m.user_id ? (m.color || '#FF5C00') : 'transparent'
                        }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: (form.entrenador_id || uid) === m.user_id ? 'white' : (m.color || '#FF5C00') }} />
                        {(m.nombre || m.email?.split('@')[0])?.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => { setModalRecurrente(false); setEditandoRecId(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[#0A0A0A] mb-1">{editandoRecId ? 'Editar regla' : 'Nueva sesión recurrente'}</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">Se repite automáticamente cada semana los días que selecciones</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente *</label>
                <select value={formRec.cliente_id} onChange={e => {
                    const cli = clientes.find(c => c.id === e.target.value)
                    setFormRec(f => ({ ...f, cliente_id: e.target.value, entrenador_id: f.entrenador_id || cli?.entrenador_id || '' }))
                  }}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {centro && miembros?.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Asignar a</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {miembros.map(m => (
                      <button key={m.id} type="button" onClick={() => setFormRec(f => ({ ...f, entrenador_id: m.user_id }))}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        style={{
                          color: (formRec.entrenador_id || uid) === m.user_id ? 'white' : (m.color || '#FF5C00'),
                          background: (formRec.entrenador_id || uid) === m.user_id ? (m.color || '#FF5C00') : `${m.color || '#FF5C00'}10`,
                          borderColor: (formRec.entrenador_id || uid) === m.user_id ? (m.color || '#FF5C00') : 'transparent'
                        }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: (formRec.entrenador_id || uid) === m.user_id ? 'white' : (m.color || '#FF5C00') }} />
                        {(m.nombre || m.email?.split('@')[0])?.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
              <button onClick={() => { setModalRecurrente(false); setEditandoRecId(null) }} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={guardarRecurrente} disabled={!formRec.cliente_id || !formRec.dias_semana.length || loading}
                className="flex-1 bg-[#6366f1] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {loading ? 'Guardando...' : editandoRecId ? '✓ Guardar cambios' : '↻ Crear regla'}
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
                const miem = miembros?.find(m => m.user_id === r.entrenador_id)
                return (
                  <div key={r.id} className={`border rounded-xl p-3.5 ${r.activa ? 'border-[#6366f1]/20 bg-[#6366f1]/3' : 'border-black/5 bg-[#F5F5F0]'}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A0A0A]">{r.clientes?.nombre}</p>
                        <p className="text-xs text-[#6B6B6B]">
                          {r.dias_semana.map(d=>diasLabel[d]).join('/')} · {r.hora} · {r.duracion_minutos}min
                        </p>
                        <p className="text-xs text-[#6B6B6B]">Desde {new Date(r.fecha_inicio+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}{r.fecha_fin ? ` hasta ${new Date(r.fecha_fin+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}` : ''}</p>
                        {miem && (
                          <p className="text-xs font-medium mt-1 flex items-center gap-1.5" style={{color: miem.color || '#FF5C00'}}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background: miem.color || '#FF5C00'}} />
                            {(miem.nombre || miem.email?.split('@')[0])?.split(' ')[0]}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${r.activa?'bg-emerald-50 text-emerald-700':'bg-gray-100 text-gray-500'}`}>
                        {r.activa ? 'Activa' : 'Pausada'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editarRecurrente(r)}
                        className="border border-black/10 text-xs px-3 py-1.5 rounded-lg text-[#6B6B6B] hover:bg-black/5">✏️ Editar</button>
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

      {/* Modal editar grupo desde agenda */}
      {editGrupoModal && (
        <EditarGrupoModal
          grupo={editGrupoModal}
          onClose={() => setEditGrupoModal(null)}
          onGuardado={() => { setEditGrupoModal(null); setSesionDetalle(null); cargar() }}
        />
      )}
    </div>
  )
}

// ─── Modal editar grupo desde la Agenda ──────────────────────────────────────
const DIAS_SEMANA = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function EditarGrupoModal({ grupo, onClose, onGuardado }) {
  const [form, setForm] = useState({
    nombre: grupo.nombre || '',
    hora: grupo.hora?.slice(0,5) || '09:00',
    duracion_minutos: grupo.duracion_minutos || 60,
    dias_semana: grupo.dias_semana || [],
  })
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    await supabase.from('grupos').update({
      nombre: form.nombre.trim(),
      hora: form.hora,
      duracion_minutos: Number(form.duracion_minutos),
      dias_semana: form.dias_semana,
    }).eq('id', grupo.id)
    setGuardando(false)
    onGuardado()
  }

  function toggleDia(d) {
    setForm(f => ({
      ...f,
      dias_semana: f.dias_semana.includes(d)
        ? f.dias_semana.filter(x => x !== d)
        : [...f.dias_semana, d].sort()
    }))
  }

  const miembros = (grupo.grupo_clientes||[]).filter(m=>m.activo)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#0A0A0A]">Editar grupo</h3>
          <button onClick={onClose} className="text-[#9B9B9B] hover:text-[#0A0A0A] text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Nombre</label>
            <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
          </div>

          {/* Días */}
          <div>
            <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Días de entrenamiento</label>
            <div className="grid grid-cols-7 gap-1">
              {[1,2,3,4,5,6,7].map(d => {
                const sel = form.dias_semana.includes(d)
                return (
                  <button key={d} type="button" onClick={() => toggleDia(d)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${sel ? 'text-white' : 'border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}
                    style={sel ? {background:'#0A0A0A'} : {}}>
                    {DIAS_SEMANA[d]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hora y duración */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Hora</label>
              <input type="time" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})}
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Duración (min)</label>
              <input type="number" value={form.duracion_minutos} onChange={e => setForm({...form, duracion_minutos: e.target.value})}
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
            </div>
          </div>

          {/* Miembros (solo lectura) */}
          {miembros.length > 0 && (
            <div className="bg-[#F7F6F3] rounded-xl p-3">
              <p className="text-xs font-semibold text-[#9B9B9B] mb-2">Miembros</p>
              <div className="flex gap-2 flex-wrap">
                {miembros.map(m => (
                  <span key={m.cliente_id} className="text-xs bg-white border border-black/8 px-2.5 py-1 rounded-lg text-[#0A0A0A] font-medium">
                    {m.clientes?.nombre?.split(' ')[0]}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[#9B9B9B] mt-2">Para añadir o quitar miembros ve a Clientes → Grupos</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-black/10 text-[#6B6B6B] text-sm font-medium py-2.5 rounded-xl hover:bg-[#F5F5F0]">
              Cancelar
            </button>
            <button onClick={guardar} disabled={!form.nombre.trim() || form.dias_semana.length === 0 || guardando}
              className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40 hover:bg-[#e05200] transition-all">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
