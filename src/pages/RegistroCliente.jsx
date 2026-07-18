import { useState, useCallback, useEffect } from 'react'
import { TIPOS_ENTRENAMIENTO } from '../utils/tiposEntrenamiento'
import { supabase } from '../lib/supabase'

const PASOS = ['Datos personales','Tu objetivo','Experiencia','Marcas básicas','Material y horario','Salud','Expectativas']

const init = {
  nombre:'', email:'', telefono:'', edad:'', sexo:'', peso_actual:'', altura:'', tipo:'presencial',
  objetivo:'', objetivo_detalle:'', plazo:'3_meses', tipo_entrenamiento:'', acepta_rgpd: false, acepta_ia: false,
  nivel:'principiante', anos_entrenando:0,
  marca_press_banca:'', marca_sentadilla:'', marca_peso_muerto:'', marca_dominadas:'', marca_flexiones:'', marca_press_militar:'',
  material:'gimnasio', dias_semana:3, duracion_sesion:60, horario_preferido:'',
  lesiones:'', enfermedades:'', medicacion:'',
  motivacion:'', experiencias_anteriores:'', compromisos:'', como_nos_conocio:''
}

// Componentes FUERA del componente principal para evitar pérdida de foco
const Input = ({ label, value, onChange, type='text', placeholder='', required=false }) => (
  <div>
    <label className="block text-sm font-semibold text-[#0A0A0A] mb-1.5">
      {label}{required && <span className="text-[#FF5C00] ml-1">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5C00] transition-colors bg-white"
    />
  </div>
)

const Textarea = ({ label, value, onChange, placeholder='' }) => (
  <div>
    <label className="block text-sm font-semibold text-[#0A0A0A] mb-1.5">{label}</label>
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={3}
      className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5C00] resize-none bg-white"
    />
  </div>
)

const Select = ({ label, value, onChange, options, required=false }) => (
  <div>
    <label className="block text-sm font-semibold text-[#0A0A0A] mb-1.5">
      {label}{required && <span className="text-[#FF5C00] ml-1">*</span>}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5C00] bg-white"
    >
      <option value="">Selecciona...</option>
      {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>
)

