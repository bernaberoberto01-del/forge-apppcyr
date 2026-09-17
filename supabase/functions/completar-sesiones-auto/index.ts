import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const ahora = new Date()
    const hoy = ahora.toISOString().split('T')[0]

    const { data: sesiones, error } = await sb.from('sesiones')
      .select('id, fecha, hora, duracion_minutos, cliente_id, entrenador_id, tipo')
      .eq('completada', false).eq('cancelada', false)
      .lte('fecha', hoy).not('cliente_id', 'is', null)

    if (error) throw error
    if (!sesiones?.length) return new Response(JSON.stringify({ ok: true, completadas: 0 }), { headers: CORS })

    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes()
    const aCompletar = sesiones.filter(s => {
      if (s.fecha < hoy) return true
      if (!s.hora) return true
      const [h, m] = s.hora.split(':').map(Number)
      const duracion = s.duracion_minutos || 60
      return ahoraMin >= h * 60 + m + duracion
    })

    if (!aCompletar.length) return new Response(JSON.stringify({ ok: true, completadas: 0 }), { headers: CORS })

    const idsPresencial = aCompletar.filter(s => s.tipo === 'presencial').map(s => s.id)
    const idsOtros = aCompletar.filter(s => s.tipo !== 'presencial').map(s => s.id)
    if (idsPresencial.length) await sb.from('sesiones').update({ completada: true, valoracion_pendiente: true }).in('id', idsPresencial)
    if (idsOtros.length) await sb.from('sesiones').update({ completada: true }).in('id', idsOtros)

    return new Response(JSON.stringify({ ok: true, completadas: aCompletar.length }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
