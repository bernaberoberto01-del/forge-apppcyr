import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ¿Puede `uid` gestionar los clientes del entrenador `entrenadorId`? Sí si es él
// mismo o si ambos están en un centro que comparte clientes (migración 0006).
// `db` debe ser el cliente con service role. Sin la migración, solo él mismo.
async function puedeGestionar(db: any, uid: string, entrenadorId: string): Promise<boolean> {
  if (entrenadorId === uid) return true
  const { data, error } = await db.rpc('es_mismo_equipo', { a: uid, b: entrenadorId })
  return !error && data === true
}

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }

const PLAN_LABEL: Record<string, string> = { nutricion: 'Hábitos & Alimentación', entrenamiento: 'Entrenamiento', completo: 'Plan Completo' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })

  try {
    const { cliente_id, nombre, plan, justificacion, donde_entrena } = await req.json().catch(() => ({}))
    if (!cliente_id || !nombre || !justificacion) {
      return new Response(JSON.stringify({ error: 'cliente_id, nombre y justificacion requeridos' }), { status: 400, headers: CORS })
    }

    const { data: cliente } = await sb.from('clientes').select('entrenador_id').eq('id', cliente_id).single()
    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: CORS })
    if (!(await puedeGestionar(sb, user.id, cliente.entrenador_id))) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })

    const { data: config } = await sb.from('configuracion').select('nombre_entrenador').eq('entrenador_id', cliente.entrenador_id).maybeSingle()
    const nombreEntrenador = config?.nombre_entrenador || 'Roberto Bernabé'
    const firmaEntrenador = nombreEntrenador.split(' ')[0]
    const planLabel = PLAN_LABEL[plan] || plan || 'el plan recomendado'
    const nombreCliente = String(nombre).split(' ')[0]

    // El cliente ya NO recibe acceso al portal antes de pagar — el mensaje invita
    // a activar el plan vía el enlace de pago, no a "entrar con el enlace que ya
    // tiene". El enlace real se añade después, fuera de lo que genera la IA, para
    // no arriesgar que lo trunque, lo reescriba o lo rodee de markdown.
    const prompt = `Eres ${nombreEntrenador}, entrenador personal en Murcia. Genera un mensaje de WhatsApp directo y cercano (máximo 150 palabras) para enviarle a ${nombreCliente} explicándole por qué el plan ${planLabel} es el que mejor se adapta a su situación. Basa el mensaje en esto: ${justificacion}.${donde_entrena ? ` Entrena en: ${donde_entrena}.` : ''} El mensaje debe sonar personal, no comercial. No uses markdown ni asteriscos para negritas. Usa solo texto plano. Termina invitándole a activar su plan — el enlace de pago se añadirá justo debajo del mensaje, así que no escribas tú ningún enlace ni lo menciones por nombre o URL, solo anímale a dar el paso. Firma como ${firmaEntrenador}.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, messages: [{ role: 'user', content: prompt }] })
    })

    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: e.error?.message || 'Error IA' }), { status: 500, headers: CORS })
    }

    const aiData = await res.json()
    let mensaje = aiData.content?.[0]?.text?.trim() || ''
    if (!mensaje) return new Response(JSON.stringify({ error: 'IA no generó mensaje' }), { status: 500, headers: CORS })

    // Enlace de pago para el plan sugerido — se pide a crear-checkout-suscripcion
    // reenviando el mismo token del entrenador que ya autenticó esta llamada.
    let checkoutUrl: string | null = null
    try {
      const checkoutRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/crear-checkout-suscripcion`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id, plan }),
      })
      if (checkoutRes.ok) {
        const checkoutData = await checkoutRes.json()
        checkoutUrl = checkoutData?.url || null
      } else {
        console.error('generar-mensaje-bienvenida: crear-checkout-suscripcion respondió', checkoutRes.status, await checkoutRes.text())
      }
    } catch (checkoutErr: any) {
      console.error('generar-mensaje-bienvenida: error llamando a crear-checkout-suscripcion', checkoutErr.message)
    }

    if (checkoutUrl) mensaje += `\n\nActiva tu plan aquí: ${checkoutUrl}`

    return new Response(JSON.stringify({ mensaje, checkout_url: checkoutUrl }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
