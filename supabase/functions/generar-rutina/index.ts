import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const TIPOS_PROMPT: Record<string, string> = {
  fuerza: 'Enfoque en fuerza maxima. Series de 3-6 reps con cargas altas (85-95% RM). Movimientos compuestos: sentadilla, peso muerto, press banca, press militar. Descansos largos 3-5 min.',
  hipertrofia: 'Enfoque en hipertrofia. Series de 8-12 reps con cargas moderadas (70-80% RM). Combina compuestos e isolation. Superseries y drop sets. Descansos 60-90 seg.',
  perdida_grasa: 'Enfoque en perdida de grasa. Circuitos y supersets con poco descanso (30-60 seg). Series de 12-20 reps. Alta densidad de trabajo. Ejercicios metabolicos.',
  resistencia: 'Enfoque en resistencia muscular. Series de 15-25 reps con cargas ligeras. Circuitos con minimo descanso. Combina fuerza con cardio.',
  hibrido: 'Entrenamiento hibrido: combina bloques de fuerza (3-6 reps) con resistencia (12-20 reps). Incluye series de carrera (400m, 1km) y ejercicios de potencia. Alterna dias de fuerza pura con dias metabolicos.',
  crossfit: 'Estilo CrossFit. WODs con estructura Strength/Skill + MetCon. Incluye movimientos olimpicos (clean, snatch, thruster), gimnasticos (pull-up, HSPU, TTB) y metabolicos (remo, assault bike, doble comba). AMRAPs y por tiempo.',
  potencia: 'Enfoque en potencia y explosividad. Movimientos balisticos: saltos, kettlebell swings, levantamientos olimpicos. Series cortas 3-5 reps a maxima velocidad.',
  movilidad: 'Enfoque en movilidad y control motor. Movilidad articular activa. Fuerza en rangos extremos. Stretching dinamico. Core profundo.',
  calistenia: 'Calistenia progresiva. Solo peso corporal: dominadas, fondos, flexiones, pistol squat. Progresiones hacia habilidades avanzadas.',
  wellness: 'Enfoque wellness. Ejercicios de bajo impacto con correcta tecnica. Equilibrio entre fuerza funcional, movilidad y cardio suave.'
}
const NOMBRES_DIAS = ['Dia A - Full Body / Empuje', 'Dia B - Full Body / Tiron', 'Dia C - Piernas y Core', 'Dia D - Upper Body', 'Dia E - Full Body / Fuerza', 'Dia F - Cardio y Movilidad']

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers })

  try {
    const body = await req.json().catch(() => ({}))
    const { cliente_id, contexto_extra } = body
    if (!cliente_id) return new Response(JSON.stringify({ error: 'cliente_id requerido' }), { status: 400, headers })

    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', cliente_id).single()
    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers })
    if (cliente.entrenador_id !== user.id) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers })

    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) return new Response(JSON.stringify({ error: 'API key no configurada' }), { status: 500, headers })

    const { data: biblioteca } = await supabase.from('ejercicios_biblioteca').select('nombre, patron, grupo_muscular, nivel, modalidad').eq('entrenador_id', cliente.entrenador_id).limit(200)
    const objetivo = (cliente.objetivo || 'perdida_grasa').replace(/_/g, ' ')
    const nivel = cliente.nivel || 'principiante'
    const dias = cliente.dias_semana || 3
    const material = cliente.material || 'gimnasio'
    const lesiones = cliente.lesiones || 'ninguna'
    const tipoEntrenamiento = cliente.tipo_entrenamiento || ''
    const tipoPrompt = tipoEntrenamiento && TIPOS_PROMPT[tipoEntrenamiento] ? `\nESTILO: ${TIPOS_PROMPT[tipoEntrenamiento]}` : ''
    const contextoPrompt = contexto_extra && contexto_extra.trim() ? `\nINSTRUCCIONES ESPECIFICAS DEL ENTRENADOR (PRIORIDAD MAXIMA): ${contexto_extra.trim()}` : ''
    const nombresCanonicos = biblioteca?.map((e: any) => e.nombre).join(', ') || ''
    const biblioPrompt = nombresCanonicos ? `\nUSA PREFERENTEMENTE estos nombres exactos de ejercicios: ${nombresCanonicos}.` : ''

    const diasGenerados: any[] = []
    for (let i = 1; i <= dias; i++) {
      const nombreDia = NOMBRES_DIAS[i - 1] || `Dia ${i}`
      const prompt = `Genera SOLO el dia ${i} de una rutina de ${dias} dias para este cliente:
- Objetivo: ${objetivo}
- Nivel: ${nivel}
- Material: ${material}
- Lesiones: ${lesiones}${tipoPrompt}${contextoPrompt}${biblioPrompt}
- Nombre del dia: ${nombreDia}

MAXIMO 5 ejercicios. Responde SOLO con este JSON sin texto adicional:
{"dia":${i},"nombre":"${nombreDia}","patron_principal":"...","ejercicios":[{"orden":1,"nombre":"...","patron":"...","series":3,"reps":"8-10","descanso":"90s","notas":"..."}]}`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 1000,
          system: 'Responde UNICAMENTE con JSON valido. Sin texto, sin markdown, sin explicaciones.',
          messages: [{ role: 'user', content: prompt }]
        })
      })
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: 'Anthropic error dia ' + i, detail: err.slice(0, 200) }), { status: 500, headers })
      }
      const aiData = await res.json()
      const texto = (aiData.content?.[0]?.text || '').trim()
      let diaObj: any = null
      try { diaObj = JSON.parse(texto) } catch {}
      if (!diaObj) {
        const limpio = texto.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
        try { diaObj = JSON.parse(limpio) } catch {}
      }
      if (!diaObj) {
        const match = texto.match(/\{[\s\S]*\}/)
        if (match) try { diaObj = JSON.parse(match[0]) } catch {}
      }
      if (diaObj) { diaObj.dia = i; diasGenerados.push(diaObj) }
    }

    if (diasGenerados.length === 0) return new Response(JSON.stringify({ error: 'No se pudo generar ningun dia' }), { status: 500, headers })

    const tipoLabel = tipoEntrenamiento ? ` - ${tipoEntrenamiento.replace(/_/g, ' ')}` : ''
    const nombreRutina = `Rutina ${objetivo}${tipoLabel} - ${dias} dias`
    const rutina = { nombre: nombreRutina, descripcion: `Programa de ${dias} dias enfocado en ${objetivo}${tipoLabel} para nivel ${nivel}`, semanas: 4, dias: diasGenerados }

    const { data: saved, error: saveError } = await supabase.from('rutinas').insert({
      cliente_id, entrenador_id: cliente.entrenador_id, nombre: nombreRutina, objetivo: cliente.objetivo,
      semanas: 4, dias_semana: dias, borrador: rutina, estado: 'borrador'
    }).select().single()
    if (saveError) return new Response(JSON.stringify({ error: saveError.message }), { status: 500, headers })

    return new Response(JSON.stringify({ ok: true, rutina: saved, dias_generados: diasGenerados.length }), { headers })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
})
