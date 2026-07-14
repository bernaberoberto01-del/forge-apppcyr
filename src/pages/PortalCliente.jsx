import { useState, useEffect } from 'react'
import LoginPortal from './LoginPortal'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GraficasCliente from '../components/GraficasCliente'

const OBJ = { perdida_grasa:'Pérdida de grasa', ganancia_muscular:'Ganancia muscular', tonificacion:'Tonificación', fuerza:'Fuerza', rendimiento:'Rendimiento', cambio_rapido_30dias:'Cambio 30 días' }

export default function PortalCliente() {
  const { clienteId } = useParams()
  const [searchParams] = useSearchParams()
  const pagoStatus = searchParams.get('pago')
  const [clienteSession, setClienteSession] = useState(undefined) // undefined=cargando, null=no sesión, objeto=sesión
  const [cliente, setCliente] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('inicio')
  const [rutina, setRutina] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [pagos, setPagos] = useState([])
  const [mensajes, setMensajes] = useState([])
  const [mensajesLeidos, setMensajesLeidos] = useState(false)
  const [configEntrenador, setConfigEntrenador] = useState(null)
  const [planNutricion, setPlanNutricion] = useState(null)
  const [diaActivoNutr, setDiaActivoNutr] = useState(0)
  const [cancelando, setCancelando] = useState(null) // id de sesión que se está cancelando
  const [motivoCancel, setMotivoCancel] = useState('')
  const [sesionesPortal, setSesionesPortal] = useState([])
  const [textoMsg, setTextoMsg] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [tipoFoto, setTipoFoto] = useState('frontal')
  const [pesoFoto, setPesoFoto] = useState('')
  const [errorFoto, setErrorFoto] = useState('')
  const [biblioteca, setBiblioteca] = useState([])
  const [videoEj, setVideoEj] = useState(null)
  const [fotos, setFotos] = useState([])
  const [subTabProgreso, setSubTabProgreso] = useState('peso')
  const [medidas, setMedidas] = useState({})
  const [historialMedidas, setHistorialMedidas] = useState([])

  // Verificar sesión de Supabase al montar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setClienteSession(session?.user || null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setClienteSession(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Al hacer login, vincular auth_user_id con el cliente si no está vinculado
  useEffect(() => {
    if (!clienteSession || !clienteId || !cliente) return
    if (!cliente.auth_user_id) {
      supabase.from('clientes')
        .update({ auth_user_id: clienteSession.id })
        .eq('id', clienteId)
        .then(() => {})
    }
  }, [clienteSession, clienteId, cliente])

  useEffect(() => {
    async function cargar() {
      const { data: cl, error } = await supabase.from('clientes').select('*').eq('id', clienteId).single()
      if (error || !cl) { setNotFound(true); setLoading(false); return }
      setCliente(cl)

      // Cargar datos en paralelo — cada uno con su propio catch para no bloquear los demás
      const [ru, ci, pg, ms, bib, ft, pn, cfg] = await Promise.all([
        supabase.from('rutinas').select('*').eq('cliente_id', clienteId).eq('estado','publicada').order('created_at', { ascending: false }).limit(1).then(r => r.data || []).catch(() => []),
        supabase.from('checkins').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }).limit(12).then(r => r.data || []).catch(() => []),
        supabase.from('pagos').select('*').eq('cliente_id', clienteId).order('fecha_pago', { ascending: false }).then(r => r.data || []).catch(() => []),
        supabase.from('mensajes_cliente').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }).then(r => r.data || []).catch(() => []),
        supabase.from('ejercicios_biblioteca').select('nombre, sinonimos, youtube_url, consejos_tecnica').eq('entrenador_id', cl.entrenador_id).then(r => r.data || []).catch(() => []),
        supabase.from('fotos_progreso').select('*').eq('cliente_id', clienteId).eq('visible_cliente', true).order('fecha', { ascending: false }).then(r => r.data || []).catch(() => []),
        supabase.from('planes_nutricion').select('*').eq('cliente_id', clienteId).eq('estado','publicado').order('created_at', { ascending: false }).limit(1).then(r => r.data?.[0] || null).catch(() => null),
        supabase.from('configuracion').select('nombre_entrenador, foto_url, nombre_negocio').eq('entrenador_id', cl.entrenador_id).single().then(r => r.data || null).catch(() => null),
      ])

      setRutina(ru[0] || null)
      setCheckins(ci)
      setPagos(pg)
      setMensajes(ms)
      setBiblioteca(bib)
      setFotos(ft)
      setPlanNutricion(pn)
      if (cfg) setConfigEntrenador(cfg)
      // Sesiones futuras del cliente
      const hoy = new Date().toISOString().split('T')[0]
      const { data: sesFut } = await supabase.from('sesiones').select('*')
        .eq('cliente_id', clienteId).gte('fecha', hoy)
        .eq('cancelada', false).order('fecha').order('hora').limit(8)
      setSesionesPortal(sesFut || [])
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
  const mensajesNoLeidos = mensajes.filter(m => !m.leido && m.tipo === 'entrenador').length
  const pagoActivo = pagos[0]
  const diasRestantes = pagoActivo?.valido_hasta ? Math.ceil((new Date(pagoActivo.valido_hasta) - new Date()) / 864e5) : null
  const sesionesEstasSemana = 0 // placeholder

  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: '🏠' },
    { id: 'rutina', label: 'Rutina', icon: '💪' },
    { id: 'progreso', label: 'Progreso', icon: '📈' },
    { id: 'mensajes', label: 'Mensajes', icon: '✉️', badge: mensajesNoLeidos > 0 ? mensajesNoLeidos : 0 },
    ...(planNutricion || cliente?.nutricion_activa ? [{ id: 'nutricion', label: 'Nutrición', icon: '🥗' }] : []),
    { id: 'fotos', label: 'Fotos', icon: '📸' },
    ...(pagos.length > 0 ? [{ id: 'pagos_cliente', label: 'Pagos', icon: '💳' }] : []),
  ]

  async function cancelarSesion(sesionId) {
    const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
    const res = await fetch(`${SUPABASE_URL}/functions/v1/portal-accion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        accion: 'cancelar_sesion',
        datos: {
          sesion_id: sesionId,
          entrenador_id: cliente.entrenador_id,
          cliente_id: clienteId,
          cliente_nombre: cliente.nombre,
          fecha: cancelando.fecha,
          hora: cancelando.hora,
          motivo: motivoCancel || ''
        }
      })
    })
    const data = await res.json()
    if (data.ok) {
      setSesionesPortal(prev => prev.filter(s => s.id !== sesionId))
    }
    setCancelando(null)
    setMotivoCancel('')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]"><div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/></div>
  if (notFound) return <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4"><div className="text-center"><p className="text-4xl mb-3">🔗</p><p className="text-[#6B6B6B]">Enlace no válido</p></div></div>

  // Sin sesión → mostrar login
  if (clienteSession === null) return (
    <LoginPortal
      clienteId={clienteId}
      onLogin={user => setClienteSession(user)}
      nombreNegocio={configEntrenador?.nombre_negocio}
      colorAccento="#FF5C00"
    />
  )

  // Cargando sesión
  if (clienteSession === undefined) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
  const PORTAL_FN = 'https://qdpqpbkppkhzcxpfypvf.supabase.co/functions/v1/portal-accion'
  const color = configEntrenador?.color_acento || '#FF5C00'
  const nombreEntrenador = configEntrenador?.nombre_entrenador || 'Tu entrenador'

  async function enviarMensaje() {
    if (!textoMsg.trim() || enviandoMsg) return
    setEnviandoMsg(true)
    await fetch(PORTAL_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ accion: 'enviar_mensaje', datos: { entrenador_id: cliente.entrenador_id, cliente_id: clienteId, contenido: textoMsg.trim() } })
    }).catch(() => {})
    setTextoMsg('')
    const { data } = await supabase.from('mensajes_cliente').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: true })
    setMensajes(data || [])
    setEnviandoMsg(false)
  }

  async function subirFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setErrorFoto('Máximo 10MB'); return }
    setSubiendoFoto(true); setErrorFoto('')
    try {
      const ext = file.name.split('.').pop()
      const path = `${clienteId}/${Date.now()}_${tipoFoto}.${ext}`
      const { error: ue } = await supabase.storage.from('progress-photos').upload(path, file)
      if (ue) throw new Error(ue.message)
      const { data: { publicUrl } } = supabase.storage.from('progress-photos').getPublicUrl(path)
      await supabase.from('fotos_progreso').insert({
        entrenador_id: cliente.entrenador_id, cliente_id: clienteId,
        url: publicUrl, fecha: new Date().toISOString().split('T')[0],
        tipo: tipoFoto, peso: pesoFoto ? Number(pesoFoto) : null, visible_cliente: true
      })
      const { data } = await supabase.from('fotos_progreso').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false })
      setFotos(data || [])
      setPesoFoto('')
    } catch(err) { setErrorFoto(err.message) }
    setSubiendoFoto(false)
    e.target.value = ''
  }

  const TABS = [
    { id: 'inicio', label: 'Inicio', icon: '🏠' },
    { id: 'rutina', label: 'Rutina', icon: '💪' },
    { id: 'progreso', label: 'Progreso', icon: '📈' },
    { id: 'mensajes', label: 'Mensajes', icon: '✉️', badge: mensajesNoLeidos },
    { id: 'nutricion', label: 'Nutrición', icon: '🥗' },
    { id: 'pagos', label: 'Pagos', icon: '💳' },
  ].filter(t => {
    if (t.id === 'nutricion' && !planNutricion && !cliente?.nutricion_activa) return false
    if (t.id === 'pagos' && pagos.length === 0) return false
    return true
  })

  return (
    <div className="min-h-screen bg-[#F5F5F0] max-w-lg mx-auto">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#111] px-4 pt-10 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/40 text-xs">{configEntrenador?.nombre_negocio || 'Tu entrenador'}</p>
            <p className="text-white font-bold text-lg">{cliente?.nombre?.split(' ')[0]}</p>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: color }}>
            {(cliente?.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
          </div>
        </div>
        {/* Tabs */}
        <div className="flex overflow-x-auto gap-0 pb-0 scrollbar-none">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all relative whitespace-nowrap ${tab===t.id ? 'border-[#FF5C00] text-white' : 'border-transparent text-white/40'}`}>
              {t.icon} {t.label}
              {t.badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center" style={{fontSize:'9px'}}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="px-4 py-4 space-y-3 pb-24">

        {/* ===== INICIO ===== */}
        {tab === 'inicio' && (
          <>
            {/* Próximas sesiones */}
            {sesionesPortal.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                <p className="text-sm font-bold text-[#0A0A0A] mb-3">Próximas sesiones</p>
                <div className="space-y-2">
                  {sesionesPortal.slice(0,4).map(s => {
                    const esHoy = s.fecha === new Date().toISOString().split('T')[0]
                    const esMañana = s.fecha === new Date(Date.now()+864e5).toISOString().split('T')[0]
                    const label = esHoy ? 'Hoy' : esMañana ? 'Mañana' : new Date(s.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})
                    return (
                      <div key={s.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${esHoy?'border-[#FF5C00]/30 bg-[#FF5C00]/5':'border-black/5 bg-[#F5F5F0]'}`}>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${esHoy?'text-[#FF5C00]':'text-[#0A0A0A]'}`}>{label}</p>
                          <p className="text-xs text-[#6B6B6B]">{s.hora} · {s.duracion_minutos||60}min</p>
                        </div>
                        <button onClick={() => setCancelando(s)}
                          className="text-xs text-[#6B6B6B] border border-black/10 px-2.5 py-1.5 rounded-lg hover:border-red-300 hover:text-red-500 transition-all">
                          Cancelar
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Modal cancelación */}
            {cancelando && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={() => { setCancelando(null); setMotivoCancel('') }}>
                <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-[#0A0A0A] mb-1">¿Cancelar esta sesión?</h3>
                  <p className="text-sm text-[#6B6B6B] mb-4">
                    {new Date(cancelando.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})} a las {cancelando.hora}
                  </p>
                  <textarea value={motivoCancel} onChange={e => setMotivoCancel(e.target.value)} rows={2}
                    placeholder="Motivo (opcional)" className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none mb-3" />
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5 mb-4">⚠ Se notificará a tu entrenador</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setCancelando(null); setMotivoCancel('') }}
                      className="flex-1 border border-black/10 text-sm py-2.5 rounded-xl text-[#6B6B6B]">Volver</button>
                    <button onClick={async () => {
                      await fetch(PORTAL_FN, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
                        body: JSON.stringify({ accion: 'cancelar_sesion', datos: { sesion_id: cancelando.id, entrenador_id: cliente.entrenador_id, cliente_id: clienteId, cliente_nombre: cliente.nombre, fecha: cancelando.fecha, hora: cancelando.hora, motivo: motivoCancel } })
                      })
                      setSesionesPortal(prev => prev.filter(s => s.id !== cancelando.id))
                      setCancelando(null); setMotivoCancel('')
                    }} className="flex-1 bg-red-500 text-white text-sm font-semibold py-2.5 rounded-xl">
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Resumen rápido */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['📊', 'Check-ins', checkins.length, () => setTab('progreso')],
                ['💬', 'Mensajes', mensajes.filter(m=>m.tipo!=='sistema').length, () => setTab('mensajes')],
              ].map(([icon,label,val,action]) => (
                <button key={label} onClick={action} className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 text-left hover:shadow-md transition-all">
                  <p className="text-2xl mb-1">{icon}</p>
                  <p className="text-xl font-bold text-[#0A0A0A]">{val}</p>
                  <p className="text-xs text-[#6B6B6B]">{label}</p>
                </button>
              ))}
            </div>

            {/* Botones de registro rápido */}
            <div className="grid grid-cols-2 gap-3">
              <a href={`https://forge-studio-os.vercel.app/seguimiento/${clienteId}`} target="_blank" rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-black/5 shadow-sm p-4 hover:shadow-md transition-all active:scale-95">
                <span className="text-2xl">📋</span>
                <p className="text-sm font-bold text-[#0A0A0A]">Check-in semanal</p>
                <p className="text-xs text-[#6B6B6B] text-center">Registra cómo te encuentras esta semana</p>
              </a>
              <a href={`https://forge-studio-os.vercel.app/sesion/${clienteId}`} target="_blank" rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-black/5 shadow-sm p-4 hover:shadow-md transition-all active:scale-95">
                <span className="text-2xl">🏋️</span>
                <p className="text-sm font-bold text-[#0A0A0A]">Registrar sesión</p>
                <p className="text-xs text-[#6B6B6B] text-center">Apunta el entreno de hoy</p>
              </a>
            </div>

            {/* Último check-in */}
            {checkins[0] && (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wide mb-3">Último check-in</p>
                <div className="flex gap-2 flex-wrap">
                  {checkins[0].peso && <span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-full font-medium">⚖️ {checkins[0].peso}kg</span>}
                  {checkins[0].energia && <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-full font-medium">⚡ Energía {checkins[0].energia}/10</span>}
                  {checkins[0].motivacion && <span className="text-xs bg-yellow-50 text-yellow-700 px-2.5 py-1.5 rounded-full font-medium">💫 Motivación {checkins[0].motivacion}/7</span>}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== RUTINA ===== */}
        {tab === 'rutina' && (
          <>
            {!rutina ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
                <p className="text-5xl mb-4">💪</p>
                <p className="font-bold text-[#0A0A0A] text-lg">Plan en preparación</p>
                <p className="text-sm text-[#6B6B6B] mt-2">Tu entrenador está personalizando tu rutina</p>
              </div>
            ) : (
              <>
                <div className="bg-[#111] rounded-2xl p-4">
                  <p className="text-white font-bold">{rutina.nombre || 'Tu rutina personalizada'}</p>
                  <p className="text-white/50 text-xs mt-1">{rutina.dias?.length || 0} días · {rutina.semanas || 4} semanas</p>
                </div>
                {(rutina.borrador?.dias || rutina.contenido?.dias || []).map((dia, di) => (
                  <div key={di} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="bg-[#0A0A0A] px-4 py-3">
                      <p className="text-white font-semibold text-sm">{dia.nombre || dia.dia}</p>
                    </div>
                    <div className="divide-y divide-black/5">
                      {(dia.ejercicios || []).map((ej, ei) => (
                        <div key={ei} className="px-4 py-3 flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                            style={{ background: color }}>{ei+1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0A0A0A]">{ej.nombre}</p>
                            {ej.notas && <p className="text-xs text-[#6B6B6B] mt-0.5">{ej.notas}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold" style={{ color }}>{ej.series}×{ej.reps}</p>
                            <p className="text-xs text-[#6B6B6B]">{ej.descanso}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ===== PROGRESO ===== */}
        {tab === 'progreso' && (
          <>
            {/* subtabs: peso / medidas / fotos */}
            <div className="flex gap-2">
              {[['peso','⚖️ Peso'],['medidas','📏 Medidas'],['fotos','📸 Fotos']].map(([id,label]) => (
                <button key={id} onClick={() => setSubTabProgreso(id)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${subTabProgreso===id?'text-white shadow-sm':'bg-white border border-black/10 text-[#6B6B6B]'}`}
                  style={subTabProgreso===id?{background:color}:{}}>
                  {label}
                </button>
              ))}
            </div>

            {/* Subtab Peso */}
            {subTabProgreso === 'peso' && (
              <>
                {checkins.length >= 2 && (() => {
                  const ultimo = checkins[0]
                  const primero = checkins[checkins.length-1]
                  const diff = ultimo.peso && primero.peso ? +(ultimo.peso - primero.peso).toFixed(1) : null
                  const semanas = Math.ceil((new Date(ultimo.fecha)-new Date(primero.fecha))/(7*864e5))
                  const bajando = diff !== null && diff < 0
                  const energiaMedia = (checkins.filter(c=>c.energia).reduce((s,c)=>s+c.energia,0)/(checkins.filter(c=>c.energia).length||1)).toFixed(1)
                  const adherenciaMedia = (checkins.filter(c=>c.adherencia_entreno).reduce((s,c)=>s+c.adherencia_entreno,0)/(checkins.filter(c=>c.adherencia_entreno).length||1)).toFixed(1)
                  return (
                    <div className="bg-[#111] rounded-2xl p-5">
                      <p className="text-white/50 text-xs mb-3">Últimas {semanas} semanas</p>
                      {diff !== null && (
                        <div className="flex items-end gap-3 mb-4">
                          <div>
                            <p className="text-4xl font-bold" style={{color: bajando?'#10b981':'#6366f1'}}>{diff>0?'+':''}{diff}kg</p>
                            <p className="text-white/40 text-xs mt-1">{primero.peso}kg → {ultimo.peso}kg</p>
                          </div>
                          <div className="flex-1 flex items-end gap-0.5 h-10">
                            {checkins.slice().reverse().filter(c=>c.peso).map((c,i,arr) => {
                              const min = Math.min(...arr.map(x=>x.peso)), max = Math.max(...arr.map(x=>x.peso))
                              const h = max===min?50:((c.peso-min)/(max-min))*80+20
                              return <div key={i} className="flex-1 rounded-sm opacity-60" style={{height:`${h}%`,background:color}}/>
                            })}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        {[['⚡',energiaMedia,'/10','Energía'],['💪',adherenciaMedia,'/10','Adherencia'],['📅',checkins.length,'','Check-ins']].map(([icon,val,suf,label])=>(
                          <div key={label} className="bg-white/5 rounded-xl p-2.5 text-center">
                            <p className="text-base">{icon}</p>
                            <p className="text-white text-sm font-bold">{val}{suf}</p>
                            <p className="text-white/40 text-xs mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Gráficas de evolución */}
                <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                  <p className="text-sm font-bold text-[#0A0A0A] mb-3">Evolución y gráficas</p>
                  <GraficasCliente clienteId={clienteId} />
                </div>

                {/* Historial check-ins */}
                {checkins.slice(0,6).map(ci => (
                  <div key={ci.id} className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                    <p className="text-xs font-medium text-[#6B6B6B] mb-2">{new Date(ci.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'long'})}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {ci.peso && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">⚖️ {ci.peso}kg</span>}
                      {ci.energia && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">⚡ {ci.energia}/10</span>}
                      {ci.estres && <span className={`text-xs px-2 py-1 rounded-full ${ci.estres>=4?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'}`}>😤 {ci.estres}/5</span>}
                      {ci.motivacion && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">💫 {ci.motivacion}/7</span>}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Subtab Medidas */}
            {subTabProgreso === 'medidas' && (
              <>
                <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                  <p className="text-sm font-bold text-[#0A0A0A] mb-3">📏 Registrar medidas</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[['pecho','Pecho (cm)'],['cintura','Cintura (cm)'],['cadera','Cadera (cm)'],['bicep','Bícep (cm)'],['muslo','Muslo (cm)'],['gemelo','Gemelo (cm)']].map(([key,label])=>(
                      <div key={key}>
                        <label className="text-xs text-[#6B6B6B] mb-1 block">{label}</label>
                        <input type="number" value={medidas[key]||''} onChange={e => setMedidas(m => ({...m, [key]: e.target.value}))}
                          className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5C00]" placeholder="0" />
                      </div>
                    ))}
                  </div>
                  <button onClick={async () => {
                    const vals = Object.fromEntries(Object.entries(medidas).filter(([,v])=>v).map(([k,v])=>[k,Number(v)]))
                    if (!Object.keys(vals).length) return
                    await supabase.from('medidas_cliente').insert({ entrenador_id: cliente.entrenador_id, cliente_id: clienteId, fecha: new Date().toISOString().split('T')[0], ...vals })
                    setMedidas({})
                    const { data } = await supabase.from('medidas_cliente').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false })
                    setHistorialMedidas(data || [])
                  }} className="w-full mt-3 text-white text-sm font-semibold py-2.5 rounded-xl"
                    style={{background: color}}>
                    Guardar medidas
                  </button>
                </div>
                {historialMedidas.slice(0,4).map((m,i) => (
                  <div key={i} className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                    <p className="text-xs font-medium text-[#6B6B6B] mb-2">{new Date(m.fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {[['Pecho',m.pecho],['Cintura',m.cintura],['Cadera',m.cadera],['Bícep',m.bicep],['Muslo',m.muslo],['Gemelo',m.gemelo]].filter(([,v])=>v).map(([l,v])=>(
                        <span key={l} className="text-xs bg-[#F5F5F0] text-[#0A0A0A] px-2.5 py-1.5 rounded-full font-medium">{l}: {v}cm</span>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Subtab Fotos */}
            {subTabProgreso === 'fotos' && (
              <>
                <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                  <p className="text-sm font-bold text-[#0A0A0A] mb-3">📸 Subir foto</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {['frontal','lateral','espalda'].map(t => (
                      <button key={t} onClick={() => setTipoFoto(t)}
                        className={`py-2 rounded-xl text-xs font-semibold capitalize ${tipoFoto===t?'text-white':'bg-[#F5F5F0] text-[#6B6B6B]'}`}
                        style={tipoFoto===t?{background:color}:{}}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <input type="number" value={pesoFoto} onChange={e => setPesoFoto(e.target.value)}
                    placeholder="Peso del día (kg) — opcional"
                    className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#FF5C00]" />
                  {errorFoto && <p className="text-red-500 text-xs mb-2">{errorFoto}</p>}
                  <label className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer ${subiendoFoto?'opacity-50':''}`}
                    style={{background: color}}>
                    {subiendoFoto ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Subiendo...</> : <>📷 Seleccionar foto</>}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={subirFoto} disabled={subiendoFoto} />
                  </label>
                </div>
                {fotos.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-black/5 p-8 text-center">
                    <p className="text-3xl mb-2">📷</p>
                    <p className="text-sm text-[#6B6B6B]">Sube tu primera foto</p>
                  </div>
                ) : Object.entries(fotos.reduce((acc,f)=>{ if(!acc[f.fecha])acc[f.fecha]=[]; acc[f.fecha].push(f); return acc },{})).map(([fecha,fotosDia])=>(
                  <div key={fecha} className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-[#0A0A0A]">{new Date(fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long'})}</p>
                      {fotosDia[0]?.peso && <p className="text-xs font-bold" style={{color}}>{fotosDia[0].peso}kg</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {fotosDia.map(f=>(
                        <div key={f.id} className="relative">
                          <img src={f.url} alt={f.tipo} className="w-full aspect-[3/4] object-cover rounded-xl" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 rounded-b-xl px-2 py-1 text-center">
                            <span className="text-white text-xs capitalize">{f.tipo}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ===== MENSAJES ===== */}
        {tab === 'mensajes' && (
          <>
            <div className="space-y-2">
              {mensajes.filter(m=>m.tipo!=='sistema').length === 0 ? (
                <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
                  <p className="text-4xl mb-3">✉️</p>
                  <p className="text-sm font-semibold text-[#0A0A0A]">Sin mensajes todavía</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Escribe a tu entrenador</p>
                </div>
              ) : mensajes.filter(m=>m.tipo!=='sistema').map(m => (
                <div key={m.id} className={`flex ${m.tipo==='cliente'?'justify-end':'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${m.tipo==='cliente'?'rounded-br-sm text-white':'bg-white border border-black/5 text-[#0A0A0A] rounded-bl-sm'}`}
                    style={m.tipo==='cliente'?{background:color}:{}}>
                    {m.tipo!=='cliente' && <p className="text-xs font-semibold mb-1 opacity-60">{nombreEntrenador}</p>}
                    <p className="text-sm leading-relaxed">{m.contenido}</p>
                    <p className={`text-xs mt-1 ${m.tipo==='cliente'?'text-white/50':'text-[#6B6B6B]'}`}>
                      {new Date(m.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="sticky bottom-4 pt-2">
              <div className="flex gap-2 bg-white border border-black/10 rounded-2xl p-2 shadow-md">
                <textarea value={textoMsg} onChange={e=>setTextoMsg(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviarMensaje()}}}
                  placeholder="Escribe a tu entrenador..." rows={2}
                  className="flex-1 text-sm resize-none focus:outline-none px-2 py-1 text-[#0A0A0A] placeholder:text-[#6B6B6B]" />
                <button onClick={enviarMensaje} disabled={!textoMsg.trim()||enviandoMsg}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white self-end disabled:opacity-40 flex-shrink-0"
                  style={{background:color}}>
                  {enviandoMsg?<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:'↑'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== NUTRICIÓN ===== */}
        {tab === 'nutricion' && (
          <>
            {!planNutricion ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
                <p className="text-5xl mb-4">🥗</p>
                <p className="font-bold text-[#0A0A0A] text-lg">Plan en preparación</p>
                <p className="text-sm text-[#6B6B6B] mt-2">Tu entrenador está personalizando tu plan nutricional</p>
              </div>
            ) : (
              <>
                <div className="bg-[#111] rounded-2xl p-5">
                  <p className="text-white font-bold text-lg">{planNutricion.nombre}</p>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[['kcal',planNutricion.calorias_dia,'#FF5C00'],['Prot.',`${planNutricion.proteinas_g}g`,'#6366f1'],['Carbs',`${planNutricion.carbohidratos_g}g`,'#f59e0b'],['Grasa',`${planNutricion.grasas_g}g`,'#10b981']].map(([l,v,c])=>(
                      <div key={l} className="bg-white/8 rounded-xl p-2.5 text-center">
                        <p className="text-sm font-bold" style={{color:c}}>{v}</p>
                        <p className="text-white/40 text-xs mt-0.5">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Selector de día */}
                {(() => {
                  const menu = planNutricion.contenido?.menu || planNutricion.borrador?.menu || []
                  const dias = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
                  return (
                    <div className="space-y-3">
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {dias.map((d,i)=>(
                          <button key={d} onClick={()=>setDiaActivoNutr(i)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 ${i===diaActivoNutr?'text-white':'bg-white border border-black/10 text-[#6B6B6B]'}`}
                            style={i===diaActivoNutr?{background:color}:{}}>
                            {d}
                          </button>
                        ))}
                      </div>
                      {(menu[diaActivoNutr]?.comidas||[]).map((comida,i)=>(
                        <div key={i} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                          <div className="bg-[#0A0A0A] px-4 py-2.5 flex items-center justify-between">
                            <span className="text-white font-semibold text-sm">{comida.nombre}</span>
                            <span className="text-white/50 text-xs">{comida.hora} · {comida.kcal||comida.calorias}kcal</span>
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
                {/* Hidratación y recomendaciones */}
                {(planNutricion.contenido?.hidratacion||planNutricion.borrador?.hidratacion) && (
                  <div className="bg-blue-50 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-2xl">💧</span>
                    <div>
                      <p className="text-sm font-bold text-blue-900">{planNutricion.contenido?.hidratacion||planNutricion.borrador?.hidratacion}L de agua al día</p>
                      <p className="text-xs text-blue-600">Hidratación recomendada</p>
                    </div>
                  </div>
                )}
                {(planNutricion.contenido?.recomendaciones||planNutricion.borrador?.recomendaciones)?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wide mb-2">Recomendaciones</p>
                    <div className="space-y-2">
                      {(planNutricion.contenido?.recomendaciones||planNutricion.borrador?.recomendaciones).map((rec,i)=>(
                        <div key={i} className="flex items-start gap-2.5 bg-white border border-black/5 rounded-xl p-3 shadow-sm">
                          <span className="text-sm flex-shrink-0">{['💧','🕐','💪','😴','⚡'][i]||'→'}</span>
                          <p className="text-xs text-[#444] leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {planNutricion.notas_entrenador && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-1">📝 Nota de tu entrenador</p>
                    <p className="text-sm text-amber-800">{planNutricion.notas_entrenador}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== PAGOS ===== */}
        {tab === 'pagos' && (
          <>
            {pagos[0] && (() => {
              const ultimo = pagos[0]
              const vence = new Date(ultimo.fecha_pago)
              vence.setMonth(vence.getMonth()+1)
              const dias = Math.ceil((vence-new Date())/864e5)
              return (
                <div className={`rounded-2xl p-4 flex items-center gap-3 ${dias>7?'bg-emerald-50 border border-emerald-100':'bg-red-50 border border-red-100'}`}>
                  <span className="text-2xl">{dias>7?'✅':'⚠️'}</span>
                  <div>
                    <p className={`text-sm font-bold ${dias>7?'text-emerald-800':'text-red-800'}`}>{dias>7?'Suscripción al día':dias>0?`Vence en ${dias} días`:'Pago vencido'}</p>
                    <p className={`text-xs ${dias>7?'text-emerald-600':'text-red-600'}`}>{ultimo.concepto} · {Number(ultimo.importe).toFixed(0)}€/mes</p>
                  </div>
                </div>
              )
            })()}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              {pagos.map((p,i)=>(
                <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i>0?'border-t border-black/5':''}`}>
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 text-sm">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0A0A0A]">{p.concepto||'Entrenamiento'}</p>
                    <p className="text-xs text-[#6B6B6B]">{new Date(p.fecha_pago+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">+{Number(p.importe).toFixed(0)}€</p>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