export default function RegistroCliente() {
  const [paso, setPaso] = useState(0)
  const [bloques, setBloques] = useState({ basico:true, objetivo:true, historial:true, disponibilidad:true, material:true, salud:true, motivacion:true })

  // Cargar bloques del entrenador desde la URL
  useEffect(() => {
    const uid = new URLSearchParams(window.location.search).get('e')
    if (!uid) return
    supabase.from('configuracion').select('cuestionario_bloques').eq('entrenador_id', uid).single()
      .then(({ data }) => { if (data?.cuestionario_bloques) setBloques(b => ({ ...b, ...data.cuestionario_bloques })) })
  }, [])

  // Mapa de paso -> bloque
  const PASO_BLOQUE = ['basico', 'objetivo', 'historial', 'historial', 'material', 'salud', 'motivacion']

  const siguiente = () => {
    if (!validarPaso()) return
    let next = paso + 1
    // Saltar pasos desactivados
    while (next < PASOS.length - 1 && PASO_BLOQUE[next] && !bloques[PASO_BLOQUE[next]]) next++
    setPaso(Math.min(next, PASOS.length - 1))
  }

  const anterior2 = () => {
    setError('')
    let prev = paso - 1
    while (prev > 0 && PASO_BLOQUE[prev] && !bloques[PASO_BLOQUE[prev]]) prev--
    setPaso(Math.max(prev, 0))
  }
  const [form, setForm] = useState(init)
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const params = new URLSearchParams(window.location.search)
  const entrenadorId = params.get('e')

  const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), [])

  const validarPaso = () => {
    if (paso === 0 && (!form.nombre || !form.email)) { setError('Nombre y email son obligatorios'); return false }
    if (paso === 1 && !form.objetivo) { setError('Selecciona tu objetivo'); return false }
    setError(''); return true
  }



  const enviar = async () => {
    if (!validarPaso()) return
    setLoading(true)
    try {
      const { error: err } = await supabase.from('cuestionarios').insert({
        entrenador_id: entrenadorId,
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono || null,
        edad: form.edad ? Number(form.edad) : null,
        sexo: form.sexo || null,
        peso_actual: form.peso_actual ? Number(form.peso_actual) : null,
        altura: form.altura ? Number(form.altura) : null,
        objetivo: form.objetivo || null,
        objetivo_detalle: form.objetivo_detalle || null,
        plazo: form.plazo || null,
        nivel: form.nivel || null,
        anos_entrenando: form.anos_entrenando ? Number(form.anos_entrenando) : 0,
        marca_press_banca: form.marca_press_banca || null,
        marca_sentadilla: form.marca_sentadilla || null,
        marca_peso_muerto: form.marca_peso_muerto || null,
        marca_dominadas: form.marca_dominadas || null,
        marca_flexiones: form.marca_flexiones || null,
        marca_press_militar: form.marca_press_militar || null,
        material: form.material || null,
        dias_semana: form.dias_semana ? Number(form.dias_semana) : 3,
        duracion_sesion: form.duracion_sesion ? Number(form.duracion_sesion) : 60,
        horario_preferido: form.horario_preferido || null,
        lesiones: form.lesiones || null,
        enfermedades: form.enfermedades || null,
        medicacion: form.medicacion || null,
        motivacion: form.motivacion || null,
        experiencias_anteriores: form.experiencias_anteriores || null,
        compromisos: form.compromisos || null,
        como_nos_conocio: form.como_nos_conocio || null,
        tipo_entrenamiento: form.tipo_entrenamiento || null,
        acepta_rgpd: form.acepta_rgpd || false,
        acepta_ia: form.acepta_ia || false,
        fecha_consentimiento: new Date().toISOString(),
        procesado: false,
      })
      if (err) throw err
      setEnviado(true)
    } catch(e) {
      setError('Error al enviar: ' + e.message)
    }
    setLoading(false)
  }

  if (!entrenadorId) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F0]">
      <div className="text-center"><p className="text-3xl mb-2">🔗</p><p className="text-[#6B6B6B]">Enlace no válido</p></div>
    </div>
  )

  if (enviado) return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl">✓</div>
        <h2 className="text-2xl font-bold text-[#0A0A0A] mb-3">¡Todo listo!</h2>
        <p className="text-[#6B6B6B] leading-relaxed text-sm">Tu cuestionario ha sido enviado. Tu entrenador lo revisará y recibirás tu plan personalizado en breve.</p>
        <div className="mt-5 bg-[#FF5C00]/8 border border-[#FF5C00]/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-[#FF5C00]">Próximos pasos</p>
          <p className="text-xs text-[#6B6B6B] mt-1">Recibirás tu rutina personalizada en las próximas 24-48 horas.</p>
        </div>
      </div>
    </div>
  )

  const progreso = (paso / (PASOS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Header fijo */}
      <div className="bg-[#111] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#FF5C00] rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
                  <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
                  <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
                  <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
                </svg>
              </div>
              <span className="text-white font-semibold text-sm">Forge</span>
            </div>
            <span className="text-white/40 text-xs">{paso + 1} / {PASOS.length}</span>
          </div>
          <div className="bg-white/10 rounded-full h-1.5 mb-2">
            <div className="bg-[#FF5C00] h-1.5 rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
          </div>
          <p className="text-white font-semibold text-sm">{PASOS[paso]}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-8">
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 mt-2">

          {/* PASO 0 — Datos personales */}
          {paso === 0 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#0A0A0A]">Cuéntanos sobre ti</h2>
                <p className="text-sm text-[#6B6B6B] mt-0.5">Esta información nos ayuda a personalizar tu plan al máximo.</p>
              </div>
              <Input label="Nombre completo" value={form.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="Tu nombre y apellidos" />
              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Modalidad de entrenamiento</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['presencial','📍 Presencial','Entrenas en persona con tu entrenador'],
                    ['online','🌐 Online','Seguimiento y rutinas a distancia'],
                  ].map(([v,l,d]) => (
                    <button key={v} type="button" onClick={() => set('tipo', v)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${form.tipo===v ? 'bg-[#FF5C00] border-[#FF5C00]' : 'border-black/10 hover:border-[#FF5C00]/50'}`}>
                      <p className={`text-sm font-semibold ${form.tipo===v ? 'text-white' : 'text-[#0A0A0A]'}`}>{l}</p>
                      <p className={`text-xs mt-0.5 ${form.tipo===v ? 'text-white/80' : 'text-[#6B6B6B]'}`}>{d}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Email" value={form.email} onChange={e => set('email', e.target.value)} type="email" required placeholder="tu@email.com" />
              <Input label="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} type="tel" placeholder="+34 600 000 000" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Edad" value={form.edad} onChange={e => set('edad', e.target.value)} type="number" placeholder="25" />
                <Select label="Sexo" value={form.sexo} onChange={e => set('sexo', e.target.value)} options={[['hombre','Hombre'],['mujer','Mujer'],['otro','Otro']]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Peso actual (kg)" value={form.peso_actual} onChange={e => set('peso_actual', e.target.value)} type="number" placeholder="75" />
                <Input label="Altura (cm)" value={form.altura} onChange={e => set('altura', e.target.value)} type="number" placeholder="175" />
              </div>
            </div>
          )}

          {/* PASO 1 — Objetivo */}
          {paso === 1 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#0A0A0A]">¿Qué quieres conseguir?</h2>
                <p className="text-sm text-[#6B6B6B] mt-0.5">Cuanto más claro seas, mejor podremos ayudarte.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Objetivo principal <span className="text-[#FF5C00]">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['perdida_grasa','🔥 Perder grasa'],
                    ['ganancia_muscular','💪 Ganar músculo'],
                    ['tonificacion','✨ Tonificarme'],
                    ['fuerza','🏋️ Ganar fuerza'],
                    ['rendimiento','⚡ Rendimiento'],
                    ['cambio_rapido_30dias','🚀 Cambio 30 días'],
                  ].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => set('objetivo', v)}
                      className={`p-3.5 rounded-xl border text-sm font-medium text-left transition-all ${form.objetivo===v ? 'bg-[#FF5C00] text-white border-[#FF5C00]' : 'border-black/10 text-[#0A0A0A] hover:border-[#FF5C00]/50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Tipo de entrenamiento preferido</label>
                <p className="text-xs text-[#6B6B6B] mb-3">Tu entrenador lo usará para diseñar tu programa</p>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_ENTRENAMIENTO.map(t => (
                    <button key={t.id} type="button" onClick={() => set('tipo_entrenamiento', t.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${form.tipo_entrenamiento===t.id ? 'bg-[#FF5C00] border-[#FF5C00]' : 'border-black/10 hover:border-[#FF5C00]/50'}`}>
                      <p className={`text-sm font-semibold ${form.tipo_entrenamiento===t.id?'text-white':'text-[#0A0A0A]'}`}>{t.icon} {t.label}</p>
                      <p className={`text-xs mt-0.5 leading-tight ${form.tipo_entrenamiento===t.id?'text-white/80':'text-[#6B6B6B]'}`}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Textarea label="Descríbelo con tus palabras" value={form.objetivo_detalle} onChange={e => set('objetivo_detalle', e.target.value)} placeholder="Ej: Quiero perder 8kg antes del verano..." />
              <Select label="¿En qué plazo?" value={form.plazo} onChange={e => set('plazo', e.target.value)} options={[
                ['30_dias','30 días'],['3_meses','3 meses'],['6_meses','6 meses'],['1_ano','1 año'],['sin_prisa','Sin prisa']
              ]} />
            </div>
          )}

          {/* PASO 2 — Experiencia */}
          {paso === 2 && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#0A0A0A]">Tu experiencia</h2>
                <p className="text-sm text-[#6B6B6B] mt-0.5">Adaptamos la intensidad a tu nivel real.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Nivel de entrenamiento</label>
                <div className="space-y-2">
                  {[
                    ['principiante','🌱 Principiante','Menos de 1 año o con poca constancia'],
                    ['intermedio','📈 Intermedio','1-3 años entrenando con regularidad'],
                    ['avanzado','🔥 Avanzado','Más de 3 años, domino los básicos'],
                  ].map(([v,l,d]) => (
                    <button key={v} type="button" onClick={() => set('nivel', v)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${form.nivel===v ? 'bg-[#FF5C00] border-[#FF5C00]' : 'border-black/10 hover:border-[#FF5C00]/50'}`}>
                      <p className={`text-sm font-semibold ${form.nivel===v ? 'text-white' : 'text-[#0A0A0A]'}`}>{l}</p>
                      <p className={`text-xs mt-0.5 ${form.nivel===v ? 'text-white/80' : 'text-[#6B6B6B]'}`}>{d}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Años entrenando: <span className="text-[#FF5C00]">{form.anos_entrenando}</span></label>
                <div className="flex gap-2 flex-wrap">
                  {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
                    <button key={v} type="button" onClick={() => set('anos_entrenando', v)}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${form.anos_entrenando===v ? 'bg-[#FF5C00] text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASO 3 — Marcas */}
          {paso === 3 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#0A0A0A]">Marcas básicas</h2>
                <p className="text-sm text-[#6B6B6B] mt-0.5">Pon el peso máximo que mueves o el número de reps. Si no sabes, déjalo en blanco.</p>
              </div>
              <Input label="Press de banca" value={form.marca_press_banca} onChange={e => set('marca_press_banca', e.target.value)} placeholder="Ej: 80kg × 5 / 20 flexiones" />
              <Input label="Sentadilla" value={form.marca_sentadilla} onChange={e => set('marca_sentadilla', e.target.value)} placeholder="Ej: 100kg × 3" />
              <Input label="Peso muerto" value={form.marca_peso_muerto} onChange={e => set('marca_peso_muerto', e.target.value)} placeholder="Ej: 120kg × 1" />
              <Input label="Dominadas" value={form.marca_dominadas} onChange={e => set('marca_dominadas', e.target.value)} placeholder="Ej: 10 reps o 15kg lastradas" />
              <Input label="Flexiones" value={form.marca_flexiones} onChange={e => set('marca_flexiones', e.target.value)} placeholder="Ej: 30 reps seguidas" />
              <Input label="Press militar" value={form.marca_press_militar} onChange={e => set('marca_press_militar', e.target.value)} placeholder="Ej: 60kg × 5" />
            </div>
          )}

          {/* PASO 4 — Material y horario */}
          {paso === 4 && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#0A0A0A]">Material y disponibilidad</h2>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Material disponible</label>
                <div className="space-y-2">
                  {[
                    ['sin_material','🏠 Sin material','Solo peso corporal, en casa'],
                    ['material_basico','🎽 Material básico','Mancuernas, bandas, barra'],
                    ['gimnasio','🏋️ Gimnasio completo','Acceso a máquinas y peso libre'],
                  ].map(([v,l,d]) => (
                    <button key={v} type="button" onClick={() => set('material', v)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${form.material===v ? 'bg-[#FF5C00] border-[#FF5C00]' : 'border-black/10 hover:border-[#FF5C00]/50'}`}>
                      <p className={`text-sm font-semibold ${form.material===v ? 'text-white' : 'text-[#0A0A0A]'}`}>{l}</p>
                      <p className={`text-xs mt-0.5 ${form.material===v ? 'text-white/80' : 'text-[#6B6B6B]'}`}>{d}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Días disponibles por semana: <span className="text-[#FF5C00]">{form.dias_semana}</span></label>
                <div className="flex gap-2">
                  {[2,3,4,5,6].map(v => (
                    <button key={v} type="button" onClick={() => set('dias_semana', v)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${form.dias_semana===v ? 'bg-[#FF5C00] text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0A0A0A] mb-2">Duración de sesión: <span className="text-[#FF5C00]">{form.duracion_sesion} min</span></label>
                <div className="flex gap-2 flex-wrap">
                  {[30,45,60,75,90].map(v => (
                    <button key={v} type="button" onClick={() => set('duracion_sesion', v)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${form.duracion_sesion===v ? 'bg-[#FF5C00] text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                      {v}min
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Horario preferido" value={form.horario_preferido} onChange={e => set('horario_preferido', e.target.value)} placeholder="Ej: Mañanas antes del trabajo, 7-9am" />
            </div>
          )}

          {/* PASO 5 — Salud */}
          {paso === 5 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#0A0A0A]">Salud y limitaciones</h2>
                <p className="text-sm text-[#6B6B6B] mt-0.5">Importante para adaptar tu plan y evitar lesiones. Todo queda confidencial.</p>
              </div>
              <Textarea label="Lesiones o dolor crónico" value={form.lesiones} onChange={e => set('lesiones', e.target.value)} placeholder="Ej: Lumbar baja recurrente, rodilla derecha operada en 2022..." />
              <Textarea label="Enfermedades o condiciones médicas" value={form.enfermedades} onChange={e => set('enfermedades', e.target.value)} placeholder="Ej: Hipertensión controlada, diabetes tipo 2..." />
              <Input label="Medicación actual (si aplica)" value={form.medicacion} onChange={e => set('medicacion', e.target.value)} placeholder="Ej: Ninguna / Metformina 500mg..." />
            </div>
          )}

          {/* PASO 6 — Expectativas */}
          {paso === 6 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#0A0A0A]">Últimas preguntas</h2>
                <p className="text-sm text-[#6B6B6B] mt-0.5">Esto nos ayuda a entenderte mejor como persona.</p>
              </div>
              <Textarea label="¿Por qué quieres cambiar ahora?" value={form.motivacion} onChange={e => set('motivacion', e.target.value)} placeholder="Qué te ha llevado a dar este paso..." />
              <Textarea label="¿Has intentado algo antes? ¿Qué pasó?" value={form.experiencias_anteriores} onChange={e => set('experiencias_anteriores', e.target.value)} placeholder="Qué has probado, por qué no funcionó..." />
              <Textarea label="¿A qué te comprometes?" value={form.compromisos} onChange={e => set('compromisos', e.target.value)} placeholder="Sé honesto sobre lo que estás dispuesto a hacer..." />
              <Select label="¿Cómo nos has conocido?" value={form.como_nos_conocio} onChange={e => set('como_nos_conocio', e.target.value)} options={[
                ['tiktok','TikTok'],['instagram','Instagram'],['recomendacion','Recomendación'],['google','Google'],['otro','Otro']
              ]} />
            </div>
          )}

          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl mt-4">{error}</p>}
        </div>

        {/* Botones */}
        <div className="flex gap-3 mt-4">
          {paso > 0 && (
            <button onClick={anterior2} className="flex-1 bg-white border border-black/10 text-[#0A0A0A] text-sm font-semibold py-4 rounded-2xl transition-all active:scale-95">
              ← Anterior
            </button>
          )}
          {paso === PASOS.length - 1 && (
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.acepta_rgpd} onChange={e => set('acepta_rgpd', e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#FF5C00] flex-shrink-0" />
                <span className="text-xs text-[#6B6B6B] leading-relaxed">
                  He leído y acepto la <span className="text-[#FF5C00] underline cursor-pointer" onClick={() => window.open('/privacidad', '_blank')}>Política de Privacidad</span> y el tratamiento de mis datos personales y de salud conforme al RGPD.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.acepta_ia || false} onChange={e => set('acepta_ia', e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#FF5C00] flex-shrink-0" />
                <span className="text-xs text-[#6B6B6B] leading-relaxed">
                  Entiendo y acepto que mis datos (objetivo, nivel, lesiones y métricas de seguimiento) serán procesados por sistemas de Inteligencia Artificial (Anthropic/Claude) para generar rutinas, planes nutricionales y análisis personalizados. Este procesamiento es necesario para el servicio.
                </span>
              </label>
            </div>
          )}
          {paso < PASOS.length - 1 ? (
            <button onClick={siguiente} className="flex-1 bg-[#FF5C00] hover:bg-[#E05200] text-white text-sm font-bold py-4 rounded-2xl transition-all active:scale-95">
              Siguiente →
            </button>
          ) : (
            <button onClick={enviar} disabled={loading || !form.acepta_rgpd || !form.acepta_ia} className="flex-1 bg-[#111] text-white text-sm font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-40">
              {loading ? 'Enviando...' : '✅ Enviar cuestionario'}
            </button>
          )}
        </div>
        <p className="text-center text-xs text-[#6B6B6B] mt-4">Forge Studio OS · Tus datos están protegidos</p>
      </div>
    </div>
  )
}
