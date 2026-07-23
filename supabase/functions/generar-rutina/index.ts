import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

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
  if (tieneRodilla) { alertas.push('Lesión rodilla: sin sentadilla profunda, impacto ni carrera'); contraindicaciones.push('sentadilla profunda','saltos','carrera','series 400m') }
  if (tieneColumna) { alertas.push('Lesión columna: sin carga axial pesada'); contraindicaciones.push('peso muerto pesado','hiperextensiones') }
  if (tieneCadera) { alertas.push('Cadera: rango limitado'); contraindicaciones.push('sentadilla profunda') }
  if (tieneHombro) { alertas.push('Hombro: sin press por encima'); contraindicaciones.push('press militar','snatch','thruster') }
  if (tieneCardiovasc) { alertas.push('Riesgo cardiovascular: intensidad controlada, RPE no FC'); contraindicaciones.push('HIIT','MetCon intenso','intervalos velocidad') }
  if (tieneAutoinmune) { alertas.push('Autoinmune: volumen reducido, recuperación lenta') }
  if (tieneBetabloqueante) { alertas.push('Betabloqueante: usar RPE no FC'); contraindicaciones.push('zona 2 por FC') }
  if (tieneAntiepil || tieneBenzo) { alertas.push('Medicación afecta coordinación: sin olímpicos ni inestables'); contraindicaciones.push('movimientos olímpicos','BOSU') }
  if (tieneAntidepresivo) { alertas.push('Antidepresivo: progresión conservadora') }
  if (tieneAnticoagulante) { alertas.push('Anticoagulante: sin riesgo de golpes o caídas') }
  let fase = 2
  if (nivel === 'avanzado' && anosEntrenando >= 3) fase = 3
  else if (nivel === 'intermedio' && alertas.length <= 1) fase = 2
  else if (nivel === 'intermedio' && alertas.length > 1) fase = 1
  else if (nivel === 'principiante' && !((anosEntrenando === 0 && (alertas.length > 0 || edad > 55 || peso > 100)) || tieneCardiovasc || tieneAutoinmune)) fase = 1
  else fase = 0
  return { fase, alertas, contraindicaciones, tieneRodilla, tieneBetabloqueante }
}

