import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })

  try {
    const { invitacion_id } = await req.json().catch(() => ({}))
    if (!invitacion_id) return new Response(JSON.stringify({ error: 'invitacion_id requerido' }), { status: 400, headers: CORS })

    const { data: inv } = await sb.from('invitaciones_centro').select('*, centros(*)').eq('id', invitacion_id).single()
    if (!inv) return new Response(JSON.stringify({ error: 'Invitación no encontrada' }), { status: 404, headers: CORS })

    // Autorización: quien invita debe ser miembro (admin) del centro
    const { data: soyMiembro } = await sb.from('miembros_centro').select('id').eq('centro_id', inv.centro_id).eq('user_id', user.id).eq('activo', true).maybeSingle()
    if (!soyMiembro) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })

    const nombreCentro = inv.centros?.nombre || 'Forge'
    const color = inv.centros?.color_acento || '#FF5C00'
    const rolLabel = inv.rol === 'admin' ? 'administrador/a' : 'entrenador/a'
    const enlace = `${Deno.env.get('SITE_URL') || 'https://forge-studio-os.vercel.app'}/unirse/${inv.token}`

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!gmailUser || !gmailPass) {
      return new Response(JSON.stringify({ error: 'GMAIL_USER o GMAIL_APP_PASSWORD no configurados' }), { status: 500, headers: CORS })
    }

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f0}.w{max-width:560px;margin:0 auto;padding:24px 16px}.c{background:#fff;border-radius:16px;overflow:hidden}.h{background:#111;padding:28px}.hl{font-size:20px;font-weight:800;color:${color}}.hs{font-size:13px;color:rgba(255,255,255,.4);margin-top:4px}.b{padding:28px}.hi{font-size:22px;font-weight:700;margin-bottom:16px}.t{font-size:15px;line-height:1.65;color:#444;margin-bottom:16px}.cta{text-align:center;margin:28px 0}.btn{display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px}.url{font-size:12px;color:#999;text-align:center;margin-top:8px;word-break:break-all}.f{padding:20px 28px;background:#f5f5f0;font-size:13px;color:#888}</style></head><body><div class="w"><div class="c"><div class="h"><div class="hl">${nombreCentro}</div><div class="hs">Invitación al equipo</div></div><div class="b"><div class="hi">Te han invitado &#x1F44B;</div><p class="t">Te han invitado a unirte a <b>${nombreCentro}</b> como ${rolLabel} en Forge.</p><p class="t">Pulsa el botón para crear tu cuenta y empezar.</p><div class="cta"><a href="${enlace}" class="btn">Unirme al equipo &rarr;</a></div><div class="url">${enlace}</div></div><div class="f">Si no esperabas esta invitación, puedes ignorar este correo.</div></div></div></body></html>`

    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')
    const client = new SMTPClient({
      connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: gmailUser, password: gmailPass } }
    })
    await client.send({ from: `${nombreCentro} <${gmailUser}>`, to: inv.email, subject: `Te han invitado a unirte a ${nombreCentro}`, html })
    await client.close()

    return new Response(JSON.stringify({ ok: true, email: inv.email }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno enviando el email' }), { status: 500, headers: CORS })
  }
})
