import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Dashboard({ session }) {
  const [stats, setStats] = useState({ activos: 0, ingresos: 0, pendientes: 0, vencidos: 0 })
  const [alertas, setAlertas] = useState([])
  const [clientes, setClientes] = useState([])
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
        supabase.from('alertas').select('*, clientes(nombre)').eq('entrenador_id', uid).eq('leida', false).order('created_at', { ascending: false }).limit(10),
      ])

      const activos = cl?.filter(c => c.estado === 'activo').length || 0
      const ingresos = pg?.filter(p => p.fecha_pago >= inicioMes).reduce((s, p) => s + Number(p.importe), 0) || 0
      const vencidos = pg?.filter(p => p.valido_hasta && new Date(p.valido_hasta) < hoy).length || 0
      const sinCI = cl?.filter(c => {
        if (c.estado !== 'activo') return false
        const u = ci?.filter(x => x.cliente_id === c.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        return !u?.length || new Date(u[0].fecha) < hace7
      }) || []

      // Combinar alertas del sistema + alertas manuales
      const alertasManuales = []
      pg?.filter(p => p.valido_hasta && new Date(p.valido_hasta) < hoy).forEach(p => {
        const c = cl?.find(x => x.id === p.cliente_id)
        if (c) alertasManuales.push({ tipo: 'pago', nombre: c.nombre, msg: 'Pago vencido', nav: '/pagos', color: 'bg-red-50 text-red-700' })
      })
      sinCI.forEach(c => alertasManuales.push({ tipo: 'ci', nombre: c.nombre, msg: 'Sin seguimiento +7 días', nav: '/seguimiento', color: 'bg-blue-50 text-blue-700' }))

      // Alertas automáticas del sistema
      const alertasSistema = (al || []).map(a => ({
        id: a.id,
        tipo: a.tipo,
        nombre: a.clientes?.nombre || '',
        msg: a.mensaje,
        nav: a.tipo === 'rutina_lista' ? '/rutinas' : a.tipo === 'resumen_listo' ? '/clientes' : '/seguimiento',
        color: a.tipo === 'fatiga_alta' ? 'bg-red-50 text-red-700' :
               a.tipo === 'abandono' ? 'bg-amber-50 text-amber-700' :
               a.tipo === 'rutina_lista' ? 'bg-green-50 text-green-700' :
               'bg-blue-50 text-blue-700',
        icon: a.tipo === 'fatiga_alta' ? '⚡' :
              a.tipo === 'abandono' ? '👻' :
              a.tipo === 'rutina_lista' ? '💪' :
              a.tipo === 'resumen_listo' ? '📊' : '📋'
      }))

      setStats({ activos, ingresos, pendientes: sinCI.length, vencidos })
      setAlertas([...alertasSistema, ...alertasManuales])
      setClientes(cl?.filter(c => c.estado === 'activo').slice(0, 5) || [])
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

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#111]">{saludo}, {nombre} 👋</h1>
        <p className="text-sm text-gray-500 capitalize">{fecha}</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          ['Clientes activos', stats.activos, 'text-orange-500', '/clientes'],
          ['Ingresos mes', `${stats.ingresos}€`, 'text-green-600', '/pagos'],
          ['Sin seguimiento', stats.pendientes, 'text-amber-500', '/seguimiento'],
          ['Pagos vencidos', stats.vencidos, 'text-red-500', '/pagos'],
        ].map(([l, v, c, nav]) => (
          <div key={l} onClick={() => navigate(nav)} className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-orange-200 transition-colors">
            <p className={`text-2xl font-bold ${c}`}>{v}</p>
            <p className="text-xs text-gray-500 mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <h2 className="text-sm font-semibold text-[#111] mb-3">
          Alertas
          {alertas.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{alertas.length}</span>}
        </h2>
        {alertas.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 text-sm"><span>✓</span> Todo al día</div>
        ) : (
          <div className="space-y-2">
            {alertas.slice(0, 6).map((a, i) => (
              <div key={a.id || i} className={`flex items-start gap-3 p-2.5 rounded-xl ${a.color}`}>
                <span className="text-base flex-shrink-0 mt-0.5">{a.icon || '⚠️'}</span>
                <div className="flex-1 min-w-0" onClick={() => navigate(a.nav)}>
                  <p className="text-sm font-medium cursor-pointer">{a.nombre && <strong>{a.nombre} · </strong>}{a.msg}</p>
                </div>
                {a.id && (
                  <button onClick={() => marcarLeida(a.id)} className="text-xs opacity-60 hover:opacity-100 flex-shrink-0">✓</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clientes activos */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-[#111] mb-3">Clientes activos</h2>
        {clientes.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no tienes clientes activos</p>
        ) : clientes.map(c => (
          <div key={c.id} onClick={() => navigate('/clientes')} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {c.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-[#111]">{c.nombre}</p>
              <p className="text-xs text-gray-400">{c.tipo === 'online' ? '🌐 Online' : '📍 Presencial'} · {c.objetivo?.replace(/_/g, ' ')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
