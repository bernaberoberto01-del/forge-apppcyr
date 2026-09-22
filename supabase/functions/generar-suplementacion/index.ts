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
    const { cliente_id } = await req.json()
    const { data: cliente } = await supabase.from('clientes').select('nombre, peso_actual, peso_objetivo, objetivo, edad').eq('id', cliente_id).single()
    const { data: cuest } = await supabase.from('cuestionarios_nutricion').select('tipo_dieta, nivel_actividad, suplementos, objetivo, entrena_cuando').eq('cliente_id', cliente_id).order('created_at', { ascending: false }).limit(1).single()
    const { data: checkins } = await supabase.from('checkins').select('energia, fatiga').eq('cliente_id', cliente_id).order('fecha', { ascending: false }).limit(4)
    const energiaMedia = checkins?.filter(c => c.energia).length ? (checkins.filter(c => c.energia).reduce((s, c) => s + c.energia, 0) / checkins.filter(c => c.energia).length).toFixed(1) : null
    const fatigaMedia = checkins?.filter(c => c.fatiga).length ? (checkins.filter(c => c.fatiga).reduce((s, c) => s + c.fatiga, 0) / checkins.filter(c => c.fatiga).length).toFixed(1) : null
    const prompt = `Eres un nutricionista deportivo experto. Genera recomendaciones de suplementación personalizadas basadas en evidencia para:\nNombre: ${cliente?.nombre}, Peso: ${cliente?.peso_actual || '?'}kg, Objetivo: ${cliente?.objetivo || 'general'}, Edad: ${cliente?.edad || '?'} años\nDieta: ${cuest?.tipo_dieta || 'omnívora'}, Actividad: ${cuest?.nivel_actividad || 'moderado'}\nSupl. actuales: ${cuest?.suplementos || 'ninguno'}, Energía media: ${energiaMedia || '?'}/5, Fatiga media: ${fatigaMedia || '?'}/5\n\nResponde SOLO con JSON:\n{"recomendaciones":[{"nombre":"","categoria":"rendimiento","dosis":"","cuando":"","motivo":"","prioridad":"alta","evidencia":"","notas":""}],"nota_general":"","actualizar_en":""}\nCategorías: rendimiento|recuperación|salud|bienestar. Prioridad: alta|media|baja. Entre 4 y 8 suplementos. Sin marcas.`
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }) })
    const data = await res.json()
    let resultado
    try { resultado = JSON.parse(data.content?.[0]?.text || '') } catch { return new Response(JSON.stringify({ error: 'Error parsear IA' }), { status: 500, headers: cors }) }
    await supabase.from('suplementacion_cliente').upsert({ cliente_id, entrenador_id: user.id, recomendaciones: resultado.recomendaciones || [], generado_en: new Date().toISOString(), actualizado_en: new Date().toISOString(), basado_en: { peso: cliente?.peso_actual, objetivo: cliente?.objetivo, tipo_dieta: cuest?.tipo_dieta, energia_media: energiaMedia, nota_general: resultado.nota_general, actualizar_en: resultado.actualizar_en } }, { onConflict: 'cliente_id' })
    return new Response(JSON.stringify({ ok: true, resultado }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors })
  }
})
