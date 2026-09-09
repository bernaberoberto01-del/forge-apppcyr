import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const APP_URL = 'https://forge-studio-os.vercel.app'
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })

  try {
    const { data: config } = await sb.from('configuracion')
      .select('nombre_entrenador,nombre_negocio,color_acento').eq('entrenador_id', user.id).maybeSingle()
    const nombreEntrenador = config?.nombre_entrenador || 'Tu entrenador'
    const nombreNegocio = config?.nombre_negocio || nombreEntrenador
    const color = config?.color_acento || '#FF5C00'

    const { data: clientes, error } = await sb.from('clientes')
      .select('id, nombre, email, entrenador_id, auth_user_id')
      .eq('estado', 'activo').eq('entrenador_id', user.id)
      .not('email', 'is', null).not('auth_user_id', 'is', null)
    if (error) throw error

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!gmailUser || !gmailPass) {
      return new Response(JSON.stringify({ error: 'GMAIL no configurado' }), { status: 500, headers: CORS })
    }

    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')
    const resultados: any[] = []

    for (const cliente of clientes || []) {
      const nombre = cliente.nombre.split(' ')[0]
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f2f1ee}
.w{max-width:520px;margin:0 auto;padding:20px 16px}.c{background:#fff;border-radius:20px;overflow:hidden}
.h{background:#0A0A0A;padding:28px}.hl{font-size:20px;font-weight:800;color:${color}}.hs{font-size:12px;color:rgba(255,255,255,.3);margin-top:4px}
.b{padding:28px}.hi{font-size:20px;font-weight:700;color:#0A0A0A;margin-bottom:12px}.t{font-size:14px;line-height:1.7;color:#555;margin-bottom:12px}
.cta{text-align:center;margin:28px 0}.btn{display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px}
.note{font-size:11px;color:#aaa;text-align:center;margin-top:8px}
.f{padding:16px 28px;background:#f7f6f3;font-size:11px;color:#aaa;text-align:center}
</style></head><body><div class="w"><div class="c">
<div class="h"><div class="hl">${nombreNegocio}</div><div class="hs">Tu portal personal</div></div>
<div class="b">
<div class="hi">Hola ${nombre} 👋</div>
<p class="t">Es momento de tu check-in semanal. Cuéntame cómo ha ido la semana: energía, sueño, fatiga y estrés. Solo tarda <strong>1 minuto</strong>.</p>
<p class="t">Con esos datos ajusto tu plan para la próxima semana.</p>
<div class="cta">
  <a href="${APP_URL}" class="btn">Hacer mi check-in →</a>
</div>
<p class="note">Entra al portal y pulsa el botón de check-in 📋</p>
</div>
<div class="f">Un mensaje de ${nombreEntrenador} · ${nombreNegocio}</div>
</div></div></body></html>`

      try {
        const smtp = new SMTPClient({
          connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: gmailUser, password: gmailPass } }
        })
        await smtp.send({
          from: `"${nombreNegocio}" <${gmailUser}>`,
          to: cliente.email,
          subject: `${nombre}, ¿cómo ha ido tu semana? 📋`,
          html,
        })
        await smtp.close()

        await sb.from('mensajes_cliente').insert({
          cliente_id: cliente.id, entrenador_id: cliente.entrenador_id,
          contenido: '📋 Te he enviado el recordatorio de check-in semanal por email. ¡Cuéntame cómo estás!',
          tipo: 'sistema', leido: false, leido_entrenador: true
        })
        resultados.push({ cliente: cliente.nombre, ok: true })
      } catch(e: any) {
        console.error(`Error ${cliente.email}:`, e.message)
        resultados.push({ cliente: cliente.nombre, ok: false, error: e.message })
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      enviados: resultados.filter(r => r.ok).length,
      total: resultados.length,
      resultados
    }), { headers: CORS })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
