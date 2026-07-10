import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GraficasCliente from '../components/GraficasCliente'

export default function PortalCliente() {
  const { clienteId } = useParams()
  const [searchParams] = useSearchParams()
  const pagoStatus = searchParams.get('pago')
  const [cliente, setCliente] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('inicio')
  const [rutina, setRutina] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [pagos, setPagos] = useState([])
  const [mensajes, setMensajes] = useState([])

  useEffect(() => {
    async function cargar() {
      const { data: cl, error } = await supabase.from('clientes').select('*').eq('id', clienteId).single()
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
      if (ms?.length) await supabase.from('mensajes_cliente').update({ leido: true }).eq('cliente_id', clienteId).eq('leido', false)
      setLoading(false)
    }
    cargar()
  }, [clienteId])

  const ini = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const pesoActual = checkins[0]?.peso || cliente?.peso_actual
  const pesoInicial = checkins.length > 1 ? checkins[checkins.length - 1]?.peso : cliente?.peso_actual
  const diferencia = pesoInicial && pesoActual ? (pesoActual - pesoInicial).toFixed(1) : null
  const ultimoCI = checkins[0]
  const mensajesNoLeidos = mensajes.filter(m => !m.leido).length
  const pagoActivo = pagos[0]
  const diasRestantes = pagoActivo?.valido_hasta ? Math.ceil((new Date(pagoActivo.valido_hasta) - new Date()) / 864e5) : null

  const tabs = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'rutina', label: 'Rutina' },
    { id: 'progreso', label: 'Progreso' },
    { id: 'mensajes', label: mensajesNoLeidos > 0 ? `Mensajes (${mensajesNoLeidos})` : 'Mensajes' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4">
      <div className="text-center"><p className="text-4xl mb-3">🔗</p><p className="text-[#6B6B6B]">Enlace no válido</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Header */}
      <div className="bg-[#111] px-4 pt-12 pb-6">
        <div className="max-w-lg mx-auto">
          {pagoStatus === 'ok' && (
            <div className="bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2">
              <span>✓</span> Pago completado — acceso activado
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#FF5C00] rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
              {ini(cliente.nombre)}
            </div>
            <div className="flex-1">
              <h1 className="text-white font-bold text-lg leading-tight">{cliente.nombre.split(' ')[0]}</h1>
              <p className="text-white/50 text-xs mt-0.5">{cliente.objetivo?.replace(/_/g, ' ')} · {cliente.tipo === 'online' ? '🌐 Online' : '📍 Presencial'}</p>
              {diasRestantes !== null && (
                <p className={`text-xs mt-1 font-medium ${diasRestantes < 0 ? 'text-red-400' : diasRestantes <= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {diasRestantes < 0 ? '⚠️ Suscripción vencida' : diasRestantes === 0 ? '⚠️ Vence hoy' : `✓ Activo ${diasRestantes} días`}
                </p>
              )}
            </div>
            <div className="w-8 h-8 bg-[#FF5C00] rounded-lg flex items-center justify-center flex-shrink-0">
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
      <div className="bg-[#111] border-t border-white/8 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-xs font-medium border-b-2 transition-all ${tab === t.id ? 'border-[#FF5C00] text-[#FF5C00]' : 'border-transparent text-white/40 hover:text-white/70'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-10 space-y-3">

        {/* INICIO */}
        {tab === 'inicio' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Peso actual', pesoActual ? `${pesoActual}kg` : '—', '#FF5C00'],
                ['Objetivo', cliente.peso_objetivo ? `${cliente.peso_objetivo}kg` : '—', '#6B6B6B'],
                ['Cambio', diferencia ? `${Number(diferencia) > 0 ? '+' : ''}${diferencia}kg` : '—', Number(diferencia) < 0 ? '#10b981' : '#ef4444'],
              ].map(([l, v, c]) => (
                <div key={l} className="bg-white rounded-2xl border border-black/5 shadow-sm p-3.5 text-center">
                  <p className="text-xl font-bold" style={{ color: c }}>{v}</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">{l}</p>
                </div>
              ))}
            </div>

            {ultimoCI ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-[#0A0A0A]">Último seguimiento</p>
                  <p className="text-xs text-[#6B6B6B]">{new Date(ultimoCI.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['⚡', 'Energía', `${ultimoCI.energia}/10`, ultimoCI.energia >= 7 ? 'text-emerald-600' : ultimoCI.energia >= 4 ? 'text-amber-600' : 'text-red-500'],
                    ['😴', 'Sueño', `${ultimoCI.sueno}h`, 'text-purple-600'],
                    ['😤', 'Estrés', `${ultimoCI.estres}/5`, ultimoCI.estres >= 4 ? 'text-red-500' : 'text-emerald-600'],
                    ['🔥', 'Fatiga', `${ultimoCI.fatiga}/5`, ultimoCI.fatiga >= 4 ? 'text-red-500' : 'text-emerald-600'],
                    ['💫', 'Motivación', `${ultimoCI.motivacion}/7`, ultimoCI.motivacion >= 5 ? 'text-emerald-600' : 'text-amber-600'],
                    ['💪', 'Adherencia', `${ultimoCI.adherencia_entreno}/10`, ultimoCI.adherencia_entreno >= 7 ? 'text-emerald-600' : 'text-amber-600'],
                  ].filter(([,,v]) => v && v !== 'undefined/10' && v !== 'null/5').map(([icon, label, val, color]) => (
                    <div key={label} className="bg-[#F5F5F0] rounded-xl p-2.5 text-center">
                      <p className="text-base">{icon}</p>
                      <p className={`text-sm font-bold mt-1 ${color}`}>{val}</p>
                      <p className="text-xs text-[#6B6B6B] mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                {ultimoCI.comentario && <p className="text-xs text-[#6B6B6B] mt-3 italic border-t border-black/5 pt-3">"{ultimoCI.comentario}"</p>}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 text-center">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm text-[#6B6B6B]">Aún no tienes seguimientos registrados</p>
              </div>
            )}

            <a href={`/seguimiento/${clienteId}`}
              className="block bg-[#FF5C00] text-white text-center font-semibold py-4 rounded-2xl text-sm active:scale-98 transition-all">
              📋 Responder seguimiento semanal
            </a>

            {cliente.tipo === 'online' && (
              <a href={`/sesion/${clienteId}`}
                className="block bg-[#111] text-white text-center font-semibold py-4 rounded-2xl text-sm active:scale-98 transition-all">
                🏋️ Registrar sesión de hoy
              </a>
            )}

            {pagos.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                <p className="text-sm font-bold text-[#0A0A0A] mb-2">Estado del pago</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#0A0A0A]">{pagos[0].concepto || 'Mensualidad'}</p>
                    <p className="text-xs text-[#6B6B6B]">{new Date(pagos[0].fecha_pago).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-[#FF5C00]">{pagos[0].importe}€</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diasRestantes !== null && diasRestantes < 0 ? 'bg-red-50 text-red-600' : diasRestantes !== null && diasRestantes <= 7 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'}`}>
                      {diasRestantes !== null && diasRestantes < 0 ? 'Vencido' : diasRestantes !== null && diasRestantes <= 7 ? `${diasRestantes}d` : 'Al día'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* RUTINA */}
        {tab === 'rutina' && (
          <>
            {!rutina ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-8 text-center">
                <p className="text-4xl mb-3">💪</p>
                <p className="font-bold text-[#0A0A0A]">Tu rutina está en preparación</p>
                <p className="text-sm text-[#6B6B6B] mt-1">Tu entrenador está personalizando tu plan</p>
              </div>
            ) : (
              <>
                <div className="bg-[#111] rounded-2xl p-4">
                  <h2 className="text-white font-bold text-base">{rutina.contenido?.nombre || rutina.borrador?.nombre}</h2>
                  <p className="text-white/60 text-xs mt-1">{rutina.contenido?.descripcion || rutina.borrador?.descripcion}</p>
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs bg-[#FF5C00]/20 text-[#FF5C00] px-2.5 py-1 rounded-full font-medium">{rutina.semanas} semanas</span>
                    <span className="text-xs bg-white/10 text-white/60 px-2.5 py-1 rounded-full">{rutina.dias_semana} días/semana</span>
                  </div>
                </div>
                {(rutina.contenido?.dias || rutina.borrador?.dias || []).map(dia => (
                  <div key={dia.dia} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="bg-[#0A0A0A] px-4 py-3 flex items-center justify-between">
                      <h3 className="text-white font-semibold text-sm">{dia.nombre}</h3>
                      {dia.patron_principal && <span className="text-white/40 text-xs">{dia.patron_principal}</span>}
                    </div>
                    <div className="divide-y divide-black/5">
                      {dia.ejercicios?.map((ej, i) => (
                        <div key={i} className="px-4 py-3.5 flex items-start gap-3">
                          <span className="w-6 h-6 bg-[#FF5C00]/10 text-[#FF5C00] rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{ej.orden}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0A0A0A]">{ej.nombre}</p>
                            {ej.notas && <p className="text-xs text-[#6B6B6B] mt-0.5">{ej.notas}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-[#FF5C00]">{ej.series}×{ej.reps}</p>
                            <p className="text-xs text-[#6B6B6B]">{ej.descanso}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {rutina.notas_entrenador && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-1">📝 Nota de tu entrenador</p>
                    <p className="text-sm text-amber-800 leading-relaxed">{rutina.notas_entrenador}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* PROGRESO */}
        {tab === 'progreso' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Peso actual', pesoActual ? `${pesoActual}kg` : '—', '#FF5C00'],
                ['Objetivo', cliente.peso_objetivo ? `${cliente.peso_objetivo}kg` : '—', '#6B6B6B'],
                ['Cambio', diferencia ? `${Number(diferencia) > 0 ? '+' : ''}${diferencia}kg` : '—', Number(diferencia) < 0 ? '#10b981' : '#ef4444'],
              ].map(([l, v, c]) => (
                <div key={l} className="bg-white rounded-2xl border border-black/5 shadow-sm p-3.5 text-center">
                  <p className="text-xl font-bold" style={{ color: c }}>{v}</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">{l}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
              <GraficasCliente clienteId={clienteId} />
            </div>
          </>
        )}

        {/* MENSAJES */}
        {tab === 'mensajes' && (
          <>
            {mensajes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-8 text-center">
                <p className="text-4xl mb-3">✉️</p>
                <p className="text-sm text-[#6B6B6B]">Sin mensajes todavía</p>
              </div>
            ) : mensajes.map(m => (
              <div key={m.id} className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-[#FF5C00] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">E</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0A0A0A]">Tu entrenador</p>
                    <p className="text-xs text-[#6B6B6B]">{new Date(m.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  {!m.leido && <div className="w-2 h-2 bg-[#FF5C00] rounded-full flex-shrink-0" />}
                </div>
                <p className="text-sm text-[#0A0A0A] leading-relaxed">{m.contenido}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
