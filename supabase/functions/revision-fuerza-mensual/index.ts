import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = 'https://forge-studio-os.vercel.app';
Deno.serve(async (req)=>{
  if (!ADMIN_SECRET || req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const headers = {
    'Content-Type': 'application/json'
  };
  try {
    // Clientes presenciales activos con email
    const { data: clientes } = await supabase.from('clientes').select('id, nombre, email, entrenador_id').eq('estado', 'activo').eq('tipo', 'presencial').not('email', 'is', null);
    const resultados = [];
    for (const cliente of clientes || []){
      // Comprobar si ya respondio en las ultimas 3 semanas
      const hace21 = new Date(Date.now() - 21 * 86400000).toISOString().split('T')[0];
      const { data: ultima } = await supabase.from('progresion_fuerza').select('id').eq('cliente_id', cliente.id).gte('fecha', hace21).limit(1);
      if (ultima?.length) continue; // Ya respondio recientemente
      const enlace = `${APP_URL}/progresion/${cliente.id}`;
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Forge <onboarding@resend.dev>',
          to: cliente.email,
          subject: `${cliente.nombre.split(' ')[0]}, ¿cuánto mueves ahora? 💪`,
          html: `
            <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <div style="background:#111;border-radius:16px;padding:20px;text-align:center;margin-bottom:20px">
                <div style="display:inline-block;background:#FF5C00;border-radius:10px;padding:8px 14px;margin-bottom:8px">
                  <span style="color:white;font-weight:bold;font-size:16px">Forge</span>
                </div>
                <h2 style="color:white;margin:0;font-size:20px">Revisión mensual de fuerza</h2>
                <p style="color:rgba(255,255,255,0.5);margin:6px 0 0;font-size:13px">Solo 2 minutos · Sin complicaciones</p>
              </div>
              <p style="color:#444;font-size:15px;line-height:1.6">Hola <strong>${cliente.nombre.split(' ')[0]}</strong> 👋</p>
              <p style="color:#444;font-size:14px;line-height:1.6">Una vez al mes te preguntamos por tus marcas aproximadas para que tu entrenador pueda ver tu progreso real y ajustar tu rutina del mes que viene.</p>
              <p style="color:#444;font-size:14px;line-height:1.6">No hace falta que sean exactas — una aproximación es suficiente.</p>
              <a href="${enlace}" style="display:block;background:#FF5C00;color:white;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:bold;margin:24px 0">
                Registrar mis marcas →
              </a>
              <p style="color:#999;font-size:12px;text-align:center">Forge Studio OS · Solo te llevará 2 minutos</p>
            </div>
          `
        })
      });
      await supabase.from('emails_log').insert({
        entrenador_id: cliente.entrenador_id,
        cliente_id: cliente.id,
        tipo: 'checkin_semanal',
        email_destino: cliente.email,
        estado: emailRes.ok ? 'enviado' : 'error'
      });
      resultados.push({
        cliente: cliente.nombre,
        ok: emailRes.ok
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      enviados: resultados.length,
      resultados
    }), {
      headers
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers
    });
  }
});