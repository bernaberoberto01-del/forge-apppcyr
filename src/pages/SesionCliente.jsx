import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SesionCliente() {
  const { clienteId } = useParams()
  const [cliente, setCliente] = useState(null)
  const [rutina, setRutina] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enviado, setEnviado] = useState(false)
  const [paso, setPaso] = useState(1)
  const [diaSeleccionado, setDiaSeleccionado] = useState(1)
  const [ejercicios, setEjercicios] = useState([])
  const [rpe, setRpe] = useState(7)
  const [fatiga, setFatiga] = useState(2)
  const [sensaciones, setSensaciones] = useState('')
  const [duracion, setDuracion] = useState(60)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function cargar() {
      const [{ data: cl }, { data: ru }, { data: cu }, { data: pf }] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', clienteId).single(),
        supabase.from('rutinas').select('*').eq('cliente_id', clienteId).eq('estado', 'publicada').order('created_at', { ascending: false }).limit(1),
        supabase.from('cuestionarios').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(1),
        supabase.from('progresion_fuerza').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }).limit(1),
      ])
      if (!cl) { setLoading(false); return }
      setCliente(cl)
      if (ru?.[0]) {
        setRutina(ru[0])
        cargarDia(ru[0], 1, cu?.[0], pf?.[0])
      }
      setLoading(false)
    }
    cargar()
  }, [clienteId])

  function pesoTrabajo(patron, cuest, pf) {
    const p = (patron || '').toLowerCase()
    const rm = (key) => pf?.[key] || (cuest?.[`marca_${key.replace('_kg','')}`] ? parseFloat(cuest[`marca_${key.replace('_kg','')}`]) : null)
    if (p.includes('push') && p.includes('horizontal') || p.includes('banca')) return rm('press_banca_kg') ? Math.round(rm('press_banca_kg') * 0.75 / 2.5) * 2.5 : ''
    if (p.includes('squat') || p.includes('sentadilla')) return rm('sentadilla_kg') ? Math.round(rm('sentadilla_kg') * 0.75 / 2.5) * 2.5 : ''
    if (p.includes('deadlift') || p.includes('bisagra') || p.includes('muerto')) return rm('peso_muerto_kg') ? Math.round(rm('peso_muerto_kg') * 0.75 / 2.5) * 2.5 : ''
    if (p.includes('overhead') || p.includes('militar')) return rm('press_militar_kg') ? Math.round(rm('press_militar_kg') * 0.75 / 2.5) * 2.5 : ''
    return ''
  }

  function cargarDia(ru, dia, cuest, pf) {
    const contenido = ru.contenido || ru.borrador
    const d = contenido?.dias?.find(x => x.dia === dia)
    if (d?.ejercicios) {
      setEjercicios(d.ejercicios.map(ej => {
        const pesoRec = pesoTrabajo(ej.patron, cuest, pf)
        return {
          ejercicio_nombre: ej.nombre, patron: ej.patron, orden: ej.orden, notas: ej.notas || '',
          peso_recomendado: pesoRec,
          sets: Array.from({ length: ej.series || 3 }, (_, i) => ({ set: i + 1, peso: pesoRec ? String(pesoRec) : '', reps: ej.reps || '', completado: false }))
        }
      }))
    }
  }

  function updateSet(ejIdx, setIdx, field, val) {
    setEjercicios(prev => prev.map((e, i) => i === ejIdx ? {
      ...e, sets: e.sets.map((s, j) => j === setIdx ? { ...s, [field]: val } : s)
    } : e))
  }

  async function guardar() {
    setGuardando(true)
    const { data: sesion } = await supabase.from('sesiones').insert({
      entrenador_id: cliente.entrenador_id,
      cliente_id: clienteId,
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'online', completada: true,
      rpe, fatiga_post: fatiga, sensaciones,
      duracion_minutos: duracion, dia_rutina: diaSeleccionado
    }).select('id').single()

    if (sesion.data) {
      const ejsFiltrados = ejercicios.filter(e => e.sets.some(s => s.peso || s.reps))
      if (ejsFiltrados.length > 0) {
        await supabase.from('sesion_ejercicios').insert(
          ejsFiltrados.map(e => ({
            sesion_id: sesion.data.id, cliente_id: clienteId,
            entrenador_id: cliente.entrenador_id,
            ejercicio_nombre: e.ejercicio_nombre, patron: e.patron, orden: e.orden,
            sets: e.sets, notas: e.notas
          }))
        )
      }
    }
    setEnviado(true)
    setGuardando(false)
  }

  const Btn = ({ val, field, set }) => {
    const active = field === 'rpe' ? rpe === val : fatiga === val
    const isRed = field === 'fatiga' && val >= 4
    return (
      <button type="button" onClick={() => field === 'rpe' ? setRpe(val) : setFatiga(val)}
        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${active
          ? isRed ? 'bg-red-500 text-white' : 'bg-[#FF5C00] text-white'
          : 'border border-black/10 text-[#6B6B6B]'}`}>
        {val}
      </button>
    )
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]"><div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" /></div>
  if (!cliente) return <div className="min-h-screen flex items-center justify-center"><p className="text-[#6B6B6B]">Enlace no válido</p></div>
  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F0]">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl">💪</div>
        <h2 className="text-2xl font-bold text-[#0A0A0A] mb-2">¡Sesión registrada!</h2>
        <p className="text-[#6B6B6B] text-sm">Tu entrenador ya puede ver tu entrenamiento de hoy.</p>
        <a href={`/portal/${clienteId}`} className="block mt-6 bg-[#111] text-white font-semibold py-3.5 rounded-2xl text-sm">Ver mi portal →</a>
      </div>
    </div>
  )

  const dias = (rutina?.contenido?.dias || rutina?.borrador?.dias || [])

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="bg-[#111] px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto">
          <p className="text-white/50 text-xs mb-1">Forge · Registro de sesión</p>
          <h1 className="text-white font-bold text-lg">{cliente.nombre.split(' ')[0]}</h1>
          <p className="text-white/50 text-xs mt-0.5">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-10 space-y-4">
        {/* Selección de día */}
        {dias.length > 0 && paso === 1 && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
            <p className="text-sm font-bold text-[#0A0A0A] mb-3">¿Qué día de rutina es hoy?</p>
            <div className="space-y-2">
              {dias.map(dia => (
                <button key={dia.dia} type="button" onClick={() => { setDiaSeleccionado(dia.dia); cargarDia(rutina, dia.dia) }}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all ${diaSeleccionado === dia.dia ? 'border-[#FF5C00] bg-[#FF5C00]/5' : 'border-black/8 hover:border-black/20'}`}>
                  <p className={`text-sm font-semibold ${diaSeleccionado === dia.dia ? 'text-[#FF5C00]' : 'text-[#0A0A0A]'}`}>{dia.nombre}</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">{dia.ejercicios?.length} ejercicios · {dia.patron_principal}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Duración */}
        {paso === 1 && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
            <p className="text-sm font-bold text-[#0A0A0A] mb-3">Duración: <span className="text-[#FF5C00]">{duracion} min</span></p>
            <div className="flex gap-2 flex-wrap">
              {[30, 45, 60, 75, 90].map(v => (
                <button key={v} type="button" onClick={() => setDuracion(v)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${duracion === v ? 'bg-[#FF5C00] text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                  {v}min
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ejercicios */}
        {paso === 1 && ejercicios.map((ej, ejIdx) => (
          <div key={ejIdx} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="bg-[#0A0A0A] px-4 py-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#FF5C00] text-white rounded-lg text-xs font-bold flex items-center justify-center">{ejIdx + 1}</span>
              <p className="text-white text-sm font-semibold flex-1">{ej.ejercicio_nombre}</p>
              {ej.peso_recomendado && (
                <span className="text-xs bg-[#FF5C00]/20 text-[#FF5C00] px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                  ~{ej.peso_recomendado}kg
                </span>
              )}
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 px-1 mb-1">
                <p className="col-span-1 text-xs text-[#6B6B6B]">Set</p>
                <p className="col-span-5 text-xs text-[#6B6B6B]">Peso (kg)</p>
                <p className="col-span-4 text-xs text-[#6B6B6B]">Reps</p>
                <p className="col-span-2 text-xs text-[#6B6B6B]">✓</p>
              </div>
              {ej.sets.map((s, setIdx) => (
                <div key={setIdx} className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-1 text-xs font-bold text-[#6B6B6B]">{setIdx + 1}</span>
                  <input type="number" step="0.5" value={s.peso} onChange={e => updateSet(ejIdx, setIdx, 'peso', e.target.value)}
                    placeholder="—" className="col-span-5 border border-black/10 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                  <input value={s.reps} onChange={e => updateSet(ejIdx, setIdx, 'reps', e.target.value)}
                    placeholder={s.reps || '—'} className="col-span-4 border border-black/10 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                  <button type="button" onClick={() => updateSet(ejIdx, setIdx, 'completado', !s.completado)}
                    className={`col-span-2 h-9 rounded-lg text-sm font-bold transition-all ${s.completado ? 'bg-emerald-500 text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                    {s.completado ? '✓' : '○'}
                  </button>
                </div>
              ))}
              {ej.notas && <p className="text-xs text-[#6B6B6B] italic mt-1 px-1">{ej.notas}</p>}
            </div>
          </div>
        ))}

        {/* Valoración */}
        {paso === 2 && (
          <>
            <div className="bg-[#111] rounded-2xl p-4 text-center">
              <p className="text-white font-bold">¿Cómo fue la sesión?</p>
              <p className="text-white/50 text-xs mt-1">Tu entrenador usará esto para ajustar tu próxima rutina</p>
            </div>
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 space-y-5">
              <div>
                <p className="text-sm font-bold text-[#0A0A0A] mb-1">Esfuerzo percibido (RPE): <span className="text-[#FF5C00]">{rpe}/10</span></p>
                <p className="text-xs text-[#6B6B6B] mb-3">1 = Muy ligero · 10 = Máximo esfuerzo</p>
                <div className="flex gap-1.5 flex-wrap">{[1,2,3,4,5,6,7,8,9,10].map(v => <Btn key={v} val={v} field="rpe" />)}</div>
              </div>
              <div>
                <p className="text-sm font-bold text-[#0A0A0A] mb-1">Fatiga generada: <span className="text-[#FF5C00]">{fatiga}/5</span></p>
                <p className="text-xs text-[#6B6B6B] mb-3">1 = Fresco · 5 = Muy fatigado</p>
                <div className="flex gap-1.5">{[1,2,3,4,5].map(v => <Btn key={v} val={v} field="fatiga" />)}</div>
              </div>
              <div>
                <p className="text-sm font-bold text-[#0A0A0A] mb-1.5">Sensaciones (opcional)</p>
                <textarea value={sensaciones} onChange={e => setSensaciones(e.target.value)} rows={3}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                  placeholder="¿Algún dolor, mejora en peso, algo que destacar?" />
              </div>
            </div>
          </>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          {paso === 2 && (
            <button onClick={() => setPaso(1)} className="flex-1 border border-black/10 text-[#0A0A0A] font-semibold py-4 rounded-2xl text-sm">← Atrás</button>
          )}
          {paso === 1 ? (
            <button onClick={() => setPaso(2)} className="flex-1 bg-[#FF5C00] text-white font-bold py-4 rounded-2xl text-sm active:scale-98 transition-all">
              Valorar sesión →
            </button>
          ) : (
            <button onClick={guardar} disabled={guardando} className="flex-1 bg-[#111] text-white font-bold py-4 rounded-2xl text-sm active:scale-98 transition-all disabled:opacity-50">
              {guardando ? 'Guardando...' : '💪 Guardar sesión'}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-[#6B6B6B]">Forge Studio OS</p>
      </div>
    </div>
  )
}
