import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

function parseJSON(raw: string): any {
  if (!raw) return null
  const t = raw.trim().replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/,'').trim()
  try { return JSON.parse(t) } catch {}
  const arr = t.match(/\[[\s\S]*\]/)
  if (arr) try { return JSON.parse(arr[0]) } catch {}
  return null
}

const DIST: Record<number,{nombre:string;hora:string;pct:number}[]> = {
  2:[{nombre:'Comida principal',hora:'13:00',pct:0.55},{nombre:'Cena',hora:'20:00',pct:0.45}],
  3:[{nombre:'Desayuno',hora:'08:00',pct:0.30},{nombre:'Comida',hora:'14:00',pct:0.40},{nombre:'Cena',hora:'21:00',pct:0.30}],
  4:[{nombre:'Desayuno',hora:'08:00',pct:0.25},{nombre:'Media ma\u00f1ana',hora:'11:00',pct:0.15},{nombre:'Comida',hora:'14:00',pct:0.35},{nombre:'Cena',hora:'21:00',pct:0.25}],
  5:[{nombre:'Desayuno',hora:'08:00',pct:0.20},{nombre:'Media ma\u00f1ana',hora:'11:00',pct:0.15},{nombre:'Comida',hora:'14:00',pct:0.30},{nombre:'Merienda',hora:'17:30',pct:0.15},{nombre:'Cena',hora:'21:00',pct:0.20}],
  6:[{nombre:'Desayuno',hora:'08:00',pct:0.18},{nombre:'Media ma\u00f1ana',hora:'10:30',pct:0.12},{nombre:'Comida',hora:'13:30',pct:0.28},{nombre:'Merienda',hora:'17:00',pct:0.12},{nombre:'Pre-cena',hora:'19:30',pct:0.10},{nombre:'Cena',hora:'21:30',pct:0.20}],
}
const AYUNO=[{nombre:'Rotura del ayuno',hora:'12:00',pct:0.30},{nombre:'Comida principal',hora:'15:30',pct:0.40},{nombre:'Ultima comida',hora:'19:30',pct:0.30}]

