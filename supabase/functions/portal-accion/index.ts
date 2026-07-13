import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { accion, datos } = await req.json()

    if (accion === 'cancelar_sesion') {
      const { sesion_id, entrenador_id, cliente_id, cliente_nombre, fecha, hora, motivo } = datos
      const { error: e1 } = await sb.from('sesiones').update({
        cancelada: true, cancelada_por: 'cliente',
        motivo_cancelacion: motivo || 'Sin motivo',
        cancelada_at: new Date().toISOString(), completada: false
      }).eq('id', sesion_id)
      if (e1) throw new Error('Error cancelando: ' + e1.message)

      const fechaLabel = new Date(fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

      await Promise.all([
        sb.from('alertas').insert({
          entrenador_id, cliente_id, tipo: 'cancelacion_sesion',
          mensaje: `${cliente_nombre} ha cancelado la sesion del ${fechaLabel} a las ${hora}${motivo ? '. Motivo: ' + motivo : ''}`
        }),
        sb.from('mensajes_cliente').insert({
          entrenador_id, cliente_id,
          contenido: `He tenido que cancelar mi sesion del ${fechaLabel} a las ${hora}.${motivo ? ' Motivo: ' + motivo : ''}`,
          tipo: 'cliente', leido: false
        })
      ])
      return new Response(JSON.stringify({ ok: true }), { headers: CORS })
    }

    return new Response(JSON.stringify({ error: 'Accion no reconocida' }), { status: 400, headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
