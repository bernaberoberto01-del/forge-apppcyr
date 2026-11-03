/**
 * recordatorio-sesion-push — Cron: Recordatorio 24h antes de sesión
 *
 * Cron: 0 18 * * * (diario 18h UTC)
 * Consulta sesiones para mañana y envía push a cada cliente
 * via la función enviar-push.
 *
 * verify_jwt: false (invocada por pg_cron/scheduler interno)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Mañana en formato YYYY-MM-DD (UTC)
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const fechaMañana = tomorrow.toISOString().split('T')[0]

    console.log(`[recordatorio-sesion-push] Buscando sesiones para ${fechaMañana}`)

    // Buscar sesiones de mañana no completadas ni canceladas
    const { data: sesiones, error } = await sb
      .from('sesiones')
      .select('id, cliente_id, hora, tipo')
      .eq('fecha', fechaMañana)
      .eq('completada', false)
      .eq('cancelada', false)

    if (error) {
      console.error('[recordatorio-sesion-push] Error consultando sesiones:', error)
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: CORS })
    }

    if (!sesiones?.length) {
      console.log('[recordatorio-sesion-push] Sin sesiones para mañana')
      return new Response(JSON.stringify({ ok: true, enviados: 0, total: 0, fecha: fechaMañana }), { headers: CORS })
    }

    console.log(`[recordatorio-sesion-push] ${sesiones.length} sesiones encontradas`)

    // Verificar qué clientes tienen suscripciones push activas
    const clienteIds = [...new Set(sesiones.map(s => s.cliente_id))]
    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('cliente_id')
      .in('cliente_id', clienteIds)
      .eq('activa', true)

    const clientesConPush = new Set((subs || []).map(s => s.cliente_id))

    // Filtrar solo sesiones de clientes con push activo
    const sesionesConPush = sesiones.filter(s => clientesConPush.has(s.cliente_id))

    if (!sesionesConPush.length) {
      console.log('[recordatorio-sesion-push] Ningún cliente con push activo')
      return new Response(JSON.stringify({ ok: true, enviados: 0, total: sesiones.length, sin_push: true }), { headers: CORS })
    }

    // Enviar push para cada sesión en paralelo (máx 10 concurrentes)
    const resultados: { cliente_id: string; ok: boolean; error?: string }[] = []

    const chunks = []
    for (let i = 0; i < sesionesConPush.length; i += 10) {
      chunks.push(sesionesConPush.slice(i, i + 10))
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (sesion) => {
        const hora = sesion.hora || ''
        const tipo = sesion.tipo === 'presencial' ? 'presencial' : 'online'
        const cuerpo = hora
          ? `Tienes sesión ${tipo} mañana a las ${hora}`
          : `Tienes sesión ${tipo} mañana`

        try {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/enviar-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({
              cliente_id: sesion.cliente_id,
              tipo: 'sesion',
              cuerpo,
              url: '/portal',
            }),
          })

          const data = await resp.json()
          return { cliente_id: sesion.cliente_id, ok: data.ok || resp.ok, enviados: data.enviados }
        } catch (e) {
          return { cliente_id: sesion.cliente_id, ok: false, error: String(e) }
        }
      })

      const chunkResults = await Promise.all(promises)
      resultados.push(...chunkResults)
    }

    const enviados = resultados.filter(r => r.ok).length
    const errores = resultados.filter(r => !r.ok).length

    console.log(`[recordatorio-sesion-push] Completado: ${enviados} ok, ${errores} errores`)

    return new Response(JSON.stringify({
      ok: true,
      fecha: fechaMañana,
      total_sesiones: sesiones.length,
      sesiones_con_push: sesionesConPush.length,
      enviados,
      errores,
    }), { headers: CORS })

  } catch (err) {
    console.error('[recordatorio-sesion-push] Error inesperado:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: CORS })
  }
})
