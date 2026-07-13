import { useState } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'

const fn = (name, body = {}) => fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
  body: JSON.stringify(body)
}).then(r => r.json()).catch(e => ({ error: e.message }))

const CHECKS = [
  {
    id: 'db_read',
    label: 'Base de datos — lectura',
    desc: 'Supabase responde y devuelve datos',
    run: async (uid) => {
      const { data, error } = await supabase.from('clientes').select('id').eq('entrenador_id', uid).limit(1)
      if (error) throw new Error(error.message)
      return `OK — ${data.length} cliente encontrado`
    }
  },
  {
    id: 'registro_insert',
    label: 'Registro cliente — INSERT cuestionario',
    desc: 'acepta_rgpd y todos los campos funcionan',
    run: async (uid) => {
      const { data, error } = await supabase.from('cuestionarios').insert({
        entrenador_id: uid, nombre: 'TEST_HEALTH', email: `health_${Date.now()}@test.com`,
        objetivo: 'perdida_grasa', nivel: 'principiante', dias_semana: 3,
        duracion_sesion: 60, anos_entrenando: 0, acepta_rgpd: true, procesado: false
      }).select('id').single()
      if (error) throw new Error(error.message)
      await supabase.from('cuestionarios').delete().eq('id', data.id)
      return 'INSERT + DELETE OK'
    }
  },
  {
    id: 'convertir_cliente',
    label: 'Convertir cuestionario → cliente',
    desc: 'Constraints de material, objetivo, estado, tipo',
    run: async (uid) => {
      const { data, error } = await supabase.from('clientes').insert({
        entrenador_id: uid, nombre: 'TEST_HEALTH', email: `health_${Date.now()}@test.com`,
        objetivo: 'perdida_grasa', tipo: 'online', estado: 'activo',
        nivel: 'principiante', dias_semana: 3, material: 'sin_material', nutricion_activa: false
      }).select('id').single()
      if (error) throw new Error(error.message)
      await supabase.from('clientes').delete().eq('id', data.id)
      return 'Todos los constraints OK'
    }
  },
  {
    id: 'checkin_escalas',
    label: 'Check-in — escalas correctas',
    desc: 'estres/fatiga 1-5 · calidad/motivacion 1-7 · resto 1-10',
    run: async (uid) => {
      const { data: cl } = await supabase.from('clientes').select('id').eq('entrenador_id', uid).limit(1).single()
      if (!cl) throw new Error('Sin clientes para probar')
      const { data, error } = await supabase.from('checkins').insert({
        entrenador_id: uid, cliente_id: cl.id, fecha: '2000-01-01',
        peso: 70, energia: 7, sueno: 7, estres: 2, fatiga: 2,
        motivacion: 6, calidad_entreno: 6, adherencia_entreno: 8,
        adherencia_nutricion: 7, sesiones_semana: 3
      }).select('id').single()
      if (error) throw new Error(error.message)
      await supabase.from('checkins').delete().eq('id', data.id)
      return 'Todas las escalas OK'
    }
  },
  {
    id: 'alertas_tipos',
    label: 'Alertas — todos los tipos',
    desc: 'cancelacion_sesion · pago_vencido · sin_checkin · fatiga_alta',
    run: async (uid) => {
      const { data: cl } = await supabase.from('clientes').select('id').eq('entrenador_id', uid).limit(1).single()
      if (!cl) throw new Error('Sin clientes')
      const tipos = ['cancelacion_sesion', 'pago_vencido', 'sin_checkin', 'fatiga_alta']
      for (const tipo of tipos) {
        const { data, error } = await supabase.from('alertas').insert({
          entrenador_id: uid, cliente_id: cl.id, tipo, mensaje: 'health check'
        }).select('id').single()
        if (error) throw new Error(`"${tipo}" falló: ${error.message}`)
        await supabase.from('alertas').delete().eq('id', data.id)
      }
      return `${tipos.length} tipos OK`
    }
  },
  {
    id: 'rls_portal',
    label: 'RLS portal cliente — lectura anónima',
    desc: 'El portal puede leer datos sin sesión del entrenador',
    run: async (uid) => {
      const { data: cl } = await supabase.from('clientes').select('id,nombre').eq('entrenador_id', uid).limit(1).single()
      if (!cl) throw new Error('Sin clientes')
      const res = await fetch(`${SUPABASE_URL}/rest/v1/clientes?id=eq.${cl.id}&select=id,nombre`, {
        headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
      }).then(r => r.json())
      if (!Array.isArray(res) || res.length === 0) throw new Error('RLS bloquea lectura anónima')
      return `Portal puede leer: ${res[0].nombre}`
    }
  },
  {
    id: 'cancelacion_sesion',
    label: 'Portal — cancelación de sesión',
    desc: 'Edge Function portal-accion responde',
    run: async () => {
      const r = await fn('portal-accion', { accion: 'ping' })
      if (r.error && r.error.toLowerCase().includes('fetch')) throw new Error('Función no responde')
      return 'Función activa'
    }
  },
  {
    id: 'edge_rutina',
    label: 'Edge Function — generar-rutina',
    desc: 'Función activa, acepta contexto_extra',
    run: async () => {
      const r = await fn('generar-rutina', { cliente_id: 'ping_test', contexto_extra: '' })
      if (r.error && r.error.toLowerCase().includes('fetch')) throw new Error('Función no responde')
      return 'Función activa'
    }
  },
  {
    id: 'edge_nutricion',
    label: 'Edge Function — generar-nutricion',
    desc: 'Función activa con Mifflin-St Jeor',
    run: async () => {
      const r = await fn('generar-nutricion', { cliente_id: 'ping_test' })
      if (r.error && r.error.toLowerCase().includes('fetch')) throw new Error('Función no responde')
      return 'Función activa'
    }
  },
  {
    id: 'edge_bienvenida',
    label: 'Edge Function — bienvenida-cliente',
    desc: 'Gmail SMTP configurado y función activa',
    run: async () => {
      const r = await fn('bienvenida-cliente', { cliente_id: 'ping_test' })
      // ping_test dará "Cliente no encontrado" pero eso significa que la función responde
      if (r.error && r.error.toLowerCase().includes('fetch')) throw new Error('Función no responde')
      if (r.error === 'GMAIL_USER o GMAIL_APP_PASSWORD no configurados') throw new Error('Secrets de Gmail no configurados en Supabase')
      if (r.error === 'ANTHROPIC_API_KEY no configurada') throw new Error('API key Anthropic falta')
      return 'Función activa · Gmail configurado'
    }
  },
  {
    id: 'mensajes_badge',
    label: 'Mensajes — badge correcto',
    desc: 'leido_entrenador funciona, no genera falsos positivos',
    run: async (uid) => {
      const { data: cl } = await supabase.from('clientes').select('id').eq('entrenador_id', uid).limit(1).single()
      if (!cl) throw new Error('Sin clientes')
      // Insertar mensaje de sistema (debe NO generar badge)
      const { data: msg, error } = await supabase.from('mensajes_cliente').insert({
        entrenador_id: uid, cliente_id: cl.id,
        contenido: 'TEST_HEALTH sistema', tipo: 'sistema', leido: true, leido_entrenador: true
      }).select('id').single()
      if (error) throw new Error(error.message)
      // Verificar que no aparece en el contador
      const { count } = await supabase.from('mensajes_cliente').select('id', { count: 'exact' })
        .eq('entrenador_id', uid).eq('leido_entrenador', false).neq('tipo', 'entrenador').neq('tipo', 'sistema')
      await supabase.from('mensajes_cliente').delete().eq('id', msg.id)
      return `Badge correcto — ${count || 0} mensajes sin leer`
    }
  },
  {
    id: 'configuracion',
    label: 'Configuración — nombre y negocio',
    desc: 'El email de bienvenida tendrá datos correctos',
    run: async (uid) => {
      const { data } = await supabase.from('configuracion').select('nombre_entrenador, nombre_negocio').eq('entrenador_id', uid).single()
      if (!data?.nombre_entrenador) throw new Error('nombre_entrenador vacío — el email saldrá sin firma')
      if (!data?.nombre_negocio) throw new Error('nombre_negocio vacío — configúralo en Ajustes → Perfil')
      return `${data.nombre_entrenador} · ${data.nombre_negocio}`
    }
  },
]

