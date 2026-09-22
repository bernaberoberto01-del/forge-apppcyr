import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const ENTRENADOR_ID = '0b908e25-f69f-472c-9972-87bc93d67e65'

async function stripePost(path: string, params: Record<string, string>, key: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString()
  })
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const adminSecret = req.headers.get('x-admin-secret')
  if (adminSecret !== 'forge-setup-2024') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })
  }

  const key = Deno.env.get('STRIPE_SECRET_KEY')!
  if (!key?.startsWith('sk_live_')) {
    return new Response(JSON.stringify({ error: 'Clave no es live' }), { status: 400, headers: CORS })
  }

  // Obtener todas las tarifas activas de Forge
  const { data: tarifas } = await sb.from('tarifas')
    .select('*')
    .eq('entrenador_id', ENTRENADOR_ID)
    .eq('activa', true)

  const resultados: any[] = []
  const errores: any[] = []

  for (const t of tarifas || []) {
    try {
      // Archivar precio anterior en Stripe si existe y el precio cambió
      if (t.stripe_price_id) {
        // Verificar precio actual en Stripe
        const priceRes = await fetch(`https://api.stripe.com/v1/prices/${t.stripe_price_id}`, {
          headers: { 'Authorization': `Bearer ${key}` }
        })
        const priceData = await priceRes.json()
        const precioStripe = priceData.unit_amount / 100
        
        if (Math.abs(precioStripe - Number(t.precio)) < 0.01) {
          // Precio igual — no tocar
          resultados.push({ tarifa: t.nombre, status: 'sin_cambios', price_id: t.stripe_price_id })
          continue
        }

        // Precio diferente — archivar el anterior
        await fetch(`https://api.stripe.com/v1/prices/${t.stripe_price_id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ active: 'false' }).toString()
        })
      }

      // Crear o actualizar producto
      let productId = t.stripe_product_id
      if (!productId) {
        const prod = await stripePost('products', {
          name: t.nombre,
          'metadata[tarifa_forge]': t.nombre,
        }, key)
        productId = prod.id
      }

      // Crear nuevo precio
      const precio = await stripePost('prices', {
        product: productId,
        unit_amount: String(Math.round(Number(t.precio) * 100)),
        currency: 'eur',
        'recurring[interval]': 'month',
        'metadata[tarifa_forge]': t.nombre,
      }, key)

      if (!precio.id) { errores.push({ tarifa: t.nombre, error: precio.error?.message }); continue }

      // Guardar en BD
      await sb.from('tarifas').update({
        stripe_price_id: precio.id,
        stripe_product_id: productId,
      }).eq('id', t.id)

      resultados.push({ tarifa: t.nombre, status: 'actualizado', price_id: precio.id, precio: t.precio })
    } catch (e: any) {
      errores.push({ tarifa: t.nombre, error: e.message })
    }
  }

  return new Response(JSON.stringify({ ok: true, total: tarifas?.length, resultados, errores }), { headers: CORS })
})
