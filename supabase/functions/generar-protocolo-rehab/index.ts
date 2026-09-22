import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: cors })
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: cors })
    const { lesion_id } = await req.json()
    const { data: lesion } = await supabase.from('lesiones_cliente').select('*, clientes(nombre, peso_actual, edad, objetivo)').eq('id', lesion_id).eq('entrenador_id', user.id).single()
    if (!lesion) return new Response(JSON.stringify({ error: 'Lesión no encontrada' }), { status: 404, headers: cors })
    const cliente = lesion.clientes
    const prompt = `Eres un fisioterapeuta y preparador físico experto. Genera un protocolo de recuperación para:\nCLIENTE: ${cliente?.nombre}, ${cliente?.edad || '?'} años, ${cliente?.peso_actual || '?'}kg\nZONA: ${lesion.zona}, SEVERIDAD: ${lesion.severidad}\nDESCRIPCIÓN: ${lesion.descripcion || 'Sin descripción'}\nLIMITACIONES: ${lesion.limitaciones || 'No especificadas'}\nMÉDICO: ${lesion.visito_medico ? 'Sí' : 'No'}, DIAGNÓSTICO: ${lesion.diagnostico_medico || 'Ninguno'}\nRECURRENTE: ${lesion.es_recurrente ? 'Sí' : 'No'}, OBJETIVO: ${cliente?.objetivo || 'General'}\n\nResponde SOLO con JSON:\n{"fase_actual":"","duracion_estimada":"","resumen":"","calentamiento_especifico":[{"ejercicio":"","series":2,"reps":"10","notas":""}],"ejercicios_rehab":[{"ejercicio":"","series":3,"reps":"12","notas":""}],"ejercicios_evitar":[],"ejercicios_adaptar":[{"original":"","alternativa":"","motivo":""}],"recomendaciones_generales":[],"señales_de_alarma":[],"progresion":""}`
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }) })
    const data = await res.json()
    let protocolo
    try { protocolo = JSON.parse(data.content?.[0]?.text || '') } catch { protocolo = { resumen: data.content?.[0]?.text, error_parse: true } }
    await supabase.from('lesiones_cliente').update({ protocolo_ia: protocolo, protocolo_generado: true, estado: 'en_seguimiento' }).eq('id', lesion_id)
    await supabase.from('mensajes_cliente').insert({ cliente_id: lesion.cliente_id, entrenador_id: user.id, contenido: '🩹 He revisado tu lesión en ' + lesion.zona + ' y he preparado un protocolo de recuperación. Lo verás en tu sección de Lesiones.', enviado_por: 'entrenador', leido_cliente: false })
    return new Response(JSON.stringify({ ok: true, protocolo }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors })
  }
})
