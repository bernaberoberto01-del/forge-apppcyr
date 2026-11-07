import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useOnboarding } from '../hooks/useOnboarding'
import ClienteQuickView from '../components/ClienteQuickView'
import { supabase } from '../lib/supabase'
import { useEquipo } from '../hooks/useCentro'
import { BRAND } from '../lib/brand'

const PLANTILLAS = [
  { id: 'bienvenida', icon: '👋', label: 'Bienvenida', texto: '¡Hola! Bienvenido/a al equipo. Ya tengo tus datos y estoy preparando tu plan personalizado. En breve tendrás tu rutina lista. Cualquier duda, escríbeme aquí o por WhatsApp. ¡Vamos a por ello! 💪' },
  { id: 'rutina_lista', icon: '💪', label: 'Rutina lista', texto: '¡Tu rutina ya está disponible en el portal! Revísala con calma y si tienes alguna duda sobre algún ejercicio no dudes en preguntarme. Esta semana la ponemos en práctica 🔥' },
  { id: 'buen_trabajo', icon: '🙌', label: 'Buen trabajo', texto: 'He revisado tus últimos check-ins y sesiones — vas muy bien. Se nota el esfuerzo y la constancia. Sigue así, los resultados llegan 💯' },
  { id: 'animo', icon: '⚡', label: 'Ánimo', texto: 'Sé que esta semana ha sido dura, pero es en los momentos difíciles cuando se forja el carácter. Un paso cada día es suficiente. Cuenta conmigo 💙' },
  { id: 'recordatorio', icon: '📋', label: 'Check-in', texto: 'Recuerda rellenar el check-in semanal cuando puedas — me ayuda mucho a ajustar tu plan. Solo son 2 minutos y marca la diferencia en tus resultados 🎯' },
  { id: 'progreso', icon: '📈', label: 'Progreso', texto: 'He revisado tu evolución del último mes y los números hablan solos. Estás avanzando exactamente como esperaba. El próximo mes ajustamos el programa para seguir progresando 🚀' },
  { id: 'pausa', icon: '⏸', label: 'Pausa', texto: 'No te preocupes por la pausa — el descanso también es parte del proceso. Cuando retomemos iremos poco a poco y en pocas semanas estarás al nivel donde lo dejaste. Aquí estaré.' },
  { id: 'renovacion', icon: '🔄', label: 'Renovación', texto: 'Tu mensualidad está próxima a vencer. Si quieres renovar, puedes hacerlo desde el portal o dime y te mando el enlace de pago. Un placer seguir trabajando contigo 💪' },
]

// Segmentos predefinidos para mensajes grupales
const SEGMENTOS = [
  { id: 'todos', label: 'Todos los clientes', icon: '👥', filtro: () => true },
  { id: 'online', label: 'Clientes online', icon: '🌐', filtro: c => c.tipo === 'online' },
  { id: 'presencial', label: 'Clientes presenciales', icon: '📍', filtro: c => c.tipo === 'presencial' },
  { id: 'sin_checkin', label: 'Sin check-in esta semana', icon: '⚠️', filtro: (c, checkins) => {
    const hoy = new Date()
    const lunes = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() + 1))
    lunes.setHours(0,0,0,0)
    return !checkins[c.id] || new Date(checkins[c.id]) < lunes
  }},
]

const AVATARES = [BRAND.color,'#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#8b5cf6']
const avatarColor = n => AVATARES[(n||'').charCodeAt(0) % AVATARES.length]
const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

