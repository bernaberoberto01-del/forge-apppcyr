import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

serve(async (req) => {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!sig || !webhookSecret) return new Response('Firma requerida', { status: 400 })
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' })
  let event
  try { event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret) }
  catch (err) { return new Response('Firma inválida: ' + err.message, { status: 400 }) }
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode !== 'subscription') break
        const { cliente_id, entrenador_id, plan } = session.metadata || {}
        const subId = session.subscription
        if (!cliente_id || !entrenador_id || !subId) break
        const CONCEPTOS = { nutricion: 'Asesoría Nutrición', entrenamiento: 'Asesoría Entrenamiento', completo: 'Asesoría Completa' }
        const IMPORTES = { nutricion: 29, entrenamiento: 35, completo: 49 }
        let proximoCobro = null
        try {
          const sub = await stripe.subscriptions.retrieve(subId)
          proximoCobro = new Date(sub.current_period_end * 1000).toISOString().split('T')[0]
        } catch (_) {}
        const payload = {
          entrenador_id, cliente_id, stripe_subscription_id: subId, stripe_customer_id: session.customer,
          plan, importe: IMPORTES[plan] || null, concepto: CONCEPTOS[plan] || plan,
          frecuencia: 'mensual', activo: true, estado: 'activo', proximo_cobro: proximoCobro,
        }
        const { data: planExistente } = await supabase.from('planes_cobro').select('id').eq('cliente_id', cliente_id).maybeSingle()
        if (planExistente) {
          await supabase.from('planes_cobro').update(payload).eq('id', planExistente.id)
        } else {
          await supabase.from('planes_cobro').insert(payload)
        }
        await supabase.from('clientes').update({ stripe_subscription_id: subId, stripe_customer_id: session.customer, plan_online: plan }).eq('id', cliente_id)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const subId = invoice.subscription
        if (!subId) break
        const { data: plan } = await supabase.from('planes_cobro').select('id, cliente_id, entrenador_id, concepto, importe').eq('stripe_subscription_id', subId).single()
        if (!plan) break
        const importe = (invoice.amount_paid || 0) / 100
        const fecha = new Date(invoice.created * 1000).toISOString().split('T')[0]
        const proximoCobro = invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString().split('T')[0] : null
        await supabase.from('pagos').insert({ entrenador_id: plan.entrenador_id, cliente_id: plan.cliente_id, importe, concepto: plan.concepto || 'Suscripción mensual Forge', fecha_pago: fecha, estado: 'pagado' })
        await supabase.from('planes_cobro').update({ estado: 'activo', activo: true, ultimo_cobro: fecha, ...(proximoCobro ? { proximo_cobro: proximoCobro } : {}) }).eq('id', plan.id)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subId = invoice.subscription
        if (!subId) break
        const { data: plan } = await supabase.from('planes_cobro').select('id, cliente_id, entrenador_id').eq('stripe_subscription_id', subId).single()
        if (!plan) break
        await supabase.from('planes_cobro').update({ estado: 'pago_fallido' }).eq('id', plan.id)
        await supabase.from('mensajes_cliente').insert({ entrenador_id: plan.entrenador_id, cliente_id: plan.cliente_id, contenido: '⚠️ Ha habido un problema con tu pago mensual. Por favor, actualiza tu método de pago para seguir con tu plan.', enviado_por: 'entrenador', leido_cliente: false })
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const { data: plan } = await supabase.from('planes_cobro').select('id, cliente_id').eq('stripe_subscription_id', sub.id).single()
        if (!plan) break
        await supabase.from('planes_cobro').update({ estado: 'cancelado', activo: false }).eq('id', plan.id)
        await supabase.from('clientes').update({ stripe_subscription_id: null, plan_online: null }).eq('id', plan.cliente_id)
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const { data: plan } = await supabase.from('planes_cobro').select('id, cliente_id').eq('stripe_subscription_id', sub.id).single()
        if (!plan) break
        const PRICE_TO_PLAN = { forge_nutricion_mensual: { plan: 'nutricion', importe: 29 }, forge_entrenamiento_mensual: { plan: 'entrenamiento', importe: 35 }, forge_completo_mensual: { plan: 'completo', importe: 49 } }
        const lookupKey = sub.items?.data?.[0]?.price?.lookup_key
        const planData = lookupKey ? PRICE_TO_PLAN[lookupKey] : null
        if (planData) {
          await supabase.from('planes_cobro').update({ plan: planData.plan, importe: planData.importe, estado: sub.status === 'active' ? 'activo' : sub.status }).eq('id', plan.id)
          await supabase.from('clientes').update({ plan_online: planData.plan }).eq('id', plan.cliente_id)
        }
        break
      }
    }
    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
