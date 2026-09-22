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

    // Obtener IDs de clientes de sesiones recurrentes asignadas
    const { data: recs } = await sb.from('sesiones_recurrentes')
      .select('cliente_id').eq('entrenador_id', uid).eq('activa', true)

    // Obtener IDs de clientes de sesiones individuales asignadas
    const { data: ses } = await sb.from('sesiones')
      .select('cliente_id').eq('entrenador_id', uid).eq('cancelada', false)

    // Reunir IDs únicos
    const ids = [...new Set([
      ...(recs || []).map((r: any) => r.cliente_id),
      ...(ses || []).map((s: any) => s.cliente_id),
    ].filter(Boolean))]

    if (ids.length === 0) return new Response(JSON.stringify({ clientes: [] }), { headers: CORS })

    // Cargar clientes con service_role (sin restricción RLS)
    const { data: clientes } = await sb.from('clientes')
      .select('id,nombre,tipo,nivel,lesiones,objetivo,peso_actual,peso_objetivo')
      .in('id', ids).eq('estado', 'activo')

    return new Response(JSON.stringify({ clientes: clientes || [] }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
