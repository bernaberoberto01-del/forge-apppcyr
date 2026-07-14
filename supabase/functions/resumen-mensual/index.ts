import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async (req)=>{
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret'
  };
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers
  });
  if (!ADMIN_SECRET || req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers });
  }
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  // Obtener todos los clientes activos
  const { data: clientes } = await supabase.from('clientes').select('*').eq('estado', 'activo');
  if (!clientes?.length) return new Response(JSON.stringify({
    ok: true,
    procesados: 0
  }), {
    headers
  });
  const hace30 = new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0];
  let procesados = 0;
  for (const cliente of clientes){
    try {
      // Cargar datos del mes
      const [{ data: checkins }, { data: sesiones }, { data: rutina }, { data: planNutr }] = await Promise.all([
        supabase.from('checkins').select('*').eq('cliente_id', cliente.id).gte('fecha', hace30).order('fecha', {
          ascending: false
        }),
        supabase.from('sesiones').select('*').eq('cliente_id', cliente.id).gte('fecha', hace30),
        supabase.from('rutinas').select('*').eq('cliente_id', cliente.id).eq('estado', 'publicada').order('created_at', {
          ascending: false
        }).limit(1).single(),
        supabase.from('planes_nutricion').select('*').eq('cliente_id', cliente.id).eq('estado', 'publicado').order('created_at', {
          ascending: false
        }).limit(1).single()
      ]);
      if (!checkins?.length && !sesiones?.length) continue;
      const mediaEnergia = checkins?.length ? (checkins.reduce((s, c)=>s + (c.energia || 0), 0) / checkins.length).toFixed(1) : null;
      const mediaFatiga = checkins?.length ? (checkins.reduce((s, c)=>s + (c.fatiga || 0), 0) / checkins.length).toFixed(1) : null;
      const mediaAdh = checkins?.length ? (checkins.reduce((s, c)=>s + (c.adherencia_entreno || 0), 0) / checkins.length).toFixed(1) : null;
      const pesoInicio = checkins?.[checkins.length - 1]?.peso;
      const pesoFin = checkins?.[0]?.peso;
      const cambioPeso = pesoInicio && pesoFin ? (pesoFin - pesoInicio).toFixed(1) : null;
      // Generar resumen con IA
      const prompt = `Genera un resumen mensual motivador y profesional para este cliente de entrenamiento personal.

Cliente: ${cliente.nombre}
Objetivo: ${(cliente.objetivo || '').replace(/_/g, ' ')}
Sesiones este mes: ${sesiones?.length || 0}
Check-ins completados: ${checkins?.length || 0}
${mediaEnergia ? `Energía media: ${mediaEnergia}/10` : ''}
${mediaFatiga ? `Fatiga media: ${mediaFatiga}/5` : ''}
${mediaAdh ? `Adherencia media: ${mediaAdh}/10` : ''}
${cambioPeso ? `Cambio de peso: ${cambioPeso}kg` : ''}
${checkins?.[0]?.comentario ? `Último comentario: ${checkins[0].comentario}` : ''}

Escribe un mensaje personal de 3-4 párrafos: 1) Reconocer el trabajo del mes con datos concretos, 2) Puntos de mejora detectados, 3) Ajustes para el próximo mes, 4) Frase motivadora final. Tono cercano, directo y profesional. Sin emojis excesivos.`;
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });
      const aiData = await aiRes.json();
      const resumen = aiData.content?.[0]?.text || '';
      // Guardar mensaje en portal
      if (resumen) {
        await supabase.from('mensajes_cliente').insert({
          entrenador_id: cliente.entrenador_id,
          cliente_id: cliente.id,
          contenido: `📊 RESUMEN MENSUAL\n\n${resumen}`,
          tipo: 'resumen_mensual',
          leido: false
        });
      }
      // Actualizar nutrición si tiene plan y hay checkins
      if (planNutr?.data && checkins?.length >= 2) {
        const nutriPrompt = `Ajusta brevemente el plan nutricional de este cliente basándote en sus datos del último mes.

Plan actual: ${planNutr.data.calorias_dia}kcal, P:${planNutr.data.proteinas_g}g, C:${planNutr.data.carbohidratos_g}g, G:${planNutr.data.grasas_g}g
Sesiones: ${sesiones?.length || 0}/mes
Energía media: ${mediaEnergia}/10
Fatiga media: ${mediaFatiga}/5
Adherencia: ${mediaAdh}/10
${cambioPeso ? `Cambio peso: ${cambioPeso}kg` : ''}

Responde SOLO con JSON: {"calorias_dia":0,"proteinas_g":0,"carbohidratos_g":0,"grasas_g":0,"ajuste_razon":"explicacion breve"}`;
        const nutriRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 300,
            system: 'Responde SOLO con JSON válido.',
            messages: [
              {
                role: 'user',
                content: nutriPrompt
              }
            ]
          })
        });
        const nutriData = await nutriRes.json();
        try {
          const texto = (nutriData.content?.[0]?.text || '').trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const ajuste = JSON.parse(texto);
          if (ajuste.calorias_dia) {
            await supabase.from('planes_nutricion').update({
              calorias_dia: ajuste.calorias_dia,
              proteinas_g: ajuste.proteinas_g,
              carbohidratos_g: ajuste.carbohidratos_g,
              grasas_g: ajuste.grasas_g,
              notas_entrenador: `Ajuste automático ${new Date().toLocaleDateString('es-ES')}: ${ajuste.ajuste_razon}`,
              updated_at: new Date().toISOString()
            }).eq('id', planNutr.data.id);
          }
        } catch  {}
      }
      // Enviar email si tiene email
      if (cliente.email && resumen) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Forge Studio <noreply@forge-studio.es>',
            to: cliente.email,
            subject: `Tu resumen de este mes — ${new Date().toLocaleDateString('es-ES', {
              month: 'long',
              year: 'numeric'
            })}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="background:#111;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
                <h1 style="color:#FF5C00;margin:0;font-size:20px">📊 Tu resumen mensual</h1>
                <p style="color:rgba(255,255,255,0.5);margin:8px 0 0;font-size:14px">${new Date().toLocaleDateString('es-ES', {
              month: 'long',
              year: 'numeric'
            })}</p>
              </div>
              <div style="background:#fff;border:1px solid #eee;border-radius:12px;padding:20px">
                <p style="font-size:15px;color:#0A0A0A;line-height:1.6">${resumen.replace(/\n/g, '<br/>')}</p>
              </div>
              <p style="text-align:center;margin-top:16px">
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', '') || ''}forge-studio-os.vercel.app/portal/${cliente.id}" style="background:#FF5C00;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver mi portal →</a>
              </p>
            </div>`
          })
        });
      }
      procesados++;
    } catch (e) {
      console.error('Error cliente', cliente.id, e);
    }
  }
  return new Response(JSON.stringify({
    ok: true,
    procesados
  }), {
    headers
  });
});