import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async (req)=>{
  if (!ADMIN_SECRET || req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const headers = {
    'Content-Type': 'application/json'
  };
  try {
    const { data: clientes } = await supabase.from('clientes').select('id,nombre,entrenador_id').eq('estado', 'activo');
    const alertasCreadas = [];
    const hoy = new Date();
    const hace14 = new Date(hoy.getTime() - 14 * 86400000).toISOString();
    const hace10 = new Date(hoy.getTime() - 10 * 86400000).toISOString();
    for (const cliente of clientes || []){
      // Obtener ultimos 2 checkins
      const { data: checkins } = await supabase.from('checkins').select('*').eq('cliente_id', cliente.id).order('fecha', {
        ascending: false
      }).limit(4);
      if (!checkins?.length) continue;
      // ALERTA 1: Fatiga/estres alto 2 semanas seguidas
      const ultimos2 = checkins.slice(0, 2);
      if (ultimos2.length === 2) {
        const fatigaAlta = ultimos2.every((c)=>c.estres >= 4 || c.energia <= 3 || c.fatiga >= 4);
        if (fatigaAlta) {
          const yaExiste = await supabase.from('alertas').select('id').eq('cliente_id', cliente.id).eq('tipo', 'fatiga_alta').gte('created_at', hace14).single();
          if (!yaExiste.data) {
            await supabase.from('alertas').insert({
              entrenador_id: cliente.entrenador_id,
              cliente_id: cliente.id,
              tipo: 'fatiga_alta',
              mensaje: `${cliente.nombre} lleva 2 semanas con fatiga alta. Considera reducir volumen de entrenamiento.`
            });
            alertasCreadas.push({
              cliente: cliente.nombre,
              tipo: 'fatiga_alta'
            });
          }
        }
      }
      // ALERTA 2: Sin checkin en 10 dias
      const ultimo = checkins[0];
      if (ultimo && new Date(ultimo.fecha) < new Date(hace10)) {
        const yaExiste = await supabase.from('alertas').select('id').eq('cliente_id', cliente.id).eq('tipo', 'abandono').gte('created_at', hace10).single();
        if (!yaExiste.data) {
          await supabase.from('alertas').insert({
            entrenador_id: cliente.entrenador_id,
            cliente_id: cliente.id,
            tipo: 'abandono',
            mensaje: `${cliente.nombre} lleva mas de 10 dias sin responder el seguimiento. Contacta con el/ella.`
          });
          alertasCreadas.push({
            cliente: cliente.nombre,
            tipo: 'abandono'
          });
        }
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      alertas: alertasCreadas.length,
      detalle: alertasCreadas
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