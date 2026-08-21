import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const uid = session.user.id

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
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
    ])

    if (alertas?.length > 0) {
      await supabase.from('alertas').update({ leida:true }).eq('entrenador_id', uid).eq('leida', false)
      window.dispatchEvent(new Event('alertas-leidas'))
    }

    setSesionesHoy(sesHoy || [])
    setSesionesManana(sesManana || [])
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
      alertasExtra: alertas||[], tasaRetencion, totalClientes
    })
    setLoading(false)
  }

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || 'Roberto'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const d = datos
  const totalPendiente = d.mensajesNL.length + d.clientesSinCI.length + d.rutinasIA.length + d.alertasPagos.length

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-screen-xl mx-auto space-y-5">

        {/* Saludo + resumen */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0A0A0A]">{saludo}, {nombre} 👋</h1>
            <p className="text-sm text-[#6B6B6B] mt-0.5 capitalize">
              {new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
            </p>
          </div>
          {totalPendiente > 0 && (
            <div className="bg-[#FF5C00] text-white text-sm font-bold px-3 py-1.5 rounded-full flex-shrink-0">
              {totalPendiente} pendiente{totalPendiente > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Clientes activos', d.activos.length, '#FF5C00', '/clientes', '👥'],
            ['Ingresos mes',     `${d.ingresosMes.toFixed(0)}€`, '#10b981', '/pagos', '💶'],
            ['Sesiones hoy',    sesionesHoy.length, '#6366f1', '/agenda', '📅'],
            ['Adherencia 4s',   d.adherenciaMedia !== null ? `${d.adherenciaMedia}%` : '—', '#f59e0b', '/seguimiento', '📊'],
          ].map(([l,v,c,ruta,ic]) => (
            <button key={l} onClick={() => navigate(ruta)}
              className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 text-left hover:shadow-md hover:border-[#FF5C00]/20 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{ic}</span>
                <span className="text-xs text-[#9B9B9B] group-hover:text-[#FF5C00]">→</span>
              </div>
              <p className="text-2xl font-bold" style={{color:c}}>{v}</p>
              <p className="text-xs text-[#6B6B6B] mt-1 leading-tight">{l}</p>
            </button>
          ))}
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Columna izquierda — Panel de control diario */}
          <div className="lg:col-span-2 space-y-4">

            {/* ── PANEL DE CONTROL DIARIO ── */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                <p className="font-bold text-[#0A0A0A]">Panel de control</p>
                {totalPendiente === 0 && <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">✓ Todo al día</span>}
              </div>

              <div className="divide-y divide-black/4">

                {/* Mensajes sin leer */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">✉️</span>
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">Mensajes sin leer</p>
                        {d.mensajesNL.length > 0
                          ? <p className="text-xs text-[#6B6B6B] mt-0.5">{d.mensajesNL.slice(0,2).map(m=>m.clientes?.nombre?.split(' ')[0]).join(', ')}{d.mensajesNL.length>2?` y ${d.mensajesNL.length-2} más`:''}</p>
                          : <p className="text-xs text-emerald-600 mt-0.5">Sin mensajes nuevos</p>}
                      </div>
                    </div>
                    {d.mensajesNL.length > 0
                      ? <button onClick={()=>navigate('/mensajes')} className="text-xs bg-[#FF5C00] text-white font-semibold px-3 py-1.5 rounded-xl hover:bg-[#e05200] transition-all flex-shrink-0">
                          Ver {d.mensajesNL.length} →
                        </button>
                      : <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">✓</span>}
                  </div>
                </div>

                {/* Check-ins sin responder */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">📋</span>
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">Check-ins esta semana</p>
                        {d.clientesSinCI.length > 0
                          ? <p className="text-xs text-amber-600 mt-0.5">{d.clientesSinCI.length} cliente{d.clientesSinCI.length>1?'s':''} sin check-in: {d.clientesSinCI.slice(0,2).map(c=>c.nombre.split(' ')[0]).join(', ')}</p>
                          : <p className="text-xs text-emerald-600 mt-0.5">Todos los clientes han hecho check-in</p>}
                      </div>
                    </div>
                    {d.clientesSinCI.length > 0
                      ? <button onClick={()=>navigate('/seguimiento')} className="text-xs bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-xl hover:bg-amber-600 transition-all flex-shrink-0">
                          Ver →
                        </button>
                      : <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">✓</span>}
                  </div>
                </div>

                {/* Rutinas con borrador IA */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🤖</span>
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">Rutinas por revisar</p>
                        {d.rutinasIA.length > 0
                          ? <p className="text-xs text-[#6366f1] mt-0.5">{d.rutinasIA.length} borrador{d.rutinasIA.length>1?'es':''} de IA esperando tu revisión</p>
                          : <p className="text-xs text-emerald-600 mt-0.5">Sin borradores pendientes</p>}
                      </div>
                    </div>
                    {d.rutinasIA.length > 0
                      ? <button onClick={()=>navigate('/rutinas?filtro=borrador')} className="text-xs bg-[#6366f1] text-white font-semibold px-3 py-1.5 rounded-xl hover:bg-[#5558e8] transition-all flex-shrink-0">
                          Revisar →
                        </button>
                      : <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">✓</span>}
                  </div>
                </div>

                {/* Cobros */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">💳</span>
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">Cobros</p>
                        {d.alertasPagos.length > 0
                          ? <p className="text-xs text-red-600 mt-0.5">{d.alertasPagos.length} pago{d.alertasPagos.length>1?'s':''} vencido{d.alertasPagos.length>1?'s':''}: {d.alertasPagos.slice(0,2).map(c=>c.nombre.split(' ')[0]).join(', ')}</p>
                          : d.cobrosProximos.length > 0
                          ? <p className="text-xs text-amber-600 mt-0.5">{d.cobrosProximos.length} cobro{d.cobrosProximos.length>1?'s':''} próximo{d.cobrosProximos.length>1?'s':''} esta semana</p>
                          : <p className="text-xs text-emerald-600 mt-0.5">Sin cobros pendientes</p>}
                      </div>
                    </div>
                    {(d.alertasPagos.length > 0 || d.cobrosProximos.length > 0)
                      ? <button onClick={()=>navigate('/pagos')} className={`text-xs text-white font-semibold px-3 py-1.5 rounded-xl transition-all flex-shrink-0 ${d.alertasPagos.length>0?'bg-red-500 hover:bg-red-600':'bg-amber-500 hover:bg-amber-600'}`}>
                          Ver →
                        </button>
                      : <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">✓</span>}
                  </div>
                </div>

              </div>
            </div>

            {/* Sesiones de hoy */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#0A0A0A]">
                  {sesionesHoy.length > 0 ? `Hoy — ${sesionesHoy.length} sesión${sesionesHoy.length>1?'es':''}` : 'Agenda de hoy'}
                </p>
                <button onClick={()=>navigate('/agenda')} className="text-xs text-[#FF5C00] font-medium hover:underline">Ver agenda →</button>
              </div>
              {sesionesHoy.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-2xl mb-2">🏖</p>
                  <p className="text-sm text-[#9B9B9B]">Sin sesiones programadas hoy</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sesionesHoy.map(s => {
                    const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
                    return (
                      <div key={s.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${s.completada?'bg-emerald-50 border border-emerald-100':'bg-[#F5F5F0]'}`}>
                        <div className="w-8 h-8 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center text-[#FF5C00] font-bold text-xs flex-shrink-0">
                          {ini(s.clientes?.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0A0A0A] truncate">{s.clientes?.nombre}</p>
                          <p className="text-xs text-[#6B6B6B]">{s.hora} · {s.duracion_minutos||60}min</p>
                        </div>
                        {s.completada
                          ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium flex-shrink-0">✓</span>
                          : <span className="text-xs text-[#9B9B9B] flex-shrink-0 font-medium">{s.hora}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Mañana */}
              {sesionesManana.length > 0 && (
                <div className="mt-3 pt-3 border-t border-black/5">
                  <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-2">
                    Mañana — {sesionesManana.length} sesión{sesionesManana.length>1?'es':''}
                  </p>
                  <div className="space-y-1.5">
                    {sesionesManana.map(s => {
                      const ini2 = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
                      return (
                        <div key={s.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F7F6F3]">
                          <div className="w-7 h-7 bg-[#6366f1]/10 rounded-lg flex items-center justify-center text-[#6366f1] font-bold text-xs flex-shrink-0">
                            {ini2(s.clientes?.nombre)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#0A0A0A] truncate">{s.clientes?.nombre}</p>
                          </div>
                          <span className="text-xs text-[#9B9B9B] flex-shrink-0">{s.hora}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha */}
          <div className="space-y-4">

            {/* Gráfica ingresos */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-[#0A0A0A]">Ingresos 6 meses</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">{d.ingresosPorMes.reduce((s,m)=>s+m.valor,0)}€ total</p>
                </div>
                <button onClick={()=>navigate('/pagos')} className="text-xs text-[#FF5C00] font-medium hover:underline">Ver →</button>
              </div>
              <BarChart datos={d.ingresosPorMes} max={d.maxIngreso} />
            </div>

            {/* Estado clientes */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
              <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-3">Estado clientes</p>
              <div className="space-y-2.5">
                {[
                  ['Activos', d.activos.length, '#10b981'],
                  ['Retención', `${d.tasaRetencion}%`, '#6366f1'],
                  ['Online', d.activos.filter(c=>c.tipo==='online').length, '#0A0A0A'],
                  ['Presencial', d.activos.filter(c=>c.tipo!=='online').length, '#0A0A0A'],
                ].map(([l,v,c]) => (
                  <div key={l} className="flex items-center justify-between">
                    <p className="text-xs text-[#6B6B6B]">{l}</p>
                    <p className="text-sm font-bold" style={{color:c}}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
              <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-3">Accesos rápidos</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Agenda', '📅', '/agenda'],
                  ['Clientes', '👤', '/clientes'],
                  ['Mensajes', '✉️', '/mensajes'],
                  ['Seguimiento', '📋', '/seguimiento'],
                ].map(([l,ic,ruta]) => (
                  <button key={l} onClick={()=>navigate(ruta)}
                    className="flex flex-col items-center gap-1.5 p-3 bg-[#F7F6F3] rounded-xl hover:bg-[#EEECEA] transition-all">
                    <span className="text-xl">{ic}</span>
                    <p className="text-xs font-medium text-[#6B6B6B] text-center">{l}</p>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
