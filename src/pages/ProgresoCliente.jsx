import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const EJERCICIOS = [
  { key: 'press_banca', label: 'Press de banca', icon: '🏋️', kg: 'press_banca_kg', reps: 'press_banca_reps' },
  { key: 'sentadilla', label: 'Sentadilla', icon: '🦵', kg: 'sentadilla_kg', reps: 'sentadilla_reps' },
  { key: 'peso_muerto', label: 'Peso muerto', icon: '⚡', kg: 'peso_muerto_kg', reps: 'peso_muerto_reps' },
  { key: 'dominadas', label: 'Dominadas', icon: '💪', kg: 'dominadas_lastre_kg', reps: 'dominadas_reps', sinPeso: true },
  { key: 'press_militar', label: 'Press militar', icon: '🔝', kg: 'press_militar_kg', reps: 'press_militar_reps' },
]

export default function ProgresoCliente() {
  const { clienteId } = useParams()
  const [cliente, setCliente] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enviado, setEnviado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    press_banca_kg: '', press_banca_reps: '',
    sentadilla_kg: '', sentadilla_reps: '',
    peso_muerto_kg: '', peso_muerto_reps: '',
    dominadas_reps: '', dominadas_lastre_kg: '',
    press_militar_kg: '', press_militar_reps: '',
    percepcion_progreso: 3, comentario: ''
  })

  useEffect(() => {
    supabase.from('clientes').select('id,nombre,entrenador_id').eq('id', clienteId).single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setCliente(data)
        setLoading(false)
      })
  }, [clienteId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function enviar() {
    setGuardando(true)
    await supabase.from('progresion_fuerza').insert({
      cliente_id: clienteId,
      entrenador_id: cliente.entrenador_id,
      fecha: new Date().toISOString().split('T')[0],
      press_banca_kg: form.press_banca_kg ? Number(form.press_banca_kg) : null,
      press_banca_reps: form.press_banca_reps ? Number(form.press_banca_reps) : null,
      sentadilla_kg: form.sentadilla_kg ? Number(form.sentadilla_kg) : null,
      sentadilla_reps: form.sentadilla_reps ? Number(form.sentadilla_reps) : null,
      peso_muerto_kg: form.peso_muerto_kg ? Number(form.peso_muerto_kg) : null,
      peso_muerto_reps: form.peso_muerto_reps ? Number(form.peso_muerto_reps) : null,
      dominadas_reps: form.dominadas_reps ? Number(form.dominadas_reps) : null,
      dominadas_lastre_kg: form.dominadas_lastre_kg ? Number(form.dominadas_lastre_kg) : null,
      press_militar_kg: form.press_militar_kg ? Number(form.press_militar_kg) : null,
      press_militar_reps: form.press_militar_reps ? Number(form.press_militar_reps) : null,
      percepcion_progreso: form.percepcion_progreso,
      comentario: form.comentario || null
    })
    setEnviado(true)
    setGuardando(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4">
      <div className="text-center"><p className="text-4xl mb-3">🔗</p><p className="text-[#6B6B6B]">Enlace no válido</p></div>
    </div>
  )

  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F0]">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl">💪</div>
        <h2 className="text-2xl font-bold text-[#0A0A0A] mb-2">¡Gracias, {cliente.nombre.split(' ')[0]}!</h2>
        <p className="text-[#6B6B6B] text-sm leading-relaxed">Tu entrenador ya tiene tus marcas actualizadas. Las usará para preparar tu rutina del próximo mes.</p>
        <div className="mt-5 bg-[#FF5C00]/8 border border-[#FF5C00]/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-[#FF5C00]">¡Sigue así! 🔥</p>
          <p className="text-xs text-[#6B6B6B] mt-1">Te volveremos a preguntar en 4 semanas</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Header */}
      <div className="bg-[#111] px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-[#FF5C00] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
                <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
                <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
                <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
              </svg>
            </div>
            <span className="text-white/60 text-xs font-medium">Forge · Control mensual</span>
          </div>
          <h1 className="text-white font-bold text-xl">Hola {cliente.nombre.split(' ')[0]} 👋</h1>
          <p className="text-white/50 text-sm mt-1">¿Cuánto estás moviendo ahora? Tarda menos de 2 minutos.</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-10 space-y-3">

        {/* Intro */}
        <div className="bg-[#FF5C00]/8 border border-[#FF5C00]/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-[#FF5C00] mb-1">¿Para qué sirve esto?</p>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">Tu entrenador usa tus marcas actuales para ver tu progresión real y preparar tu rutina del próximo mes. No hace falta que sea el máximo absoluto — pon el peso con el que haces las reps de forma limpia.</p>
        </div>

        {/* Ejercicios */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5 bg-[#F5F5F0]">
            <p className="text-sm font-bold text-[#0A0A0A]">Tus marcas actuales</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">Deja en blanco los que no practiques</p>
          </div>
          <div className="divide-y divide-black/5">
            {EJERCICIOS.map(ej => (
              <div key={ej.key} className="px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{ej.icon}</span>
                  <p className="text-sm font-semibold text-[#0A0A0A]">{ej.label}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {!ej.sinPeso && (
                    <div>
                      <label className="text-xs text-[#6B6B6B] mb-1 block">Peso (kg)</label>
                      <div className="relative">
                        <input type="number" step="0.5" value={form[ej.kg]} onChange={e => set(ej.kg, e.target.value)}
                          placeholder="Ej: 80"
                          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] pr-10" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B6B6B]">kg</span>
                      </div>
                    </div>
                  )}
                  {ej.sinPeso && (
                    <div>
                      <label className="text-xs text-[#6B6B6B] mb-1 block">Lastre (kg, opcional)</label>
                      <div className="relative">
                        <input type="number" step="0.5" value={form[ej.kg]} onChange={e => set(ej.kg, e.target.value)}
                          placeholder="0"
                          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] pr-10" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B6B6B]">kg</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-[#6B6B6B] mb-1 block">Repeticiones</label>
                    <div className="relative">
                      <input type="number" value={form[ej.reps]} onChange={e => set(ej.reps, e.target.value)}
                        placeholder="Ej: 5"
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] pr-10" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B6B6B]">reps</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Percepción de progreso */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
          <p className="text-sm font-bold text-[#0A0A0A] mb-1">¿Cómo ves tu progreso este mes?</p>
          <p className="text-xs text-[#6B6B6B] mb-3">1 = Sin mejora · 5 = Mucho mejor que el mes pasado</p>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(v => (
              <button key={v} type="button" onClick={() => set('percepcion_progreso', v)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  form.percepcion_progreso === v
                    ? v <= 2 ? 'bg-red-500 text-white' : v === 3 ? 'bg-amber-400 text-white' : 'bg-emerald-500 text-white'
                    : 'border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'
                }`}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[#6B6B6B]">Sin mejora</span>
            <span className="text-xs text-[#6B6B6B]">Mucho mejor</span>
          </div>
        </div>

        {/* Comentario */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
          <p className="text-sm font-bold text-[#0A0A0A] mb-1.5">¿Algo que contarle a tu entrenador?</p>
          <textarea value={form.comentario} onChange={e => set('comentario', e.target.value)} rows={3}
            className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
            placeholder="Lesión, cambio en la rutina, algo que haya ido especialmente bien o mal..." />
        </div>

        <button onClick={enviar} disabled={guardando}
          className="w-full bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold py-4 rounded-2xl text-base transition-all active:scale-98 disabled:opacity-50">
          {guardando ? 'Enviando...' : '💪 Enviar mis marcas'}
        </button>

        <p className="text-center text-xs text-[#6B6B6B]">Forge Studio OS · Datos protegidos</p>
      </div>
    </div>
  )
}
