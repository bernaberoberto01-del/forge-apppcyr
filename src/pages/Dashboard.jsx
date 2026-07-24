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
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto space-y-4">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A]">{saludo}, {nombre} 👋</h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5 capitalize">
          {new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Clientes activos', d.activos.length, '#FF5C00', '/clientes'],
          ['Ingresos mes', `${d.ingresosMes.toFixed(0)}€`, '#10b981', '/pagos'],
          ['Sesiones hoy', d.sesioneHoy.length, '#6366f1', '/agenda'],
          ['Adherencia 4s', d.adherenciaMedia !== null ? `${d.adherenciaMedia}%` : '—', '#f59e0b', '/seguimiento'],
        ].map(([l,v,c,ruta]) => (
          <button key={l} onClick={() => navigate(ruta)}
            className="bg-white rounded-xl border border-black/5 shadow-sm p-4 text-center hover:shadow-md hover:border-[#FF5C00]/20 transition-all">
            <p className="text-2xl font-bold" style={{color:c}}>{v}</p>
            <p className="text-xs text-[#6B6B6B] mt-1 leading-tight">{l}</p>
          </button>
        ))}
      </div>

      {/* Layout 2 columnas en escritorio */}
      <div className="md:grid md:grid-cols-3 md:gap-4 space-y-4 md:space-y-0">

        {/* Columna izquierda — 2/3 */}
        <div className="md:col-span-2 space-y-4">

      {/* Sesiones de hoy */}
      {sesionesHoy.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[#0A0A0A]">Hoy — {sesionesHoy.length} sesiones</p>
            <button onClick={() => navigate('/agenda')} className="text-xs text-[#FF5C00] font-medium">Ver agenda →</button>
          </div>
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
                    <p className="text-xs text-[#6B6B6B]">{s.hora} · {s.duracion_minutos||60}min · {s.tipo}</p>
                  </div>
                  {s.completada
                    ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium flex-shrink-0">✓ Hecha</span>
                    : <span className="text-xs bg-white border border-black/10 text-[#6B6B6B] px-2 py-1 rounded-full flex-shrink-0">{s.hora}</span>
                  }
                </div>
              )
            })}
          </div>
        </div>
      )}

        </div>{/* fin col-span-2 */}

        {/* Columna derecha — 1/3 */}
        <div className="space-y-4">

        {/* Gráfica ingresos */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-[#0A0A0A]">Ingresos últimos 6 meses</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">Total: {d.ingresosPorMes.reduce((s,m)=>s+m.valor,0)}€</p>
          </div>
          <button onClick={() => navigate('/pagos')} className="text-xs text-[#FF5C00] font-medium">Ver pagos →</button>
        </div>
        <BarChart datos={d.ingresosPorMes} max={d.maxIngreso} />
      </div>

      {/* Alertas */}
      {(d.alertasPagos.length > 0 || d.clientesSinCI.length > 0 || d.alertasExtra.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wide">⚠ Requieren atención</p>
          {d.alertasPagos.slice(0,3).map(c => (
            <button key={c.id} onClick={() => navigate('/pagos')}
              className="w-full bg-red-50 border border-red-100 rounded-xl p-3 text-left flex items-center gap-3 hover:bg-red-100 transition-all">
              <span className="text-lg flex-shrink-0">💳</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700 truncate">{c.nombre}</p>
                <p className="text-xs text-red-500">Pago vencido</p>
              </div>
              <span className="text-red-400 flex-shrink-0">›</span>
            </button>
          ))}
          {d.alertasPagos.length > 3 && (
            <button onClick={() => navigate('/pagos')} className="w-full text-xs text-red-600 font-semibold text-center py-1.5 hover:underline">
              +{d.alertasPagos.length - 3} pagos vencidos más →
            </button>
          )}
          {d.clientesSinCI.slice(0,3).map(c => (
            <button key={c.id} onClick={() => navigate('/seguimiento')}
              className="w-full bg-amber-50 border border-amber-100 rounded-xl p-3 text-left flex items-center gap-3 hover:bg-amber-100 transition-all">
              <span className="text-lg flex-shrink-0">📋</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-700 truncate">{c.nombre}</p>
                <p className="text-xs text-amber-500">Sin check-in esta semana</p>
              </div>
              <span className="text-amber-400 flex-shrink-0">›</span>
            </button>
          ))}
          {d.clientesSinCI.length > 3 && (
            <button onClick={() => navigate('/seguimiento')} className="w-full text-xs text-amber-600 font-semibold text-center py-1.5 hover:underline">
              +{d.clientesSinCI.length - 3} sin check-in más →
            </button>
          )}
          {d.alertasExtra.filter(a => a.tipo === 'cancelacion_sesion').slice(0,3).map(a => (
            <button key={a.id} onClick={() => navigate('/agenda')}
              className="w-full bg-orange-50 border border-orange-100 rounded-xl p-3 text-left flex items-center gap-3 hover:bg-orange-100 transition-all">
              <span className="text-lg flex-shrink-0">❌</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-700 truncate">Sesión cancelada por cliente</p>
                <p className="text-xs text-orange-500 truncate">{a.mensaje}</p>
              </div>
              <button onClick={async e => { e.stopPropagation(); await supabase.from('alertas').update({ leida: true }).eq('id', a.id); cargar() }}
                className="text-orange-300 hover:text-orange-600 text-lg flex-shrink-0">×</button>
            </button>
          ))}
          {d.alertasExtra.filter(a => a.tipo === 'cancelacion_sesion').length > 3 && (
            <button onClick={() => navigate('/agenda')} className="w-full text-xs text-orange-600 font-semibold text-center py-1.5 hover:underline">
              +{d.alertasExtra.filter(a => a.tipo === 'cancelacion_sesion').length - 3} cancelaciones más →
            </button>
          )}
        </div>
      )}

      {/* Stats secundarias */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
          <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Tasa de retención</p>
          <p className="text-2xl font-bold text-[#0A0A0A]">{d.tasaRetencion}%</p>
          <p className="text-xs text-[#6B6B6B] mt-0.5">{d.activos.length} activos de {d.totalClientes}</p>
          <div className="mt-2 h-1.5 bg-black/5 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF5C00] rounded-full" style={{width:`${d.tasaRetencion}%`}} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
          <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Sesiones hoy</p>
          {d.sesioneHoy.length === 0 ? (
            <p className="text-sm text-[#6B6B6B]">Sin sesiones programadas</p>
          ) : (
            <div className="space-y-1">
              {d.sesioneHoy.slice(0,3).map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.completada?'bg-emerald-500':'bg-[#FF5C00]'}`} />
                  <p className="text-xs text-[#0A0A0A] truncate">{s.fecha}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div>
        <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wide mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['👤', 'Nuevo cliente', '/clientes'],
            ['💪', 'Nueva rutina', '/rutinas'],
            ['📋', 'Enviar check-in', '/seguimiento'],
            ['💳', 'Registrar pago', '/pagos'],
            ['📅', 'Ver agenda', '/agenda'],
            ['💬', 'Mensajes', '/mensajes'],
          ].map(([icon, label, ruta]) => (
            <button key={label} onClick={() => navigate(ruta)}
              className="bg-white rounded-xl border border-black/5 shadow-sm p-3 text-center hover:shadow-md hover:border-[#FF5C00]/20 transition-all">
              <p className="text-2xl mb-1">{icon}</p>
              <p className="text-xs font-medium text-[#6B6B6B] leading-tight">{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Clientes activos */}
      {d.activos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wide">Clientes activos</p>
            <button onClick={() => navigate('/clientes')} className="text-xs text-[#FF5C00] font-medium">Ver todos →</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {d.activos.slice(0,6).map(c => {
              const tieneCI = d.clientesSinCI ? !d.clientesSinCI.find(x=>x.id===c.id) : true
              return (
                <button key={c.id} onClick={() => navigate('/clientes')}
                  className="bg-white rounded-xl border border-black/5 shadow-sm p-3.5 text-left flex items-center gap-3 hover:shadow-md transition-all">
                  <div className="w-9 h-9 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center text-[#FF5C00] font-bold text-sm flex-shrink-0">
                    {(c.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A0A0A] truncate">{c.nombre}</p>
                    <p className="text-xs text-[#6B6B6B]">{c.nivel} · {c.tipo}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tieneCI ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                </button>
              )
            })}
          </div>
        </div>
      )}

        </div>{/* fin col derecha */}
      </div>{/* fin grid 2 columnas */}
    </div>
  )
}
