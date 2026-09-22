import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user }, error: authErr } = await sb.auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })

    const { cliente_id } = await req.json().catch(() => ({}))
    if (!cliente_id) return new Response(JSON.stringify({ error: 'cliente_id requerido' }), { status: 400, headers: CORS })

    const [{ data: cliente }, { data: checkins }, { data: rutina }, { data: cfg }] = await Promise.all([
      sb.from('clientes').select('*').eq('id', cliente_id).single(),
      sb.from('checkins').select('*').eq('cliente_id', cliente_id).order('fecha', { ascending: false }).limit(6),
      sb.from('rutinas').select('nombre,borrador,notas_entrenador').eq('cliente_id', cliente_id).eq('estado', 'publicada').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('configuracion').select('nombre_entrenador,nombre_negocio').eq('entrenador_id', user.id).maybeSingle(),
    ])

    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: CORS })
    if (cliente.entrenador_id !== user.id) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })
    if (!checkins?.length) return new Response(JSON.stringify({ error: 'Sin check-ins' }), { status: 404, headers: CORS })

    const actual = checkins[0]
    const anterior = checkins[1] || null
    const nombreEntrenador = cfg?.nombre_entrenador || 'Tu entrenador'
    const nombre = cliente.nombre.split(' ')[0]
    const objetivo = (cliente.objetivo || '').replace(/_/g, ' ')

    // Escalas correctas (todo es /5 excepto adherencia que es /10)
    const CARGAS = { muy_facil: 'demasiado fácil (necesita más carga)', bien: 'ajustadas correctamente', duro: 'algo duras (ajustar si persiste)', muy_duro: 'demasiado duras (reducir carga urgente)' }
    const ENERGIA_L = ['', 'agotado', 'bajo', 'normal', 'bueno', 'al máximo']
    const SUENO_L = ['', 'muy mal', 'mal', 'regular', 'bien', 'muy bien']
    const ESTRES_L = ['', 'sin estrés', 'leve', 'moderado', 'alto', 'desbordado']
    const FATIGA_L = ['', 'fresco', 'algo cansado', 'cansado', 'muy cansado', 'destrozado']

    // Datos del check-in actual
    const adherencia = actual.sesiones_planificadas
      ? `${actual.sesiones_semana}/${actual.sesiones_planificadas} días entrenados`
      : actual.sesiones_semana !== null ? `${actual.sesiones_semana} días entrenados` : null

    const bloqueObjetivo = [
      adherencia,
      actual.cargas_sensacion ? `Cargas: ${CARGAS[actual.cargas_sensacion] || actual.cargas_sensacion}` : null,
      actual.peso ? `Peso actual: ${actual.peso}kg` : null,
    ].filter(Boolean).join(' | ')

    const bloqueBienestar = [
      actual.energia ? `Energía: ${ENERGIA_L[actual.energia]} (${actual.energia}/5)` : null,
      actual.sueno ? `Sueño: ${SUENO_L[actual.sueno]} (${actual.sueno}/5)` : null,
      actual.estres ? `Estrés: ${ESTRES_L[actual.estres]} (${actual.estres}/5)` : null,
      actual.fatiga ? `Fatiga: ${FATIGA_L[actual.fatiga]} (${actual.fatiga}/5)` : null,
    ].filter(Boolean).join(' | ')

    // Tendencia vs semana anterior
    let tendencia = ''
    if (anterior) {
      const diffs = []
      if (actual.energia && anterior.energia) diffs.push(`energía ${actual.energia > anterior.energia ? 'sube' : actual.energia < anterior.energia ? 'baja' : 'igual'}`)
      if (actual.fatiga && anterior.fatiga) diffs.push(`fatiga ${actual.fatiga > anterior.fatiga ? 'sube (⚠️)' : actual.fatiga < anterior.fatiga ? 'baja (✓)' : 'igual'}`)
      if (actual.peso && anterior.peso) { const d = (actual.peso - anterior.peso).toFixed(1); diffs.push(`peso ${Number(d) > 0 ? '+' : ''}${d}kg`) }
      if (diffs.length) tendencia = `Tendencia vs semana anterior: ${diffs.join(', ')}.`
    }

    // Señales de alerta
    const fatigaAlta = (actual.fatiga || 0) >= 4
    const energiaBaja = (actual.energia || 5) <= 2
    const cargaExcesiva = actual.cargas_sensacion === 'muy_duro'
    const cargaBaja = actual.cargas_sensacion === 'muy_facil'
    const adherenciaBaja = actual.sesiones_planificadas && actual.sesiones_semana !== null && actual.sesiones_semana < actual.sesiones_planificadas * 0.6
    const buenaSemana = !fatigaAlta && !energiaBaja && !cargaExcesiva && (actual.sesiones_semana || 0) >= (actual.sesiones_planificadas || actual.sesiones_semana || 1)

    const alertas = [
      fatigaAlta ? 'ALERTA: fatiga muy alta — propón descanso activo esta semana, no aumentes carga' : null,
      energiaBaja ? 'ALERTA: energía muy baja — revisa sueño y estrés, posible sobreentrenamiento' : null,
      cargaExcesiva ? 'ALERTA: cargas demasiado duras — reduce intensidad en la próxima semana' : null,
      cargaBaja ? 'NOTA: cargas demasiado fáciles — propón aumentar peso o volumen' : null,
      adherenciaBaja ? 'ALERTA: baja adherencia — pregunta por barreras, ajusta el plan si es necesario' : null,
      buenaSemana ? 'BUENA SEMANA — refuerza el progreso con un dato concreto' : null,
    ].filter(Boolean).join('\n')

    // Contexto de la rutina activa
    const contextoRutina = rutina
      ? `Rutina activa: ${rutina.nombre}${rutina.notas_entrenador ? '. Notas: ' + rutina.notas_entrenador.slice(0, 200) : ''}`
      : 'Sin rutina activa publicada'

    // Historial de tendencia (últimas 4 semanas)
    const historial = checkins.slice(0, 4).map((c, i) =>
      `Sem-${i === 0 ? 'actual' : i}: energía ${c.energia || '?'}/5, fatiga ${c.fatiga || '?'}/5, días ${c.sesiones_semana ?? '?'}/${c.sesiones_planificadas ?? '?'}`
    ).join(' | ')

    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) return new Response(JSON.stringify({ error: 'API key no configurada' }), { status: 500, headers: CORS })

    const prompt = `Eres ${nombreEntrenador}, entrenador personal. Escribe un mensaje de seguimiento semanal para tu cliente ${nombre}.

OBJETIVO: ${objetivo}
DATA OBJETIVO: ${bloqueObjetivo}
BIENESTAR: ${bloqueBienestar}
${tendencia}
HISTORIAL 4 SEMANAS: ${historial}
${contextoRutina}
${actual.logro_semana ? `LOGRO QUE REPORTA: "${actual.logro_semana}"` : ''}
${actual.comentario ? `COMENTARIO LIBRE: "${actual.comentario}"` : ''}

ANÁLISIS PARA TU RESPUESTA:
${alertas}

INSTRUCCIONES:
- Máximo 6 líneas. Tono directo y cercano, como un entrenador de confianza, no un robot.
- Menciona al menos UN dato concreto del check-in (no inventes nada).
- Si hay fatiga alta o carga excesiva: propón ajuste concreto. Si todo bien: celebra y propón un pequeño reto.
- Si menciona un logro: reconócelo antes de cualquier corrección.
- Termina con UNA acción concreta para la próxima semana.
- Sin emojis forzados. En español natural. Firma como ${nombreEntrenador}.`

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 350,
        system: 'Eres un entrenador personal experto. Mensajes naturales, concisos y accionables.',
        messages: [{ role: 'user', content: prompt }] })
    })

    if (!aiRes.ok) { const e = await aiRes.json(); return new Response(JSON.stringify({ error: e.error?.message }), { status: 500, headers: CORS }) }
    const aiData = await aiRes.json()
    const mensajeSugerido = aiData.content?.[0]?.text?.trim() || ''
    if (!mensajeSugerido) return new Response(JSON.stringify({ error: 'IA no generó mensaje' }), { status: 500, headers: CORS })

    const { data: msg, error: msgErr } = await sb.from('mensajes_cliente').insert({
      entrenador_id: user.id, cliente_id,
      contenido: mensajeSugerido,
      tipo: 'borrador_ia', leido: true, leido_entrenador: true
    }).select('id').single()
    if (msgErr) throw new Error(msgErr.message)

    await sb.from('alertas').insert({
      entrenador_id: user.id, cliente_id,
      tipo: 'rutina_lista',
      mensaje: `Check-in de ${nombre} analizado — mensaje IA listo para revisar`
    })

    return new Response(JSON.stringify({
      ok: true, mensaje_sugerido: mensajeSugerido, borrador_id: msg.id,
      alertas: { fatiga_alta: fatigaAlta, energia_baja: energiaBaja, carga_excesiva: cargaExcesiva, carga_baja: cargaBaja, adherencia_baja: adherenciaBaja, buena_semana: buenaSemana }
    }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
