import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── helpers ─────────────────────────────────────────────────────────────────
const qa = p => p.then(r => r.data || []).catch(() => [])
const q1 = p => p.then(r => r.data?.[0] || r.data || null).catch(() => null)
const hoyStr = () => new Date().toISOString().split('T')[0]
const hace = d => new Date(Date.now() - d * 864e5).toISOString().split('T')[0]
const rmEpley = (peso, reps) => reps <= 1 ? peso : +(peso * (1 + reps / 30)).toFixed(1)
const parseReps = (r) => { if (!r) return 1; const n = parseInt(String(r).split('-')[0]); return isNaN(n) ? 1 : n }

// ─── Portal principal ─────────────────────────────────────────────────────────
export default function PortalForge() {
  const [sesion, setSesion] = useState(undefined)
  const [cliente, setCliente] = useState(null)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [sinCuenta, setSinCuenta] = useState(false)
  const [tab, setTab] = useState('hoy')
  const [subTab, setSubTab] = useState('peso')
  const [config, setConfig] = useState(null)

  // Modales
  const [modalCI, setModalCI] = useState(false)
  const [ciForm, setCiForm] = useState({ energia: null, sueno: null, fatiga: null, estres: null, peso: '', nota: '' })
  const [enviandoCI, setEnviandoCI] = useState(false)
  const [valorando, setValorando] = useState(null)
  const [rpe, setRpe] = useState(null)
  const [fatigaVal, setFatigaVal] = useState(null)
  const [guardandoVal, setGuardandoVal] = useState(false)
  const [modalActividad, setModalActividad] = useState(false)
  const [actForm, setActForm] = useState({ tipo: '', duracion: '', rpe: null, nota: '' })
  const [guardandoAct, setGuardandoAct] = useState(false)
  const [modalRegistro, setModalRegistro] = useState(null)
  const [registroSets, setRegistroSets] = useState({})
  const [guardandoRegistro, setGuardandoRegistro] = useState(false)
  const [textoMsg, setTextoMsg] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const [toast, setToast] = useState('')
  const mensajesEndRef = useRef(null)

  const color = config?.color_acento || '#FF5C00'

  const ACTIVIDADES = [
    { id: 'footing', label: '🏃 Footing' }, { id: 'ciclismo', label: '🚴 Ciclismo' },
    { id: 'natacion', label: '🏊 Natación' }, { id: 'futbol', label: '⚽ Fútbol' },
    { id: 'padel', label: '🎾 Pádel' }, { id: 'yoga', label: '🧘 Yoga' },
    { id: 'escalada', label: '🧗 Escalada' }, { id: 'otro', label: '💪 Otro' },
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSesion(session?.user || null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSesion(s?.user || null))
    return () => subscription.unsubscribe()
  }, [])

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
    const cid = cl.id, eid = cl.entrenador_id, hoy = hoyStr()

    const [cfg, rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes,
      mensajes, pagos, marcas, medidas, fotos, cuest, ejerciciosHist, sesionesEstaSemana] = await Promise.all([
      q1(supabase.from('configuracion').select('*').eq('entrenador_id', eid)),
      q1(supabase.from('rutinas').select('id,nombre,semanas,contenido,borrador').eq('cliente_id', cid).eq('estado', 'publicada').order('created_at', { ascending: false })),
      q1(supabase.from('planes_nutricion').select('*').eq('cliente_id', cid).in('estado', ['publicado', 'publicada']).order('created_at', { ascending: false })),
      qa(supabase.from('checkins').select('*').eq('cliente_id', cid).order('fecha', { ascending: false }).limit(52)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).gte('fecha', hoy).eq('cancelada', false).order('fecha').order('hora').limit(10)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).eq('fecha', hoy).eq('cancelada', false)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).eq('completada', true).eq('cancelada', false).is('rpe', null).gte('fecha', hace(14)).lte('fecha', hoy).order('fecha', { ascending: false }).limit(3)),
      qa(supabase.from('mensajes_cliente').select('*').eq('cliente_id', cid).order('created_at', { ascending: true })),
      qa(supabase.from('pagos').select('*').eq('cliente_id', cid).order('fecha_pago', { ascending: false })),
      qa(supabase.from('marcas_cliente').select('*').eq('cliente_id', cid).order('fecha', { ascending: false })),
      qa(supabase.from('medidas_cliente').select('*').eq('cliente_id', cid).order('fecha', { ascending: false })),
      qa(supabase.from('fotos_progreso').select('*').eq('cliente_id', cid).eq('visible_cliente', true).order('fecha', { ascending: false })),
      supabase.from('cuestionarios_nutricion').select('id').eq('cliente_id', cid).limit(1).then(r => !!(r.data?.length)).catch(() => false),
      qa(supabase.from('sesion_ejercicios').select('ejercicio_nombre,sets,patron,sesion_id').eq('cliente_id', cid).order('created_at', { ascending: false }).limit(500)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).eq('cancelada', false).gte('fecha', hace(7)).lte('fecha', new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0]).order('fecha').order('hora')),
    ])

    setConfig(cfg)
    setDatos({ rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes, mensajes, pagos, marcas, medidas, fotos, cuest, ejerciciosHist, sesionesEstaSemana })
    supabase.from('mensajes_cliente').update({ leido: true }).eq('cliente_id', cid).eq('leido', false).then(() => {}).catch(() => {})
    setTimeout(() => supabase.from('actividad_cliente').insert({ cliente_id: cid, entrenador_id: eid, tipo: 'portal_acceso', descripcion: 'Entró al portal' }).then(() => {}).catch(() => {}), 2000)
    setCargando(false)
  }

  async function enviarCheckin() {
    if (!ciForm.energia || !ciForm.sueno || !ciForm.fatiga || !ciForm.estres) return
    setEnviandoCI(true)
    const { error } = await supabase.from('checkins').insert({
      cliente_id: cliente.id, entrenador_id: cliente.entrenador_id, fecha: hoyStr(),
      energia: ciForm.energia, sueno: ciForm.sueno, fatiga: ciForm.fatiga, estres: ciForm.estres,
      peso: ciForm.peso ? parseFloat(ciForm.peso) : null, comentario: ciForm.nota || null, adherencia_entreno: 5,
    })
    if (!error) {
      setDatos(d => ({ ...d, checkins: [{ id: Date.now()+'', fecha: hoyStr(), ...ciForm, peso: ciForm.peso ? parseFloat(ciForm.peso) : null }, ...d.checkins] }))
      setModalCI(false); setCiForm({ energia: null, sueno: null, fatiga: null, estres: null, peso: '', nota: '' })
      showToast('✓ Check-in enviado')
    }
    setEnviandoCI(false)
  }

  async function guardarValoracion() {
    if (!rpe || !fatigaVal || !valorando) return
    setGuardandoVal(true)
    await supabase.from('sesiones').update({ rpe, fatiga_post: fatigaVal }).eq('id', valorando.id)
    setDatos(d => ({ ...d, pendientes: d.pendientes.filter(s => s.id !== valorando.id) }))
    setValorando(null); setRpe(null); setFatigaVal(null)
    showToast('✓ Sesión valorada')
    setGuardandoVal(false)
  }

  async function guardarActividad() {
    if (!actForm.tipo || !actForm.duracion) return
    setGuardandoAct(true)
    const nombreAct = ACTIVIDADES.find(a => a.id === actForm.tipo)?.label?.split(' ').slice(1).join(' ') || actForm.tipo
    await supabase.from('sesiones').insert({
      cliente_id: cliente.id, entrenador_id: cliente.entrenador_id,
      fecha: hoyStr(), tipo: 'libre', completada: true,
      duracion_minutos: parseInt(actForm.duracion) || null, rpe: actForm.rpe || null,
      notas: `${nombreAct}${actForm.nota ? ' · ' + actForm.nota : ''}`, cancelada: false,
    })
    setModalActividad(false); setActForm({ tipo: '', duracion: '', rpe: null, nota: '' })
    showToast('✓ Actividad registrada')
    setGuardandoAct(false)
  }

  async function guardarRegistroSesion() {
    if (!modalRegistro) return
    setGuardandoRegistro(true)
    const { data: sesNueva } = await supabase.from('sesiones').insert({
      cliente_id: cliente.id, entrenador_id: cliente.entrenador_id,
      fecha: hoyStr(), tipo: 'online', completada: true, cancelada: false, notas: modalRegistro.nombre,
    }).select().single()
    if (sesNueva) {
      const rows = (modalRegistro.ejercicios || []).map((ej, i) => ({
        sesion_id: sesNueva.id, cliente_id: cliente.id,
        ejercicio_nombre: ej.nombre, patron: ej.patron || null, orden: i,
        sets: (registroSets[i] || []).filter(s => s.peso || s.reps),
      })).filter(r => r.sets.length > 0)
      if (rows.length) await supabase.from('sesion_ejercicios').insert(rows)
    }
    setModalRegistro(null); setRegistroSets({})
    showToast('✓ Sesión registrada')
    setGuardandoRegistro(false)
    cargarTodo()
  }

  async function enviarMensaje(e) {
    e.preventDefault()
    if (!textoMsg.trim() || enviandoMsg) return
    setEnviandoMsg(true)
    const texto = textoMsg.trim(); setTextoMsg('')
    await supabase.functions.invoke('portal-accion', { body: { accion: 'enviar_mensaje', datos: { contenido: texto } } }).catch(() => {})
    const msgs = await qa(supabase.from('mensajes_cliente').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: true }))
    setDatos(d => ({ ...d, mensajes: msgs }))
    setEnviandoMsg(false)
    setTimeout(() => mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (sesion === undefined || cargando) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#FF5C00' }}>
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none"><rect x="5" y="5" width="4" height="18" rx="1" fill="white"/><rect x="5" y="5" width="13" height="4" rx="1" fill="white"/><rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/></svg>
        </div>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF5C00', borderTopColor: 'transparent' }} />
      </div>
    </div>
  )

  if (!sesion) return <LoginPortal />

  if (sinCuenta || !cliente) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F2F1EE' }}>
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border border-black/5">
        <p className="text-5xl mb-4">🔗</p>
        <p className="font-bold text-xl mb-2 text-[#0A0A0A]">Cuenta no vinculada</p>
        <p className="text-sm text-[#6B6B6B] mb-6 leading-relaxed">Este email no está asociado a ningún cliente. Contacta con tu entrenador.</p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
          className="w-full font-bold py-3.5 rounded-2xl text-white text-sm" style={{ background: color }}>Probar con otro email</button>
      </div>
    </div>
  )

  if (!datos) return <div className="min-h-screen" style={{ background: '#F2F1EE' }} />

  const { rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes, mensajes, pagos, marcas, medidas, fotos, cuest, ejerciciosHist, sesionesEstaSemana } = datos
  const esOnline = cliente.tipo === 'online'
  const plan = cliente.plan_online
  const verRutina = !esOnline || ['entrenamiento', 'completo'].includes(plan)
  const verNutricion = !esOnline || ['nutricion', 'completo'].includes(plan)
  const nombre = cliente.nombre?.split(' ')[0] || ''
  const iniciales = cliente.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
  const msgNoLeidos = mensajes.filter(m => !m.leido && m.tipo === 'entrenador').length

  // Racha de semanas activas
  const semanasActivas = (() => {
    if (!checkins.length && !(sesionesEstaSemana || []).length) return 0
    let streak = 0
    const ahora = new Date()
    for (let i = 0; i < 20; i++) {
      const lunesW = new Date(ahora); lunesW.setDate(ahora.getDate() - (ahora.getDay() || 7) + 1 - i * 7)
      const domW = new Date(lunesW); domW.setDate(lunesW.getDate() + 6)
      const ok = checkins.some(c => { const f = new Date(c.fecha); return f >= lunesW && f <= domW })
        || (sesionesEstaSemana || []).some(s => { const f = new Date(s.fecha); return f >= lunesW && f <= domW && s.completada })
      if (ok) streak++
      else if (i > 0) break
    }
    return streak
  })()

  const TABS = [
    { id: 'hoy',      label: 'Inicio',    icon: '⊞' },
    { id: 'entrena',  label: 'Entrena',   icon: '💪', oculto: !verRutina },
    { id: 'nutricion',label: 'Nutrición', icon: '🥗', oculto: !verNutricion },
    { id: 'progreso', label: 'Progreso',  icon: '📈' },
    { id: 'mas',      label: 'Más',       icon: '···', badge: msgNoLeidos },
  ].filter(t => !t.oculto)

  // Siempre 5 fijos — si faltan Entrena o Nutrición, Mensajes ocupa su lugar
  const BOTTOM_TABS = (() => {
    const fijos = TABS.filter(t => t.id !== 'mas').slice(0, 4)
    // Asegurar que Más siempre está con el badge de mensajes
    const masBadge = msgNoLeidos
    return [...fijos, { id: 'mas', label: 'Más', icon: '···', badge: masBadge }]
  })()

  // Secciones dentro del menú Más
  const MAS_ITEMS = [
    { id: 'mensajes', label: 'Mensajes',  icon: '✉️', badge: msgNoLeidos, desc: msgNoLeidos > 0 ? `${msgNoLeidos} sin leer` : 'Chat con tu entrenador' },
    ...(pagos?.length ? [{ id: 'pagos', label: 'Pagos', icon: '💳', badge: 0, desc: `${pagos.filter(p=>p.estado!=='cobrado').length > 0 ? 'Tienes pagos pendientes' : 'Historial al día'}` }] : []),
    { id: 'ajustes', label: 'Ajustes', icon: '⚙️', badge: 0, desc: 'Objetivo, peso, contraseña' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: '#F4F3F0', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica Neue,sans-serif' }}>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-black/6 fixed h-full z-20">
        <div className="px-5 py-6 border-b border-black/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color }}>
              <svg width="18" height="18" viewBox="0 0 28 28" fill="none"><rect x="5" y="5" width="4" height="18" rx="1" fill="white"/><rect x="5" y="5" width="13" height="4" rx="1" fill="white"/><rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/></svg>
            </div>
            <div><p className="text-xs font-bold text-[#0A0A0A]">Forge</p><p className="text-[10px] text-[#9B9B9B]">Tu portal</p></div>
          </div>
          <div className="flex items-center gap-3">
            {config?.foto_url
              ? <img src={config.foto_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: `${color}15`, color }}>{(config?.nombre_entrenador || 'E').slice(0,2).toUpperCase()}</div>
            }
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0A0A0A] truncate">{nombre}</p>
              <p className="text-[10px] text-[#9B9B9B] truncate">con {config?.nombre_entrenador || 'tu entrenador'}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'text-white' : 'text-[#6B6B6B] hover:bg-[#F2F1EE] hover:text-[#0A0A0A]'}`}
              style={tab === t.id ? { background: color } : {}}>
              <span>{t.icon}</span><span>{t.label}</span>
              {t.badge > 0 && <span className="ml-auto w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: tab === t.id ? 'rgba(255,255,255,0.3)' : color, color: 'white' }}>{t.badge}</span>}
            </button>
          ))}
        </nav>
        {semanasActivas > 0 && (
          <div className="px-5 py-4 border-t border-black/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}><span>🔥</span></div>
            <div><p className="text-xs font-bold text-[#0A0A0A]">{semanasActivas} sem. seguidas</p><p className="text-[10px] text-[#9B9B9B]">Racha activa</p></div>
          </div>
        )}
        <div className="px-3 pb-4">
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#9B9B9B] hover:bg-[#F2F1EE] transition-all">
            <span>↩</span><span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Header móvil — negro, datos clave */}
        <div className="md:hidden sticky top-0 z-20 px-4 flex items-center gap-3"
          style={{ background: '#0A0A0A', height: 52 }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: color }}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
              <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
              <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
              <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate tracking-tight leading-none">{nombre}</p>
            {semanasActivas > 0 && (
              <p className="text-[10px] font-bold mt-0.5" style={{ color }}>
                {semanasActivas} sem · ACTIVO
              </p>
            )}
          </div>
          {config?.foto_url && (
            <img src={config.foto_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 opacity-80" />
          )}
          <button onClick={() => supabase.auth.signOut()}
            className="text-[10px] text-white/30 font-medium ml-1">Salir</button>
        </div>

        {/* Contenido */}
        <div className="flex-1 px-4 md:px-8 py-5 max-w-2xl w-full mx-auto pb-28 md:pb-10">
          {tab === 'hoy' && <TabHoy cliente={cliente} color={color} config={config} checkins={checkins} rutina={rutina} nutricion={nutricion} sesiones={sesiones} sesionesHoy={sesionesHoy} pendientes={pendientes} cuest={cuest} verRutina={verRutina} verNutricion={verNutricion} setTab={setTab} setModalCI={setModalCI} setValorando={setValorando} sesionesEstaSemana={sesionesEstaSemana} semanasActivas={semanasActivas} setModalActividad={setModalActividad} setModalRegistro={setModalRegistro} ejerciciosHist={ejerciciosHist} />}
          {tab === 'entrena' && <TabEntrena rutina={rutina} color={color} ejerciciosHist={ejerciciosHist} setModalRegistro={setModalRegistro} esOnline={esOnline} />}
          {tab === 'nutricion' && <TabNutricion nutricion={nutricion} cuest={cuest} cliente={cliente} color={color} />}
          {tab === 'progreso' && <TabProgreso checkins={checkins} marcas={marcas} medidas={medidas} fotos={fotos} ejerciciosHist={ejerciciosHist} color={color} subTab={subTab} setSubTab={setSubTab} />}
          {tab === 'mensajes' && <TabMensajes mensajes={mensajes} textoMsg={textoMsg} setTextoMsg={setTextoMsg} enviandoMsg={enviandoMsg} enviarMensaje={enviarMensaje} color={color} endRef={mensajesEndRef} />}
          {tab === 'mas' && <TabMas pagos={pagos} cliente={cliente} setCliente={setCliente} color={color} tabsExtra={[]} setTab={setTab} msgNoLeidos={msgNoLeidos} />}
        </div>

        {/* Bottom bar — negro total, 5 slots fijos */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20"
          style={{ background: '#0A0A0A', paddingBottom: 'max(env(safe-area-inset-bottom),8px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex">
            {BOTTOM_TABS.map(t => {
              const activo = t.id === 'mas'
                ? tab === 'mas' || ['mensajes','pagos','ajustes'].includes(tab)
                : tab === t.id
              const badge = t.badge || 0
              // Iconos SVG por tab
              const ICONS = {
                hoy: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
                entrena: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/></svg>,
                nutricion: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>,
                progreso: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                mas: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
              }
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex-1 flex flex-col items-center justify-center pt-2.5 pb-1.5 min-h-[56px] relative active:opacity-60 transition-opacity"
                  style={{ color: activo ? color : 'rgba(255,255,255,0.3)' }}>
                  {activo && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full"
                      style={{ background: color }} />
                  )}
                  <div className="relative">
                    {ICONS[t.id] || <span className="text-lg">{t.icon}</span>}
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white"
                        style={{ background: color }}>{badge > 9 ? '9+' : badge}</span>
                    )}
                  </div>
                  <span className="text-[8px] font-black tracking-wide uppercase mt-1.5"
                    style={{ color: activo ? color : 'rgba(255,255,255,0.25)' }}>
                    {t.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Toast */}
        {toast && <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-xl whitespace-nowrap" style={{ background: color }}>{toast}</div>}

        {/* Modal check-in */}
        {modalCI && <ModalCheckin color={color} ciForm={ciForm} setCiForm={setCiForm} enviandoCI={enviandoCI} enviarCheckin={enviarCheckin} onClose={() => setModalCI(false)} />}

        {/* Modal valorar */}
        {valorando && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setValorando(null)}>
            <div className="bg-white rounded-3xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-[#0A0A0A] text-lg">¿Cómo fue la sesión?</p>
                <button onClick={() => setValorando(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2F1EE] text-xl">×</button>
              </div>
              <p className="text-sm text-[#9B9B9B] mb-5">{new Date(valorando.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</p>
              {[
                { label: '💪 Esfuerzo percibido (RPE)', val: rpe, set: setRpe, max: 10, lo: 'Suave', hi: 'Máximo' },
                { label: '🏋️ Fatiga muscular', val: fatigaVal, set: setFatigaVal, max: 5, lo: 'Ninguna', hi: 'Muy alta' },
              ].map(({ label, val, set, max, lo, hi }) => (
                <div key={label} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-[#0A0A0A]">{label}</p>
                    {val && <span className="text-sm font-bold" style={{ color }}>{val}/{max}</span>}
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${max},1fr)` }}>
                    {Array.from({length:max},(_,i)=>i+1).map(v => (
                      <button key={v} onClick={() => set(v)}
                        className={`py-3 rounded-xl text-sm font-bold transition-all ${val===v?'text-white':'border border-black/10 text-[#9B9B9B]'}`}
                        style={val===v?{background:v>=(max*.7)?'#ef4444':v>=(max*.4)?'#f59e0b':color}:{}}>{v}</button>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1.5"><span className="text-[10px] text-[#C0C0C0]">{lo}</span><span className="text-[10px] text-[#C0C0C0]">{hi}</span></div>
                </div>
              ))}
              <button onClick={guardarValoracion} disabled={!rpe||!fatigaVal||guardandoVal}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95"
                style={{ background: color }}>{guardandoVal?'⏳...':'✓ Guardar valoración'}</button>
            </div>
          </div>
        )}

        {/* Modal actividad */}
        {modalActividad && <ModalActividad color={color} actForm={actForm} setActForm={setActForm} guardandoAct={guardandoAct} guardarActividad={guardarActividad} onClose={() => setModalActividad(false)} ACTIVIDADES={ACTIVIDADES} />}

        {/* Modal registro sesión */}
        {modalRegistro && <ModalRegistroSesion dia={modalRegistro} color={color} registroSets={registroSets} setRegistroSets={setRegistroSets} ejerciciosHist={ejerciciosHist} guardandoRegistro={guardandoRegistro} guardarRegistroSesion={guardarRegistroSesion} onClose={() => { setModalRegistro(null); setRegistroSets({}) }} />}

      </main>
    </div>
  )
}

