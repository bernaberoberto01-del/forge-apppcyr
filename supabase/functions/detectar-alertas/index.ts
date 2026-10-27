import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const adminSecret = req.headers.get('x-admin-secret');
  const expectedAdminSecret = Deno.env.get('ADMIN_SECRET');
  const isAdmin = !!expectedAdminSecret && adminSecret === expectedAdminSecret;
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
    const hoy = new Date().toISOString().split('T')[0];

    let query = supabase.from('clientes').select('id, nombre, entrenador_id, tipo, estado, plan_activo').eq('estado', 'activo');
    if (entrenadorFiltro) query = query.eq('entrenador_id', entrenadorFiltro);
    const { data: clientes } = await query;

    let alertasCreadas = 0;
    let inactivados = 0;

    for (const cliente of (clientes || [])) {

      // ── PASO 1: clientes online — comprobar si llevan >30 días sin pago válido ──
      // Solo aplica a online. Presencial no tiene pagos en Stripe en Forge.
      if (cliente.tipo === 'online') {
        const { data: ultimoPago } = await supabase
          .from('pagos')
          .select('valido_hasta, fecha_pago')
          .eq('cliente_id', cliente.id)
          .order('valido_hasta', { ascending: false })
          .limit(1);

        const tienePagoActivo = ultimoPago?.[0]?.valido_hasta >= hoy;
        const ultimaFechaPago = ultimoPago?.[0]?.fecha_pago || null;
        const diasSinPago = ultimaFechaPago
          ? Math.ceil((Date.now() - new Date(ultimaFechaPago).getTime()) / 86400000)
          : null;

        // Sin ningún pago registrado o el último venció hace más de 30 días → inactivar
        const debeInactivar = !ultimoPago?.length || (diasSinPago !== null && diasSinPago > 30 && !tienePagoActivo);

        if (debeInactivar) {
          // Marcar como inactivo para que deje de recibir alertas, check-ins, etc.
          await supabase.from('clientes').update({ estado: 'inactivo' }).eq('id', cliente.id);
          inactivados++;

          // Alerta al entrenador (esta SÍ se crea — es para que Roberto sepa)
          const yaExisteAlerta = await supabase
            .from('alertas')
            .select('id')
            .eq('cliente_id', cliente.id)
            .eq('tipo', 'pago_pendiente')
            .gte('created_at', hace30)
            .single();

          if (!yaExisteAlerta.data) {
            const msgDias = diasSinPago !== null
              ? `Lleva ${diasSinPago} días sin pago registrado.`
              : 'No tiene ningún pago registrado.';
            await supabase.from('alertas').insert({
              entrenador_id: cliente.entrenador_id,
              cliente_id: cliente.id,
              tipo: 'pago_pendiente',
              mensaje: `${cliente.nombre.split(' ')[0]} ha pasado a inactivo. ${msgDias} Contacta para renovar su plan.`,
            });
            alertasCreadas++;
          }

          // No generar más alertas (fatiga, sin_checkin…) para este cliente inactivo
          continue;
        }
      }

      // ── PASO 2: alertas de seguimiento normales (solo clientes activos con pago vigente) ──
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
          const diasRestantes = Math.ceil((vencimiento.getTime() - Date.now()) / 86400000);
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

    return new Response(JSON.stringify({ ok: true, alertasCreadas, inactivados }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
});
