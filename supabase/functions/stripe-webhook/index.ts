import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')

// Ya está correctamente protegido: valida la firma HMAC de Stripe.
// No lleva JWT de usuario a propósito — lo llama Stripe, no el frontend.

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') || ''
    const parts = signature.split(',')
    const timestamp = parts.find((p) => p.startsWith('t='))?.split('=')[1]
    const signed = parts.find((p) => p.startsWith('v1='))?.split('=')[1]
    const payload = `${timestamp}.${body}`
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
    if (expected !== signed) {
      console.error('Firma invalida')
      return new Response(JSON.stringify({ error: 'Firma invalida' }), { status: 400, headers })
    }

    const event = JSON.parse(body)
    console.log('Evento Stripe:', event.type)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const cliente_id = session.metadata?.cliente_id
      const entrenador_id = session.metadata?.entrenador_id
      const importe = Number(session.metadata?.importe || 0)
      if (cliente_id && entrenador_id) {
        const hoy = new Date()
        const vencimiento = new Date(hoy)
        vencimiento.setMonth(vencimiento.getMonth() + 1)

        await supabase.from('pagos').insert({
          entrenador_id, cliente_id, importe, concepto: 'Mensualidad online - Stripe',
          fecha_pago: hoy.toISOString().split('T')[0], valido_hasta: vencimiento.toISOString().split('T')[0], estado: 'pagado'
        })
        await supabase.from('suscripciones').update({
          stripe_customer_id: session.customer, stripe_payment_intent_id: session.payment_intent,
          estado: 'activa', importe, fecha_inicio: hoy.toISOString().split('T')[0],
          fecha_vencimiento: vencimiento.toISOString().split('T')[0], updated_at: new Date().toISOString()
        }).eq('cliente_id', cliente_id).eq('estado', 'pendiente')
        await supabase.from('clientes').update({ estado: 'activo' }).eq('id', cliente_id)
        await supabase.from('alertas').insert({
          entrenador_id, cliente_id, tipo: 'pago_vencido',
          mensaje: `Pago recibido via Stripe: ${importe}€. El acceso del cliente ha sido activado automaticamente.`
        })
        console.log('Pago procesado para cliente:', cliente_id)
      }
    }
    return new Response(JSON.stringify({ ok: true }), { headers })
  } catch (err: any) {
    console.error('Error webhook:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
})
