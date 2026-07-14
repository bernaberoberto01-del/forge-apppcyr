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
    const hace28 = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];
    // Clientes presenciales activos con email
    const { data: clientes } = await supabase.from('clientes').select('id,nombre,email,entrenador_id').eq('estado', 'activo').eq('tipo', 'presencial').not('email', 'is', null);
    const enviados = [];
    for (const c of clientes || []){
      // Ver si ya se le envió en los últimos 28 días
      const { data: ultimo } = await supabase.from('progresion_fuerza').select('created_at').eq('cliente_id', c.id).gte('created_at', hace28).limit(1).single();
      if (ultimo) continue; // Ya rellenó este mes
      const enlace = `${APP_URL}/progreso/${c.id}`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Forge <onboarding@resend.dev>',
          to: c.email,
          subject: `${c.nombre.split(' ')[0]}, ¿cuánto mueves ahora? 💪`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px">
              <div style="background:#111;border-radius:16px;padding:20px;text-align:center;margin-bottom:20px">
                <div style="display:inline-block;background:#FF5C00;border-radius:10px;padding:8px 14px;margin-bottom:8px">
                  <span style="color:white;font-size:18px;font-weight:bold">F</span>
                </div>
                <h2 style="color:white;margin:0;font-size:20px">Control mensual de progresión</h2>
              </div>
              <p style="color:#444;font-size:15px;line-height:1.6">Hola <strong>${c.nombre.split(' ')[0]}</strong> 👋</p>
              <p style="color:#444;font-size:14px;line-height:1.6">Han pasado 4 semanas desde tu último control. Tarda <strong>menos de 2 minutos</strong> en decirle a tu entrenador cuánto estás moviendo ahora en los ejercicios principales.</p>
              <p style="color:#444;font-size:14px">Con estos datos tu entrenador puede ver tu progresión real y ajustar tu rutina del próximo mes.</p>
              <a href="${enlace}" style="display:block;background:#FF5C00;color:white;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:bold;margin:24px 0">
                Registrar mis marcas 💪
              </a>
              <p style="color:#999;font-size:12px;text-align:center">Forge Studio OS · Solo te tomará 2 minutos</p>
            </div>
          `
        })
      });
      await supabase.from('emails_log').insert({
        entrenador_id: c.entrenador_id,
        cliente_id: c.id,
        tipo: 'checkin_semanal',
        email_destino: c.email,
        estado: 'enviado'
      });
      enviados.push(c.nombre);
    }
    return new Response(JSON.stringify({
      ok: true,
      enviados: enviados.length,
      clientes: enviados
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