function strOrDefault(v: any, def: string): string {
  if (!v || String(v).trim() === '') return def
  return String(v).trim()
}
function numOrDefault(v: any, def: number): number {
  const n = Number(v)
  return isNaN(n) || n <= 0 ? def : n
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data:{ user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })

    const body = await req.json().catch(() => null)
    const { cliente_id, instrucciones_extra } = body || {}
    if (!cliente_id) return new Response(JSON.stringify({ error: 'cliente_id requerido' }), { status: 400, headers: CORS })
    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) return new Response(JSON.stringify({ error: 'Sin API key' }), { status: 500, headers: CORS })

    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', cliente_id).single()
    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: CORS })
    if (cliente.entrenador_id !== user.id) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })

    let q: any = {}
    try {
      const { data: cuest } = await supabase.from('cuestionarios_nutricion').select('*')
        .eq('cliente_id', cliente_id).order('created_at', { ascending: false }).limit(1).single()
      if (cuest) q = cuest
    } catch (_) {}

    // Valores seguros con defaults — nunca NaN ni null
    const peso      = numOrDefault(q.peso || cliente.peso_actual, 75)
    const altura    = numOrDefault(q.altura, 170)
    const edad      = numOrDefault(q.edad, 30)
    const sexo      = strOrDefault(q.sexo, 'hombre')
    const actividad = strOrDefault(q.nivel_actividad, 'moderado')
    const objetivoRaw = strOrDefault(q.objetivo || cliente.objetivo, 'perdida_grasa')
    const objetivo  = objetivoRaw.replace(/_/g,' ')
    const dieta     = strOrDefault(q.tipo_dieta, 'omnivora')
    const alergias  = strOrDefault(q.alergias, 'ninguna')
    const intolerancias = strOrDefault(q.intolerancias, 'ninguna')
    const noGusta   = strOrDefault(q.alimentos_no_gustan, 'ninguno')
    const favoritos = strOrDefault(q.alimentos_favoritos, 'variado')
    const suplementos = strOrDefault(q.suplementos, 'ninguno').toLowerCase()
    const tomaSuplementos = !['ninguno','no',''].includes(suplementos)
    const entrenaWhen = strOrDefault(q.entrena_cuando, 'manana')
    const comidasNum  = numOrDefault(q.comidas_dia, 4)
    const tiempoCocina = strOrDefault(q.tiempo_cocina, '30 minutos')
    const horarioComidas = strOrDefault(q.horario_comidas, '')
    const notasCliente = strOrDefault(q.notas, '')
    const notasEntrenador = strOrDefault(instrucciones_extra, '')
    const esAyuno = dieta.includes('ayuno')

    const esPerdida  = /grasa|perdida/.test(objetivoRaw)
    const esGanancia = /muscular|ganancia/.test(objetivoRaw)

    const TMB = sexo === 'mujer'
      ? 10*peso + 6.25*altura - 5*edad - 161
      : 10*peso + 6.25*altura - 5*edad + 5
    const factAct: Record<string,number> = { sedentario:1.2, ligero:1.375, moderado:1.55, activo:1.725, muy_activo:1.9 }
    const TDEE = Math.round(TMB * (factAct[actividad] || 1.55))
    const ajuste = esPerdida ? -400 : esGanancia ? 300 : 0
    const kcal = Math.max(TDEE + ajuste, 1200) // nunca bajar de 1200
    const prot = Math.round(peso * (esGanancia ? 2.2 : esPerdida ? 2.0 : 1.8))
    const gras = Math.round((kcal * 0.28) / 9)
    const carb = Math.max(Math.round((kcal - prot*4 - gras*9) / 4), 50)
    const hidratacion = Number((peso * 0.035).toFixed(1))

    const comidasDia = esAyuno ? 3 : Math.min(Math.max(comidasNum, 2), 6)
    const slots = esAyuno ? AYUNO : (DIST[comidasDia] || DIST[4])
    const estructura = slots.map(s => ({ ...s, kcal: Math.round(kcal * s.pct) }))
    const dias = ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo']
    const structureStr = estructura.map(s => `${s.nombre}(${s.hora}):${s.kcal}kcal`).join('|')

    const prompt = [
      `Menu semanal: ${sexo} ${edad}a ${peso}kg ${altura}cm. Objetivo:${objetivo}. Dieta:${dieta}. Act:${actividad}.`,
      `${kcal}kcal ${esPerdida?'DEFICIT-400':''}${esGanancia?'SUPERAVIT+300':''} | ${prot}g prot | ${carb}g carb | ${gras}g gras.`,
      `Alergias:${alergias}. Intolerancias:${intolerancias}. Evitar:${noGusta}. Incluir:${favoritos}. Cocina:${tiempoCocina}.`,
      horarioComidas ? `Horario preferido de comidas:${horarioComidas}.` : '',
      tomaSuplementos ? `Suplementos:${suplementos}.` : 'SIN suplementos.',
      esAyuno ? 'AYUNO16:8 ventana 12-20h.' : '',
      `Entrena:${entrenaWhen}. Carbs pre-entreno, proteina post.`,
      `${comidasDia} comidas/dia FIJAS: ${structureStr}.`,
      notasCliente ? `IMPORTANTE - Notas del cliente (prioridad alta, tenlas en cuenta siempre): ${notasCliente}.` : '',
      notasEntrenador ? `IMPORTANTE - Instrucciones del entrenador para este plan (prioridad maxima, aplicar estrictamente): ${notasEntrenador}.` : '',
      'Genera 7 dias variando alimentos. Cantidades en gramos. Preparacion breve (max 8 palabras).',
      `JSON:[{"dia":"Lunes","comidas":[{"nombre":"${slots[0].nombre}","hora":"${slots[0].hora}","kcal":${estructura[0].kcal},"proteinas_g":30,"carbohidratos_g":40,"grasas_g":10,"alimentos":[{"nombre":"Ejemplo","cantidad":"150g"}],"prep":"Descripcion breve"}]}]`
    ].filter(Boolean).join('\n')

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        system: 'Eres nutricionista deportivo. Responde SOLO con array JSON de 7 objetos. Sin texto adicional ni markdown. Se conciso en el campo prep (max 8 palabras). Las notas del cliente y las instrucciones del entrenador tienen prioridad sobre las preferencias por defecto.',
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const aiData = await aiRes.json()
    if (!aiRes.ok) return new Response(JSON.stringify({ error: 'Anthropic: ' + (aiData.error?.message || aiRes.status) }), { status: 500, headers: CORS })

    const rawText = aiData.content?.[0]?.text || ''
    const menu = parseJSON(rawText)
    if (!menu || !Array.isArray(menu)) {
      const truncado = aiData.stop_reason === 'max_tokens'
      return new Response(JSON.stringify({ error: truncado ? 'Respuesta de IA cortada por limite de tokens' : 'JSON invalido de la IA', raw: rawText.slice(0,500), stop_reason: aiData.stop_reason }), { status: 500, headers: CORS })
    }

    const menuFinal = menu.slice(0,7).map((d: any, i: number) => ({ ...d, dia: dias[i] }))

    const recomendaciones = [
      `Bebe ${hidratacion}L de agua al dia`,
      esAyuno ? 'Ayuno 16:8: solo agua, cafe o te sin azucar fuera de la ventana' : 'Come siempre a las mismas horas',
      esPerdida ? `Deficit de ${Math.abs(ajuste)}kcal/dia. Prioriza proteina en cada comida` : esGanancia ? `Superavit de ${ajuste}kcal/dia. Entrena con progresion de cargas` : 'Mantenimiento. Consistencia en ingesta y entrenamiento',
      'Duerme 7-9 horas: fundamental para la recuperacion',
      tomaSuplementos ? `${suplementos} preferiblemente post-entreno` : 'Plan sin suplementos. Prioriza alimentos reales',
    ]

    const nombre = `Plan ${objetivo} - ${peso}kg`
    const contenido = {
      nombre,
      macros: { calorias_dia:kcal, proteinas_g:prot, carbohidratos_g:carb, grasas_g:gras, hidratacion_litros:hidratacion },
      menu: menuFinal, hidratacion, recomendaciones,
      notas: `${kcal}kcal/dia - ${prot}g proteina - ${comidasDia} comidas${esAyuno?' - Ayuno 16:8':''}`,
      datos_calculo: { peso, altura, edad, sexo, actividad, TMB:Math.round(TMB), TDEE, ajuste, objetivo:objetivoRaw }
    }

    await supabase.from('planes_nutricion').delete().eq('cliente_id', cliente_id)
    const { data: saved, error: saveErr } = await supabase.from('planes_nutricion').insert({
      cliente_id, entrenador_id: cliente.entrenador_id, nombre, objetivo: cliente.objetivo,
      calorias_dia:kcal, proteinas_g:prot, carbohidratos_g:carb, grasas_g:gras,
      borrador: contenido, estado: 'borrador'
    }).select().single()

    if (saveErr) return new Response(JSON.stringify({ error: 'Error guardando: '+saveErr.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ ok: true, plan: saved }), { headers: CORS })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), { status: 500, headers: CORS })
  }
})
