import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

async function llamarIA(prompt: string, maxTokens = 2000): Promise<any> {
  for (let intento = 0; intento < 2; intento++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens,
          system: 'Responde SOLO con JSON valido. Sin texto ni markdown.',
          messages: [{ role: 'user', content: prompt }] })
      })
      if (res.status === 429 || res.status === 529) { await new Promise(r => setTimeout(r, 1500)); continue }
      if (!res.ok) return null
      const data = await res.json()
      const texto = (data.content?.[0]?.text || '').trim()
      try { return JSON.parse(texto) } catch {}
      const m = texto.match(/\{[\s\S]*\}/)
      if (m) try { return JSON.parse(m[0]) } catch {}
    } catch { /* reintentar */ }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: { user } } = await sb.auth.getUser(token || '')
  if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })

  const { cliente_id } = await req.json().catch(() => ({}))
  if (!cliente_id) return new Response(JSON.stringify({ error: 'cliente_id requerido' }), { status: 400, headers: CORS })

  await sb.from('clientes').update({ ia_estado: 'generando' }).eq('id', cliente_id)

  try {
    const [{ data: cliente }, { data: cuestionario }, { data: cuestNutri }] = await Promise.all([
      sb.from('clientes').select('*').eq('id', cliente_id).single(),
      sb.from('cuestionarios').select('*').eq('cliente_id', cliente_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('cuestionarios_nutricion').select('*').eq('cliente_id', cliente_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: CORS })
    if (cliente.entrenador_id !== user.id) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })

    const plan = cliente.plan_online
    if (!plan) {
      await sb.from('clientes').update({ ia_estado: 'error' }).eq('id', cliente_id)
      return new Response(JSON.stringify({ error: 'Sin plan_online' }), { status: 400, headers: CORS })
    }

    const generados: string[] = []
    const pendientes: string[] = []
    const errores: string[] = []
    const promesas: Promise<void>[] = []

    // Generar rutina si el plan incluye entrenamiento
    if (plan === 'entrenamiento' || plan === 'completo') {
      promesas.push((async () => {
        const prompt = `Cliente online. Genera primera rutina personalizada.
Nombre:${cliente.nombre}|Objetivo:${(cliente.objetivo||'').replace(/_/g,' ')}|Nivel:${cliente.nivel||'principiante'}|Dias:${cliente.dias_semana||3}/semana|Material:${cuestionario?.material||'gimnasio'}|Lesiones:${cuestionario?.lesiones||'ninguna'}|Tipo:${cliente.tipo_entrenamiento||'fuerza'}
JSON:{"nombre":"Rutina inicial","descripcion":"breve","semanas":4,"dias":[{"dia":1,"nombre":"Dia A","patron_principal":"Fuerza","ejercicios":[{"orden":1,"nombre":"Sentadilla","patron":"fuerza","series":4,"reps":"8-10","descanso":"2 min","notas":""}]}]}`
        const rutina = await llamarIA(prompt, 1500)
        if (rutina) {
          await sb.from('rutinas').insert({
            cliente_id, entrenador_id: cliente.entrenador_id,
            nombre: `Rutina inicial — ${cliente.nombre.split(' ')[0]}`,
            objetivo: cliente.objetivo, semanas: 4, dias_semana: cliente.dias_semana || 3,
            borrador: rutina, estado: 'borrador',
            notas_entrenador: `Plan online [${plan}] — generado automáticamente. Revisa y publica.`
          })
          generados.push('rutina')
        } else errores.push('rutina')
      })())
    }

    // Generar nutrición SOLO si hay datos del cuestionario de nutrición
    if (plan === 'nutricion' || plan === 'completo') {
      if (cuestNutri) {
        // Hay datos — generar plan nutricional
        promesas.push((async () => {
          const prompt = `Cliente online. Genera plan nutricional personalizado.
Nombre:${cliente.nombre}|Objetivo:${(cliente.objetivo||'').replace(/_/g,' ')}|Peso:${cuestNutri.peso||cuestionario?.peso_actual||'?'}kg|Altura:${cuestNutri.altura||cuestionario?.altura||'?'}cm|Edad:${cuestionario?.edad||'?'}|Intolerancias:${cuestionario?.alergias||'ninguna'}
JSON:{"nombre":"Plan nutricional inicial","descripcion":"breve","calorias_objetivo":2000,"proteinas_g":150,"carbohidratos_g":200,"grasas_g":65,"comidas":[{"nombre":"Desayuno","hora":"8:00","descripcion":"desc","alimentos":[{"nombre":"Avena","cantidad":"80g"}]}],"recomendaciones":["Hidratate bien"]}`
          const nutricion = await llamarIA(prompt, 1500)
          if (nutricion) {
            await sb.from('planes_nutricion').insert({
              cliente_id, entrenador_id: cliente.entrenador_id,
              nombre: `Plan nutricional — ${cliente.nombre.split(' ')[0]}`,
              objetivo: cliente.objetivo, contenido: nutricion, estado: 'borrador',
              notas_entrenador: `Plan online [${plan}] — generado con cuestionario de nutrición. Revisa y publica.`
            })
            generados.push('nutricion')
          } else errores.push('nutricion')
        })())
      } else {
        // Sin datos de nutrición — marcar como pendiente y alertar al entrenador
        pendientes.push('nutricion')
        // Crear alerta para que el entrenador sepa que falta el cuestionario
        await sb.from('alertas').insert({
          entrenador_id: cliente.entrenador_id, cliente_id,
          tipo: 'cuestionario_pendiente',
          mensaje: `⏳ ${cliente.nombre.split(' ')[0]} — El plan de nutrición está pendiente del cuestionario de alimentación. El cliente debe rellenarlo desde su portal.`
        })
      }
    }

    await Promise.all(promesas)

    const iaEstado = generados.length > 0 ? 'listo' : pendientes.length > 0 ? 'pendiente_datos' : 'error'
    await sb.from('clientes').update({ ia_estado: iaEstado }).eq('id', cliente_id)

    if (generados.length > 0) {
      await sb.from('alertas').insert({
        entrenador_id: cliente.entrenador_id, cliente_id,
        tipo: 'rutina_lista',
        mensaje: `📋 ${cliente.nombre.split(' ')[0]} — ${generados.join(' + ')} generado${pendientes.length ? ` · Pendiente: ${pendientes.join(', ')} (falta cuestionario)` : ''}. Revisa y publica.`
      })
    } else if (errores.length > 0 && pendientes.length === 0) {
      await sb.from('alertas').insert({
        entrenador_id: cliente.entrenador_id, cliente_id,
        tipo: 'error_ia',
        mensaje: `⚠️ ${cliente.nombre.split(' ')[0]} — Error al generar el plan. Genera manualmente desde Rutinas.`
      })
    }

    return new Response(JSON.stringify({ ok: true, plan, generados, pendientes, errores, ia_estado: iaEstado }), { headers: CORS })

  } catch (err: any) {
    await sb.from('clientes').update({ ia_estado: 'error' }).eq('id', cliente_id).catch(() => {})
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
