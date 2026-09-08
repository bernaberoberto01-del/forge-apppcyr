import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── helpers ────────────────────────────────────────────────────────────────
const qa = p => p.then(r => r.data || []).catch(() => [])
const q1 = p => p.then(r => r.data?.[0] || r.data || null).catch(() => null)
const hoyStr = () => new Date().toISOString().split('T')[0]
const hace = days => new Date(Date.now() - days * 864e5).toISOString().split('T')[0]

// ─── Portal principal ────────────────────────────────────────────────────────
export default function PortalForge() {
  const [sesion, setSesion] = useState(undefined)
  const [cliente, setCliente] = useState(null)
  const [datos, setDatos] = useState(null) // todos los datos de una vez
  const [cargando, setCargando] = useState(true)
  const [sinCuenta, setSinCuenta] = useState(false)
  const [tab, setTab] = useState('inicio')
  const [subTab, setSubTab] = useState('peso')
  const [config, setConfig] = useState(null)

  // modales
  const [modalCI, setModalCI] = useState(false)
  const [ciForm, setCiForm] = useState({ energia: null, sueno: null, fatiga: null, estres: null, peso: '', nota: '' })
  const [enviandoCI, setEnviandoCI] = useState(false)
  const [valorando, setValorando] = useState(null)
  const [rpe, setRpe] = useState(null)
  const [fatiga, setFatiga] = useState(null)
  const [guardandoVal, setGuardandoVal] = useState(false)
  const [toast, setToast] = useState('')
  const [textoMsg, setTextoMsg] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const mensajesEndRef = useRef(null)

  const color = config?.color_acento || '#FF5C00'

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSesion(session?.user || null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSesion(s?.user || null))
    return () => subscription.unsubscribe()
  }, [])

  // ── Carga completa de datos ───────────────────────────────────────────────
  useEffect(() => {
    if (sesion === undefined) return
    if (!sesion) { setCargando(false); return }
    cargarTodo()
  }, [sesion])

  async function cargarTodo() {
    setCargando(true)
    const { data: cl, error } = await supabase.from('clientes').select('*').eq('auth_user_id', sesion.id).maybeSingle()
    if (error || !cl) { setSinCuenta(true); setCargando(false); return }
    setCliente(cl)

    const cid = cl.id
    const eid = cl.entrenador_id
    const hoy = hoyStr()

    const [cfg, rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes,
           mensajes, pagos, marcas, medidas, fotos, cuest] = await Promise.all([
      q1(supabase.from('configuracion').select('nombre_entrenador,foto_url,nombre_negocio,color_acento').eq('entrenador_id', eid)),
      q1(supabase.from('rutinas').select('id,nombre,semanas,contenido,borrador').eq('cliente_id', cid).eq('estado', 'publicada').order('created_at', { ascending: false })),
      q1(supabase.from('planes_nutricion').select('*').eq('cliente_id', cid).in('estado', ['publicado', 'publicada']).order('created_at', { ascending: false })),
      qa(supabase.from('checkins').select('*').eq('cliente_id', cid).order('fecha', { ascending: false }).limit(24)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).gte('fecha', hoy).eq('cancelada', false).order('fecha').order('hora').limit(8)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).eq('fecha', hoy).eq('cancelada', false)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).eq('completada', true).eq('cancelada', false).is('rpe', null).gte('fecha', hace(14)).lte('fecha', hoy).order('fecha', { ascending: false }).limit(3)),
      qa(supabase.from('mensajes_cliente').select('*').eq('cliente_id', cid).order('created_at', { ascending: true })),
      qa(supabase.from('pagos').select('*').eq('cliente_id', cid).order('fecha_pago', { ascending: false })),
      qa(supabase.from('marcas_cliente').select('*').eq('cliente_id', cid).order('fecha', { ascending: false })),
      qa(supabase.from('medidas_cliente').select('*').eq('cliente_id', cid).order('fecha', { ascending: false })),
      qa(supabase.from('fotos_progreso').select('*').eq('cliente_id', cid).eq('visible_cliente', true).order('fecha', { ascending: false })),
      supabase.from('cuestionarios_nutricion').select('id').eq('cliente_id', cid).limit(1).then(r => !!(r.data?.length)).catch(() => false),
    ])

    setConfig(cfg)
    setDatos({ rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes, mensajes, pagos, marcas, medidas, fotos, cuest })

    // Marcar mensajes como leídos
    supabase.from('mensajes_cliente').update({ leido: true }).eq('cliente_id', cid).eq('leido', false).then(() => {}).catch(() => {})

    // Registrar acceso
    setTimeout(() => supabase.from('actividad_cliente').insert({ cliente_id: cid, entrenador_id: eid, tipo: 'portal_acceso', descripcion: 'Entró al portal' }).then(() => {}).catch(() => {}), 2000)

    setCargando(false)
  }

  // ── Enviar check-in ──────────────────────────────────────────────────────
  async function enviarCheckin() {
    if (!ciForm.energia || !ciForm.sueno || !ciForm.fatiga || !ciForm.estres) return
    setEnviandoCI(true)
    const hoy = hoyStr()
    const { error } = await supabase.from('checkins').insert({
      cliente_id: cliente.id, entrenador_id: cliente.entrenador_id, fecha: hoy,
      energia: ciForm.energia, sueno: ciForm.sueno, fatiga: ciForm.fatiga, estres: ciForm.estres,
      peso: ciForm.peso ? parseFloat(ciForm.peso) : null, comentario: ciForm.nota || null, adherencia_entreno: 5
    })
    if (!error) {
      const nuevo = { id: Date.now() + '', fecha: hoy, ...ciForm, peso: ciForm.peso ? parseFloat(ciForm.peso) : null }
      setDatos(d => ({ ...d, checkins: [nuevo, ...d.checkins] }))
      setModalCI(false)
      setCiForm({ energia: null, sueno: null, fatiga: null, estres: null, peso: '', nota: '' })
      showToast('✓ Check-in enviado')
    }
    setEnviandoCI(false)
  }

  // ── Valorar sesión ───────────────────────────────────────────────────────
  async function guardarValoracion() {
    if (!rpe || !fatiga || !valorando) return
    setGuardandoVal(true)
    await supabase.from('sesiones').update({ rpe, fatiga_post: fatiga }).eq('id', valorando.id)
    setDatos(d => ({ ...d, pendientes: d.pendientes.filter(s => s.id !== valorando.id) }))
    setValorando(null); setRpe(null); setFatiga(null)
    showToast('✓ Valoración guardada')
    setGuardandoVal(false)
  }

  // ── Enviar mensaje ───────────────────────────────────────────────────────
  async function enviarMensaje(e) {
    e.preventDefault()
    if (!textoMsg.trim() || enviandoMsg) return
    setEnviandoMsg(true)
    const texto = textoMsg.trim()
    setTextoMsg('')
    await supabase.functions.invoke('portal-accion', { body: { accion: 'enviar_mensaje', datos: { contenido: texto } } }).catch(() => {})
    const msgs = await qa(supabase.from('mensajes_cliente').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: true }))
    setDatos(d => ({ ...d, mensajes: msgs }))
    setEnviandoMsg(false)
    setTimeout(() => mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // ── Loading / guards ──────────────────────────────────────────────────────
  if (sesion === undefined || cargando) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F3' }}>
      <div className="w-8 h-8 border-[3px] border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF5C00', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!sesion) return <LoginPortal />

  if (sinCuenta || !cliente) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F7F6F3' }}>
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border border-black/5">
        <p className="text-5xl mb-4">🔗</p>
        <p className="font-bold text-xl mb-2 text-[#0A0A0A]">Cuenta no reconocida</p>
        <p className="text-sm text-[#6B6B6B] mb-6 leading-relaxed">El email con el que has entrado no está vinculado a ningún cliente. Contacta con tu entrenador.</p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
          className="w-full font-bold py-3.5 rounded-2xl text-white text-sm" style={{ background: '#FF5C00' }}>
          Probar con otro email
        </button>
      </div>
    </div>
  )

  if (!datos) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F3' }}>
      <div className="w-8 h-8 border-[3px] border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
    </div>
  )

  const { rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes, mensajes, pagos, marcas, medidas, fotos, cuest } = datos
  const esOnline = cliente.tipo === 'online'
  const plan = cliente.plan_online
  const verRutina = !esOnline || ['entrenamiento', 'completo'].includes(plan)
  const verNutricion = !esOnline || ['nutricion', 'completo'].includes(plan)
  const nombre = cliente.nombre?.split(' ')[0] || ''
  const iniciales = cliente.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
  const msgNoLeidos = mensajes.filter(m => !m.leido && m.tipo === 'entrenador').length

  const TABS = [
    { id: 'inicio', label: 'Inicio', icon: '⊞' },
    ...(verRutina && rutina ? [{ id: 'rutina', label: 'Rutina', icon: '💪' }] : []),
    ...(verNutricion && (nutricion || cuest) ? [{ id: 'nutricion', label: 'Nutrición', icon: '🥗' }] : []),
    { id: 'progreso', label: 'Progreso', icon: '📈' },
    { id: 'mensajes', label: 'Mensajes', icon: '✉️', badge: msgNoLeidos },
    ...(pagos.length ? [{ id: 'pagos', label: 'Pagos', icon: '💳' }] : []),
    { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
  ]

  const TABS_BOTTOM = TABS.slice(0, 5)

  return (
    <div className="min-h-screen flex" style={{ background: '#F7F6F3', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-black/6 fixed h-full z-20">
        <div className="px-5 py-5 border-b border-black/5">
          <div className="flex items-center gap-3">
            {config?.foto_url
              ? <img src={config.foto_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
              : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: color }}>
                  {(config?.nombre_entrenador || 'E').slice(0, 2).toUpperCase()}
                </div>
            }
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#0A0A0A] truncate">{config?.nombre_entrenador || 'Tu entrenador'}</p>
              <p className="text-[10px] text-[#9B9B9B] truncate">{config?.nombre_negocio || ''}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${tab === t.id ? 'text-white' : 'text-[#6B6B6B] hover:bg-[#F7F6F3] hover:text-[#0A0A0A]'}`}
              style={tab === t.id ? { background: color } : {}}>
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
              {t.badge > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: tab === t.id ? 'rgba(255,255,255,0.3)' : color, color: 'white' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-black/5">
          <button onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#9B9B9B] hover:text-[#0A0A0A] hover:bg-[#F7F6F3] transition-all">
            <span>↩</span><span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Contenido ── */}
      <main className="flex-1 md:ml-60 flex flex-col min-h-screen">

        {/* Header móvil */}
        <div className="md:hidden sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-black/5 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: color }}>
            {iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A0A0A] truncate">{nombre}</p>
            <p className="text-[10px] text-[#9B9B9B] truncate">{config?.nombre_negocio || config?.nombre_entrenador || ''}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()}
            className="text-[10px] text-[#9B9B9B] px-2.5 py-1.5 rounded-lg border border-black/8 font-medium">
            Salir
          </button>
        </div>

        {/* Tab activo */}
        <div className="flex-1 px-4 md:px-8 py-5 md:py-7 max-w-2xl w-full mx-auto pb-28 md:pb-10">
          {tab === 'inicio' && (
            <TabInicio cliente={cliente} color={color} config={config} checkins={checkins}
              rutina={rutina} nutricion={nutricion} sesiones={sesiones} sesionesHoy={sesionesHoy}
              pendientes={pendientes} cuest={cuest} verRutina={verRutina} verNutricion={verNutricion}
              setTab={setTab} setModalCI={setModalCI} setValorando={setValorando} />
          )}
          {tab === 'rutina' && <TabRutina rutina={rutina} color={color} />}
          {tab === 'nutricion' && <TabNutricion nutricion={nutricion} cuest={cuest} cliente={cliente} color={color} />}
          {tab === 'progreso' && (
            <TabProgreso checkins={checkins} marcas={marcas} medidas={medidas} fotos={fotos}
              color={color} subTab={subTab} setSubTab={setSubTab} />
          )}
          {tab === 'mensajes' && (
            <TabMensajes mensajes={mensajes} textoMsg={textoMsg} setTextoMsg={setTextoMsg}
              enviandoMsg={enviandoMsg} enviarMensaje={enviarMensaje} color={color} endRef={mensajesEndRef} />
          )}
          {tab === 'pagos' && <TabPagos pagos={pagos} color={color} />}
          {tab === 'ajustes' && <TabAjustes cliente={cliente} setCliente={setCliente} color={color} />}
        </div>

        {/* Bottom bar móvil */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/6 z-20"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          <div className="flex">
            {TABS_BOTTOM.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex flex-col items-center justify-center pt-2 pb-2 min-h-[56px] relative active:scale-95 transition-transform"
                style={{ color: tab === t.id ? color : '#B0B0B0' }}>
                {tab === t.id && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] w-8 rounded-full" style={{ background: color }} />
                )}
                <span className="text-[20px] leading-none mb-1">{t.icon}</span>
                <span className="text-[9px] font-bold tracking-tight">{t.label}</span>
                {t.badge > 0 && (
                  <span className="absolute top-1.5 right-[18%] w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                    style={{ background: color }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
            {TABS.length > 5 && (
              <button onClick={() => setTab('ajustes')}
                className="flex-1 flex flex-col items-center justify-center pt-2 pb-2 min-h-[56px] active:scale-95 transition-transform"
                style={{ color: ['ajustes', 'pagos'].includes(tab) ? color : '#B0B0B0' }}>
                <span className="text-[20px] leading-none mb-1">⚙️</span>
                <span className="text-[9px] font-bold tracking-tight">Más</span>
              </button>
            )}
          </div>
        </nav>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-lg"
            style={{ background: color }}>
            {toast}
          </div>
        )}

        {/* Modal check-in */}
        {modalCI && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModalCI(false)}>
            <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-black/5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#0A0A0A] text-lg">Check-in semanal</p>
                  <p className="text-xs text-[#9B9B9B] mt-0.5">Cuéntame cómo ha ido la semana</p>
                </div>
                <button onClick={() => setModalCI(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F7F6F3] text-[#6B6B6B] text-xl font-light">×</button>
              </div>
              <div className="px-6 py-5 space-y-6">
                {[
                  { k: 'energia', icon: '⚡', label: 'Energía', max: 5, lo: 'Agotado', hi: 'Excelente' },
                  { k: 'sueno', icon: '😴', label: 'Sueño', max: 5, lo: 'Muy mal', hi: 'Muy bien' },
                  { k: 'fatiga', icon: '🏋️', label: 'Fatiga muscular', max: 10, lo: 'Sin fatiga', hi: 'Al límite' },
                  { k: 'estres', icon: '🧠', label: 'Estrés', max: 10, lo: 'Sin estrés', hi: 'Al límite' },
                ].map(({ k, icon, label, max, lo, hi }) => (
                  <div key={k}>
                    <div className="flex items-center gap-2 mb-3">
                      <span>{icon}</span>
                      <p className="text-sm font-bold text-[#0A0A0A]">{label}</p>
                      {ciForm[k] && <span className="ml-auto text-sm font-bold" style={{ color }}>{ciForm[k]}/{max}</span>}
                    </div>
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${max}, 1fr)` }}>
                      {Array.from({ length: max }, (_, i) => i + 1).map(v => {
                        const sel = ciForm[k] === v
                        const bg = sel ? ((k === 'fatiga' || k === 'estres') && v >= 7 ? '#ef4444' : (k === 'fatiga' || k === 'estres') && v >= 5 ? '#f59e0b' : color) : undefined
                        return (
                          <button key={v} onClick={() => setCiForm(f => ({ ...f, [k]: v }))}
                            className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${sel ? 'text-white' : 'border border-black/10 text-[#9B9B9B] hover:border-black/20'}`}
                            style={sel ? { background: bg } : {}}>
                            {v}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-1.5 px-0.5">
                      <span className="text-[10px] text-[#C0C0C0]">{lo}</span>
                      <span className="text-[10px] text-[#C0C0C0]">{hi}</span>
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-sm font-bold text-[#0A0A0A] mb-2">⚖️ Peso <span className="text-[#9B9B9B] font-normal text-xs">(opcional)</span></p>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" placeholder="75.0" value={ciForm.peso}
                      onChange={e => setCiForm(f => ({ ...f, peso: e.target.value }))}
                      className="flex-1 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5C00]" />
                    <span className="text-sm text-[#9B9B9B] font-medium">kg</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0A0A0A] mb-2">💬 Nota <span className="text-[#9B9B9B] font-normal text-xs">(opcional)</span></p>
                  <textarea rows={2} placeholder="¿Algo que contarle a tu entrenador?" value={ciForm.nota}
                    onChange={e => setCiForm(f => ({ ...f, nota: e.target.value }))}
                    className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none" />
                </div>
                <button onClick={enviarCheckin}
                  disabled={!ciForm.energia || !ciForm.sueno || !ciForm.fatiga || !ciForm.estres || enviandoCI}
                  className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
                  style={{ background: color }}>
                  {enviandoCI ? '⏳ Enviando...' : '✓ Enviar check-in'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal valorar sesión */}
        {valorando && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setValorando(null)}>
            <div className="bg-white rounded-3xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-[#0A0A0A] text-lg">¿Cómo fue tu sesión?</p>
                <button onClick={() => setValorando(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F7F6F3] text-[#6B6B6B] text-xl">×</button>
              </div>
              <p className="text-sm text-[#9B9B9B] mb-6">
                {new Date(valorando.fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {[
                { label: '💪 Esfuerzo percibido (RPE)', val: rpe, set: setRpe, max: 10, lo: 'Muy suave', hi: 'Al límite' },
                { label: '🏋️ Fatiga muscular', val: fatiga, set: setFatiga, max: 5, lo: 'Sin fatiga', hi: 'Muy alta' },
              ].map(({ label, val, set, max, lo, hi }) => (
                <div key={label} className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-[#0A0A0A]">{label}</p>
                    {val && <span className="text-sm font-bold" style={{ color }}>{val}/{max}</span>}
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${max}, 1fr)` }}>
                    {Array.from({ length: max }, (_, i) => i + 1).map(v => (
                      <button key={v} onClick={() => set(v)}
                        className={`py-3 rounded-xl text-sm font-bold transition-all ${val === v ? 'text-white' : 'border border-black/10 text-[#9B9B9B]'}`}
                        style={val === v ? { background: v >= (max * 0.7) ? '#ef4444' : v >= (max * 0.4) ? '#f59e0b' : color } : {}}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1.5 px-0.5">
                    <span className="text-[10px] text-[#C0C0C0]">{lo}</span>
                    <span className="text-[10px] text-[#C0C0C0]">{hi}</span>
                  </div>
                </div>
              ))}
              <button onClick={guardarValoracion} disabled={!rpe || !fatiga || guardandoVal}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
                style={{ background: color }}>
                {guardandoVal ? '⏳ Guardando...' : '✓ Guardar valoración'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

// ─── LoginPortal ─────────────────────────────────────────────────────────────
function LoginPortal() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recuperar, setRecuperar] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function entrar(e) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) setError('Email o contraseña incorrectos')
    setLoading(false)
  }

  async function resetPass(e) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/portal` })
    if (error) setError('No se pudo enviar el email')
    else setEnviado(true)
    setLoading(false)
  }

  if (enviado) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <p className="text-white font-bold text-xl mb-2">Email enviado</p>
        <p className="text-white/50 text-sm mb-6">Revisa tu bandeja y pulsa el enlace para entrar.</p>
        <button onClick={() => { setEnviado(false); setRecuperar(false) }} className="text-[#FF5C00] text-sm font-semibold">← Volver</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FF5C00] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
              <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
              <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
            </svg>
          </div>
          <h1 className="text-white text-2xl font-bold">Forge</h1>
          <p className="text-white/40 text-sm mt-1">Tu portal personal</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <form onSubmit={recuperar ? resetPass : entrar} className="space-y-3">
            <div>
              <label className="text-white/50 text-xs font-medium block mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                placeholder="tu@email.com"
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
            </div>
            {!recuperar && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-white/50 text-xs font-medium">Contraseña</label>
                  <button type="button" onClick={() => setRecuperar(true)} className="text-[#FF5C00] text-xs font-medium">¿La olvidaste?</button>
                </div>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
              </div>
            )}
            {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
            <button type="submit" disabled={loading || !email || (!recuperar && !pass)}
              className="w-full bg-[#FF5C00] text-white font-bold py-3.5 rounded-xl disabled:opacity-40 active:scale-95 transition-all">
              {loading ? '...' : recuperar ? 'Enviar enlace →' : 'Entrar →'}
            </button>
            {recuperar && (
              <button type="button" onClick={() => setRecuperar(false)} className="w-full text-white/40 text-sm py-2">← Volver</button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Tab Inicio ───────────────────────────────────────────────────────────────
function TabInicio({ cliente, color, config, checkins, rutina, nutricion, sesiones,
  sesionesHoy, pendientes, cuest, verRutina, verNutricion, setTab, setModalCI, setValorando }) {

  const hoy = hoyStr()
  const ahora = new Date()
  const hora = ahora.getHours()
  const saludo = hora < 13 ? '☀️ Buenos días' : hora < 20 ? '👋 Buenas tardes' : '🌙 Buenas noches'
  const nombre = cliente?.nombre?.split(' ')[0] || ''
  const DIAS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

  const sesionHoy = sesionesHoy?.[0]
  const pesos = checkins?.filter(c => c.peso).slice().reverse() || []
  const diasSinCI = checkins?.[0]?.fecha
    ? Math.floor((Date.now() - new Date(checkins[0].fecha).getTime()) / 864e5) : 999
  const ciUrgente = diasSinCI >= 7
  const diffPeso = pesos.length >= 2 ? +(pesos[pesos.length-1].peso - pesos[0].peso).toFixed(1) : null
  const diasRutina = rutina?.borrador?.dias || rutina?.contenido?.dias || []

  // Agenda semanal — calcular los 7 días desde hoy
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ahora)
    d.setDate(ahora.getDate() + i)
    const fechaStr = d.toISOString().split('T')[0]
    const sesionDia = sesiones?.filter(s => s.fecha === fechaStr) || []
    return { fecha: fechaStr, d, sesiones: sesionDia, esHoy: i === 0 }
  })
  const hayAgenda = sesiones && sesiones.length > 0

  // Estado vacío real
  const esNuevo = !rutina && !nutricion && !checkins?.length && !hayAgenda

  return (
    <div className="space-y-3 pb-2">

      {/* ── Saludo ── */}
      <div className="pt-1 pb-1">
        <p className="text-xs text-[#9B9B9B]">{saludo}</p>
        <h1 className="text-2xl font-bold text-[#0A0A0A] mt-0.5">{nombre} 👊</h1>
        <p className="text-xs text-[#9B9B9B] mt-1">{DIAS_SHORT[ahora.getDay()]} {ahora.getDate()} {MESES[ahora.getMonth()]}</p>
      </div>

      {/* ── Panel bienvenida cliente nuevo ── */}
      {esNuevo && (
        <div className="rounded-3xl overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
          <div className="px-5 py-6">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2">Bienvenido a Forge</p>
            <p className="text-white font-bold text-xl leading-snug mb-1">
              {config?.nombre_entrenador || 'Tu entrenador'} está preparando tu plan
            </p>
            <p className="text-white/60 text-sm leading-relaxed">
              En breve tendrás aquí tu rutina, tu plan de nutrición y podrás hacer seguimiento de tu progreso.
            </p>
          </div>
          <div className="px-5 py-4 bg-black/15 flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <p className="text-white/80 text-sm">Mientras tanto, puedes escribirle un mensaje</p>
            <button onClick={() => setTab('mensajes')}
              className="ml-auto text-xs font-bold px-3 py-1.5 rounded-lg bg-white/20 text-white active:scale-95 flex-shrink-0">
              Escribir →
            </button>
          </div>
        </div>
      )}

      {/* ── Cuestionario nutrición urgente ── */}
      {verNutricion && !nutricion && !cuest && !esNuevo && (
        <a href={`https://forge-studio-os.vercel.app/nutricion-cuest?e=${cliente.entrenador_id}&c=${cliente.id}`}
          className="flex items-center gap-3 rounded-2xl p-4 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
          <span className="text-2xl flex-shrink-0">🥗</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Cuestionario de nutrición pendiente</p>
            <p className="text-xs text-white/70 mt-0.5">Tu entrenador lo necesita para crear tu plan</p>
          </div>
          <span className="text-white/70 flex-shrink-0">→</span>
        </a>
      )}

      {/* ── Valoración sesión pendiente ── */}
      {pendientes?.[0] && (
        <button onClick={() => setValorando(pendientes[0])}
          className="w-full flex items-center gap-3 rounded-2xl p-4 border-2 text-left active:scale-95 transition-all"
          style={{ borderColor: color, background: `${color}08` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}20` }}>
            <span className="text-xl">⭐</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A0A0A]">¿Cómo fue tu sesión del {
              new Date(pendientes[0].fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long' })
            }?</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">Tarda 30 segundos · Tu entrenador lo agradece</p>
          </div>
          <span className="text-sm font-bold flex-shrink-0" style={{ color }}>Valorar →</span>
        </button>
      )}

      {/* ── Sesión de hoy — tarjeta grande naranja ── */}
      {sesionHoy && (
        <div className="rounded-3xl overflow-hidden shadow-sm"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
          <div className="px-5 py-5">
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1.5">Hoy toca 💪</p>
            <p className="text-white font-bold text-xl leading-tight">
              {sesionHoy.tipo === 'online' ? 'Entrenamiento online'
                : sesionHoy.tipo === 'grupo' ? 'Entrenamiento en grupo'
                : 'Entrenamiento personal'}
            </p>
            {sesionHoy.hora && (
              <p className="text-white/70 text-sm mt-1.5">
                🕐 {sesionHoy.hora.slice(0,5)}
                {sesionHoy.duracion_minutos ? ` · ${sesionHoy.duracion_minutos} min` : ''}
              </p>
            )}
            {rutina && (
              <p className="text-white/50 text-xs mt-1">{rutina.nombre}</p>
            )}
          </div>
          <div className="px-4 py-3 bg-black/15 grid grid-cols-2 gap-2">
            <button onClick={() => setTab('rutina')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/15 text-white text-xs font-bold active:scale-95 transition-all">
              💪 Ver rutina
            </button>
            <button onClick={() => setTab('rutina')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/25 text-white text-xs font-bold active:scale-95 transition-all">
              ✓ Registrar sesión
            </button>
          </div>
        </div>
      )}

      {/* ── Check-in urgente (pulsante) ── */}
      {ciUrgente && (
        <button onClick={() => setModalCI(true)}
          className="w-full flex items-center gap-4 rounded-2xl p-4 active:scale-95 transition-all text-left animate-pulse"
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">⏰</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">
              {diasSinCI > 900 ? 'Haz tu primer check-in' : `${diasSinCI} días sin check-in`}
            </p>
            <p className="text-xs text-white/70 mt-0.5">Tu entrenador necesita saber cómo estás</p>
          </div>
          <span className="text-white/80 flex-shrink-0 text-lg">→</span>
        </button>
      )}

      {/* ── Agenda semanal ── */}
      {hayAgenda && (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/4 flex items-center justify-between">
            <p className="text-xs font-bold text-[#0A0A0A]">📅 Tu semana</p>
            <p className="text-[10px] text-[#9B9B9B]">Próximas sesiones</p>
          </div>
          <div className="divide-y divide-black/4">
            {diasSemana.filter(d => d.sesiones.length > 0 || d.esHoy).slice(0, 6).map((dia, i) => (
              <div key={i} className={`px-4 py-3 flex items-center gap-3 ${dia.esHoy ? 'bg-[#F7F6F3]' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                  dia.esHoy ? 'text-white' : 'bg-[#F7F6F3]'
                }`} style={dia.esHoy ? { background: color } : {}}>
                  <span className="text-[9px] font-bold leading-none" style={dia.esHoy ? { color: 'rgba(255,255,255,0.8)' } : { color: '#9B9B9B' }}>
                    {DIAS_SHORT[dia.d.getDay()]}
                  </span>
                  <span className={`text-sm font-bold leading-none mt-0.5 ${dia.esHoy ? 'text-white' : 'text-[#0A0A0A]'}`}>
                    {dia.d.getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  {dia.sesiones.length > 0 ? (
                    dia.sesiones.map((s, si) => (
                      <div key={si} className={si > 0 ? 'mt-1' : ''}>
                        <p className="text-xs font-semibold text-[#0A0A0A]">
                          {s.tipo === 'online' ? '🖥 Online' : s.tipo === 'grupo' ? '👥 Grupo' : '🏋️ Personal'}
                          {s.hora ? ` · ${s.hora.slice(0,5)}` : ''}
                          {s.duracion_minutos ? ` · ${s.duracion_minutos}min` : ''}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#C0C0C0]">Sin sesión</p>
                  )}
                </div>
                {dia.esHoy && dia.sesiones.length > 0 && (
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full text-white flex-shrink-0"
                    style={{ background: color }}>HOY</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Progreso — tarjeta con gráfica ── */}
      {pesos.length >= 2 && (
        <button onClick={() => setTab('progreso')}
          className="w-full bg-white rounded-2xl border border-black/5 p-4 text-left active:scale-95 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest">Tu progreso</p>
              {diffPeso !== null && (
                <p className="text-2xl font-bold mt-0.5"
                  style={{ color: diffPeso < 0 ? '#10b981' : diffPeso > 0 ? '#6366f1' : '#9B9B9B' }}>
                  {diffPeso > 0 ? '+' : ''}{diffPeso} kg
                </p>
              )}
              <p className="text-xs text-[#9B9B9B] mt-0.5">
                {checkins?.length} check-ins · último hace {diasSinCI === 0 ? 'hoy' : `${diasSinCI}d`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {!ciUrgente && (
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">✓ Al día</span>
              )}
              <p className="text-xs text-[#9B9B9B]">{pesos[pesos.length-1].peso} kg ahora</p>
            </div>
          </div>
          <div className="flex items-end gap-1 h-14">
            {pesos.slice(-8).map((c, i, arr) => {
              const min = Math.min(...arr.map(x => x.peso))
              const max = Math.max(...arr.map(x => x.peso))
              const h = max === min ? 60 : Math.max(18, ((c.peso - min) / (max - min)) * 75 + 25)
              const isLast = i === arr.length - 1
              return (
                <div key={i} className="flex-1 rounded-md transition-all"
                  style={{ height: `${h}%`, background: isLast ? color : `${color}28`, minHeight: 6 }} />
              )
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-[#C0C0C0]">{pesos[0].peso}kg</span>
            <span className="text-[10px] font-bold" style={{ color }}>{pesos[pesos.length-1].peso}kg</span>
          </div>
        </button>
      )}

      {/* ── Grid de accesos rápidos 2x2 ── */}
      <div className="grid grid-cols-2 gap-2">

        {/* Rutina */}
        {verRutina && (
          <button onClick={() => setTab('rutina')}
            className="bg-white border border-black/5 rounded-2xl p-4 text-left active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${color}15` }}>
              <span className="text-xl">💪</span>
            </div>
            <p className="text-xs font-bold text-[#0A0A0A] leading-tight">
              {rutina ? rutina.nombre : 'Rutina'}
            </p>
            <p className="text-[10px] text-[#9B9B9B] mt-1">
              {rutina ? `${diasRutina.length} días` : 'En preparación'}
            </p>
          </button>
        )}

        {/* Nutrición */}
        {verNutricion && (
          <button onClick={() => setTab('nutricion')}
            className="bg-white border border-black/5 rounded-2xl p-4 text-left active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: '#10b98115' }}>
              <span className="text-xl">🥗</span>
            </div>
            <p className="text-xs font-bold text-[#0A0A0A] leading-tight">
              {nutricion ? nutricion.nombre : 'Nutrición'}
            </p>
            <p className="text-[10px] text-[#9B9B9B] mt-1">
              {nutricion ? `${nutricion.calorias_dia} kcal` : cuest ? 'En preparación' : 'Pendiente'}
            </p>
          </button>
        )}

        {/* Check-in */}
        <button onClick={() => setModalCI(true)}
          className="border border-black/5 rounded-2xl p-4 text-left active:scale-95 transition-all"
          style={{ background: ciUrgente ? `${color}10` : 'white', borderColor: ciUrgente ? color : undefined }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: ciUrgente ? `${color}20` : '#F7F6F3' }}>
            <span className="text-xl">📋</span>
          </div>
          <p className="text-xs font-bold text-[#0A0A0A] leading-tight">Check-in semanal</p>
          <p className="text-[10px] mt-1" style={{ color: ciUrgente ? color : '#9B9B9B' }}>
            {ciUrgente
              ? diasSinCI > 900 ? '¡Primero!' : `${diasSinCI}d pendiente`
              : checkins?.length ? `Hace ${diasSinCI === 0 ? 'hoy' : diasSinCI + 'd'}` : 'Registra cómo estás'}
          </p>
        </button>

        {/* Actividad libre */}
        <button onClick={() => setTab('progreso')}
          className="bg-white border border-black/5 rounded-2xl p-4 text-left active:scale-95 transition-all">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: '#6366f115' }}>
            <span className="text-xl">🏃</span>
          </div>
          <p className="text-xs font-bold text-[#0A0A0A] leading-tight">Actividad libre</p>
          <p className="text-[10px] text-[#9B9B9B] mt-1">Footing, fútbol, natación…</p>
        </button>

      </div>

    </div>
  )
}

