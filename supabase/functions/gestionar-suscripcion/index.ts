import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const APP_URL = 'https://forge-studio-os.vercel.app'
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

async function stripe(path: string, body?: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Authorization': `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body ? new URLSearchParams(body) : undefined,
  })
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })

  try {
    const { accion, cliente_id, importe, nombre_plan, frecuencia } = await req.json()

    const { data: cliente } = await sb.from('clientes').select('*').eq('id', cliente_id).single()
    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: CORS })
    if (cliente.entrenador_id !== user.id) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })

    if (accion === 'crear_suscripcion') {
      // 1. Crear o recuperar customer en Stripe
      let stripeCustomerId = cliente.stripe_customer_id
      if (!stripeCustomerId) {
        const customer = await stripe('/customers', {
          email: cliente.email || '',
          name: cliente.nombre,
          'metadata[cliente_id]': cliente_id,
          'metadata[entrenador_id]': user.id,
        })
        if (customer.error) throw new Error('Stripe customer: ' + customer.error.message)
        stripeCustomerId = customer.id
        await sb.from('clientes').update({ stripe_customer_id: stripeCustomerId }).eq('id', cliente_id)
      }

      // 2. Crear Price recurrente — notación correcta con corchetes
      const isAnual = frecuencia === 'anual'
      const isTrimestral = frecuencia === 'trimestral'
      const price = await stripe('/prices', {
        unit_amount: String(Math.round(importe * 100)),
        currency: 'eur',
        'recurring[interval]': isAnual ? 'year' : 'month',
        'recurring[interval_count]': isTrimestral ? '3' : '1',
        'product_data[name]': nombre_plan || `Plan ${frecuencia || 'mensual'} — ${cliente.nombre}`,
      })
      if (price.error) throw new Error('Stripe price: ' + price.error.message)

      // 3. Checkout session para que el cliente guarde su tarjeta
      const portalUrl = `${APP_URL}/portal/${cliente_id}`
      const session = await stripe('/checkout/sessions', {
        customer: stripeCustomerId,
        'payment_method_types[0]': 'card',
        mode: 'subscription',
        'line_items[0][price]': price.id,
        'line_items[0][quantity]': '1',
        success_url: `${portalUrl}?pago=ok`,
        cancel_url: `${portalUrl}?pago=cancelado`,
        'subscription_data[metadata][cliente_id]': cliente_id,
        'subscription_data[metadata][entrenador_id]': user.id,
      })
      if (session.error) throw new Error('Stripe session: ' + session.error.message)

      // 4. Guardar plan pendiente en BD
      await sb.from('planes_cobro').upsert({
        entrenador_id: user.id, cliente_id,
        nombre: nombre_plan || `Plan ${frecuencia || 'mensual'}`,
        importe, frecuencia: frecuencia || 'mensual',
        stripe_price_id: price.id, estado: 'pendiente',
      }, { onConflict: 'cliente_id' })

      return new Response(JSON.stringify({ ok: true, checkout_url: session.url }), { headers: CORS })
    }

    if (accion === 'cancelar_suscripcion') {
      const subId = cliente.stripe_subscription_id
      if (subId) await stripe(`/subscriptions/${subId}`, { cancel_at_period_end: 'true' })
      await sb.from('planes_cobro').update({ estado: 'cancelado' }).eq('cliente_id', cliente_id)
      await sb.from('clientes').update({ suscripcion_activa: false, stripe_subscription_id: null }).eq('id', cliente_id)
      return new Response(JSON.stringify({ ok: true }), { headers: CORS })
    }

    if (accion === 'estado') {
      const { data: plan } = await sb.from('planes_cobro').select('*').eq('cliente_id', cliente_id).maybeSingle()
      let stripeData = null
      if (cliente.stripe_subscription_id) stripeData = await stripe(`/subscriptions/${cliente.stripe_subscription_id}`)
      return new Response(JSON.stringify({ ok: true, plan, stripe: stripeData }), { headers: CORS })
    }

    return new Response(JSON.stringify({ error: 'Acción no reconocida' }), { status: 400, headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
