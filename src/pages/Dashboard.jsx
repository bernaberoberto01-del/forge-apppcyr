import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Dashboard({ session }) {
  const [data, setData] = useState({ activos: 0, ingresos: 0, pendentes: 0, vencidos: 0 })
  const [alertas, setAlertas] = useState([])
  const [clientes, setClientes] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    if (!session) return
    const uid = session.user.id
    const mes = new Date().getMonth() + 1
    const anio = new Date().getFullYear()

    async function load() {
      const [{ data: cl }, { data: pg }, { data: ci }] = await Promise.all([
        supabase.from('clientes').select('*').eq('entrenador_id', uid),
        supabase.from('pagos').select('*').eq('entrenador_id', uid),
        supabase.from('checkins').select('*').eq('entrenador_id', uid),
      ])

      const activos = cl?.filter(c => c.estado === 'activo').length || 0
      const hoy = new Date()
      const inicioMes = new Date(anio, mes - 1, 1).toISOString().split('T')[0]
      const ingresos = pg?.filter(p => p.fecha_pago >= inicioMes).reduce((s, p) => s + Number(p.importe), 0) || 0
      const vencidos = pg?.filter(p => p.valido_hasta && new Date(p.valido_hasta) < hoy).length || 0

      const hace7 = new Date(hoy - 7 * 86400000)
      const clientesSinCI = cl?.filter(c => {
        if (c.estado !== 'activo') return false
        const ults = ci?.filter(x => x.cliente_id === c.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        if (!ults?.length) return true
        return new Date(ults[0].fecha) < hace7
      }) || []

      const als = []
      pg?.filter(p => p.valido_hasta && new Date(p.valido_hasta) < hoy).forEach(p => {
        const c = cl?.find(x => x.id === p.cliente_id)
        if (c) als.push({ tipo: 'pago', nombre: c.nombre, msg: 'Pago vencido' })
      })
      clientesSinCI.forEach(c => als.push({ tipo: 'ci', nombre: c.nombre, msg: 'Sin seguimiento +7 días' }))
      ci?.filter(c => c.estres >= 4).forEach(c => {
        const cl2 = cl?.find(x => x.id === c.cliente_id)
        if (cl2) als.push({ tipo: 'estres', nombre: cl2.nombre, msg: 'Estrés alto reportado' })
      })

      setData({ activos, ingresos, pendentes: clientesSinCI.length, vencidos })
      setAlertas(als)
      setClientes(cl?.filter(c => c.estado === 'activo').slice(0, 5) || [])
    }
    load()
  }, [session])

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = session?.user?.email?.split('@')[0] || ''
  const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const metricas = [
    { label: 'Clientes activos', valor: data.activos, color: 'text-orange-500' },
    { label: 'Ingresos este mes', valor: `${data.ingresos}€`, color: 'text-green-600' },
    { label: 'Seguimientos pendientes', valor: data.pendentes, color: 'text-amber-500' },
    { label: 'Pagos vencidos', valor: data.vencidos, color: 'text-red-500' },
  ]

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#111]">{saludo}, {nombre} 👋</h1>
        <p className="text-sm text-gray-500 capitalize">{fecha}</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {metricas.map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className={`text-2xl font-bold ${m.color}`}>{m.valor}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <h2 className="text-sm font-semibold text-[#111] mb-3">Alertas</h2>
        {alertas.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <span>✓</span> Todo al día
          </div>
        ) : (
          <div className="space-y-2">
            {alertas.slice(0, 5).map((a, i) => (
              <div key={i} onClick={() => navigate(a.tipo === 'pago' ? '/pagos' : '/seguimiento')}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer text-sm ${
                  a.tipo === 'pago' ? 'bg-red-50 text-red-700' :
                  a.tipo === 'estres' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                }`}>
                <span>{a.tipo === 'pago' ? '⚠️' : a.tipo === 'estres' ? '⚡' : '📋'}</span>
                <span><strong>{a.nombre}</strong> · {a.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clientes recientes */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-[#111] mb-3">Clientes activos</h2>
        {clientes.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no tienes clientes activos</p>
        ) : (
          <div className="space-y-2">
            {clientes.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2">
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
        )}
      </div>
    </div>
  )
}
