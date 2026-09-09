import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

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

    const { data: config } = await sb.from('configuracion')
      .select('nombre_entrenador,nombre_negocio,color_acento')
      .eq('entrenador_id', cliente.entrenador_id).maybeSingle()

    const nombreEntrenador = config?.nombre_entrenador || 'Tu entrenador'
    const nombreNegocio = config?.nombre_negocio || nombreEntrenador
    const color = config?.color_acento || '#FF5C00'
    const nombre = cliente.nombre.split(' ')[0]
    const redirectTo = 'https://forge-studio-os.vercel.app/'

    // Estrategia: intentar invite (crea cuenta nueva) → si ya existe, usar magiclink
    let accessLink = ''
    let esNuevoUsuario = false

    // 1. Intentar invite (para clientes sin cuenta)
    const { data: inviteData, error: inviteError } = await sb.auth.admin.generateLink({
      type: 'invite',
      email: cliente.email,
      options: { redirectTo }
    })

    if (!inviteError && inviteData?.properties?.action_link) {
      accessLink = inviteData.properties.action_link
      esNuevoUsuario = true
      // Vincular auth_user_id inmediatamente si podemos obtener el user_id
      const newUserId = inviteData.user?.id
      if (newUserId && !cliente.auth_user_id) {
        await sb.from('clientes').update({ auth_user_id: newUserId }).eq('id', cliente_id)
      }
    } else {
      // 2. Ya tiene cuenta → usar magiclink
      const { data: magicData, error: magicError } = await sb.auth.admin.generateLink({
        type: 'magiclink',
        email: cliente.email,
        options: { redirectTo }
      })
      if (magicError || !magicData?.properties?.action_link) {
        // 3. Fallback: recovery link
        const { data: recovData, error: recovError } = await sb.auth.admin.generateLink({
          type: 'recovery',
          email: cliente.email,
          options: { redirectTo }
        })
        if (recovError) return new Response(JSON.stringify({ error: 'No se pudo generar el link' }), { status: 500, headers: CORS })
        accessLink = recovData?.properties?.action_link || redirectTo
      } else {
        accessLink = magicData.properties.action_link
      }
    }

    // Guardar que se envió el acceso
    await sb.from('clientes').update({ ultimo_acceso_enviado: new Date().toISOString() }).eq('id', cliente_id).catch(() => {})

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!gmailUser || !gmailPass) {
      // Sin email configurado → devolver el link para que el entrenador lo copie
      return new Response(JSON.stringify({ ok: true, link: accessLink, sin_email: true }), { headers: CORS })
    }

    // Email HTML
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f2f1ee}
.w{max-width:560px;margin:0 auto;padding:24px 16px}.c{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.06)}
.h{background:#0A0A0A;padding:32px 28px}.hl{font-size:22px;font-weight:800;color:${color};letter-spacing:-0.5px}.hs{font-size:13px;color:rgba(255,255,255,.35);margin-top:4px}
.b{padding:32px 28px}.hi{font-size:22px;font-weight:700;color:#0A0A0A;margin-bottom:16px;letter-spacing:-0.3px}.t{font-size:15px;line-height:1.7;color:#555;margin-bottom:14px}
.cta{text-align:center;margin:32px 0}.btn{display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 36px;border-radius:14px;letter-spacing:-0.2px}
.note{font-size:12px;color:#aaa;text-align:center;margin-top:10px;line-height:1.6}
.box{background:#f7f6f3;border-radius:12px;padding:18px 20px;margin:20px 0;border-left:3px solid ${color}}
.box-t{font-size:12px;font-weight:700;color:#9B9B9B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.box-i{font-size:14px;color:#333;line-height:1.6}
.div{height:1px;background:#f0f0f0;margin:24px 0}
.f{padding:20px 28px;background:#f7f6f3;font-size:12px;color:#aaa;text-align:center;line-height:1.7}
</style></head><body><div class="w"><div class="c">
<div class="h"><div class="hl">${nombreNegocio}</div><div class="hs">Tu portal personal de entrenamiento</div></div>
<div class="b">
<div class="hi">Hola ${nombre} 👋</div>
<p class="t">Tu portal personal ya está listo. Aquí encontrarás tu rutina, tu plan de nutrición y podrás hacer seguimiento de todo tu progreso.</p>
<div class="cta">
  <a href="${accessLink}" class="btn">Acceder a mi portal →</a>
</div>
<p class="note">${esNuevoUsuario ? 'Al pulsar el enlace crearás tu cuenta y entrarás directamente.' : 'Pulsa el enlace para entrar directamente.'} Válido 24 horas.</p>
<div class="div"></div>
<div class="box">
  <div class="box-t">¿Qué encontrarás?</div>
  <div class="box-i">
    💪 Tu rutina personalizada<br>
    🥗 Tu plan de nutrición<br>
    📊 Seguimiento de progreso<br>
    ✉️ Chat directo con ${nombreEntrenador}
  </div>
</div>
<p class="t" style="font-size:13px;color:#999">Si no puedes pulsar el botón, copia este enlace en tu navegador:<br><span style="color:${color};word-break:break-all;font-size:12px">${accessLink}</span></p>
</div>
<div class="f">
  Un mensaje de ${nombreEntrenador} · ${nombreNegocio}<br>
  Si tienes alguna duda, responde directamente a este email.
</div>
</div></div></body></html>`

    // Enviar con Gmail SMTP via nodemailer-compatible fetch
    const smtpBody = {
      from: `"${nombreNegocio}" <${gmailUser}>`,
      to: cliente.email,
      subject: `${nombre}, tu portal de ${nombreNegocio} está listo 🚀`,
      html,
    }

    const smtpRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smtpBody),
    }).catch(() => null)

    // Usar nodemailer via fetch a un relay propio
    // Por ahora usamos la API de Gmail directamente
    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')
    const smtpClient = new SMTPClient({
      connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: gmailUser, password: gmailPass } }
    })
    await smtpClient.send({
      from: `"${nombreNegocio}" <${gmailUser}>`,
      to: cliente.email,
      subject: `${nombre}, tu portal de ${nombreNegocio} está listo 🚀`,
      html,
    })
    await smtpClient.close()

    return new Response(JSON.stringify({ ok: true, email_enviado: true }), { headers: CORS })

  } catch (err: any) {
    console.error('Error bienvenida-cliente:', err)
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), { status: 500, headers: CORS })
  }
})
