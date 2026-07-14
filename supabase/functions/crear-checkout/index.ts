import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')
const APP_URL = 'https://forge-studio-os.vercel.app'

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers })

  try {
    const { cliente_id, importe, concepto } = await req.json()
    if (!cliente_id || !importe) return new Response(JSON.stringify({ error: 'cliente_id e importe requeridos' }), { status: 400, headers })

    const { data: cliente } = await supabase.from('clientes').select('*').eq('id', cliente_id).single()
    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers })
    if (cliente.entrenador_id !== user.id) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers })

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': 'eur',
        'line_items[0][price_data][product_data][name]': concepto || 'Asesoría personal',
        'line_items[0][price_data][product_data][description]': `Plan mensual para ${cliente.nombre}`,
        'line_items[0][price_data][unit_amount]': String(Math.round(importe * 100)),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'customer_email': cliente.email || '',
        'success_url': `${APP_URL}/portal/${cliente_id}?pago=ok`,
        'cancel_url': `${APP_URL}/portal/${cliente_id}?pago=cancelado`,
        'metadata[cliente_id]': cliente_id,
        'metadata[entrenador_id]': cliente.entrenador_id,
        'metadata[importe]': String(importe)
      })
    })
    const session = await stripeRes.json()
    if (!stripeRes.ok) return new Response(JSON.stringify({ error: session.error?.message }), { status: 500, headers })

    await supabase.from('suscripciones').insert({
      entrenador_id: cliente.entrenador_id, cliente_id,
      stripe_payment_intent_id: session.payment_intent, importe, estado: 'pendiente'
    })

    return new Response(JSON.stringify({ ok: true, url: session.url }), { headers })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
})
