import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { cliente_id, entrenador_id } = await req.json()
    if (!cliente_id || !entrenador_id) return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400, headers: cors })
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    const [{ data: cliente }, { data: cuest }] = await Promise.all([
      supabase.from('clientes').select('nombre, email').eq('id', cliente_id).single(),
      supabase.from('cuestionarios_nutricion').select('objetivo, tipo_dieta').eq('cliente_id', cliente_id).order('created_at', { ascending: false }).limit(1).single(),
    ])
    if (!cliente || !cuest) return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404, headers: cors })
    await supabase.from('notificaciones_admin').insert({ entrenador_id, cliente_id, tipo: 'cuestionario_nutricion', titulo: 'Nuevo cuestionario de ' + cliente.nombre?.trim(), descripcion: cliente.nombre?.trim() + ' ha enviado su cuestionario. Objetivo: ' + (cuest.objetivo || '—'), leida: false, url_destino: '/clientes?highlight=' + cliente_id })
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
