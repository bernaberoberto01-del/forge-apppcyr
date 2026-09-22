import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const APP_URL = 'https://forge-studio-os.vercel.app'
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })

  try {
    // Buscar el cliente por auth_user_id
    const { data: cliente } = await sb.from('clientes')
      .select('id, nombre, stripe_customer_id, suscripcion_activa, proxima_factura, precio_mensual')
      .eq('auth_user_id', user.id).single()

    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: CORS })
    if (!cliente.stripe_customer_id) return new Response(JSON.stringify({ error: 'Sin suscripci\u00f3n activa' }), { status: 400, headers: CORS })

    // Crear sesi\u00f3n del Customer Portal de Stripe
    const params = new URLSearchParams({
      customer: cliente.stripe_customer_id,
      return_url: `${APP_URL}/portal/${cliente.id}`,
    })

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
    const portal = await res.json()
    if (portal.error) throw new Error(portal.error.message)

    return new Response(JSON.stringify({ ok: true, url: portal.url }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
