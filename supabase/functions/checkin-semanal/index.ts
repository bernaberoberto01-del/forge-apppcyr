import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const APP_URL = Deno.env.get('APP_URL') || 'https://forge-studio-os.vercel.app'

// Invocada por el entrenador desde Seguimiento.jsx ("reenviar check-in").
// Antes enviaba a los clientes de TODOS los entrenadores de la plataforma —
// ahora exige sesión y se limita a los clientes propios del que llama.

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers })

  try {
    const { data: clientes, error } = await supabase.from('clientes')
      .select('id, nombre, email, entrenador_id').eq('estado', 'activo').eq('entrenador_id', user.id).not('email', 'is', null)
    if (error) throw error

    const resultados = []
    for (const cliente of clientes || []) {
      const enlace = `${APP_URL}/seguimiento/${cliente.id}`
      const body = {
        from: 'Forge <onboarding@resend.dev>',
        to: cliente.email,
        subject: `Como ha ido tu semana, ${cliente.nombre}?`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <div style="text-align:center;margin-bottom:20px">
              <div style="display:inline-block;background:#FF5C00;border-radius:10px;padding:10px 16px">
                <span style="color:white;font-size:20px;font-weight:bold">Forge</span>
              </div>
            </div>
            <h2 style="color:#111;font-size:20px">Hola ${cliente.nombre}!</h2>
            <p style="color:#444;font-size:15px;line-height:1.6;margin-bottom:24px">
              Tu entrenador quiere saber como has ido esta semana. Solo te llevara <strong>1 minuto</strong>.
            </p>
            <a href="${enlace}" style="display:block;background:#FF5C00;color:white;text-decoration:none;text-align:center;padding:14px 24px;border-radius:8px;font-size:16px;font-weight:bold;margin-bottom:24px">
              Responder cuestionario
            </a>
            <p style="color:#999;font-size:12px;text-align:center">
              Forge Studio OS
            </p>
          </div>
        `
      }
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const emailData = await emailRes.json()
      console.log('Resend response:', JSON.stringify(emailData))
      await supabase.from('emails_log').insert({
        entrenador_id: cliente.entrenador_id, cliente_id: cliente.id,
        tipo: 'checkin_semanal', email_destino: cliente.email, estado: emailRes.ok ? 'enviado' : 'error'
      })
      resultados.push({ cliente: cliente.nombre, ok: emailRes.ok, detalle: emailData })
    }
    return new Response(JSON.stringify({ ok: true, enviados: resultados.length, resultados }), { headers })
  } catch (err: any) {
    console.error('Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
})