export default function Mensajes({ session }) {
  const uid = session.user.id
  const equipo = useEquipo(uid)
  const location = useLocation()
  const { completar, completado } = useOnboarding(uid)
  const [clientes, setClientes] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [noLeidos, setNoLeidos] = useState({})
  const [ultimoMensaje, setUltimoMensaje] = useState({}) // { clienteId: { contenido, tipo, created_at } }
  const [showPlantillas, setShowPlantillas] = useState(false)
  const [generandoLink, setGenerandoLink] = useState(false)
  const [modalPago, setModalPago] = useState(false)
  const [tarifas, setTarifas] = useState([])

  // ── Mensajes grupales ──
  const [modalGrupal, setModalGrupal] = useState(false)
  const [grupalTexto, setGrupalTexto] = useState('')
  const [grupalSegmento, setGrupalSegmento] = useState('todos')
  const [grupalSeleccion, setGrupalSeleccion] = useState([]) // ids seleccionados manualmente
  const [grupalModo, setGrupalModo] = useState('segmento') // 'segmento' | 'manual'
  const [enviandoGrupal, setEnviandoGrupal] = useState(false)
  const [grupalProgreso, setGrupalProgreso] = useState(null) // { enviados, total }
  const [ultimosCheckins, setUltimosCheckins] = useState({}) // { clienteId: fecha }

  useEffect(() => {
    if (!uid) return
    supabase.from('tarifas').select('id,nombre,tipo,precio,stripe_price_id,modalidad,dias_semana')
      .in('entrenador_id', equipo).eq('activa', true).not('stripe_price_id', 'is', null)
      .then(({ data, error }) => {
        if (error) { setToast('Error al cargar tarifas: ' + error.message); return }
        setTarifas(data || [])
      })
    // Cargar último check-in por cliente para segmento "sin_checkin"
    supabase.from('checkins').select('cliente_id,fecha')
      .in('entrenador_id', equipo).order('fecha', { ascending: false }).limit(500)
      .then(({ data }) => {
        const uc = {}
        ;(data || []).forEach(c => { if (!uc[c.cliente_id]) uc[c.cliente_id] = c.fecha })
        setUltimosCheckins(uc)
      })
  }, [uid, equipo])

  async function generarLinkPago(tarifaId, tarifaNombre) {
    if (!seleccionado) return
    setGenerandoLink(true)
    setModalPago(false)
    try {
      const { data, error } = await supabase.functions.invoke('crear-checkout', {
        body: { cliente_id: seleccionado.id, tarifa_id: tarifaId }
      })
      if (error || !data?.url) throw new Error(error?.message || 'Sin URL')
      const linkMsg = `Aquí tienes el enlace para formalizar tu plan:\n\n${data.url}\n\nUna vez completado el pago, activo tu plan y en menos de 24h tienes todo preparado. ¡Vamos a por ello! 💪`
      setTexto(linkMsg)
      await navigator.clipboard.writeText(data.url).catch(() => {})
      setToast('✓ Link generado y añadido al mensaje')
    } catch (e) {
      setToast('Error al generar link: ' + e.message)
    }
    setGenerandoLink(false)
  }
  const [quickView, setQuickView] = useState(null)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const endRef = useRef()

  useEffect(() => { cargarClientes() }, [uid, equipo])
  useEffect(() => {
    if (location.state?.clienteId && clientes.length) {
      const c = clientes.find(cl => cl.id === location.state.clienteId)
      if (c) {
        setSeleccionado(c)
        if (location.state.mensaje) setTexto(location.state.mensaje)
      }
    }
  }, [location.state, clientes])
  useEffect(() => { if (seleccionado) cargarMensajes(seleccionado.id) }, [seleccionado, equipo])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function cargarClientes() {
    setLoading(true)
    const [{ data: cl, error: errCl }, { data: ms, error: errMs }, { data: ult, error: errUlt }] = await Promise.all([
      supabase.from('clientes').select('id,nombre,tipo,estado,plan_online,suscripcion_activa,email').in('entrenador_id', equipo).eq('estado','activo').order('nombre'),
      supabase.from('mensajes_cliente').select('cliente_id,leido_entrenador,tipo,created_at')
        .in('entrenador_id', equipo).eq('leido_entrenador', false).neq('tipo','entrenador').neq('tipo','sistema'),
      supabase.from('mensajes_cliente').select('cliente_id,contenido,tipo,created_at')
        .in('entrenador_id', equipo).order('created_at', { ascending: false }).limit(200)
    ])
    if (errCl || errMs) setToast('Error al cargar clientes: ' + (errCl?.message || errMs?.message))
    setClientes(cl || [])
    const nl = {}
    ;(ms || []).forEach(m => { nl[m.cliente_id] = (nl[m.cliente_id] || 0) + 1 })
    setNoLeidos(nl)
    const um = {}
    ;(ult || []).forEach(m => { if (!um[m.cliente_id]) um[m.cliente_id] = m })
    setUltimoMensaje(um)
    setLoading(false)
  }

  async function cargarMensajes(clienteId) {
    const { data, error } = await supabase.from('mensajes_cliente')
      .select('*').eq('cliente_id', clienteId).order('created_at', { ascending: true })
    if (error) setToast('Error al cargar mensajes: ' + error.message)
    setMensajes(data || [])
    const { error: errUpd } = await supabase.from('mensajes_cliente')
      .update({ leido_entrenador: true })
      .eq('cliente_id', clienteId)
      .in('entrenador_id', equipo)
      .neq('tipo', 'entrenador')
    if (errUpd) setToast('Error al marcar como leído: ' + errUpd.message)
    setNoLeidos(prev => { const n = {...prev}; delete n[clienteId]; return n })
  }

  async function enviar(textoMsg) {
    const msg = textoMsg || texto.trim()
    if (!msg || !seleccionado) return
    setEnviando(true)
    try {
      const { error } = await supabase.from('mensajes_cliente').insert({
        entrenador_id: uid,
        cliente_id: seleccionado.id,
        contenido: msg,
        tipo: 'entrenador',
        leido: false,
        leido_entrenador: true
      })
      if (error) { setToast('Error al enviar mensaje: ' + error.message); return }
      setTexto('')
      setShowPlantillas(false)
      setUltimoMensaje(prev => ({
        ...prev,
        [seleccionado.id]: { cliente_id: seleccionado.id, contenido: msg, tipo: 'entrenador', created_at: new Date().toISOString() }
      }))
      await cargarMensajes(seleccionado.id)
      supabase.functions.invoke('notificar-mensaje', {
        body: { cliente_id: seleccionado.id, tipo: 'mensaje_entrenador', preview: msg.slice(0, 200) }
      }).catch(() => {})
    } finally {
      setEnviando(false)
    }
  }

  // ── Envío masivo ──
  function getDestinatariosGrupal() {
    if (grupalModo === 'manual') {
      return clientes.filter(c => grupalSeleccion.includes(c.id))
    }
    const seg = SEGMENTOS.find(s => s.id === grupalSegmento)
    if (!seg) return []
    return clientes.filter(c => seg.filtro(c, ultimosCheckins))
  }

  async function enviarGrupal() {
    const msg = grupalTexto.trim()
    if (!msg) return
    const destinatarios = getDestinatariosGrupal()
    if (destinatarios.length === 0) {
      setToast('No hay destinatarios para este segmento')
      return
    }
    setEnviandoGrupal(true)
    setGrupalProgreso({ enviados: 0, total: destinatarios.length })

    let enviados = 0
    for (const cliente of destinatarios) {
      try {
        await supabase.from('mensajes_cliente').insert({
          entrenador_id: uid,
          cliente_id: cliente.id,
          contenido: msg,
          tipo: 'entrenador',
          leido: false,
          leido_entrenador: true
        })
        // Notificación asíncrona, no bloquea
        supabase.functions.invoke('notificar-mensaje', {
          body: { cliente_id: cliente.id, tipo: 'mensaje_entrenador', preview: msg.slice(0, 200) }
        }).catch(() => {})
        enviados++
        setGrupalProgreso({ enviados, total: destinatarios.length })
        // Pausa pequeña para no saturar DB
        await new Promise(r => setTimeout(r, 80))
      } catch {}
    }

    // Actualizar previews de último mensaje
    const now = new Date().toISOString()
    const nuevoPreview = {}
    destinatarios.forEach(c => { nuevoPreview[c.id] = { cliente_id: c.id, contenido: msg, tipo: 'entrenador', created_at: now } })
    setUltimoMensaje(prev => ({ ...prev, ...nuevoPreview }))

    setToast(`✓ Enviado a ${enviados} cliente${enviados !== 1 ? 's' : ''}`)
    setEnviandoGrupal(false)
    setGrupalProgreso(null)
    setGrupalTexto('')
    setModalGrupal(false)
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  ).sort((a,b) => {
    const nlDiff = (noLeidos[b.id]||0) - (noLeidos[a.id]||0)
    if (nlDiff !== 0) return nlDiff
    const fechaA = ultimoMensaje[a.id]?.created_at || ''
    const fechaB = ultimoMensaje[b.id]?.created_at || ''
    return fechaB.localeCompare(fechaA)
  })

  const totalNoLeidos = Object.values(noLeidos).reduce((s,v) => s+v, 0)

  const destinatariosPreview = getDestinatariosGrupal()

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-screen overflow-hidden">
      {toast && (
        <div className="fixed bottom-4 right-4 z-[60] bg-[#111] text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-xs">
          {toast}
        </div>
      )}

      {/* Sidebar clientes */}
      <div className={`${seleccionado ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 bg-white border-r border-black/5 flex-shrink-0`}>
        {/* Header */}
        <div className="p-4 border-b border-black/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-[#0A0A0A]">Mensajes</h1>
              {totalNoLeidos > 0 && <p className="text-xs text-acento font-medium">{totalNoLeidos} sin leer</p>}
            </div>
            {/* Botón mensaje grupal */}
            <button
              onClick={() => { setModalGrupal(true); setGrupalTexto(''); setGrupalModo('segmento'); setGrupalSegmento('todos'); setGrupalSeleccion([]) }}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#F5F5F0] hover:bg-acento/10 hover:text-acento border border-black/8 px-3 py-1.5 rounded-xl transition-all"
              title="Enviar a todos o a un segmento">
              📢 <span className="hidden sm:inline">Grupal</span>
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full bg-[#F5F5F0] border-0 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-acento" />
          </div>
        </div>

        {/* Lista clientes */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-3 border-acento border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-sm text-[#6B6B6B]">{busqueda ? 'Sin resultados' : 'Sin clientes activos'}</p>
            </div>
          ) : clientesFiltrados.map(c => {
            const nl = noLeidos[c.id] || 0
            const isSelected = seleccionado?.id === c.id
            return (
              <button key={c.id} onClick={() => setSeleccionado(c)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-black/5 transition-all ${isSelected ? 'bg-acento/5 border-l-2 border-l-acento' : 'hover:bg-[#F5F5F0]'}`}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: avatarColor(c.nombre) }}>
                    {ini(c.nombre)}
                  </div>
                  {nl > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-acento rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{nl}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className={`text-sm truncate ${nl > 0 ? 'font-bold text-[#0A0A0A]' : 'font-medium text-[#0A0A0A]'}`}>{c.nombre}</p>
                    {ultimoMensaje[c.id] && (
                      <span className="text-[10px] text-[#9B9B9B] flex-shrink-0">
                        {new Date(ultimoMensaje[c.id].created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
                      </span>
                    )}
                  </div>
                  {ultimoMensaje[c.id] ? (
                    <p className={`text-xs truncate ${nl > 0 ? 'font-semibold text-[#0A0A0A]' : 'text-[#6B6B6B]'}`}>
                      {ultimoMensaje[c.id].tipo === 'entrenador' ? '↗ ' : ''}{ultimoMensaje[c.id].contenido}
                    </p>
                  ) : (
                    <p className="text-xs text-[#9B9B9B]">{c.tipo === 'online' ? '🌐 Online' : '📍 Presencial'} · Sin mensajes</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Conversación */}
      {seleccionado ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F5F0]">
          {/* Header conversación */}
          <div className="bg-white border-b border-black/5 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setSeleccionado(null)} className="md:hidden text-[#6B6B6B] mr-1">←</button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: avatarColor(seleccionado.nombre) }}>
              {ini(seleccionado.nombre)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#0A0A0A] truncate">{seleccionado.nombre}</p>
              <p className="text-xs text-[#6B6B6B]">{seleccionado.tipo === 'online' ? '🌐 Online' : '📍 Presencial'} · ve los mensajes en su portal</p>
            </div>
            <button onClick={() => setQuickView(seleccionado.id)}
              className="text-xs border border-black/10 text-[#6B6B6B] px-3 py-1.5 rounded-lg hover:bg-[#F5F5F0] transition-all flex-shrink-0">
              👤 Perfil
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mensajes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-sm font-semibold text-[#0A0A0A]">Sin mensajes todavía</p>
                <p className="text-xs text-[#6B6B6B] mt-1 mb-4">Usa una plantilla para empezar</p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                  {PLANTILLAS.slice(0,4).map(p => (
                    <button key={p.id} onClick={() => enviar(p.texto)} disabled={enviando}
                      className="bg-white border border-black/10 rounded-xl p-3 text-left hover:border-acento transition-all disabled:opacity-40">
                      <p className="text-base mb-1">{p.icon}</p>
                      <p className="text-xs font-semibold text-[#0A0A0A]">{p.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {mensajes.map(m => {
                  const esMio = m.tipo === 'entrenador'
                  return (
                    <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[80%]">
                        {!esMio && (
                          <p className="text-xs text-[#6B6B6B] font-medium mb-1 px-1">
                            {seleccionado?.nombre?.split(' ')[0]}
                          </p>
                        )}
                        <div className={`text-sm px-4 py-3 rounded-2xl leading-relaxed ${
                          esMio
                            ? 'bg-[#111] text-white rounded-br-sm'
                            : 'bg-white border border-black/8 text-[#0A0A0A] rounded-bl-sm'
                        } ${m.tipo === 'borrador_ia' ? 'border-2 border-dashed border-amber-300 bg-amber-50 text-amber-900' : ''}`}>
                          {m.tipo === 'borrador_ia' && (
                            <p className="text-xs font-semibold text-amber-600 mb-1.5">✨ Sugerencia IA</p>
                          )}
                          {m.contenido}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-1 ${esMio ? 'justify-end' : 'justify-start'}`}>
                          <p className="text-xs text-[#6B6B6B]">
                            {new Date(m.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short'})} · {new Date(m.created_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
                          </p>
                          {esMio && <span className="text-xs text-[#6B6B6B]">{m.leido ? '✓✓' : '✓'}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </>
            )}
          </div>

          {/* Plantillas */}
          {showPlantillas && (
            <div className="bg-white border-t border-black/5 p-3 overflow-x-auto flex-shrink-0">
              <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Plantillas rápidas</p>
              <div className="flex gap-2">
                {PLANTILLAS.map(p => (
                  <button key={p.id} onClick={() => { setTexto(p.texto); setShowPlantillas(false) }}
                    className="flex-shrink-0 bg-[#F5F5F0] border border-black/10 rounded-xl px-3 py-2 text-left hover:border-acento transition-all">
                    <p className="text-base">{p.icon}</p>
                    <p className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap mt-0.5">{p.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="bg-white border-t border-black/5 p-3 flex items-end gap-2 flex-shrink-0">
            <button onClick={() => setShowPlantillas(v => !v)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0 ${showPlantillas ? 'bg-acento text-white' : 'border border-black/10 text-[#6B6B6B] hover:bg-[#F5F5F0]'}`}>
              ⚡
            </button>
            {/* Botón link de pago */}
            <button onClick={() => setModalPago(true)} disabled={generandoLink}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-black/10 text-[#6B6B6B] hover:bg-[#F5F5F0] transition-all flex-shrink-0 disabled:opacity-40">
              {generandoLink ? <span className="w-4 h-4 border-2 border-acento border-t-transparent rounded-full animate-spin"/> : '💳'}
            </button>
            {/* Botón cuestionario nutrición */}
            {seleccionado?.plan_online && (seleccionado.plan_online === 'nutricion' || seleccionado.plan_online === 'completo') && (
              <button
                onClick={() => {
                  const link = `${window.location.origin}/nutricion-cuest?e=${uid}&c=${seleccionado.id}`
                  const msg = `Hola ${seleccionado?.nombre?.split(' ')[0]} 👋\n\nPara preparar tu plan de alimentación personalizado necesito que rellenes este breve cuestionario nutricional:\n\n${link}\n\nSolo te llevará 2-3 minutos. Con esa información podré crear un plan adaptado exactamente a ti. ¡Gracias!`
                  setTexto(msg)
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-black/10 text-emerald-600 hover:bg-emerald-50 transition-all flex-shrink-0"
                title="Enviar link cuestionario nutrición">
                🥗
              </button>
            )}
            <textarea value={texto} onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              rows={texto.split('\n').length > 2 ? 3 : 1}
              placeholder="Escribe un mensaje... (Enter para enviar)"
              className="flex-1 border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento resize-none transition-all" />
            <button onClick={() => enviar()} disabled={!texto.trim() || enviando}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-white disabled:opacity-40 transition-all flex-shrink-0"
              style={{ background: 'var(--acento)' }}>
              {enviando ? '⏳' : '→'}
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#F5F5F0]">
          <div className="text-center">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-lg font-bold text-[#0A0A0A]">Selecciona un cliente</p>
            <p className="text-sm text-[#6B6B6B] mt-2">para ver o enviar mensajes</p>
            <button
              onClick={() => { setModalGrupal(true); setGrupalTexto(''); setGrupalModo('segmento'); setGrupalSegmento('todos'); setGrupalSeleccion([]) }}
              className="mt-6 flex items-center gap-2 mx-auto text-sm font-semibold bg-white border border-black/10 hover:border-acento hover:text-acento px-5 py-2.5 rounded-xl transition-all">
              📢 Enviar mensaje grupal
            </button>
          </div>
        </div>
      )}
      {quickView && <ClienteQuickView clienteId={quickView} onClose={() => setQuickView(null)} />}

      {/* Modal selección tarifa para link de pago */}
      {modalPago && seleccionado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModalPago(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-[#0A0A0A]">💳 Generar link de pago</h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">Para {seleccionado?.nombre?.split(' ')[0]}</p>
              </div>
              <button onClick={() => setModalPago(false)} className="text-[#9B9B9B] text-xl leading-none">×</button>
            </div>

            {/* Online */}
            {tarifas.filter(t => t.tipo === 'online').length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-2">🌐 Asesorías online</p>
                <div className="space-y-2">
                  {tarifas.filter(t => t.tipo === 'online').map(t => (
                    <button key={t.id} onClick={() => generarLinkPago(t.id, t.nombre)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-black/10 hover:border-acento hover:bg-acento/5 transition-all text-left">
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">{t.nombre}</p>
                        <p className="text-xs text-[#9B9B9B]">Suscripción mensual</p>
                      </div>
                      <p className="text-sm font-bold text-acento">{t.precio}€/mes</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Presencial */}
            {tarifas.filter(t => t.tipo !== 'online').length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-2">📍 Presencial</p>
                <div className="space-y-2">
                  {tarifas.filter(t => t.tipo !== 'online').map(t => (
                    <button key={t.id} onClick={() => generarLinkPago(t.id, t.nombre)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-black/10 hover:border-acento hover:bg-acento/5 transition-all text-left">
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">{t.nombre}</p>
                        <p className="text-xs text-[#9B9B9B]">{t.modalidad} · {t.dias_semana}d/sem</p>
                      </div>
                      <p className="text-sm font-bold text-acento">{t.precio}€/mes</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tarifas.length === 0 && (
              <p className="text-sm text-[#9B9B9B] text-center py-4">No hay tarifas con Stripe configurado</p>
            )}
          </div>
        </div>
      )}

      {/* ── Modal mensajes grupales ── */}
      {modalGrupal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => !enviandoGrupal && setModalGrupal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-black/5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#0A0A0A] text-base">📢 Mensaje grupal</h3>
                  <p className="text-xs text-[#9B9B9B] mt-0.5">Envía el mismo mensaje a varios clientes</p>
                </div>
                {!enviandoGrupal && (
                  <button onClick={() => setModalGrupal(false)} className="text-[#9B9B9B] text-xl leading-none">×</button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Selector modo */}
              <div>
                <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-2">¿A quién?</p>
                <div className="flex gap-2">
                  <button onClick={() => setGrupalModo('segmento')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${grupalModo === 'segmento' ? 'bg-acento/10 border-acento text-acento' : 'border-black/10 text-[#6B6B6B] hover:bg-[#F5F5F0]'}`}>
                    Por segmento
                  </button>
                  <button onClick={() => setGrupalModo('manual')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${grupalModo === 'manual' ? 'bg-acento/10 border-acento text-acento' : 'border-black/10 text-[#6B6B6B] hover:bg-[#F5F5F0]'}`}>
                    Selección manual
                  </button>
                </div>
              </div>

              {/* Segmento */}
              {grupalModo === 'segmento' && (
                <div className="space-y-2">
                  {SEGMENTOS.map(seg => {
                    const count = clientes.filter(c => seg.filtro(c, ultimosCheckins)).length
                    return (
                      <button key={seg.id} onClick={() => setGrupalSegmento(seg.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${grupalSegmento === seg.id ? 'bg-acento/8 border-acento' : 'border-black/8 hover:bg-[#F5F5F0]'}`}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{seg.icon}</span>
                          <p className={`text-sm font-semibold ${grupalSegmento === seg.id ? 'text-acento' : 'text-[#0A0A0A]'}`}>{seg.label}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${grupalSegmento === seg.id ? 'bg-acento text-white' : 'bg-[#F5F5F0] text-[#6B6B6B]'}`}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Selección manual */}
              {grupalModo === 'manual' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[#9B9B9B]">{grupalSeleccion.length} seleccionados</p>
                    <button onClick={() => setGrupalSeleccion(grupalSeleccion.length === clientes.length ? [] : clientes.map(c => c.id))}
                      className="text-xs text-acento font-semibold hover:underline">
                      {grupalSeleccion.length === clientes.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {clientes.map(c => {
                      const sel = grupalSeleccion.includes(c.id)
                      return (
                        <button key={c.id} onClick={() => setGrupalSeleccion(prev => sel ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${sel ? 'bg-acento/8 border-acento/30' : 'border-black/8 hover:bg-[#F5F5F0]'}`}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: avatarColor(c.nombre) }}>{ini(c.nombre)}</div>
                          <p className="text-sm font-medium text-[#0A0A0A] flex-1 text-left">{c.nombre}</p>
                          <span className="text-xs text-[#9B9B9B]">{c.tipo === 'online' ? '🌐' : '📍'}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${sel ? 'bg-acento border-acento' : 'border-black/20'}`}>
                            {sel && <span className="text-white text-[10px] font-bold">✓</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Mensaje */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide">Mensaje</p>
                  <p className="text-xs text-[#9B9B9B]">{grupalTexto.length}/500</p>
                </div>
                <textarea
                  value={grupalTexto}
                  onChange={e => setGrupalTexto(e.target.value.slice(0, 500))}
                  rows={4}
                  placeholder="Escribe tu mensaje para todos los clientes del segmento..."
                  className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-acento resize-none transition-all"
                />
                {/* Plantillas rápidas */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PLANTILLAS.slice(0,5).map(p => (
                    <button key={p.id} onClick={() => setGrupalTexto(p.texto)}
                      className="text-xs bg-[#F5F5F0] hover:bg-acento/10 hover:text-acento border border-black/8 px-2.5 py-1 rounded-lg transition-all">
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview destinatarios */}
              {destinatariosPreview.length > 0 && grupalTexto.trim() && (
                <div className="bg-[#F5F5F0] rounded-xl p-3">
                  <p className="text-xs font-semibold text-[#6B6B6B] mb-1.5">
                    Se enviará a {destinatariosPreview.length} cliente{destinatariosPreview.length !== 1 ? 's' : ''}:
                  </p>
                  <p className="text-xs text-[#9B9B9B] leading-relaxed">
                    {destinatariosPreview.slice(0,6).map(c => c.nombre.split(' ')[0]).join(', ')}
                    {destinatariosPreview.length > 6 && ` y ${destinatariosPreview.length - 6} más`}
                  </p>
                </div>
              )}

              {/* Progreso envío */}
              {grupalProgreso && (
                <div className="bg-acento/8 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-acento">Enviando mensajes…</p>
                    <p className="text-sm font-bold text-acento">{grupalProgreso.enviados}/{grupalProgreso.total}</p>
                  </div>
                  <div className="w-full bg-acento/20 rounded-full h-2">
                    <div className="bg-acento rounded-full h-2 transition-all duration-300"
                      style={{ width: `${(grupalProgreso.enviados / grupalProgreso.total) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-black/5 flex-shrink-0">
              <button
                onClick={enviarGrupal}
                disabled={!grupalTexto.trim() || destinatariosPreview.length === 0 || enviandoGrupal}
                className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
                style={{ background: 'var(--acento)' }}>
                {enviandoGrupal
                  ? `Enviando a ${grupalProgreso?.total || destinatariosPreview.length} clientes…`
                  : `Enviar a ${destinatariosPreview.length} cliente${destinatariosPreview.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
