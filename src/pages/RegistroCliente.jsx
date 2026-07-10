import { useState } from 'react'
import { supabase } from '../lib/supabase'

const PASOS = [
  'Datos personales',
  'Tu objetivo',
  'Experiencia',
  'Marcas básicas',
  'Material y horario',
  'Salud',
  'Expectativas'
]

const init = {
  nombre:'', email:'', telefono:'', edad:'', sexo:'', peso_actual:'', altura:'',
  objetivo:'', objetivo_detalle:'', plazo:'3_meses',
  nivel:'principiante', anos_entrenando:0,
  marca_press_banca:'', marca_sentadilla:'', marca_peso_muerto:'', marca_dominadas:'', marca_flexiones:'', marca_press_militar:'',
  material:'gimnasio', dias_semana:3, duracion_sesion:60, horario_preferido:'',
  lesiones:'', enfermedades:'', medicacion:'',
  motivacion:'', experiencias_anteriores:'', compromisos:'', como_nos_conocio:''
}

export default function RegistroCliente() {
  const [paso, setPaso] = useState(0)
  const [form, setForm] = useState(init)
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Obtener entrenador_id de la URL
  const params = new URLSearchParams(window.location.search)
  const entrenadorId = params.get('e')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const Input = ({ label, field, type='text', placeholder='', required=false }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}{required && <span className="text-orange-500 ml-1">*</span>}</label>
      <input type={type} value={form[field]} onChange={e => set(field, e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
    </div>
  )

  const Textarea = ({ label, field, placeholder='' }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <textarea value={form[field]} onChange={e => set(field, e.target.value)}
        placeholder={placeholder} rows={3}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 resize-none transition-colors" />
    </div>
  )

  const Select = ({ label, field, options, required=false }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}{required && <span className="text-orange-500 ml-1">*</span>}</label>
      <select value={form[field]} onChange={e => set(field, e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 bg-white">
        <option value="">Selecciona...</option>
        {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )

  const NumBtns = ({ label, field, min, max }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}: <span className="text-orange-500 font-bold">{form[field]}</span></label>
      <div className="flex gap-2 flex-wrap">
        {Array.from({length:max-min+1},(_,i)=>i+min).map(v => (
          <button key={v} type="button" onClick={() => set(field, v)}
            className={`w-11 h-11 rounded-xl text-sm font-medium transition-colors ${form[field]===v ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600 hover:border-orange-300'}`}>
            {v}
          </button>
        ))}
      </div>
    </div>
  )

  const validarPaso = () => {
    if (paso === 0 && (!form.nombre || !form.email)) { setError('Nombre y email son obligatorios'); return false }
    if (paso === 1 && !form.objetivo) { setError('Selecciona tu objetivo'); return false }
    setError(''); return true
  }

  const siguiente = () => { if (validarPaso()) setPaso(p => Math.min(p+1, PASOS.length-1)) }
  const anterior = () => { setError(''); setPaso(p => Math.max(p-1, 0)) }

  const enviar = async () => {
    if (!validarPaso()) return
    setLoading(true)
    try {
      const { error: err } = await supabase.from('cuestionarios').insert({
        ...form,
        entrenador_id: entrenadorId,
        peso_actual: form.peso_actual ? Number(form.peso_actual) : null,
        altura: form.altura ? Number(form.altura) : null,
        edad: form.edad ? Number(form.edad) : null,
        anos_entrenando: Number(form.anos_entrenando),
        dias_semana: Number(form.dias_semana),
        duracion_sesion: Number(form.duracion_sesion),
      })
      if (err) throw err
      setEnviado(true)
    } catch(e) {
      setError('Error al enviar: ' + e.message)
    }
    setLoading(false)
  }

  if (!entrenadorId) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center"><p className="text-3xl mb-2">🔗</p><p className="text-gray-500">Enlace no válido</p></div>
    </div>
  )

  if (enviado) return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl">✓</div>
        <h2 className="text-2xl font-bold text-[#111] mb-3">¡Todo listo!</h2>
        <p className="text-gray-500 leading-relaxed">Tu cuestionario ha sido enviado correctamente. Tu entrenador lo revisará y se pondrá en contacto contigo muy pronto con tu plan personalizado.</p>
        <div className="mt-6 bg-orange-50 rounded-xl p-4">
          <p className="text-sm text-orange-700 font-medium">Próximos pasos</p>
          <p className="text-sm text-orange-600 mt-1">Recibirás tu rutina personalizada en las próximas 24-48 horas.</p>
        </div>
      </div>
    </div>
  )

  const progreso = ((paso) / (PASOS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <div className="bg-[#111] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
                  <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
                  <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
                  <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
                </svg>
              </div>
              <span className="text-white font-semibold text-sm">Forge</span>
            </div>
            <span className="text-gray-400 text-xs">{paso + 1} / {PASOS.length}</span>
          </div>
          <div className="bg-white/10 rounded-full h-1.5">
            <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" style={{width: `${progreso}%`}} />
          </div>
          <p className="text-white font-medium text-sm mt-2">{PASOS[paso]}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-2">

          {/* PASO 0 — Datos personales */}
          {paso === 0 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#111]">Cuéntanos sobre ti</h2>
                <p className="text-sm text-gray-500 mt-1">Esta información nos ayuda a personalizar tu plan al máximo.</p>
              </div>
              <Input label="Nombre completo" field="nombre" required placeholder="Tu nombre y apellidos" />
              <Input label="Email" field="email" type="email" required placeholder="tu@email.com" />
              <Input label="Teléfono" field="telefono" type="tel" placeholder="+34 600 000 000" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Edad" field="edad" type="number" placeholder="25" />
                <Select label="Sexo" field="sexo" options={[['hombre','Hombre'],['mujer','Mujer'],['otro','Otro']]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Peso actual (kg)" field="peso_actual" type="number" placeholder="75" />
                <Input label="Altura (cm)" field="altura" type="number" placeholder="175" />
              </div>
            </div>
          )}

          {/* PASO 1 — Objetivo */}
          {paso === 1 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#111]">¿Qué quieres conseguir?</h2>
                <p className="text-sm text-gray-500 mt-1">Sé específico — cuanto más claro seas, mejor podremos ayudarte.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Objetivo principal <span className="text-orange-500">*</span></label>
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
                      className={`p-3 rounded-xl border text-sm font-medium text-left transition-colors ${form.objetivo===v ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-700 hover:border-orange-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea label="Descríbelo con tus palabras" field="objetivo_detalle" placeholder="Ej: Quiero perder 8kg antes del verano y verme mejor sin camiseta..." />
              <Select label="¿En qué plazo?" field="plazo" options={[
                ['30_dias','30 días'],['3_meses','3 meses'],['6_meses','6 meses'],['1_ano','1 año'],['sin_prisa','Sin prisa, a mi ritmo']
              ]} />
            </div>
          )}

          {/* PASO 2 — Experiencia */}
          {paso === 2 && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#111]">Tu experiencia</h2>
                <p className="text-sm text-gray-500 mt-1">Adaptamos la intensidad a tu nivel real.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nivel de entrenamiento</label>
                <div className="space-y-2">
                  {[
                    ['principiante','🌱 Principiante','Menos de 1 año o con poca constancia'],
                    ['intermedio','📈 Intermedio','1-3 años entrenando con regularidad'],
                    ['avanzado','🔥 Avanzado','Más de 3 años, domino los movimientos básicos'],
                  ].map(([v,l,d]) => (
                    <button key={v} type="button" onClick={() => set('nivel', v)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-colors ${form.nivel===v ? 'bg-orange-500 border-orange-500' : 'border-gray-200 hover:border-orange-300'}`}>
                      <p className={`text-sm font-medium ${form.nivel===v ? 'text-white' : 'text-[#111]'}`}>{l}</p>
                      <p className={`text-xs mt-0.5 ${form.nivel===v ? 'text-white/80' : 'text-gray-400'}`}>{d}</p>
                    </button>
                  ))}
                </div>
              </div>
              <NumBtns label="Años entrenando" field="anos_entrenando" min={0} max={10} />
            </div>
          )}

          {/* PASO 3 — Marcas básicas */}
          {paso === 3 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#111]">Marcas básicas</h2>
                <p className="text-sm text-gray-500 mt-1">Pon el peso máximo que mueves o el número de reps. Si no sabes, déjalo en blanco.</p>
              </div>
              {[
                ['marca_press_banca','Press de banca','Ej: 80kg × 5 / o 20 flexiones'],
                ['marca_sentadilla','Sentadilla','Ej: 100kg × 3'],
                ['marca_peso_muerto','Peso muerto','Ej: 120kg × 1'],
                ['marca_dominadas','Dominadas','Ej: 10 reps o 15kg lastradas'],
                ['marca_flexiones','Flexiones','Ej: 30 reps seguidas'],
                ['marca_press_militar','Press militar','Ej: 60kg × 5'],
              ].map(([f,l,p]) => <Input key={f} label={l} field={f} placeholder={p} />)}
            </div>
          )}

          {/* PASO 4 — Material y horario */}
          {paso === 4 && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#111]">Material y disponibilidad</h2>
                <p className="text-sm text-gray-500 mt-1">Adaptamos tu plan a lo que tienes y cuándo puedes entrenar.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Material disponible</label>
                <div className="space-y-2">
                  {[
                    ['sin_material','🏠 Sin material','Solo peso corporal, en casa'],
                    ['material_basico','🎽 Material básico','Mancuernas, bandas elásticas, barra'],
                    ['gimnasio','🏋️ Gimnasio completo','Acceso a máquinas y peso libre'],
                  ].map(([v,l,d]) => (
                    <button key={v} type="button" onClick={() => set('material', v)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-colors ${form.material===v ? 'bg-orange-500 border-orange-500' : 'border-gray-200 hover:border-orange-300'}`}>
                      <p className={`text-sm font-medium ${form.material===v ? 'text-white' : 'text-[#111]'}`}>{l}</p>
                      <p className={`text-xs mt-0.5 ${form.material===v ? 'text-white/80' : 'text-gray-400'}`}>{d}</p>
                    </button>
                  ))}
                </div>
              </div>
              <NumBtns label="Días por semana disponibles" field="dias_semana" min={2} max={6} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duración de sesión: <span className="text-orange-500 font-bold">{form.duracion_sesion} min</span></label>
                <div className="flex gap-2 flex-wrap">
                  {[30,45,60,75,90].map(v => (
                    <button key={v} type="button" onClick={() => set('duracion_sesion', v)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${form.duracion_sesion===v ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600'}`}>
                      {v}min
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Horario preferido" field="horario_preferido" placeholder="Ej: Mañanas antes del trabajo, 7-9am" />
            </div>
          )}

          {/* PASO 5 — Salud */}
          {paso === 5 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#111]">Salud y limitaciones</h2>
                <p className="text-sm text-gray-500 mt-1">Importante para adaptar tu plan y evitar lesiones. Todo queda confidencial.</p>
              </div>
              <Textarea label="Lesiones o dolor crónico" field="lesiones" placeholder="Ej: Lumbar baja recurrente, rodilla derecha operada en 2022..." />
              <Textarea label="Enfermedades o condiciones médicas" field="enfermedades" placeholder="Ej: Hipertensión controlada, diabetes tipo 2..." />
              <Input label="Medicación actual (si aplica)" field="medicacion" placeholder="Ej: Ninguna / Metformina 500mg..." />
            </div>
          )}

          {/* PASO 6 — Expectativas */}
          {paso === 6 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-[#111]">Últimas preguntas</h2>
                <p className="text-sm text-gray-500 mt-1">Esto nos ayuda a entenderte mejor como persona, no solo como deportista.</p>
              </div>
              <Textarea label="¿Por qué quieres cambiar ahora?" field="motivacion" placeholder="Qué te ha llevado a dar este paso en este momento..." />
              <Textarea label="¿Has intentado algo antes? ¿Qué pasó?" field="experiencias_anteriores" placeholder="Qué has probado, por qué no funcionó o sí funcionó..." />
              <Textarea label="¿A qué te comprometes?" field="compromisos" placeholder="Sé honesto sobre lo que estás dispuesto a hacer..." />
              <Select label="¿Cómo nos has conocido?" field="como_nos_conocio" options={[
                ['tiktok','TikTok'],['instagram','Instagram'],['recomendacion','Recomendación de alguien'],['google','Google'],['otro','Otro']
              ]} />
            </div>
          )}

          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}
        </div>

        {/* Botones navegación */}
        <div className="flex gap-3 mt-4">
          {paso > 0 && (
            <button onClick={anterior} className="flex-1 border border-gray-200 bg-white text-gray-600 text-sm font-medium py-3.5 rounded-xl">
              ← Anterior
            </button>
          )}
          {paso < PASOS.length - 1 ? (
            <button onClick={siguiente} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-3.5 rounded-xl transition-colors">
              Siguiente →
            </button>
          ) : (
            <button onClick={enviar} disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Enviando...' : '✅ Enviar cuestionario'}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">Forge Studio OS · Tus datos están protegidos</p>
      </div>
    </div>
  )
}
