import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import ClienteQuickView from '../components/ClienteQuickView'
import { getPesoRecomendado } from '../utils/pesos'
import EjercicioInput from '../components/EjercicioInput'

function Toast({ msg, tipo = 'ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 whitespace-nowrap ${tipo === 'error' ? 'bg-red-600' : 'bg-[#111]'}`}>
      <span>{tipo === 'error' ? '⚠' : '✓'}</span> {msg}
    </div>
  )
}

const initForm = {
  cliente_id: '', fecha: new Date().toISOString().split('T')[0],
  tipo: 'presencial', duracion_minutos: 60, notas: '',
  rpe: 7, fatiga_post: 2, sensaciones: '', dia_rutina: 1
}

const ini = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

export default function Sesiones({ session }) {
  const [sesiones, setSesiones] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [detalleEjercicios, setDetalleEjercicios] = useState([])
  const [form, setForm] = useState(initForm)
  const [ejercicios, setEjercicios] = useState([])
  const [rutinaCliente, setRutinaCliente] = useState(null)
  const [paso, setPaso] = useState(1)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [quickView, setQuickView] = useState(null)
  const uid = session.user.id

  useEffect(() => { cargar() }, [uid])

  const sesionesFiltradas = useMemo(() => {
    let r = [...sesiones]
    if (busqueda) { const b = busqueda.toLowerCase(); r = r.filter(s => s.clientes?.nombre?.toLowerCase().includes(b)) }
    if (filtroTipo === 'presencial') r = r.filter(s => s.tipo === 'presencial')
    if (filtroTipo === 'online') r = r.filter(s => s.tipo === 'online')
    if (filtroTipo === 'hoy') r = r.filter(s => s.fecha === new Date().toISOString().split('T')[0])
    return r
  }, [sesiones, busqueda, filtroTipo])

  async function cargar() {
    const [{ data: se }, { data: cl }] = await Promise.all([
      supabase.from('sesiones').select('*, clientes(nombre, tipo, nivel)').eq('entrenador_id', uid).order('fecha', { ascending: false }).limit(50),
      supabase.from('clientes').select('id,nombre,tipo,nivel').eq('entrenador_id', uid).eq('estado', 'activo'),
    ])
    setSesiones(se || [])
    setClientes(cl || [])
  }

  async function cargarRutina(clienteId, diaRutina) {
    if (!clienteId) return
    setRutinaCliente(null)
    setEjercicios([])
    const cliente = clientes.find(c => c.id === clienteId)
    const [{ data: ru }, { data: cu }, { data: pf }] = await Promise.all([
      supabase.from('rutinas').select('*').eq('cliente_id', clienteId).eq('estado', 'publicada').order('created_at', { ascending: false }).limit(1),
      supabase.from('cuestionarios').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(1),
      supabase.from('progresion_fuerza').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }).limit(1),
    ])
    const nivel = cliente?.nivel || 'principiante'
    const marcas = pf?.[0] || null
    const cuest = cu?.[0] || null
    if (ru?.[0]) {
      setRutinaCliente(ru[0])
      const contenido = ru[0].contenido || ru[0].borrador
      const dia = contenido?.dias?.find(d => d.dia === diaRutina)
      if (dia?.ejercicios) {
        setEjercicios(dia.ejercicios.map(ej => {
          const pesoRec = getPesoRecomendado(ej.nombre, ej.patron, nivel, marcas, cuest)
          return {
            ejercicio_nombre: ej.nombre,
            patron: ej.patron,
            orden: ej.orden,
            notas: ej.notas || '',
            peso_recomendado: pesoRec,
            sets: Array.from({ length: ej.series || 3 }, (_, i) => ({
              set: i + 1,
              peso: pesoRec ? String(pesoRec) : '',
              reps: ej.reps || '8-10',
              completado: false
            }))
          }
        }))
      }
    }
  }

  function addEjercicio() {
    setEjercicios(prev => [...prev, {
      ejercicio_nombre: '', patron: '', orden: prev.length + 1, notas: '', peso_recomendado: null,
      sets: [{ set: 1, peso: '', reps: '', completado: false }]
    }])
  }

  function updateEjercicio(idx, field, val) {
    setEjercicios(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e))
  }

  function updateSet(ejIdx, setIdx, field, val) {
    setEjercicios(prev => prev.map((e, i) => i === ejIdx ? {
      ...e, sets: e.sets.map((s, j) => j === setIdx ? { ...s, [field]: val } : s)
    } : e))
  }

  function addSet(ejIdx) {
    setEjercicios(prev => prev.map((e, i) => i === ejIdx ? {
      ...e, sets: [...e.sets, { set: e.sets.length + 1, peso: e.peso_recomendado ? String(e.peso_recomendado) : '', reps: '', completado: false }]
    } : e))
  }

  function removeSet(ejIdx, setIdx) {
    setEjercicios(prev => prev.map((e, i) => i === ejIdx ? {
      ...e, sets: e.sets.filter((_, j) => j !== setIdx)
    } : e))
  }

  async function guardar() {
    if (!form.cliente_id) return
    setLoading(true)
    try {
      const ejsFiltrados = ejercicios.filter(e => e.ejercicio_nombre)
      const { error } = await supabase.from('sesiones').insert({
        entrenador_id: uid,
        cliente_id: form.cliente_id,
        fecha: form.fecha,
        tipo: form.tipo,
        completada: true,
        notas: form.sensaciones || form.notas,
        rpe: form.rpe,
        fatiga_post: form.fatiga_post,
        sensaciones: form.sensaciones,
        duracion_minutos: form.duracion_minutos,
        dia_rutina: form.dia_rutina,
        ejercicios: ejsFiltrados.length > 0 ? ejsFiltrados : null
      })
      if (error) throw error
      setModal(false)
      setPaso(1)
      setForm(initForm)
      setEjercicios([])
      setRutinaCliente(null)
      setToast({ msg: 'Sesión guardada correctamente' })
      cargar()
    } catch (err) {
      setToast({ msg: 'Error al guardar: ' + err.message, tipo: 'error' })
    }
    setLoading(false)
  }

  function abrirDetalle(s) {
    setDetalle(s)
    setDetalleEjercicios(s.ejercicios || [])
  }

  const Btn = ({ field, val, red }) => {
    const active = form[field] === val
    return (
      <button type="button" onClick={() => setForm(f => ({ ...f, [field]: val }))}
        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${active
          ? (red && val >= 4 ? 'bg-red-500 text-white' : 'bg-[#FF5C00] text-white')
          : 'border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
        {val}
      </button>
    )
  }

  const hoy = new Date().toISOString().split('T')[0]
  const lun = new Date(); lun.setDate(lun.getDate() - (lun.getDay() || 7) + 1)
  const lunStr = lun.toISOString().split('T')[0]

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Sesiones</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Registra entrenamientos con pesos, reps y valoración</p>
        </div>
        <button onClick={() => { setForm(initForm); setEjercicios([]); setPaso(1); setModal(true) }}
          className="bg-[#FF5C00] hover:bg-[#E05200] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95 flex-shrink-0">
          + Nueva
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          ['Hoy', sesiones.filter(s => s.fecha === hoy).length, '#FF5C00'],
          ['Esta semana', sesiones.filter(s => s.fecha >= lunStr).length, '#6366f1'],
          ['Total', sesiones.length, '#6B6B6B'],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-xl border border-black/5 shadow-sm p-3.5 text-center">
            <p className="text-2xl font-bold" style={{ color: c }}>{v}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por cliente..."
          className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
        {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">×</button>}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[['todos', 'Todas'], ['hoy', 'Hoy'], ['presencial', 'Presencial'], ['online', 'Online']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltroTipo(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroTipo === v ? 'bg-[#FF5C00] text-white' : 'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {sesionesFiltradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">🏋️</p>
            <p className="font-semibold text-[#0A0A0A]">{busqueda ? 'Sin resultados' : 'Sin sesiones registradas'}</p>
            <p className="text-sm text-[#6B6B6B] mt-1">{busqueda ? `No hay sesiones que coincidan` : 'Registra el primer entrenamiento'}</p>
          </div>
        ) : sesionesFiltradas.map(s => (
          <div key={s.id} onClick={() => abrirDetalle(s)}
            className="bg-white rounded-xl border border-black/5 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-[#FF5C00]/20 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center text-[#FF5C00] font-bold text-sm flex-shrink-0">
                {ini(s.clientes?.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <button onClick={e => { e.stopPropagation(); setQuickView(s.cliente_id) }}
                  className="text-sm font-semibold text-[#0A0A0A] hover:text-[#FF5C00] transition-colors truncate block text-left">
                  {s.clientes?.nombre}
                </button>
                <p className="text-xs text-[#6B6B6B]">
                  {new Date(s.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })} · {s.hora || '—'} · {s.tipo}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {s.rpe && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full font-medium">RPE {s.rpe}</span>}
                {s.duracion_minutos && <span className="text-xs text-[#6B6B6B]">{s.duracion_minutos}min</span>}
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">✓</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <button onClick={() => setQuickView(detalle.cliente_id)} className="font-bold text-[#0A0A0A] hover:text-[#FF5C00] transition-colors">
                  {detalle.clientes?.nombre}
                </button>
                <p className="text-xs text-[#6B6B6B]">{new Date(detalle.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-[#6B6B6B] text-xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['RPE', detalle.rpe ? `${detalle.rpe}/10` : '—', '#FF5C00'],
                  ['Fatiga', detalle.fatiga_post ? `${detalle.fatiga_post}/5` : '—', detalle.fatiga_post >= 4 ? '#ef4444' : '#10b981'],
                  ['Duración', detalle.duracion_minutos ? `${detalle.duracion_minutos}min` : '—', '#6B6B6B'],
                ].map(([l, v, c]) => (
                  <div key={l} className="bg-[#F5F5F0] rounded-xl p-3 text-center">
                    <p className="text-lg font-bold" style={{ color: c }}>{v}</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
              {detalleEjercicios.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-[#0A0A0A] mb-2">Ejercicios registrados</p>
                  <div className="space-y-2">
                    {detalleEjercicios.map((ej, i) => (
                      <div key={i} className="border border-black/5 rounded-xl p-3">
                        <p className="text-sm font-semibold text-[#0A0A0A] mb-2">{ej.ejercicio_nombre}</p>
                        <div className="flex gap-2 flex-wrap">
                          {(ej.sets || []).map((s, j) => (
                            <div key={j} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${s.completado ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F5F5F0] text-[#6B6B6B]'}`}>
                              {s.peso ? `${s.peso}kg` : '—'} × {s.reps || '—'}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detalle.sensaciones && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Sensaciones</p>
                  <p className="text-sm text-amber-800">{detalle.sensaciones}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva sesión */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-black/5 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#0A0A0A]">Nueva sesión</h2>
                <button onClick={() => { setModal(false); setPaso(1); setForm(initForm); setEjercicios([]) }} className="text-[#6B6B6B] text-xl">×</button>
              </div>
              <div className="flex items-center gap-1.5">
                {[['1', 'Info'], ['2', 'Ejercicios'], ['3', 'Valoración']].map(([n, l], i) => (
                  <div key={n} className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${paso > i + 1 ? 'bg-emerald-500 text-white' : paso === i + 1 ? 'bg-[#FF5C00] text-white' : 'bg-black/10 text-[#6B6B6B]'}`}>
                      {paso > i + 1 ? '✓' : n}
                    </div>
                    <span className={`text-xs ${paso === i + 1 ? 'font-semibold text-[#0A0A0A]' : 'text-[#6B6B6B]'}`}>{l}</span>
                    {i < 2 && <div className="w-4 h-px bg-black/10 mx-0.5" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* PASO 1 */}
              {paso === 1 && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente *</label>
                    <select value={form.cliente_id} onChange={async e => {
                      const val = e.target.value
                      setForm(f => ({ ...f, cliente_id: val, dia_rutina: 1 }))
                      if (val) await cargarRutina(val, 1)
                    }} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                      <option value="">Selecciona cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.tipo === 'online' ? '🌐' : '📍'}</option>)}
                    </select>
                    {form.cliente_id && !rutinaCliente && (
                      <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mt-1.5">
                        ⚠ Sin rutina publicada — añade ejercicios manualmente en el paso 2
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Fecha</label>
                      <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Tipo</label>
                      <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                        <option value="presencial">Presencial</option>
                        <option value="online">Online</option>
                        <option value="pareja_grupo">Pareja/Grupo</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Duración: <span className="text-[#FF5C00]">{form.duracion_minutos} min</span></label>
                    <div className="flex gap-2 flex-wrap">
                      {[30, 45, 60, 75, 90, 120].map(v => (
                        <button key={v} type="button" onClick={() => setForm(f => ({ ...f, duracion_minutos: v }))}
                          className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${form.duracion_minutos === v ? 'bg-[#FF5C00] text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                          {v}min
                        </button>
                      ))}
                    </div>
                  </div>
                  {rutinaCliente && (
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Día de rutina</label>
                      <div className="flex gap-2 flex-wrap">
                        {(rutinaCliente.contenido?.dias || rutinaCliente.borrador?.dias || []).map(dia => (
                          <button key={dia.dia} type="button" onClick={async () => {
                            setForm(f => ({ ...f, dia_rutina: dia.dia }))
                            await cargarRutina(form.cliente_id, dia.dia)
                          }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${form.dia_rutina === dia.dia ? 'bg-[#111] text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                            {dia.nombre.split(' ').slice(0, 2).join(' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* PASO 2 */}
              {paso === 2 && (
                <>
                  {rutinaCliente && ejercicios.length > 0 && (
                    <div className="bg-[#FF5C00]/5 border border-[#FF5C00]/20 rounded-xl p-3 text-xs text-[#FF5C00] font-medium">
                      ✓ Ejercicios precargados desde la rutina · Pesos orientativos por nivel
                    </div>
                  )}
                  <div className="space-y-4">
                    {ejercicios.map((ej, ejIdx) => (
                      <div key={ejIdx} className="border border-black/8 rounded-2xl overflow-hidden">
                        <div className="bg-[#F5F5F0] px-4 py-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-[#FF5C00] text-white rounded-lg text-xs font-bold flex items-center justify-center">{ejIdx + 1}</span>
                          <EjercicioInput
                            value={ej.ejercicio_nombre}
                            onChange={val => updateEjercicio(ejIdx, 'ejercicio_nombre', val)}
                            onSelect={ej2 => { updateEjercicio(ejIdx, 'ejercicio_nombre', ej2.nombre); updateEjercicio(ejIdx, 'patron', ej2.patron || '') }}
                            uid={uid}
                            className="flex-1 bg-transparent text-sm font-semibold border-0 focus:ring-0 p-0"
                            placeholder="Nombre del ejercicio" />
                          {ej.peso_recomendado && (
                            <span className="text-xs bg-[#FF5C00]/15 text-[#FF5C00] px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                              ~{ej.peso_recomendado}kg
                            </span>
                          )}
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="grid grid-cols-12 gap-2 px-1 mb-1">
                            {['Set', 'Kg', 'Reps', '✓', ''].map((h, i) => (
                              <p key={i} className={`text-xs text-[#6B6B6B] font-medium ${i === 0 ? 'col-span-1' : i === 1 ? 'col-span-4' : i === 2 ? 'col-span-4' : i === 3 ? 'col-span-2' : 'col-span-1'}`}>{h}</p>
                            ))}
                          </div>
                          {ej.sets.map((s, setIdx) => (
                            <div key={setIdx} className="grid grid-cols-12 gap-2 items-center">
                              <span className="col-span-1 text-xs font-bold text-[#6B6B6B]">{setIdx + 1}</span>
                              <input type="number" step="0.5" value={s.peso} onChange={e => updateSet(ejIdx, setIdx, 'peso', e.target.value)}
                                placeholder={ej.peso_recomendado || '—'}
                                className="col-span-4 border border-black/10 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                              <input value={s.reps} onChange={e => updateSet(ejIdx, setIdx, 'reps', e.target.value)}
                                placeholder="—" className="col-span-4 border border-black/10 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                              <button type="button" onClick={() => updateSet(ejIdx, setIdx, 'completado', !s.completado)}
                                className={`col-span-2 h-8 rounded-lg text-sm font-bold transition-all ${s.completado ? 'bg-emerald-500 text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                                {s.completado ? '✓' : '○'}
                              </button>
                              <button type="button" onClick={() => removeSet(ejIdx, setIdx)}
                                className="col-span-1 text-[#6B6B6B] hover:text-red-500 text-lg leading-none">×</button>
                            </div>
                          ))}
                          <button type="button" onClick={() => addSet(ejIdx)}
                            className="w-full border border-dashed border-black/15 text-[#6B6B6B] text-xs py-2 rounded-xl hover:border-[#FF5C00] hover:text-[#FF5C00] transition-all">
                            + Set
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addEjercicio}
                    className="w-full border-2 border-dashed border-black/15 text-[#6B6B6B] text-sm font-medium py-3.5 rounded-2xl hover:border-[#FF5C00] hover:text-[#FF5C00] transition-all">
                    + Añadir ejercicio
                  </button>
                </>
              )}

              {/* PASO 3 */}
              {paso === 3 && (
                <>
                  <div className="bg-[#F5F5F0] rounded-2xl p-4 text-center">
                    <p className="text-sm font-semibold text-[#0A0A0A]">¿Cómo fue la sesión?</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">La IA usará esta valoración para ajustar las próximas rutinas</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Esfuerzo (RPE): <span className="text-[#FF5C00] font-bold">{form.rpe}/10</span></label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => <Btn key={v} field="rpe" val={v} />)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Fatiga generada: <span className="text-[#FF5C00] font-bold">{form.fatiga_post}/5</span></label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(v => <Btn key={v} field="fatiga_post" val={v} red />)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Sensaciones</label>
                    <textarea value={form.sensaciones} onChange={e => setForm(f => ({ ...f, sensaciones: e.target.value }))}
                      rows={3} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                      placeholder="¿Algo destacable? Dolor, energía, progresión..." />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-black/5 flex gap-2 sticky bottom-0 bg-white">
              {paso > 1 && (
                <button onClick={() => setPaso(p => p - 1)}
                  className="flex-1 border border-black/10 text-[#0A0A0A] text-sm font-medium py-3 rounded-xl hover:bg-black/5 transition-all">
                  ← Atrás
                </button>
              )}
              {paso < 3 ? (
                <button onClick={() => setPaso(p => p + 1)} disabled={paso === 1 && !form.cliente_id}
                  className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 transition-all">
                  Siguiente →
                </button>
              ) : (
                <button onClick={guardar} disabled={loading}
                  className="flex-1 bg-[#111] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 transition-all">
                  {loading ? 'Guardando...' : '✓ Guardar sesión'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {quickView && <ClienteQuickView clienteId={quickView} onClose={() => setQuickView(null)} />}
    </div>
  )
}
