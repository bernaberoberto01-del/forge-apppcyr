import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PASOS = ['Tus datos','Tu objetivo','Tus hábitos','Preferencias']

export default function NutricionCuestionario() {
  const params = new URLSearchParams(window.location.search)
  const entrenadorId = params.get('e')
  const clienteId = params.get('c')
  const [cliente, setCliente] = useState(null)
  const [paso, setPaso] = useState(0)
  const [form, setForm] = useState({ sexo:'', peso:'', altura:'', edad:'', nivel_actividad:'', objetivo:'', velocidad_progreso:'', comidas_dia:'', tiempo_cocina:'', tipo_dieta:'', entrena_cuando:'', alergias:'', alimentos_no_gustan:'', alimentos_favoritos:'', suplementos:'', notas:'' })
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => {
    if (!clienteId) return
    async function precargar() {
      // 1. Datos de la ficha + cuestionario de registro (altura, edad, sexo)
      const [{ data: cl }, { data: reg }] = await Promise.all([
        supabase.from('clientes').select('nombre, peso_actual, objetivo, lesiones, nivel, dias_semana').eq('id', clienteId).single(),
        supabase.from('cuestionarios').select('altura, edad, sexo').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      ])

      if (cl) {
        setCliente(cl)
        const objMap = {
          perdida_grasa: 'perdida_grasa', hipertrofia: 'ganancia_muscular',
          ganancia_muscular: 'ganancia_muscular', fuerza: 'rendimiento',
          resistencia: 'rendimiento', tonificacion: 'recomposicion',
          wellness: 'salud', mantenimiento: 'mantenimiento'
        }
        setForm(f => ({
          ...f,
          peso: cl.peso_actual ? String(cl.peso_actual) : f.peso,
          objetivo: (cl.objetivo && objMap[cl.objetivo]) ? objMap[cl.objetivo] : f.objetivo,
          // Datos físicos del cuestionario de registro
          altura: reg?.altura ? String(reg.altura) : f.altura,
          edad: reg?.edad ? String(reg.edad) : f.edad,
          sexo: reg?.sexo || f.sexo,
        }))
      }

      // 2. Cuestionario de nutrición anterior si existe
      const { data: cuest } = await supabase.from('cuestionarios_nutricion')
        .select('*').eq('cliente_id', clienteId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (cuest) {
        setForm(f => ({
          ...f,
          sexo: cuest.sexo || f.sexo,
          peso: cuest.peso ? String(cuest.peso) : f.peso,
          altura: cuest.altura ? String(cuest.altura) : f.altura,
          edad: cuest.edad ? String(cuest.edad) : f.edad,
          nivel_actividad: cuest.nivel_actividad || f.nivel_actividad,
          objetivo: cuest.objetivo || f.objetivo,
          velocidad_progreso: cuest.velocidad_progreso || f.velocidad_progreso,
          comidas_dia: cuest.comidas_dia ? String(cuest.comidas_dia) : f.comidas_dia,
          tiempo_cocina: cuest.tiempo_cocina || f.tiempo_cocina,
          tipo_dieta: cuest.tipo_dieta || f.tipo_dieta,
          entrena_cuando: cuest.entrena_cuando || f.entrena_cuando,
          alergias: cuest.alergias || f.alergias,
          alimentos_no_gustan: cuest.alimentos_no_gustan || f.alimentos_no_gustan,
          alimentos_favoritos: cuest.alimentos_favoritos || f.alimentos_favoritos,
          suplementos: cuest.suplementos || f.suplementos,
          notas: cuest.notas || f.notas,
        }))
      }
    }
    precargar()
  }, [clienteId])

  async function enviar() {
    setLoading(true)
    await supabase.from('cuestionarios_nutricion').insert({ ...form, cliente_id: clienteId, entrenador_id: entrenadorId, peso: form.peso?Number(form.peso):null, altura: form.altura?Number(form.altura):null, edad: form.edad?Number(form.edad):null, comidas_dia: form.comidas_dia?Number(form.comidas_dia):null })
    setEnviado(true)
    setLoading(false)
  }

  if (enviado) return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-black/5">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🥗</div>
        <h2 className="text-xl font-bold text-[#0A0A0A] mb-2">¡Listo!</h2>
        <p className="text-sm text-[#6B6B6B]">Tu entrenador recibirá tus datos y preparará tu plan nutricional personalizado. Lo verás en tu portal en breve.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#111]">
      <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#FF5C00] rounded-2xl flex items-center justify-center mx-auto mb-3">🥗</div>
          <h1 className="text-white text-xl font-bold">Cuestionario nutricional</h1>
          {cliente && <p className="text-white/50 text-sm mt-1">Hola, {cliente.nombre.split(' ')[0]}</p>}
          <div className="flex gap-1.5 justify-center mt-4">
            {PASOS.map((p,i)=>(
              <div key={i} className={`h-1.5 rounded-full transition-all ${i<=paso?'bg-[#FF5C00]':'bg-white/20'}`} style={{width: i===paso?'32px':'12px'}} />
            ))}
          </div>
          <p className="text-white/40 text-xs mt-2">{PASOS[paso]}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 space-y-4">
          {paso===0 && (<>
            <p className="text-sm font-bold text-[#0A0A0A]">Cuéntanos sobre ti</p>
            <div className="grid grid-cols-2 gap-3">
              {[['Peso (kg)','peso','number'],['Altura (cm)','altura','number'],['Edad','edad','number']].map(([l,k,t])=>(
                <div key={k}>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">{l}</label>
                  <input type={t} value={form[k]} onChange={e=>set(k,e.target.value)} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Sexo</label>
                <select value={form.sexo} onChange={e=>set('sexo',e.target.value)} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">—</option>
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Nivel de actividad</label>
              <div className="space-y-2">
                {[['sedentario','Sedentario — trabajo de oficina, sin deporte'],['ligero','Ligero — 1-2 días de ejercicio/sem'],['moderado','Moderado — 3-4 días de ejercicio/sem'],['activo','Activo — 5-6 días de ejercicio/sem'],['muy_activo','Muy activo — entreno 2 veces al día']].map(([v,l])=>(
                  <button key={v} onClick={()=>set('nivel_actividad',v)} type="button"
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border transition-all ${form.nivel_actividad===v?'bg-[#FF5C00] border-[#FF5C00] text-white':'border-black/10 text-[#0A0A0A] hover:border-[#FF5C00]'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </>)}

          {paso===1 && (<>
            <p className="text-sm font-bold text-[#0A0A0A]">¿Qué quieres conseguir?</p>
            <div className="space-y-2">
              {[['perdida_grasa','🔥 Pérdida de grasa'],['ganancia_muscular','💪 Ganancia muscular'],['recomposicion','⚡ Recomposición corporal'],['mantenimiento','✓ Mantenimiento'],['rendimiento','🏆 Rendimiento deportivo']].map(([v,l])=>(
                <button key={v} onClick={()=>set('objetivo',v)} type="button"
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium border transition-all ${form.objetivo===v?'bg-[#FF5C00] border-[#FF5C00] text-white':'border-black/10 text-[#0A0A0A] hover:border-[#FF5C00]'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Velocidad de progreso</label>
              {[['lento','🐢 Lento y sostenible'],['moderado','🚶 Moderado'],['rapido','🏃 Rápido']].map(([v,l])=>(
                <button key={v} onClick={()=>set('velocidad_progreso',v)} type="button"
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border transition-all mb-1.5 ${form.velocidad_progreso===v?'bg-[#FF5C00] border-[#FF5C00] text-white':'border-black/10 text-[#0A0A0A] hover:border-[#FF5C00]'}`}>
                  {l}
                </button>
              ))}
            </div>
          </>)}

          {paso===2 && (<>
            <p className="text-sm font-bold text-[#0A0A0A]">Tus hábitos del día a día</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Comidas al día</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['2','2 comidas','Comida + Cena'],
                    ['3','3 comidas','Des + Com + Cena'],
                    ['4','4 comidas','+ Media mañana'],
                    ['5','5 comidas','+ Merienda'],
                    ['6','6 comidas','Muy fraccionado'],
                    ['0','Ayuno 16:8','Ventana 12-20h'],
                  ].map(([v,l,sub]) => (
                    <button key={v} onClick={() => set('comidas_dia', v)} type="button"
                      className={`px-2 py-2.5 rounded-xl border text-center transition-all ${form.comidas_dia===v?'bg-[#FF5C00] border-[#FF5C00] text-white':'border-black/10 hover:border-[#FF5C00]'}`}>
                      <p className={`text-sm font-bold ${form.comidas_dia===v?'text-white':'text-[#0A0A0A]'}`}>{l}</p>
                      <p className={`text-xs mt-0.5 ${form.comidas_dia===v?'text-white/70':'text-[#6B6B6B]'}`}>{sub}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Tiempo cocina</label>
                <select value={form.tiempo_cocina} onChange={e=>set('tiempo_cocina',e.target.value)} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">—</option>
                  <option value="10-15 minutos">Muy poco</option>
                  <option value="30 minutos">Normal</option>
                  <option value="1 hora">Me gusta cocinar</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Tipo de dieta</label>
              <div className="space-y-2">
                {[
                  ['omnivora',      '🍗 Omnívora',      'Come de todo: carne, pescado, huevos, lácteos, verduras y cereales. La más flexible.'],
                  ['vegetariana',   '🥚 Vegetariana',   'Sin carne ni pescado. Incluye huevos y lácteos. Rica en legumbres, verduras y cereales.'],
                  ['vegana',        '🌱 Vegana',        'Sin ningún producto animal. Basada en plantas, legumbres, frutos secos y cereales.'],
                  ['pescetariana',  '🐟 Pescetariana',  'Sin carne pero sí pescado y marisco. Incluye huevos y lácteos.'],
                  ['sin_gluten',    '🌾 Sin gluten',    'Elimina trigo, cebada y centeno. Para celíacos o sensibilidad al gluten.'],
                  ['sin_lactosa',   '🥛 Sin lactosa',   'Sin leche ni derivados lácteos. Tolera bien otros grupos de alimentos.'],
                  ['cetogenica',    '🥑 Cetogénica',    'Muy baja en carbohidratos (menos de 50g/día) y alta en grasas. Induce cetosis.'],
                  ['paleo',         '🦴 Paleo',         'Solo alimentos no procesados: carne, pescado, huevos, verduras, frutas y frutos secos.'],
                  ['ayuno_16_8',    '⏱ Ayuno 16:8',    'Come en una ventana de 8 horas (ej: 12:00-20:00). Las otras 16h, solo agua o café.'],
                ].map(([v,l,desc]) => (
                  <button key={v} onClick={() => set('tipo_dieta', v)} type="button"
                    className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all ${form.tipo_dieta===v?'bg-[#FF5C00]/10 border-[#FF5C00]':'border-white/15 hover:border-white/30'}`}>
                    <p className={`text-sm font-semibold ${form.tipo_dieta===v?'text-[#FF5C00]':'text-white'}`}>{l}</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">¿Cuándo entrenas?</label>
              {[['mañana en ayunas','🌅 Mañana en ayunas'],['mañana','☀️ Mañana (con desayuno)'],['mediodía','🌤 Mediodía'],['tarde','🌇 Tarde'],['noche','🌙 Noche']].map(([v,l])=>(
                <button key={v} onClick={()=>set('entrena_cuando',v)} type="button"
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition-all mb-1.5 ${form.entrena_cuando===v?'bg-[#FF5C00] border-[#FF5C00] text-white':'border-black/10 text-[#0A0A0A] hover:border-[#FF5C00]'}`}>
                  {l}
                </button>
              ))}
            </div>
          </>)}

          {paso===3 && (<>
            <p className="text-sm font-bold text-[#0A0A0A]">Restricciones y preferencias</p>
            {[['Alergias e intolerancias','alergias','Ej: lactosa, gluten, frutos secos...'],['Alimentos que NO te gustan','alimentos_no_gustan','Ej: hígado, sardinas...'],['Tus alimentos favoritos','alimentos_favoritos','Ej: pollo, arroz, huevos...'],['Suplementos que tomas','suplementos','Ej: whey, creatina...'],['Algo más que debamos saber','notas','Contexto, restricciones especiales...']].map(([l,k,ph])=>(
              <div key={k}>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">{l}</label>
                <input value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
            ))}
          </>)}
        </div>

        {/* Navegación */}
        <div className="flex gap-3 mt-4">
          {paso > 0 && (
            <button onClick={()=>setPaso(p=>p-1)} className="flex-1 border border-white/20 text-white text-sm font-medium py-3 rounded-xl hover:bg-white/5">← Atrás</button>
          )}
          {paso < PASOS.length-1 ? (
            <button onClick={()=>setPaso(p=>p+1)} className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl">Siguiente →</button>
          ) : (
            <button onClick={enviar} disabled={loading} className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40">
              {loading ? '⏳ Enviando...' : '✅ Enviar cuestionario'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
