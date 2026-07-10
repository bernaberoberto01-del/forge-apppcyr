import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PortalCliente() {
  const { clienteId } = useParams()
  const [cliente, setCliente] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('rutina')
  const [rutina, setRutina] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [pagos, setPagos] = useState([])
  const [mensajes, setMensajes] = useState([])

  useEffect(() => {
    async function cargar() {
      const { data: cl, error } = await supabase
        .from('clientes').select('*').eq('id', clienteId).single()
      if (error || !cl) { setNotFound(true); setLoading(false); return }
      setCliente(cl)

      const [{ data: ru }, { data: ci }, { data: pg }, { data: ms }] = await Promise.all([
        supabase.from('rutinas').select('*').eq('cliente_id', clienteId).eq('estado', 'publicada').order('created_at', { ascending: false }).limit(1),
        supabase.from('checkins').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }).limit(12),
        supabase.from('pagos').select('*').eq('cliente_id', clienteId).order('fecha_pago', { ascending: false }),
        supabase.from('mensajes_cliente').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }),
      ])
      setRutina(ru?.[0] || null)
      setCheckins(ci || [])
      setPagos(pg || [])
      setMensajes(ms || [])

      // Marcar mensajes como leídos
      if (ms?.length) {
        await supabase.from('mensajes_cliente').update({ leido: true }).eq('cliente_id', clienteId).eq('leido', false)
      }
      setLoading(false)
    }
    cargar()
  }, [clienteId])

  const ini = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const psStatus = p => {
    if (!p?.valido_hasta) return null
    const d = Math.ceil((new Date(p.valido_hasta) - new Date()) / 86400000)
    return d < 0 ? 'vencido' : d <= 7 ? 'pronto' : 'ok'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center"><p className="text-3xl mb-2">🔗</p><p className="text-gray-500">Enlace no válido</p></div>
    </div>
  )

  const tabs = [
    { id: 'rutina', label: '💪 Rutina' },
    { id: 'progreso', label: '📈 Progreso' },
    { id: 'checkin', label: '📋 Check-in' },
    { id: 'pagos', label: '💳 Pagos' },
    { id: 'mensajes', label: `✉️ Mensajes${mensajes.filter(m => !m.leido).length ? ` (${mensajes.filter(m => !m.leido).length})` : ''}` },
  ]

  const ultimoCI = checkins[0]
  const pesoInicial = checkins.length > 1 ? checkins[checkins.length - 1]?.peso : cliente.peso_actual
  const pesoActual = ultimoCI?.peso || cliente.peso_actual
  const diferencia = pesoInicial && pesoActual ? (pesoActual - pesoInicial).toFixed(1) : null

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <div className="bg-[#111] text-white px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-11 h-11 bg-orange-500 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
            {ini(cliente.nombre)}
          </div>
          <div>
            <h1 className="font-semibold">{cliente.nombre}</h1>
            <p className="text-xs text-gray-400">{cliente.objetivo?.replace(/_/g, ' ')} · {cliente.tipo === 'online' ? '🌐 Online' : '📍 Presencial'}</p>
          </div>
          <div className="ml-auto">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
                <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
                <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
                <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-10">

        {/* RUTINA */}
        {tab === 'rutina' && (
          <div>
            {!rutina ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                <p className="text-3xl mb-3">💪</p>
                <p className="font-medium text-[#111]">Tu rutina está en preparación</p>
                <p className="text-sm text-gray-400 mt-1">Tu entrenador está preparando tu plan personalizado</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <h2 className="font-bold text-[#111] text-lg">{rutina.contenido?.nombre || rutina.borrador?.nombre}</h2>
                  <p className="text-sm text-gray-500 mt-1">{rutina.contenido?.descripcion || rutina.borrador?.descripcion}</p>
                  <div className="flex gap-3 mt-3">
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">{rutina.semanas} semanas</span>
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">{rutina.dias_semana} días/semana</span>
                  </div>
                </div>
                {(rutina.contenido?.dias || rutina.borrador?.dias || []).map(dia => (
                  <div key={dia.dia} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="bg-[#111] px-4 py-3">
                      <h3 className="text-white font-semibold text-sm">{dia.nombre}</h3>
                      {dia.patron_principal && <p className="text-gray-400 text-xs mt-0.5">Patrón: {dia.patron_principal}</p>}
                    </div>
                    <div className="divide-y divide-gray-50">
                      {dia.ejercicios?.map((ej, i) => (
                        <div key={i} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">{ej.orden}</span>
                              <p className="text-sm font-medium text-[#111]">{ej.nombre}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-orange-500">{ej.series}×{ej.reps}</p>
                              <p className="text-xs text-gray-400">{ej.descanso}</p>
                            </div>
                          </div>
                          {ej.notas && <p className="text-xs text-gray-400 mt-1.5 ml-8 italic">{ej.notas}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {rutina.notas_entrenador && (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <p className="text-xs font-medium text-amber-700 mb-1">📝 Notas de tu entrenador</p>
                    <p className="text-sm text-amber-800">{rutina.notas_entrenador}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PROGRESO */}
        {tab === 'progreso' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className="text-xl font-bold text-orange-500">{pesoActual ? `${pesoActual}kg` : '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">Peso actual</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className="text-xl font-bold text-[#111]">{cliente.peso_objetivo ? `${cliente.peso_objetivo}kg` : '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">Objetivo</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className={`text-xl font-bold ${diferencia && Number(diferencia) < 0 ? 'text-green-600' : diferencia && Number(diferencia) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {diferencia ? `${Number(diferencia) > 0 ? '+' : ''}${diferencia}kg` : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Cambio total</p>
              </div>
            </div>

            {checkins.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-[#111] mb-3">Evolución de peso</h3>
                <div className="space-y-2">
                  {checkins.filter(c => c.peso).slice(0, 8).map((ci, i) => (
                    <div key={ci.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-16 flex-shrink-0">{new Date(ci.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(100, (ci.peso / (cliente.peso_actual || ci.peso)) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-medium text-[#111] w-14 text-right">{ci.peso}kg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ultimoCI && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-[#111] mb-3">Último seguimiento</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['⚡ Energía', `${ultimoCI.energia}/10`],
                    ['😴 Sueño', `${ultimoCI.sueno}h`],
                    ['😤 Estrés', `${ultimoCI.estres}/5`],
                    ['🏋️ Sesiones', `${ultimoCI.sesiones_semana} días`],
                    ['🍎 Adherencia entreno', `${ultimoCI.adherencia_entreno}/10`],
                    ['🥗 Adherencia nutrición', `${ultimoCI.adherencia_nutricion}/10`],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-[#F7F7F7] rounded-lg p-2.5">
                      <p className="text-xs text-gray-500">{l}</p>
                      <p className="text-base font-bold text-[#111]">{v}</p>
                    </div>
                  ))}
                </div>
                {ultimoCI.comentario && <p className="text-xs text-gray-500 mt-3 italic">"{ultimoCI.comentario}"</p>}
              </div>
            )}
          </div>
        )}

        {/* CHECK-IN */}
        {tab === 'checkin' && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-medium text-[#111] mb-1">Cuestionario semanal</p>
            <p className="text-sm text-gray-400 mb-4">Cuéntale a tu entrenador cómo ha ido tu semana</p>
            <a href={`/seguimiento/${clienteId}`}
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm">
              Responder ahora →
            </a>
            {checkins.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">{checkins.length} seguimientos completados</p>
                <p className="text-xs text-gray-400">Último: {new Date(checkins[0].fecha).toLocaleDateString('es-ES')}</p>
              </div>
            )}
          </div>
        )}

        {/* PAGOS */}
        {tab === 'pagos' && (
          <div className="space-y-2">
            {pagos.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                <p className="text-gray-400 text-sm">Sin pagos registrados</p>
              </div>
            ) : pagos.map(p => {
              const st = psStatus(p)
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#111]">{p.concepto || 'Mensualidad'}</p>
                    <p className="text-xs text-gray-400">{new Date(p.fecha_pago).toLocaleDateString('es-ES')}</p>
                    {p.valido_hasta && <p className="text-xs text-gray-400">Hasta: {new Date(p.valido_hasta).toLocaleDateString('es-ES')}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-500">{p.importe}€</p>
                    {st && <span className={`text-xs px-2 py-0.5 rounded-full ${st === 'ok' ? 'bg-green-50 text-green-700' : st === 'pronto' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                      {st === 'ok' ? 'Al día' : st === 'pronto' ? 'Vence pronto' : 'Vencido'}
                    </span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* MENSAJES */}
        {tab === 'mensajes' && (
          <div className="space-y-3">
            {mensajes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                <p className="text-3xl mb-2">✉️</p>
                <p className="text-gray-400 text-sm">Sin mensajes todavía</p>
              </div>
            ) : mensajes.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">E</div>
                  <span className="text-xs font-medium text-[#111]">Tu entrenador</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(m.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{m.contenido}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