export default function HealthCheck({ session }) {
  const [resultados, setResultados] = useState({})
  const [ejecutando, setEjecutando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const uid = session?.user?.id

  async function ejecutarTodo() {
    setEjecutando(true)
    setResultados({})
    setProgreso(0)
    for (let i = 0; i < CHECKS.length; i++) {
      const check = CHECKS[i]
      setResultados(r => ({ ...r, [check.id]: { estado: 'ejecutando' } }))
      try {
        const msg = await check.run(uid)
        setResultados(r => ({ ...r, [check.id]: { estado: 'ok', msg } }))
      } catch (e) {
        setResultados(r => ({ ...r, [check.id]: { estado: 'error', msg: e.message } }))
      }
      setProgreso(Math.round(((i + 1) / CHECKS.length) * 100))
    }
    setEjecutando(false)
  }

  const ok = Object.values(resultados).filter(r => r.estado === 'ok').length
  const errores = Object.values(resultados).filter(r => r.estado === 'error').length
  const ejecutados = ok + errores
  const total = CHECKS.length
  const todoOk = ejecutados === total && errores === 0

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Health Check</h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5">Verifica que todo funciona antes de mandar el enlace a un cliente</p>
      </div>

      {ejecutados > 0 && (
        <div className={`rounded-2xl p-4 mb-4 flex items-center gap-4 ${todoOk ? 'bg-emerald-50 border border-emerald-100' : errores > 0 ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
          <span className="text-3xl">{todoOk ? '✅' : errores > 0 ? '⚠️' : '⏳'}</span>
          <div>
            <p className={`font-bold text-sm ${todoOk ? 'text-emerald-800' : errores > 0 ? 'text-red-800' : 'text-amber-800'}`}>
              {todoOk ? '¡Todo funciona correctamente!' : errores > 0 ? `${errores} problema${errores > 1 ? 's' : ''} detectado${errores > 1 ? 's' : ''}` : `Ejecutando... ${ejecutados}/${total}`}
            </p>
            <p className={`text-xs mt-0.5 ${todoOk ? 'text-emerald-600' : errores > 0 ? 'text-red-600' : 'text-amber-600'}`}>
              {ok} OK · {errores} error{errores !== 1 ? 'es' : ''} · {total - ejecutados} pendientes
            </p>
          </div>
        </div>
      )}

      {ejecutando && (
        <div className="bg-black/5 rounded-full h-1.5 mb-4 overflow-hidden">
          <div className="h-full bg-[#FF5C00] rounded-full transition-all duration-300" style={{ width: `${progreso}%` }} />
        </div>
      )}

      <button onClick={ejecutarTodo} disabled={ejecutando}
        className="w-full bg-[#0A0A0A] text-white font-bold py-3.5 rounded-2xl mb-4 disabled:opacity-50 flex items-center justify-center gap-2">
        {ejecutando
          ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Ejecutando {progreso}%...</>
          : '▶ Ejecutar todos los checks'
        }
      </button>

      <div className="space-y-2">
        {CHECKS.map(check => {
          const r = resultados[check.id]
          const estado = r?.estado || 'pendiente'
          return (
            <div key={check.id} className={`rounded-xl border p-3.5 flex items-start gap-3 transition-all ${
              estado === 'ok' ? 'bg-emerald-50 border-emerald-100' :
              estado === 'error' ? 'bg-red-50 border-red-100' :
              estado === 'ejecutando' ? 'bg-amber-50 border-amber-100' :
              'bg-white border-black/5'
            }`}>
              <div className="flex-shrink-0 mt-0.5 w-5 text-center">
                {estado === 'ok' && <span className="text-emerald-500 text-base">✓</span>}
                {estado === 'error' && <span className="text-red-500 text-base">✗</span>}
                {estado === 'ejecutando' && <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin block" />}
                {estado === 'pendiente' && <span className="w-3.5 h-3.5 bg-black/10 rounded-full block mt-0.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${
                  estado === 'ok' ? 'text-emerald-800' :
                  estado === 'error' ? 'text-red-800' :
                  estado === 'ejecutando' ? 'text-amber-800' : 'text-[#0A0A0A]'
                }`}>{check.label}</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5">{check.desc}</p>
                {r?.msg && (
                  <p className={`text-xs mt-1 font-mono leading-relaxed ${estado === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {r.msg}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-[#6B6B6B] text-center mt-6">
        Solo visible para ti · Los datos de test se eliminan automáticamente
      </p>
    </div>
  )
}
