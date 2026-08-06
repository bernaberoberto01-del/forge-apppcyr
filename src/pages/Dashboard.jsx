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
  const navigate = useNavigate()
  const uid = session.user.id

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const hoy = new Date()
    const hace6m = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1).toISOString().split('T')[0]
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
    const inicioSemana = (() => { const d = new Date(); d.setDate(d.getDate()-((d.getDay()||7)-1)); return d.toISOString().split('T')[0] })()

    const [
      { data: clientes },
      { data: pagos },
      { data: sesiones },
      { data: checkins },
      { data: alertas },
    ] = await Promise.all([
      supabase.from('clientes').select('id,nombre,objetivo,tipo,nivel,estado,precio_mensual').eq('entrenador_id', uid),
      supabase.from('pagos').select('importe,fecha_pago,cliente_id,valido_hasta').eq('entrenador_id', uid).gte('fecha_pago', hace6m),
      supabase.from('sesiones').select('id,fecha,completada,cliente_id,duracion_minutos').eq('entrenador_id', uid).gte('fecha', inicioSemana),
      supabase.from('checkins').select('cliente_id,fecha,adherencia_entreno,energia,fatiga').eq('entrenador_id', uid).gte('fecha', hace6m).order('fecha', { ascending: false }),
      supabase.from('alertas').select('*').eq('entrenador_id', uid).eq('leida', false).order('created_at', { ascending: false }).limit(10),
    ])

    // Marcar todas las alertas como leídas al abrir el Dashboard
    if (alertas?.length > 0) {
      await supabase.from('alertas').update({ leida: true }).eq('entrenador_id', uid).eq('leida', false)
      window.dispatchEvent(new Event('alertas-leidas'))
    }

    const activos = (clientes||[]).filter(c => c.estado === 'activo')
    const ingresosMes = (pagos||[]).filter(p => p.fecha_pago >= inicioMes).reduce((s,p) => s+Number(p.importe||0), 0)
    // Sesiones de hoy con datos de cliente
    const { data: sesHoy } = await supabase.from('sesiones').select('*, clientes(nombre,tipo)')
      .eq('entrenador_id', uid).eq('fecha', hoy).eq('cancelada', false).order('hora')
    setSesionesHoy(sesHoy || [])
    const sesioneHoy = (sesiones||[]).filter(s => s.fecha === hoy.toISOString().split('T')[0])
    
    // Adherencia: media de check-ins de últimas 4 semanas
    const hace4s = new Date(Date.now()-28*864e5).toISOString().split('T')[0]
    const ciRecientes = (checkins||[]).filter(c => c.fecha >= hace4s)
    const adherenciaMedia = ciRecientes.length > 0
      ? Math.round(ciRecientes.reduce((s,c) => s+(c.adherencia_entreno||0),0) / ciRecientes.length * 10)
      : null

    // Ingresos últimos 6 meses
    const ingresosPorMes = Array.from({length:6},(_,i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth()-5+i, 1)
      const mesStr = d.toISOString().slice(0,7)
      const total = (pagos||[]).filter(p => p.fecha_pago?.startsWith(mesStr)).reduce((s,p) => s+Number(p.importe||0),0)
      return { mes: MESES[d.getMonth()], valor: Math.round(total) }
    })
    const maxIngreso = Math.max(...ingresosPorMes.map(m => m.valor), 1)

    // Alertas: pagos vencidos
    const alertasPagos = (clientes||[]).filter(c => {
      const ultimoPago = (pagos||[]).filter(p => p.cliente_id === c.id).sort((a,b) => b.fecha_pago?.localeCompare(a.fecha_pago))[0]
      if (!ultimoPago?.valido_hasta) return false
      return new Date(ultimoPago.valido_hasta) < hoy
    })

    // Check-ins sin responder
    const hace7d = new Date(Date.now()-7*864e5).toISOString().split('T')[0]
    const clientesSinCI = activos.filter(c => !ciRecientes.some(ci => ci.cliente_id === c.id && ci.fecha >= hace7d))

    // Tasa retención (clientes activos / total clientes alguna vez)
    const totalClientes = (clientes||[]).length
    const tasaRetencion = totalClientes > 0 ? Math.round((activos.length / totalClientes) * 100) : 100

    setDatos({
      activos, ingresosMes, sesioneHoy, adherenciaMedia,
      ingresosPorMes, maxIngreso,
      alertasPagos, clientesSinCI,
      alertasExtra: alertas || [],
      tasaRetencion, totalClientes
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4 max-w-screen-xl mx-auto">

        {/* Saludo */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0A0A0A]">{saludo}, {nombre} 👋</h1>
            <p className="text-sm text-[#6B6B6B] mt-0.5 capitalize">
              {new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
            </p>
          </div>
        </div>

        {/* KPIs — 4 columnas siempre */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Clientes activos', d.activos.length, '#FF5C00', '/clientes', '👥'],
            ['Ingresos mes', `${d.ingresosMes.toFixed(0)}€`, '#10b981', '/pagos', '💶'],
            ['Sesiones hoy', sesionesHoy.length, '#6366f1', '/agenda', '📅'],
            ['Adherencia 4s', d.adherenciaMedia !== null ? `${d.adherenciaMedia}%` : '—', '#f59e0b', '/seguimiento', '📊'],
          ].map(([l,v,c,ruta,ic]) => (
            <button key={l} onClick={() => navigate(ruta)}
              className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 text-left hover:shadow-md hover:border-[#FF5C00]/20 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{ic}</span>
                <span className="text-xs text-[#9B9B9B] group-hover:text-[#FF5C00] transition-colors">→</span>
              </div>
              <p className="text-2xl font-bold" style={{color:c}}>{v}</p>
              <p className="text-xs text-[#6B6B6B] mt-1 leading-tight">{l}</p>
            </button>
          ))}
        </div>

        {/* Grid principal — 3 columnas en escritorio */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Sesiones de hoy — col 2 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#0A0A0A]">
                  {sesionesHoy.length > 0 ? `Hoy — ${sesionesHoy.length} sesiones` : 'Agenda de hoy'}
                </p>
                <button onClick={() => navigate('/agenda')} className="text-xs text-[#FF5C00] font-medium hover:underline">Ver agenda →</button>
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
                      <div key={s.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${s.completada ? 'bg-emerald-50 border border-emerald-100' : 'bg-[#F5F5F0]'}`}>
                        <div className="w-8 h-8 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center text-[#FF5C00] font-bold text-xs flex-shrink-0">
                          {ini(s.clientes?.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0A0A0A] truncate">{s.clientes?.nombre}</p>
                          <p className="text-xs text-[#6B6B6B]">{s.hora} · {s.duracion_minutos||60}min</p>
                        </div>
                        {s.completada
                          ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium flex-shrink-0">✓</span>
                          : <span className="text-xs text-[#9B9B9B] flex-shrink-0">{s.hora}</span>
                        }
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Gráfica ingresos */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-[#0A0A0A]">Ingresos últimos 6 meses</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">Total: {d.ingresosPorMes.reduce((s,m)=>s+m.valor,0)}€</p>
                </div>
                <button onClick={() => navigate('/pagos')} className="text-xs text-[#FF5C00] font-medium hover:underline">Ver pagos →</button>
              </div>
              <BarChart datos={d.ingresosPorMes} max={d.maxIngreso} />
            </div>
          </div>

          {/* Columna derecha — alertas y estado clientes */}
          <div className="space-y-4">

            {/* Alertas */}
            {(d.alertasPagos.length > 0 || d.clientesSinCI.length > 0 || d.alertasExtra.length > 0) ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 space-y-2">
                <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wide mb-3">⚠ Requieren atención</p>
                {d.alertasPagos.slice(0,2).map(c => (
                  <button key={c.id} onClick={() => navigate('/pagos')}
                    className="w-full bg-red-50 border border-red-100 rounded-xl p-3 text-left flex items-center gap-3 hover:bg-red-100 transition-all">
                    <span className="text-base flex-shrink-0">💳</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-red-700 truncate">{c.nombre}</p>
                      <p className="text-xs text-red-500">Pago vencido</p>
                    </div>
                  </button>
                ))}
                {d.clientesSinCI.slice(0,3).map(c => (
                  <button key={c.id} onClick={() => navigate('/seguimiento')}
                    className="w-full bg-amber-50 border border-amber-100 rounded-xl p-3 text-left flex items-center gap-3 hover:bg-amber-100 transition-all">
                    <span className="text-base flex-shrink-0">📋</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-700 truncate">{c.nombre}</p>
                      <p className="text-xs text-amber-600">Sin check-in esta semana</p>
                    </div>
                  </button>
                ))}
                {d.alertasExtra.slice(0,2).map(a => (
                  <div key={a.id} className="bg-[#F5F5F0] rounded-xl p-3 flex items-start gap-2">
                    <span className="text-sm flex-shrink-0">🔔</span>
                    <p className="text-xs text-[#444] leading-relaxed">{a.mensaje}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm font-semibold text-[#0A0A0A]">Todo en orden</p>
                <p className="text-xs text-[#9B9B9B] mt-0.5">Sin alertas pendientes</p>
              </div>
            )}

            {/* Estado clientes */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
              <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wide mb-3">Estado clientes</p>
              <div className="space-y-2.5">
                {[
                  ['Activos', d.activos.length, '#10b981'],
                  ['Retención', `${d.tasaRetencion}%`, '#6366f1'],
                  ['Total histórico', d.totalClientes, '#9B9B9B'],
                ].map(([l,v,c]) => (
                  <div key={l} className="flex items-center justify-between">
                    <p className="text-xs text-[#6B6B6B]">{l}</p>
                    <p className="text-sm font-bold" style={{color:c}}>{v}</p>
                  </div>
                ))}
                <div className="h-px bg-black/5 my-1"/>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#6B6B6B]">Online</p>
                  <p className="text-sm font-bold text-[#0A0A0A]">{d.activos.filter(c=>c.tipo==='online').length}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#6B6B6B]">Presencial</p>
                  <p className="text-sm font-bold text-[#0A0A0A]">{d.activos.filter(c=>c.tipo!=='online').length}</p>
                </div>
              </div>
            </div>

            {/* Accesos directos */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
              <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wide mb-3">Accesos rápidos</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Nueva sesión', '📅', '/agenda'],
                  ['Nuevo cliente', '👤', '/clientes'],
                  ['Mensajes', '✉️', '/mensajes'],
                  ['Seguimiento', '📋', '/seguimiento'],
                ].map(([l,ic,ruta]) => (
                  <button key={l} onClick={() => navigate(ruta)}
                    className="flex flex-col items-center gap-1.5 p-3 bg-[#F7F6F3] rounded-xl hover:bg-[#F0EEE8] transition-all">
                    <span className="text-xl">{ic}</span>
                    <p className="text-xs font-medium text-[#6B6B6B] text-center leading-tight">{l}</p>
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
