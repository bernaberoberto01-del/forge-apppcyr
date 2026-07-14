import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    // ── Autenticación: exigir JWT de usuario válido ──
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user }, error: authErr } = await sb.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })
    }

    const { accion, datos } = await req.json()

    if (accion === 'cancelar_sesion') {
      const { sesion_id, motivo } = datos
      if (!sesion_id) return new Response(JSON.stringify({ error: 'sesion_id requerido' }), { status: 400, headers: CORS })

      // Cargar la sesión desde la BD (no confiar en datos del cliente)
      const { data: sesion, error: sErr } = await sb.from('sesiones')
        .select('id, cliente_id, entrenador_id, fecha, hora').eq('id', sesion_id).single()
      if (sErr || !sesion) return new Response(JSON.stringify({ error: 'Sesion no encontrada' }), { status: 404, headers: CORS })

      // Autorización: el que llama debe ser el cliente dueño de la sesión
      const { data: cli, error: cErr } = await sb.from('clientes')
        .select('id, nombre, auth_user_id').eq('id', sesion.cliente_id).single()
      if (cErr || !cli) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: CORS })
      if (cli.auth_user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })
      }

      const { error: e1 } = await sb.from('sesiones').update({
        cancelada: true, cancelada_por: 'cliente',
        motivo_cancelacion: motivo || 'Sin motivo',
        cancelada_at: new Date().toISOString(), completada: false
      }).eq('id', sesion_id)
      if (e1) throw new Error('Error cancelando: ' + e1.message)

      const fechaLabel = new Date(sesion.fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

      await Promise.all([
        sb.from('alertas').insert({
          entrenador_id: sesion.entrenador_id, cliente_id: sesion.cliente_id, tipo: 'cancelacion_sesion',
          mensaje: `${cli.nombre} ha cancelado la sesion del ${fechaLabel} a las ${sesion.hora}${motivo ? '. Motivo: ' + motivo : ''}`
        }),
        sb.from('mensajes_cliente').insert({
          entrenador_id: sesion.entrenador_id, cliente_id: sesion.cliente_id,
          contenido: `He tenido que cancelar mi sesion del ${fechaLabel} a las ${sesion.hora}.${motivo ? ' Motivo: ' + motivo : ''}`,
          tipo: 'cliente', leido: false
        })
      ])
      return new Response(JSON.stringify({ ok: true }), { headers: CORS })
    }

    if (accion === 'enviar_mensaje') {
      const { contenido } = datos || {}
      if (!contenido || !contenido.trim()) return new Response(JSON.stringify({ error: 'contenido requerido' }), { status: 400, headers: CORS })

      // Derivar cliente/entrenador del usuario autenticado (no confiar en el payload)
      const { data: cli, error: cErr } = await sb.from('clientes')
        .select('id, entrenador_id').eq('auth_user_id', user.id).limit(1).maybeSingle()
      if (cErr || !cli) return new Response(JSON.stringify({ error: 'Cliente no vinculado' }), { status: 403, headers: CORS })

      const { error: mErr } = await sb.from('mensajes_cliente').insert({
        entrenador_id: cli.entrenador_id, cliente_id: cli.id,
        contenido: contenido.trim(), tipo: 'cliente', leido: false
      })
      if (mErr) throw new Error('Error enviando: ' + mErr.message)
      return new Response(JSON.stringify({ ok: true }), { headers: CORS })
    }

    return new Response(JSON.stringify({ error: 'Accion no reconocida' }), { status: 400, headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
