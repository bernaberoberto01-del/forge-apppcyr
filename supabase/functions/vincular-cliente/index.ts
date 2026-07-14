import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Vincula la cuenta autenticada con su ficha de cliente por COINCIDENCIA DE EMAIL.
// Seguro: no usa ningún id de la URL; liga la ficha cuyo email == email del usuario.
// Requiere email confirmado (evita suplantación cuando la confirmación está activa).

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user }, error: authErr } = await sb.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })
    }
    const email = (user.email || '').trim().toLowerCase()
    if (!email) {
      return new Response(JSON.stringify({ error: 'La cuenta no tiene email' }), { status: 400, headers: CORS })
    }
    // Exigir email confirmado (cuando la confirmación está activada, esto bloquea suplantaciones)
    if (!user.email_confirmed_at) {
      return new Response(JSON.stringify({ error: 'email_no_confirmado' }), { status: 403, headers: CORS })
    }

    // Buscar ficha por email
    const { data: cli, error: cErr } = await sb.from('clientes')
      .select('id, auth_user_id, nombre').ilike('email', email).limit(1).maybeSingle()
    if (cErr) throw new Error(cErr.message)
    if (!cli) {
      return new Response(JSON.stringify({ error: 'sin_ficha' }), { status: 404, headers: CORS })
    }

    // Ya vinculada
    if (cli.auth_user_id) {
      if (cli.auth_user_id === user.id) {
        return new Response(JSON.stringify({ ok: true, cliente_id: cli.id, ya_vinculado: true }), { headers: CORS })
      }
      // Vinculada a OTRA cuenta -> conflicto
      return new Response(JSON.stringify({ error: 'ficha_vinculada_a_otra_cuenta' }), { status: 409, headers: CORS })
    }

    // Vincular
    const { error: uErr } = await sb.from('clientes')
      .update({ auth_user_id: user.id }).eq('id', cli.id).is('auth_user_id', null)
    if (uErr) throw new Error(uErr.message)

    return new Response(JSON.stringify({ ok: true, cliente_id: cli.id }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), { status: 500, headers: CORS })
  }
})
