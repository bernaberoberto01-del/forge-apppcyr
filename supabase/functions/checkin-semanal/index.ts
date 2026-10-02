import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const APP_URL = Deno.env.get('APP_URL') || 'https://forge-studio-os.vercel.app'
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c])
}

// El color se interpola dentro de atributos style=""; sin validar, un valor
// con comillas permitiría inyectar atributos.
function safeColor(c: string | null | undefined): string {
  return c && /^#[0-9A-Fa-f]{3,8}$/.test(c) ? c : '#FF5C00'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  let entrenadorId: string | null = null
  if (token) {
    const { data: { user } } = await sb.auth.getUser(token)
    entrenadorId = user?.id || null
  }

  const body = await req.json().catch(() => ({}))
  const diasUmbral = body.dias_umbral || 7
  const forzar = body.forzar || false

  try {
    let entrenadores: string[] = []
    if (entrenadorId) {
      entrenadores = [entrenadorId]
    } else {
      const { data } = await sb.from('configuracion').select('entrenador_id')
      entrenadores = (data || []).map((r: any) => r.entrenador_id)
    }

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!gmailUser || !gmailPass) return new Response(JSON.stringify({ error: 'GMAIL no configurado' }), { status: 500, headers: CORS })

    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')
    const resumen: any[] = []

    for (const eid of entrenadores) {
      const { data: config } = await sb.from('configuracion').select('nombre_entrenador,nombre_negocio,color_acento').eq('entrenador_id', eid).maybeSingle()
      const nombreEntrenador = config?.nombre_entrenador || 'Tu entrenador'
      const nombreNegocio = config?.nombre_negocio || nombreEntrenador
      const color = safeColor(config?.color_acento)
      // Versiones escapadas para interpolar en HTML. Las originales solo valen
      // para asunto y remitente, donde las entidades se verían en crudo.
      const eEntrenador = escapeHtml(nombreEntrenador)
      const eNegocio = escapeHtml(nombreNegocio)

      const { data: clientes } = await sb.from('clientes').select('id, nombre, email, entrenador_id, auth_user_id').eq('estado', 'activo').eq('entrenador_id', eid).not('email', 'is', null).not('auth_user_id', 'is', null)
      if (!clientes?.length) continue

      const hoy = new Date()
      const fechaCorte = new Date(hoy.getTime() - diasUmbral * 864e5).toISOString().split('T')[0]
      const clienteIds = clientes.map((c: any) => c.id)
      const { data: ultimosCIs } = await sb.from('checkins').select('cliente_id, fecha').in('cliente_id', clienteIds).gte('fecha', new Date(hoy.getTime() - 60 * 864e5).toISOString().split('T')[0]).order('fecha', { ascending: false })

      const ultimoPorCliente: Record<string, string> = {}
      for (const ci of ultimosCIs || []) {
        if (!ultimoPorCliente[ci.cliente_id]) ultimoPorCliente[ci.cliente_id] = ci.fecha
      }

      const clientesConNecesidad = forzar ? clientes : clientes.filter((c: any) => {
        const ultimo = ultimoPorCliente[c.id]
        return !ultimo || ultimo < fechaCorte
      })

      for (const cliente of clientesConNecesidad) {
        const nombre = cliente.nombre.split(' ')[0]
        const eNombre = escapeHtml(nombre)
        const ultimoCI = ultimoPorCliente[cliente.id]
        const diasSin = ultimoCI ? Math.floor((hoy.getTime() - new Date(ultimoCI).getTime()) / 864e5) : null
        const msg = !ultimoCI ? 'Todavía no me has contado cómo estás. ¡Es el momento! 💪' : diasSin && diasSin >= 14 ? `Llevas ${diasSin} días sin contarme cómo estás. Necesito saber para ajustar tu plan.` : '¿Cómo ha ido esta semana? Solo tarda 1 minuto.'

        const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f2f1ee}.w{max-width:520px;margin:0 auto;padding:20px 16px}.c{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.06)}.h{background:#0A0A0A;padding:28px}.hl{font-size:20px;font-weight:800;color:${color}}.hs{font-size:12px;color:rgba(255,255,255,.3);margin-top:4px}.b{padding:28px}.hi{font-size:20px;font-weight:700;color:#0A0A0A;margin-bottom:12px}.t{font-size:14px;line-height:1.7;color:#555;margin-bottom:12px}.cta{text-align:center;margin:28px 0}.btn{display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 36px;border-radius:12px}.note{font-size:11px;color:#aaa;text-align:center;margin-top:8px}.items{background:#f7f6f3;border-radius:12px;padding:16px 18px;margin:16px 0;border-left:3px solid ${color}}.item{font-size:13px;color:#444;padding:3px 0}.f{padding:16px 28px;background:#f7f6f3;font-size:11px;color:#aaa;text-align:center}</style></head><body><div class="w"><div class="c"><div class="h"><div class="hl">${eNegocio}</div><div class="hs">Tu check-in semanal</div></div><div class="b"><div class="hi">Hola ${eNombre} 👋</div><p class="t">${msg}</p><div class="items"><div class="item">⚡ ¿Cómo va tu energía?</div><div class="item">😴 ¿Estás durmiendo bien?</div><div class="item">🏋️ ¿Cómo está la fatiga muscular?</div><div class="item">🧠 ¿Cuánto estrés estás manejando?</div></div><p class="t" style="font-size:13px;color:#777">Con esos datos ajusto tu plan. <strong>Tarda menos de 1 minuto.</strong></p><div class="cta"><a href="${APP_URL}" class="btn">Hacer mi check-in →</a></div><p class="note">Entra al portal → pulsa 📋 Check-in semanal</p></div><div class="f">Un mensaje de ${eEntrenador} · ${eNegocio}</div></div></div></body></html>`

        try {
          const smtp = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: gmailUser, password: gmailPass } } })
          await smtp.send({ from: `"${nombreNegocio}" <${gmailUser}>`, to: cliente.email, subject: `${nombre}, ¿cómo ha ido esta semana? 📋`, html })
          await smtp.close()
          await sb.from('mensajes_cliente').insert({ cliente_id: cliente.id, entrenador_id: cliente.entrenador_id, contenido: `📋 Recordatorio de check-in enviado. ${diasSin ? `Llevas ${diasSin} días sin check-in.` : '¡Es tu primer check-in!'} ¡Cuéntame cómo estás!`, tipo: 'sistema', leido: false, leido_entrenador: true })
          resumen.push({ cliente: nombre, ok: true, diasSin })
        } catch(e: any) {
          resumen.push({ cliente: nombre, ok: false, error: e.message })
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, enviados: resumen.filter(r=>r.ok).length, fallidos: resumen.filter(r=>!r.ok).length, detalle: resumen }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
