import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }

function analizarPerfil(cliente: any, cuestionario: any) {
  const nivel = cliente.nivel || 'principiante'
  const lesiones = (cliente.lesiones || '').toLowerCase()
  const enfermedades = ((cliente.enfermedades || '') + ' ' + (cuestionario?.enfermedades || '')).toLowerCase()
  const medicacion = ((cliente.medicacion || '') + ' ' + (cuestionario?.medicacion || '')).toLowerCase()
  const anosEntrenando = Number(cuestionario?.anos_entrenando || 0)
  const edad = Number(cuestionario?.edad || 30)
  const peso = Number(cuestionario?.peso_actual || 70)
  const alertas: string[] = []
  const contraindicaciones: string[] = []
  const tieneRodilla = /rodill|condromal|gonalg|menisco|ligamento|rotula|patela/.test(lesiones)
  const tieneColumna = /lumbar|cervical|espalda|hernia|disco/.test(lesiones)
  const tieneCadera = /cadera|ingle|iliop/.test(lesiones)
  const tieneHombro = /hombro|manguito|rotat|clavicula|acromi/.test(lesiones)
  const tieneCardiovasc = /cardiov|hipertens|arritmia|angina|coronari|infarto/.test(enfermedades)
  const tieneAutoinmune = /autoinmune|artritis|lupus|fibromialg|esclerosis/.test(enfermedades)
  const tieneBetabloqueante = /bisoprolol|atenolol|metropolol|propranolol|carvedilol/.test(medicacion)
  const tieneAntidepresivo = /venlafaxina|sertralina|fluoxetina|paroxetina|duloxetina|amitriptilina/.test(medicacion)
  const tieneAnticoagulante = /warfarina|acenocumarol|rivaroxaban|apixaban|dabigatran/.test(medicacion)
  const tieneBenzo = /rivotril|diazepam|lorazepam|alprazolam|clonazepam/.test(medicacion)
  const tieneAntiepil = /gabapentina|pregabalina|valproato|lamotrigina/.test(medicacion)
  if (tieneRodilla) { alertas.push('Lesion rodilla: sin sentadilla profunda ni carrera'); contraindicaciones.push('sentadilla profunda','saltos','carrera') }
  if (tieneColumna) { alertas.push('Lesion columna: sin carga axial pesada'); contraindicaciones.push('peso muerto pesado','hiperextensiones') }
  if (tieneCadera) { alertas.push('Cadera: rango limitado'); contraindicaciones.push('sentadilla profunda') }
  if (tieneHombro) { alertas.push('Hombro: sin press por encima'); contraindicaciones.push('press militar','snatch') }
  if (tieneCardiovasc) { alertas.push('Riesgo cardiovascular: intensidad controlada'); contraindicaciones.push('HIIT','MetCon intenso') }
  if (tieneAutoinmune) { alertas.push('Autoinmune: volumen reducido') }
  if (tieneBetabloqueante) { alertas.push('Betabloqueante: usar RPE no FC') }
  if (tieneAntiepil || tieneBenzo) { alertas.push('Medicacion afecta coordinacion'); contraindicaciones.push('movimientos olimpicos') }
  if (tieneAntidepresivo) { alertas.push('Antidepresivo: progresion conservadora') }
  if (tieneAnticoagulante) { alertas.push('Anticoagulante: sin riesgo de golpes') }
  let fase = 2
  if (nivel === 'avanzado' && anosEntrenando >= 3) fase = 3
  else if (nivel === 'intermedio' && alertas.length <= 1) fase = 2
  else if (nivel === 'intermedio' && alertas.length > 1) fase = 1
  else if (nivel === 'principiante' && !((anosEntrenando === 0 && (alertas.length > 0 || edad > 55 || peso > 100)) || tieneCardiovasc || tieneAutoinmune)) fase = 1
  else fase = 0
  return { fase, alertas, contraindicaciones, tieneRodilla, tieneBetabloqueante }
}

function nombresDias(tipo: string, fase: number, objetivo: string, formato: string, dias: number): string[] {
  if (fase <= 1) return ['Dia A','Dia B','Dia C','Dia D','Dia E'].slice(0,dias)
  if (tipo === 'hibrido') return ['Fuerza','Cardio Z2','Fuerza+Acc','Cardio Fartlek','Fuerza+MetCon','Cardio Largo'].slice(0,dias)
  if (tipo === 'crossfit') return ['WOD Fuerza','WOD Skill','WOD AMRAP','WOD Tecnica','WOD Chipper'].slice(0,dias)
  if (formato === 'circuitos' || objetivo === 'perdida_grasa') return ['Circuito Full','Circuito Sup','Circuito Inf','Circuito Full','Cardio+Fuerza'].slice(0,dias)
  if (formato === 'superseries' || objetivo === 'hipertrofia' || objetivo === 'ganancia_muscular') return ['Pecho+Espalda','Piernas+Core','Hombros+Brazos','Full Body','Espalda+Pecho'].slice(0,dias)
  return ['Empuje','Tiron','Piernas','Upper','Full Fuerza'].slice(0,dias)
}

