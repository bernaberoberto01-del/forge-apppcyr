import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const initForm = {
  cliente_id: '', fecha: new Date().toISOString().split('T')[0],
  tipo: 'presencial', duracion_minutos: 60, notas: '',
  rpe: 7, fatiga_post: 2, sensaciones: '', dia_rutina: 1
}

export default function Sesiones({ session }) {
  const [sesiones, setSesiones] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [detalleEjercicios, setDetalleEjercicios] = useState([])
  const [form, setForm] = useState(initForm)
  const [ejercicios, setEjercicios] = useState([])
  const [rutinaCliente, setRutinaCliente] = useState(null)
  const [paso, setPaso] = useState(1) // 1=info, 2=ejercicios, 3=valoracion
  const [loading, setLoading] = useState(false)
  const uid = session.user.id

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const [{ data: se }, { data: cl }] = await Promise.all([
      supabase.from('sesiones').select('*, clientes(nombre, tipo)').eq('entrenador_id', uid).order('fecha', { ascending: false }).limit(30),
      supabase.from('clientes').select('id,nombre,tipo').eq('entrenador_id', uid).eq('estado', 'activo'),
    ])
    setSesiones(se || [])
    setClientes(cl || [])
  }

  async function cargarRutina(clienteId, diaRutina) {
    const [{ data: ru }, { data: cu }, { data: pf }] = await Promise.all([
      supabase.from('rutinas').select('*').eq('cliente_id', clienteId).eq('estado', 'publicada').order('created_at', { ascending: false }).limit(1),
      supabase.from('cuestionarios').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(1),
      supabase.from('progresion_fuerza').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }).limit(1),
    ])

    // Marcas del cliente para recomendar pesos
    const marcas = pf?.[0] || {}
    const cuest = cu?.[0] || {}

    // Función para calcular peso de trabajo (~75-80% del RM)
    const pesoTrabajo = (patron) => {
      const p = patron?.toLowerCase() || ''
      if (p.includes('horizontal') && p.includes('push') || p.includes('banca')) {
        const rm = marcas.press_banca_kg || (cuest.marca_press_banca ? parseFloat(cuest.marca_press_banca) : null)
        return rm ? Math.round(rm * 0.75 / 2.5) * 2.5 : ''
      }
      if (p.includes('squat') || p.includes('sentadilla')) {
        const rm = marcas.sentadilla_kg || (cuest.marca_sentadilla ? parseFloat(cuest.marca_sentadilla) : null)
        return rm ? Math.round(rm * 0.75 / 2.5) * 2.5 : ''
      }
      if (p.includes('deadlift') || p.includes('bisagra') || p.includes('muerto')) {
        const rm = marcas.peso_muerto_kg || (cuest.marca_peso_muerto ? parseFloat(cuest.marca_peso_muerto) : null)
        return rm ? Math.round(rm * 0.75 / 2.5) * 2.5 : ''
      }
      if (p.includes('vertical') && p.includes('push') || p.includes('militar')) {
        const rm = marcas.press_militar_kg || (cuest.marca_press_militar ? parseFloat(cuest.marca_press_militar) : null)
        return rm ? Math.round(rm * 0.75 / 2.5) * 2.5 : ''
      }
      return ''
    }

    if (ru?.[0]) {
      setRutinaCliente(ru[0])
      const contenido = ru[0].contenido || ru[0].borrador
      const dia = contenido?.dias?.find(d => d.dia === diaRutina)
      if (dia?.ejercicios) {
        setEjercicios(dia.ejercicios.map(ej => {
          const pesoRec = pesoTrabajo(ej.patron)
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
      } else {
        setEjercicios([])
      }
    } else {
      setRutinaCliente(null)
      setEjercicios([])
    }
  }

  function addEjercicio() {
    setEjercicios(prev => [...prev, {
      ejercicio_nombre: '', patron: '', orden: prev.length + 1, notas: '',
      sets: [{ set: 1, peso: '', reps: '', completado: false }]
    }])
  }

  function updateEjercicio(idx, field, val) {
    setEjercicios(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e))
  }

  function updateSet(ejIdx, setIdx, field, val) {
    setEjercicios(prev => prev.map((e, i) => i === ejIdx ? {
      ...e,
      sets: e.sets.map((s, j) => j === setIdx ? { ...s, [field]: val } : s)
    } : e))
  }

  function addSet(ejIdx) {
    setEjercicios(prev => prev.map((e, i) => i === ejIdx ? {
      ...e, sets: [...e.sets, { set: e.sets.length + 1, peso: '', reps: '', completado: false }]
    } : e))
  }

  function removeSet(ejIdx, setIdx) {
    setEjercicios(prev => prev.map((e, i) => i === ejIdx ? {
      ...e, sets: e.sets.filter((_, j) => j !== setIdx)
    } : e))
  }

  async function guardar() {
    setLoading(true)
    try {
      const { data: sesion, error: sesionError } = await supabase.from('sesiones').insert({
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
        dia_rutina: form.dia_rutina
      }).select().single()

      if (sesionError) throw sesionError

      const ejsFiltrados = ejercicios.filter(e => e.ejercicio_nombre)
      if (sesion && ejsFiltrados.length > 0) {
        await supabase.from('sesion_ejercicios').insert(
          ejsFiltrados.map(e => ({
            sesion_id: sesion.id,
            cliente_id: form.cliente_id,
            entrenador_id: uid,
            ejercicio_nombre: e.ejercicio_nombre,
            patron: e.patron,
            orden: e.orden,
            sets: e.sets,
            notas: e.notas
          }))
        )
      }

      setModal(false)
      setPaso(1)
      setForm(initForm)
      setEjercicios([])
      setRutinaCliente(null)
      cargar() // Sin await — no bloquea el cierre del modal
    } catch (err) {
      console.error('Error guardando sesión:', err)
      alert('Error al guardar: ' + err.message)
    }
    setLoading(false)
  }

  async function abrirDetalle(s) {
    setDetalle(s)
    const { data: ej } = await supabase.from('sesion_ejercicios').select('*').eq('sesion_id', s.id).order('orden')
    setDetalleEjercicios(ej || [])
  }

  const ini = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

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

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Sesiones</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Registra entrenamientos con pesos, reps y valoración</p>
        </div>
        <button onClick={() => { setForm(initForm); setEjercicios([]); setPaso(1); setModal(true) }}
          className="bg-[#FF5C00] hover:bg-[#E05200] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95">
          + Nueva sesión
        </button>
      </div>

      {/* Lista sesiones */}
      <div className="space-y-2">
        {sesiones.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">🏋️</p>
            <p className="font-semibold text-[#0A0A0A]">Sin sesiones registradas</p>
            <p className="text-sm text-[#6B6B6B] mt-1">Empieza registrando el primer entrenamiento</p>
          </div>
        ) : sesiones.map(s => (
          <div key={s.id} onClick={() => abrirDetalle(s)}
            className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 cursor-pointer hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center text-[#FF5C00] font-bold text-sm flex-shrink-0">
                {ini(s.clientes?.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0A0A0A] truncate">{s.clientes?.nombre}</p>
                <p className="text-xs text-[#6B6B6B]">{new Date(s.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })} · {s.tipo}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {s.rpe && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full font-medium">RPE {s.rpe}</span>}
                {s.duracion_minutos && <span className="text-xs text-[#6B6B6B]">{s.duracion_minutos}min</span>}
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">✓</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal detalle sesión */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-[#0A0A0A]">{detalle.clientes?.nombre}</h2>
                <p className="text-xs text-[#6B6B6B]">{new Date(detalle.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-[#6B6B6B] text-xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Métricas sesión */}
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

              {/* Ejercicios */}
              {detalleEjercicios.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-[#0A0A0A] mb-2">Ejercicios registrados</p>
                  <div className="space-y-2">
                    {detalleEjercicios.map(ej => (
                      <div key={ej.id} className="border border-black/5 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-[#0A0A0A]">{ej.ejercicio_nombre}</p>
                          {ej.patron && <span className="text-xs text-[#6B6B6B] bg-[#F5F5F0] px-2 py-0.5 rounded-full">{ej.patron}</span>}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {(ej.sets || []).map((s, i) => (
                            <div key={i} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${s.completado ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-[#6B6B6B]'}`}>
                              {s.peso ? `${s.peso}kg` : '—'} × {s.reps || '—'}
                            </div>
                          ))}
                        </div>
                        {ej.notas && <p className="text-xs text-[#6B6B6B] mt-2 italic">{ej.notas}</p>}
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
            {/* Header modal */}
            <div className="p-4 border-b border-black/5 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#0A0A0A]">Nueva sesión</h2>
                <button onClick={() => setModal(false)} className="text-[#6B6B6B] text-xl">×</button>
              </div>
              {/* Progress pasos */}
              <div className="flex gap-2">
                {[['1', 'Info'], ['2', 'Ejercicios'], ['3', 'Valoración']].map(([n, l], i) => (
                  <div key={n} className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${paso > i + 1 ? 'bg-emerald-500 text-white' : paso === i + 1 ? 'bg-[#FF5C00] text-white' : 'bg-black/10 text-[#6B6B6B]'}`}>{paso > i + 1 ? '✓' : n}</div>
                    <span className={`text-xs ${paso === i + 1 ? 'font-semibold text-[#0A0A0A]' : 'text-[#6B6B6B]'}`}>{l}</span>
                    {i < 2 && <div className="w-4 h-px bg-black/10 mx-1" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* PASO 1 — Info básica */}
              {paso === 1 && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente *</label>
                    <select value={form.cliente_id} onChange={async e => {
                      const val = e.target.value
                      setForm(f => ({ ...f, cliente_id: val }))
                      if (val) await cargarRutina(val, form.dia_rutina)
                    }} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                      <option value="">Selecciona cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.tipo === 'online' ? '🌐' : '📍'}</option>)}
                    </select>
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
                          className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${form.duracion_minutos === v ? 'bg-[#FF5C00] text-white' : 'border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
                          {v}min
                        </button>
                      ))}
                    </div>
                  </div>

                  {rutinaCliente && (
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Día de rutina</label>
                      <div className="flex gap-2">
                        {(rutinaCliente.contenido?.dias || rutinaCliente.borrador?.dias || []).map(dia => (
                          <button key={dia.dia} type="button" onClick={async () => {
                            setForm(f => ({ ...f, dia_rutina: dia.dia }))
                            await cargarRutina(form.cliente_id, dia.dia)
                          }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${form.dia_rutina === dia.dia ? 'bg-[#111] text-white' : 'border border-black/10 text-[#6B6B6B] hover:border-[#111]'}`}>
                            {dia.nombre.split(' ').slice(0, 2).join(' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* PASO 2 — Ejercicios */}
              {paso === 2 && (
                <>
                  {rutinaCliente && ejercicios.length > 0 && (
                    <div className="bg-[#FF5C00]/5 border border-[#FF5C00]/20 rounded-xl p-3 text-xs text-[#FF5C00] font-medium">
                      ✓ Ejercicios precargados desde la rutina de {form.dia_rutina === 1 ? 'Día A' : form.dia_rutina === 2 ? 'Día B' : 'Día C'}
                    </div>
                  )}

                  <div className="space-y-4">
                    {ejercicios.map((ej, ejIdx) => (
                      <div key={ejIdx} className="border border-black/8 rounded-2xl overflow-hidden">
                        <div className="bg-[#F5F5F0] px-4 py-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-[#FF5C00] text-white rounded-lg text-xs font-bold flex items-center justify-center">{ejIdx + 1}</span>
                          <input value={ej.ejercicio_nombre} onChange={e => updateEjercicio(ejIdx, 'ejercicio_nombre', e.target.value)}
                            className="flex-1 bg-transparent text-sm font-semibold text-[#0A0A0A] focus:outline-none placeholder:text-[#6B6B6B]"
                            placeholder="Nombre del ejercicio" />
                          {ej.peso_recomendado && (
                            <span className="text-xs bg-[#FF5C00]/10 text-[#FF5C00] px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                              ~{ej.peso_recomendado}kg
                            </span>
                          )}
                        </div>

                        {/* Sets */}
                        <div className="p-3 space-y-2">
                          <div className="grid grid-cols-12 gap-2 px-1 mb-1">
                            <p className="col-span-1 text-xs text-[#6B6B6B] font-medium">Set</p>
                            <p className="col-span-4 text-xs text-[#6B6B6B] font-medium">Peso (kg)</p>
                            <p className="col-span-4 text-xs text-[#6B6B6B] font-medium">Reps</p>
                            <p className="col-span-2 text-xs text-[#6B6B6B] font-medium">✓</p>
                            <p className="col-span-1"></p>
                          </div>
                          {ej.sets.map((s, setIdx) => (
                            <div key={setIdx} className="grid grid-cols-12 gap-2 items-center">
                              <span className="col-span-1 text-xs font-bold text-[#6B6B6B]">{setIdx + 1}</span>
                              <input type="number" step="0.5" value={s.peso} onChange={e => updateSet(ejIdx, setIdx, 'peso', e.target.value)}
                                placeholder="—" className="col-span-4 border border-black/10 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
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
                            + Añadir set
                          </button>
                          {ej.notas !== undefined && (
                            <input value={ej.notas} onChange={e => updateEjercicio(ejIdx, 'notas', e.target.value)}
                              className="w-full border border-black/8 rounded-xl px-3 py-2 text-xs text-[#6B6B6B] focus:outline-none focus:border-[#FF5C00] mt-1"
                              placeholder="Nota sobre el ejercicio..." />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={addEjercicio}
                    className="w-full border-2 border-dashed border-black/15 text-[#6B6B6B] text-sm font-medium py-3.5 rounded-2xl hover:border-[#FF5C00] hover:text-[#FF5C00] transition-all">
                    + Añadir ejercicio extra
                  </button>
                </>
              )}

              {/* PASO 3 — Valoración */}
              {paso === 3 && (
                <>
                  <div className="bg-[#F5F5F0] rounded-2xl p-4 text-center mb-2">
                    <p className="text-sm font-semibold text-[#0A0A0A]">¿Cómo fue la sesión?</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">Esta valoración ayuda a la IA a ajustar las próximas rutinas</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">
                      Esfuerzo percibido (RPE): <span className="text-[#FF5C00] font-bold">{form.rpe}/10</span>
                    </label>
                    <p className="text-xs text-[#6B6B6B] mb-2">1 = Sin esfuerzo · 10 = Esfuerzo máximo</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {[1,2,3,4,5,6,7,8,9,10].map(v => <Btn key={v} field="rpe" val={v} />)}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">
                      Fatiga generada: <span className="text-[#FF5C00] font-bold">{form.fatiga_post}/5</span>
                    </label>
                    <p className="text-xs text-[#6B6B6B] mb-2">1 = Fresco · 5 = Muy fatigado</p>
                    <div className="flex gap-1.5">
                      {[1,2,3,4,5].map(v => <Btn key={v} field="fatiga_post" val={v} red />)}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Sensaciones (opcional)</label>
                    <textarea value={form.sensaciones} onChange={e => setForm(f => ({ ...f, sensaciones: e.target.value }))}
                      rows={3} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                      placeholder="¿Algo destacable de la sesión? Dolor, energía, progresión..." />
                  </div>
                </>
              )}
            </div>

            {/* Botones navegación */}
            <div className="p-4 border-t border-black/5 flex gap-2 sticky bottom-0 bg-white">
              {paso > 1 && (
                <button onClick={() => setPaso(p => p - 1)}
                  className="flex-1 border border-black/10 text-[#0A0A0A] text-sm font-medium py-3 rounded-xl hover:bg-black/5 transition-all">
                  ← Atrás
                </button>
              )}
              {paso < 3 ? (
                <button onClick={() => setPaso(p => p + 1)} disabled={paso === 1 && !form.cliente_id}
                  className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 hover:bg-[#E05200] transition-all">
                  Siguiente →
                </button>
              ) : (
                <button onClick={guardar} disabled={loading}
                  className="flex-1 bg-[#111] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 hover:bg-black transition-all">
                  {loading ? 'Guardando...' : '✓ Guardar sesión'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
