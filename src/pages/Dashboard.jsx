import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TutorialBanner, { BarraProgreso } from '../components/TutorialBanner'
import { useOnboarding, TUTORIALES } from '../hooks/useOnboarding'
import { supabase } from '../lib/supabase'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function BarChart({ datos, max }) {
  return (
    <div className="flex items-end gap-1 h-20">
      {datos.map((d, i) => {
        const pct = max > 0 ? (d.valor / max) * 100 : 0
        const esActual = i === datos.length - 1
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <p className="text-xs font-bold text-[#0A0A0A]" style={{ opacity: pct > 0 ? 1 : 0 }}>
              {d.valor > 0 ? `${d.valor}€` : ''}
            </p>
            <div className="w-full rounded-t-lg transition-all" style={{
              height: `${Math.max(pct, pct > 0 ? 8 : 0)}%`,
              background: esActual ? '#FF5C00' : '#FF5C00',
              opacity: esActual ? 1 : 0.3 + (i / datos.length) * 0.5,
              minHeight: pct > 0 ? '4px' : '0'
            }} />
            <p className="text-xs text-[#6B6B6B]">{d.mes}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard({ session }) {
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sesionesHoy, setSesionesHoy] = useState([])
  const [sesionesManana, setSesionesManana] = useState([])
  const [cuestPendientes, setCuestPendientes] = useState([])
  const [clientesIAPendiente, setClientesIAPendiente] = useState([])
  const navigate = useNavigate()
  const uid = session.user.id
  const { completar, completado, porcentaje } = useOnboarding(uid)

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    try {
    const hoy = new Date()
    const hoyStr = hoy.toISOString().split('T')[0]
    const hace6m = new Date(hoy.getFullYear(), hoy.getMonth()-5, 1).toISOString().split('T')[0]
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
    const inicioSemana = (() => { const d=new Date(); d.setDate(d.getDate()-((d.getDay()||7)-1)); return d.toISOString().split('T')[0] })()
    const hace7d = new Date(Date.now()-7*864e5).toISOString().split('T')[0]
    const en7d   = new Date(Date.now()+7*864e5).toISOString().split('T')[0]

    const [
      { data: clientes },
      { data: pagos },
      { data: sesiones },
      { data: checkins },
      { data: alertas },
      { data: mensajesNL },
      { data: rutinasIA },
      { data: sesHoy },
      { data: sesManana },
      { data: cuestPendientes },
      { data: clientesIAPendiente },
      { data: cfg },
    ] = await Promise.all([
      supabase.from('clientes').select('id,nombre,objetivo,tipo,nivel,estado,precio_mensual,fecha_inicio').eq('entrenador_id', uid),
      supabase.from('pagos').select('importe,fecha_pago,cliente_id,valido_hasta').eq('entrenador_id', uid).gte('fecha_pago', hace6m),
      supabase.from('sesiones').select('id,fecha,completada,cliente_id,duracion_minutos').eq('entrenador_id', uid).gte('fecha', inicioSemana),
      supabase.from('checkins').select('cliente_id,fecha,adherencia_entreno,energia,fatiga,contenido').eq('entrenador_id', uid).gte('fecha', hace6m).order('fecha', {ascending:false}),
      supabase.from('alertas').select('*').eq('entrenador_id', uid).eq('leida', false).order('created_at',{ascending:false}).limit(20),
      supabase.from('mensajes_cliente').select('id,cliente_id,contenido,created_at,clientes(nombre)').eq('entrenador_id', uid).eq('leido_entrenador', false).eq('tipo','cliente').order('created_at',{ascending:false}).limit(10),
      supabase.from('rutinas').select('id,cliente_id,estado,created_at,clientes(nombre)').eq('entrenador_id', uid).eq('estado','borrador').order('created_at',{ascending:false}).limit(10),
      supabase.from('sesiones').select('*, clientes(nombre,tipo)').eq('entrenador_id', uid).eq('fecha', hoyStr).eq('cancelada', false).order('hora'),
      supabase.from('sesiones').select('*, clientes(nombre,tipo)').eq('entrenador_id', uid).eq('fecha', new Date(Date.now()+864e5).toISOString().split('T')[0]).eq('cancelada', false).order('hora'),
      supabase.from('cuestionarios').select('id,nombre,email,necesidades,objetivo,created_at').eq('entrenador_id', uid).eq('procesado', false).order('created_at', {ascending:false}),
      supabase.from('clientes').select('id,nombre,plan_online,ia_estado').eq('entrenador_id', uid).eq('tipo','online').in('ia_estado',['generando','error']).eq('estado','activo'),
      supabase.from('configuracion').select('nombre_entrenador').eq('entrenador_id', uid).maybeSingle(),
    ])

    if (alertas?.length > 0) {
      await supabase.from('alertas').update({ leida:true }).eq('entrenador_id', uid).eq('leida', false)
      window.dispatchEvent(new Event('alertas-leidas'))
    }

    setSesionesHoy(sesHoy || [])
    setSesionesManana(sesManana || [])
    setCuestPendientes(cuestPendientes || [])
    setClientesIAPendiente(clientesIAPendiente || [])
    const activos = (clientes||[]).filter(c => c.estado === 'activo')
    const ingresosMes = (pagos||[]).filter(p => p.fecha_pago >= inicioMes).reduce((s,p) => s+Number(p.importe||0), 0)
    const hace4s = new Date(Date.now()-28*864e5).toISOString().split('T')[0]
    const ciRecientes = (checkins||[]).filter(c => c.fecha >= hace4s)
    const adherenciaMedia = ciRecientes.length > 0
      ? Math.round(ciRecientes.reduce((s,c) => s+(c.adherencia_entreno||0),0)/ciRecientes.length*10) : null

    const ingresosPorMes = Array.from({length:6},(_,i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth()-5+i, 1)
      const mesStr = d.toISOString().slice(0,7)
      const total = (pagos||[]).filter(p => p.fecha_pago?.startsWith(mesStr)).reduce((s,p) => s+Number(p.importe||0),0)
      return { mes: MESES[d.getMonth()], valor: Math.round(total) }
    })
    const maxIngreso = Math.max(...ingresosPorMes.map(m => m.valor), 1)

    const alertasPagos = activos.filter(c => {
      const p = (pagos||[]).filter(p=>p.cliente_id===c.id).sort((a,b)=>b.fecha_pago?.localeCompare(a.fecha_pago))[0]
      return p?.valido_hasta && new Date(p.valido_hasta) < hoy
    })
    const cobrosProximos = activos.filter(c => {
      const p = (pagos||[]).filter(p=>p.cliente_id===c.id).sort((a,b)=>b.fecha_pago?.localeCompare(a.fecha_pago))[0]
      if (!p?.valido_hasta) return false
      const v = new Date(p.valido_hasta)
      return v >= hoy && v <= new Date(en7d)
    })
    const clientesSinCI = activos.filter(c => !ciRecientes.some(ci => ci.cliente_id===c.id && ci.fecha>=hace7d))
    const checkinsNuevos = ciRecientes.filter(ci => ci.fecha >= inicioSemana)
    const totalClientes = (clientes||[]).length
    const tasaRetencion = totalClientes > 0 ? Math.round((activos.length/totalClientes)*100) : 100

    setDatos({
      activos, ingresosMes, adherenciaMedia, ingresosPorMes, maxIngreso,
      alertasPagos, cobrosProximos, clientesSinCI, checkinsNuevos,
      mensajesNL: mensajesNL||[], rutinasIA: rutinasIA||[],
      alertasExtra: alertas||[], tasaRetencion, totalClientes,
      nombreEntrenador: cfg?.nombre_entrenador?.split(' ')[0] || null
    })
    setLoading(false)
    } catch (e) {
      console.error('Dashboard error:', e)
      setLoading(false)
    }
  }

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = datos?.nombreEntrenador || session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || 'Roberto'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const d = datos
  const totalPendiente = d.mensajesNL.length + d.clientesSinCI.length + d.rutinasIA.length + d.alertasPagos.length

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-screen-xl mx-auto space-y-4">

        {/* Tutorial primer acceso */}
        <TutorialBanner
          tutorial={TUTORIALES.dashboard}
          completado={completado('primer_cliente') || d.activos.length > 0}
          onCompletar={() => {}}
          onAccion={() => navigate('/configuracion')}
        />

        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0A0A0A]">{saludo}, {nombre} 👋</h1>
            <p className="text-sm text-[#6B6B6B] mt-0.5 capitalize">
              {new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
            </p>
          </div>
          {totalPendiente > 0 && (
            <div className="bg-[#FF5C00] text-white text-sm font-bold px-3 py-1.5 rounded-full">
              {totalPendiente} pendiente{totalPendiente > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Grid principal: atención (izq) + agenda y métricas (der) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── COLUMNA IZQUIERDA: Todo lo que necesita tu atención ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Lista de atención priorizada */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                <p className="font-bold text-[#0A0A0A] text-sm">Atención requerida</p>
                {totalPendiente === 0 && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">✓ Todo al día</span>
                )}
              </div>
              <div className="divide-y divide-black/4">

                {/* Clientes nuevos — máxima prioridad */}
                {cuestPendientes.map(c => {
                  const planLabel = {entrenamiento:'💪',nutricion:'🥗',completo:'⚡'}[c.necesidades] || '📋'
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-5 py-3.5 bg-[#FF5C00]/4">
                      <div className="w-8 h-8 bg-[#FF5C00] rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0">{planLabel}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#0A0A0A]">Nuevo: {c.nombre.split(' ')[0]}</p>
                        <p className="text-xs text-[#6B6B6B]">
                          {({entrenamiento:'Plan entrenamiento',nutricion:'Plan nutrición',completo:'Plan completo'})[c.necesidades] || 'Plan por asignar'}
                          {' · '}{new Date(c.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
                        </p>
                      </div>
                      <button onClick={() => navigate('/clientes?tab=cuestionarios')}
                        className="text-xs bg-[#FF5C00] text-white font-bold px-3 py-1.5 rounded-xl flex-shrink-0">
                        Aprobar →
                      </button>
                    </div>
                  )
                })}

                {/* IA generando o con error */}
                {clientesIAPendiente.map(c => (
                  <div key={c.id} className={`flex items-center gap-3 px-5 py-3.5 ${c.ia_estado==='error'?'bg-red-50':''}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0 ${c.ia_estado==='error'?'bg-red-500':'bg-[#6366f1]'}`}>
                      {c.ia_estado==='error'?'⚠':'⏳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A]">{c.nombre.split(' ')[0]}</p>
                      <p className={`text-xs ${c.ia_estado==='error'?'text-red-600':'text-[#6366f1]'}`}>
                        {c.ia_estado==='generando'?'IA generando plan…':'Error al generar — revisa manualmente'}
                      </p>
                    </div>
                    {c.ia_estado==='error' && (
                      <button onClick={() => navigate('/rutinas')}
                        className="text-xs bg-red-500 text-white font-semibold px-3 py-1.5 rounded-xl flex-shrink-0">
                        Generar →
                      </button>
                    )}
                  </div>
                ))}

                {/* Rutinas IA por revisar */}
                {d.rutinasIA.length > 0 && (
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-8 h-8 bg-[#6366f1]/10 rounded-xl flex items-center justify-center text-[#6366f1] text-sm flex-shrink-0">🤖</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A]">
                        {d.rutinasIA.length} rutina{d.rutinasIA.length>1?'s':''} por revisar
                      </p>
                      <p className="text-xs text-[#6B6B6B] truncate">
                        {d.rutinasIA.slice(0,3).map(r=>r.clientes?.nombre?.split(' ')[0]).join(', ')}
                      </p>
                    </div>
                    <button onClick={() => navigate('/rutinas?filtro=borrador')}
                      className="text-xs bg-[#6366f1] text-white font-semibold px-3 py-1.5 rounded-xl flex-shrink-0">
                      Revisar →
                    </button>
                  </div>
                )}

                {/* Mensajes sin leer */}
                {d.mensajesNL.length > 0 && (
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-8 h-8 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center text-[#FF5C00] text-sm flex-shrink-0">✉️</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A]">
                        {d.mensajesNL.length} mensaje{d.mensajesNL.length>1?'s':''} sin leer
                      </p>
                      <p className="text-xs text-[#6B6B6B] truncate">
                        {d.mensajesNL.slice(0,3).map(m=>m.clientes?.nombre?.split(' ')[0]).join(', ')}
                      </p>
                    </div>
                    <button onClick={() => navigate('/mensajes')}
                      className="text-xs bg-[#FF5C00] text-white font-semibold px-3 py-1.5 rounded-xl flex-shrink-0">
                      Ver {d.mensajesNL.length} →
                    </button>
                  </div>
                )}

                {/* Cobros vencidos */}
                {d.alertasPagos.length > 0 && (
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-red-50">
                    <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0">💳</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-red-700">
                        {d.alertasPagos.length} cobro{d.alertasPagos.length>1?'s':''} vencido{d.alertasPagos.length>1?'s':''}
                      </p>
                      <p className="text-xs text-red-500 truncate">
                        {d.alertasPagos.slice(0,3).map(c=>c.nombre.split(' ')[0]).join(', ')}
                      </p>
                    </div>
                    <button onClick={() => navigate('/pagos')}
                      className="text-xs bg-red-500 text-white font-bold px-3 py-1.5 rounded-xl flex-shrink-0">
                      Cobrar →
                    </button>
                  </div>
                )}

                {/* Cobros próximos */}
                {d.alertasPagos.length === 0 && d.cobrosProximos.length > 0 && (
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 text-sm flex-shrink-0">💳</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A]">
                        {d.cobrosProximos.length} cobro{d.cobrosProximos.length>1?'s':''} esta semana
                      </p>
                    </div>
                    <button onClick={() => navigate('/pagos')}
                      className="text-xs bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-xl flex-shrink-0">
                      Ver →
                    </button>
                  </div>
                )}

                {/* Check-ins sin hacer */}
                {d.clientesSinCI.length > 0 && (
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 text-sm flex-shrink-0">📋</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A]">
                        {d.clientesSinCI.length} sin check-in esta semana
                      </p>
                      <p className="text-xs text-[#6B6B6B] truncate">
                        {d.clientesSinCI.slice(0,3).map(c=>c.nombre.split(' ')[0]).join(', ')}
                      </p>
                    </div>
                    <button onClick={() => navigate('/seguimiento')}
                      className="text-xs bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-xl flex-shrink-0">
                      Ver →
                    </button>
                  </div>
                )}

                {/* Alertas extra (fatiga, etc.) */}
                {d.alertasExtra.slice(0,2).map(a => (
                  <div key={a.id} className={`flex items-start gap-3 px-5 py-3.5 ${a.tipo==='fatiga_alta_post_sesion'?'bg-red-50':''}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${a.tipo==='fatiga_alta_post_sesion'?'bg-red-100 text-red-600':'bg-[#F5F5F0] text-[#6B6B6B]'}`}>
                      {a.tipo==='fatiga_alta_post_sesion'?'⚠️':'🔔'}
                    </div>
                    <p className="text-xs text-[#444] leading-relaxed pt-1.5">{a.mensaje}</p>
                  </div>
                ))}

                {/* Onboarding — sistema vacío, usuario nuevo */}
                {totalPendiente === 0 && cuestPendientes.length === 0 && clientesIAPendiente.length === 0 && d.activos.length === 0 && (
                  <div className="px-5 py-6 space-y-3">
                    <p className="text-sm font-bold text-[#0A0A0A]">👋 Bienvenido a Forge</p>
                    <p className="text-xs text-[#6B6B6B]">Empieza en 3 pasos:</p>
                    {[
                      ['1', 'Configura tu perfil', 'Tu nombre, logo y colores', '/configuracion', '#FF5C00'],
                      ['2', 'Añade tu primer cliente', 'Presencial u online', '/clientes', '#6366f1'],
                      ['3', 'Genera su rutina con IA', 'En menos de 30 segundos', '/rutinas', '#10b981'],
                    ].map(([n, t, s, ruta, c]) => (
                      <button key={n} onClick={() => navigate(ruta)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F7F6F3] hover:bg-[#F0EEE8] transition-all text-left">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:c}}>{n}</div>
                        <div>
                          <p className="text-sm font-semibold text-[#0A0A0A]">{t}</p>
                          <p className="text-xs text-[#9B9B9B]">{s}</p>
                        </div>
                        <span className="ml-auto text-xs text-[#9B9B9B]">→</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Todo al día — sin clientes nuevos ni pendientes */}
                {totalPendiente === 0 && cuestPendientes.length === 0 && clientesIAPendiente.length === 0 && d.activos.length > 0 && (
                  <div className="px-5 py-8 text-center">
                    <p className="text-3xl mb-2">✨</p>
                    <p className="text-sm font-semibold text-[#0A0A0A]">Todo al día</p>
                    <p className="text-xs text-[#9B9B9B] mt-1">Sin tareas pendientes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Agenda — hoy y mañana */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                <p className="text-sm font-bold text-[#0A0A0A]">
                  {sesionesHoy.length > 0 ? `Hoy — ${sesionesHoy.length} sesión${sesionesHoy.length>1?'es':''}` : 'Agenda de hoy'}
                </p>
                <button onClick={() => navigate('/agenda')} className="text-xs text-[#FF5C00] font-medium">Ver agenda →</button>
              </div>
              {sesionesHoy.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">🏖</p>
                  <p className="text-sm text-[#9B9B9B]">Sin sesiones hoy</p>
                </div>
              ) : (
                <div className="divide-y divide-black/4">
                  {sesionesHoy.map(s => {
                    const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
                    return (
                      <div key={s.id} className={`flex items-center gap-3 px-5 py-3 ${s.completada?'bg-emerald-50':''}`}>
                        <div className="w-8 h-8 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center text-[#FF5C00] font-bold text-xs flex-shrink-0">
                          {ini(s.clientes?.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0A0A0A] truncate">{s.clientes?.nombre}</p>
                          <p className="text-xs text-[#6B6B6B]">{s.hora} · {s.duracion_minutos||60}min</p>
                        </div>
                        {s.completada
                          ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium flex-shrink-0">✓</span>
                          : <span className="text-xs text-[#9B9B9B] flex-shrink-0">{s.hora}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
              {sesionesManana.length > 0 && (
                <div className="px-5 py-3 border-t border-black/5 bg-[#F9F8F6]">
                  <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-2">
                    Mañana — {sesionesManana.length} sesión{sesionesManana.length>1?'es':''}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {sesionesManana.map(s => {
                      const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
                      return (
                        <div key={s.id} className="flex items-center gap-2 bg-white border border-black/8 px-3 py-1.5 rounded-xl">
                          <span className="text-xs font-bold text-[#6366f1]">{ini(s.clientes?.nombre)}</span>
                          <span className="text-xs text-[#9B9B9B]">{s.hora}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── COLUMNA DERECHA: Números y estado ── */}
          <div className="space-y-4">

            {/* KPIs — compactos en columna */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Clientes', d.activos.length, '#FF5C00', '/clientes'],
                  ['Ingresos', `${d.ingresosMes.toFixed(0)}€`, '#10b981', '/pagos'],
                  ['Sesiones hoy', sesionesHoy.length, '#6366f1', '/agenda'],
                  ['Adherencia', d.adherenciaMedia !== null ? `${d.adherenciaMedia}%` : '—', '#f59e0b', '/seguimiento'],
                ].map(([l,v,c,ruta]) => (
                  <button key={l} onClick={() => navigate(ruta)}
                    className="bg-[#F7F6F3] hover:bg-[#EEECEA] rounded-xl p-3 text-left transition-all">
                    <p className="text-lg font-bold" style={{color:c}}>{v}</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">{l}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Ingresos 6 meses */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#0A0A0A]">Ingresos 6 meses</p>
                <p className="text-xs text-[#9B9B9B]">{d.ingresosPorMes.reduce((s,m)=>s+m.valor,0)}€</p>
              </div>
              <BarChart datos={d.ingresosPorMes} max={d.maxIngreso} />
            </div>

            {/* Mix online / presencial */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
              <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-3">Clientes</p>
              <div className="space-y-2">
                {[
                  ['Total activos', d.activos.length, '#0A0A0A'],
                  ['Online', d.activos.filter(c=>c.tipo==='online').length, '#FF5C00'],
                  ['Presencial', d.activos.filter(c=>c.tipo!=='online').length, '#6366f1'],
                  ['Retención', `${d.tasaRetencion}%`, '#10b981'],
                ].map(([l,v,c]) => (
                  <div key={l} className="flex items-center justify-between">
                    <p className="text-xs text-[#6B6B6B]">{l}</p>
                    <p className="text-sm font-bold" style={{color:c}}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
