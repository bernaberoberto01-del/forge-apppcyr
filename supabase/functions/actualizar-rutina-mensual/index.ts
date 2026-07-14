import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
Deno.serve(async (req)=>{
  if (!ADMIN_SECRET || req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const headers = {
    'Content-Type': 'application/json'
  };
  try {
    const hace30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: clientes } = await supabase.from('clientes').select('*').eq('estado', 'activo');
    const resultados = [];
    for (const cliente of clientes || []){
      const { data: checkins } = await supabase.from('checkins').select('*').eq('cliente_id', cliente.id).gte('fecha', hace30).order('fecha', {
        ascending: false
      });
      if (!checkins || checkins.length < 2) continue;
      const { data: sesiones } = await supabase.from('sesiones').select('*').eq('cliente_id', cliente.id).gte('fecha', hace30);
      const { data: rutinaActual } = await supabase.from('rutinas').select('*').eq('cliente_id', cliente.id).eq('estado', 'publicada').order('created_at', {
        ascending: false
      }).limit(1);
      const energiaMedia = (checkins.reduce((s, c)=>s + (c.energia || 5), 0) / checkins.length).toFixed(1);
      const estresMedia = (checkins.reduce((s, c)=>s + (c.estres || 2), 0) / checkins.length).toFixed(1);
      const fatigaMedia = (checkins.reduce((s, c)=>s + (c.fatiga || 2), 0) / checkins.length).toFixed(1);
      const adherenciaMedia = (checkins.reduce((s, c)=>s + (c.adherencia_entreno || 7), 0) / checkins.length).toFixed(1);
      const motivacionMedia = (checkins.reduce((s, c)=>s + (c.motivacion || 5), 0) / checkins.length).toFixed(1);
      const pesoInicial = checkins[checkins.length - 1]?.peso;
      const pesoFinal = checkins[0]?.peso;
      const ajustes = [];
      if (Number(fatigaMedia) >= 3.5) ajustes.push('reducir volumen un 15-20% por fatiga acumulada');
      if (Number(estresMedia) >= 3.5) ajustes.push('reducir intensidad por estres alto');
      if (Number(energiaMedia) <= 4) ajustes.push('sesiones mas cortas y menos densas');
      if (Number(adherenciaMedia) >= 8 && Number(energiaMedia) >= 7) ajustes.push('aumentar volumen o intensidad, el cliente responde bien');
      if (Number(motivacionMedia) <= 3) ajustes.push('variar ejercicios para aumentar motivacion');
      const rutinaRef = rutinaActual?.[0]?.contenido || rutinaActual?.[0]?.borrador;
      const prompt = `Eres un entrenador personal experto. Genera la rutina del proximo mes para este cliente basandote en su progreso.

Cliente: ${cliente.nombre}
Objetivo: ${(cliente.objetivo || '').replace(/_/g, ' ')}
Nivel: ${cliente.nivel || 'principiante'}
Material: ${cliente.material || 'gimnasio'}
Dias semana: ${cliente.dias_semana || 3}
Lesiones: ${cliente.lesiones || 'ninguna'}

DATOS DEL MES:
- Sesiones completadas: ${sesiones?.length || 0} de ${(cliente.dias_semana || 3) * 4} posibles
- Peso inicio: ${pesoInicial || '?'}kg / Peso final: ${pesoFinal || '?'}kg
- Energia media: ${energiaMedia}/10
- Estres medio: ${estresMedia}/5
- Fatiga media: ${fatigaMedia}/5
- Adherencia entreno: ${adherenciaMedia}/10
- Motivacion media: ${motivacionMedia}/7

AJUSTES RECOMENDADOS: ${ajustes.length ? ajustes.join(', ') : 'mantener progresion normal'}

Responde SOLO con JSON:
{"nombre":"...","descripcion":"...","semanas":4,"ajustes_aplicados":"...","dias":[{"dia":1,"nombre":"Dia A","patron_principal":"...","ejercicios":[{"orden":1,"nombre":"...","patron":"...","series":3,"reps":"8-10","descanso":"90s","notas":"..."}]}]}`;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });
      const aiData = await res.json();
      const texto = aiData.content?.[0]?.text || '';
      let rutina;
      try {
        rutina = JSON.parse(texto);
      } catch  {
        const m = texto.match(/\{[\s\S]*\}/);
        rutina = m ? JSON.parse(m[0]) : null;
      }
      if (!rutina) continue;
      // Archivar rutina actual
      if (rutinaActual?.[0]) {
        await supabase.from('rutinas').update({
          estado: 'archivada'
        }).eq('id', rutinaActual[0].id);
      }
      // Guardar nueva como borrador
      await supabase.from('rutinas').insert({
        cliente_id: cliente.id,
        entrenador_id: cliente.entrenador_id,
        nombre: rutina.nombre || 'Rutina mes siguiente',
        objetivo: cliente.objetivo,
        semanas: 4,
        dias_semana: cliente.dias_semana || 3,
        borrador: rutina,
        notas_entrenador: rutina.ajustes_aplicados || '',
        estado: 'borrador'
      });
      // Crear alerta
      await supabase.from('alertas').insert({
        entrenador_id: cliente.entrenador_id,
        cliente_id: cliente.id,
        tipo: 'rutina_lista',
        mensaje: `Nueva rutina generada para ${cliente.nombre}. ${rutina.ajustes_aplicados || 'Revisa y publica cuando quieras.'}`
      });
      resultados.push({
        cliente: cliente.nombre,
        ajustes: ajustes.length
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      procesados: resultados.length,
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