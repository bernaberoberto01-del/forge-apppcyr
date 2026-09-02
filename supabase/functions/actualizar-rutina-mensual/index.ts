import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret' };

async function procesarCliente(cliente: any) {
  const hace30 = new Date(Date.now()-30*864e5).toISOString();
  const [{ data: checkins }, { data: sesiones }, { data: rutinaActual }, { data: marcas }] = await Promise.all([
    sb.from('checkins').select('*').eq('cliente_id', cliente.id).gte('fecha', hace30).order('fecha', { ascending: false }),
    sb.from('sesiones').select('fecha,completada').eq('cliente_id', cliente.id).gte('fecha', hace30).eq('completada', true),
    sb.from('rutinas').select('nombre,notas_entrenador').eq('cliente_id', cliente.id).eq('estado','publicada').order('created_at',{ascending:false}).limit(1).maybeSingle(),
    sb.from('marcas_cliente').select('ejercicio,valor').eq('cliente_id', cliente.id).order('fecha',{ascending:false}).limit(10),
  ]);

  if (!checkins || checkins.length < 1) return { skip: true, razon: 'sin_checkins' };

  // Escalas correctas: todo /5
  const avg = (f: string) => {
    const vals = (checkins as any[]).filter(c => c[f] != null).map(c => Number(c[f]));
    return vals.length ? vals.reduce((a:number,b:number)=>a+b,0)/vals.length : null;
  };

  const energia = avg('energia');
  const fatiga = avg('fatiga');
  const estres = avg('estres');
  const sueno = avg('sueno');
  const sesManual = avg('sesiones_semana');
  const sesPlani = avg('sesiones_planificadas');
  const adherencia = sesManual != null && sesPlani ? Math.round((sesManual/sesPlani)*100) : null;
  const pesoInicial = (checkins as any[])[checkins.length-1]?.peso;
  const pesoFinal = (checkins as any[])[0]?.peso;
  const cargaTextos = (checkins as any[]).map(c => c.cargas_sensacion).filter(Boolean);
  const logros = (checkins as any[]).map(c => c.logro_semana).filter(Boolean).slice(0,2);
  const comentarios = (checkins as any[]).map(c => c.comentario).filter(Boolean).slice(0,2);

  const ajustes: string[] = [];
  if (fatiga != null && fatiga >= 4) ajustes.push('reducir volumen 15% por fatiga acumulada');
  if (estres != null && estres >= 4) ajustes.push('bajar intensidad — estrés alto');
  if (energia != null && energia <= 2) ajustes.push('sesiones más cortas — energía muy baja');
  if (energia != null && energia >= 4 && fatiga != null && fatiga <= 2) ajustes.push('subir cargas — buena recuperación');
  if (adherencia != null && adherencia < 60) ajustes.push('revisar estructura — adherencia baja');
  if (cargaTextos.filter(c=>c==='muy_facil').length > checkins.length*0.5) ajustes.push('aumentar cargas — demasiado fáciles');
  if (cargaTextos.filter(c=>c==='muy_duro').length > checkins.length*0.4) ajustes.push('reducir cargas — demasiado duras');
  if (ajustes.length === 0) ajustes.push('mantener progresión — mes positivo');

  const ajustesTxt = ajustes.join('; ');
  const marcasTexto = (marcas||[]).slice(0,5).map((m:any)=>`${m.ejercicio}: ${m.valor}`).join(', ');

  const prompt = `Eres entrenador personal experto. Genera rutina mes siguiente con datos reales del cliente.

CLIENTE: ${cliente.nombre} | Objetivo: ${(cliente.objetivo||'').replace(/_/g,' ')} | Nivel: ${cliente.nivel||'principiante'} | Material: ${cliente.material||'gimnasio'} | Días/sem: ${cliente.dias_semana||3} | Lesiones: ${cliente.lesiones||'ninguna'}
${rutinaActual?.nombre ? `Rutina actual: ${rutinaActual.nombre}` : ''}

DATOS MES (${checkins.length} check-ins, ${sesiones?.length||0} sesiones completadas):
- Energía: ${energia!=null?energia.toFixed(1)+'/5':'?'} | Fatiga: ${fatiga!=null?fatiga.toFixed(1)+'/5':'?'} | Sueño: ${sueno!=null?sueno.toFixed(1)+'/5':'?'} | Estrés: ${estres!=null?estres.toFixed(1)+'/5':'?'}
- Adherencia: ${adherencia!=null?adherencia+'%':'sin datos'} | Cargas: ${cargaTextos.length?[...new Set(cargaTextos)].join('/'):'sin datos'}
- Peso: ${pesoInicial||'?'}→${pesoFinal||'?'}kg
${marcasTexto ? `- Marcas: ${marcasTexto}` : ''}
${logros.length ? `- Logros: ${logros.join(' | ')}` : ''}
${comentarios.length ? `- Comentarios: ${comentarios.join(' | ')}` : ''}

AJUSTES A APLICAR: ${ajustesTxt}

IMPORTANTE: Aplica los ajustes de forma concreta. Si la fatiga es alta, reduce series. Si las cargas son fáciles, sube reps o añade carga. Usa las marcas personales como referencia (85-90% de la mejor marca). Varía los ejercicios respecto al mes anterior para evitar monotonía.

JSON: {"nombre":"Rutina [mes] — [nombre]","descripcion":"[resumen ajustes]","ajustes_aplicados":"${ajustesTxt}","semanas":4,"dias":[{"dia":1,"nombre":"Día A — [patrón]","patron_principal":"[tipo]","ejercicios":[{"orden":1,"nombre":"[ejercicio]","patron":"[fuerza/cardio/core]","series":3,"reps":"8-10","descanso":"90s","notas":""}]}]}`;

  for (let intento = 0; intento < 2; intento++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
        system: 'Responde SOLO con JSON válido. Sin texto ni markdown.',
        messages: [{ role: 'user', content: prompt }] })
    });
    if (res.status === 429) { await new Promise(r=>setTimeout(r,2000)); continue; }
    if (!res.ok) return { skip: true, razon: 'api_error' };
    const aiData = await res.json();
    const texto = (aiData.content?.[0]?.text||'').trim();
    let rutina: any = null;
    try { rutina = JSON.parse(texto); } catch {}
    if (!rutina) { const m=texto.match(/\{[\s\S]*\}/); if(m) try { rutina=JSON.parse(m[0]); } catch {} }
    if (!rutina) return { skip: true, razon: 'parse_error' };

    await sb.from('rutinas').insert({
      cliente_id: cliente.id, entrenador_id: cliente.entrenador_id,
      nombre: rutina.nombre || `Rutina actualizada — ${cliente.nombre.split(' ')[0]}`,
      objetivo: cliente.objetivo, semanas: 4, dias_semana: cliente.dias_semana || 3,
      borrador: rutina, notas_entrenador: `Ajustes: ${ajustesTxt}`, estado: 'borrador'
    });
    await sb.from('alertas').insert({
      entrenador_id: cliente.entrenador_id, cliente_id: cliente.id, tipo: 'rutina_lista',
      mensaje: `🤖 Rutina de ${cliente.nombre.split(' ')[0]} lista — ${ajustesTxt}`
    });
    return { ok: true, ajustes: ajustes.length, checkins: checkins.length, ajustesTxt };
  }
  return { skip: true, razon: 'api_error' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const adminOk = req.headers.get('x-admin-secret') === (Deno.env.get('ADMIN_SECRET') || 'forge-admin-2024');
  let entrenadorId: string | null = null;
  if (!adminOk) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS });
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: CORS });
    entrenadorId = user.id;
  }
  try {
    const body = await req.json().catch(() => ({}));
    const clienteIdFiltro = body?.cliente_id || null;
    if (clienteIdFiltro) {
      const { data: cliente } = await sb.from('clientes').select('*').eq('id', clienteIdFiltro).eq('estado', 'activo').single();
      if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: CORS });
      if (entrenadorId && cliente.entrenador_id !== entrenadorId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS });
      const resultado = await procesarCliente(cliente);
      if (resultado.skip) return new Response(JSON.stringify({ ok: false, razon: resultado.razon }), { headers: CORS });
      return new Response(JSON.stringify({ ok: true, generadas: 1, ajustes: resultado.ajustesTxt }), { headers: CORS });
    }
    let query = sb.from('clientes').select('*').eq('estado', 'activo');
    if (entrenadorId) query = query.eq('entrenador_id', entrenadorId);
    const { data: clientes } = await query;
    const resultados: any[] = [];
    for (const cliente of clientes || []) {
      const r = await procesarCliente(cliente);
      if (!r.skip) resultados.push({ cliente: cliente.nombre, ...r });
    }
    return new Response(JSON.stringify({ ok: true, procesados: resultados.length, resultados }), { headers: CORS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
});
