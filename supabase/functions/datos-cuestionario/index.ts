import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const url = new URL(req.url)
    const clienteId = url.searchParams.get('cliente_id')
    const entrenadorId = url.searchParams.get('entrenador_id')

    if (!clienteId || !entrenadorId) {
      return new Response(JSON.stringify({ error: 'Parámetros requeridos' }), { status: 400, headers: CORS })
    }

    // Verificar que el cliente pertenece a ese entrenador antes de devolver datos
    const { data: cliente } = await sb.from('clientes')
      .select('nombre, peso_actual, objetivo, lesiones, nivel, dias_semana')
      .eq('id', clienteId)
      .eq('entrenador_id', entrenadorId)
      .single()

    if (!cliente) {
      return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404, headers: CORS })
    }

    // Datos del cuestionario de registro (altura, edad, sexo)
    const { data: reg } = await sb.from('cuestionarios')
      .select('altura, edad, sexo')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle()

    // Cuestionario de nutrición anterior
    const { data: cuest } = await sb.from('cuestionarios_nutricion')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle()

    // Solo devolver lo necesario para precargar — sin datos sensibles innecesarios
    return new Response(JSON.stringify({
      nombre: cliente.nombre,
      peso_actual: cliente.peso_actual,
      objetivo: cliente.objetivo,
      altura: reg?.altura || null,
      edad: reg?.edad || null,
      sexo: reg?.sexo || null,
      cuestionario_previo: cuest ? {
        objetivo: cuest.objetivo,
        nivel_actividad: cuest.nivel_actividad,
        velocidad_progreso: cuest.velocidad_progreso,
        comidas_dia: cuest.comidas_dia,
        tiempo_cocina: cuest.tiempo_cocina,
        tipo_dieta: cuest.tipo_dieta,
        entrena_cuando: cuest.entrena_cuando,
        alergias: cuest.alergias,
        alimentos_no_gustan: cuest.alimentos_no_gustan,
        alimentos_favoritos: cuest.alimentos_favoritos,
        suplementos: cuest.suplementos,
        notas: cuest.notas,
      } : null
    }), { headers: CORS })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
