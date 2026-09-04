import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret' }

async function analizarCliente(clienteId: string, entrenadorId: string) {
  const { data: ultimoAnalisis } = await sb.from('analisis_mensual')
    .select('created_at').eq('cliente_id', clienteId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  const desde = ultimoAnalisis?.created_at || new Date(0).toISOString()

  const { data: checkins } = await sb.from('checkins')
    .select('*').eq('cliente_id', clienteId)
    .gte('fecha', desde).order('fecha', { ascending: false }).limit(4)

  if (!checkins || checkins.length < 4) {
    return { skip: true, razon: 'menos_de_4_checkins', tiene: checkins?.length || 0 }
  }

  const avg = (campo: string) => {
    const vals = checkins.filter((c: any) => c[campo] != null).map((c: any) => Number(c[campo]))
    return vals.length ? Number((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1)) : null
  }

  const energia = avg('energia')
  const fatiga = avg('fatiga')
  const estres = avg('estres')
  const sueno = avg('sueno')
  const sesManual = avg('sesiones_semana')
  const sesPlani = avg('sesiones_planificadas')
  const adherencia = sesManual != null && sesPlani
    ? Math.min(100, Math.round((sesManual / sesPlani) * 100)) : null

  const cargaTextos = checkins.map((c: any) => c.cargas_sensacion).filter(Boolean)
  const muyFacil = cargaTextos.filter((c: string) => c === 'muy_facil').length
  const muyDuro = cargaTextos.filter((c: string) => c === 'muy_duro').length
  const bien = cargaTextos.filter((c: string) => c === 'bien' || c === 'correcto').length
  const logros = checkins.map((c: any) => c.logro_semana).filter(Boolean)
  const comentarios = checkins.map((c: any) => c.comentario).filter(Boolean)
  const pesosProgresion = checkins.map((c: any) => c.peso).filter(Boolean)

  const [{ data: cliente }, { data: rutinaActual }, { data: marcas }] = await Promise.all([
    sb.from('clientes').select('nombre,objetivo,nivel,dias_semana,plan_online').eq('id', clienteId).single(),
    sb.from('rutinas').select('id,nombre').eq('cliente_id', clienteId)
      .eq('estado', 'publicada').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('marcas_cliente').select('ejercicio,valor').eq('cliente_id', clienteId)
      .order('fecha', { ascending: false }).limit(8),
  ])

  // Decidir acción
  const sinergiaProblema = (fatiga != null && fatiga >= 7) && (energia != null && energia <= 2) && (adherencia != null && adherencia < 50)
  const bajaAdherencia = adherencia != null && adherencia < 50
  const evolucionPositiva = (adherencia != null && adherencia >= 75) && (bien >= 2 || muyFacil >= 2) && (fatiga == null || fatiga < 3.5)
  const ajusteNecesario = muyFacil >= 2 || muyDuro >= 2 || (energia != null && energia <= 2 && !sinergiaProblema) || (estres != null && estres >= 4)

  let accion: string
  let razonDecision: string

  if (sinergiaProblema) {
    accion = 'pausa_recomendada'
    razonDecision = `Fatiga ${fatiga}/5, energía ${energia}/5, adherencia ${adherencia}%`
  } else if (bajaAdherencia) {
    accion = 'mensaje_motivacional'
    razonDecision = `Adherencia ${adherencia}% durante 4 semanas`
  } else if (evolucionPositiva && rutinaActual) {
    accion = 'actualizar_rutina'
    razonDecision = `Buena adherencia (${adherencia}%), progresión positiva`
  } else {
    accion = 'ajustar_cargas'
    razonDecision = ajusteNecesario
      ? (muyFacil >= 2 ? `Cargas fáciles en ${muyFacil}/4 semanas` : muyDuro >= 2 ? `Cargas duras en ${muyDuro}/4 semanas` : `Energía baja (${energia}/5)`)
      : 'Ajuste fino de progresión'
  }

  const nombreCorto = cliente?.nombre?.split(' ')[0] || 'el cliente'
  const objetivo = (cliente?.objetivo || 'perdida_grasa').replace(/_/g, ' ')
  const marcasTexto = (marcas || []).slice(0, 5).map((m: any) => `${m.ejercicio}: ${m.valor}`).join(', ')
  const datos = `Energía ${energia}/5 | Fatiga ${fatiga}/5 | Sueño ${sueno}/5 | Estrés ${estres}/5 | Adherencia ${adherencia ?? '?'}% | Cargas: ${cargaTextos.join('/') || 'sin datos'}`

  const prompts: Record<string, string> = {
    actualizar_rutina: `Asistente de entrenador personal. Analiza el mes de ${nombreCorto} y prepara la actualización de su plan.
${datos}
Objetivo: ${objetivo} | Nivel: ${cliente?.nivel || '?'} | Rutina actual: ${rutinaActual?.nombre || 'primera'}
${marcasTexto ? 'Marcas: ' + marcasTexto : ''}
${logros.length ? 'Logros: ' + logros.join(' | ') : ''}
${comentarios.length ? 'Comentarios del cliente: ' + comentarios.join(' | ') : ''}
${pesosProgresion.length > 1 ? `Peso: ${pesosProgresion[pesosProgresion.length - 1]}→${pesosProgresion[0]}kg` : ''}

JSON: {"resumen":"3-4 frases para el entrenador sobre el mes. Datos concretos.","indicaciones":"Instrucciones específicas para la nueva rutina: qué ejercicios progresar, qué volumen cambiar, qué añadir o quitar. Mínimo 4 puntos concretos con números.","mensaje_cliente":"Mensaje de 80-100 palabras para ${nombreCorto}. Tono cercano. Menciona su objetivo. Explica que su plan se actualiza porque está progresando bien. Que sienta que hay alguien pendiente de él."}`,

    ajustar_cargas: `Asistente de entrenador personal. Analiza el mes de ${nombreCorto} y prepara indicaciones de ajuste.
${datos}
Objetivo: ${objetivo} | ${marcasTexto ? 'Marcas: ' + marcasTexto : ''}
${comentarios.length ? 'Comentarios: ' + comentarios.join(' | ') : ''}
Razón: ${razonDecision}

JSON: {"resumen":"2-3 frases para el entrenador con los datos clave.","indicaciones":"Instrucciones concretas de ajuste con números: qué cargas subir/bajar en %, qué volumen cambiar, qué descansos modificar. Mínimo 3 puntos específicos.","mensaje_cliente":"Mensaje de 60-80 palabras para ${nombreCorto}. Cercano. Reconoce su esfuerzo. Explica que vas a ajustar el plan para que encaje mejor con cómo está respondiendo su cuerpo. Sin tecnicismos."}`,

    mensaje_motivacional: `Asistente de entrenador personal. ${nombreCorto} lleva un mes con baja adherencia (${adherencia}%).
Objetivo: ${objetivo}
${comentarios.length ? 'Comentarios recientes: ' + comentarios.join(' | ') : ''}
${logros.length ? 'Logros del periodo: ' + logros.join(' | ') : ''}

JSON: {"resumen":"2 frases para el entrenador sobre la situación y qué puede estar pasando.","indicaciones":"Sugerencias para el entrenador: ¿qué preguntar? ¿simplificar el plan? ¿cambiar frecuencia?","mensaje_cliente":"Mensaje de 80-100 palabras para ${nombreCorto}. Muy empático y cercano. Sin presión. Reconoce que hay semanas difíciles. Recuerda su objetivo de forma positiva. Ofrece adaptar el plan si algo no está funcionando. Que sienta que no está solo en esto."}`,

    pausa_recomendada: `Asistente de entrenador personal. ${nombreCorto} muestra señales claras de sobrecarga.
Datos críticos: Energía ${energia}/5 | Fatiga ${fatiga}/5 | Adherencia ${adherencia}%
${comentarios.length ? 'Comentarios: ' + comentarios.join(' | ') : ''}

JSON: {"resumen":"2-3 frases para el entrenador alertando de la situación. Recomendar contactar antes de hacer cambios al plan.","indicaciones":"Qué explorar con el cliente: ¿lesión? ¿estrés externo? ¿trabajo? Proponer semana de descarga o pausa temporal. Ajustes específicos al reincorporarse.","mensaje_cliente":"Mensaje de 70-90 palabras para ${nombreCorto}. Muy empático. No mencionar métricas. Decir que has visto que estas semanas han sido exigentes. Preguntar cómo está. Que sepa que el plan puede adaptarse a su situación real sin ningún problema."}`
  }

  let resultado: any = null
  for (let intento = 0; intento < 2; intento++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1200,
          system: 'Responde SOLO con JSON válido. Sin texto ni markdown.',
          messages: [{ role: 'user', content: prompts[accion] }] })
      })
      if (!res.ok) { await new Promise(r => setTimeout(r, 1500)); continue }
      const data = await res.json()
      const texto = (data.content?.[0]?.text || '').trim()
      try { resultado = JSON.parse(texto) } catch {
        const m = texto.match(/\{[\s\S]*\}/)
        if (m) try { resultado = JSON.parse(m[0]) } catch {}
      }
      if (resultado) break
    } catch { await new Promise(r => setTimeout(r, 1500)) }
  }

  if (!resultado) return { skip: true, razon: 'ia_sin_respuesta' }

  // Generar rutina si toca
  let rutinaGeneradaId: string | null = null
  if (accion === 'actualizar_rutina') {
    try {
      const resRutina = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
          system: 'Responde SOLO con JSON válido.',
          messages: [{ role: 'user', content: `Genera rutina 4 semanas para ${cliente?.nombre}. Objetivo: ${objetivo}. Nivel: ${cliente?.nivel || 'principiante'}. Días/sem: ${cliente?.dias_semana || 3}. Indicaciones: ${resultado.indicaciones}. ${marcasTexto ? 'Marcas referencia: ' + marcasTexto : ''}
JSON: {"nombre":"Rutina actualizada — ${nombreCorto}","descripcion":"resumen en 1 línea","semanas":4,"dias":[{"dia":1,"nombre":"Día A — Fuerza","patron_principal":"Fuerza","ejercicios":[{"orden":1,"nombre":"Sentadilla","patron":"fuerza","series":4,"reps":"8-10","descanso":"2min","notas":""}]}]}` }] })
      })
      if (resRutina.ok) {
        const rutData = await resRutina.json()
        const textoRut = (rutData.content?.[0]?.text || '').trim()
        let rutinaJSON: any = null
        try { rutinaJSON = JSON.parse(textoRut) } catch {
          const m = textoRut.match(/\{[\s\S]*\}/)
          if (m) try { rutinaJSON = JSON.parse(m[0]) } catch {}
        }
        if (rutinaJSON) {
          const { data: rut } = await sb.from('rutinas').insert({
            cliente_id: clienteId, entrenador_id: entrenadorId,
            nombre: rutinaJSON.nombre || `Rutina actualizada — ${nombreCorto}`,
            objetivo: cliente?.objetivo, semanas: 4, dias_semana: cliente?.dias_semana || 3,
            borrador: rutinaJSON, estado: 'borrador',
            notas_entrenador: `Análisis mensual automático.\n\n${resultado.indicaciones}`
          }).select('id').single()
          rutinaGeneradaId = rut?.id || null
        }
      }
    } catch {}
  }

  // Guardar análisis
  await sb.from('analisis_mensual').insert({
    entrenador_id: entrenadorId, cliente_id: clienteId,
    accion, checkins_analizados: 4,
    energia_media: energia, fatiga_media: fatiga, adherencia_pct: adherencia,
    resumen: resultado.resumen,
    indicaciones: resultado.indicaciones,
    mensaje_cliente: resultado.mensaje_cliente,
    rutina_generada_id: rutinaGeneradaId,
  })

  // Alerta para el entrenador
  const EMOJIS: Record<string, string> = { actualizar_rutina: '🔄', ajustar_cargas: '⚖️', mensaje_motivacional: '💬', pausa_recomendada: '⚠️' }
  const LABELS: Record<string, string> = {
    actualizar_rutina: 'Nueva rutina lista — revisa y publica',
    ajustar_cargas: 'Revisa las indicaciones de ajuste',
    mensaje_motivacional: 'Mensaje preparado para enviar',
    pausa_recomendada: 'Contacta con el cliente antes de hacer cambios',
  }

  await sb.from('alertas').insert({
    entrenador_id: entrenadorId, cliente_id: clienteId, tipo: 'resumen_listo',
    mensaje: `${EMOJIS[accion]} Análisis de ${nombreCorto} — ${LABELS[accion]}. ${resultado.resumen?.split('.')[0]}.`
  })

  return { ok: true, accion, cliente: cliente?.nombre, energia, fatiga, adherencia, razonDecision }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const adminOk = req.headers.get('x-admin-secret') === (Deno.env.get('ADMIN_SECRET') || 'forge-admin-2024')
  let entrenadorId: string | null = null

  if (!adminOk) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS })
    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: CORS })
    entrenadorId = user.id
  }

  try {
    const body = await req.json().catch(() => ({}))
    const clienteIdFiltro = body?.cliente_id || null

    if (clienteIdFiltro) {
      const { data: c } = await sb.from('clientes').select('entrenador_id').eq('id', clienteIdFiltro).single()
      if (!c) return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404, headers: CORS })
      if (entrenadorId && c.entrenador_id !== entrenadorId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })
      const r = await analizarCliente(clienteIdFiltro, c.entrenador_id)
      return new Response(JSON.stringify(r), { headers: CORS })
    }

    let query = sb.from('clientes').select('id,entrenador_id').eq('tipo', 'online').eq('estado', 'activo')
    if (entrenadorId) query = query.eq('entrenador_id', entrenadorId)
    const { data: clientes } = await query

    const resultados: any[] = []
    for (const c of clientes || []) {
      const r = await analizarCliente(c.id, c.entrenador_id)
      resultados.push({ cliente_id: c.id, ...r })
    }
    return new Response(JSON.stringify({ ok: true, procesados: resultados.filter(r => r.ok).length, saltados: resultados.filter(r => r.skip).length, resultados }), { headers: CORS })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
