import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const PLANES = {
  nutricion:     { importe: 29, concepto: 'Asesoría Nutrición',     lookup_key: 'forge_nutricion_mensual' },
  entrenamiento: { importe: 35, concepto: 'Asesoría Entrenamiento', lookup_key: 'forge_entrenamiento_mensual' },
  completo:      { importe: 49, concepto: 'Asesoría Completa',      lookup_key: 'forge_completo_mensual' },
}
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: cors })
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: cors })
    const { cliente_id, plan } = await req.json()
    if (!cliente_id || !plan || !PLANES[plan]) return new Response(JSON.stringify({ error: 'cliente_id y plan requeridos' }), { status: 400, headers: cors })
    const { data: cliente, error: cErr } = await supabase.from('clientes').select('id, nombre, email, entrenador_id, stripe_customer_id').eq('id', cliente_id).eq('entrenador_id', user.id).single()
    if (cErr || !cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: cors })
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' })
    const planData = PLANES[plan]
    let customerId = cliente.stripe_customer_id
    if (customerId) {
      try { await stripe.customers.retrieve(customerId) } catch (_) { customerId = null }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({ email: cliente.email, name: cliente.nombre?.trim(), metadata: { cliente_id, entrenador_id: user.id } })
      customerId = customer.id
      await supabase.from('clientes').update({ stripe_customer_id: customerId }).eq('id', cliente_id)
    }
    let price = null
    try { const prices = await stripe.prices.list({ lookup_keys: [planData.lookup_key], limit: 1 }); price = prices.data[0] || null } catch (_) {}
    if (!price) {
      price = await stripe.prices.create({ unit_amount: planData.importe * 100, currency: 'eur', recurring: { interval: 'month' }, product_data: { name: 'Forge — ' + planData.concepto }, lookup_key: planData.lookup_key, transfer_lookup_key: true })
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: 'https://forge-studio-os.vercel.app/?checkout=success',
      cancel_url: 'https://forge-studio-os.vercel.app/?checkout=cancelled',
      metadata: { cliente_id, entrenador_id: user.id, plan },
      subscription_data: { metadata: { cliente_id, entrenador_id: user.id, plan } },
    })
    return new Response(JSON.stringify({ ok: true, url: session.url }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('crear-checkout-suscripcion error:', err?.message, err?.stack)
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