function nombresDias(tipo: string, fase: number, objetivo: string, formato: string, dias: number): string[] {
  if (fase === 0) return ['Día 1 - Movilidad y Fuerza Suave','Día 2 - Cardio Suave + Core','Día 3 - Fuerza Funcional Ligera','Día 4 - Movilidad + Estiramientos','Día 5 - Circuito Baja Intensidad'].slice(0,dias)
  if (fase === 1) {
    if (tipo === 'hibrido') return ['Día 1 - Fuerza Base Tren Superior','Día 2 - Cardio Suave + Core','Día 3 - Fuerza Base Tren Inferior','Día 4 - Cardio Suave + Movilidad','Día 5 - Full Body Funcional'].slice(0,dias)
    return ['Día A - Full Body Fuerza Base','Día B - Cardio Suave + Core','Día C - Full Body Fuerza Base','Día D - Cardio Suave + Movilidad','Día E - Full Body Funcional'].slice(0,dias)
  }
  if (fase === 2) {
    if (tipo === 'hibrido') return ['Día 1 - Fuerza Base','Día 2 - Cardio Z2 + Core','Día 3 - Fuerza + Accesorios','Día 4 - Cardio Fartlek','Día 5 - Fuerza + MetCon Suave','Día 6 - Cardio Largo Z2'].slice(0,dias)
    if (tipo === 'crossfit') return ['WOD 1 - Fuerza + MetCon','WOD 2 - Skill + Cardio','WOD 3 - Fuerza + AMRAP','WOD 4 - Técnica + Por Tiempo','WOD 5 - Fuerza + Chipper'].slice(0,dias)
    if (formato === 'circuitos' || objetivo === 'perdida_grasa' || objetivo === 'cambio_rapido_30dias') return ['Día A - Circuito Full Body','Día B - Circuito Tren Superior','Día C - Circuito Tren Inferior + Core','Día D - Circuito Full Body','Día E - Cardio + Fuerza Metabólica'].slice(0,dias)
    if (formato === 'superseries' || objetivo === 'hipertrofia' || objetivo === 'ganancia_muscular') return ['Día A - Pecho + Espalda Biseries','Día B - Piernas + Core','Día C - Hombros + Brazos Biseries','Día D - Full Body Biseries','Día E - Espalda + Pecho Biseries'].slice(0,dias)
    return ['Día A - Full Body Empuje','Día B - Full Body Tirón','Día C - Piernas y Core','Día D - Upper Body','Día E - Full Body Fuerza'].slice(0,dias)
  }
  if (tipo === 'hibrido') return ['Día 1 - Fuerza Máxima','Día 2 - Carrera Z2 + Core','Día 3 - Fuerza + Accesorios','Día 4 - Carrera Intervalica','Día 5 - Fuerza + MetCon','Día 6 - Carrera Larga Z2'].slice(0,dias)
  if (tipo === 'crossfit') return ['WOD 1 - Fuerza Olímpica + MetCon','WOD 2 - Gimnástico + Cardio','WOD 3 - Fuerza + AMRAP','WOD 4 - Skill + Por Tiempo','WOD 5 - Fuerza Máxima + Chipper','WOD 6 - Cardio + Core'].slice(0,dias)
  if (formato === 'superseries' || objetivo === 'hipertrofia' || objetivo === 'ganancia_muscular') return ['Día A - Pecho + Espalda Biseries','Día B - Piernas Fuerza Máxima','Día C - Hombros + Brazos Biseries','Día D - Full Body Potencia','Día E - Espalda + Pecho Biseries'].slice(0,dias)
  return ['Día A - Full Body Empuje','Día B - Full Body Tirón','Día C - Piernas y Core','Día D - Upper Body','Día E - Full Body Fuerza'].slice(0,dias)
}

function agrupacionInstruccion(objetivo: string, formato: string, fase: number): string {
  if (fase <= 1) return ''
  if (formato === 'descanso_tradicional') {
    return `\nFORMATO: Descanso tradicional. Cada ejercicio es INDEPENDIENTE con su propio descanso. NO usar campo agrupacion. Descansos generosos entre series (2-3 min compuestos, 90s accesorios).`
  }
  if (formato === 'superseries') {
    return `\nFORMATO PREFERIDO POR EL CLIENTE: Biseries/Superseries agonista-antagonista. OBLIGATORIO usar agrupacion A1/A2, B1/B2, C1/C2. Ejemplo: Press banca (A1, descanso:"-") + Remo barra (A2, descanso:"90s"). El descanso solo en el último ejercicio del par. Compuestos y accesorios todos en pares.`
  }
  if (formato === 'circuitos') {
    return `\nFORMATO PREFERIDO POR EL CLIENTE: Circuitos de 3-4 ejercicios. OBLIGATORIO agrupar como A1/A2/A3, B1/B2/B3. Combina empuje+tirón+pierna en cada bloque. Descanso solo al final del último ejercicio del bloque (45-60s). Sin descanso entre ejercicios del mismo bloque.`
  }
  if (objetivo === 'hipertrofia' || objetivo === 'ganancia_muscular') {
    return `\nFORMATO RECOMENDADO: Biseries agonista/antagonista (A1/A2, B1/B2). Maximiza volumen y efecto metabólico.`
  }
  if (objetivo === 'perdida_grasa' || objetivo === 'cambio_rapido_30dias' || objetivo === 'tonificacion') {
    return `\nFORMATO RECOMENDADO: Circuitos de 3 ejercicios (A1/A2/A3). Alta densidad, máximo efecto metabólico.`
  }
  if (objetivo === 'fuerza') {
    return `\nFORMATO: Compuestos principales SIN agrupar (descanso 3-4 min). Accesorios en biseries (A1/A2).`
  }
  return ''
}

