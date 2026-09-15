import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const ahora = new Date().toISOString()
  const { data: pendientes } = await supabase.from('mensajes_programados').select('*').eq('enviado', false).lte('enviar_en', ahora)
  if (!pendientes?.length) return new Response(JSON.stringify({ enviados: 0 }))
  let enviados = 0
  for (const msg of pendientes) {
    const { error } = await supabase.from('mensajes_cliente').insert({ entrenador_id: msg.entrenador_id, cliente_id: msg.cliente_id, contenido: msg.contenido, enviado_por: 'entrenador', leido_cliente: false })
    if (!error) {
      await supabase.from('mensajes_programados').update({ enviado: true, enviado_en: ahora }).eq('id', msg.id)
      enviados++
    }
  }
  return new Response(JSON.stringify({ enviados }))
})
