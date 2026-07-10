import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Dashboard({ session }) {
  const [stats, setStats] = useState({ activos: 0, ingresos: 0, pendientes: 0, vencidos: 0 })
  const [alertas, setAlertas] = useState([])
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()
  const uid = session.user.id

  useEffect(() => {
    async function load() {
      const hoy = new Date()
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
      const hace7 = new Date(hoy - 7 * 864e5)

      const [{ data: cl }, { data: pg }, { data: ci }, { data: al }] = await Promise.all([
        supabase.from('clientes').select('*').eq('entrenador_id', uid),
        supabase.from('pagos').select('*').eq('entrenador_id', uid),
        supabase.from('checkins').select('*').eq('entrenador_id', uid),
        supabase.from('alertas').select('*, clientes(nombre)').eq('entrenador_id', uid).eq('leida', false).order('created_at', { ascending: false }).limit(8),
      ])

      const activos = cl?.filter(c => c.estado === 'activo').length || 0
      const ingresos = pg?.filter(p => p.fecha_pago >= inicioMes).reduce((s, p) => s + Number(p.importe), 0) || 0
      const vencidos = pg?.filter(p => p.valido_hasta && new Date(p.valido_hasta) < hoy).length || 0
      const sinCI = cl?.filter(c => {
        if (c.estado !== 'activo') return false
        const u = ci?.filter(x => x.cliente_id === c.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        return !u?.length || new Date(u[0].fecha) < hace7
      }) || []

      const als = []
      pg?.filter(p => p.valido_hasta && new Date(p.valido_hasta) < hoy).forEach(p => {
        const c = cl?.find(x => x.id === p.cliente_id)
        if (c) als.push({ tipo: 'pago', nombre: c.nombre, msg: 'Pago vencido', nav: '/pagos' })
      })
      sinCI.forEach(c => als.push({ tipo: 'ci', nombre: c.nombre, msg: 'Sin seguimiento +7 días', nav: '/seguimiento' }));
      (al || []).forEach(a => als.push({
        id: a.id, tipo: a.tipo, nombre: a.clientes?.nombre || '', msg: a.mensaje,
        nav: a.tipo === 'rutina_lista' ? '/rutinas' : '/seguimiento'
      }))

      setStats({ activos, ingresos, pendientes: sinCI.length, vencidos })
      setAlertas(als.slice(0, 5))
      setClientes(cl?.filter(c => c.estado === 'activo').slice(0, 6) || [])
      setCargando(false)
    }
    load()
  }, [uid])

  const marcarLeida = async (id) => {
    if (id) await supabase.from('alertas').update({ leida: true }).eq('id', id)
    setAlertas(a => a.filter(x => x.id !== id))
  }

  const h = new Date().getHours()
  const saludo = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = session?.user?.email?.split('@')[0] || ''
  const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const metricas = [
    { label: 'Clientes activos', valor: stats.activos, color: '#FF5C00', nav: '/clientes', icon: '👥' },
    { label: 'Ingresos del mes', valor: `${stats.ingresos}€`, color: '#10b981', nav: '/pagos', icon: '€' },
    { label: 'Sin seguimiento', valor: stats.pendientes, color: '#f59e0b', nav: '/seguimiento', icon: '📋' },
    { label: 'Pagos vencidos', valor: stats.vencidos, color: '#ef4444', nav: '/pagos', icon: '⚠️' },
  ]

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 pt-2">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">{saludo}, {nombre} 👋</h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5 capitalize">{fecha}</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {metricas.map(m => (
          <div key={m.label} onClick={() => navigate(m.nav)}
            className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 cursor-pointer hover:shadow-md transition-all active:scale-98">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xl">{m.icon}</span>
              <div className="w-2 h-2 rounded-full mt-1" style={{ background: m.color }} />
            </div>
            <p className="text-2xl font-bold text-[#0A0A0A]" style={{ color: m.color }}>{m.valor}</p>
            <p className="text-xs text-[#6B6B6B] mt-1 leading-tight">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Alertas */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#0A0A0A]">Alertas</h2>
            {alertas.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{alertas.length}</span>
            )}
          </div>
          {alertas.length === 0 ? (
            <div className="flex items-center gap-3 py-3">
              <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 flex-shrink-0">✓</div>
              <p className="text-sm text-[#6B6B6B]">Todo al día, sin alertas pendientes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((a, i) => (
                <div key={a.id || i}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    a.tipo === 'pago' || a.tipo === 'pago_vencido' ? 'bg-red-50 hover:bg-red-100' :
                    a.tipo === 'fatiga_alta' ? 'bg-amber-50 hover:bg-amber-100' :
                    a.tipo === 'rutina_lista' ? 'bg-emerald-50 hover:bg-emerald-100' :
                    'bg-blue-50 hover:bg-blue-100'
                  }`}
                  onClick={() => navigate(a.nav)}>
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {a.tipo === 'pago' || a.tipo === 'pago_vencido' ? '⚠️' :
                     a.tipo === 'fatiga_alta' ? '⚡' :
                     a.tipo === 'rutina_lista' ? '💪' :
                     a.tipo === 'abandono' ? '👻' : '📋'}
                  </span>
                  <div className="flex-1 min-w-0">
                    {a.nombre && <p className="text-xs font-semibold text-[#0A0A0A]">{a.nombre}</p>}
                    <p className="text-xs text-[#6B6B6B] leading-relaxed">{a.msg}</p>
                  </div>
                  {a.id && (
                    <button onClick={e => { e.stopPropagation(); marcarLeida(a.id) }}
                      className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] flex-shrink-0 p-1">✓</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clientes activos */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#0A0A0A]">Clientes activos</h2>
            <button onClick={() => navigate('/clientes')} className="text-xs text-[#FF5C00] font-medium">Ver todos →</button>
          </div>
          {clientes.length === 0 ? (
            <div className="py-3 text-center">
              <p className="text-sm text-[#6B6B6B]">Sin clientes activos todavía</p>
              <button onClick={() => navigate('/clientes')} className="mt-2 text-xs text-[#FF5C00] font-medium">+ Añadir cliente</button>
            </div>
          ) : (
            <div className="space-y-2">
              {clientes.map(c => (
                <div key={c.id} onClick={() => navigate('/clientes')}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/3 cursor-pointer transition-all">
                  <div className="w-8 h-8 bg-[#FF5C00] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">{c.nombre}</p>
                    <p className="text-xs text-[#6B6B6B]">{c.tipo === 'online' ? '🌐 Online' : '📍 Presencial'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.objetivo === 'perdida_grasa' ? 'bg-orange-50 text-orange-700' :
                    c.objetivo === 'ganancia_muscular' ? 'bg-blue-50 text-blue-700' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {c.objetivo?.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