function generarDiaBase(i: number, nombre: string, perfil: any): any {
  return { dia:i, nombre, patron_principal:'Fuerza Base', ejercicios:[
    {orden:1,nombre:'Calentamiento',patron:'calentamiento',series:1,reps:'10 min',descanso:'-',notas:''},
    {orden:2,nombre:'Press pectoral maquina',patron:'fuerza',series:3,reps:'10-12',descanso:'2 min',notas:''},
    {orden:3,nombre:'Remo sentado maquina',patron:'fuerza',series:3,reps:'10-12',descanso:'2 min',notas:''},
    {orden:4,nombre:'Hip Thrust',patron:'fuerza',series:3,reps:'12-15',descanso:'90s',notas:''},
    {orden:5,nombre:'Core',patron:'core',series:2,reps:'3x30s',descanso:'30s',notas:''},
  ]}
}

async function llamarIA(key: string, prompt: string, i: number): Promise<any> {
  for (let intento = 0; intento < 2; intento++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 700,
          system: 'Responde SOLO con JSON valido. Sin texto ni markdown.',
          messages: [{ role: 'user', content: prompt }] })
      })
      if (res.status === 529 || res.status === 429) { await new Promise(r => setTimeout(r, 1000)); continue }
      if (!res.ok) return null
      const aiData = await res.json()
      const texto = (aiData.content?.[0]?.text || '').trim()
      let obj: any = null
      try { obj = JSON.parse(texto) } catch {}
      if (!obj) { const m = texto.match(/\{[\s\S]*\}/); if (m) try { obj = JSON.parse(m[0]) } catch {} }
      if (obj) { obj.dia = i; return obj }
    } catch { /* continuar */ }
  }
  return null
}

