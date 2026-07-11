import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GraficasCliente from '../components/GraficasCliente'

const OBJ = { perdida_grasa:'Pérdida de grasa', ganancia_muscular:'Ganancia muscular', tonificacion:'Tonificación', fuerza:'Fuerza', rendimiento:'Rendimiento', cambio_rapido_30dias:'Cambio 30 días' }

export default function PortalCliente() {
  const { clienteId } = useParams()
  const [searchParams] = useSearchParams()
  const pagoStatus = searchParams.get('pago')
  const [cliente, setCliente] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('inicio')
  const [pinDesbloqueado, setPinDesbloqueado] = useState(false)
  const [pinIntento, setPinIntento] = useState('')
  const [pinError, setPinError] = useState(false)
  const [rutina, setRutina] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [pagos, setPagos] = useState([])
  const [mensajes, setMensajes] = useState([])
  const [mensajesLeidos, setMensajesLeidos] = useState(false)
  const [configEntrenador, setConfigEntrenador] = useState(null)
  const [planNutricion, setPlanNutricion] = useState(null)
  const [diaActivoNutr, setDiaActivoNutr] = useState(0)
  const [pinIntroducido, setPinIntroducido] = useState('')
  const [pinValido, setPinValido] = useState(false)
  const [clientePin, setClientePin] = useState(null)
  const [biblioteca, setBiblioteca] = useState([])
  const [videoEj, setVideoEj] = useState(null)
  const [fotos, setFotos] = useState([])

  useEffect(() => {
    async function cargar() {
      const { data: cl, error } = await supabase.from('clientes').select('*').eq('id', clienteId).single()
      if (error || !cl) { setNotFound(true); setLoading(false); return }
      setCliente(cl)
      const [{ data: ru }, { data: ci }, { data: pg }, { data: ms }] = await Promise.all([
        supabase.from('rutinas').select('*').eq('cliente_id', clienteId).eq('estado','publicada').order('created_at', { ascending: false }).limit(1),
        supabase.from('checkins').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }).limit(12),
        supabase.from('pagos').select('*').eq('cliente_id', clienteId).order('fecha_pago', { ascending: false }),
        supabase.from('mensajes_cliente').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }),
      ])
      setRutina(ru?.[0] || null)
      setCheckins(ci || [])
      setPagos(pg || [])
      setMensajes(ms || [])
      // Cargar biblioteca para vídeos de ejercicios
      const { data: bib } = await supabase.from('ejercicios_biblioteca').select('nombre, sinonimos, youtube_url, consejos_tecnica').eq('entrenador_id', cl.entrenador_id)
      if (bib) setBiblioteca(bib)
      // Cargar PIN si está activo
      if (cl.portal_pin) setClientePin(cl.portal_pin)
      // Cargar fotos de progreso visibles
      const { data: ft } = await supabase.from('fotos_progreso').select('*').eq('cliente_id', clienteId).eq('visible_cliente', true).order('fecha', { ascending: false })
      if (ft) setFotos(ft)
      // Cargar plan nutricional
      const { data: pn } = await supabase.from('planes_nutricion').select('*').eq('cliente_id', clienteId).eq('estado','publicado').order('created_at', { ascending: false }).limit(1).single().catch(()=>({data:null}))
      setPlanNutricion(pn)
      // Cargar config del entrenador
      if (cl?.entrenador_id) {
        const { data: cfg } = await supabase.from('configuracion').select('nombre_entrenador, foto_url, nombre_negocio').eq('entrenador_id', cl.entrenador_id).single()
        if (cfg) setConfigEntrenador(cfg)
      }
      setLoading(false)
    }
    cargar()
  }, [clienteId])

  useEffect(() => {
    if (tab === 'mensajes' && mensajes.length && !mensajesLeidos) {
      supabase.from('mensajes_cliente').update({ leido: true }).eq('cliente_id', clienteId).eq('leido', false)
      setMensajesLeidos(true)
    }
  }, [tab, mensajes])

  const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  function buscarEnBiblioteca(nombreEj) {
    if (!nombreEj || !biblioteca.length) return null
    const n = nombreEj.toLowerCase()
    return biblioteca.find(e =>
      e.nombre.toLowerCase() === n ||
      e.nombre.toLowerCase().includes(n) ||
      n.includes(e.nombre.toLowerCase()) ||
      e.sinonimos?.toLowerCase().split(',').some(s => s.trim() === n || n.includes(s.trim()))
    )
  }
  const pesoActual = checkins[0]?.peso || cliente?.peso_actual
  const pesoInicial = checkins.length > 1 ? checkins[checkins.length-1]?.peso : cliente?.peso_actual
  const diferencia = pesoInicial && pesoActual ? (pesoActual - pesoInicial).toFixed(1) : null
  const ultimoCI = checkins[0]
  const mensajesNoLeidos = mensajes.filter(m => !m.leido).length
  const pagoActivo = pagos[0]
  const diasRestantes = pagoActivo?.valido_hasta ? Math.ceil((new Date(pagoActivo.valido_hasta) - new Date()) / 864e5) : null
  const sesionesEstasSemana = 0 // placeholder

  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: '🏠' },
    { id: 'rutina', label: 'Rutina', icon: '💪' },
    { id: 'progreso', label: 'Progreso', icon: '📈' },
    { id: 'mensajes', label: mensajesNoLeidos > 0 ? `Msgs(${mensajesNoLeidos})` : 'Mensajes', icon: mensajesNoLeidos > 0 ? '🔴' : '✉️' },
    ...(planNutricion || cliente?.nutricion_activa ? [{ id: 'nutricion', label: 'Nutrición', icon: '🥗' }] : []),
    ...(fotos.length > 0 ? [{ id: 'fotos', label: 'Fotos', icon: '📸' }] : []),
  ]

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]"><div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/></div>
  if (notFound) return <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4"><div className="text-center"><p className="text-4xl mb-3">🔗</p><p className="text-[#6B6B6B]">Enlace no válido</p></div></div>

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Header */}
      <div className="bg-[#111] px-4 pt-12 pb-5">
        <div className="max-w-lg mx-auto">
          {pagoStatus === 'ok' && (
            <div className="bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2">
              <span>✓</span> Pago completado — acceso activado
            </div>
          )}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-[#FF5C00] rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {ini(cliente.nombre)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-lg leading-tight truncate">{cliente.nombre.split(' ')[0]}</h1>
              <p className="text-white/50 text-xs mt-0.5">{OBJ[cliente.objetivo] || cliente.objetivo?.replace(/_/g,' ')} · {cliente.tipo === 'online' ? '🌐 Online' : '📍 Presencial'}</p>
              {diasRestantes !== null && (
                <p className={`text-xs mt-1 font-medium ${diasRestantes < 0 ? 'text-red-400' : diasRestantes <= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {diasRestantes < 0 ? '⚠️ Suscripción vencida' : diasRestantes === 0 ? '⚠️ Vence hoy' : `✓ Activo — ${diasRestantes} días restantes`}
                </p>
              )}
            </div>
            <div className="w-8 h-8 bg-[#FF5C00] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 28 28" fill="none"><rect x="5" y="5" width="4" height="18" rx="1" fill="white"/><rect x="5" y="5" width="13" height="4" rx="1" fill="white"/><rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/></svg>
            </div>
          </div>

          {/* Stats rápidas en header */}
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Peso', pesoActual ? `${pesoActual}kg` : '—', '#FF5C00'],
              ['Objetivo', cliente.peso_objetivo ? `${cliente.peso_objetivo}kg` : '—', '#6B6B6B'],
              ['Cambio', diferencia ? `${Number(diferencia)>0?'+':''}${diferencia}kg` : '—', Number(diferencia)<0?'#10b981':'#ef4444'],
            ].map(([l,v,c])=>(
              <div key={l} className="bg-white/8 rounded-xl p-2.5 text-center">
                <p className="text-sm font-bold" style={{color:c}}>{v}</p>
                <p className="text-white/40 text-xs mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#111] border-t border-white/8 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-xs font-medium border-b-2 transition-all ${tab===t.id?'border-[#FF5C00] text-[#FF5C00]':'border-transparent text-white/40'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-10 space-y-3">

        {/* INICIO */}
        {tab==='inicio' && (
          <>
            {/* Último check-in */}
            {ultimoCI ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-[#0A0A0A]">Último seguimiento</p>
                  <p className="text-xs text-[#6B6B6B]">{new Date(ultimoCI.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['⚡','Energía',ultimoCI.energia,'/10', ultimoCI.energia>=7?'text-emerald-600':ultimoCI.energia>=4?'text-amber-600':'text-red-500'],
                    ['😴','Sueño',ultimoCI.sueno,'h','text-purple-600'],
                    ['😤','Estrés',ultimoCI.estres,'/5',ultimoCI.estres>=4?'text-red-500':'text-emerald-600'],
                    ['🔥','Fatiga',ultimoCI.fatiga,'/5',ultimoCI.fatiga>=4?'text-red-500':'text-emerald-600'],
                    ['💫','Motivación',ultimoCI.motivacion,'/7',ultimoCI.motivacion>=5?'text-emerald-600':'text-amber-600'],
                    ['💪','Adherencia',ultimoCI.adherencia_entreno,'/10',ultimoCI.adherencia_entreno>=7?'text-emerald-600':'text-amber-600'],
                  ].filter(([,,v])=>v).map(([icon,label,val,suf,color])=>(
                    <div key={label} className="bg-[#F5F5F0] rounded-xl p-2.5 text-center">
                      <p className="text-base">{icon}</p>
                      <p className={`text-sm font-bold mt-0.5 ${color}`}>{val}{suf}</p>
                      <p className="text-xs text-[#6B6B6B] mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                {ultimoCI.comentario && <p className="text-xs text-[#6B6B6B] mt-3 italic border-t border-black/5 pt-2">"{ultimoCI.comentario}"</p>}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 text-center">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm font-semibold text-[#0A0A0A]">Sin seguimientos todavía</p>
                <p className="text-xs text-[#6B6B6B] mt-1">Responde tu primer check-in semanal</p>
              </div>
            )}

            {/* CTAs principales */}
            <a href={`/seguimiento/${clienteId}`}
              className="flex items-center gap-3 bg-[#FF5C00] text-white px-4 py-4 rounded-2xl font-semibold text-sm active:scale-98 transition-all">
              <span className="text-xl">📋</span>
              <div className="flex-1">
                <p className="font-bold">Responder seguimiento semanal</p>
                <p className="text-white/70 text-xs mt-0.5">Energía, sueño, estrés, adherencia...</p>
              </div>
              <span className="text-white/60">→</span>
            </a>

            {cliente.tipo === 'online' && (
              <a href={`/sesion/${clienteId}`}
                className="flex items-center gap-3 bg-[#111] text-white px-4 py-4 rounded-2xl font-semibold text-sm active:scale-98 transition-all">
                <span className="text-xl">🏋️</span>
                <div className="flex-1">
                  <p className="font-bold">Registrar sesión de hoy</p>
                  <p className="text-white/50 text-xs mt-0.5">Pesos, reps y valoración del entreno</p>
                </div>
                <span className="text-white/40">→</span>
              </a>
            )}

            {/* Rutina activa preview */}
            {rutina && (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-[#0A0A0A]">Rutina activa</p>
                  <button onClick={() => setTab('rutina')} className="text-xs text-[#FF5C00] font-medium">Ver completa →</button>
                </div>
                <p className="text-sm font-medium text-[#0A0A0A]">{rutina.contenido?.nombre || rutina.borrador?.nombre}</p>
                <p className="text-xs text-[#6B6B6B] mt-1">{rutina.dias_semana} días/semana · {rutina.semanas} semanas</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {(rutina.contenido?.dias || rutina.borrador?.dias || []).map(d => (
                    <span key={d.dia} className="text-xs bg-[#FF5C00]/8 text-[#FF5C00] px-2 py-1 rounded-lg font-medium">{d.nombre.split(' ').slice(0,2).join(' ')}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Estado del pago */}
            {pagos.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                <p className="text-sm font-bold text-[#0A0A0A] mb-2">Estado del pago</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#0A0A0A]">{pagos[0].concepto||'Mensualidad'}</p>
                    <p className="text-xs text-[#6B6B6B]">{new Date(pagos[0].fecha_pago).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-[#FF5C00]">{pagos[0].importe}€</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diasRestantes!==null&&diasRestantes<0?'bg-red-50 text-red-600':diasRestantes!==null&&diasRestantes<=7?'bg-amber-50 text-amber-600':'bg-emerald-50 text-emerald-700'}`}>
                      {diasRestantes===null?'—':diasRestantes<0?'Vencido':diasRestantes<=7?`${diasRestantes}d`:'Al día'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* RUTINA */}
        {tab==='rutina' && (
          <>
            {!rutina ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
                <p className="text-5xl mb-4">💪</p>
                <p className="font-bold text-[#0A0A0A] text-lg">Tu rutina está en preparación</p>
                <p className="text-sm text-[#6B6B6B] mt-2">Tu entrenador está personalizando tu plan. Recibirás un mensaje cuando esté lista.</p>
              </div>
            ) : (
              <>
                <div className="bg-[#111] rounded-2xl p-5">
                  <h2 className="text-white font-bold text-base">{rutina.contenido?.nombre||rutina.borrador?.nombre}</h2>
                  <p className="text-white/60 text-xs mt-1.5 leading-relaxed">{rutina.contenido?.descripcion||rutina.borrador?.descripcion}</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <span className="text-xs bg-[#FF5C00]/20 text-[#FF5C00] px-2.5 py-1 rounded-full font-medium">{rutina.semanas} semanas</span>
                    <span className="text-xs bg-white/10 text-white/60 px-2.5 py-1 rounded-full">{rutina.dias_semana} días/semana</span>
                  </div>
                </div>
                {(rutina.contenido?.dias||rutina.borrador?.dias||[]).map(dia => (
                  <div key={dia.dia} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="bg-[#0A0A0A] px-4 py-3 flex items-center justify-between">
                      <h3 className="text-white font-semibold text-sm">{dia.nombre}</h3>
                      {dia.patron_principal && <span className="text-white/40 text-xs truncate ml-2 max-w-[120px]">{dia.patron_principal}</span>}
                    </div>
                    <div className="divide-y divide-black/5">
                      {dia.ejercicios?.map((ej,i) => (
                        <div key={i} className="px-4 py-3.5 flex items-start gap-3">
                          <div className="w-6 h-6 bg-[#FF5C00]/10 text-[#FF5C00] rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{ej.orden}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0A0A0A]">{ej.nombre}</p>
                            {ej.notas && <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">{ej.notas}</p>}
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
                    <p className="text-xs font-semibold text-amber-700 mb-1.5">📝 Nota de tu entrenador</p>
                    <p className="text-sm text-amber-800 leading-relaxed">{rutina.notas_entrenador}</p>
                  </div>
                )}
                {cliente.tipo === 'online' && (
                  <a href={`/sesion/${clienteId}`}
                    className="flex items-center justify-center gap-2 bg-[#FF5C00] text-white font-bold py-4 rounded-2xl text-sm">
                    🏋️ Registrar sesión con esta rutina
                  </a>
                )}
              </>
            )}
          </>
        )}

        {/* PROGRESO */}
        {tab==='progreso' && (
          <>
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
              <GraficasCliente clienteId={clienteId} />
            </div>
            {/* Historial check-ins */}
            {checkins.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                <p className="text-sm font-bold text-[#0A0A0A] mb-3">Historial de seguimientos</p>
                <div className="space-y-3">
                  {checkins.slice(0,6).map(ci => (
                    <div key={ci.id} className="border-b border-black/5 pb-3 last:border-0 last:pb-0">
                      <p className="text-xs font-medium text-[#6B6B6B] mb-1.5">{new Date(ci.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'long'})}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {ci.peso && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">⚖️ {ci.peso}kg</span>}
                        {ci.energia && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">⚡ {ci.energia}/10</span>}
                        {ci.estres && <span className={`text-xs px-2 py-1 rounded-full ${ci.estres>=4?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'}`}>😤 {ci.estres}/5</span>}
                        {ci.motivacion && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">💫 {ci.motivacion}/7</span>}
                        {ci.adherencia_entreno && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">💪 {ci.adherencia_entreno}/10</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* MENSAJES */}
        {tab==='mensajes' && (
          <>
            {mensajes.length===0 ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
                <p className="text-4xl mb-3">✉️</p>
                <p className="text-sm font-semibold text-[#0A0A0A]">Sin mensajes todavía</p>
                <p className="text-xs text-[#6B6B6B] mt-1">Tu entrenador te escribirá aquí</p>
              </div>
            ) : mensajes.map(m => (
              <div key={m.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${!m.leido?'border-[#FF5C00]/30':'border-black/5'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {configEntrenador?.foto_url
                    ? <img src={configEntrenador.foto_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    : <div className="w-9 h-9 bg-[#FF5C00] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{(configEntrenador?.nombre_entrenador||'E').charAt(0).toUpperCase()}</div>
                  }
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0A0A0A]">{configEntrenador?.nombre_entrenador || 'Tu entrenador'}</p>
                    <p className="text-xs text-[#6B6B6B]">{new Date(m.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</p>
                  </div>
                  {!m.leido && <div className="w-2 h-2 bg-[#FF5C00] rounded-full flex-shrink-0" />}
                </div>
                <p className="text-sm text-[#0A0A0A] leading-relaxed">{m.contenido}</p>
              </div>
            ))}
          </>
        )}
        {/* FOTOS */}
        {tab==='fotos' && (
          <div className="space-y-4">
            <div className="bg-[#111] rounded-2xl p-4">
              <p className="text-white font-bold mb-1">Tu evolución 📸</p>
              <p className="text-white/50 text-xs">Fotos compartidas por tu entrenador</p>
            </div>
            {Object.entries(fotos.reduce((acc, f) => {
              if (!acc[f.fecha]) acc[f.fecha] = []
              acc[f.fecha].push(f)
              return acc
            }, {})).map(([fecha, fotosDia]) => (
              <div key={fecha}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#0A0A0A]">
                    {new Date(fecha).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}
                  </p>
                  {fotosDia[0]?.peso && <p className="text-xs font-bold text-[#FF5C00]">{fotosDia[0].peso}kg</p>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {fotosDia.map(f => (
                    <div key={f.id} className="relative">
                      <img src={f.url} alt={f.tipo}
                        className="w-full aspect-[3/4] object-cover rounded-xl border border-black/5" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 rounded-b-xl px-2 py-1 text-center">
                        <span className="text-white text-xs capitalize">{f.tipo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Modal vídeo ejercicio */}
        {videoEj && (
          <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={() => setVideoEj(null)}>
            <div className="bg-[#111] rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <p className="text-white font-bold">{videoEj.nombre}</p>
                <button onClick={() => setVideoEj(null)} className="text-white/50 hover:text-white text-2xl">×</button>
              </div>
              <div className="relative w-full" style={{paddingBottom:'56.25%'}}>
                <iframe src={`${videoEj.youtube_url}?autoplay=1&rel=0`} className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
              {videoEj.consejos_tecnica && (
                <div className="p-4">
                  <p className="text-xs font-semibold text-amber-400 mb-1.5">📋 Técnica correcta</p>
                  <p className="text-sm text-white/70 leading-relaxed">{videoEj.consejos_tecnica}</p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* NUTRICIÓN */}
        {tab==='nutricion' && (
          <>
            {!planNutricion ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
                <p className="text-5xl mb-4">🥗</p>
                <p className="font-bold text-[#0A0A0A] text-lg">Plan nutricional en preparación</p>
                <p className="text-sm text-[#6B6B6B] mt-2">Tu entrenador está personalizando tu plan. Recibirás un mensaje cuando esté listo.</p>
              </div>
            ) : (
              <>
                <div className="bg-[#111] rounded-2xl p-5">
                  <h2 className="text-white font-bold">{planNutricion.nombre}</h2>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[['kcal',planNutricion.calorias_dia,'#FF5C00'],['Prot.',`${planNutricion.proteinas_g}g`,'#6366f1'],['Carbs',`${planNutricion.carbohidratos_g}g`,'#f59e0b'],['Grasa',`${planNutricion.grasas_g}g`,'#10b981']].map(([l,v,col])=>(
                      <div key={l} className="bg-white/8 rounded-xl p-2.5 text-center">
                        <p className="text-sm font-bold" style={{color:col}}>{v}</p>
                        <p className="text-white/40 text-xs mt-0.5">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Menú semanal */}
                {(() => {
                  const menu = planNutricion.contenido?.menu || []
                  const dias = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
                  return (
                    <div className="space-y-3">
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {dias.map((d,i)=>(
                          <button key={d} onClick={() => setDiaActivoNutr(i)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${i===diaActivoNutr?'bg-[#FF5C00] text-white':'bg-white border border-black/10 text-[#6B6B6B]'}`}>
                            {d}
                          </button>
                        ))}
                      </div>
                      {(menu[diaActivoNutr]?.comidas||[]).map((comida,i)=>(
                        <div key={i} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                          <div className="bg-[#0A0A0A] px-4 py-2.5 flex items-center justify-between">
                            <span className="text-white font-semibold text-sm">{comida.nombre}</span>
                            <span className="text-white/50 text-xs">{comida.hora} · {comida.calorias}kcal</span>
                          </div>
                          <div className="p-3 space-y-1">
                            {(comida.alimentos||[]).map((al,j)=>(
                              <div key={j} className="flex justify-between text-sm">
                                <span className="text-[#0A0A0A]">{al.nombre}</span>
                                <span className="text-[#6B6B6B] text-xs font-medium">{al.cantidad}</span>
                              </div>
                            ))}
                            {comida.prep && <p className="text-xs text-[#6B6B6B] border-t border-black/5 pt-2 mt-1">🍳 {comida.prep}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                {planNutricion.notas_entrenador && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-1.5">📝 Nota de tu entrenador</p>
                    <p className="text-sm text-amber-800 leading-relaxed">{planNutricion.notas_entrenador}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
