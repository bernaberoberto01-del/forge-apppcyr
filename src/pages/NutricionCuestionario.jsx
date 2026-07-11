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
    if (clienteId) supabase.from('clientes').select('nombre,peso_actual').eq('id',clienteId).single().then(({data})=>{ if(data) { setCliente(data); if(data.peso_actual) set('peso', data.peso_actual) } })
  },[clienteId])

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
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Comidas al día</label>
                <select value={form.comidas_dia} onChange={e=>set('comidas_dia',e.target.value)} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">—</option>
                  {[2,3,4,5,6].map(n=><option key={n} value={n}>{n} comidas</option>)}
                </select>
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
              <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Tipo de dieta</label>
              <select value={form.tipo_dieta} onChange={e=>set('tipo_dieta',e.target.value)} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                <option value="">Selecciona</option>
                {['Omnívora','Vegetariana','Vegana','Pescetariana','Sin gluten','Sin lactosa','Cetogénica','Paleo'].map(d=><option key={d} value={d.toLowerCase()}>{d}</option>)}
              </select>
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