function buildPrompt(i: number, nombre: string, cliente: any, perfil: any, cuestionario: any, biblioPrompt: string, contexto: string, marcas: string): string {
  const obj = cliente.objetivo || 'perdida_grasa'
  const nivel = cliente.nivel || 'principiante'
  const material = cliente.material || 'gimnasio'
  const lesiones = cliente.lesiones || 'ninguna'
  const tipo = cliente.tipo_entrenamiento || ''
  const formato = cliente.formato_entrenamiento || cuestionario?.formato_entrenamiento || ''
  const esFase3 = perfil.fase === 3
  const alertasTxt = perfil.alertas.length ? ` ALERTAS:${perfil.alertas.join(';')}` : ''
  const contrasTxt = perfil.contraindicaciones.length ? ` PROHIBIDO:${perfil.contraindicaciones.join(',')}` : ''
  const base = `${obj.replace(/_/g,' ')}|${nivel}|${material}|lesiones:${lesiones}${alertasTxt}${contrasTxt}`
  const nombreLow = nombre.toLowerCase()
  const esCardio = nombreLow.includes('cardio') || nombreLow.includes('z2') || nombreLow.includes('fartlek')
  if (esCardio) return `Cardio dia${i}:${nombre}|${base}.${contexto}\nJSON:{"dia":${i},"nombre":"${nombre}","patron_principal":"Cardio","ejercicios":[{"orden":1,"nombre":"Calentamiento","patron":"calentamiento","series":1,"reps":"8 min","descanso":"-","notas":""},{"orden":2,"nombre":"Cardio 30min","patron":"cardio","series":1,"reps":"30 min","descanso":"-","notas":""},{"orden":3,"nombre":"Core","patron":"core","series":3,"reps":"3x30s","descanso":"15s","notas":""}]}`
  if (tipo === 'crossfit') return `WOD dia${i}:${nombre}|${base}${biblioPrompt}${contexto}.\nJSON:{"dia":${i},"nombre":"${nombre}","patron_principal":"CrossFit","ejercicios":[{"orden":1,"nombre":"Calentamiento","patron":"calentamiento","series":1,"reps":"10 min","descanso":"-","notas":""},{"orden":2,"nombre":"Fuerza","patron":"fuerza","series":4,"reps":"3-5","descanso":"3 min","notas":""},{"orden":3,"nombre":"MetCon","patron":"metabolico","series":1,"reps":"AMRAP 10min","descanso":"-","notas":""}]}`
  const agrup = formato==='superseries'?' Agrupacion A1/A2,B1/B2.' : formato==='circuitos'?' Agrupacion A1/A2/A3.' : ''
  const int = esFase3 ? '82-88%RM 3-5x3-5' : '70-80%RM 3-4x6-10'
  return `Fuerza dia${i}:${nombre}|${base}|${int}.${agrup}${biblioPrompt}${contexto}${marcas}\nJSON:{"dia":${i},"nombre":"${nombre}","patron_principal":"Fuerza","ejercicios":[{"orden":1,"nombre":"Calentamiento","patron":"calentamiento","series":1,"reps":"8 min","descanso":"-","notas":""},{"orden":2,"nombre":"[Compuesto1]","patron":"fuerza","series":${esFase3?5:4},"reps":"${esFase3?'3-5':'6-8'}","descanso":"${formato==='descanso_tradicional'?'3 min':'-'}","notas":""},{"orden":3,"nombre":"[Compuesto2]","patron":"fuerza","series":4,"reps":"8-10","descanso":"90s","notas":""},{"orden":4,"nombre":"[Accesorio]","patron":"accesorio","series":3,"reps":"10-12","descanso":"60s","notas":""},{"orden":5,"nombre":"[Accesorio]","patron":"accesorio","series":3,"reps":"12-15","descanso":"45s","notas":""}]}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })
  try {
    const body = await req.json().catch(() => ({}))
    const { cliente_id, contexto_extra } = body
    if (!cliente_id) return new Response(JSON.stringify({ error: 'cliente_id requerido' }), { status: 400, headers: CORS })
    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', cliente_id).single()
    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: CORS })
    if (cliente.entrenador_id !== user.id) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })

    const [{ data: cuestionario }, { data: marcasRaw }, { data: biblioteca }] = await Promise.all([
      supabase.from('cuestionarios').select('*').eq('cliente_id', cliente_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('marcas_cliente').select('ejercicio,peso_kg,reps').eq('cliente_id', cliente_id).order('fecha', { ascending: false }).limit(20),
      supabase.from('ejercicios_biblioteca').select('nombre').eq('entrenador_id', cliente.entrenador_id).limit(100),
    ])

    const marcasPorEj = new Map<string, any>()
    for (const m of marcasRaw || []) { if (!marcasPorEj.has(m.ejercicio)) marcasPorEj.set(m.ejercicio, m) }
    const marcasPrompt = [...marcasPorEj.values()].length ? ` MARCAS:${[...marcasPorEj.values()].map((m:any)=>`${m.ejercicio}${m.peso_kg}kg`).join(',')}.` : ''
    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) return new Response(JSON.stringify({ error: 'API key no configurada' }), { status: 500, headers: CORS })

    const perfil = analizarPerfil(cliente, cuestionario)
    const dias = cliente.dias_semana || 3
    const tipoEnt = cliente.tipo_entrenamiento || ''
    const objetivo = cliente.objetivo || 'perdida_grasa'
    const formato = cliente.formato_entrenamiento || cuestionario?.formato_entrenamiento || ''
    const biblioPrompt = (biblioteca||[]).length ? ` Usa:${(biblioteca||[]).slice(0,12).map((e:any)=>e.nombre).join(',')}.` : ''
    const contextoPrompt = contexto_extra?.trim() ? ` INSTRUCCIONES:${contexto_extra.trim()}` : ''
    const nombres = nombresDias(tipoEnt, perfil.fase, objetivo, formato, dias)

    // Todos los dias en paralelo con reintento automatico
    const promesas = Array.from({ length: dias }, (_, idx) => {
      const i = idx + 1
      const nombre = nombres[idx] || `Dia ${i}`
      if (perfil.fase <= 1) return Promise.resolve(generarDiaBase(i, nombre, perfil))
      const prompt = buildPrompt(i, nombre, cliente, perfil, cuestionario, biblioPrompt, contextoPrompt, marcasPrompt)
      return llamarIA(key, prompt, i)
    })

    const resultados = await Promise.all(promesas)

    // Si algun dia falla por rate limit, usar base como fallback
    const diasFinal = Array.from({ length: dias }, (_, idx) => {
      const i = idx + 1
      const nombre = nombres[idx] || `Dia ${i}`
      return resultados[idx] || generarDiaBase(i, nombre, perfil)
    })

    const faseLabel = ['Adaptacion','Base','Desarrollo','Rendimiento'][perfil.fase]
    const formatoLabel = formato ? ` [${formato.replace(/_/g,' ')}]` : ''
    const nombreRutina = `Rutina ${objetivo.replace(/_/g,' ')} - ${faseLabel} - ${dias} dias`
    const notasEntrenador = perfil.alertas.length
      ? `ALERTAS:\n${perfil.alertas.map((a:string)=>'- '+a).join('\n')}\n\nFase: ${faseLabel}${formatoLabel}`
      : `Fase: ${faseLabel}${formatoLabel}`
    const rutina = { nombre: nombreRutina, descripcion: `${faseLabel} - ${dias} dias`, semanas: 4, dias: diasFinal }

    const { data: saved, error: saveError } = await supabase.from('rutinas').insert({
      cliente_id, entrenador_id: cliente.entrenador_id, nombre: nombreRutina, objetivo,
      semanas: 4, dias_semana: dias, borrador: rutina, notas_entrenador: notasEntrenador, estado: 'borrador'
    }).select().single()

    if (saveError) return new Response(JSON.stringify({ error: saveError.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ ok: true, rutina: saved, dias_generados: diasFinal.length, fase: perfil.fase, fase_label: faseLabel, alertas: perfil.alertas }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
