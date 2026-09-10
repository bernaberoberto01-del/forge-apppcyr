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
      mensajes, pagos, marcas, medidas, fotos, cuest, ejerciciosHist, sesionesEstaSemana, nutricionRegistros] = await Promise.all([
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
      qa(supabase.from('nutricion_registros').select('fecha,dia_nombre').eq('cliente_id', cid).gte('fecha', hace(30)).order('fecha', { ascending: false })),
    ])

    setConfig(cfg)
    setDatos({ rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes, mensajes, pagos, marcas, medidas, fotos, cuest, ejerciciosHist, sesionesEstaSemana, nutricionRegistros })
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

  const { rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes, mensajes, pagos, marcas, medidas, fotos, cuest, ejerciciosHist, sesionesEstaSemana, nutricionRegistros } = datos
  const esOnline = cliente.tipo === 'online'
  const plan = cliente.plan_online
  // Mostrar si tiene plan, o si directamente tiene datos en BD
  const verRutina = !esOnline || ['entrenamiento', 'completo'].includes(plan) || !!(datos?.rutina)
  const verNutricion = !esOnline || ['nutricion', 'completo'].includes(plan) || !!(datos?.nutricion)
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

  // Bottom bar: siempre los tabs disponibles (máx 4) + Más
  const BOTTOM_TABS = (() => {
    const sinMas = TABS.filter(t => t.id !== 'mas') // todos menos Más
    return [...sinMas, { id: 'mas', label: 'Más', icon: '···', badge: msgNoLeidos }]
  })()

  // Secciones dentro del menú Más
  const MAS_ITEMS = [
    { id: 'mensajes', label: 'Mensajes',  icon: '✉️', badge: msgNoLeidos, desc: msgNoLeidos > 0 ? `${msgNoLeidos} sin leer` : 'Chat con tu entrenador' },
    ...(pagos?.length ? [{ id: 'pagos', label: 'Pagos', icon: '💳', badge: 0, desc: `${pagos.filter(p=>!['cobrado','pagado'].includes(p.estado)).length > 0 ? 'Tienes pagos pendientes' : 'Historial al día'}` }] : []),
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
          {tab === 'nutricion' && <TabNutricion nutricion={nutricion} cuest={cuest} cliente={cliente} color={color} nutricionRegistros={nutricionRegistros} />}
          {tab === 'progreso' && <TabProgreso checkins={checkins} marcas={marcas} medidas={medidas} fotos={fotos} ejerciciosHist={ejerciciosHist} color={color} subTab={subTab} setSubTab={setSubTab} cliente={cliente} cargarTodo={cargarTodo} />}
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
function TabNutricion({ nutricion, cuest, cliente, color, nutricionRegistros = [] }) {
  const [diaAbierto, setDiaAbierto] = useState(null)
  const [guardandoDia, setGuardandoDia] = useState(null)
  const [registrosLocales, setRegistrosLocales] = useState(nutricionRegistros)

  if (!nutricion) return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">🥗</div>
      <p className="text-lg font-black text-[#0A0A0A]">Plan en preparación</p>
      {!cuest
        ? <div className="mt-5">
            <p className="text-sm text-[#6B6B6B] mb-4 leading-relaxed max-w-xs mx-auto">Tu entrenador necesita tu cuestionario para crear tu plan.</p>
            <a href={`https://forge-studio-os.vercel.app/nutricion-cuest?e=${cliente?.entrenador_id}&c=${cliente?.id}`}
              className="inline-block text-white text-sm font-black px-6 py-3 rounded-xl"
              style={{ background: color }}>Rellenar cuestionario →</a>
          </div>
        : <p className="text-sm text-[#9B9B9B] mt-3">Cuestionario enviado · Pendiente</p>
      }
    </div>
  )

  const contenido = nutricion.contenido || nutricion.borrador || {}
  const macrosSrc = contenido.macros || {}

  const macros = [
    { label: 'Calorías', val: nutricion.calorias_dia || macrosSrc.calorias_dia, unit: 'kcal', c: color },
    { label: 'Proteína', val: nutricion.proteinas_g || macrosSrc.proteinas_g, unit: 'g', c: '#6366f1' },
    { label: 'Carbos', val: nutricion.carbohidratos_g || macrosSrc.carbohidratos_g, unit: 'g', c: '#f59e0b' },
    { label: 'Grasas', val: nutricion.grasas_g || macrosSrc.grasas_g, unit: 'g', c: '#10b981' },
  ].filter(m => m.val)

  const tieneMenu = Array.isArray(contenido.menu) && contenido.menu.length > 0
  const dias = tieneMenu ? contenido.menu : []
  const hidratacion = contenido.hidratacion || macrosSrc.hidratacion_litros || null

  // Tracker: fechas registradas
  const fechasRegistradas = new Set(registrosLocales.map(r => r.fecha))
  const hoy = hoyStr()

  async function registrarDia(dia, diaNombre) {
    setGuardandoDia(diaNombre)
    const { error } = await supabase.from('nutricion_registros').insert({
      cliente_id: cliente.id, entrenador_id: cliente.entrenador_id,
      fecha: hoy, dia_nombre: diaNombre
    })
    if (!error) {
      setRegistrosLocales(prev => [...prev, { fecha: hoy, dia_nombre: diaNombre }])
    }
    setGuardandoDia(null)
  }

  const yaRegistradoHoy = registrosLocales.some(r => r.fecha === hoy)
  // Semanas: últimas 4 semanas de registros por día de semana
  const totalRegistros = registrosLocales.length

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="pb-1">
        <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Nutrición</p>
        <h2 className="text-xl font-black text-[#0A0A0A] tracking-tight mt-0.5">{nutricion.nombre}</h2>
      </div>

      {/* Macros hero negro */}
      {macros.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0A0A0A' }}>
          <div className="grid grid-cols-4">
            {macros.map((m, i) => (
              <div key={m.label} className="px-3 py-4 text-center"
                style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                <p className="text-xl font-black leading-none" style={{ color: m.c }}>{m.val}</p>
                <p className="text-[9px] font-bold mt-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.unit}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{m.label}</p>
              </div>
            ))}
          </div>
          {/* Barra macros */}
          {macros.length >= 3 && (() => {
            const prot = (macros.find(m=>m.label==='Proteína')?.val||0)*4
            const carb = (macros.find(m=>m.label==='Carbos')?.val||0)*4
            const gras = (macros.find(m=>m.label==='Grasas')?.val||0)*9
            const total = prot+carb+gras||1
            return (
              <div className="px-4 pb-3 space-y-1.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex h-1.5 rounded-full overflow-hidden gap-px mt-2">
                  <div style={{ width:`${(prot/total*100).toFixed(0)}%`, background:'#6366f1' }} />
                  <div style={{ width:`${(carb/total*100).toFixed(0)}%`, background:'#f59e0b' }} />
                  <div style={{ width:`${(gras/total*100).toFixed(0)}%`, background:'#10b981' }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-bold" style={{ color:'#6366f150' }}>Prot {(prot/total*100).toFixed(0)}%</span>
                  <span className="text-[9px] font-bold" style={{ color:'#f59e0b50' }}>Carbos {(carb/total*100).toFixed(0)}%</span>
                  <span className="text-[9px] font-bold" style={{ color:'#10b98150' }}>Grasas {(gras/total*100).toFixed(0)}%</span>
                </div>
              </div>
            )
          })()}
          {hidratacion && (
            <div className="px-4 pb-3 flex items-center gap-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>💧</span>
              <p className="text-[11px] font-bold" style={{ color:'rgba(255,255,255,0.35)' }}>{hidratacion}L de agua al día</p>
            </div>
          )}
        </div>
      )}

      {/* Tracker semanal */}
      {tieneMenu && (
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Seguimiento</p>
            <p className="text-[10px] font-black" style={{ color }}>{totalRegistros} días registrados</p>
          </div>
          <div className="flex gap-1.5">
            {dias.map((dia, di) => {
              // Ver si algún registro de esta semana corresponde a este índice de día
              const registrosDelDia = registrosLocales.filter(r => r.dia_nombre === dia.dia)
              const completado = registrosDelDia.length > 0
              const esHoyDia = (() => {
                const DIAS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
                const diaHoy = DIAS_ES[new Date().getDay()]
                return dia.dia?.toLowerCase() === diaHoy.toLowerCase()
              })()
              return (
                <button key={di} onClick={() => setDiaAbierto(diaAbierto === di ? null : di)}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl active:scale-95 transition-all"
                  style={{
                    background: completado ? `${color}15` : esHoyDia ? '#0A0A0A' : '#F4F3F0',
                    border: esHoyDia && !completado ? `1.5px solid ${color}` : undefined
                  }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{
                      background: completado ? color : esHoyDia ? color : 'rgba(0,0,0,0.08)',
                      color: completado || esHoyDia ? 'white' : '#9B9B9B'
                    }}>
                    {completado ? '✓' : (di + 1)}
                  </div>
                  <p className="text-[8px] font-black uppercase"
                    style={{ color: completado ? color : esHoyDia ? 'white' : '#B0B0B0' }}>
                    {dia.dia?.slice(0, 3)}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 7 días colapsados */}
      {dias.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Plan semanal</p>
            {diaAbierto !== null && (
              <button onClick={() => setDiaAbierto(null)} className="text-[10px] font-bold text-[#9B9B9B]">Cerrar</button>
            )}
          </div>

          {dias.map((dia, di) => {
            const abierto = diaAbierto === di
            const comidas = dia.comidas || []
            const totalKcal = comidas.reduce((sum, c) => sum + (c.kcal || 0), 0)
            const registradoEste = registrosLocales.some(r => r.dia_nombre === dia.dia)
            const DIAS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
            const esHoyDia = dia.dia?.toLowerCase() === DIAS_ES[new Date().getDay()].toLowerCase()

            return (
              <div key={di} className="bg-white rounded-2xl overflow-hidden">
                {/* Header colapsable */}
                <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-black/2 transition-colors"
                  onClick={() => setDiaAbierto(abierto ? null : di)}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ background: registradoEste ? '#10b981' : esHoyDia ? color : '#0A0A0A' }}>
                    {registradoEste ? '✓' : di + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#0A0A0A]">{dia.dia}</p>
                    <p className="text-[10px] text-[#9B9B9B] font-medium mt-0.5">
                      {comidas.length} comidas · {totalKcal} kcal
                      {registradoEste && <span className="text-emerald-500 ml-1.5">· ✓ registrado</span>}
                      {esHoyDia && !registradoEste && <span style={{ color }} className="ml-1.5">· HOY</span>}
                    </p>
                  </div>
                  <span className="text-[#C0C0C0] text-sm transition-transform duration-200 flex-shrink-0"
                    style={{ transform: abierto ? 'rotate(180deg)' : 'none' }}>▾</span>
                </button>

                {/* Comidas del día */}
                {abierto && (
                  <>
                    <div className="divide-y border-t" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                      {comidas.map((comida, ci) => (
                        <div key={ci} className="px-4 py-3.5">
                          {/* Cabecera comida */}
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-black text-[#0A0A0A]">{comida.nombre}</p>
                              {comida.hora && <p className="text-[10px] text-[#9B9B9B] font-medium">{comida.hora}</p>}
                            </div>
                            {comida.kcal && (
                              <div className="text-right flex-shrink-0 ml-2">
                                <p className="text-base font-black" style={{ color }}>{comida.kcal}</p>
                                <p className="text-[9px] text-[#9B9B9B]">kcal</p>
                              </div>
                            )}
                          </div>
                          {/* Macros comida */}
                          {(comida.proteinas_g || comida.carbohidratos_g || comida.grasas_g) && (
                            <div className="flex gap-3 mb-2.5">
                              {[['P', comida.proteinas_g, '#6366f1'], ['C', comida.carbohidratos_g, '#f59e0b'], ['G', comida.grasas_g, '#10b981']].filter(([,v]) => v).map(([l,v,c]) => (
                                <span key={l} className="text-[10px] font-black" style={{ color: c }}>{l}: {v}g</span>
                              ))}
                            </div>
                          )}
                          {/* Alimentos */}
                          <div className="space-y-1.5">
                            {(comida.alimentos || []).map((al, ai) => (
                              <div key={ai} className="flex items-center justify-between">
                                <p className="text-sm text-[#0A0A0A] font-medium">{typeof al === 'string' ? al : al.nombre}</p>
                                {al.cantidad && <p className="text-xs font-black text-[#9B9B9B] flex-shrink-0 ml-3">{al.cantidad}</p>}
                              </div>
                            ))}
                          </div>
                          {/* Preparación */}
                          {comida.prep && (
                            <p className="text-[10px] text-[#9B9B9B] italic mt-2.5 leading-relaxed border-t pt-2 border-black/5">
                              {comida.prep}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Botón registrar */}
                    <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.05)', background: registradoEste ? '#f0fdf4' : `${color}04` }}>
                      {registradoEste
                        ? <p className="text-xs font-black text-emerald-600 text-center">✓ Este día está registrado</p>
                        : (
                          <button onClick={() => registrarDia(dia, dia.dia)} disabled={!!guardandoDia}
                            className="w-full py-3 rounded-xl text-sm font-black text-white active:scale-95 transition-all disabled:opacity-40"
                            style={{ background: color }}>
                            {guardandoDia === dia.dia ? '⏳ Registrando...' : `✓ He seguido el plan de ${dia.dia}`}
                          </button>
                        )
                      }
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lista de la compra */}
      {tieneMenu && (() => {
        // Agrupar todos los alimentos de todos los días
        const listaMap = {}
        dias.forEach(dia => {
          (dia.comidas || []).forEach(comida => {
            (comida.alimentos || []).forEach(al => {
              const nombre = typeof al === 'string' ? al : al.nombre
              const cantidad = typeof al === 'string' ? null : al.cantidad
              if (!nombre) return
              const key = nombre.toLowerCase().trim()
              if (!listaMap[key]) listaMap[key] = { nombre, cantidades: [] }
              if (cantidad) listaMap[key].cantidades.push(cantidad)
            })
          })
        })
        const lista = Object.values(listaMap).sort((a, b) => a.nombre.localeCompare(b.nombre))
        if (!lista.length) return null

        const textoCompartir = `🛒 Lista de la compra — ${nutricion.nombre}\n\n` +
          lista.map(item => `• ${item.nombre}${item.cantidades.length ? ` (${[...new Set(item.cantidades)].join(', ')})` : ''}`).join('\n')

        return (
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Lista de la compra</p>
                <p className="text-[10px] text-[#9B9B9B] mt-0.5">{lista.length} productos del plan</p>
              </div>
              <button onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'Lista de la compra', text: textoCompartir })
                } else {
                  navigator.clipboard?.writeText(textoCompartir)
                    .then(() => alert('Lista copiada al portapapeles'))
                    .catch(() => alert('Copia el texto manualmente'))
                }
              }} className="text-xs font-black px-3 py-1.5 rounded-xl text-white active:scale-95 transition-all"
                style={{ background: color }}>
                Compartir 🛒
              </button>
            </div>
            <div className="divide-y divide-black/4 max-h-64 overflow-y-auto">
              {lista.map((item, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <p className="text-sm text-[#0A0A0A] font-medium">{item.nombre}</p>
                  {item.cantidades.length > 0 && (
                    <p className="text-xs font-black flex-shrink-0 ml-3" style={{ color }}>
                      {[...new Set(item.cantidades)].join(' · ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Recomendaciones */}
      {contenido.recomendaciones?.length > 0 && (
        <div className="bg-white rounded-2xl p-4">
          <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B] mb-3">Recomendaciones</p>
          <div className="space-y-2">
            {contenido.recomendaciones.map((r, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[10px] font-black mt-0.5 flex-shrink-0" style={{ color }}>—</span>
                <p className="text-xs text-[#444] leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ─── Tab Progreso ─────────────────────────────────────────────────────────────
// ─── TAB PROGRESO ─────────────────────────────────────────────────────────────
function TabProgreso({ checkins, marcas, medidas, fotos, ejerciciosHist, color, subTab, setSubTab, cliente, cargarTodo }) {
  const SUBTABS = [
    { id: 'peso',    label: 'Peso' },
    { id: 'fuerza',  label: 'Fuerza' },
    { id: 'medidas', label: 'Medidas' },
    { id: 'fotos',   label: 'Fotos' },
  ]
  return (
    <div className="space-y-4">
      {/* Selector subtabs — estilo Nike */}
      <div className="flex gap-0 bg-[#0A0A0A] rounded-2xl p-1">
        {SUBTABS.map(s => (
          <button key={s.id} onClick={() => setSubTab(s.id)}
            className="flex-1 py-2.5 text-[11px] font-black rounded-xl tracking-wide uppercase transition-all"
            style={subTab === s.id
              ? { background: color, color: 'white' }
              : { color: 'rgba(255,255,255,0.3)' }}>
            {s.label}
          </button>
        ))}
      </div>
      {subTab === 'peso'    && <SubPeso checkins={checkins} color={color} />}
      {subTab === 'fuerza'  && <SubFuerza ejerciciosHist={ejerciciosHist} color={color} />}
      {subTab === 'medidas' && <SubMedidas medidas={medidas} color={color} cliente={cliente} cargarTodo={cargarTodo} />}
      {subTab === 'fotos'   && <SubFotos fotos={fotos} color={color} cliente={cliente} cargarTodo={cargarTodo} />}
    </div>
  )
}

// ─── SubPeso ─────────────────────────────────────────────────────────────────
function SubPeso({ checkins, color }) {
  const pesos = (checkins || []).filter(c => c.peso).slice().reverse()
  const pesoActual = pesos[pesos.length - 1]?.peso
  const pesoInicial = pesos[0]?.peso
  const diff = pesoActual && pesoInicial ? +(pesoActual - pesoInicial).toFixed(1) : null
  const energiaMedia = checkins?.filter(c => c.energia).length
    ? (checkins.filter(c => c.energia).reduce((s, c) => s + c.energia, 0) / checkins.filter(c => c.energia).length).toFixed(1)
    : null

  if (!checkins?.length) return (
    <div className="rounded-2xl p-10 text-center" style={{ background: '#0A0A0A' }}>
      <p className="text-4xl mb-4">⚖️</p>
      <p className="text-base font-black text-white">Sin check-ins aún</p>
      <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Haz tu primer check-in desde Inicio</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* KPIs hero negro */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0A0A0A' }}>
        <div className="grid grid-cols-3">
          {[
            { label: 'Ahora', val: pesoActual ? `${pesoActual}` : '—', unit: 'kg', c: 'white' },
            { label: 'Cambio', val: diff !== null ? `${diff > 0 ? '+' : ''}${diff}` : '—', unit: diff !== null ? 'kg' : '', c: diff === null ? 'white' : diff < 0 ? '#10b981' : diff > 0 ? '#818cf8' : 'white' },
            { label: 'Check-ins', val: checkins.length, unit: '', c: color },
          ].map((k, i) => (
            <div key={k.label} className="px-3 py-4 text-center"
              style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
              <p className="text-[9px] font-black tracking-[0.12em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{k.label}</p>
              <p className="text-2xl font-black leading-none" style={{ color: k.c }}>
                {k.val}<span className="text-xs font-normal ml-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{k.unit}</span>
              </p>
            </div>
          ))}
        </div>
        {energiaMedia && (
          <div className="px-5 py-2.5 border-t flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full" style={{ width: `${(parseFloat(energiaMedia)/5*100).toFixed(0)}%`, background: color }} />
            </div>
            <p className="text-[10px] font-black flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>⚡ {energiaMedia}/5</p>
          </div>
        )}
      </div>

      {/* Gráfica SVG — línea con área y puntos */}
      {pesos.length > 1 && (() => {
        const datos = pesos.slice(-10)
        const min = Math.min(...datos.map(x => x.peso))
        const max = Math.max(...datos.map(x => x.peso))
        const range = max - min || 0.1
        const W = 320, H = 120, pad = 16
        const iW = W - pad*2, iH = H - pad*2 - 20
        const pts = datos.map((c, i) => ({
          x: pad + (i / (datos.length-1)) * iW,
          y: pad + (1 - (c.peso - min) / range) * iH,
          peso: c.peso,
          fecha: c.fecha,
        }))
        const linePath = pts.map((p, i) => `${i===0?'M':'L'} ${p.x},${p.y}`).join(' ')
        const areaPath = `M ${pts[0].x},${H-20} ` + pts.map(p => `L ${p.x},${p.y}`).join(' ') + ` L ${pts[pts.length-1].x},${H-20} Z`
        return (
          <div className="bg-white rounded-2xl p-4">
            <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B] mb-3">Evolución del peso</p>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
                  <stop offset="100%" stopColor={color} stopOpacity="0"/>
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0,0.5,1].map(t => (
                <line key={t} x1={pad} y1={pad + t*iH} x2={W-pad} y2={pad + t*iH}
                  stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeDasharray="4 4" />
              ))}
              {/* Área */}
              <path d={areaPath} fill="url(#pg)" />
              {/* Línea */}
              <path d={linePath} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {/* Puntos */}
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={i === pts.length-1 ? 6 : 4}
                    fill={i === pts.length-1 ? color : 'white'}
                    stroke={color} strokeWidth="2.5" />
                  {/* Label peso */}
                  <text x={p.x} y={H-4} textAnchor="middle"
                    fontSize="9" fontWeight="700" fill={i === pts.length-1 ? color : '#C0C0C0'}>
                    {p.peso}
                  </text>
                </g>
              ))}
              {/* Label hover del último punto */}
              {pts.length > 0 && (
                <g>
                  <rect x={pts[pts.length-1].x - 24} y={pts[pts.length-1].y - 22}
                    width="48" height="16" rx="4" fill={color} />
                  <text x={pts[pts.length-1].x} y={pts[pts.length-1].y - 10}
                    textAnchor="middle" fontSize="9" fontWeight="900" fill="white">
                    {pts[pts.length-1].peso} kg
                  </text>
                </g>
              )}
            </svg>
          </div>
        )
      })()}

      {/* Historial — limpio, tipografía fuerte */}
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
          <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Historial</p>
          <p className="text-[10px] font-black text-[#9B9B9B]">{checkins.length} entradas</p>
        </div>
        <div className="divide-y divide-black/4">
          {checkins.slice(0, 15).map((c, i) => (
            <div key={i} className="px-5 py-3.5 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-[#0A0A0A]">
                  {new Date(c.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})}
                </p>
                <div className="flex gap-2.5 mt-1.5 flex-wrap">
                  {c.energia  != null && <span className="text-[10px] font-bold text-[#9B9B9B]">⚡ {c.energia}/5</span>}
                  {c.fatiga   != null && <span className="text-[10px] font-bold text-[#9B9B9B]">🏋️ {c.fatiga}/10</span>}
                  {c.sueno    != null && <span className="text-[10px] font-bold text-[#9B9B9B]">😴 {c.sueno}/5</span>}
                  {c.estres   != null && <span className="text-[10px] font-bold text-[#9B9B9B]">🧠 {c.estres}/10</span>}
                </div>
                {c.comentario && (
                  <p className="text-[10px] text-[#9B9B9B] mt-1.5 italic leading-relaxed">"{c.comentario}"</p>
                )}
              </div>
              {c.peso && (
                <p className="text-base font-black text-[#0A0A0A] flex-shrink-0">{c.peso}<span className="text-xs font-normal text-[#9B9B9B] ml-0.5">kg</span></p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


// ─── SubMedidas ───────────────────────────────────────────────────────────────
function SubMedidas({ medidas, color, cliente, cargarTodo }) {
  const [mostrando, setMostrando] = useState('lista')
  const [form, setForm] = useState({ cintura:'', pecho:'', cadera:'', bicep:'', muslo:'', gemelo:'', cuello:'' })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)

  const CAMPOS = [
    { key:'cintura', label:'Cintura', icon:'📏' },
    { key:'pecho',   label:'Pecho',   icon:'💪' },
    { key:'cadera',  label:'Cadera',  icon:'⬡' },
    { key:'bicep',   label:'Bícep',   icon:'💪' },
    { key:'muslo',   label:'Muslo',   icon:'🦵' },
    { key:'gemelo',  label:'Gemelo',  icon:'🦵' },
    { key:'cuello',  label:'Cuello',  icon:'📐' },
  ]

  async function guardar() {
    const rellenos = CAMPOS.filter(c => form[c.key] && !isNaN(+form[c.key]))
    if (!rellenos.length) return
    setGuardando(true)
    const payload = { cliente_id: cliente.id, entrenador_id: cliente.entrenador_id, fecha: hoyStr() }
    rellenos.forEach(c => { payload[c.key] = parseFloat(form[c.key]) })
    await supabase.from('medidas_cliente').insert(payload)
    setOk(true)
    setTimeout(() => {
      setOk(false); setMostrando('lista')
      setForm({ cintura:'', pecho:'', cadera:'', bicep:'', muslo:'', gemelo:'', cuello:'' })
      cargarTodo()
    }, 1200)
    setGuardando(false)
  }

  if (mostrando === 'form') return (
    <div className="space-y-3">
      <button onClick={() => setMostrando('lista')} className="text-xs font-black flex items-center gap-1.5" style={{ color }}>← Volver</button>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0A0A0A' }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-[9px] font-black tracking-[0.15em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Nueva medición</p>
          <p className="text-xl font-black text-white">{new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</p>
        </div>
        <div className="grid grid-cols-2 gap-px" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {CAMPOS.map(campo => (
            <div key={campo.key} className="px-4 py-3.5" style={{ background: '#0A0A0A' }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{campo.label}</p>
              <div className="flex items-center gap-2">
                <input type="number" step="0.5" inputMode="decimal" placeholder="—" value={form[campo.key]}
                  onChange={e => setForm(f => ({...f,[campo.key]:e.target.value}))}
                  className="flex-1 bg-transparent text-xl font-black text-white focus:outline-none w-0"
                  style={{ color: form[campo.key] ? color : 'rgba(255,255,255,0.4)' }} />
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>cm</span>
              </div>
              {form[campo.key] && (
                <div className="h-0.5 rounded-full mt-2" style={{ background: color }} />
              )}
            </div>
          ))}
        </div>
      </div>
      <button onClick={guardar} disabled={guardando || !CAMPOS.some(c => form[c.key])}
        className="w-full py-4 rounded-2xl text-white font-black text-sm disabled:opacity-40 active:scale-95 transition-all"
        style={{ background: ok ? '#10b981' : color }}>
        {guardando ? '⏳ Guardando...' : ok ? '✓ Medidas guardadas' : 'Guardar medidas'}
      </button>
    </div>
  )

  const ultimaMedida = medidas?.[0]
  const hayMedidas = medidas?.length > 0

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">
          {hayMedidas ? `${medidas.length} medición${medidas.length>1?'es':''}` : 'Sin medidas'}
        </p>
        <button onClick={() => setMostrando('form')}
          className="text-xs font-black px-4 py-2 rounded-xl text-white active:scale-95"
          style={{ background: color }}>+ Añadir</button>
      </div>

      {!hayMedidas ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#0A0A0A' }}>
          <p className="text-4xl mb-4">📏</p>
          <p className="text-base font-black text-white">Sin medidas aún</p>
          <p className="text-xs mt-2 mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>Registra tu primera medición para ver tu evolución</p>
          <button onClick={() => setMostrando('form')}
            className="px-6 py-3 rounded-xl text-sm font-black text-white active:scale-95"
            style={{ background: color }}>Añadir medidas →</button>
        </div>
      ) : (
        <>
          {/* Última medición — hero negro */}
          {ultimaMedida && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#0A0A0A' }}>
              <div className="px-5 pt-4 pb-2">
                <p className="text-[9px] font-black tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Última medición</p>
                <p className="text-xs font-bold mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {new Date(ultimaMedida.fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}
                </p>
              </div>
              <div className="grid grid-cols-4 p-4 gap-3">
                {CAMPOS.filter(c => ultimaMedida[c.key]).map((campo, i) => {
                  const anterior = medidas[1]?.[campo.key]
                  const diff = anterior && ultimaMedida[campo.key] ? +(ultimaMedida[campo.key]-anterior).toFixed(1) : null
                  return (
                    <div key={campo.key} className="text-center">
                      <p className="text-lg font-black leading-none text-white">{ultimaMedida[campo.key]}</p>
                      <p className="text-[8px] font-bold mt-1 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{campo.label}</p>
                      {diff !== null && diff !== 0 && (
                        <p className="text-[9px] font-black mt-0.5" style={{ color: diff < 0 ? '#10b981' : '#ef4444' }}>
                          {diff > 0 ? '+' : ''}{diff}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Historial */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-black/5">
              <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Historial</p>
            </div>
            <div className="divide-y divide-black/4">
              {medidas.slice(0,8).map((m,i) => (
                <div key={i} className="px-5 py-3.5">
                  <p className="text-[10px] font-black text-[#9B9B9B] mb-2">
                    {new Date(m.fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {CAMPOS.filter(c => m[c.key]).map(campo => (
                      <span key={campo.key} className="text-xs font-bold text-[#0A0A0A]">
                        {campo.label}: <span style={{ color }}>{m[campo.key]}<span className="text-[#9B9B9B] font-normal">cm</span></span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


// ─── SubFotos ─────────────────────────────────────────────────────────────────
function SubFotos({ fotos, color, cliente, cargarTodo }) {
  const [subiendo, setSubiendo] = useState(false)
  const [tipo, setTipo] = useState('frente')
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = React.useRef(null)

  const TIPOS = [
    { id:'frente',  label:'Frente' },
    { id:'lateral', label:'Lateral' },
    { id:'espalda', label:'Espalda' },
  ]

  async function subirFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true); setErrorMsg('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${cliente.id}/${hoyStr()}-${tipo}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('fotos-progreso').upload(path, file, { upsert: false, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('fotos-progreso').getPublicUrl(path)
      await supabase.from('fotos_progreso').insert({
        cliente_id: cliente.id, entrenador_id: cliente.entrenador_id,
        url: publicUrl, fecha: hoyStr(), tipo, visible_cliente: true,
      })
      await cargarTodo()
    } catch(err) {
      console.error(err)
      setErrorMsg('Error al subir. Intenta de nuevo.')
    }
    setSubiendo(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const grupos = (fotos || []).reduce((acc, f) => {
    const key = f.fecha || 'sin-fecha'
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})
  const fechas = Object.keys(grupos).sort().reverse()

  return (
    <div className="space-y-3">
      {/* Uploader — negro */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0A0A0A' }}>
        <div className="px-5 pt-4 pb-3">
          <p className="text-[9px] font-black tracking-[0.15em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Añadir foto</p>
          <div className="flex gap-1.5 mb-3">
            {TIPOS.map(t => (
              <button key={t.id} onClick={() => setTipo(t.id)}
                className="flex-1 py-2 rounded-xl text-xs font-black transition-all"
                style={tipo===t.id ? { background:color, color:'white' } : { background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.35)' }}>
                {t.label}
              </button>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={subirFoto} className="hidden" id="foto-up" />
          <label htmlFor="foto-up"
            className="w-full py-3.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
            style={{ background: subiendo ? 'rgba(255,255,255,0.1)' : color }}>
            {subiendo
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Subiendo...</>
              : <>📸 Foto de {TIPOS.find(t=>t.id===tipo)?.label.toLowerCase()}</>
            }
          </label>
          {errorMsg && <p className="text-xs text-red-400 text-center mt-2">{errorMsg}</p>}
        </div>
      </div>

      {fechas.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">📸</p>
          <p className="text-base font-black text-[#0A0A0A]">Sin fotos aún</p>
          <p className="text-xs text-[#9B9B9B] mt-1">Sube tu primera foto de progreso</p>
        </div>
      ) : (
        <>
          {/* Comparativa inicio vs ahora */}
          {fechas.length >= 2 && (
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5">
                <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Inicio vs Ahora</p>
              </div>
              <div className="grid grid-cols-2 gap-0.5">
                {[grupos[fechas[fechas.length-1]]?.[0], grupos[fechas[0]]?.[0]].filter(Boolean).map((f,i) => (
                  <div key={i} className="relative aspect-[3/4]">
                    <img src={f.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2"
                      style={{ background: i===0?'rgba(0,0,0,0.6)':`${color}dd` }}>
                      <p className="text-white text-[9px] font-black uppercase tracking-widest">
                        {i===0?'INICIO':'AHORA'} · {new Date(f.fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Galería por fecha */}
          {fechas.map(fecha => (
            <div key={fecha} className="bg-white rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5">
                <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">
                  {new Date(fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-0.5">
                {grupos[fecha].map((f,i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={f.url} alt={f.tipo||''} className="w-full h-full object-cover" />
                    {f.tipo && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-1">
                        <p className="text-white text-[8px] font-black uppercase">{f.tipo}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
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
