import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const adminSecret = req.headers.get('x-admin-secret');
  const isAdmin = adminSecret === (Deno.env.get('ADMIN_SECRET') || 'forge-admin-2024');
  let entrenadorFiltro = null;

  if (!isAdmin) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: CORS });
    entrenadorFiltro = user.id;
  }

  try {
    const hace14 = new Date(Date.now() - 14 * 86400000).toISOString();
    const hace30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const hace7 = new Date(Date.now() - 7 * 86400000).toISOString();

    let query = supabase.from('clientes').select('id, nombre, entrenador_id, tipo, estado, plan_activo').eq('estado', 'activo');
    if (entrenadorFiltro) query = query.eq('entrenador_id', entrenadorFiltro);
    const { data: clientes } = await query;

    let alertasCreadas = 0;

    for (const cliente of (clientes || [])) {
      const { data: checkins } = await supabase.from('checkins').select('*').eq('cliente_id', cliente.id).gte('fecha', hace30).order('fecha', { ascending: false });

      if (checkins && checkins.length >= 2) {
        const ultimos2 = checkins.slice(0, 2);
        // Umbrales en escala 1-5: fatiga y estres alertan en >= 4, energia en <= 2
        const fatigaAlta = ultimos2.every((c)=>c.estres >= 4 || c.energia <= 2 || c.fatiga >= 4);
        if (fatigaAlta) {
          const yaExiste = await supabase.from('alertas').select('id').eq('cliente_id', cliente.id).eq('tipo', 'fatiga_alta').gte('created_at', hace14).single();
          if (!yaExiste.data) {
            await supabase.from('alertas').insert({ entrenador_id: cliente.entrenador_id, cliente_id: cliente.id, tipo: 'fatiga_alta', mensaje: `${cliente.nombre.split(' ')[0]} lleva 2 semanas con fatiga alta o energía muy baja. Considera reducir la carga esta semana.` });
            alertasCreadas++;
          }
        }

        const sinCheckin = !checkins.some(c => new Date(c.fecha) >= new Date(hace7));
        if (sinCheckin && cliente.tipo === 'online') {
          const yaExiste = await supabase.from('alertas').select('id').eq('cliente_id', cliente.id).eq('tipo', 'sin_checkin').gte('created_at', hace7).single();
          if (!yaExiste.data) {
            await supabase.from('alertas').insert({ entrenador_id: cliente.entrenador_id, cliente_id: cliente.id, tipo: 'sin_checkin', mensaje: `${cliente.nombre.split(' ')[0]} no ha enviado el check-in esta semana.` });
            alertasCreadas++;
          }
        }
      }

      if (cliente.tipo === 'online' && cliente.plan_activo) {
        const { data: pagos } = await supabase.from('pagos').select('valido_hasta').eq('cliente_id', cliente.id).order('valido_hasta', { ascending: false }).limit(1);
        if (pagos && pagos[0]) {
          const vencimiento = new Date(pagos[0].valido_hasta);
          const hoy = new Date();
          const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / 86400000);
          if (diasRestantes <= 5 && diasRestantes >= 0) {
            const yaExiste = await supabase.from('alertas').select('id').eq('cliente_id', cliente.id).eq('tipo', 'pago_vencido').gte('created_at', hace7).single();
            if (!yaExiste.data) {
              await supabase.from('alertas').insert({ entrenador_id: cliente.entrenador_id, cliente_id: cliente.id, tipo: 'pago_vencido', mensaje: `El plan de ${cliente.nombre.split(' ')[0]} vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}. Recuérdale renovar.` });
              alertasCreadas++;
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, alertasCreadas }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
});