function TabRutina({ rutina, color }) {
  if (!rutina) return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">💪</div>
      <p className="text-sm font-bold text-[#0A0A0A]">Rutina en preparación</p>
      <p className="text-xs text-[#9B9B9B] mt-1 leading-relaxed max-w-xs mx-auto">Tu entrenador está diseñando tu plan de entrenamiento personalizado.</p>
    </div>
  )
  const dias = rutina.borrador?.dias || rutina.contenido?.dias || []
  return (
    <div className="space-y-3">
      <div className="pb-1">
        <h2 className="text-xl font-bold text-[#0A0A0A]">{rutina.nombre}</h2>
        <p className="text-xs text-[#9B9B9B] mt-0.5">{dias.length} días · {rutina.semanas || 4} semanas</p>
      </div>
      {dias.map((dia, di) => (
        <div key={di} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5 flex items-center gap-2" style={{ background: `${color}08` }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: color }}>
              {di + 1}
            </div>
            <p className="font-bold text-[#0A0A0A] text-sm">{dia.nombre || dia.dia || `Día ${di + 1}`}</p>
            <span className="ml-auto text-xs text-[#9B9B9B]">{(dia.ejercicios || []).length} ejercicios</span>
          </div>
          <div className="divide-y divide-black/4">
            {(dia.ejercicios || []).map((ej, ei) => (
              <div key={ei} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A0A0A]">{ej.nombre}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {ej.series && <span className="text-xs text-[#9B9B9B]">{ej.series} series</span>}
                      {ej.reps && <span className="text-xs text-[#9B9B9B]">· {ej.reps} reps</span>}
                      {ej.peso && <span className="text-xs text-[#9B9B9B]">· {ej.peso}</span>}
                      {ej.descanso && ej.descanso !== '-' && <span className="text-xs text-[#9B9B9B]">· 💤 {ej.descanso}</span>}
                    </div>
                  </div>
                  {ej.patron && (
                    <span className="text-[9px] bg-[#F7F6F3] text-[#9B9B9B] px-1.5 py-0.5 rounded-md font-medium mt-0.5 flex-shrink-0">{ej.patron}</span>
                  )}
                </div>
                {ej.notas && <p className="text-xs text-[#9B9B9B] mt-1.5 italic border-l-2 pl-2" style={{ borderColor: `${color}40` }}>{ej.notas}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tab Nutrición ────────────────────────────────────────────────────────────
function TabNutricion({ nutricion, cuest, cliente, color }) {
  if (!nutricion) return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">🥗</div>
      <p className="text-sm font-bold text-[#0A0A0A]">Plan de nutrición en preparación</p>
      {!cuest && (
        <div className="mt-4">
          <p className="text-xs text-[#6B6B6B] mb-3 leading-relaxed max-w-xs mx-auto">Tu entrenador necesita tu cuestionario de alimentación para crear tu plan.</p>
          <a href={`https://forge-studio-os.vercel.app/nutricion-cuest?e=${cliente?.entrenador_id}&c=${cliente?.id}`}
            className="inline-block text-white text-sm font-bold px-5 py-3 rounded-xl active:scale-95 transition-all"
            style={{ background: color }}>
            Rellenar cuestionario →
          </a>
        </div>
      )}
      {cuest && <p className="text-xs text-[#9B9B9B] mt-2">Cuestionario enviado · Tu entrenador está preparando tu plan</p>}
    </div>
  )

  const contenido = nutricion.contenido || nutricion.borrador || {}
  const comidas = contenido.comidas || []
  const macros = [
    { label: 'Calorías', val: nutricion.calorias_dia, unit: 'kcal', c: color },
    { label: 'Proteína', val: nutricion.proteinas_dia, unit: 'g', c: '#6366f1' },
    { label: 'Carbos', val: nutricion.carbos_dia, unit: 'g', c: '#f59e0b' },
    { label: 'Grasas', val: nutricion.grasas_dia, unit: 'g', c: '#10b981' },
  ].filter(m => m.val)

  return (
    <div className="space-y-3">
      <div className="pb-1">
        <h2 className="text-xl font-bold text-[#0A0A0A]">{nutricion.nombre}</h2>
      </div>
      {macros.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {macros.map(m => (
            <div key={m.label} className="bg-white rounded-2xl border border-black/5 p-3 text-center">
              <p className="text-base font-bold" style={{ color: m.c }}>{m.val}</p>
              <p className="text-[9px] text-[#9B9B9B] mt-0.5">{m.unit}</p>
              <p className="text-[9px] text-[#9B9B9B]">{m.label}</p>
            </div>
          ))}
        </div>
      )}
      {comidas.map((comida, ci) => (
        <div key={ci} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/4" style={{ background: `${color}06` }}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#0A0A0A] text-sm">{comida.nombre}</p>
              {comida.hora && <p className="text-xs text-[#9B9B9B]">{comida.hora}</p>}
            </div>
            {comida.calorias && <p className="text-xs text-[#9B9B9B] mt-0.5">{comida.calorias} kcal</p>}
          </div>
          <div className="px-4 py-3 space-y-2">
            {(comida.alimentos || []).map((al, ai) => (
              <div key={ai} className="flex items-center justify-between">
                <p className="text-sm text-[#0A0A0A]">{typeof al === 'string' ? al : al.nombre}</p>
                {al.cantidad && <p className="text-xs text-[#9B9B9B]">{al.cantidad}</p>}
              </div>
            ))}
            {comida.notas && <p className="text-xs text-[#9B9B9B] italic mt-1">{comida.notas}</p>}
          </div>
        </div>
      ))}
      {contenido.notas && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1">📝 Notas de tu entrenador</p>
          <p className="text-sm text-amber-800 leading-relaxed">{contenido.notas}</p>
        </div>
      )}
    </div>
  )
}

// ─── Tab Progreso ─────────────────────────────────────────────────────────────
function TabProgreso({ checkins, marcas, medidas, fotos, color, subTab, setSubTab }) {
  const SUBTABS = [{ id: 'peso', label: '⚖️ Peso' }, { id: 'medidas', label: '📏 Medidas' }, { id: 'marcas', label: '🏆 Marcas' }, { id: 'fotos', label: '📸 Fotos' }]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 bg-black/5 p-1 rounded-xl">
        {SUBTABS.map(s => (
          <button key={s.id} onClick={() => setSubTab(s.id)}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${subTab === s.id ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#6B6B6B]'}`}>
            {s.label}
          </button>
        ))}
      </div>
      {subTab === 'peso' && <SubPeso checkins={checkins} color={color} />}
      {subTab === 'medidas' && <SubMedidas medidas={medidas} color={color} />}
      {subTab === 'marcas' && <SubMarcas marcas={marcas} color={color} />}
      {subTab === 'fotos' && <SubFotos fotos={fotos} />}
    </div>
  )
}

function SubPeso({ checkins, color }) {
  const pesos = checkins?.filter(c => c.peso).slice().reverse() || []
  if (!checkins?.length) return (
    <div className="text-center py-10">
      <div className="text-3xl mb-2">📊</div>
      <p className="text-sm font-bold text-[#0A0A0A]">Sin check-ins aún</p>
      <p className="text-xs text-[#9B9B9B] mt-1">Haz tu primer check-in desde el Inicio</p>
    </div>
  )
  const ultimo = checkins[0]
  const energiaMedia = checkins.length ? (checkins.reduce((s, c) => s + (c.energia || 0), 0) / checkins.length).toFixed(1) : '—'
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Peso actual', val: pesos[pesos.length-1]?.peso ? `${pesos[pesos.length-1].peso}kg` : '—', c: '#0A0A0A' },
          { label: 'Check-ins', val: checkins.length, c: color },
          { label: 'Energía media', val: energiaMedia === '0.0' ? '—' : `${energiaMedia}/5`, c: '#6366f1' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-black/5 p-3 text-center">
            <p className="text-xl font-bold" style={{ color: k.c }}>{k.val}</p>
            <p className="text-[10px] text-[#9B9B9B] mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>
      {pesos.length > 1 && (
        <div className="bg-white rounded-2xl border border-black/5 p-4">
          <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-3">Evolución del peso</p>
          <div className="flex items-end gap-1.5 h-28">
            {pesos.slice(-10).map((c, i, arr) => {
              const min = Math.min(...arr.map(x => x.peso))
              const max = Math.max(...arr.map(x => x.peso))
              const h = max === min ? 50 : Math.max(15, ((c.peso - min) / (max - min)) * 75 + 25)
              const isLast = i === arr.length - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-md" style={{ height: `${h}%`, background: isLast ? color : `${color}30`, minHeight: 6 }} />
                  <p className="text-[8px] text-[#C0C0C0]">{c.peso}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-black/4">
          <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest">Historial</p>
        </div>
        <div className="divide-y divide-black/4">
          {checkins.slice(0, 12).map((c, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0A0A0A]">
                  {new Date(c.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <div className="flex gap-3 mt-0.5 flex-wrap">
                  {c.energia != null && <span className="text-[10px] text-[#9B9B9B]">⚡ {c.energia}/5</span>}
                  {c.fatiga != null && <span className="text-[10px] text-[#9B9B9B]">🏋️ {c.fatiga}/10</span>}
                  {c.sueno != null && <span className="text-[10px] text-[#9B9B9B]">😴 {c.sueno}/5</span>}
                  {c.estres != null && <span className="text-[10px] text-[#9B9B9B]">🧠 {c.estres}/10</span>}
                </div>
                {c.comentario && <p className="text-[10px] text-[#9B9B9B] mt-1 italic">"{c.comentario}"</p>}
              </div>
              {c.peso && <p className="text-sm font-bold text-[#0A0A0A] flex-shrink-0">{c.peso}kg</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SubMedidas({ medidas, color }) {
  if (!medidas?.length) return (
    <div className="text-center py-10"><div className="text-3xl mb-2">📏</div><p className="text-sm font-bold text-[#0A0A0A]">Sin medidas aún</p></div>
  )
  return (
    <div className="space-y-2">
      {medidas.slice(0, 6).map((m, i) => (
        <div key={i} className="bg-white rounded-2xl border border-black/5 p-4">
          <p className="text-xs text-[#9B9B9B] mb-3">{new Date(m.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <div className="grid grid-cols-3 gap-3">
            {[['Pecho', m.pecho], ['Cintura', m.cintura], ['Cadera', m.cadera], ['Muslo', m.muslo], ['Brazo', m.brazo], ['Gemelo', m.gemelo]].filter(([, v]) => v).map(([l, v]) => (
              <div key={l} className="text-center">
                <p className="text-sm font-bold text-[#0A0A0A]">{v}cm</p>
                <p className="text-[10px] text-[#9B9B9B]">{l}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SubMarcas({ marcas, color }) {
  if (!marcas?.length) return (
    <div className="text-center py-10"><div className="text-3xl mb-2">🏆</div><p className="text-sm font-bold text-[#0A0A0A]">Sin marcas aún</p></div>
  )
  return (
    <div className="space-y-2">
      {marcas.map((m, i) => (
        <div key={i} className="bg-white rounded-2xl border border-black/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
            <span>🏆</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A0A0A] truncate">{m.ejercicio}</p>
            <p className="text-xs text-[#9B9B9B]">{new Date(m.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color }}>{m.peso_kg}kg</p>
            {m.reps && <p className="text-xs text-[#9B9B9B]">{m.reps} reps</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

function SubFotos({ fotos }) {
  if (!fotos?.length) return (
    <div className="text-center py-10"><div className="text-3xl mb-2">📸</div><p className="text-sm font-bold text-[#0A0A0A]">Sin fotos aún</p></div>
  )
  return (
    <div className="grid grid-cols-3 gap-2">
      {fotos.map((f, i) => (
        <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#F7F6F3]">
          <img src={f.url} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  )
}

// ─── Tab Mensajes ─────────────────────────────────────────────────────────────
function TabMensajes({ mensajes, textoMsg, setTextoMsg, enviandoMsg, enviarMensaje, color, endRef }) {
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes?.length])
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <div className="flex-1 overflow-y-auto space-y-2 pb-2">
        {!mensajes?.length && (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">✉️</div>
            <p className="text-sm font-bold text-[#0A0A0A]">Sin mensajes aún</p>
            <p className="text-xs text-[#9B9B9B] mt-1">Escríbele a tu entrenador</p>
          </div>
        )}
        {mensajes?.map((m, i) => {
          const esEntrenador = m.tipo === 'entrenador' || m.tipo === 'sistema'
          return (
            <div key={i} className={`flex ${esEntrenador ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${esEntrenador ? 'bg-white border border-black/5 text-[#0A0A0A]' : 'text-white'}`}
                style={!esEntrenador ? { background: color } : {}}>
                {m.contenido}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={enviarMensaje} className="flex gap-2 pt-3 border-t border-black/5">
        <input value={textoMsg} onChange={e => setTextoMsg(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 border border-black/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5C00] bg-white" />
        <button type="submit" disabled={!textoMsg.trim() || enviandoMsg}
          className="px-4 py-3 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
          style={{ background: color }}>
          {enviandoMsg ? '…' : '→'}
        </button>
      </form>
    </div>
  )
}

// ─── Tab Pagos ────────────────────────────────────────────────────────────────
function TabPagos({ pagos, color }) {
  if (!pagos?.length) return (
    <div className="text-center py-10"><div className="text-3xl mb-2">💳</div><p className="text-sm font-bold text-[#0A0A0A]">Sin pagos registrados</p></div>
  )
  return (
    <div className="space-y-2">
      {pagos.map((p, i) => (
        <div key={i} className="bg-white rounded-2xl border border-black/5 p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A0A0A]">{p.concepto || 'Pago mensual'}</p>
            <p className="text-xs text-[#9B9B9B] mt-0.5">
              {p.fecha_pago ? new Date(p.fecha_pago + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-[#0A0A0A]">{p.importe}€</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.estado === 'cobrado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {p.estado === 'cobrado' ? '✓ Cobrado' : 'Pendiente'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tab Ajustes ──────────────────────────────────────────────────────────────
function TabAjustes({ cliente, setCliente, color }) {
  const [form, setForm] = useState({ peso_actual: cliente?.peso_actual || '', peso_objetivo: cliente?.peso_objetivo || '', objetivo: cliente?.objetivo || '' })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)

  async function guardar(e) {
    e.preventDefault(); setGuardando(true); setOk(false)
    await supabase.from('clientes').update({
      peso_actual: form.peso_actual ? parseFloat(form.peso_actual) : null,
      peso_objetivo: form.peso_objetivo ? parseFloat(form.peso_objetivo) : null,
      objetivo: form.objetivo || null,
    }).eq('id', cliente.id)
    setOk(true); setGuardando(false)
    setTimeout(() => setOk(false), 3000)
  }

  const OBJETIVOS = [
    ['perdida_grasa', '🔥 Pérdida de grasa'], ['ganancia_muscular', '💪 Ganar músculo'],
    ['tonificacion', '✨ Tonificación'], ['rendimiento', '🏃 Rendimiento'],
    ['mantenimiento', '⚖️ Mantenimiento'], ['salud', '❤️ Salud'],
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#0A0A0A]">Ajustes</h2>
      <div className="bg-white rounded-2xl border border-black/5 p-4">
        <p className="text-sm font-bold text-[#0A0A0A]">{cliente?.nombre}</p>
        <p className="text-xs text-[#9B9B9B] mt-0.5">{cliente?.email}</p>
        <span className="inline-block mt-2 text-[10px] bg-[#F7F6F3] text-[#9B9B9B] px-2 py-1 rounded-lg font-medium capitalize">
          {cliente?.tipo} {cliente?.plan_online ? `· ${cliente.plan_online}` : ''}
        </span>
      </div>
      <form onSubmit={guardar} className="bg-white rounded-2xl border border-black/5 p-4 space-y-4">
        <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest">Mi plan</p>
        <div className="grid grid-cols-2 gap-3">
          {[['Peso actual (kg)', 'peso_actual'], ['Peso objetivo (kg)', 'peso_objetivo']].map(([label, key]) => (
            <div key={key}>
              <label className="text-xs text-[#6B6B6B] font-medium block mb-1.5">{label}</label>
              <input type="number" step="0.1" value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs text-[#6B6B6B] font-medium block mb-2">Mi objetivo</label>
          <div className="grid grid-cols-2 gap-2">
            {OBJETIVOS.map(([v, l]) => (
              <button key={v} type="button" onClick={() => setForm(f => ({ ...f, objetivo: v }))}
                className={`py-2 px-3 rounded-xl text-xs font-medium border text-left transition-all active:scale-95 ${form.objetivo === v ? 'text-white border-transparent' : 'border-black/10 text-[#6B6B6B]'}`}
                style={form.objetivo === v ? { background: color } : {}}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={guardando}
          className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
          style={{ background: ok ? '#10b981' : color }}>
          {guardando ? '⏳ Guardando...' : ok ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </form>
      <div className="bg-white rounded-2xl border border-black/5 p-4">
        <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest mb-3">Seguridad</p>
        <button onClick={async () => {
          await supabase.auth.resetPasswordForEmail(cliente?.email || '', { redirectTo: `${window.location.origin}/portal` })
          alert('Te hemos enviado un email para cambiar tu contraseña.')
        }} className="text-sm font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
          Cambiar contraseña →
        </button>
      </div>
      <button onClick={() => supabase.auth.signOut()}
        className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium active:scale-95 transition-all">
        Cerrar sesión
      </button>
    </div>
  )
}
