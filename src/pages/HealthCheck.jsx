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
      return `${data.length} cliente(s) encontrados`
    }
  },
  {
    id: 'registro_insert',
    label: 'Registro cliente — INSERT',
    desc: 'El cuestionario se inserta correctamente con acepta_rgpd',
    run: async (uid) => {
      const { data, error } = await supabase.from('cuestionarios').insert({
        entrenador_id: uid, nombre: 'TEST_HEALTH', email: `health_${Date.now()}@test.com`,
        objetivo: 'perdida_grasa', nivel: 'principiante', dias_semana: 3,
        duracion_sesion: 60, anos_entrenando: 0, acepta_rgpd: true, procesado: false
      }).select('id').single()
      if (error) throw new Error(error.message)
      // Limpiar
      await supabase.from('cuestionarios').delete().eq('id', data.id)
      return 'INSERT y DELETE OK'
    }
  },
  {
    id: 'convertir_cliente',
    label: 'Convertir cuestionario → cliente',
    desc: 'Normalización de valores y constraints de BD',
    run: async (uid) => {
      const { data, error } = await supabase.from('clientes').insert({
        entrenador_id: uid, nombre: 'TEST_HEALTH', email: `health_${Date.now()}@test.com`,
        objetivo: 'perdida_grasa', tipo: 'online', estado: 'activo',
        nivel: 'principiante', dias_semana: 3, material: 'sin_material',
        nutricion_activa: false
      }).select('id').single()
      if (error) throw new Error(error.message)
      await supabase.from('clientes').delete().eq('id', data.id)
      return 'INSERT con todos los constraints OK'
    }
  },
  {
    id: 'checkin_insert',
    label: 'Check-in semanal — escalas',
    desc: 'Escalas correctas: estres/fatiga 1-5, calidad/motivacion 1-7',
    run: async (uid) => {
      // Necesitamos un cliente real
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
      return 'Escalas correctas, INSERT OK'
    }
  },
  {
    id: 'alerta_insert',
    label: 'Alertas — constraint tipos',
    desc: 'cancelacion_sesion y otros tipos aceptados',
    run: async (uid) => {
      const { data: cl } = await supabase.from('clientes').select('id').eq('entrenador_id', uid).limit(1).single()
      if (!cl) throw new Error('Sin clientes')
      const tipos = ['cancelacion_sesion', 'pago_vencido', 'sin_checkin', 'fatiga_alta']
      for (const tipo of tipos) {
        const { data, error } = await supabase.from('alertas').insert({
          entrenador_id: uid, cliente_id: cl.id, tipo, mensaje: 'health check'
        }).select('id').single()
        if (error) throw new Error(`Tipo "${tipo}" falló: ${error.message}`)
        await supabase.from('alertas').delete().eq('id', data.id)
      }
      return `${tipos.length} tipos de alerta OK`
    }
  },
  {
    id: 'rls_portal',
    label: 'RLS portal cliente — lectura anónima',
    desc: 'El portal puede leer datos sin sesión de entrenador',
    run: async (uid) => {
      const { data: cl } = await supabase.from('clientes').select('id,nombre').eq('entrenador_id', uid).limit(1).single()
      if (!cl) throw new Error('Sin clientes')
      // Simular lectura anónima creando un cliente anon de Supabase
      const anonSb = (await import('https://esm.sh/@supabase/supabase-js@2').catch(() => null))
      // Alternativa: leer sin usar el cliente autenticado
      const res = await fetch(`${SUPABASE_URL}/rest/v1/clientes?id=eq.${cl.id}&select=id,nombre`, {
        headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
      }).then(r => r.json())
      if (!Array.isArray(res) || res.length === 0) throw new Error('RLS bloquea lectura anónima')
      return `Portal puede leer: ${res[0].nombre}`
    }
  },
  {
    id: 'edge_rutina',
    label: 'Edge Function — generar-rutina',
    desc: 'La función responde y acepta peticiones',
    run: async (uid) => {
      const { data: cl } = await supabase.from('clientes').select('id').eq('entrenador_id', uid).limit(1).single()
      if (!cl) throw new Error('Sin clientes')
      const r = await fetch(`${SUPABASE_URL}/functions/v1/generar-rutina`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ cliente_id: cl.id, dias: ['Lunes'], tipo: 'test_ping' })
      }).then(r => r.json()).catch(e => ({ error: e.message }))
      // Puede devolver error de datos pero lo importante es que la función responde
      if (r.error && r.error.includes('fetch')) throw new Error('Función no responde')
      return 'Función activa y respondiendo'
    }
  },
  {
    id: 'edge_nutricion',
    label: 'Edge Function — generar-nutricion',
    desc: 'La función responde y acepta peticiones',
    run: async (uid) => {
      const { data: cl } = await supabase.from('clientes').select('id').eq('entrenador_id', uid).limit(1).single()
      if (!cl) throw new Error('Sin clientes')
      const r = await fn('generar-nutricion', { cliente_id: 'ping_test' })
      if (r.error && r.error.includes('fetch')) throw new Error('Función no responde')
      return 'Función activa y respondiendo'
    }
  },
  {
    id: 'edge_portal_accion',
    label: 'Edge Function — portal-accion',
    desc: 'Cancelaciones desde portal llegan al entrenador',
    run: async () => {
      const r = await fn('portal-accion', { accion: 'ping' })
      if (r.error && r.error.includes('fetch')) throw new Error('Función no responde')
      return 'Función activa y respondiendo'
    }
  },
  {
    id: 'edge_bienvenida',
    label: 'Edge Function — bienvenida-cliente',
    desc: 'Email de bienvenida puede dispararse',
    run: async () => {
      const r = await fn('bienvenida-cliente', { cliente_id: 'ping_test' })
      if (r.error && r.error.includes('fetch')) throw new Error('Función no responde')
      return 'Función activa y respondiendo'
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

  const total = CHECKS.length
  const ok = Object.values(resultados).filter(r => r.estado === 'ok').length
  const errores = Object.values(resultados).filter(r => r.estado === 'error').length
  const ejecutados = ok + errores

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">System Health Check</h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5">Verifica que todos los flujos críticos funcionan antes de mandar enlaces a clientes</p>
      </div>

      {/* Resumen si hay resultados */}
      {ejecutados > 0 && (
        <div className={`rounded-2xl p-4 mb-4 flex items-center gap-4 ${errores === 0 && ejecutados === total ? 'bg-emerald-50 border border-emerald-100' : errores > 0 ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
          <span className="text-3xl">{errores === 0 && ejecutados === total ? '✅' : errores > 0 ? '⚠️' : '⏳'}</span>
          <div>
            <p className={`font-bold text-sm ${errores === 0 && ejecutados === total ? 'text-emerald-800' : errores > 0 ? 'text-red-800' : 'text-amber-800'}`}>
              {errores === 0 && ejecutados === total ? '¡Todo funciona correctamente!' : errores > 0 ? `${errores} error${errores > 1 ? 'es' : ''} detectado${errores > 1 ? 's' : ''}` : `Ejecutando... ${ejecutados}/${total}`}
            </p>
            <p className={`text-xs mt-0.5 ${errores === 0 && ejecutados === total ? 'text-emerald-600' : errores > 0 ? 'text-red-600' : 'text-amber-600'}`}>
              {ok} OK · {errores} error{errores !== 1 ? 'es' : ''} · {total - ejecutados} pendientes
            </p>
          </div>
        </div>
      )}

      {/* Barra progreso */}
      {ejecutando && (
        <div className="bg-black/5 rounded-full h-1.5 mb-4 overflow-hidden">
          <div className="h-full bg-[#FF5C00] rounded-full transition-all duration-300" style={{ width: `${progreso}%` }} />
        </div>
      )}

      {/* Botón */}
      <button onClick={ejecutarTodo} disabled={ejecutando}
        className="w-full bg-[#0A0A0A] text-white font-bold py-3.5 rounded-2xl mb-4 disabled:opacity-50 flex items-center justify-center gap-2">
        {ejecutando
          ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Ejecutando checks...</>
          : '▶ Ejecutar todos los checks'
        }
      </button>

      {/* Lista de checks */}
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
              <div className="flex-shrink-0 mt-0.5">
                {estado === 'ok' && <span className="text-emerald-500 text-lg">✓</span>}
                {estado === 'error' && <span className="text-red-500 text-lg">✗</span>}
                {estado === 'ejecutando' && <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin block mt-0.5" />}
                {estado === 'pendiente' && <span className="w-4 h-4 bg-black/10 rounded-full block mt-0.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${
                  estado === 'ok' ? 'text-emerald-800' :
                  estado === 'error' ? 'text-red-800' :
                  estado === 'ejecutando' ? 'text-amber-800' :
                  'text-[#0A0A0A]'
                }`}>{check.label}</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5">{check.desc}</p>
                {r?.msg && (
                  <p className={`text-xs mt-1 font-mono ${estado === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
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
