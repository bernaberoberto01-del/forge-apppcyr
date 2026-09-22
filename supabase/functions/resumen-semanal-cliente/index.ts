import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const hace7 = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0]
    // Solo clientes del entrenador real (no demo)
    const { data: clientes } = await sb.from('clientes').select('*').eq('estado', 'activo')
    const enviados: any[] = []

    for (const cliente of clientes || []) {
      const [{ data: checkins }, { data: sesiones }, { data: marcas }, { data: cfg }] = await Promise.all([
        sb.from('checkins').select('*').eq('cliente_id', cliente.id).gte('fecha', hace7).order('fecha', { ascending: false }),
        sb.from('sesiones').select('*').eq('cliente_id', cliente.id).gte('fecha', hace7).eq('completada', true),
        sb.from('marcas_cliente').select('*').eq('cliente_id', cliente.id).gte('fecha', hace7).order('peso_kg', { ascending: false }),
        sb.from('configuracion').select('nombre_entrenador').eq('entrenador_id', cliente.entrenador_id).maybeSingle(),
      ])

      if (!checkins?.length && !sesiones?.length && !marcas?.length) continue

      const nombre = cliente.nombre.split(' ')[0]
      const nombreEntrenador = cfg?.nombre_entrenador || 'Tu entrenador'
      const ci = checkins?.[0]
      const numSesiones = sesiones?.length || 0
      const mejorMarca = marcas?.[0]

      const datos = [
        ci?.peso ? `Peso: ${ci.peso}kg` : null,
        ci?.energia ? `Energía: ${ci.energia}/10` : null,
        ci?.adherencia_entreno ? `Adherencia: ${ci.adherencia_entreno}/10` : null,
        numSesiones > 0 ? `Sesiones: ${numSesiones}` : null,
        mejorMarca ? `Marca: ${mejorMarca.ejercicio} ${mejorMarca.peso_kg}kg` : null,
      ].filter(Boolean).join(' | ')

      const objetivo = (cliente.objetivo || '').replace(/_/g, ' ')
      const prompt = `Eres el entrenador ${nombreEntrenador}. Resumen semanal para ${nombre}. Objetivo: ${objetivo}. Datos: ${datos || 'sin datos esta semana'}. Escribe 4-5 líneas motivadoras, cercanas, con datos concretos. Firma como ${nombreEntrenador}. Solo el mensaje.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200,
          system: 'Entrenador personal. Solo el mensaje, sin explicaciones.',
          messages: [{ role: 'user', content: prompt }] })
      })

      const aiData = await res.json()
      const mensaje = aiData.content?.[0]?.text?.trim()
      if (!mensaje) continue

      await sb.from('mensajes_cliente').insert({
        entrenador_id: cliente.entrenador_id, cliente_id: cliente.id,
        contenido: mensaje, tipo: 'borrador_ia', leido: true, leido_entrenador: true
      })

      await sb.from('alertas').insert({
        entrenador_id: cliente.entrenador_id, cliente_id: cliente.id,
        tipo: 'resumen_listo', mensaje: `Resumen semanal de ${nombre} listo para revisar`
      })

      enviados.push({ cliente: cliente.nombre })
    }

    return new Response(JSON.stringify({ ok: true, enviados: enviados.length, detalle: enviados }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
