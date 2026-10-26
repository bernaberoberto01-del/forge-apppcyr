import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TRADUCCIONES: Record<string, string> = {
  'sentadilla': 'squat',
  'peso muerto': 'deadlift',
  'press banca': 'bench press',
  'press de banca': 'bench press',
  'press militar': 'overhead press',
  'dominadas': 'pull ups',
  'fondos': 'dips',
  'remo': 'row',
  'extensión': 'extension',
  'extension': 'extension',
  'plancha': 'plank',
  'zancada': 'lunge',
  'hip thrust': 'hip thrust',
  'jalon': 'lat pulldown',
  'jalón': 'lat pulldown',
  'prensa': 'leg press',
  'abdominales': 'abs',
  'burpee': 'burpee',
  'mancuerna': 'dumbbell',
  'barra': 'barbell',
  'cable': 'cable',
  'polea': 'cable machine',
  'goma': 'resistance band',
  'banda elástica': 'resistance band',
  'curl': 'curl',
  'press francés': 'skull crusher',
  'hip hinge': 'hip hinge',
  'rdl': 'romanian deadlift',
  'goblet': 'goblet squat',
}

function construirQuery(nombre: string): string {
  const lower = nombre.toLowerCase()
  for (const [es, en] of Object.entries(TRADUCCIONES)) {
    if (lower.includes(es)) {
      return `${nombre} ${en} exercise tutorial`
    }
  }
  return `${nombre} ejercicio tutorial técnica correcta`
}

async function buscarVideo(nombre: string, apiKey: string): Promise<{ video_id: string; youtube_url: string } | null> {
  const intentos = [
    { q: construirQuery(nombre), soloCortos: true },
    { q: `${nombre} ejercicio`, soloCortos: false },
  ]

  for (const { q, soloCortos } of intentos) {
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('q', q)
    url.searchParams.set('type', 'video')
    url.searchParams.set('maxResults', '3')
    if (soloCortos) url.searchParams.set('videoDuration', 'short')
    url.searchParams.set('relevanceLanguage', 'es')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString())
    if (!res.ok) {
      const txt = await res.text()
      if (res.status === 429) throw new Error('RATE_LIMIT_429')
      console.error(`YouTube error ${res.status}:`, txt)
      continue
    }

    const data = await res.json()
    const item = (data.items || []).find((i: any) => i.id?.videoId)
    if (item) {
      return {
        video_id: item.id.videoId,
        youtube_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }
    }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Auth simple: el anon key es suficiente para una llamada interna de scheduler
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim()
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authorization requerida' }), { status: 401, headers: CORS })
  }

  const apiKey = Deno.env.get('YOUTUBE_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'YOUTUBE_API_KEY no configurada' }), { status: 500, headers: CORS })
  }

  let body: any = {}
  try { body = await req.json() } catch {}

  const entrenador_id = body.entrenador_id || '0b908e25-f69f-472c-9972-87bc93d67e65'
  const limite = Math.min(body.limite || 30, 90)

  // Obtener ejercicios sin vídeo
  const { data: ejercicios, error: qErr } = await supabase
    .from('ejercicios_biblioteca')
    .select('id, nombre')
    .eq('entrenador_id', entrenador_id)
    .is('youtube_url', null)
    .order('nombre')
    .limit(limite)

  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message }), { status: 500, headers: CORS })
  }

  if (!ejercicios?.length) {
    // Contar total restantes (de todos, por si hay entrenadores distintos)
    const { count: totalPendientes } = await supabase
      .from('ejercicios_biblioteca')
      .select('id', { count: 'exact', head: true })
      .eq('entrenador_id', entrenador_id)
      .is('youtube_url', null)
    
    return new Response(
      JSON.stringify({ ok: true, mensaje: 'Completado: todos los ejercicios tienen vídeo', pendientes: totalPendientes || 0 }),
      { headers: CORS }
    )
  }

  const asignados: string[] = []
  const fallidos: string[] = []
  let rateLimit = false

  for (const ej of ejercicios) {
    try {
      await new Promise(r => setTimeout(r, 1500))
      const video = await buscarVideo(ej.nombre, apiKey)

      if (!video) {
        fallidos.push(ej.nombre)
        continue
      }

      const { error: upErr } = await supabase
        .from('ejercicios_biblioteca')
        .update({ yt_id: video.video_id, youtube_url: video.youtube_url })
        .eq('id', ej.id)
        .eq('entrenador_id', entrenador_id)

      if (upErr) {
        fallidos.push(ej.nombre)
      } else {
        asignados.push(ej.nombre)
      }
    } catch (err: any) {
      if (err.message === 'RATE_LIMIT_429') {
        rateLimit = true
        break
      }
      fallidos.push(ej.nombre)
    }
  }

  // Contar pendientes restantes
  const { count: pendientes } = await supabase
    .from('ejercicios_biblioteca')
    .select('id', { count: 'exact', head: true })
    .eq('entrenador_id', entrenador_id)
    .is('youtube_url', null)

  return new Response(
    JSON.stringify({
      ok: true,
      asignados_ok: asignados.length,
      fallidos: fallidos.length,
      fallidos_nombres: fallidos,
      rate_limit_hit: rateLimit,
      pendientes_restantes: pendientes || 0,
    }),
    { headers: CORS }
  )
})
