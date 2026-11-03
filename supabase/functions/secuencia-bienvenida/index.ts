/**
 * secuencia-bienvenida — Cron: Mensajes automáticos día 1 y día 3
 *
 * Cron: 0 9 * * * (diario 9h UTC)
 * - Día 1 (primer acceso al portal): mensaje de bienvenida + instrucciones básicas
 * - Día 3 (3 días tras primer acceso): mensaje de seguimiento + invitación a check-in
 *
 * Detecta primer acceso via actividad_cliente (tipo = 'portal_acceso').
 * Fallback: usa clientes.created_at si no hay actividad registrada.
 * Guarda mensajes en mensajes_cliente (tipo = 'sistema') para que no se dupliquen.
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

// Mensajes de bienvenida día 1
function mensajeDia1(nombre: string): string {
  const primerNombre = nombre.split(' ')[0]
  return `¡Bienvenido/a ${primerNombre}! 🎉 Ya tienes acceso a tu portal personal.

Aquí es donde vamos a trabajar juntos: podrás ver tu rutina de entrenamiento, seguir tu progreso, hacer el check-in semanal y escribirme cuando necesites.

**Lo primero que te recomiendo:**
• 👀 Echa un vistazo a tu rutina en la pestaña "Entreno"
• 📊 Completa tu primer check-in semanal
• 💬 Escríbeme si tienes alguna duda

¡Vamos a por ello! 💪`
}

// Mensaje de seguimiento día 3
function mensajeDia3(nombre: string): string {
  const primerNombre = nombre.split(' ')[0]
  return `¡Hola ${primerNombre}! Llevamos 3 días trabajando juntos y quería saber cómo te va.

¿Has podido empezar con la rutina? ¿Tienes alguna pregunta sobre los ejercicios o el plan?

Recuerda que el check-in semanal es importante para que pueda adaptar el entrenamiento a cómo te sientes cada semana. Si todavía no lo has hecho, te lo pongo fácil — está en la pestaña de inicio 📊

¡Cualquier duda me escribes directamente por aquí! 👇`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const hoy = new Date()
    const hoySolo = hoy.toISOString().split('T')[0]

    // Calcular rangos de fecha para clientes en día 1 y día 3
    // Día 1: primer acceso hace 1 día (entre ayer 00:00 y hoy 00:00 UTC)
    const ayer = new Date(hoy)
    ayer.setUTCDate(ayer.getUTCDate() - 1)
    const ayerStr = ayer.toISOString().split('T')[0]

    // Día 3: primer acceso hace 3 días
    const hace3 = new Date(hoy)
    hace3.setUTCDate(hace3.getUTCDate() - 3)
    const hace3Str = hace3.toISOString().split('T')[0]

    console.log(`[secuencia-bienvenida] Ejecutando para ${hoySolo}. Buscando día1=${ayerStr}, día3=${hace3Str}`)

    // Buscar todos los clientes activos online con su primer acceso al portal
    const { data: clientes, error: errClientes } = await sb
      .from('clientes')
      .select('id, nombre, entrenador_id, tipo, estado')
      .eq('estado', 'activo')

    if (errClientes || !clientes?.length) {
      console.log('[secuencia-bienvenida] Sin clientes activos')
      return new Response(JSON.stringify({ ok: true, enviados: 0 }), { headers: CORS })
    }

    // Buscar primer acceso de cada cliente en actividad_cliente
    const clienteIds = clientes.map(c => c.id)
    const { data: actividades } = await sb
      .from('actividad_cliente')
      .select('cliente_id, created_at')
      .in('cliente_id', clienteIds)
      .eq('tipo', 'portal_acceso')
      .order('created_at', { ascending: true })

    // Mapear primer acceso por cliente_id
    const primerAcceso: Record<string, string> = {}
    for (const a of (actividades || [])) {
      if (!primerAcceso[a.cliente_id]) {
        primerAcceso[a.cliente_id] = a.created_at.split('T')[0]
      }
    }

    // Buscar mensajes sistema ya enviados para evitar duplicados
    const { data: mensajesSistema } = await sb
      .from('mensajes_cliente')
      .select('cliente_id, contenido')
      .in('cliente_id', clienteIds)
      .eq('tipo', 'sistema')
      .ilike('contenido', '%bienvenid%')

    const clientesConBienvenida = new Set((mensajesSistema || []).map(m => m.cliente_id))

    const { data: mensajesDia3 } = await sb
      .from('mensajes_cliente')
      .select('cliente_id')
      .in('cliente_id', clienteIds)
      .eq('tipo', 'sistema')
      .ilike('contenido', '%llevamos 3 días%')

    const clientesConDia3 = new Set((mensajesDia3 || []).map(m => m.cliente_id))

    let enviadosDia1 = 0
    let enviadosDia3 = 0

    for (const cliente of clientes) {
      const fechaAcceso = primerAcceso[cliente.id]
      if (!fechaAcceso) continue // Sin acceso registrado aún

      // Día 1: primer acceso fue ayer
      if (fechaAcceso === ayerStr && !clientesConBienvenida.has(cliente.id)) {
        const { error } = await sb.from('mensajes_cliente').insert({
          cliente_id: cliente.id,
          entrenador_id: cliente.entrenador_id,
          contenido: mensajeDia1(cliente.nombre),
          tipo: 'sistema',
          leido: false,
          leido_entrenador: true,
        })

        if (!error) {
          enviadosDia1++
          console.log(`[secuencia-bienvenida] Día 1 enviado a ${cliente.nombre}`)

          // Push notification si tiene suscripción
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/enviar-push`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${SERVICE_KEY}`,
              },
              body: JSON.stringify({
                cliente_id: cliente.id,
                tipo: 'mensaje',
                titulo: '🎉 ¡Bienvenido/a a tu portal!',
                cuerpo: `Hola ${cliente.nombre.split(' ')[0]}, ya tienes acceso a tu portal personal. ¡Échale un vistazo!`,
                url: '/portal',
              }),
            })
          } catch (e) {
            console.warn(`[secuencia-bienvenida] Push día 1 falló para ${cliente.nombre}:`, e)
          }
        }
      }

      // Día 3: primer acceso fue hace 3 días
      if (fechaAcceso === hace3Str && !clientesConDia3.has(cliente.id)) {
        const { error } = await sb.from('mensajes_cliente').insert({
          cliente_id: cliente.id,
          entrenador_id: cliente.entrenador_id,
          contenido: mensajeDia3(cliente.nombre),
          tipo: 'sistema',
          leido: false,
          leido_entrenador: true,
        })

        if (!error) {
          enviadosDia3++
          console.log(`[secuencia-bienvenida] Día 3 enviado a ${cliente.nombre}`)

          // Push notification
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/enviar-push`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${SERVICE_KEY}`,
              },
              body: JSON.stringify({
                cliente_id: cliente.id,
                tipo: 'mensaje',
                titulo: '👋 ¿Cómo te va?',
                cuerpo: `Hola ${cliente.nombre.split(' ')[0]}, llevamos 3 días — ¿tienes dudas sobre la rutina?`,
                url: '/portal',
              }),
            })
          } catch (e) {
            console.warn(`[secuencia-bienvenida] Push día 3 falló para ${cliente.nombre}:`, e)
          }
        }
      }
    }

    console.log(`[secuencia-bienvenida] Completado: ${enviadosDia1} día1, ${enviadosDia3} día3`)

    return new Response(JSON.stringify({
      ok: true,
      fecha: hoySolo,
      enviadosDia1,
      enviadosDia3,
      total: enviadosDia1 + enviadosDia3,
    }), { headers: CORS })

  } catch (err) {
    console.error('[secuencia-bienvenida] Error inesperado:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: CORS })
  }
})
