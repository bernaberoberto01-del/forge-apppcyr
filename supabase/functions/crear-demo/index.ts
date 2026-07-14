import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET')

Deno.serve(async (req) => {
  const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Script de configuración inicial: no debe poder ejecutarlo cualquiera con la clave pública.
  if (!ADMIN_SECRET || req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS })
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'demo@forge-studio.es',
      password: 'Demo2024!',
      email_confirm: true,
      user_metadata: { nombre: 'Carlos Demo' }
    })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: CORS })

    const uid = data.user.id
    await supabase.from('configuracion').upsert({
      entrenador_id: uid,
      nombre_entrenador: 'Carlos Martinez',
      nombre_negocio: 'CM Personal Training',
      bio: 'Entrenador personal certificado. Especialista en perdida de grasa y ganancia muscular. +8 anos de experiencia.',
      color_acento: '#FF5C00',
      modulos: { dashboard: true, clientes: true, rutinas: true, seguimiento: true, pagos: true, agenda: true, nutricion: true, mensajes: true }
    }, { onConflict: 'entrenador_id' })

    const demoId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    await supabase.from('clientes').update({ entrenador_id: uid }).eq('entrenador_id', demoId)
    await supabase.from('sesiones').update({ entrenador_id: uid }).eq('entrenador_id', demoId)
    await supabase.from('checkins').update({ entrenador_id: uid }).eq('entrenador_id', demoId)
    await supabase.from('pagos').update({ entrenador_id: uid }).eq('entrenador_id', demoId)
    await supabase.from('rutinas').update({ entrenador_id: uid }).eq('entrenador_id', demoId)
    await supabase.from('planes_nutricion').update({ entrenador_id: uid }).eq('entrenador_id', demoId)
    await supabase.from('planes_cobro').update({ entrenador_id: uid }).eq('entrenador_id', demoId).catch(() => {})

    return new Response(JSON.stringify({ ok: true, uid, email: 'demo@forge-studio.es', password: 'Demo2024!' }), { headers: CORS })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
