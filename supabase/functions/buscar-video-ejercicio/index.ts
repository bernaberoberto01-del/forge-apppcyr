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

// Términos de búsqueda en español → inglés para mejorar resultados en YouTube
const TRADUCCIONES: Record<string, string> = {
  'sentadilla': 'squat',
  'peso muerto': 'deadlift',
  'press banca': 'bench press',
  'press militar': 'overhead press',
  'dominadas': 'pull ups',
  'fondos': 'dips',
  'remo': 'row',
  'curl': 'curl',
  'extensión': 'extension',
  'plancha': 'plank',
  'zancada': 'lunge',
  'hip thrust': 'hip thrust',
  'jalon': 'lat pulldown',
  'jalón': 'lat pulldown',
  'prensa': 'leg press',
  'abdominales': 'abs',
  'burpee': 'burpee',
  'kettlebell': 'kettlebell',
  'mancuerna': 'dumbbell',
  'barra': 'barbell',
  'cable': 'cable',
  'polea': 'cable machine',
  'goma': 'resistance band',
  'banda elástica': 'resistance band',
  'fitball': 'swiss ball',
  'bosu': 'bosu',
  'trx': 'trx',
  'foam roller': 'foam roller',
}

function construirQueryYouTube(nombre: string): string {
  let query = nombre.toLowerCase()

  // Aplicar traducciones parciales para mejorar resultados
  for (const [es, en] of Object.entries(TRADUCCIONES)) {
    if (query.includes(es)) {
      // Mantener nombre original + versión inglés para mejor cobertura
      query = `${nombre} ${en} exercise tutorial`
      return query
    }
  }

  // Si no hay traducción, buscar en español con "ejercicio tutorial"
  return `${nombre} ejercicio tutorial técnica correcta`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Autenticación
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { nombre, ejercicio_id, guardar } = body

    if (!nombre) {
      return new Response(JSON.stringify({ error: 'nombre requerido' }), { status: 400, headers: CORS })
    }

    const apiKey = Deno.env.get('YOUTUBE_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'YOUTUBE_API_KEY no configurada' }), { status: 500, headers: CORS })
    }

    // Búsqueda en YouTube con un segundo intento: la primera (frase larga, solo
    // vídeos cortos) a menudo no devuelve nada; entonces se prueba algo más simple.
    async function buscarEnYouTube(q: string, soloCortos: boolean) {
      const ytUrl = new URL('https://www.googleapis.com/youtube/v3/search')
      ytUrl.searchParams.set('part', 'snippet')
      ytUrl.searchParams.set('q', q)
      ytUrl.searchParams.set('type', 'video')
      ytUrl.searchParams.set('maxResults', '5')
      if (soloCortos) ytUrl.searchParams.set('videoDuration', 'short') // < 4 min, mejor para tutoriales
      ytUrl.searchParams.set('relevanceLanguage', 'es')
      ytUrl.searchParams.set('key', apiKey!)
      const res = await fetch(ytUrl.toString())
      if (!res.ok) {
        console.error('YouTube API error:', res.status, await res.text())
        return { error: res.status, items: [] as any[] }
      }
      return { error: null, items: ((await res.json()).items || []) as any[] }
    }

    let searchQuery = construirQueryYouTube(nombre)
    let { error: ytError, items } = await buscarEnYouTube(searchQuery, true)
    if (!ytError && items.length === 0) {
      searchQuery = `${nombre} ejercicio`
      ;({ error: ytError, items } = await buscarEnYouTube(searchQuery, false))
    }
    if (ytError) {
      return new Response(JSON.stringify({ error: `YouTube API error: ${ytError}` }), { status: 502, headers: CORS })
    }

    if (items.length === 0) {
      return new Response(JSON.stringify({ ok: true, resultados: [] }), { headers: CORS })
    }

    // Formatear resultados
    const resultados = items.map((item: any) => ({
      video_id: item.id?.videoId,
      titulo: item.snippet?.title,
      canal: item.snippet?.channelTitle,
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
      youtube_url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
      descripcion: item.snippet?.description?.slice(0, 150),
    })).filter((r: any) => r.video_id)

    // Si guardar=true y ejercicio_id, guardar el primer resultado en la BD
    if (guardar && ejercicio_id && resultados.length > 0) {
      const mejor = resultados[0]
      const { error: updateErr } = await supabase
        .from('ejercicios_biblioteca')
        .update({
          yt_id: mejor.video_id,
          youtube_url: mejor.youtube_url,
        })
        .eq('id', ejercicio_id)
        .eq('entrenador_id', user.id) // seguridad: solo el propietario puede actualizar

      if (updateErr) {
        console.error('Error guardando video:', updateErr)
        // No falla la respuesta, devuelve los resultados igualmente
      }
    }

    return new Response(
      JSON.stringify({ ok: true, query_usada: searchQuery, resultados }),
      { headers: CORS }
    )
  } catch (err: any) {
    console.error('buscar-video-ejercicio error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
