import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret' };

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Enviar push si el cliente tiene suscripción activa */
async function enviarPush(clienteId: string, titulo: string, cuerpo: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/enviar-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ cliente_id: clienteId, tipo: 'general', titulo, cuerpo, url: '/portal' }),
    })
  } catch (_) { /* silencioso — push es best-effort */ }
}

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
    const ahora = Date.now()
    const hace7  = new Date(ahora - 7  * 86400000).toISOString();
    const hace14 = new Date(ahora - 14 * 86400000).toISOString();
    const hace21 = new Date(ahora - 21 * 86400000).toISOString();
    const hace30 = new Date(ahora - 30 * 86400000).toISOString();

    let query = supabase.from('clientes').select('id, nombre, entrenador_id, tipo, estado, plan_activo').eq('estado', 'activo');
    if (entrenadorFiltro) query = query.eq('entrenador_id', entrenadorFiltro);
    const { data: clientes } = await query;

    let alertasCreadas = 0;
    let mensajesInactividad = 0;

    for (const cliente of (clientes || [])) {

      // ─── 1. ALERTA FATIGA ALTA ──────────────────────────────────────────────
      const { data: checkins } = await supabase.from('checkins').select('*').eq('cliente_id', cliente.id).gte('fecha', hace30).order('fecha', { ascending: false });

      if (checkins && checkins.length >= 2) {
        const ultimos2 = checkins.slice(0, 2);
        const fatigaAlta = ultimos2.every((c)=>c.estres >= 4 || c.energia <= 2 || c.fatiga >= 4);
        if (fatigaAlta) {
          const yaExiste = await supabase.from('alertas').select('id').eq('cliente_id', cliente.id).eq('tipo', 'fatiga_alta').gte('created_at', hace14).single();
          if (!yaExiste.data) {
            await supabase.from('alertas').insert({ entrenador_id: cliente.entrenador_id, cliente_id: cliente.id, tipo: 'fatiga_alta', mensaje: `${cliente.nombre.split(' ')[0]} lleva 2 semanas con fatiga alta o energía muy baja. Considera reducir la carga esta semana.` });
            alertasCreadas++;
          }
        }
      }

      // ─── 2. ALERTA SIN CHECK-IN (semanal, clientes online) ─────────────────
      if (cliente.tipo === 'online') {
        const ultimoCheckin = checkins?.[0]
        const sinCheckin = !ultimoCheckin || new Date(ultimoCheckin.fecha) < new Date(hace7);
        if (sinCheckin) {
          const yaExiste = await supabase.from('alertas').select('id').eq('cliente_id', cliente.id).eq('tipo', 'sin_checkin').gte('created_at', hace7).single();
          if (!yaExiste.data) {
            await supabase.from('alertas').insert({ entrenador_id: cliente.entrenador_id, cliente_id: cliente.id, tipo: 'sin_checkin', mensaje: `${cliente.nombre.split(' ')[0]} no ha enviado el check-in esta semana.` });
            alertasCreadas++;
          }
        }
      }

      // ─── 3. ALERTA PAGO VENCIDO ─────────────────────────────────────────────
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

      // ─── 4. INACTIVIDAD ESCALADA ─────────────────────────────────────────────
      // Calcular última actividad real: última sesión completada, checkin, o mensaje del cliente
      const { data: ultimaSesion } = await supabase
        .from('sesiones')
        .select('fecha')
        .eq('cliente_id', cliente.id)
        .eq('completada', true)
        .order('fecha', { ascending: false })
        .limit(1)

      const { data: ultimoMensaje } = await supabase
        .from('mensajes_cliente')
        .select('created_at')
        .eq('cliente_id', cliente.id)
        .eq('tipo', 'cliente')
        .order('created_at', { ascending: false })
        .limit(1)

      const { data: ultimoAcceso } = await supabase
        .from('actividad_cliente')
        .select('created_at')
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false })
        .limit(1)

      // La última actividad es la más reciente entre sesión, check-in, mensaje y acceso
      const fechas = [
        ultimaSesion?.[0]?.fecha,
        checkins?.[0]?.fecha,
        ultimoMensaje?.[0]?.created_at,
        ultimoAcceso?.[0]?.created_at,
      ].filter(Boolean).map(f => new Date(f).getTime())

      if (fechas.length === 0) continue // Cliente sin ninguna actividad registrada

      const ultimaActividad = Math.max(...fechas)
      const diasInactivo = Math.floor((ahora - ultimaActividad) / 86400000)

      const primerNombre = cliente.nombre.split(' ')[0]

      // 7 días → mensaje al cliente en el portal
      if (diasInactivo >= 7 && diasInactivo < 14) {
        const { data: msgExiste } = await supabase
          .from('mensajes_cliente')
          .select('id')
          .eq('cliente_id', cliente.id)
          .eq('tipo', 'sistema')
          .ilike('contenido', '%7 días%')
          .gte('created_at', hace14)
          .maybeSingle()

        if (!msgExiste) {
          await supabase.from('mensajes_cliente').insert({
            cliente_id: cliente.id,
            entrenador_id: cliente.entrenador_id,
            contenido: `¡Hola ${primerNombre}! 👋 Hace unos días que no te veo por aquí. ¿Todo bien?\n\nRecuerda que estoy aquí para ayudarte. Si tienes alguna duda o quieres ajustar el plan, escríbeme. ¡Ánimo!`,
            tipo: 'sistema',
            leido: false,
            leido_entrenador: true,
          })
          await enviarPush(cliente.id, '👋 ¡Te echamos de menos!', `${primerNombre}, hace una semana que no entras. ¿Todo bien?`)
          mensajesInactividad++
          console.log(`[detectar-alertas] Inactividad 7d → mensaje a ${cliente.nombre}`)
        }
      }

      // 14 días → recordatorio más directo al cliente
      if (diasInactivo >= 14 && diasInactivo < 21) {
        const { data: msgExiste } = await supabase
          .from('mensajes_cliente')
          .select('id')
          .eq('cliente_id', cliente.id)
          .eq('tipo', 'sistema')
          .ilike('contenido', '%14 días%')
          .gte('created_at', hace21)
          .maybeSingle()

        if (!msgExiste) {
          await supabase.from('mensajes_cliente').insert({
            cliente_id: cliente.id,
            entrenador_id: cliente.entrenador_id,
            contenido: `${primerNombre}, llevamos 2 semanas sin contacto 🤔\n\nSé que a veces cuesta mantener la constancia, pero para eso estoy yo. Dime cómo estás y ajustamos el plan a tu situación actual. No pierdas el trabajo que ya has hecho — ¡seguimos!`,
            tipo: 'sistema',
            leido: false,
            leido_entrenador: true,
          })
          await enviarPush(cliente.id, '💪 No pierdas el ritmo', `${primerNombre}, llevamos 2 semanas. ¡Escríbeme y seguimos!`)
          mensajesInactividad++
          console.log(`[detectar-alertas] Inactividad 14d → mensaje a ${cliente.nombre}`)
        }
      }

      // 21 días → mensaje al cliente + alerta al entrenador
      if (diasInactivo >= 21 && diasInactivo < 30) {
        const { data: msgExiste } = await supabase
          .from('mensajes_cliente')
          .select('id')
          .eq('cliente_id', cliente.id)
          .eq('tipo', 'sistema')
          .ilike('contenido', '%3 semanas%')
          .gte('created_at', hace30)
          .maybeSingle()

        if (!msgExiste) {
          // Mensaje al cliente
          await supabase.from('mensajes_cliente').insert({
            cliente_id: cliente.id,
            entrenador_id: cliente.entrenador_id,
            contenido: `${primerNombre}, han pasado 3 semanas. Me preocupa no saber de ti 🙏\n\nCualquier cosa que necesites — un cambio de plan, más flexibilidad en los horarios, o simplemente hablar — estoy aquí. Escríbeme cuando puedas.`,
            tipo: 'sistema',
            leido: false,
            leido_entrenador: true,
          })
          await enviarPush(cliente.id, '🙏 ¿Cómo estás?', `${primerNombre}, llevamos 3 semanas. Escríbeme cuando puedas.`)

          // Alerta al entrenador
          const { data: alertaExiste } = await supabase
            .from('alertas')
            .select('id')
            .eq('cliente_id', cliente.id)
            .eq('tipo', 'inactividad_21d')
            .gte('created_at', hace30)
            .maybeSingle()

          if (!alertaExiste) {
            await supabase.from('alertas').insert({
              entrenador_id: cliente.entrenador_id,
              cliente_id: cliente.id,
              tipo: 'inactividad_21d',
              mensaje: `${cliente.nombre} lleva 21 días sin actividad en el portal. Se ha enviado un mensaje automático. Considera contactarle directamente.`,
            })
            alertasCreadas++
          }

          mensajesInactividad++
          console.log(`[detectar-alertas] Inactividad 21d → mensaje + alerta para ${cliente.nombre}`)
        }
      }

      // 30 días → alerta crítica al entrenador (cliente posiblemente perdido)
      if (diasInactivo >= 30) {
        const { data: alertaExiste } = await supabase
          .from('alertas')
          .select('id')
          .eq('cliente_id', cliente.id)
          .eq('tipo', 'inactividad_30d')
          .gte('created_at', hace30)
          .maybeSingle()

        if (!alertaExiste) {
          await supabase.from('alertas').insert({
            entrenador_id: cliente.entrenador_id,
            cliente_id: cliente.id,
            tipo: 'inactividad_30d',
            mensaje: `⚠️ ${cliente.nombre} lleva más de 30 días sin actividad. Cliente posiblemente perdido. Contacta directamente para saber su situación.`,
          })
          alertasCreadas++
          console.log(`[detectar-alertas] Inactividad 30d → alerta crítica para ${cliente.nombre}`)
        }
      }

    } // fin for clientes

    return new Response(JSON.stringify({ ok: true, alertasCreadas, mensajesInactividad }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
});