function generarDiaFase01(i: number, nombreDia: string, perfil: any): any {
  const { fase, tieneRodilla } = perfil
  const nombreLow = nombreDia.toLowerCase()
  const esCardio = nombreLow.includes('cardio') || nombreLow.includes('movilidad') || nombreLow.includes('estiramientos')
  const cardioMaquina = tieneRodilla ? 'Bicicleta estática o Elíptica (sin impacto)' : 'Bicicleta estática o Elíptica'
  if (fase === 0) {
    if (esCardio) return { dia:i, nombre:nombreDia, patron_principal:'Cardio Suave - Fase Adaptación', ejercicios:[
      {orden:1,nombre:'Movilidad articular completa',patron:'calentamiento',series:1,reps:'10 min',descanso:'-',notas:'De pies a cabeza, sin impacto'},
      {orden:2,nombre:cardioMaquina,patron:'cardio',series:1,reps:'20-25 min',descanso:'-',notas:'RPE 3-4/10, conversacional'},
      {orden:3,nombre:'Core básico tumbado',patron:'core',series:3,reps:'3x30s',descanso:'30s',notas:'Dead Bug + Bird Dog + Respiración diafragmática'},
      {orden:4,nombre:'Estiramientos estáticos',patron:'movilidad',series:1,reps:'10 min',descanso:'-',notas:'Suaves, sin forzar'}
    ]}
    return { dia:i, nombre:nombreDia, patron_principal:'Fuerza Funcional - Fase Adaptación', ejercicios:[
      {orden:1,nombre:'Calentamiento articular',patron:'calentamiento',series:1,reps:'10 min',descanso:'-',notas:'Movilidad completa'},
      {orden:2,nombre:'Press pectoral en máquina',patron:'fuerza',series:2,reps:'12-15',descanso:'90s',notas:'RPE 4/10, peso ligero'},
      {orden:3,nombre:'Remo en máquina',patron:'fuerza',series:2,reps:'12-15',descanso:'90s',notas:'RPE 4/10'},
      {orden:4,nombre:'Hip Thrust sin carga',patron:'fuerza',series:2,reps:'12-15',descanso:'90s',notas:'Peso corporal'},
      {orden:5,nombre:'Core básico',patron:'core',series:2,reps:'3x30s',descanso:'30s',notas:'Plank + Dead Bug + Glute Bridge'},
      {orden:6,nombre:'Estiramientos',patron:'movilidad',series:1,reps:'8 min',descanso:'-',notas:'Suaves'}
    ]}
  }
  if (esCardio) return { dia:i, nombre:nombreDia, patron_principal:'Cardio Base', ejercicios:[
    {orden:1,nombre:'Calentamiento dinámico',patron:'calentamiento',series:1,reps:'8 min',descanso:'-',notas:'Movilidad + activación'},
    {orden:2,nombre:cardioMaquina,patron:'cardio',series:1,reps:'25-30 min',descanso:'-',notas:'RPE 4-5/10'+(tieneRodilla?' Sin correr.':'')},
    {orden:3,nombre:'Core progresivo',patron:'core',series:3,reps:'3x30s',descanso:'20s',notas:'Plank + Dead Bug + Bird Dog'},
    {orden:4,nombre:'Estiramientos',patron:'movilidad',series:1,reps:'8 min',descanso:'-',notas:'Cadena posterior'}
  ]}
  return { dia:i, nombre:nombreDia, patron_principal:'Fuerza Base', ejercicios:[
    {orden:1,nombre:'Calentamiento específico',patron:'calentamiento',series:1,reps:'10 min',descanso:'-',notas:'Movilidad + activación'},
    {orden:2,nombre:'Press pectoral en máquina',patron:'fuerza',series:3,reps:'10-12',descanso:'2 min',notas:'50-60%'},
    {orden:3,nombre:'Remo sentado en máquina',patron:'fuerza',series:3,reps:'10-12',descanso:'2 min',notas:'Espalda neutra'},
    {orden:4,nombre:'Hip Thrust',patron:'fuerza',series:3,reps:'10-12',descanso:'2 min',notas:'Peso ligero'},
    {orden:5,nombre:'Core básico',patron:'core',series:2,reps:'3x30s',descanso:'30s',notas:'Plank + Dead bug + Glute bridge'},
    {orden:6,nombre:'Estiramientos',patron:'movilidad',series:1,reps:'8 min',descanso:'-',notas:'Cadena posterior'}
  ]}
}

