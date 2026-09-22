import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { cliente_id, tipo, preview } = await req.json().catch(() => ({}))
    if (!cliente_id || !tipo) return new Response(JSON.stringify({ error: 'cliente_id y tipo requeridos' }), { status: 400, headers: CORS })

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!gmailUser || !gmailPass) return new Response(JSON.stringify({ ok: false, motivo: 'SMTP no configurado' }), { headers: CORS })

    const { data: cliente } = await sb.from('clientes').select('nombre, email, entrenador_id').eq('id', cliente_id).single()
    if (!cliente?.email) return new Response(JSON.stringify({ ok: false, motivo: 'Sin email' }), { headers: CORS })

    const { data: config } = await sb.from('configuracion').select('nombre_entrenador, nombre_negocio, color_acento').eq('entrenador_id', cliente.entrenador_id).maybeSingle()
    const nombreEntrenador = config?.nombre_entrenador || 'Tu entrenador'
    const nombreNegocio = config?.nombre_negocio || nombreEntrenador
    const color = config?.color_acento || '#FF5C00'
    const nombre = cliente.nombre.split(' ')[0]
    const portalUrl = `https://forge-studio-os.vercel.app/portal/${cliente_id}`

    let asunto = ''
    let cuerpo = ''

    if (tipo === 'mensaje_entrenador') {
      // Notificación al cliente: el entrenador le ha escrito
      asunto = `Tienes un mensaje de ${nombreEntrenador}`
      cuerpo = `
        <p style="font-size:16px;font-weight:600;color:#0A0A0A;margin-bottom:8px">Hola ${nombre},</p>
        <p style="font-size:15px;color:#444;line-height:1.6;margin-bottom:16px">${nombreEntrenador} te ha enviado un mensaje en tu portal.</p>
        ${preview ? `<div style="background:#f5f5f0;border-left:3px solid ${color};border-radius:4px;padding:12px 16px;margin-bottom:16px"><p style="font-size:14px;color:#555;font-style:italic">&ldquo;${preview.slice(0,120)}${preview.length > 120 ? '...' : ''}&rdquo;</p></div>` : ''}
        <p style="font-size:15px;color:#444;margin-bottom:24px">Entra en tu portal para leerlo y responder.</p>
      `
    } else if (tipo === 'mensaje_cliente') {
      // Notificación al entrenador: el cliente le ha escrito
      // En este caso el destinatario es el entrenador, no el cliente
      const { data: cfg2 } = await sb.from('configuracion').select('email_contacto').eq('entrenador_id', cliente.entrenador_id).maybeSingle()
      const emailEntrenador = cfg2?.email_contacto || gmailUser
      asunto = `${nombre} te ha enviado un mensaje`
      const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f5f5f0;padding:24px"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden"><div style="background:#111;padding:24px"><span style="color:${color};font-size:18px;font-weight:800">${nombreNegocio}</span></div><div style="padding:24px"><p style="font-size:16px;font-weight:600;margin-bottom:8px">${nombre} te ha escrito:</p>${preview ? `<div style="background:#f5f5f0;border-left:3px solid ${color};border-radius:4px;padding:12px 16px;margin-bottom:16px"><p style="font-size:14px;color:#555;font-style:italic">&ldquo;${preview.slice(0,200)}&rdquo;</p></div>` : ''}<a href="https://forge-studio-os.vercel.app/mensajes" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:10px">Ver mensaje →</a></div></div></body></html>`
      const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')
      const client = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: gmailUser, password: gmailPass } } })
      await client.send({ from: `${nombreNegocio} <${gmailUser}>`, to: emailEntrenador, subject: asunto, html })
      await client.close()
      return new Response(JSON.stringify({ ok: true, enviado_a: emailEntrenador }), { headers: CORS })
    }

    // Email al cliente
    const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f5f5f0;padding:24px"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden"><div style="background:#111;padding:24px"><span style="color:${color};font-size:18px;font-weight:800">${nombreNegocio}</span></div><div style="padding:24px">${cuerpo}<a href="${portalUrl}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:10px">Abrir mi portal →</a></div><div style="padding:16px 24px;background:#f5f5f0;font-size:12px;color:#888">Este mensaje va dirigido a ti como cliente de ${nombreNegocio}.</div></div></body></html>`

    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')
    const client = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: gmailUser, password: gmailPass } } })
    await client.send({ from: `${nombreEntrenador} <${gmailUser}>`, to: cliente.email, subject: asunto, html })
    await client.close()

    return new Response(JSON.stringify({ ok: true, enviado_a: cliente.email }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
