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

const DIST: Record<number, {nombre:string;hora:string;pct:number}[]> = {
  2: [{nombre:'Comida principal',hora:'13:00',pct:0.55},{nombre:'Cena',hora:'20:00',pct:0.45}],
  3: [{nombre:'Desayuno',hora:'08:00',pct:0.30},{nombre:'Comida',hora:'14:00',pct:0.40},{nombre:'Cena',hora:'21:00',pct:0.30}],
  4: [{nombre:'Desayuno',hora:'08:00',pct:0.25},{nombre:'Media manana',hora:'11:00',pct:0.15},{nombre:'Comida',hora:'14:00',pct:0.35},{nombre:'Cena',hora:'21:00',pct:0.25}],
  5: [{nombre:'Desayuno',hora:'08:00',pct:0.20},{nombre:'Media manana',hora:'11:00',pct:0.15},{nombre:'Comida',hora:'14:00',pct:0.30},{nombre:'Merienda',hora:'17:30',pct:0.15},{nombre:'Cena',hora:'21:00',pct:0.20}],
  6: [{nombre:'Desayuno',hora:'08:00',pct:0.18},{nombre:'Media manana',hora:'10:30',pct:0.12},{nombre:'Comida',hora:'13:30',pct:0.28},{nombre:'Merienda',hora:'17:00',pct:0.12},{nombre:'Pre-cena',hora:'19:30',pct:0.10},{nombre:'Cena',hora:'21:30',pct:0.20}],
}
const AYUNO = [{nombre:'Rotura del ayuno',hora:'12:00',pct:0.30},{nombre:'Comida principal',hora:'15:30',pct:0.40},{nombre:'Ultima comida',hora:'19:30',pct:0.30}]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    // ── Autenticación: exigir JWT de usuario válido ──
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })
    }

    const body = await req.json().catch(() => null)
    const { cliente_id } = body || {}
    if (!cliente_id) return new Response(JSON.stringify({ error: 'cliente_id requerido' }), { status: 400, headers: CORS })
    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada' }), { status: 500, headers: CORS })

    const { data: cliente, error: clienteErr } = await supabase
      .from('clientes').select('*').eq('id', cliente_id).single()
    if (clienteErr || !cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: CORS })

    // Autorización: el entrenador que llama debe ser dueño del cliente
    if (cliente.entrenador_id !== user.id) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })
    }

    let q: any = {}
    try {
      const { data: cuest } = await supabase
        .from('cuestionarios_nutricion').select('*')
        .eq('cliente_id', cliente_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (cuest) q = cuest
    } catch (_) {}

    const peso      = Number(q.peso || cliente.peso_actual || 75)
    const altura    = Number(q.altura || 170)
    const edad      = Number(q.edad || 30)
    const sexo      = q.sexo || 'hombre'
    const actividad = q.nivel_actividad || 'moderado'
    const objetivo  = String(q.objetivo || cliente.objetivo || 'perdida_grasa').replace(/_/g,' ')
    const dieta     = String(q.tipo_dieta || 'omnivora')
    const alergias  = q.alergias || 'ninguna'
    const noGusta   = q.alimentos_no_gustan || 'ninguno'
    const favoritos = q.alimentos_favoritos || 'variado'
    const suplementos  = q.suplementos || 'ninguno'
    const entrenaWhen  = q.entrena_cuando || 'manana'
    const comidasNum   = q.comidas_dia ? Number(q.comidas_dia) : 4
    const tiempoCocina = q.tiempo_cocina || '30 minutos'
    const esAyuno = dieta.includes('ayuno') || comidasNum === 0

    const TMB = sexo === 'mujer' ? 10*peso + 6.25*altura - 5*edad - 161 : 10*peso + 6.25*altura - 5*edad + 5
    const factAct: Record<string,number> = { sedentario:1.2, ligero:1.375, moderado:1.55, activo:1.725, muy_activo:1.9 }
    const TDEE = Math.round(TMB * (factAct[actividad] || 1.55))
    const ajuste = objetivo.includes('grasa') || objetivo.includes('perdida') ? -400
                 : objetivo.includes('muscular') || objetivo.includes('ganancia') ? 300 : 0
    const kcal = TDEE + ajuste
    const prot = Math.round(peso * (objetivo.includes('muscular') ? 2.0 : 1.7))
    const gras = Math.round((kcal * 0.28) / 9)
    const carb = Math.round((kcal - prot*4 - gras*9) / 4)
    const hidratacion = Number((peso * 0.035).toFixed(1))

    const comidasDia = esAyuno ? 3 : Math.min(Math.max(comidasNum, 2), 6)
    const slots = esAyuno ? AYUNO : (DIST[comidasDia] || DIST[4])
    const estructura = slots.map(s => ({ ...s, kcal: Math.round(kcal * s.pct) }))
    const dias = ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo']
    const structureStr = estructura.map(s => s.nombre + ' (' + s.hora + '): ' + s.kcal + ' kcal').join(' | ')

    const system = 'Eres nutricionista deportivo. Responde SOLO con array JSON de 7 objetos. Sin texto adicional.'
    const lines = [
      'Menu semanal para: ' + sexo + ' ' + edad + 'a ' + peso + 'kg ' + altura + 'cm.',
      'Objetivo: ' + objetivo + ' | Dieta: ' + dieta + ' | Actividad: ' + actividad,
      kcal + ' kcal/dia | ' + prot + 'g prot | ' + carb + 'g carb | ' + gras + 'g gras',
      'Sin: ' + alergias + ' | Evitar: ' + noGusta + ' | Incluir: ' + favoritos,
      'Suplementos: ' + suplementos + ' | Cocina: ' + tiempoCocina,
      esAyuno ? 'AYUNO 16:8: ventana 12:00-20:00. Nada antes de las 12h.' : '',
      'Entrena: ' + entrenaWhen + '. Carbohidratos pre-entreno, proteina post-entreno.',
      'Estructura FIJA ' + comidasDia + ' comidas/dia: ' + structureStr,
      'Genera 7 dias variando alimentos. Mismos nombres/horas exactos. kcal exactas. Cantidades en gramos.',
      'JSON: [{"dia":"Lunes","comidas":[{"nombre":"' + slots[0].nombre + '","hora":"' + slots[0].hora + '","kcal":' + estructura[0].kcal + ',"proteinas_g":40,"carbohidratos_g":50,"grasas_g":15,"alimentos":[{"nombre":"ejemplo","cantidad":"150g"}],"prep":"breve"}]}]'
    ]
    const prompt = lines.filter(Boolean).join('\n')

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4000, system, messages: [{ role: 'user', content: prompt }] })
    })
    const aiData = await aiRes.json()
    if (!aiRes.ok) return new Response(JSON.stringify({ error: 'Anthropic: ' + (aiData.error?.message || aiRes.status) }), { status: 500, headers: CORS })

    const rawText = aiData.content?.[0]?.text || ''
    const menu = parseJSON(rawText)
    if (!menu || !Array.isArray(menu)) {
      return new Response(JSON.stringify({ error: 'La IA no devolvio JSON valido', preview: rawText.slice(0,200) }), { status: 500, headers: CORS })
    }

    const menuFinal = menu.slice(0,7).map((d: any, i: number) => ({ ...d, dia: dias[i] }))

    const recomendaciones = [
      'Bebe ' + hidratacion + 'L de agua al dia (' + Math.round(hidratacion*1000/comidasDia) + 'ml por comida aproximadamente)',
      esAyuno ? 'Durante el ayuno (20:00-12:00) solo agua, cafe o te sin azucar' : 'Come siempre a las mismas horas para regular el metabolismo',
      objetivo.includes('grasa') || objetivo.includes('perdida') ? 'Prioriza proteina en cada comida para preservar musculo en deficit' : 'Mantén el superavit calorico constante y entrena con progresion de cargas',
      'Duerme 7-9 horas: el descanso es parte fundamental del proceso de cambio corporal',
      suplementos !== 'ninguno' ? 'Toma ' + suplementos + ' preferiblemente despues del entreno' : 'Prioriza alimentos reales sobre suplementos',
    ]

    const nombre = 'Plan ' + objetivo + ' - ' + peso + 'kg'
    const contenido = {
      nombre,
      macros: { calorias_dia: kcal, proteinas_g: prot, carbohidratos_g: carb, grasas_g: gras, hidratacion_litros: hidratacion },
      menu: menuFinal,
      hidratacion,
      recomendaciones,
      notas: kcal + ' kcal/dia - ' + prot + 'g proteina - ' + comidasDia + ' comidas' + (esAyuno ? ' - Ayuno 16:8' : ''),
      datos_calculo: { peso, altura, edad, sexo, actividad, TMB: Math.round(TMB), TDEE, ajuste }
    }

    // Borrar TODOS los planes del cliente antes de crear el nuevo
    await supabase.from('planes_nutricion').delete().eq('cliente_id', cliente_id)

    const { data: saved, error: saveErr } = await supabase.from('planes_nutricion').insert({
      cliente_id, entrenador_id: cliente.entrenador_id, nombre, objetivo: cliente.objetivo,
      calorias_dia: kcal, proteinas_g: prot, carbohidratos_g: carb, grasas_g: gras,
      borrador: contenido, estado: 'borrador'
    }).select().single()

    if (saveErr) return new Response(JSON.stringify({ error: 'Error guardando: ' + saveErr.message }), { status: 500, headers: CORS })
    return new Response(JSON.stringify({ ok: true, plan: saved }), { headers: CORS })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), { status: 500, headers: CORS })
  }
})
