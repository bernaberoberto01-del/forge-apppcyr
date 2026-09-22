import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

const PLANES = {
  nutricion:     { nombre: 'H\u00e1bitos & Alimentaci\u00f3n', precio: '29\u20ac/mes' },
  entrenamiento: { nombre: 'Entrenamiento',            precio: '35\u20ac/mes' },
  completo:      { nombre: 'Plan Completo',             precio: '49\u20ac/mes' },
}

// Ciudades cercanas a Murcia donde tiene sentido sugerir presencial
const ZONA_MURCIA = ['murcia', 'cartagena', 'molina de segura', 'alcantarilla', 'lorca', 'torre-pacheco', 'cabezo de torres', 'espinardo', 'el palmar', 'beniaján', 'santomera', 'san javier', 'los alcázares']

function esCercaMurcia(ciudad: string): boolean {
  if (!ciudad) return false
  const c = ciudad.toLowerCase().trim()
  return ZONA_MURCIA.some(z => c.includes(z) || z.includes(c))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { entrenador_id, email } = await req.json().catch(() => ({}))
    if (!entrenador_id || !email) return new Response(JSON.stringify({ error: 'entrenador_id y email requeridos' }), { status: 400, headers: CORS })

    const { data: cuest } = await sb.from('cuestionarios')
      .select('*')
      .eq('entrenador_id', entrenador_id)
      .eq('email', email)
      .eq('procesado', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!cuest) return new Response(JSON.stringify({ error: 'Cuestionario no encontrado' }), { status: 404, headers: CORS })

    const OBJETIVO_TEXTO: Record<string,string> = {
      perdida_grasa: 'perder grasa y definirse',
      ganancia_muscular: 'ganar músculo y fuerza',
      rendimiento: 'mejorar rendimiento deportivo',
      salud_general: 'sentirse mejor y tener más energía',
      cambio_rapido_30dias: 'perder grasa Y ganar músculo a la vez',
    }
    const MATERIAL_TEXTO: Record<string,string> = {
      sin_material: 'sin material (solo peso corporal)',
      material_basico: 'mancuernas y gomas en casa',
      gimnasio: 'gimnasio completo con máquinas',
    }
    const TIEMPO_TEXTO: Record<string,string> = {
      menos_3h: 'menos de 3 horas semanales',
      '3_5h': '3-5 horas semanales',
      '5_8h': '5-8 horas semanales',
      mas_8h: 'más de 8 horas semanales',
    }

    // Detectar si es zona Murcia para sugerir presencial
    const esMurcia = esCercaMurcia(cuest.ciudad || '')
    const notaPresencial = esMurcia
      ? '\nNOTA IMPORTANTE: El cliente es de la zona de Murcia. Además del plan online, el entrenador ofrece entrenamiento presencial en Murcia. Inclúyelo en el mensaje de recomendación como opción adicional: "Si estás en Murcia, también puedes entrenar presencialmente con nosotros".' 
      : ''

    const prompt = `Eres el asistente de un entrenador personal premium. Analiza este diagnóstico y decide qué plan online recomendar.

CLIENTE: ${cuest.nombre}, ${cuest.edad || '?'} años, ${cuest.sexo || '?'}, ${cuest.ciudad || 'ciudad desconocida'}
OBJETIVO: ${OBJETIVO_TEXTO[cuest.objetivo] || cuest.objetivo || '?'}
ENTRENA AHORA: ${cuest.entrenas_ahora === 'si' ? 'Sí' : cuest.entrenas_ahora === 'aveces' ? 'A veces' : 'No'}
${cuest.dias_semana ? `Días/semana: ${cuest.dias_semana}` : ''}
${cuest.donde_entrena ? `Dónde: ${cuest.donde_entrena}` : ''}
MATERIAL: ${MATERIAL_TEXTO[cuest.material] || cuest.material || '?'}
DISPONIBILIDAD: ${cuest.disponibilidad_dias || cuest.dias_semana || '?'} días, ${TIEMPO_TEXTO[cuest.tiempo_semanal] || '?'}
LESIONES: ${cuest.tiene_lesion ? cuest.lesiones || 'Sí (sin especificar)' : 'Ninguna'}
ALIMENTACIÓN ACTUAL: ${cuest.alimentacion_actual || 'No especificada'}
QUÉ NO HA FUNCIONADO: ${cuest.que_no_funciono || 'No especificado'}
EXPECTATIVAS 30 DÍAS: ${cuest.expectativas_30dias || 'No especificadas'}
${notaPresencial}

PLANES ONLINE:
- nutricion: Hábitos & Alimentación (29€/mes) — pautas nutricionales
- entrenamiento: Entrenamiento (35€/mes) — rutina personalizada
- completo: Plan Completo (49€/mes) — entrenamiento + nutrición

CRITERIOS:
- Solo alimentación o sin tiempo/material: nutricion
- Objetivo de entrenamiento con material: entrenamiento o completo
- Cambios composición corporal o alimentación como problema: completo
- Dudas: completo (mejor resultado y más valor)

JSON:
{
  "plan": "nutricion|entrenamiento|completo",
  "es_zona_murcia": ${esMurcia},
  "justificacion": "2-3 frases con datos concretos del diagnóstico. Tono directo.",
  "mensaje_recomendacion": "Mensaje completo para enviar al cliente. 150-200 palabras. Empieza por su nombre. Explica plan, por qué le encaja, qué recibirá. ${esMurcia ? 'Menciona opción presencial en Murcia.' : ''} Termina con CTA de pago. Español natural."
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000,
        system: 'Responde SOLO con JSON válido. Sin texto ni markdown.',
        messages: [{ role: 'user', content: prompt }] })
    })

    if (!res.ok) throw new Error('Error IA')
    const aiData = await res.json()
    const texto = (aiData.content?.[0]?.text || '').trim()
    let result: any = null
    try { result = JSON.parse(texto) } catch {
      const m = texto.match(/\{[\s\S]*\}/)
      if (m) try { result = JSON.parse(m[0]) } catch {}
    }

    if (!result?.plan) throw new Error('IA no generó sugerencia válida')

    await sb.from('cuestionarios').update({
      sugerencia_plan: result.plan,
      sugerencia_justificacion: result.justificacion,
    }).eq('id', cuest.id)

    const plan = PLANES[result.plan as keyof typeof PLANES]
    const ciudadInfo = cuest.ciudad ? ` (${cuest.ciudad}${esMurcia ? ' — zona Murcia ✓' : ''})` : ''
    
    await sb.from('alertas').insert({
      entrenador_id,
      tipo: 'nuevo_cuestionario',
      mensaje: `📋 Nuevo diagnóstico: ${cuest.nombre}${ciudadInfo} — IA sugiere ${plan.nombre} (${plan.precio})${esMurcia ? ' · Considera también presencial' : ''}. ${result.justificacion}`,
    })

    return new Response(JSON.stringify({
      ok: true,
      plan: result.plan,
      es_zona_murcia: esMurcia,
      justificacion: result.justificacion,
    }), { headers: CORS })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
