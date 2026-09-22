import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user }, error: authErr } = await sb.auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })

    const uid = user.id

    // Verificar que es miembro activo de un centro
    const { data: miembro } = await sb.from('miembros_centro')
      .select('*, centros(id, nombre, color_acento)')
      .eq('user_id', uid).eq('activo', true).limit(1).maybeSingle()

    if (!miembro) return new Response(JSON.stringify({ error: 'No eres miembro de ningún centro' }), { status: 403, headers: CORS })

    const hoy = new Date().toISOString().split('T')[0]
    const lunes = (() => { const d = new Date(); d.setDate(d.getDate()-((d.getDay()||7)-1)); return d.toISOString().split('T')[0] })()

    // Sesiones recurrentes asignadas a este entrenador
    const { data: recurrentes } = await sb.from('sesiones_recurrentes')
      .select('id,hora,duracion_minutos,tipo,dias_semana,cliente_id,entrenador_id')
      .eq('entrenador_id', uid).eq('activa', true)

    // Sesiones individuales
    const { data: sesIndividuales } = await sb.from('sesiones')
      .select('id,fecha,hora,duracion_minutos,tipo,completada,cancelada,cliente_id,entrenador_id')
      .eq('entrenador_id', uid).gte('fecha', lunes).eq('cancelada', false)
      .order('fecha').order('hora')

    // Recopilar todos los cliente_ids
    const todosIds = [...new Set([
      ...(recurrentes||[]).map(r => r.cliente_id),
      ...(sesIndividuales||[]).map(s => s.cliente_id),
    ].filter(Boolean))]

    // Cargar clientes con service_role (sin restricción RLS)
    const { data: clientes } = todosIds.length > 0
      ? await sb.from('clientes')
          .select('id,nombre,tipo,nivel,lesiones,objetivo,peso_actual,peso_objetivo')
          .in('id', todosIds).eq('estado', 'activo')
      : { data: [] }

    // Propios del entrenador también
    const { data: propios } = await sb.from('clientes')
      .select('id,nombre,tipo,nivel,lesiones,objetivo,peso_actual,peso_objetivo')
      .eq('entrenador_id', uid).eq('estado', 'activo')

    const clienteMap: Record<string, any> = {}
    ;[...(clientes||[]), ...(propios||[])].forEach(c => { clienteMap[c.id] = c })

    // Alertas y mensajes
    const [{ data: alertas }, { data: msgs }] = await Promise.all([
      sb.from('alertas').select('*').eq('entrenador_id', uid).eq('leida', false)
        .order('created_at', { ascending: false }).limit(10),
      sb.from('mensajes_cliente').select('id,contenido,tipo,created_at,cliente_id,leido_entrenador')
        .eq('entrenador_id', uid).eq('leido_entrenador', false).eq('tipo', 'cliente')
        .order('created_at', { ascending: false }).limit(20),
    ])

    // Horas estimadas semana
    const horasSemana = (() => {
      let total = 0
      const lunesDate = new Date(lunes + 'T12:00')
      for (let i = 0; i < 7; i++) {
        const d = new Date(lunesDate); d.setDate(d.getDate() + i)
        const diaSemana = d.getDay() === 0 ? 7 : d.getDay()
        for (const rec of recurrentes||[]) {
          if ((rec.dias_semana||[]).includes(diaSemana)) total += rec.duracion_minutos || 60
        }
      }
      return Math.round(total / 60 * 10) / 10
    })()

    return new Response(JSON.stringify({
      ok: true,
      miembro,
      recurrentes: recurrentes || [],
      sesIndividuales: sesIndividuales || [],
      clientes: Object.values(clienteMap),
      alertas: alertas || [],
      msgs: msgs || [],
      horasSemana,
    }), { headers: CORS })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
