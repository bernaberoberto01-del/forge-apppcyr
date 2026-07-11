import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const TIPOS_EXTRA = [
  { id: 'desplazamiento', label: 'Desplazamiento', icon: '🚗' },
  { id: 'reunion', label: 'Reunión', icon: '🤝' },
  { id: 'preparacion', label: 'Preparación de programas', icon: '📋' },
  { id: 'admin', label: 'Gestión administrativa', icon: '💻' },
  { id: 'formacion', label: 'Formación', icon: '📚' },
  { id: 'otro', label: 'Otro', icon: '⏱' },
]

function getLunes(fecha) {
  const d = new Date(fecha)
  const dia = d.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  d.setHours(0,0,0,0)
  return d
}
function formatFecha(f) { return f.toISOString().split('T')[0] }
function formatH(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function Toast({ msg, tipo='ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 ${tipo==='error'?'bg-red-600':'bg-[#111]'}`}>
      <span>{tipo==='error'?'⚠':'✓'}</span> {msg}
    </div>
  )
}

export default function Agenda({ session }) {
  const [semanaBase, setSemanaBase] = useState(() => getLunes(new Date()))
  const [sesiones, setSesiones] = useState([])
  const [clientes, setClientes] = useState([])
  const [horasExtra, setHorasExtra] = useState([])
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
  const [modal, setModal] = useState(false)
  const [modalExtra, setModalExtra] = useState(false)
  const [modalResumen, setModalResumen] = useState(false)
  const [form, setForm] = useState({ cliente_id:'', hora:'09:00', tipo:'presencial', notas:'' })
  const [formExtra, setFormExtra] = useState({ fecha: new Date().toISOString().split('T')[0], concepto:'', horas:'', tipo:'desplazamiento' })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [vistaTab, setVistaTab] = useState('semana') // semana | mes
  const uid = session.user.id

  const diasSemana = useMemo(() => Array.from({length:7},(_,i)=>{ const d=new Date(semanaBase); d.setDate(d.getDate()+i); return d }), [semanaBase])
  const inicioMes = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0] }, [])
  const inicioSemana = formatFecha(semanaBase)
  const finSemana = formatFecha(diasSemana[6])

  useEffect(() => { cargar() }, [uid, semanaBase])

  async function cargar() {
    const hace60 = new Date(Date.now() - 60*864e5).toISOString().split('T')[0]
    const [{ data: se }, { data: cl }, { data: he }] = await Promise.all([
      supabase.from('sesiones').select('*, clientes(nombre,tipo)').eq('entrenador_id', uid).gte('fecha', hace60).order('fecha').order('hora'),
      supabase.from('clientes').select('id,nombre,tipo,horas_semana').eq('entrenador_id', uid).eq('estado','activo'),
      supabase.from('horas_extra').select('*').eq('entrenador_id', uid).gte('fecha', hace60).order('fecha', { ascending: false }),
    ])
    setSesiones(se || [])
    setClientes(cl || [])
    setHorasExtra(he || [])
  }

  async function guardar() {
    if (!form.cliente_id) return
    setLoading(true)
    const fecha = formatFecha(diasSemana[diaSeleccionado])
    const { error } = await supabase.from('sesiones').insert({
      entrenador_id: uid, cliente_id: form.cliente_id,
      fecha, hora: form.hora, tipo: form.tipo, completada: false, notas: form.notas
    })
    if (error) setToast({ msg: 'Error al guardar', tipo: 'error' })
    else setToast({ msg: 'Sesión añadida a la agenda' })
    setModal(false)
    setForm({ cliente_id:'', hora:'09:00', tipo:'presencial', notas:'' })
    await cargar()
    setLoading(false)
  }

  async function guardarExtra() {
    if (!formExtra.concepto || !formExtra.horas) return
    setLoading(true)
    const { error } = await supabase.from('horas_extra').insert({
      entrenador_id: uid, ...formExtra, horas: Number(formExtra.horas)
    })
    if (error) setToast({ msg: 'Error al guardar', tipo: 'error' })
    else setToast({ msg: 'Horas extra registradas' })
    setModalExtra(false)
    setFormExtra({ fecha: new Date().toISOString().split('T')[0], concepto:'', horas:'', tipo:'desplazamiento' })
    await cargar()
    setLoading(false)
  }

  async function marcarCompletada(id, completada) {
    await supabase.from('sesiones').update({ completada: !completada }).eq('id', id)
    await cargar()
  }

  async function eliminarSesion(id) {
    if (!confirm('¿Eliminar esta sesión?')) return
    await supabase.from('sesiones').delete().eq('id', id)
    await cargar()
  }

  async function eliminarExtra(id) {
    await supabase.from('horas_extra').delete().eq('id', id)
    setToast({ msg: 'Eliminado' })
    await cargar()
  }

  const sesionesDia = d => sesiones.filter(s => s.fecha === formatFecha(d))
  const sesionesSemana = sesiones.filter(s => s.fecha >= inicioSemana && s.fecha <= finSemana)
  const sesionesCompletadasSemana = sesionesSemana.filter(s => s.completada)
  const sesionesMes = sesiones.filter(s => s.fecha >= inicioMes)
  const sesionesCompletadasMes = sesionesMes.filter(s => s.completada)

  // Calcular horas automáticas desde sesiones (usando duracion_minutos o 60 min por defecto)
  const horasAutoSemana = sesionesCompletadasSemana.reduce((s,x) => s + (x.duracion_minutos || 60), 0)
  const horasAutoMes = sesionesCompletadasMes.reduce((s,x) => s + (x.duracion_minutos || 60), 0)

  // Horas extra del período
  const extraSemana = horasExtra.filter(h => h.fecha >= inicioSemana && h.fecha <= finSemana).reduce((s,x) => s + Number(x.horas), 0)
  const extraMes = horasExtra.filter(h => h.fecha >= inicioMes).reduce((s,x) => s + Number(x.horas), 0)

  // Totales
  const totalMinSemana = horasAutoSemana + extraSemana * 60
  const totalHMes = horasAutoMes / 60 + extraMes

  const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const hoy = formatFecha(new Date())

  // Desglose por tipo de hora extra para el resumen
  const extraPorTipo = TIPOS_EXTRA.map(t => ({
    ...t,
    horas: horasExtra.filter(h => h.tipo === t.id && h.fecha >= inicioMes).reduce((s,x) => s + Number(x.horas), 0)
  })).filter(t => t.horas > 0)

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* Cabecera */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Agenda</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Calendario semanal · Registro de horas automático y manual</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setModalResumen(true)}
            className="border border-black/10 text-[#6B6B6B] text-sm font-medium px-3 py-2.5 rounded-xl hover:bg-[#F5F5F0] transition-all">
            ⏱ Horas
          </button>
          <button onClick={() => setModalExtra(true)}
            className="border border-[#FF5C00]/30 text-[#FF5C00] text-sm font-medium px-3 py-2.5 rounded-xl hover:bg-[#FF5C00]/5 transition-all">
            + Extra
          </button>
          <button onClick={() => setModal(true)}
            className="bg-[#FF5C00] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95">
            + Sesión
          </button>
        </div>
      </div>

      {/* Stats rápidas de horas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          ['Esta semana', formatH(horasAutoSemana), 'Sesiones completadas', '#FF5C00'],
          ['+ Extras semana', `${extraSemana}h`, 'Desplazamientos, reuniones...', '#6366f1'],
          ['Total semana', formatH(totalMinSemana), 'Horas trabajadas reales', '#0A0A0A'],
          ['Total mes', `${totalHMes.toFixed(1)}h`, `${sesionesCompletadasMes.length} sesiones + ${extraMes}h extras`, '#10b981'],
        ].map(([l,v,sub,c])=>(
          <div key={l} className="bg-white rounded-xl border border-black/5 shadow-sm p-3.5">
            <p className="text-xl font-bold" style={{color:c}}>{v}</p>
            <p className="text-xs font-semibold text-[#0A0A0A] mt-0.5">{l}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5 leading-tight">{sub}</p>
          </div>
        ))}
      </div>

      {/* Navegación semana */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setSemanaBase(d => { const n=new Date(d); n.setDate(n.getDate()-7); return n })}
          className="w-9 h-9 flex items-center justify-center border border-black/10 rounded-xl hover:bg-[#F5F5F0] transition-all text-[#6B6B6B]">‹</button>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#0A0A0A]">
            {diasSemana[0].toLocaleDateString('es-ES',{day:'numeric',month:'short'})} — {diasSemana[6].toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}
          </p>
          <p className="text-xs text-[#6B6B6B]">{sesionesSemana.length} sesiones · {sesionesCompletadasSemana.length} completadas</p>
        </div>
        <button onClick={() => setSemanaBase(d => { const n=new Date(d); n.setDate(n.getDate()+7); return n })}
          className="w-9 h-9 flex items-center justify-center border border-black/10 rounded-xl hover:bg-[#F5F5F0] transition-all text-[#6B6B6B]">›</button>
      </div>

      {/* Grid días */}
      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {diasSemana.map((dia,i) => {
          const sesionesDiaCount = sesionesDia(dia).length
          const esHoy = formatFecha(dia) === hoy
          const esSel = diaSeleccionado === i
          return (
            <button key={i} onClick={() => setDiaSeleccionado(i)}
              className={`py-2.5 rounded-xl text-center transition-all ${esSel?'bg-[#FF5C00] text-white shadow-sm':esHoy?'bg-[#FF5C00]/10 text-[#FF5C00]':'bg-white border border-black/5 text-[#6B6B6B] hover:border-[#FF5C00]/30'}`}>
              <p className="text-[10px] font-medium">{DIAS[i]}</p>
              <p className={`text-sm font-bold mt-0.5 ${esSel?'text-white':esHoy?'text-[#FF5C00]':'text-[#0A0A0A]'}`}>{dia.getDate()}</p>
              {sesionesDiaCount > 0 && <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1 ${esSel?'bg-white/70':'bg-[#FF5C00]'}`}/>}
            </button>
          )
        })}
      </div>

      {/* Sesiones del día seleccionado */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[#0A0A0A]">
            {diasSemana[diaSeleccionado].toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
          </p>
          <button onClick={() => setModal(true)} className="text-xs text-[#FF5C00] font-medium">+ añadir</button>
        </div>

        {sesionesDia(diasSemana[diaSeleccionado]).length === 0 ? (
          <div className="bg-white rounded-xl border border-black/5 p-6 text-center">
            <p className="text-2xl mb-1">📅</p>
            <p className="text-sm text-[#6B6B6B]">Sin sesiones este día</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sesionesDia(diasSemana[diaSeleccionado]).map(s => (
              <div key={s.id} className={`bg-white rounded-xl border shadow-sm p-3.5 transition-all ${s.completada?'border-emerald-100 bg-emerald-50/30':'border-black/5'}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => marcarCompletada(s.id, s.completada)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${s.completada?'bg-emerald-500 text-white':'border-2 border-black/10 text-[#6B6B6B] hover:border-emerald-400'}`}>
                    {s.completada ? '✓' : '○'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${s.completada?'line-through text-[#6B6B6B]':'text-[#0A0A0A]'}`}>{s.clientes?.nombre}</p>
                      {s.completada && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Completada</span>}
                    </div>
                    <p className="text-xs text-[#6B6B6B]">
                      {s.hora || '—'} · {s.duracion_minutos||60}min · {s.tipo}
                      {s.notas ? ` · ${s.notas}` : ''}
                    </p>
                  </div>
                  <button onClick={() => eliminarSesion(s.id)}
                    className="w-7 h-7 flex items-center justify-center text-[#6B6B6B] hover:text-red-500 transition-colors flex-shrink-0 text-lg">×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Horas extra del día seleccionado */}
      {(() => {
        const fechaDia = formatFecha(diasSemana[diaSeleccionado])
        const extrasDia = horasExtra.filter(h => h.fecha === fechaDia)
        if (!extrasDia.length) return null
        return (
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">Horas extra este día</p>
            <div className="space-y-1.5">
              {extrasDia.map(h => {
                const tipo = TIPOS_EXTRA.find(t => t.id === h.tipo)
                return (
                  <div key={h.id} className="bg-white rounded-xl border border-black/5 p-3 flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">{tipo?.icon||'⏱'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0A0A0A] truncate">{h.concepto}</p>
                      <p className="text-xs text-[#6B6B6B]">{tipo?.label}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-[#6366f1]">{h.horas}h</span>
                      <button onClick={() => eliminarExtra(h.id)} className="text-[#6B6B6B] hover:text-red-500 text-lg">×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Modal nueva sesión */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-4">
              Nueva sesión — {diasSemana[diaSeleccionado].toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'})}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente *</label>
                <select value={form.cliente_id} onChange={e => setForm(f=>({...f,cliente_id:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.tipo==='online'?'🌐':'📍'}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Hora</label>
                  <input type="time" value={form.hora} onChange={e => setForm(f=>({...f,hora:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
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
              <button onClick={guardar} disabled={!form.cliente_id || loading}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {loading ? 'Guardando...' : 'Añadir sesión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal horas extra */}
      {modalExtra && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-1">Registrar horas extra</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">Desplazamientos, reuniones, preparación de programas...</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_EXTRA.map(t => (
                    <button key={t.id} onClick={() => setFormExtra(f=>({...f,tipo:t.id}))} type="button"
                      className={`p-2.5 rounded-xl border text-left transition-all ${formExtra.tipo===t.id?'bg-[#FF5C00] border-[#FF5C00]':'border-black/10 hover:border-[#FF5C00]/50'}`}>
                      <p className="text-base">{t.icon}</p>
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
                    placeholder="1.5"
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
                {loading ? 'Guardando...' : '⏱ Registrar horas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal resumen horas */}
      {modalResumen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-bold text-[#0A0A0A]">Resumen de horas</h2>
              <button onClick={() => setModalResumen(false)} className="text-[#6B6B6B] text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Semana actual */}
              <div>
                <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wide mb-2">Esta semana</p>
                <div className="bg-[#111] rounded-xl p-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[#FF5C00] text-xl font-bold">{formatH(horasAutoSemana)}</p>
                      <p className="text-white/40 text-xs mt-0.5">Sesiones</p>
                    </div>
                    <div>
                      <p className="text-[#6366f1] text-xl font-bold">{extraSemana}h</p>
                      <p className="text-white/40 text-xs mt-0.5">Extras</p>
                    </div>
                    <div>
                      <p className="text-white text-xl font-bold">{formatH(totalMinSemana)}</p>
                      <p className="text-white/40 text-xs mt-0.5">Total</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-white/50 text-xs text-center">{sesionesCompletadasSemana.length} sesiones completadas · {sesionesCompletadasSemana.length > 0 ? `media ${Math.round(horasAutoSemana/sesionesCompletadasSemana.length)}min/sesión` : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Mes actual */}
              <div>
                <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wide mb-2">Este mes</p>
                <div className="bg-[#F5F5F0] rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-[#FF5C00]">{(horasAutoMes/60).toFixed(1)}h</p>
                      <p className="text-xs text-[#6B6B6B] mt-0.5">{sesionesCompletadasMes.length} sesiones</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-[#6366f1]">{extraMes}h</p>
                      <p className="text-xs text-[#6B6B6B] mt-0.5">horas extra</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-[#0A0A0A]">{totalHMes.toFixed(1)}h</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">Total horas trabajadas este mes</p>
                  </div>
                </div>

                {/* Desglose por tipo */}
                {extraPorTipo.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-[#6B6B6B]">Desglose horas extra</p>
                    {extraPorTipo.map(t => (
                      <div key={t.id} className="flex items-center gap-2">
                        <span>{t.icon}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5">
                            <p className="text-xs text-[#0A0A0A]">{t.label}</p>
                            <p className="text-xs font-bold text-[#6366f1]">{t.horas}h</p>
                          </div>
                          <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#6366f1] rounded-full" style={{width:`${Math.min(100,(t.horas/extraMes)*100)}%`}} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Historial horas extra recientes */}
              {horasExtra.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wide mb-2">Historial extras recientes</p>
                  <div className="space-y-1.5">
                    {horasExtra.slice(0,8).map(h => {
                      const tipo = TIPOS_EXTRA.find(t => t.id === h.tipo)
                      return (
                        <div key={h.id} className="flex items-center gap-2.5 p-2.5 bg-[#F5F5F0] rounded-xl">
                          <span className="text-sm flex-shrink-0">{tipo?.icon||'⏱'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#0A0A0A] truncate">{h.concepto}</p>
                            <p className="text-xs text-[#6B6B6B]">{new Date(h.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</p>
                          </div>
                          <span className="text-xs font-bold text-[#6366f1] flex-shrink-0">{h.horas}h</span>
                          <button onClick={() => eliminarExtra(h.id)} className="text-[#6B6B6B] hover:text-red-500 text-base flex-shrink-0">×</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
