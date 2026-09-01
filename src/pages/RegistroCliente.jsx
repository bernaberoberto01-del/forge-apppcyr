import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Constantes ────────────────────────────────────────────────────────────────
const BLOQUES = [
  'Quién eres',
  'Tu objetivo',
  'Tu situación actual',
  'Lo que no ha funcionado',
  'Tu disponibilidad',
  'Expectativas',
]

const OBJETIVOS = [
  { v: 'perdida_grasa',       l: 'Perder grasa y definirme',              emoji: '🔥' },
  { v: 'ganancia_muscular',   l: 'Ganar músculo y fuerza',                emoji: '💪' },
  { v: 'rendimiento',         l: 'Mejorar mi rendimiento deportivo',       emoji: '🏃' },
  { v: 'salud_general',       l: 'Sentirme mejor y tener más energía',     emoji: '✨' },
  { v: 'cambio_rapido_30dias',l: 'Las dos primeras a la vez',              emoji: '⚡' },
]

const MATERIALES = [
  { v: 'sin_material',    l: 'Sin material',           sub: 'Solo cuerpo' },
  { v: 'material_basico', l: 'Mancuernas y gomas',     sub: 'En casa' },
  { v: 'gimnasio',        l: 'Gimnasio completo',       sub: 'Máquinas y pesas' },
]

// ─── Componentes base ──────────────────────────────────────────────────────────
const Input = ({ label, value, onChange, type='text', placeholder='', required=false, small=false }) => (
  <div>
    {label && <label className="block text-sm font-semibold text-[#0A0A0A] mb-1.5">{label}{required && <span className="text-[#FF5C00] ml-1">*</span>}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className={`w-full border border-black/10 rounded-xl px-4 ${small?'py-2':'py-3'} text-sm focus:outline-none focus:border-[#FF5C00] bg-white`}/>
  </div>
)

const Textarea = ({ label, value, onChange, placeholder='', rows=3 }) => (
  <div>
    {label && <label className="block text-sm font-semibold text-[#0A0A0A] mb-1.5">{label}</label>}
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5C00] resize-none bg-white"/>
  </div>
)

