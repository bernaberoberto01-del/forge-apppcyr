import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
Deno.serve(async (req)=>{
  if (!ADMIN_SECRET || req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const en7dias = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    // Pagos que vencen en los próximos 7 días o ya vencidos sin notificar
    const { data: pagos, error } = await supabase.from('pagos').select('*, clientes(nombre, email, entrenador_id)').lte('valido_hasta', en7dias).gte('valido_hasta', new Date(Date.now() - 86400000).toISOString().split('T')[0]);
    if (error) throw error;
    const resultados = [];
    for (const pago of pagos || []){
      const cliente = pago.clientes;
      if (!cliente?.email) continue;
      const dias = Math.ceil((new Date(pago.valido_hasta).getTime() - new Date().getTime()) / 86400000);
      const msg = dias < 0 ? 'Tu suscripción ha vencido' : dias === 0 ? 'Tu suscripción vence hoy' : `Tu suscripción vence en ${dias} días`;
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Forge <noreply@forgeapp.es>',
          to: cliente.email,
          subject: `Aviso de pago — ${msg}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#111">Hola ${cliente.nombre} 👋</h2>
              <p style="color:#444;font-size:15px;line-height:1.6">${msg}.</p>
              <p style="color:#444;font-size:14px">Importe: <strong>${pago.importe}€</strong></p>
              <p style="color:#444;font-size:14px">Concepto: ${pago.concepto || 'Mensualidad'}</p>
              <p style="color:#999;font-size:12px;margin-top:20px">Para renovar contacta directamente con tu entrenador.</p>
            </div>
          `
        })
      });
      await supabase.from('emails_log').insert({
        entrenador_id: cliente.entrenador_id,
        cliente_id: pago.cliente_id,
        tipo: 'pago_vencido',
        email_destino: cliente.email,
        estado: emailRes.ok ? 'enviado' : 'error'
      });
      resultados.push({
        cliente: cliente.nombre,
        dias,
        ok: emailRes.ok
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      procesados: resultados.length,
      resultados
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});