function buildPromptIA(i: number, nombreDia: string, cliente: any, perfil: any, cuestionario: any, biblioPrompt: string, contextoExtra: string, marcasPrompt: string): string {
  const { alertas, contraindicaciones, tieneBetabloqueante, tieneRodilla, fase } = perfil
  const objetivo = cliente.objetivo || 'perdida_grasa'
  const formato = cliente.formato_entrenamiento || cuestionario?.formato_entrenamiento || ''
  const nivel = cliente.nivel || 'principiante'
  const material = cliente.material || 'gimnasio'
  const lesiones = cliente.lesiones || 'ninguna'
  const enfermedades = cliente.enfermedades || cuestionario?.enfermedades || 'ninguna'
  const medicacion = cliente.medicacion || cuestionario?.medicacion || 'ninguna'
  const edad = cuestionario?.edad || 30
  const peso = cuestionario?.peso_actual || 70
  const nombreLow = nombreDia.toLowerCase()
  const tipoEnt = cliente.tipo_entrenamiento || ''
  const esHibrido = tipoEnt === 'hibrido'
  const esCrossfit = tipoEnt === 'crossfit'
  const esFase3 = fase === 3
  const alertasTxt = alertas.length > 0 ? ` ALERTAS: ${alertas.join('; ')}` : ''
  const contrasTxt = contraindicaciones.length > 0 ? ` PROHIBIDO: ${contraindicaciones.join(', ')}` : ''
  const base = `Objetivo:${objetivo.replace(/_/g,' ')}|Nivel:${nivel}|Edad:${edad}|Peso:${peso}kg|Material:${material}|Lesiones:${lesiones}|Enfermedades:${enfermedades}|Medicación:${medicacion}${alertasTxt}${contrasTxt}`
  const agrupInstr = agrupacionInstruccion(objetivo, formato, fase)
  const esDiaCardio = nombreLow.includes('cardio') || nombreLow.includes('z2') || nombreLow.includes('intervalica') || nombreLow.includes('fartlek') || nombreLow.includes('carrera')
  if (esDiaCardio && (esHibrido || !esCrossfit)) {
    const tipoCardio = nombreLow.includes('larga') ? 'Tirada larga 45 min Z2 (RPE 4-5)'
      : nombreLow.includes('interval') ? 'Series 400m x5 (RPE 7-8, 90s descanso)'
      : nombreLow.includes('fartlek') ? 'Fartlek 30 min (2min suave+1min fuerte)'
      : 'Cardio continuo 30 min Z2 (RPE 4-5)'
    return `Día cardio: ${nombreDia}. ${base}${tieneRodilla?' SIN CARRERA: bici/elíptica':''}${tieneBetabloqueante?' RPE no FC':''}.Tipo:${tipoCardio}.${biblioPrompt}${contextoExtra}${marcasPrompt}\nJSON:{"dia":${i},"nombre":"${nombreDia}","patron_principal":"Cardio","ejercicios":[{"orden":1,"nombre":"Calentamiento","patron":"calentamiento","series":1,"reps":"8 min","descanso":"-","notas":""},{"orden":2,"nombre":"[Cardio]","patron":"cardio","series":1,"reps":"según plan","descanso":"-","notas":"${tipoCardio}"},{"orden":3,"nombre":"Core","patron":"core","series":3,"reps":"3x30s","descanso":"15s","notas":"Plank+Dead Bug+Bird Dog"},{"orden":4,"nombre":"Estiramientos","patron":"movilidad","series":1,"reps":"5 min","descanso":"-","notas":""}]}`
  }
  if (esCrossfit) {
    const esSkill = i%2===0
    const metcon = ['AMRAP 10min','Por tiempo','EMOM 12min','Chipper','21-15-9'][i%5]
    return `WOD CrossFit: ${nombreDia}. ${base}.${biblioPrompt}${contextoExtra}${marcasPrompt}\nEstructura: Calentamiento 10min + ${esSkill?'Skill técnico':'Fuerza olímpica 3-5x3-5'} + MetCon ${metcon}.\nJSON:{"dia":${i},"nombre":"${nombreDia}","patron_principal":"CrossFit","ejercicios":[{"orden":1,"nombre":"Calentamiento","patron":"calentamiento","series":1,"reps":"10 min","descanso":"-","notas":""},{"orden":2,"nombre":"[${esSkill?'Skill':'Olímpico'}]","patron":"fuerza","series":${esSkill?5:4},"reps":"${esSkill?'3-5':'3'}","descanso":"3 min","notas":""},{"orden":3,"nombre":"MetCon: ${metcon}","patron":"metabolico","series":1,"reps":"${metcon}","descanso":"-","notas":"3-4 movimientos"}]}`
  }
  const int = esFase3 ? '82-88% RM, 3-5x3-5' : '70-80% RM, 3-4x6-10'
  const esDescansoTrad = formato === 'descanso_tradicional'
  return `Sesión fuerza: ${nombreDia}. ${base}. Intensidad:${int}.${agrupInstr}${biblioPrompt}${contextoExtra}${marcasPrompt}\n${esDescansoTrad ? 'NO usar campo agrupacion. Cada ejercicio independiente.' : 'Campo opcional "agrupacion" en ejercicios para biseries/circuitos ("A1","A2","B1","B2","A3"...). Sin agrupacion=independiente.'}${marcasPrompt ? ' Si hay marca real del mismo ejercicio o equivalente, escribe el peso de partida sugerido en el campo notas (ej: "Empieza ~55kg, basado en tu test").' : ''}\nJSON:{"dia":${i},"nombre":"${nombreDia}","patron_principal":"Fuerza","ejercicios":[{"orden":1,"nombre":"Calentamiento","patron":"calentamiento","series":1,"reps":"8 min","descanso":"-","notas":""},{"orden":2,"nombre":"[Compuesto 1]","patron":"fuerza","series":${esFase3?5:4},"reps":"${esFase3?'3-5':'6-8'}","descanso":"${esDescansoTrad?'3 min':'-'}","notas":""},{"orden":3,"nombre":"[Compuesto 2]","patron":"fuerza","series":${esFase3?5:4},"reps":"${esFase3?'3-5':'8-10'}","descanso":"${esFase3?'3 min':'90s'}","notas":""},{"orden":4,"nombre":"[Accesorio]","patron":"accesorio","series":3,"reps":"10-12","descanso":"60s","notas":""},{"orden":5,"nombre":"[Accesorio]","patron":"accesorio","series":3,"reps":"12-15","descanso":"45s","notas":""}]}`
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
    const { data: cuestionario } = await supabase.from('cuestionarios').select('*').eq('cliente_id', cliente_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const { data: marcasRaw } = await supabase.from('marcas_cliente').select('ejercicio,peso_kg,reps,fecha').eq('cliente_id', cliente_id).order('fecha', { ascending: false }).limit(60)
    const marcasPorEjercicio = new Map<string, any>()
    for (const m of marcasRaw || []) { if (!marcasPorEjercicio.has(m.ejercicio)) marcasPorEjercicio.set(m.ejercicio, m) }
    const marcas = [...marcasPorEjercicio.values()]
    const marcasPrompt = marcas.length ? ` MARCAS REALES DEL CLIENTE (usa estos pesos como referencia real para calcular las cargas de trabajo, no uses solo % genéricos si hay una marca del mismo ejercicio o uno equivalente): ${marcas.map((m:any)=>`${m.ejercicio} ${m.peso_kg}kg x${m.reps}`).join(', ')}.` : ''
    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) return new Response(JSON.stringify({ error: 'API key no configurada' }), { status: 500, headers: CORS })
    const perfil = analizarPerfil(cliente, cuestionario)
    const { data: biblioteca } = await supabase.from('ejercicios_biblioteca').select('nombre,patron,grupo_muscular,nivel,modalidad').eq('entrenador_id', cliente.entrenador_id).limit(200)
    const dias = cliente.dias_semana || 3
    const tipoEntrenamiento = cliente.tipo_entrenamiento || ''
    const objetivo = cliente.objetivo || 'perdida_grasa'
    const formato = cliente.formato_entrenamiento || cuestionario?.formato_entrenamiento || ''
    const biblioFiltrada = biblioteca?.filter((e: any) => {
      if (tipoEntrenamiento === 'crossfit') return !e.modalidad || ['crossfit','hibrido','fuerza'].includes(e.modalidad)
      if (tipoEntrenamiento === 'hibrido') return !e.modalidad || ['hibrido','crossfit','fuerza'].includes(e.modalidad)
      return !e.modalidad || ['fuerza','hipertrofia'].includes(e.modalidad)
    }) || []
    const biblioPrompt = biblioFiltrada.length ? ` Usa: ${biblioFiltrada.slice(0,25).map((e:any)=>e.nombre).join(', ')}.` : ''
    const contextoPrompt = contexto_extra?.trim() ? ` Extra: ${contexto_extra.trim()}` : ''
    const nombresDia = nombresDias(tipoEntrenamiento, perfil.fase, objetivo, formato, dias)
    const diasGenerados: any[] = []
    for (let i = 1; i <= dias; i++) {
      const nombreDia = nombresDia[i - 1] || `Día ${i}`
      if (perfil.fase <= 1) { diasGenerados.push(generarDiaFase01(i, nombreDia, perfil)); continue }
      const prompt = buildPromptIA(i, nombreDia, cliente, perfil, cuestionario, biblioPrompt, contextoPrompt, marcasPrompt)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 900,
          system: 'Responde SOLO con JSON válido. Sin texto ni markdown.',
          messages: [{ role: 'user', content: prompt }] })
      })
      if (!res.ok) continue
      const aiData = await res.json()
      const texto = (aiData.content?.[0]?.text || '').trim()
      let diaObj: any = null
      try { diaObj = JSON.parse(texto) } catch {}
      if (!diaObj) { const m = texto.match(/\{[\s\S]*\}/); if (m) try { diaObj = JSON.parse(m[0]) } catch {} }
      if (diaObj) { diaObj.dia = i; diasGenerados.push(diaObj) }
    }
    if (diasGenerados.length === 0) return new Response(JSON.stringify({ error: 'No se pudo generar ningún día' }), { status: 500, headers: CORS })
    const faseLabel = ['Adaptación','Base','Desarrollo','Rendimiento'][perfil.fase]
    const formatoLabel = formato ? ` [${formato.replace(/_/g,' ')}]` : ''
    const nombreRutina = `Rutina ${objetivo.replace(/_/g,' ')} - Fase ${faseLabel}${formatoLabel} - ${dias} días`
    const notasEntrenador = perfil.alertas.length > 0
      ? `⚠️ ALERTAS CLÍNICAS:\n${perfil.alertas.map((a:string)=>'• '+a).join('\n')}\n\nFase: ${faseLabel}${formatoLabel}`
      : `Fase: ${faseLabel}${formatoLabel}`
    const rutina = { nombre: nombreRutina, descripcion: `${faseLabel} - ${dias} días`, semanas: 4, dias: diasGenerados }
    const { data: saved, error: saveError } = await supabase.from('rutinas').insert({
      cliente_id, entrenador_id: cliente.entrenador_id, nombre: nombreRutina, objetivo,
      semanas: 4, dias_semana: dias, borrador: rutina, notas_entrenador: notasEntrenador, estado: 'borrador'
    }).select().single()
    if (saveError) return new Response(JSON.stringify({ error: saveError.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ ok: true, rutina: saved, dias_generados: diasGenerados.length, fase: perfil.fase, fase_label: faseLabel, formato, alertas: perfil.alertas }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
