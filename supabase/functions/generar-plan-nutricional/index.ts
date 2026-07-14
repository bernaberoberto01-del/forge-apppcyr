import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

// NOTA: función no referenciada en el frontend actual y sus tablas
// (nutricion_cuestionarios / planes_nutricionales) no existen en el esquema
// vigente — parece código obsoleto, sustituido por generar-nutricion.
// Se protege igualmente por si acaso queda desplegada.

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers })

  try {
    const { cliente_id } = await req.json()
    if (!cliente_id) return new Response(JSON.stringify({ error: 'cliente_id requerido' }), { status: 400, headers })

    const [{ data: cliente }, { data: cuest }] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', cliente_id).single(),
      supabase.from('nutricion_cuestionarios').select('*').eq('cliente_id', cliente_id).order('created_at', { ascending: false }).limit(1).single()
    ])
    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers })
    if (cliente.entrenador_id !== user.id) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers })
    if (!cuest) return new Response(JSON.stringify({ error: 'sin_cuestionario' }), { status: 400, headers })

    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) return new Response(JSON.stringify({ error: 'API key no configurada' }), { status: 500, headers })

    const prompt = `Eres nutricionista deportivo experto. Crea un plan nutricional completo para este cliente:\n\nDATOS: Edad ${cuest.edad || '?'}a, ${cuest.altura_cm || '?'}cm, ${cuest.peso_actual || cliente.peso_actual || '?'}kg -> objetivo ${cuest.peso_objetivo || cliente.peso_objetivo || '?'}kg\nOBJETIVO: ${cuest.objetivo || 'perdida_grasa'} | Ritmo: ${cuest.ritmo || 'moderado'}\nACTIVIDAD: ${cuest.nivel_actividad || 'moderado'} | ${cuest.entrenos_semana || 3} entrenos/sem | ${cuest.tipo_entreno || 'fuerza'}\nDIETA: ${cuest.comidas_dia || 3} comidas | ${cuest.preferencias || 'omnivoro'} | Cocina: ${cuest.cocina_en_casa ? 'si' : 'no'} | Tiempo: ${cuest.tiempo_cocina || 'medio'} | Presupuesto: ${cuest.presupuesto || 'medio'}\nRESTRICCIONES: Alergias: ${cuest.alergias || 'ninguna'} | Intolerancias: ${cuest.intolerancias || 'ninguna'} | No gusta: ${cuest.alimentos_no_gustan || 'ninguno'}\nFAVORITOS: ${cuest.alimentos_favoritos || 'variado'} | Suplementos: ${cuest.suplementos || 'ninguno'} | Patologias: ${cuest.patologias || 'ninguna'}\n\nResponde SOLO con JSON valido sin texto adicional:\n{\n  "resumen": {\n    "calorias": 2200,\n    "proteinas_g": 165,\n    "carbohidratos_g": 220,\n    "grasas_g": 73,\n    "tdee": 2400,\n    "deficit_superavit": -200,\n    "notas_calculo": "Basado en Harris-Benedict"\n  },\n  "guia_macros": {\n    "proteinas": "descripcion...",\n    "carbohidratos": "descripcion...",\n    "grasas": "descripcion..."\n  },\n  "dias": [\n    {\n      "dia": 1,\n      "nombre": "Dia tipo entreno",\n      "calorias_dia": 2200,\n      "comidas": [\n        {\n          "nombre": "Desayuno",\n          "hora": "08:00",\n          "calorias": 450,\n          "proteinas": 35,\n          "carbos": 45,\n          "grasas": 12,\n          "alimentos": [{"nombre": "Avena", "cantidad": "80g"}],\n          "preparacion": "descripcion breve"\n        }\n      ]\n    }\n  ],\n  "suplementacion": [{"nombre": "Proteina whey", "dosis": "30g post-entreno", "motivo": "recuperacion"}],\n  "consejos": ["consejo 1", "consejo 2"]\n}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 8000,
        system: 'Eres nutricionista deportivo experto. Responde UNICAMENTE con JSON valido. Sin texto, sin markdown.',
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const aiData = await res.json()
    let texto = (aiData.content?.[0]?.text || '').trim()
    let plan: any = null
    try { plan = JSON.parse(texto) } catch {}
    if (!plan) {
      texto = texto.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
      try { plan = JSON.parse(texto) } catch {}
    }
    if (!plan) {
      const m = texto.match(/\{[\s\S]*\}/)
      if (m) try { plan = JSON.parse(m[0]) } catch {}
    }
    if (!plan) return new Response(JSON.stringify({ error: 'Error al parsear IA' }), { status: 500, headers })

    const nombre = `Plan nutricional ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`
    const { data: saved, error: saveError } = await supabase.from('planes_nutricionales').insert({
      cliente_id, entrenador_id: cliente.entrenador_id, nombre, estado: 'borrador',
      calorias_objetivo: plan.resumen?.calorias, proteinas_g: plan.resumen?.proteinas_g,
      carbohidratos_g: plan.resumen?.carbohidratos_g, grasas_g: plan.resumen?.grasas_g, borrador: plan
    }).select().single()
    if (saveError) return new Response(JSON.stringify({ error: saveError.message }), { status: 500, headers })

    return new Response(JSON.stringify({ ok: true, plan: saved }), { headers })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
})