// ─── Componente principal ──────────────────────────────────────────────────────
export default function RegistroCliente() {
  const [entrenadorId, setEntrenadorId] = useState(null)
  const [paso, setPaso] = useState(0)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [form, setForm] = useState({
    // Bloque 1
    nombre: '', email: '', edad: '', sexo: '', ciudad: '',
    // Bloque 2
    objetivo: '',
    // Bloque 3
    entrenas_ahora: '',
    dias_semana: 3,
    donde_entrena: '',
    alimentacion_actual: '',
    anos_intentando: '',
    // Bloque 4
    que_no_funciono: '',
    // Bloque 5
    disponibilidad_dias: 3,
    material: '',
    tiene_lesion: false,
    lesiones: '',
    // Bloque 6
    expectativas_30dias: '',
    tiempo_semanal: '',
    acepta_rgpd: false,
  })

  const set = (k, v) => { setError(''); setForm(f => ({ ...f, [k]: v })) }

  useEffect(() => {
    const uid = new URLSearchParams(window.location.search).get('e')
    if (uid) setEntrenadorId(uid)
  }, [])

  function validar() {
    if (paso === 0) {
      if (!form.nombre.trim()) return 'El nombre es obligatorio'
      if (!form.email.trim() || !form.email.includes('@')) return 'Email válido obligatorio'
      if (!form.edad) return 'La edad es obligatoria'
      if (!form.sexo) return 'Selecciona tu sexo biológico'
    }
    if (paso === 1) {
      if (!form.objetivo) return 'Selecciona tu objetivo principal'
    }
    if (paso === 2) {
      if (!form.entrenas_ahora) return 'Indica si entrenas actualmente'
    }
    if (paso === 4) {
      if (!form.material) return 'Indica el material disponible'
    }
    if (paso === 5) {
      if (!form.expectativas_30dias.trim()) return 'Cuéntanos qué esperas en los primeros 30 días'
      if (!form.acepta_rgpd) return 'Debes aceptar la política de privacidad'
    }
    return ''
  }

  function siguiente() {
    const err = validar()
    if (err) { setError(err); return }
    setPaso(p => p + 1)
    window.scrollTo(0, 0)
  }

  async function enviar() {
    const err = validar()
    if (err) { setError(err); return }
    if (!entrenadorId) { setError('Enlace de registro no válido'); return }
    setEnviando(true)

    const payload = {
      entrenador_id: entrenadorId,
      nombre: form.nombre.trim(),
      email: form.email.trim().toLowerCase(),
      edad: Number(form.edad) || null,
      sexo: form.sexo || null,
      ciudad: form.ciudad.trim() || null,
      objetivo: form.objetivo,
      entrenas_ahora: form.entrenas_ahora,
      dias_semana: Number(form.disponibilidad_dias) || 3,
      donde_entrena: form.donde_entrena.trim() || null,
      alimentacion_actual: form.alimentacion_actual.trim() || null,
      anos_entrenando: form.anos_intentando ? Number(form.anos_intentando) : null,
      que_no_funciono: form.que_no_funciono.trim() || null,
      material: form.material,
      tiene_lesion: form.tiene_lesion,
      lesiones: form.lesiones.trim() || null,
      expectativas_30dias: form.expectativas_30dias.trim(),
      tiempo_semanal: form.tiempo_semanal.trim() || null,
      tipo: 'online',
      procesado: false,
      acepta_rgpd: form.acepta_rgpd,
      fecha_consentimiento: new Date().toISOString(),
    }

    const { error: err2 } = await supabase.from('cuestionarios').insert(payload)
    if (err2) { setError('Error al enviar. Inténtalo de nuevo.'); setEnviando(false); return }

    // Lanzar análisis IA en background (no bloqueante)
    supabase.functions.invoke('analizar-diagnostico', {
      body: { entrenador_id: entrenadorId, email: form.email.trim().toLowerCase() }
    }).catch(() => {})

    setEnviado(true)
    setEnviando(false)
  }

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (enviado) return (
    <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl">✓</div>
        <h2 className="text-2xl font-bold text-[#0A0A0A] mb-2">¡Recibido, {form.nombre.split(' ')[0]}!</h2>
        <p className="text-[#6B6B6B] text-sm leading-relaxed">
          Analizaremos tu situación y en menos de 24h te enviamos una recomendación personalizada con el plan que mejor encaja contigo.
        </p>
        <div className="mt-6 bg-white rounded-2xl border border-black/5 p-4 text-left space-y-2">
          <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide">Qué pasa ahora</p>
          {[
            ['📋', 'Revisamos tu diagnóstico'],
            ['🤖', 'La IA analiza tu situación'],
            ['📬', 'Te enviamos nuestra recomendación'],
            ['💳', 'Pagas solo si estás de acuerdo'],
          ].map(([ic, txt]) => (
            <div key={txt} className="flex items-center gap-3">
              <span className="text-base flex-shrink-0">{ic}</span>
              <p className="text-sm text-[#0A0A0A]">{txt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const progreso = ((paso) / BLOQUES.length) * 100

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* Header */}
      <div className="bg-[#111] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
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
                <p className="text-white font-semibold text-sm">Diagnóstico inicial</p>
                <p className="text-[#6B6B6B] text-xs">{BLOQUES[paso]}</p>
              </div>
            </div>
            <p className="text-white/40 text-xs">{paso + 1} / {BLOQUES.length}</p>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF5C00] rounded-full transition-all duration-500" style={{width:`${progreso}%`}}/>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-12 space-y-4">

        {/* ── BLOQUE 1: Quién eres ── */}
        {paso === 0 && (
          <>
            <div className="pt-2">
              <h2 className="text-xl font-bold text-[#0A0A0A]">Cuéntanos quién eres</h2>
              <p className="text-sm text-[#6B6B6B] mt-1">Información básica para personalizar tu plan</p>
            </div>

            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
              <Input label="Nombre completo" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Tu nombre" required/>
              <Input label="Email" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="tu@email.com" required/>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Edad" type="number" value={form.edad} onChange={e=>set('edad',e.target.value)} placeholder="28" required/>
                <Input label="Ciudad" value={form.ciudad} onChange={e=>set('ciudad',e.target.value)} placeholder="Murcia"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Sexo biológico <span className="text-[#FF5C00]">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[['hombre','Hombre'],['mujer','Mujer']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => set('sexo', v)}
                      className={`py-3 rounded-xl border text-sm font-semibold transition-all ${form.sexo===v?'border-[#FF5C00] bg-[#FF5C00]/5 text-[#FF5C00]':'border-black/10 text-[#6B6B6B]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#9B9B9B] mt-1.5">Lo usamos para calcular parámetros fisiológicos correctos</p>
              </div>
            </div>
          </>
        )}

        {/* ── BLOQUE 2: Objetivo ── */}
        {paso === 1 && (
          <>
            <div className="pt-2">
              <h2 className="text-xl font-bold text-[#0A0A0A]">¿Cuál es tu objetivo?</h2>
              <p className="text-sm text-[#6B6B6B] mt-1">Elige el que mejor describe lo que quieres conseguir</p>
            </div>

            <div className="space-y-2">
              {OBJETIVOS.map(({ v, l, emoji }) => (
                <button key={v} type="button" onClick={() => set('objetivo', v)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${form.objetivo===v?'border-[#FF5C00] bg-[#FF5C00]/5':'border-black/10 bg-white hover:border-black/20'}`}>
                  <span className="text-2xl flex-shrink-0">{emoji}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${form.objetivo===v?'text-[#FF5C00]':'text-[#0A0A0A]'}`}>{l}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${form.objetivo===v?'border-[#FF5C00]':'border-black/20'}`}>
                    {form.objetivo===v && <div className="w-2.5 h-2.5 rounded-full bg-[#FF5C00]"/>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── BLOQUE 3: Situación actual ── */}
        {paso === 2 && (
          <>
            <div className="pt-2">
              <h2 className="text-xl font-bold text-[#0A0A0A]">Tu situación actual</h2>
              <p className="text-sm text-[#6B6B6B] mt-1">Queremos entender de dónde partes</p>
            </div>

            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">¿Entrenas ahora mismo? <span className="text-[#FF5C00]">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {[['si','Sí'],['aveces','A veces'],['no','No']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => set('entrenas_ahora', v)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${form.entrenas_ahora===v?'border-[#FF5C00] bg-[#FF5C00]/5 text-[#FF5C00]':'border-black/10 text-[#6B6B6B]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {(form.entrenas_ahora === 'si' || form.entrenas_ahora === 'aveces') && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Días por semana que entrenas</label>
                    <div className="flex gap-2">
                      {[1,2,3,4,5,6,7].map(n => (
                        <button key={n} type="button" onClick={() => set('dias_semana', n)}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${form.dias_semana===n?'bg-[#FF5C00] text-white border-[#FF5C00]':'border-black/10 text-[#6B6B6B]'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input label="¿Dónde entrenas?" value={form.donde_entrena} onChange={e=>set('donde_entrena',e.target.value)} placeholder="Gimnasio, en casa, parque…"/>
                </>
              )}

              <Textarea label="¿Cómo describes tu alimentación ahora?" value={form.alimentacion_actual} onChange={e=>set('alimentacion_actual',e.target.value)}
                placeholder="Sé honesto/a. Ej: Como bastante bien entre semana pero los fines de semana me descontrolo. No desayuno casi nunca..."/>

              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">¿Cuánto tiempo llevas intentando conseguir tu objetivo?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['menos_mes','Menos de 1 mes'],['1_3_meses','1-3 meses'],['3_12_meses','3-12 meses'],['mas_1_año','Más de un año']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => set('anos_intentando', v)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-left transition-all ${form.anos_intentando===v?'border-[#FF5C00] bg-[#FF5C00]/5 text-[#FF5C00]':'border-black/10 text-[#6B6B6B]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── BLOQUE 4: Lo que no ha funcionado ── */}
        {paso === 3 && (
          <>
            <div className="pt-2">
              <h2 className="text-xl font-bold text-[#0A0A0A]">Lo que no ha funcionado</h2>
              <p className="text-sm text-[#6B6B6B] mt-1">Esta es la parte más importante para nosotros. Sin filtros.</p>
            </div>

            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
              <Textarea
                label="¿Has intentado cambiar algo antes? ¿Qué pasó?"
                value={form.que_no_funciono}
                onChange={e => set('que_no_funciono', e.target.value)}
                rows={5}
                placeholder="Ej: Empecé a ir al gimnasio hace un año pero lo dejé al mes porque no sabía qué hacer y me aburrí. También probé una dieta de Instagram que aguanté dos semanas..."
              />
              <div className="bg-[#F7F6F3] rounded-xl p-3">
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  💡 Cuanto más detallado, mejor. Entender qué ha fallado antes es lo que nos permite diseñar algo que sí funcione para ti.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── BLOQUE 5: Disponibilidad ── */}
        {paso === 4 && (
          <>
            <div className="pt-2">
              <h2 className="text-xl font-bold text-[#0A0A0A]">Tu disponibilidad</h2>
              <p className="text-sm text-[#6B6B6B] mt-1">Diseñamos el plan en torno a tu vida real, no al revés</p>
            </div>

            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Días disponibles para entrenar <span className="text-[#FF5C00]">*</span></label>
                <div className="flex gap-1.5">
                  {[2,3,4,'5+'].map(n => (
                    <button key={n} type="button" onClick={() => set('disponibilidad_dias', n)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${form.disponibilidad_dias===n?'bg-[#FF5C00] text-white border-[#FF5C00]':'border-black/10 text-[#6B6B6B]'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Material disponible <span className="text-[#FF5C00]">*</span></label>
                <div className="space-y-2">
                  {MATERIALES.map(({ v, l, sub }) => (
                    <button key={v} type="button" onClick={() => set('material', v)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${form.material===v?'border-[#FF5C00] bg-[#FF5C00]/5':'border-black/10 hover:border-black/20'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${form.material===v?'border-[#FF5C00]':'border-black/20'}`}>
                        {form.material===v && <div className="w-2.5 h-2.5 rounded-full bg-[#FF5C00]"/>}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${form.material===v?'text-[#FF5C00]':'text-[#0A0A0A]'}`}>{l}</p>
                        <p className="text-xs text-[#9B9B9B]">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">¿Tienes alguna lesión o condición física?</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[['false','No'],['true','Sí']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => set('tiene_lesion', v==='true')}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${String(form.tiene_lesion)===v?'border-[#FF5C00] bg-[#FF5C00]/5 text-[#FF5C00]':'border-black/10 text-[#6B6B6B]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {form.tiene_lesion && (
                  <Input value={form.lesiones} onChange={e=>set('lesiones',e.target.value)} placeholder="Ej: Rodilla derecha, hernia lumbar L4-L5…"/>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── BLOQUE 6: Expectativas ── */}
        {paso === 5 && (
          <>
            <div className="pt-2">
              <h2 className="text-xl font-bold text-[#0A0A0A]">Para terminar</h2>
              <p className="text-sm text-[#6B6B6B] mt-1">Ayúdanos a entender qué esperas y qué tiempo tienes</p>
            </div>

            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-5">
              <Textarea
                label="¿Qué esperas conseguir en los primeros 30 días?"
                value={form.expectativas_30dias}
                onChange={e => set('expectativas_30dias', e.target.value)}
                rows={4}
                placeholder="Ej: Me gustaría bajar 3-4kg, empezar a notar más energía por las mañanas y establecer una rutina de entrenamiento que pueda mantener..."
              />

              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Tiempo real disponible por semana</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['menos_3h','Menos de 3h'],['3_5h','3-5 horas'],['5_8h','5-8 horas'],['mas_8h','Más de 8h']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => set('tiempo_semanal', v)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${form.tiempo_semanal===v?'border-[#FF5C00] bg-[#FF5C00]/5 text-[#FF5C00]':'border-black/10 text-[#6B6B6B]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* RGPD */}
              <button type="button" onClick={() => set('acepta_rgpd', !form.acepta_rgpd)}
                className="w-full flex items-start gap-3 text-left">
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${form.acepta_rgpd?'bg-[#FF5C00] border-[#FF5C00]':'border-black/20'}`}>
                  {form.acepta_rgpd && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Acepto que mis datos sean tratados para recibir un plan personalizado. 
                  No compartimos tu información con terceros. <span className="text-[#FF5C00]">*</span>
                </p>
              </button>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Navegación */}
        <div className="flex gap-3 pt-2">
          {paso > 0 && (
            <button onClick={() => { setPaso(p=>p-1); setError(''); window.scrollTo(0,0) }}
              className="flex-1 border border-black/15 text-[#6B6B6B] font-semibold py-4 rounded-2xl text-sm hover:bg-[#F0EEE8] transition-all">
              ← Atrás
            </button>
          )}
          {paso < BLOQUES.length - 1 ? (
            <button onClick={siguiente}
              className="flex-1 bg-[#FF5C00] text-white font-bold py-4 rounded-2xl text-sm hover:bg-[#e05200] transition-all active:scale-98">
              Siguiente →
            </button>
          ) : (
            <button onClick={enviar} disabled={enviando}
              className="flex-1 bg-[#FF5C00] text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-50 transition-all">
              {enviando ? 'Enviando…' : 'Enviar diagnóstico 📋'}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-[#9B9B9B]">Forge Studio · Tus datos están protegidos</p>
      </div>
    </div>
  )
}
