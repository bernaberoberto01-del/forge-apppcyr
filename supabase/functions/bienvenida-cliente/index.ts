import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })

  try {
    const { cliente_id } = await req.json().catch(() => ({}))
    if (!cliente_id) return new Response(JSON.stringify({ error: 'cliente_id requerido' }), { status: 400, headers: CORS })

    const { data: cliente } = await sb.from('clientes').select('*').eq('id', cliente_id).single()
    if (!cliente?.email) return new Response(JSON.stringify({ error: 'Cliente sin email' }), { status: 404, headers: CORS })
    if (cliente.entrenador_id !== user.id) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })

    const { data: config } = await sb.from('configuracion').select('nombre_entrenador,nombre_negocio,color_acento').eq('entrenador_id', cliente.entrenador_id).maybeSingle()
    const nombreEntrenador = config?.nombre_entrenador || 'Tu entrenador'
    const nombreNegocio = config?.nombre_negocio || nombreEntrenador
    const color = config?.color_acento || '#FF5C00'
    const nombre = cliente.nombre.split(' ')[0]

    // Generar link de acceso directo con Supabase Admin API
    // Esto crea un link que permite al cliente entrar directamente y establecer contraseña
    const { data: linkData, error: linkError } = await sb.auth.admin.generateLink({
      type: 'recovery',
      email: cliente.email,
      options: {
        redirectTo: 'https://forge-studio-os.vercel.app/portal'
      }
    })

    if (linkError || !linkData?.properties?.action_link) {
      // Si falla generateLink, intentar con inviteUserByEmail
      const { data: inviteData, error: inviteError } = await sb.auth.admin.generateLink({
        type: 'magiclink',
        email: cliente.email,
        options: {
          redirectTo: 'https://forge-studio-os.vercel.app/portal'
        }
      })
      if (inviteError) {
        console.error('Error generando link:', inviteError)
        return new Response(JSON.stringify({ error: 'No se pudo generar el link de acceso' }), { status: 500, headers: CORS })
      }
      var accessLink = inviteData?.properties?.action_link || 'https://forge-studio-os.vercel.app/portal'
    } else {
      var accessLink = linkData.properties.action_link
    }

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!gmailUser || !gmailPass) {
      return new Response(JSON.stringify({ error: 'GMAIL no configurado' }), { status: 500, headers: CORS })
    }

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f0}
.w{max-width:560px;margin:0 auto;padding:24px 16px}.c{background:#fff;border-radius:16px;overflow:hidden}
.h{background:#111;padding:28px}.hl{font-size:20px;font-weight:800;color:${color}}.hs{font-size:13px;color:rgba(255,255,255,.4);margin-top:4px}
.b{padding:28px}.hi{font-size:22px;font-weight:700;margin-bottom:16px}.t{font-size:15px;line-height:1.65;color:#444;margin-bottom:16px}
.cta{text-align:center;margin:28px 0}.btn{display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px}
.note{font-size:12px;color:#999;text-align:center;margin-top:12px}.div{height:1px;background:#f0f0f0;margin:24px 0}
.f{padding:20px 28px;background:#f5f5f0;font-size:13px;color:#888}.fi{font-size:15px;font-weight:600;color:#0A0A0A;margin-top:20px}
.box{background:#f7f6f3;border-radius:12px;padding:16px;margin:16px 0}
</style></head><body><div class="w"><div class="c">
<div class="h"><div class="hl">${nombreNegocio}</div><div class="hs">Tu portal personal</div></div>
<div class="b">
<div class="hi">Hola ${nombre} 👋</div>
<p class="t">Ya tienes tu portal personal listo con tu rutina, plan de alimentación y seguimiento.</p>

<div class="cta">
  <a href="${accessLink}" class="btn">Acceder a mi portal →</a>
</div>
<p class="note">Pulsa el enlace para crear tu contraseña y entrar. Válido 7 días.</p>

<div class="div"></div>
<div class="box">
  <p style="font-size:13px;color:#555;margin-bottom:8px"><strong>La próxima vez</strong> que quieras entrar:</p>
  <p style="font-size:13px;color:#555">Ve a <strong>forge-studio-os.vercel.app</strong> y usa tu email y la contraseña que hayas elegido.</p>
  <p style="font-size:13px;color:#555;margin-top:8px">Si olvidas la contraseña, pulsa "¿Has olvidado tu contraseña?" en el login.</p>
</div>

<div class="div"></div>
<p class="t">Cualquier duda, escríbeme desde el portal.</p>
<div class="fi">${nombreEntrenador}</div>
</div>
<div class="f">Este mensaje va dirigido a ti como cliente de ${nombreNegocio}.</div>
</div></div></body></html>`

    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')
    const client = new SMTPClient({
      connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: gmailUser, password: gmailPass } }
    })
    await client.send({
      from: `${nombreEntrenador} <${gmailUser}>`,
      to: cliente.email,
      subject: `Accede a tu portal, ${nombre}`,
      html
    })
    await client.close()

    await sb.from('mensajes_cliente').insert({
      entrenador_id: cliente.entrenador_id, cliente_id,
      contenido: `✅ Link de acceso enviado a ${cliente.email}`, tipo: 'sistema', leido: true, leido_entrenador: true
    })

    return new Response(JSON.stringify({ ok: true, email: cliente.email }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), { status: 500, headers: CORS })
  }
})