// ─── Login ────────────────────────────────────────────────────────────────────
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
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <p className="text-white font-bold text-xl mb-2">Revisa tu email</p>
        <p className="text-white/50 text-sm mb-6">Te enviamos un enlace para entrar directamente.</p>
        <button onClick={() => { setEnviado(false); setRecuperar(false) }} className="text-[#FF5C00] text-sm font-semibold">← Volver</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#FF5C00' }}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none"><rect x="5" y="5" width="4" height="18" rx="1" fill="white"/><rect x="5" y="5" width="13" height="4" rx="1" fill="white"/><rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/></svg>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Forge</h1>
          <p className="text-white/40 text-sm mt-1">Tu portal de entrenamiento</p>
        </div>
        <div className="rounded-2xl p-6 border border-white/8" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <form onSubmit={recuperar ? resetPass : entrar} className="space-y-3">
            <div>
              <label className="text-white/50 text-xs font-medium block mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="tu@email.com"
                className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none border border-white/10"
                style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
            {!recuperar && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-white/50 text-xs font-medium">Contraseña</label>
                  <button type="button" onClick={() => setRecuperar(true)} className="text-[#FF5C00] text-xs font-medium">¿La olvidaste?</button>
                </div>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)} required placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>
            )}
            {error && <p className="text-red-400 text-xs rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)' }}>{error}</p>}
            <button type="submit" disabled={loading || !email || (!recuperar && !pass)}
              className="w-full font-bold py-3.5 rounded-xl text-white disabled:opacity-40 active:scale-95 transition-all"
              style={{ background: '#FF5C00' }}>{loading ? '...' : recuperar ? 'Enviar enlace' : 'Entrar'}</button>
            {recuperar && <button type="button" onClick={() => setRecuperar(false)} className="w-full text-white/40 text-sm py-2">← Volver</button>}
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── TAB HOY ──────────────────────────────────────────────────────────────────
function TabHoy({ cliente, color, config, checkins, rutina, nutricion, sesiones, sesionesHoy, pendientes, cuest, verRutina, verNutricion, setTab, setModalCI, setValorando, sesionesEstaSemana, semanasActivas, setModalActividad, setModalRegistro, ejerciciosHist }) {
  const hoy = hoyStr()
  const ahora = new Date()
  const hora = ahora.getHours()
  const saludo = hora < 6 ? 'Buenas noches' : hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = cliente?.nombre?.split(' ')[0] || ''
  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const esOnline = cliente?.tipo === 'online'
  const sesionHoy = sesionesHoy?.[0]
  const pesos = checkins?.filter(c => c.peso).slice().reverse() || []
  const diasSinCI = checkins?.[0]?.fecha ? Math.floor((Date.now() - new Date(checkins[0].fecha).getTime()) / 864e5) : 999
  const ciUrgente = diasSinCI >= 7
  const diffPeso = pesos.length >= 2 ? +(pesos[pesos.length-1].peso - pesos[0].peso).toFixed(1) : null
  const diasRutina = rutina?.borrador?.dias || rutina?.contenido?.dias || []
  const sesCompletadas = (sesionesEstaSemana || []).filter(s => s.completada && s.fecha <= hoy).length
  const diaHoy = diasRutina.length > 0 ? diasRutina[sesCompletadas % diasRutina.length] : null

  // Agenda semana
  const lunesEsta = new Date(ahora); lunesEsta.setDate(ahora.getDate() - (ahora.getDay()||7) + 1)
  const diasAgenda = Array.from({length:6}, (_,i) => {
    const d = new Date(lunesEsta); d.setDate(lunesEsta.getDate() + i)
    const fs = d.toISOString().split('T')[0]
    const sesDia = esOnline ? (sesionesEstaSemana||[]).filter(s=>s.fecha===fs) : (sesiones||[]).filter(s=>s.fecha===fs)
    return { fecha: fs, d, sesiones: sesDia, esHoy: fs===hoy, esPasado: fs<hoy }
  })
  const hayAgenda = esOnline ? (sesionesEstaSemana||[]).length>0 : (sesiones||[]).filter(s=>s.fecha>=lunesEsta.toISOString().split('T')[0]).length>0
  const esNuevo = !rutina && !nutricion && !checkins?.length && !hayAgenda

  return (
    <div className="space-y-3 pb-2">
      {/* Hero — negro, nombre grande, datos de un vistazo */}
      <div className="rounded-3xl overflow-hidden -mx-0" style={{ background: '#0A0A0A' }}>
        <div className="px-5 pt-5 pb-4">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {DIAS[ahora.getDay()].toUpperCase()} · {ahora.getDate()} {MESES[ahora.getMonth()].toUpperCase()}
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight leading-none">{nombre}</h1>
          {semanasActivas > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <div className="h-1.5 rounded-full flex-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(semanasActivas * 10, 100)}%`, background: color }} />
              </div>
              <p className="text-[11px] font-black tracking-wide flex-shrink-0" style={{ color }}>
                {semanasActivas} SEM
              </p>
            </div>
          )}
        </div>
        {/* Stats rápidos dentro del hero */}
        {(pesos.length >= 1 || checkins.length > 0) && (
          <div className="grid border-t" style={{ gridTemplateColumns: `repeat(${[pesos.length>=2, checkins.length>0, semanasActivas>0].filter(Boolean).length}, 1fr)`, borderColor: 'rgba(255,255,255,0.06)' }}>
            {pesos.length >= 2 && diffPeso !== null && (
              <div className="px-4 py-3 border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-2xl font-black leading-none" style={{ color: diffPeso < 0 ? '#10b981' : diffPeso > 0 ? '#818cf8' : 'white' }}>
                  {diffPeso > 0 ? '+' : ''}{diffPeso}
                </p>
                <p className="text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>kg total</p>
              </div>
            )}
            {checkins.length > 0 && (
              <div className="px-4 py-3 border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-2xl font-black text-white leading-none">{checkins.length}</p>
                <p className="text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>check-ins</p>
              </div>
            )}
            {semanasActivas > 0 && (
              <div className="px-4 py-3">
                <p className="text-2xl font-black leading-none" style={{ color }}>{semanasActivas}</p>
                <p className="text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>semanas</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bienvenida nuevo */}
      {esNuevo && (
        <div className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
          <div className="px-5 py-6">
            <p className="text-white/60 text-xs font-semibold mb-1.5">Bienvenido a Forge</p>
            <p className="text-white font-bold text-xl leading-snug">{config?.nombre_entrenador||'Tu entrenador'} está preparando tu plan</p>
            <p className="text-white/60 text-sm mt-2">En breve tendrás tu rutina, plan de nutrición y progreso.</p>
          </div>
          <div className="px-5 py-3.5 bg-black/15 flex items-center justify-between">
            <p className="text-white/60 text-xs">¿Alguna duda?</p>
            <button onClick={() => setTab('mensajes')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/20 text-white active:scale-95">Escribir →</button>
          </div>
        </div>
      )}

      {/* Cuestionario nutrición */}
      {verNutricion && !nutricion && !cuest && !esNuevo && (
        <a href={`https://forge-studio-os.vercel.app/nutricion-cuest?e=${cliente.entrenador_id}&c=${cliente.id}`}
          className="flex items-center gap-4 rounded-2xl p-4 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><span className="text-xl">🥗</span></div>
          <div className="flex-1"><p className="text-sm font-bold text-white">Cuestionario de nutrición</p><p className="text-xs text-white/70 mt-0.5">Necesario para crear tu plan personalizado</p></div>
          <span className="text-white/70 text-xl flex-shrink-0">→</span>
        </a>
      )}

      {/* Valoración pendiente */}
      {pendientes?.[0] && (
        <button onClick={() => setValorando(pendientes[0])}
          className="w-full flex items-center gap-4 rounded-2xl p-4 border-2 text-left active:scale-95 transition-all"
          style={{ borderColor: color, background: `${color}06` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}><span className="text-xl">⭐</span></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A0A0A]">¿Cómo fue el {new Date(pendientes[0].fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'long'})}?</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">30 seg · ayuda a ajustar la carga</p>
          </div>
          <span className="text-sm font-bold" style={{ color }}>Valorar →</span>
        </button>
      )}

      {/* Sesión de hoy */}
      {sesionHoy && (
        <div className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg,${color},${color}e0)` }}>
          <div className="px-5 py-5">
            <p className="text-white/60 text-[10px] font-bold tracking-widest mb-1.5">HOY TOCA</p>
            <p className="text-white font-bold text-xl">{sesionHoy.tipo==='online'?'Entrenamiento online':sesionHoy.tipo==='grupo'?'Sesión en grupo':'Entrenamiento personal'}</p>
            {sesionHoy.hora && <p className="text-white/70 text-sm mt-1.5">🕐 {sesionHoy.hora.slice(0,5)}{sesionHoy.duracion_minutos?` · ${sesionHoy.duracion_minutos} min`:''}</p>}
            {diaHoy && <p className="text-white/50 text-xs mt-1">{diaHoy.nombre} · {(diaHoy.ejercicios||[]).length} ejercicios</p>}
          </div>
          <div className="px-4 py-3 bg-black/15 grid grid-cols-2 gap-2">
            <button onClick={() => setTab('entrena')} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/15 text-white text-xs font-bold active:scale-95">💪 Ver rutina</button>
            <button onClick={() => diaHoy && setModalRegistro(diaHoy)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/25 text-white text-xs font-bold active:scale-95">✓ Registrar sesión</button>
          </div>
        </div>
      )}

      {/* Hoy toca (online sin sesión programada) */}
      {!sesionHoy && diaHoy && esOnline && (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-black/4" style={{ background: `${color}06` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: color }}>{sesCompletadas%diasRutina.length+1}</div>
            <div className="flex-1"><p className="text-xs font-bold text-[#0A0A0A]">{diaHoy.nombre}</p><p className="text-[10px] text-[#9B9B9B]">{(diaHoy.ejercicios||[]).length} ejercicios · {rutina?.nombre}</p></div>
          </div>
          <div className="px-4 py-3 flex gap-2">
            <button onClick={() => setTab('entrena')} className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-black/10 text-[#0A0A0A] active:scale-95">Ver ejercicios</button>
            <button onClick={() => setModalRegistro(diaHoy)} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white active:scale-95" style={{ background: color }}>✓ Registrar</button>
          </div>
        </div>
      )}

      {/* Check-in urgente */}
      {ciUrgente && (
        <button onClick={() => setModalCI(true)}
          className="w-full flex items-center gap-4 rounded-2xl p-4 active:scale-95 text-left animate-pulse"
          style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><span className="text-xl">⏰</span></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">{diasSinCI>900?'Haz tu primer check-in':`${diasSinCI} días sin check-in`}</p>
            <p className="text-xs text-white/70 mt-0.5">Tu entrenador necesita saber cómo estás</p>
          </div>
          <span className="text-white/80 text-xl">→</span>
        </button>
      )}



      {/* Gráfica de progreso */}
      {pesos.length>=2&&(
        <button onClick={() => setTab('progreso')}
          className="w-full rounded-2xl overflow-hidden text-left active:scale-[0.99] transition-all"
          style={{ background: '#0A0A0A' }}>
          <div className="px-5 pt-4 pb-3 flex items-start justify-between">
            <div>
              <p className="text-[9px] font-black tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Peso</p>
              <p className="text-3xl font-black text-white tracking-tight leading-none mt-1">
                {pesos[pesos.length-1].peso}<span className="text-sm font-normal ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>kg</span>
              </p>
            </div>
            {diffPeso !== null && (
              <div className="text-right">
                <p className="text-xl font-black tracking-tight leading-none"
                  style={{ color: diffPeso<0?'#10b981':diffPeso>0?'#818cf8':'rgba(255,255,255,0.4)' }}>
                  {diffPeso>0?'+':''}{diffPeso}
                </p>
                <p className="text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  desde inicio
                </p>
              </div>
            )}
          </div>
          <div className="flex items-end gap-1 px-5 pb-4" style={{ height: 72 }}>
            {pesos.slice(-12).map((c,i,arr)=>{
              const min=Math.min(...arr.map(x=>x.peso)),max=Math.max(...arr.map(x=>x.peso))
              const h=max===min?60:Math.max(15,((c.peso-min)/(max-min))*80+20)
              const isLast=i===arr.length-1
              return (
                <div key={i} className="flex-1 rounded-sm"
                  style={{ height:`${h}%`, minHeight:4,
                    background: isLast ? color : 'rgba(255,255,255,0.12)',
                    boxShadow: isLast ? `0 0 12px ${color}60` : undefined }} />
              )
            })}
          </div>
        </button>
      )}

      {/* Agenda semanal */}
      {hayAgenda&&(
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/4 flex items-center justify-between">
            <p className="text-xs font-bold text-[#0A0A0A]">Esta semana</p>
            <p className="text-[10px] text-[#9B9B9B]">{esOnline?'registradas':'programadas'}</p>
          </div>
          <div className="divide-y divide-black/4">
            {diasAgenda.map((dia,i)=>(
              <div key={i} className="px-4 py-2.5 flex items-center gap-3" style={dia.esHoy?{background:`${color}06`}:{}}>
                <div className="w-8 h-8 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                  style={dia.esHoy?{background:color}:{background:'#F2F1EE'}}>
                  <span className="text-[9px] font-bold" style={{ color:dia.esHoy?'rgba(255,255,255,0.7)':'#9B9B9B' }}>
                    {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][dia.d.getDay()]}
                  </span>
                  <span className="text-sm font-bold" style={{ color:dia.esHoy?'white':dia.esPasado?'#C0C0C0':'#0A0A0A' }}>{dia.d.getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {dia.sesiones.length>0
                    ? dia.sesiones.map((s,si)=>(
                      <p key={si} className="text-xs font-semibold text-[#0A0A0A]">
                        {s.tipo==='online'?'🖥':s.tipo==='libre'?'🏃':'🏋️'}
                        {s.hora?` ${s.hora.slice(0,5)}`:''}{s.duracion_minutos?` · ${s.duracion_minutos}min`:''}{s.completada?' ✓':''}
                      </p>
                    ))
                    : <p className="text-xs text-[#D0D0D0]">{dia.esPasado?'Descanso':'—'}</p>
                  }
                </div>
                {dia.esHoy&&dia.sesiones.length>0&&<span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background:color }}>HOY</span>}
              </div>
            ))}
          </div>
          {esOnline&&(
            <div className="px-4 py-3 border-t border-black/4">
              <button onClick={() => setModalActividad(true)} className="w-full py-2.5 rounded-xl text-xs font-bold text-white active:scale-95" style={{ background:color }}>+ Registrar actividad</button>
            </div>
          )}
        </div>
      )}

      {/* Accesos rápidos — grid 2x2 limpio */}
      <div className="grid grid-cols-2 gap-2">
        {verRutina&&(
          <button onClick={() => setTab('entrena')}
            className="bg-white rounded-2xl p-4 text-left active:scale-[0.98] transition-all">
            <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B] mb-2">Rutina</p>
            <p className="text-sm font-black text-[#0A0A0A] leading-tight line-clamp-2">
              {rutina ? rutina.nombre : 'En preparación'}
            </p>
            <p className="text-[10px] font-bold mt-2" style={{ color }}>
              {rutina ? `${diasRutina.length} días →` : '—'}
            </p>
          </button>
        )}
        {verNutricion&&(
          <button onClick={() => setTab('nutricion')}
            className="bg-white rounded-2xl p-4 text-left active:scale-[0.98] transition-all">
            <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B] mb-2">Nutrición</p>
            <p className="text-sm font-black text-[#0A0A0A] leading-tight line-clamp-2">
              {nutricion ? nutricion.nombre : 'En preparación'}
            </p>
            <p className="text-[10px] font-bold mt-2" style={{ color }}>
              {nutricion?.calorias_dia ? `${nutricion.calorias_dia} kcal →` : cuest ? 'Pendiente' : '—'}
            </p>
          </button>
        )}
        <button onClick={() => setModalCI(true)}
          className="rounded-2xl p-4 text-left active:scale-[0.98] transition-all"
          style={{
            background: ciUrgente ? '#0A0A0A' : 'white',
            border: ciUrgente ? `1px solid ${color}` : undefined
          }}>
          <p className="text-[9px] font-black tracking-[0.15em] uppercase mb-2"
            style={{ color: ciUrgente ? color : '#9B9B9B' }}>Check-in</p>
          <p className="text-sm font-black leading-tight"
            style={{ color: ciUrgente ? 'white' : '#0A0A0A' }}>
            {ciUrgente
              ? diasSinCI > 900 ? 'Primer check-in' : `${diasSinCI} días`
              : `Hace ${diasSinCI === 0 ? 'hoy' : diasSinCI + 'd'}`}
          </p>
          <p className="text-[10px] font-bold mt-2" style={{ color: ciUrgente ? color : '#9B9B9B' }}>
            {ciUrgente ? 'Registrar →' : 'Nuevo →'}
          </p>
        </button>
        <button onClick={() => setModalActividad(true)}
          className="bg-white rounded-2xl p-4 text-left active:scale-[0.98] transition-all">
          <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B] mb-2">Actividad</p>
          <p className="text-sm font-black text-[#0A0A0A] leading-tight">Registrar</p>
          <p className="text-[10px] font-bold mt-2" style={{ color }}>Footing, padel… →</p>
        </button>
      </div>
    </div>
  )
}




function TabEntrena({ rutina, color, ejerciciosHist, setModalRegistro, esOnline }) {
  const [diaAbierto, setDiaAbierto] = useState(null) // null = todos cerrados

  if (!rutina) return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">💪</div>
      <p className="text-lg font-bold text-[#0A0A0A]">Rutina en preparación</p>
      <p className="text-sm text-[#9B9B9B] mt-2 leading-relaxed max-w-xs mx-auto">Tu entrenador está diseñando tu plan personalizado.</p>
    </div>
  )

  const dias = rutina.borrador?.dias || rutina.contenido?.dias || []

  // Índice de último peso por ejercicio (primera entrada = más reciente por el order desc)
  const histPorEj = {}
  for (const reg of ejerciciosHist || []) {
    const nombre = reg.ejercicio_nombre
    if (histPorEj[nombre]) continue // solo el más reciente
    const sets = (reg.sets || []).filter(s => s.peso && !isNaN(+s.peso))
    if (!sets.length) continue
    const maxPeso = Math.max(...sets.map(s => +s.peso))
    const rmMax = Math.max(...sets.map(s => rmEpley(+s.peso, parseReps(s.reps))))
    histPorEj[nombre] = { maxPeso, rmMax: +rmMax.toFixed(1), fecha: reg.sesiones?.fecha, sets }
  }

  return (
    <div className="space-y-3">
      <div className="pb-1 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">{rutina.nombre}</h2>
          <p className="text-xs text-[#9B9B9B] mt-0.5">{dias.length} días · {rutina.semanas || 4} semanas</p>
        </div>
        {diaAbierto !== null && (
          <button onClick={() => setDiaAbierto(null)}
            className="text-xs text-[#9B9B9B] active:scale-95">Cerrar todo</button>
        )}
      </div>

      {dias.map((dia, di) => {
        const abierto = diaAbierto === di
        const ejercicios = dia.ejercicios || []
        const conHistorico = ejercicios.filter(ej => histPorEj[ej.nombre]).length

        return (
          <div key={di} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            {/* Header del día — siempre visible, clickable */}
            <button
              className="w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors active:bg-black/2"
              onClick={() => setDiaAbierto(abierto ? null : di)}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: color }}>{di + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#0A0A0A] truncate">{dia.nombre || `Día ${di + 1}`}</p>
                <p className="text-[10px] text-[#9B9B9B] mt-0.5">
                  {ejercicios.length} ejercicios
                  {conHistorico > 0 && <span style={{ color }}> · {conHistorico} con historial</span>}
                </p>
              </div>
              <span className="text-[#C0C0C0] text-sm transition-transform duration-200 flex-shrink-0"
                style={{ transform: abierto ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>

            {/* Contenido colapsable */}
            {abierto && (
              <>
                <div className="divide-y divide-black/4 border-t border-black/5">
                  {ejercicios.map((ej, ei) => {
                    const hist = histPorEj[ej.nombre]
                    return (
                      <div key={ei} className="px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0A0A0A]">{ej.nombre}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                              {ej.series && <span className="text-xs text-[#9B9B9B]">{ej.series} series</span>}
                              {ej.reps && <span className="text-xs text-[#9B9B9B]">· {ej.reps} reps</span>}
                              {ej.peso && <span className="text-xs text-[#9B9B9B]">· {ej.peso}</span>}
                              {ej.descanso && ej.descanso !== '-' && (
                                <span className="text-xs text-[#9B9B9B]">· 💤 {ej.descanso}</span>
                              )}
                            </div>
                            {ej.notas && (
                              <p className="text-[10px] text-[#9B9B9B] mt-1.5 italic leading-relaxed border-l-2 pl-2"
                                style={{ borderColor: `${color}40` }}>{ej.notas}</p>
                            )}
                          </div>
                          {/* Histórico de cargas */}
                          {hist ? (
                            <div className="text-right flex-shrink-0 ml-1">
                              <p className="text-base font-bold tracking-tight" style={{ color }}>{hist.maxPeso}<span className="text-[10px] font-normal text-[#9B9B9B] ml-0.5">kg</span></p>
                              {hist.rmMax > hist.maxPeso && (
                                <p className="text-[9px] text-[#9B9B9B]">RM ~{hist.rmMax}kg</p>
                              )}
                              <p className="text-[9px] text-[#C0C0C0]">última vez</p>
                            </div>
                          ) : (
                            ej.patron && (
                              <span className="text-[9px] bg-[#F2F1EE] text-[#9B9B9B] px-1.5 py-0.5 rounded-md font-medium mt-0.5 flex-shrink-0">{ej.patron}</span>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Botón registrar (solo online) */}
                {esOnline && (
                  <div className="px-4 py-3 border-t border-black/5" style={{ background: `${color}04` }}>
                    <button onClick={() => setModalRegistro(dia)}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white active:scale-95 transition-all"
                      style={{ background: color }}>
                      ✓ Registrar esta sesión
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
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
function TabProgreso({ checkins, marcas, medidas, fotos, ejerciciosHist, color, subTab, setSubTab }) {
  const SUBTABS = [{ id: 'peso', label: '⚖️ Peso' }, { id: 'fuerza', label: '💪 Fuerza' }, { id: 'medidas', label: '📏 Medidas' }, { id: 'fotos', label: '📸 Fotos' }]
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
      {subTab === 'fuerza' && <SubFuerza ejerciciosHist={ejerciciosHist} color={color} />}
      {subTab === 'medidas' && <SubMedidas medidas={medidas} color={color} />}
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
function TabMas({ pagos, cliente, setCliente, color, tabsExtra = [], setTab, msgNoLeidos = 0 }) {
  const [seccion, setSeccion] = useState('menu')
  const [form, setForm] = useState({ peso_actual: cliente?.peso_actual || '', peso_objetivo: cliente?.peso_objetivo || '', objetivo: cliente?.objetivo || '' })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)

  const pagosPendientes = pagos?.filter(p => p.estado !== 'cobrado').length || 0

  const ITEMS = [
    {
      id: 'mensajes',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
      label: 'Mensajes',
      desc: msgNoLeidos > 0 ? `${msgNoLeidos} mensaje${msgNoLeidos > 1 ? 's' : ''} sin leer` : 'Chat con tu entrenador',
      badge: msgNoLeidos,
      urgente: msgNoLeidos > 0,
    },
    ...(pagos?.length ? [{
      id: 'pagos',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
      label: 'Pagos',
      desc: pagosPendientes > 0 ? `${pagosPendientes} pago${pagosPendientes > 1 ? 's' : ''} pendiente${pagosPendientes > 1 ? 's' : ''}` : 'Historial de pagos',
      badge: pagosPendientes,
      urgente: pagosPendientes > 0,
    }] : []),
    {
      id: 'ajustes',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
      label: 'Ajustes',
      desc: 'Objetivo, peso, contraseña',
      badge: 0,
      urgente: false,
    },
  ]

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

  if (seccion === 'ajustes') {
    const OBJETIVOS = [
      ['perdida_grasa','🔥 Pérdida de grasa'],['ganancia_muscular','💪 Ganar músculo'],
      ['tonificacion','✨ Tonificación'],['rendimiento','🏃 Rendimiento'],
      ['mantenimiento','⚖️ Mantenimiento'],['salud','❤️ Salud'],
    ]
    return (
      <div className="space-y-4">
        <button onClick={() => setSeccion('menu')} className="text-xs font-bold flex items-center gap-1.5" style={{ color }}>← Volver</button>
        <p className="text-xl font-black text-[#0A0A0A] tracking-tight">Ajustes</p>
        <form onSubmit={guardar} className="bg-white rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[['Peso actual (kg)','peso_actual'],['Peso objetivo (kg)','peso_objetivo']].map(([label,key]) => (
              <div key={key}>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9B9B9B] block mb-2">{label}</label>
                <input type="number" step="0.1" value={form[key]}
                  onChange={e => setForm(f => ({...f,[key]:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#9B9B9B] block mb-2">Mi objetivo</label>
            <div className="grid grid-cols-2 gap-2">
              {OBJETIVOS.map(([v,l]) => (
                <button key={v} type="button" onClick={() => setForm(f=>({...f,objetivo:v}))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border text-left transition-all ${form.objetivo===v?'text-white border-transparent':'border-black/10 text-[#6B6B6B]'}`}
                  style={form.objetivo===v?{background:color}:{}}>{l}</button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={guardando}
            className="w-full py-3.5 rounded-xl text-white font-black text-sm disabled:opacity-40"
            style={{background:ok?'#10b981':color}}>
            {guardando?'Guardando...':ok?'✓ Guardado':'Guardar'}
          </button>
        </form>
        <div className="bg-white rounded-2xl p-4">
          <button onClick={async()=>{await supabase.auth.resetPasswordForEmail(cliente?.email||'',{redirectTo:`${window.location.origin}/`});alert('Email enviado.')}}
            className="text-sm font-bold text-[#6B6B6B]">Cambiar contraseña →</button>
        </div>
        <button onClick={()=>supabase.auth.signOut()}
          className="w-full py-3.5 rounded-xl border border-red-100 text-red-400 text-sm font-bold">
          Cerrar sesión
        </button>
      </div>
    )
  }

  if (seccion === 'pagos') {
    return (
      <div className="space-y-3">
        <button onClick={() => setSeccion('menu')} className="text-xs font-bold flex items-center gap-1.5" style={{ color }}>← Volver</button>
        <p className="text-xl font-black text-[#0A0A0A] tracking-tight">Pagos</p>
        {!pagos?.length
          ? <div className="text-center py-10"><p className="text-base font-bold text-[#0A0A0A]">Sin pagos registrados</p></div>
          : pagos.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#0A0A0A]">{p.concepto||'Pago mensual'}</p>
                <p className="text-[10px] text-[#9B9B9B] mt-0.5 font-medium">
                  {p.fecha_pago?new Date(p.fecha_pago+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'}):''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-black text-[#0A0A0A]">{p.importe}€</p>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${p.estado==='cobrado'?'bg-emerald-50 text-emerald-600':'bg-amber-50 text-amber-600'}`}>
                  {p.estado==='cobrado'?'✓ Cobrado':'Pendiente'}
                </span>
              </div>
            </div>
          ))
        }
      </div>
    )
  }

  if (seccion === 'mensajes') {
    return (
      <div>
        <button onClick={() => setSeccion('menu')} className="text-xs font-bold mb-4 flex items-center gap-1.5" style={{ color }}>← Volver</button>
        <p className="text-xl font-black text-[#0A0A0A] tracking-tight mb-4">Mensajes</p>
        <button onClick={() => { setSeccion('menu'); setTab('mensajes') }}
          className="w-full py-4 rounded-2xl text-white font-black text-sm active:scale-95 transition-all"
          style={{ background: color }}>Ir a Mensajes →</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-2xl font-black text-[#0A0A0A] tracking-tight pt-1">Más</p>

      {/* Tarjetas grandes — cada sección bien visible */}
      {ITEMS.map(item => (
        <button key={item.id}
          onClick={() => {
            if (item.id === 'mensajes') setTab('mensajes')
            else setSeccion(item.id)
          }}
          className="w-full rounded-2xl p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all"
          style={{
            background: item.urgente ? '#0A0A0A' : 'white',
            border: item.urgente ? `1px solid ${color}` : undefined,
          }}>
          {/* Icono */}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: item.urgente ? `${color}20` : '#F4F3F0',
              color: item.urgente ? color : '#6B6B6B',
            }}>
            {item.icon}
          </div>
          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-black leading-tight"
              style={{ color: item.urgente ? 'white' : '#0A0A0A' }}>
              {item.label}
            </p>
            <p className="text-xs mt-0.5 font-medium"
              style={{ color: item.urgente ? `${color}` : '#9B9B9B' }}>
              {item.desc}
            </p>
          </div>
          {/* Badge o flecha */}
          {item.badge > 0
            ? <span className="w-7 h-7 rounded-full text-sm font-black flex items-center justify-center text-white flex-shrink-0"
                style={{ background: color }}>{item.badge > 9 ? '9+' : item.badge}</span>
            : <span className="text-2xl flex-shrink-0" style={{ color: 'rgba(0,0,0,0.15)' }}>›</span>
          }
        </button>
      ))}

      {/* Perfil del cliente */}
      <div className="bg-white rounded-2xl p-4 flex items-center gap-3 mt-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
          style={{ background: color }}>
          {cliente?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-[#0A0A0A] truncate">{cliente?.nombre}</p>
          <p className="text-[10px] text-[#9B9B9B] truncate font-medium">{cliente?.email}</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-lg capitalize"
          style={{ background: '#F4F3F0', color: '#9B9B9B' }}>
          {cliente?.tipo}
        </span>
      </div>

      <button onClick={() => supabase.auth.signOut()}
        className="w-full py-3.5 rounded-2xl text-sm font-bold border border-red-100 text-red-400 active:scale-95 transition-all">
        Cerrar sesión
      </button>
    </div>
  )
}

// ─── SubFuerza ────────────────────────────────────────────────────────────────
function SubFuerza({ ejerciciosHist, color }) {
  const [ejSel, setEjSel] = useState(null)

  const mapa = {}
  for (const reg of ejerciciosHist || []) {
    const nombre = reg.ejercicio_nombre
    if (!mapa[nombre]) mapa[nombre] = []
    const sets = (reg.sets || []).filter(s => s.peso && !isNaN(+s.peso))
    if (sets.length) {
      const maxRM = Math.max(...sets.map(s => rmEpley(+s.peso, parseReps(s.reps))))
      const maxPeso = Math.max(...sets.map(s => +s.peso))
      mapa[nombre].push({ fecha: reg.sesiones?.fecha, maxRM: +maxRM.toFixed(1), maxPeso: +maxPeso.toFixed(1) })
    }
  }

  const lista = Object.entries(mapa)
    .map(([nombre, registros]) => ({
      nombre,
      registros: registros.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')),
      rmActual: registros[registros.length - 1]?.maxRM || 0,
      rmInicial: registros[0]?.maxRM || 0,
    }))
    .filter(e => e.registros.length >= 1)
    .sort((a, b) => b.rmActual - a.rmActual)
    .slice(0, 12)

  if (!lista.length) return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">💪</div>
      <p className="text-base font-bold text-[#0A0A0A]">Sin registros de fuerza</p>
      <p className="text-sm text-[#9B9B9B] mt-2 max-w-xs mx-auto leading-relaxed">Registra tus sesiones con pesos y repeticiones para ver tu evolución.</p>
    </div>
  )

  const sel = ejSel ? lista.find(e => e.nombre === ejSel) : null

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-[#9B9B9B]">RM estimada = peso máximo en 1 rep (fórmula Epley). Toca un ejercicio para ver su evolución.</p>
      {sel ? (
        <div>
          <button onClick={() => setEjSel(null)} className="text-xs font-bold mb-3 flex items-center gap-1" style={{ color }}>← Todos</button>
          <div className="bg-white rounded-2xl border border-black/5 p-4">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-bold text-[#0A0A0A] flex-1 mr-3">{sel.nombre}</p>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color }}>{sel.rmActual}<span className="text-sm font-normal text-[#9B9B9B] ml-1">kg RM</span></p>
                {sel.rmActual > sel.rmInicial && <p className="text-xs font-bold text-emerald-600">+{(sel.rmActual - sel.rmInicial).toFixed(1)} kg desde inicio</p>}
              </div>
            </div>
            {sel.registros.length > 1 && (
              <div className="flex items-end gap-1.5 h-24 mt-2">
                {sel.registros.slice(-8).map((r, i, arr) => {
                  const min = Math.min(...arr.map(x => x.maxRM))
                  const max = Math.max(...arr.map(x => x.maxRM))
                  const h = max === min ? 50 : Math.max(15, ((r.maxRM - min) / (max - min)) * 75 + 25)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-md" style={{ height: `${h}%`, background: i === arr.length - 1 ? color : `${color}30`, minHeight: 5 }} />
                      <p className="text-[8px] text-[#C0C0C0]">{r.maxRM}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map(ej => {
            const mejora = ej.rmActual > ej.rmInicial ? +(ej.rmActual - ej.rmInicial).toFixed(1) : null
            return (
              <button key={ej.nombre} onClick={() => setEjSel(ej.nombre)}
                className="w-full bg-white rounded-2xl border border-black/5 p-4 flex items-center gap-3 text-left active:scale-95">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0A0A0A] truncate">{ej.nombre}</p>
                  <p className="text-[10px] text-[#9B9B9B] mt-0.5">{ej.registros.length} sesión{ej.registros.length !== 1 ? 'es' : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold" style={{ color }}>{ej.rmActual}<span className="text-xs font-normal text-[#9B9B9B] ml-0.5">kg</span></p>
                  {mejora && <p className="text-[10px] font-bold text-emerald-600">+{mejora} kg</p>}
                </div>
                <span className="text-[#C0C0C0] flex-shrink-0">›</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Modal check-in ───────────────────────────────────────────────────────────
function ModalCheckin({ color, ciForm, setCiForm, enviandoCI, enviarCheckin, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-black/5 flex items-center justify-between">
          <div><p className="font-bold text-[#0A0A0A] text-lg">Check-in semanal</p><p className="text-xs text-[#9B9B9B] mt-0.5">¿Cómo ha ido esta semana?</p></div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2F1EE] text-xl">×</button>
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
                <span>{icon}</span><p className="text-sm font-bold text-[#0A0A0A]">{label}</p>
                {ciForm[k] && <span className="ml-auto text-sm font-bold" style={{ color }}>{ciForm[k]}/{max}</span>}
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${max},1fr)` }}>
                {Array.from({ length: max }, (_, i) => i + 1).map(v => {
                  const sel = ciForm[k] === v
                  const bg = sel ? ((k === 'fatiga' || k === 'estres') && v >= 7 ? '#ef4444' : (k === 'fatiga' || k === 'estres') && v >= 5 ? '#f59e0b' : color) : undefined
                  return (
                    <button key={v} onClick={() => setCiForm(f => ({ ...f, [k]: v }))}
                      className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${sel ? 'text-white' : 'border border-black/10 text-[#9B9B9B]'}`}
                      style={sel ? { background: bg } : {}}>{v}</button>
                  )
                })}
              </div>
              <div className="flex justify-between mt-1.5"><span className="text-[10px] text-[#C0C0C0]">{lo}</span><span className="text-[10px] text-[#C0C0C0]">{hi}</span></div>
            </div>
          ))}
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] mb-2">⚖️ Peso <span className="text-xs text-[#9B9B9B] font-normal">(opcional)</span></p>
            <div className="flex items-center gap-2">
              <input type="number" step="0.1" placeholder="75.0" value={ciForm.peso} onChange={e => setCiForm(f => ({ ...f, peso: e.target.value }))}
                className="flex-1 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none" />
              <span className="text-sm text-[#9B9B9B]">kg</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] mb-2">💬 Nota <span className="text-xs text-[#9B9B9B] font-normal">(opcional)</span></p>
            <textarea rows={2} placeholder="¿Algo que contarle a tu entrenador?" value={ciForm.nota}
              onChange={e => setCiForm(f => ({ ...f, nota: e.target.value }))}
              className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none" />
          </div>
          <button onClick={enviarCheckin} disabled={!ciForm.energia || !ciForm.sueno || !ciForm.fatiga || !ciForm.estres || enviandoCI}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95"
            style={{ background: color }}>{enviandoCI ? '⏳ Enviando...' : '✓ Enviar check-in'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal actividad libre ────────────────────────────────────────────────────
function ModalActividad({ color, actForm, setActForm, guardandoAct, guardarActividad, onClose, ACTIVIDADES }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-black/5 flex items-center justify-between">
          <div><p className="font-bold text-[#0A0A0A] text-lg">Registrar actividad</p><p className="text-xs text-[#9B9B9B] mt-0.5">Tu entrenador lo verá en tu historial</p></div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2F1EE] text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] mb-3">¿Qué has hecho?</p>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVIDADES.map(a => (
                <button key={a.id} onClick={() => setActForm(f => ({ ...f, tipo: a.id }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium text-left border transition-all active:scale-95 ${actForm.tipo === a.id ? 'text-white border-transparent' : 'border-black/10 text-[#6B6B6B]'}`}
                  style={actForm.tipo === a.id ? { background: color } : {}}>{a.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] mb-2">⏱ Duración</p>
            <div className="grid grid-cols-4 gap-2">
              {[30, 45, 60, 90].map(min => (
                <button key={min} onClick={() => setActForm(f => ({ ...f, duracion: String(min) }))}
                  className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${actForm.duracion === String(min) ? 'text-white' : 'border border-black/10 text-[#6B6B6B]'}`}
                  style={actForm.duracion === String(min) ? { background: color } : {}}>{min}'</button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input type="number" placeholder="Otro (min)" value={[30,45,60,90].includes(+actForm.duracion) ? '' : actForm.duracion}
                onChange={e => setActForm(f => ({ ...f, duracion: e.target.value }))}
                className="flex-1 border border-black/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
              <span className="text-sm text-[#9B9B9B]">min</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-[#0A0A0A]">💓 Intensidad</p>
              {actForm.rpe && <span className="text-sm font-bold" style={{ color }}>{actForm.rpe}/10</span>}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[[2,'Suave'],[4,'Fácil'],[6,'Moderado'],[8,'Duro'],[10,'Máximo']].map(([v,l]) => (
                <button key={v} onClick={() => setActForm(f => ({ ...f, rpe: v }))}
                  className={`py-3 rounded-xl text-[10px] font-bold transition-all active:scale-95 ${actForm.rpe === v ? 'text-white' : 'border border-black/10 text-[#6B6B6B]'}`}
                  style={actForm.rpe === v ? { background: v>=8?'#ef4444':v>=6?'#f59e0b':color } : {}}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] mb-2">📝 Nota <span className="text-xs text-[#9B9B9B] font-normal">(opcional)</span></p>
            <input type="text" placeholder="Ej: 5km en el parque…" value={actForm.nota}
              onChange={e => setActForm(f => ({ ...f, nota: e.target.value }))}
              className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none" />
          </div>
          <button onClick={guardarActividad} disabled={!actForm.tipo || !actForm.duracion || guardandoAct}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95"
            style={{ background: color }}>{guardandoAct ? '⏳...' : '✓ Registrar actividad'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal registrar sesión ───────────────────────────────────────────────────
function ModalRegistroSesion({ dia, color, registroSets, setRegistroSets, ejerciciosHist, guardandoRegistro, guardarRegistroSesion, onClose }) {
  const ejercicios = dia?.ejercicios || []

  const histEj = {}
  for (const reg of ejerciciosHist || []) {
    const nombre = reg.ejercicio_nombre
    if (!histEj[nombre]) {
      const sets = (reg.sets || []).filter(s => s.peso && !isNaN(+s.peso))
      if (sets.length) histEj[nombre] = { sets, maxPeso: Math.max(...sets.map(s => +s.peso)) }
    }
  }

  function iniciarEj(ei) {
    if (registroSets[ei]) return
    const ej = ejercicios[ei]
    const n = parseInt(ej?.series) || 3
    const hist = histEj[ej?.nombre]
    setRegistroSets(prev => ({
      ...prev,
      [ei]: Array.from({ length: n }, (_, i) => ({
        peso: hist?.sets?.[i]?.peso?.toString() || '',
        reps: hist?.sets?.[i]?.reps?.toString() || ej?.reps?.split('-')[0] || '',
        completada: false,
      }))
    }))
  }

  function updSet(ei, si, campo, valor) {
    setRegistroSets(prev => {
      const copy = { ...prev }
      if (!copy[ei]) iniciarEj(ei)
      copy[ei] = (copy[ei] || []).map((s, i) => i === si ? { ...s, [campo]: valor } : s)
      return copy
    })
  }

  function toggleSet(ei, si) {
    setRegistroSets(prev => {
      const copy = { ...prev }
      copy[ei] = (copy[ei] || []).map((s, i) => i === si ? { ...s, completada: !s.completada } : s)
      return copy
    })
  }

  const totalComp = Object.values(registroSets).reduce((a, sets) => a + sets.filter(s => s.completada).length, 0)
  const totalSets = Object.values(registroSets).reduce((a, sets) => a + sets.length, 0)

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4 border-b border-black/5 flex items-start justify-between flex-shrink-0">
          <div className="flex-1 min-w-0 mr-3">
            <p className="font-bold text-[#0A0A0A] text-lg">{dia.nombre}</p>
            <p className="text-xs text-[#9B9B9B] mt-1">{ejercicios.length} ejercicios</p>
            {totalSets > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F2F1EE' }}>
                  <div className="h-full rounded-full" style={{ width: `${(totalComp/totalSets*100).toFixed(0)}%`, background: color }} />
                </div>
                <span className="text-[10px] font-bold text-[#9B9B9B]">{totalComp}/{totalSets}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2F1EE] text-xl flex-shrink-0">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {ejercicios.map((ej, ei) => {
            const hist = histEj[ej.nombre]
            const setsEj = registroSets[ei]
            const n = parseInt(ej.series) || 3
            const compEj = setsEj ? setsEj.filter(s => s.completada).length : 0

            return (
              <div key={ei} className="border-b border-black/4 last:border-0 px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold text-[#0A0A0A] flex-1">{ej.nombre}</p>
                  {setsEj && compEj === n && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓</span>}
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs text-[#9B9B9B]">{ej.series} × {ej.reps}{ej.peso ? ` · ${ej.peso}` : ''}</p>
                  {hist && <p className="text-xs font-bold ml-auto" style={{ color }}>Última vez: {hist.maxPeso} kg</p>}
                </div>
                {!setsEj
                  ? <button onClick={() => iniciarEj(ei)} className="w-full py-2 rounded-xl text-xs font-bold border border-black/10 text-[#6B6B6B] active:scale-95">+ Registrar sets</button>
                  : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr,72px,72px,36px] gap-2 px-0.5">
                        <p className="text-[10px] text-[#9B9B9B]">Serie</p>
                        <p className="text-[10px] text-[#9B9B9B] text-center">kg</p>
                        <p className="text-[10px] text-[#9B9B9B] text-center">Reps</p>
                        <p className="text-[10px] text-[#9B9B9B] text-center">✓</p>
                      </div>
                      {setsEj.map((s, si) => (
                        <div key={si} className="grid grid-cols-[1fr,72px,72px,36px] gap-2 items-center py-0.5 rounded-xl px-0.5"
                          style={s.completada ? { background: `${color}08` } : {}}>
                          <p className="text-xs font-bold" style={{ color: s.completada ? color : '#9B9B9B' }}>S{si+1}</p>
                          <input type="number" step="0.5" value={s.peso} placeholder="—"
                            onChange={e => updSet(ei, si, 'peso', e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none font-bold"
                            style={s.completada ? { borderColor: `${color}40` } : {}} />
                          <input type="number" value={s.reps} placeholder="—"
                            onChange={e => updSet(ei, si, 'reps', e.target.value)}
                            className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none font-bold"
                            style={s.completada ? { borderColor: `${color}40` } : {}} />
                          <button onClick={() => toggleSet(ei, si)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm border transition-all"
                            style={s.completada ? { background: color, borderColor: color, color: 'white' } : { background: 'white', borderColor: '#E0E0E0', color: '#C0C0C0' }}>✓</button>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            )
          })}
        </div>

        <div className="px-5 py-4 border-t border-black/5 flex-shrink-0">
          <button onClick={guardarRegistroSesion} disabled={guardandoRegistro || Object.keys(registroSets).length === 0}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95"
            style={{ background: color }}>
            {guardandoRegistro ? '⏳ Guardando...' : `✓ Guardar sesión${totalComp > 0 ? ` · ${totalComp} series` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
