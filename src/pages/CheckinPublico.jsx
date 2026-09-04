import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function CheckinPublico() {
  const [clienteSession, setClienteSession] = useState(undefined)
  const [cliente, setCliente] = useState(null)
  const [clienteId, setClienteId] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [paso, setPaso] = useState(1) // 1=objetivo, 2=bienestar, 3=cuéntame
  const [form, setForm] = useState({
    // Bloque 1 — Lo objetivo
    sesiones_semana: null,
    sesiones_planificadas: null,
    cargas_sensacion: null,
    peso: '',
    // Bloque 2 — Cómo estás
    energia: null,
    sueno: null,
    estres: null,
    fatiga: null,
    // Bloque 3 — Cuéntame
    logro_semana: '',
    comentario: '',
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setClienteSession(session?.user || null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setClienteSession(s?.user || null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (clienteSession === undefined) return
    if (!clienteSession) { setLoading(false); return }
    supabase.from('clientes').select('id,nombre,entrenador_id,dias_semana').eq('auth_user_id', clienteSession.id).maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true)
        else { setCliente(data); setClienteId(data.id); setForm(f => ({...f, sesiones_planificadas: data.dias_semana||3})) }
        setLoading(false)
      })
  }, [clienteSession])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function enviar() {
    setSending(true)
    // Calcular adherencia a partir de sesiones reales vs planificadas
    const adherencia = form.sesiones_planificadas && form.sesiones_semana !== null
      ? Math.round((form.sesiones_semana / form.sesiones_planificadas) * 10)
      : null

    await supabase.from('checkins').insert({
      cliente_id: clienteId,
      entrenador_id: cliente.entrenador_id,
      peso: form.peso ? Number(form.peso) : null,
      sesiones_semana: form.sesiones_semana,
      sesiones_planificadas: form.sesiones_planificadas,
      cargas_sensacion: form.cargas_sensacion,
      energia: form.energia,
      sueno: form.sueno,
      estres: form.estres,
      fatiga: form.fatiga,
      adherencia_entreno: adherencia,
      logro_semana: form.logro_semana || null,
      comentario: form.comentario || null,
    })
    setEnviado(true)
    setSending(false)
  }

  const pasoCompleto = () => {
    if (paso === 1) return form.sesiones_semana !== null && form.cargas_sensacion !== null
    if (paso === 2) return form.energia !== null && form.sueno !== null && form.estres !== null && form.fatiga !== null
    return true
  }

  if (clienteSession === undefined || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-3xl mb-3">🔗</p>
        <p className="text-[#6B6B6B]">No hemos podido cargar tus datos.</p>
      </div>
    </div>
  )

  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F7F7]">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl">✓</div>
        <h2 className="text-2xl font-bold text-[#111] mb-2">¡Gracias, {cliente.nombre.split(' ')[0]}!</h2>
        <p className="text-[#6B6B6B] text-sm leading-relaxed">Tu entrenador ya tiene tu seguimiento. Cuanto más honestos sean tus respuestas, mejor podrá ajustar tu plan.</p>
        {form.logro_semana && (
          <div className="mt-5 bg-white rounded-2xl border border-black/5 p-4 text-left">
            <p className="text-xs text-[#9B9B9B] mb-1">Tu logro de esta semana 🏆</p>
            <p className="text-sm text-[#0A0A0A] font-medium">"{form.logro_semana}"</p>
          </div>
        )}
      </div>
    </div>
  )

  // Progress bar
  const progreso = (paso / 3) * 100

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <div className="bg-[#111] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#FF5C00] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
                  <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
                  <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
                  <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Check-in semanal</p>
                <p className="text-[#6B6B6B] text-xs">Hola {cliente.nombre.split(' ')[0]} 👋</p>
              </div>
            </div>
            <p className="text-white/40 text-xs">{paso} de 3</p>
          </div>
          {/* Progress */}
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF5C00] rounded-full transition-all duration-500" style={{width:`${progreso}%`}}/>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-10 space-y-4">

        {/* ── PASO 1: Lo objetivo ── */}
        {paso === 1 && (
          <>
            <div className="pt-2">
              <h2 className="text-lg font-bold text-[#0A0A0A]">Esta semana en números</h2>
              <p className="text-sm text-[#6B6B6B] mt-0.5">La parte más útil para ajustar tu plan</p>
            </div>

            {/* Sesiones completadas */}
            <div className="bg-white rounded-2xl border border-black/5 p-5">
              <p className="text-sm font-bold text-[#0A0A0A] mb-1">¿Cuántos días entrenaste?</p>
              <p className="text-xs text-[#9B9B9B] mb-4">Días reales, no el plan — sé honesto/a</p>
              <div className="flex gap-2">
                {[0,1,2,3,4,5,6,7].map(v => (
                  <button key={v} type="button" onClick={() => set('sesiones_semana', v)}
                    className={`flex-1 aspect-square rounded-xl text-sm font-bold transition-all ${form.sesiones_semana === v ? 'bg-[#FF5C00] text-white shadow-md scale-105' : 'border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]/50'}`}>
                    {v}
                  </button>
                ))}
              </div>
              {form.sesiones_semana !== null && form.sesiones_planificadas && (
                <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium ${
                  form.sesiones_semana >= form.sesiones_planificadas ? 'bg-emerald-50 text-emerald-700' :
                  form.sesiones_semana >= form.sesiones_planificadas * 0.6 ? 'bg-amber-50 text-amber-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {form.sesiones_semana >= form.sesiones_planificadas ? '💪 Semana completa' :
                   form.sesiones_semana === 0 ? '😔 Sin entrenar esta semana — cuéntame qué pasó en el comentario' :
                   `${form.sesiones_semana} de ${form.sesiones_planificadas} días planificados`}
                </div>
              )}
            </div>

            {/* Cargas */}
            <div className="bg-white rounded-2xl border border-black/5 p-5">
              <p className="text-sm font-bold text-[#0A0A0A] mb-1">¿Cómo te han sentado las cargas?</p>
              <p className="text-xs text-[#9B9B9B] mb-4">Pesos, series, repeticiones — ¿están bien ajustados?</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['muy_facil', '😅 Demasiado fácil', 'Podría hacer más'],
                  ['bien', '✅ Ajustado', 'El punto justo'],
                  ['duro', '🔥 Algo duro', 'Me cuesta pero lo hago'],
                  ['muy_duro', '😤 Muy duro', 'Tuve que reducir'],
                ].map(([v, l, sub]) => (
                  <button key={v} type="button" onClick={() => set('cargas_sensacion', v)}
                    className={`p-3 rounded-xl border text-left transition-all ${form.cargas_sensacion === v ? 'border-[#FF5C00] bg-[#FF5C00]/5' : 'border-black/10 hover:border-[#FF5C00]/30'}`}>
                    <p className={`text-xs font-bold ${form.cargas_sensacion === v ? 'text-[#FF5C00]' : 'text-[#0A0A0A]'}`}>{l}</p>
                    <p className="text-xs text-[#9B9B9B] mt-0.5">{sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Peso — opcional */}
            <div className="bg-white rounded-2xl border border-black/5 p-5">
              <p className="text-sm font-bold text-[#0A0A0A] mb-1">Peso esta semana <span className="text-[#9B9B9B] font-normal text-xs">— opcional</span></p>
              <input type="number" step="0.1" value={form.peso} onChange={e => set('peso', e.target.value)}
                className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5C00] mt-2"
                placeholder="70.5 kg"/>
            </div>
          </>
        )}

        {/* ── PASO 2: Cómo estás ── */}
        {paso === 2 && (
          <>
            <div className="pt-2">
              <h2 className="text-lg font-bold text-[#0A0A0A]">¿Cómo estás?</h2>
              <p className="text-sm text-[#6B6B6B] mt-0.5">Esto me ayuda a entender cómo te encuentra el cuerpo</p>
            </div>

            {[
              { field: 'energia', label: '⚡ Energía esta semana', desc: 'En general, ¿cómo ha estado tu nivel de energía?', opciones: [[1,'💀 Agotado'],[2,'😔 Bajo'],[3,'😐 Normal'],[4,'😊 Bueno'],[5,'🚀 Al 100%']] },
              { field: 'sueno', label: '😴 Calidad del sueño', desc: '¿Cómo has dormido esta semana?', opciones: [[1,'Muy mal'],[2,'Mal'],[3,'Regular'],[4,'Bien'],[5,'Muy bien']] },
              { field: 'estres', label: '🧠 Estrés o carga mental', desc: 'Trabajo, estudios, vida personal… (1 = sin estrés, 10 = desbordado)', opciones: [[1,'1'],[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6'],[7,'7'],[8,'8'],[9,'9'],[10,'10']], red: true },
              { field: 'fatiga', label: '💪 Fatiga muscular', desc: 'Cómo notas el cuerpo físicamente (1 = fresco, 10 = destrozado)', opciones: [[1,'1'],[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6'],[7,'7'],[8,'8'],[9,'9'],[10,'10']], red: true },
            ].map(({ field, label, desc, opciones, red }) => (
              <div key={field} className="bg-white rounded-2xl border border-black/5 p-5">
                <p className="text-sm font-bold text-[#0A0A0A] mb-1">{label}</p>
                <p className="text-xs text-[#9B9B9B] mb-4">{desc}</p>
                <div className="space-y-2">
                  {opciones.map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set(field, v)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        form[field] === v
                          ? red && v >= 4 ? 'border-red-400 bg-red-50' : 'border-[#FF5C00] bg-[#FF5C00]/5'
                          : 'border-black/10 hover:border-black/20'
                      }`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        form[field] === v
                          ? red && v >= 4 ? 'border-red-400' : 'border-[#FF5C00]'
                          : 'border-black/20'
                      }`}>
                        {form[field] === v && <div className={`w-2.5 h-2.5 rounded-full ${red && v >= 4 ? 'bg-red-400' : 'bg-[#FF5C00]'}`}/>}
                      </div>
                      <span className={`text-sm font-medium ${form[field] === v ? red && v >= 4 ? 'text-red-700' : 'text-[#FF5C00]' : 'text-[#0A0A0A]'}`}>{l}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── PASO 3: Cuéntame ── */}
        {paso === 3 && (
          <>
            <div className="pt-2">
              <h2 className="text-lg font-bold text-[#0A0A0A]">Cuéntame</h2>
              <p className="text-sm text-[#6B6B6B] mt-0.5">Lo que no cabe en los números — opcional pero muy valioso</p>
            </div>

            <div className="bg-white rounded-2xl border border-black/5 p-5">
              <p className="text-sm font-bold text-[#0A0A0A] mb-1">🏆 ¿Cuál fue tu logro de esta semana?</p>
              <p className="text-xs text-[#9B9B9B] mb-3">Puede ser grande o pequeño — lo que a ti te haya parecido un avance</p>
              <textarea value={form.logro_semana} onChange={e => set('logro_semana', e.target.value)} rows={2}
                className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                placeholder="Ej: Por primera vez hice las 5 series completas sin parar"/>
            </div>

            <div className="bg-white rounded-2xl border border-black/5 p-5">
              <p className="text-sm font-bold text-[#0A0A0A] mb-1">💬 ¿Algo más que quieras contarme?</p>
              <p className="text-xs text-[#9B9B9B] mb-3">Dudas, molestias, cambios en tu vida, lo que sea. Tu entrenador lo leerá.</p>
              <textarea value={form.comentario} onChange={e => set('comentario', e.target.value)} rows={4}
                className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                placeholder="Esta semana tuve mucho trabajo y no dormí bien. También noté que el hombro me molesta un poco en el press..."/>
            </div>

            {/* Resumen antes de enviar */}
            <div className="bg-[#F0EEE8] rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wide mb-3">Resumen de tu semana</p>
              {[
                ['📅 Días entrenados', form.sesiones_semana !== null ? `${form.sesiones_semana} días` : '—'],
                ['🏋️ Cargas', {muy_facil:'Demasiado fácil',bien:'Ajustadas',duro:'Algo duras',muy_duro:'Muy duras'}[form.cargas_sensacion] || '—'],
                ['⚡ Energía', form.energia ? ['','💀','😔','😐','😊','🚀'][form.energia] + ' ' + form.energia + '/5' : '—'],
                ['😴 Sueño', form.sueno ? ['','Muy mal','Mal','Regular','Bien','Muy bien'][form.sueno] : '—'],
                ['🧠 Estrés', form.estres ? form.estres + '/10' : '—'],
                ['💪 Fatiga', form.fatiga ? form.fatiga + '/10' : '—'],
              ].map(([k,v]) => (
                <div key={k} className="flex items-center justify-between">
                  <p className="text-xs text-[#6B6B6B]">{k}</p>
                  <p className="text-xs font-semibold text-[#0A0A0A]">{v}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Navegación */}
        <div className="flex gap-3 pt-2">
          {paso > 1 && (
            <button onClick={() => setPaso(p => p - 1)}
              className="flex-1 border border-black/15 text-[#6B6B6B] font-semibold py-4 rounded-2xl text-sm hover:bg-[#F0EEE8] transition-all">
              ← Atrás
            </button>
          )}
          {paso < 3 ? (
            <button onClick={() => setPaso(p => p + 1)} disabled={!pasoCompleto()}
              className="flex-1 bg-[#FF5C00] text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-all active:scale-98">
              Siguiente →
            </button>
          ) : (
            <button onClick={enviar} disabled={sending}
              className="flex-1 bg-[#FF5C00] text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-50 transition-all">
              {sending ? 'Enviando...' : 'Enviar check-in 💪'}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-[#9B9B9B]">Forge Studio OS · Tus datos están protegidos</p>
      </div>
    </div>
  )
}
