import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── Utilidades ───────────────────────────────────────────────────────────────
const q = (promise) => promise.then(r => r.data || (Array.isArray(r.data) ? [] : null)).catch(() => null)
const qa = (promise) => promise.then(r => r.data || []).catch(() => [])

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PortalCliente() {
  // Sesión
  const [clienteSession, setClienteSession] = useState(undefined)
  const [cliente, setCliente] = useState(null)
  const [clienteId, setClienteId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // UI
  const [tab, setTab] = useState('inicio')
  const [config, setConfig] = useState(null)

  // Datos por tab — se cargan al abrir cada tab
  const [datosInicio, setDatosInicio] = useState(null)
  const [datosRutina, setDatosRutina] = useState(null)
  const [datosNutricion, setDatosNutricion] = useState(null)
  const [datosProgreso, setDatosProgreso] = useState(null)
  const [datosMensajes, setDatosMensajes] = useState(null)
  const [datosPagos, setDatosPagos] = useState(null)

  // Control de qué tabs ya se han cargado
  const cargado = useRef(new Set())

  const color = config?.color_acento || '#FF5C00'

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) =>
      setClienteSession(session?.user || null)
    )
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
      setClienteSession(s?.user || null)
    )
    return () => subscription.unsubscribe()
  }, [])

  // ── Carga inicial — solo cliente y config ───────────────────────────────────
  useEffect(() => {
    if (clienteSession === undefined) return
    if (!clienteSession) { setLoading(false); return }

    async function init() {
      setLoading(true)
      const { data: cl, error } = await supabase.from('clientes')
        .select('*').eq('auth_user_id', clienteSession.id).maybeSingle()

      if (error || !cl) { setNotFound(true); setLoading(false); return }

      setCliente(cl)
      setClienteId(cl.id)

      const cfg = await q(supabase.from('configuracion')
        .select('nombre_entrenador,foto_url,nombre_negocio,color_acento')
        .eq('entrenador_id', cl.entrenador_id).single())
      if (cfg) setConfig(cfg)

      setLoading(false)

      // Registrar acceso — completamente aislado
      setTimeout(() => {
        supabase.from('actividad_cliente').insert({
          cliente_id: cl.id, entrenador_id: cl.entrenador_id,
          tipo: 'portal_acceso', descripcion: 'Entró al portal'
        }).then(() => {}).catch(() => {})
      }, 3000)
    }

    init().catch(() => setLoading(false))
  }, [clienteSession])

  // ── Carga por tab ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!clienteId || !cliente) return
    if (cargado.current.has(tab)) return
    cargado.current.add(tab)

    const hoy = new Date().toISOString().split('T')[0]

    if (tab === 'inicio') cargarInicio(clienteId, cliente, hoy)
    if (tab === 'rutina') cargarRutina(clienteId, cliente)
    if (tab === 'nutricion') cargarNutricion(clienteId, cliente)
    if (tab === 'progreso') cargarProgreso(clienteId)
    if (tab === 'mensajes') cargarMensajes(clienteId)
    if (tab === 'pagos') cargarPagos(clienteId)
  }, [tab, clienteId, cliente])

  async function cargarInicio(cid, cl, hoy) {
    const [sesiones, checkins, rutina, planNutricion, pendientes] = await Promise.all([
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid)
        .gte('fecha', hoy).eq('cancelada', false).order('fecha').order('hora').limit(5)),
      qa(supabase.from('checkins').select('*').eq('cliente_id', cid)
        .order('fecha', { ascending: false }).limit(12)),
      q(supabase.from('rutinas').select('id,nombre,contenido,borrador,semanas')
        .eq('cliente_id', cid).eq('estado', 'publicada')
        .order('created_at', { ascending: false }).limit(1)),
      q(supabase.from('planes_nutricion').select('id,nombre,calorias_dia,proteinas_dia,carbos_dia,grasas_dia,contenido,borrador')
        .eq('cliente_id', cid).in('estado', ['publicado','publicada'])
        .order('created_at', { ascending: false }).limit(1)),
      cl.tipo === 'presencial'
        ? qa(supabase.from('sesiones').select('*').eq('cliente_id', cid)
            .eq('tipo', 'presencial').gte('fecha', new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0])
            .lte('fecha', hoy).eq('cancelada', false).is('rpe', null))
        : Promise.resolve([]),
    ])
    setDatosInicio({ sesiones, checkins, rutina, planNutricion, pendientes })
  }

  async function cargarRutina(cid, cl) {
    const rutina = await q(supabase.from('rutinas').select('id,nombre,semanas,contenido,borrador')
      .eq('cliente_id', cid).eq('estado', 'publicada')
      .order('created_at', { ascending: false }).limit(1))
    setDatosRutina({ rutina })
  }

  async function cargarNutricion(cid) {
    const plan = await q(supabase.from('planes_nutricion').select('*')
      .eq('cliente_id', cid).in('estado', ['publicado','publicada'])
      .order('created_at', { ascending: false }).limit(1))
    const cuestArr = await qa(supabase.from('cuestionarios_nutricion')
      .select('id').eq('cliente_id', cid).limit(1))
    setDatosNutricion({ plan, tieneCuest: cuestArr.length > 0 })
  }

  async function cargarProgreso(cid) {
    const [checkins, medidas, marcas, fotos] = await Promise.all([
      qa(supabase.from('checkins').select('*').eq('cliente_id', cid)
        .order('fecha', { ascending: false }).limit(24)),
      qa(supabase.from('medidas_cliente').select('*').eq('cliente_id', cid)
        .order('fecha', { ascending: false })),
      qa(supabase.from('marcas_cliente').select('*').eq('cliente_id', cid)
        .order('fecha', { ascending: false })),
      qa(supabase.from('fotos_progreso').select('*').eq('cliente_id', cid)
        .eq('visible_cliente', true).order('fecha', { ascending: false })),
    ])
    setDatosProgreso({ checkins, medidas, marcas, fotos })
  }

  async function cargarMensajes(cid) {
    const mensajes = await qa(supabase.from('mensajes_cliente').select('*')
      .eq('cliente_id', cid).order('created_at', { ascending: true }))
    setDatosMensajes({ mensajes })
    // Marcar como leídos
    supabase.from('mensajes_cliente').update({ leido: true })
      .eq('cliente_id', cid).eq('leido', false).catch(() => {})
  }

  async function cargarPagos(cid) {
    const [pagos, planes] = await Promise.all([
      qa(supabase.from('pagos').select('*').eq('cliente_id', cid).order('fecha_pago', { ascending: false })),
      qa(supabase.from('planes_cobro').select('*').eq('cliente_id', cid).eq('activo', true).limit(1)),
    ])
    setDatosPagos({ pagos, planActivo: planes[0] || null })
  }

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (clienteSession === undefined || loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F3' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: color, borderTopColor: 'transparent' }} />
    </div>
  )

  if (!clienteSession) return <LoginPortal />

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F7F6F3' }}>
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-sm border border-black/5">
        <p className="text-5xl mb-4">🔗</p>
        <p className="text-[#0A0A0A] font-bold text-xl mb-2">Cuenta no reconocida</p>
        <p className="text-[#6B6B6B] text-sm mb-6 leading-relaxed">
          El email con el que has entrado no está vinculado a ningún cliente.
          Si el problema persiste, contacta con tu entrenador.
        </p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
          className="w-full text-white font-bold px-4 py-3.5 rounded-2xl text-sm"
          style={{ background: color }}>
          Probar con otro email →
        </button>
      </div>
    </div>
  )

  if (!cliente) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F3' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: color, borderTopColor: 'transparent' }} />
    </div>
  )

  const esOnline = cliente.tipo === 'online'
  const plan = cliente.plan_online
  const puedeVerRutina = !esOnline || !plan || plan === 'entrenamiento' || plan === 'completo'
  const puedeVerNutricion = !esOnline || !plan || plan === 'nutricion' || plan === 'completo'
  const nombre = cliente.nombre?.split(' ')[0] || ''
  const iniciales = cliente.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
  const mensajesNoLeidos = datosMensajes?.mensajes?.filter(m => !m.leido && m.tipo === 'entrenador').length || 0

  const TABS = [
    { id: 'inicio', label: 'Inicio', icon: '⊞' },
    ...(puedeVerRutina ? [{ id: 'rutina', label: 'Rutina', icon: '💪' }] : []),
    ...(puedeVerNutricion ? [{ id: 'nutricion', label: 'Nutrición', icon: '🥗' }] : []),
    { id: 'progreso', label: 'Progreso', icon: '📈' },
    { id: 'mensajes', label: 'Mensajes', icon: '✉️', badge: mensajesNoLeidos },
    { id: 'pagos', label: 'Pagos', icon: '💳' },
    { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: '#F7F6F3', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-black/5 fixed h-full z-10">
        <div className="px-5 py-5 border-b border-black/5">
          <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-3">Tu entrenador</p>
          <div className="flex items-center gap-3">
            {config?.foto_url
              ? <img src={config.foto_url} className="w-9 h-9 rounded-xl object-cover" />
              : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: color }}>
                  {(config?.nombre_entrenador || 'E').slice(0, 2).toUpperCase()}
                </div>
            }
            <div>
              <p className="text-xs font-bold text-[#0A0A0A] truncate">{config?.nombre_entrenador || 'Tu entrenador'}</p>
              <p className="text-[10px] text-[#9B9B9B] truncate">{config?.nombre_negocio || ''}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                tab === t.id ? 'text-white' : 'text-[#6B6B6B] hover:bg-[#F7F6F3] hover:text-[#0A0A0A]'
              }`}
              style={tab === t.id ? { background: color } : {}}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.badge > 0 && (
                <span className="ml-auto w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: tab === t.id ? 'rgba(255,255,255,0.3)' : color, color: 'white' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-black/5">
          <button onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6B6B6B] hover:bg-[#F7F6F3] transition-all">
            <span>↩</span><span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <main className="flex-1 md:ml-56 flex flex-col min-h-screen">

        {/* Header móvil */}
        <div className="md:hidden sticky top-0 z-20 bg-white border-b border-black/5 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: color }}>
            {iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A0A0A] truncate">{nombre}</p>
            <p className="text-xs text-[#9B9B9B] truncate">{config?.nombre_negocio || config?.nombre_entrenador || ''}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()}
            className="text-xs text-[#9B9B9B] px-2 py-1 rounded-lg border border-black/10">
            Salir
          </button>
        </div>

        {/* Contenido del tab */}
        <div className="flex-1 px-4 md:px-8 py-4 md:py-6 max-w-2xl w-full mx-auto pb-24 md:pb-8">
          {tab === 'inicio' && <TabInicio datos={datosInicio} cliente={cliente} color={color} setTab={setTab} />}
          {tab === 'rutina' && <TabRutina datos={datosRutina} cliente={cliente} color={color} clienteId={clienteId} />}
          {tab === 'nutricion' && <TabNutricion datos={datosNutricion} cliente={cliente} color={color} />}
          {tab === 'progreso' && <TabProgreso datos={datosProgreso} color={color} />}
          {tab === 'mensajes' && <TabMensajes datos={datosMensajes} setDatos={setDatosMensajes} cliente={cliente} clienteId={clienteId} color={color} />}
          {tab === 'pagos' && <TabPagos datos={datosPagos} cliente={cliente} color={color} />}
          {tab === 'ajustes' && <TabAjustes cliente={cliente} setCliente={setCliente} color={color} clienteId={clienteId} />}
        </div>

        {/* Bottom bar móvil */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/8 z-20"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex">
            {TABS.filter(t => ['inicio','rutina','nutricion','progreso','mensajes'].includes(t.id)).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-all active:scale-95"
                style={{ minHeight: 60 }}>
                <span className={`text-xl leading-none transition-all ${tab === t.id ? 'scale-110' : ''}`}>
                  {t.icon}
                </span>
                <span className={`text-[10px] font-semibold ${tab === t.id ? '' : 'text-[#9B9B9B]'}`}
                  style={tab === t.id ? { color } : {}}>
                  {t.label}
                </span>
                {tab === t.id && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: color }} />
                )}
                {t.badge > 0 && (
                  <span className="absolute top-2 right-1/4 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                    style={{ background: color }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>
      </main>
    </div>
  )
}

// ─── Pantalla de login ────────────────────────────────────────────────────────
function LoginPortal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recuperar, setRecuperar] = useState(false)
  const [recuperarOk, setRecuperarOk] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    setLoading(false)
  }

  async function recuperarPass(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/portal`
    })
    if (error) setError('No se pudo enviar el email')
    else setRecuperarOk(true)
    setLoading(false)
  }

  if (recuperarOk) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <p className="text-white font-bold text-xl mb-2">Email enviado</p>
        <p className="text-white/50 text-sm mb-6">Revisa tu bandeja de entrada y pulsa el enlace para entrar.</p>
        <button onClick={() => { setRecuperarOk(false); setRecuperar(false) }}
          className="text-[#FF5C00] text-sm font-semibold">← Volver al login</button>
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
          <form onSubmit={recuperar ? recuperarPass : entrar} className="space-y-3">
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" required autoFocus
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
            </div>
            {!recuperar && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-white/60 text-xs font-medium">Contraseña</label>
                  <button type="button" onClick={() => { setRecuperar(true); setError('') }}
                    className="text-[#FF5C00] text-xs font-medium">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF5C00]" />
              </div>
            )}
            {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
            <button type="submit" disabled={loading || !email || (!recuperar && !password)}
              className="w-full bg-[#FF5C00] text-white font-bold py-3.5 rounded-xl disabled:opacity-40 active:scale-95 transition-all">
              {loading ? '...' : recuperar ? 'Enviar enlace →' : 'Entrar →'}
            </button>
            {recuperar && (
              <button type="button" onClick={() => { setRecuperar(false); setError('') }}
                className="w-full text-white/50 text-sm py-2 text-center">
                ← Volver
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── TAB INICIO ───────────────────────────────────────────────────────────────
function TabInicio({ datos, cliente, color, setTab }) {
  if (!datos) return <Spinner color={color} />

  const { sesiones, checkins, rutina, planNutricion, pendientes } = datos
  const hoy = new Date().toISOString().split('T')[0]
  const nombre = cliente?.nombre?.split(' ')[0] || ''
  const hora = new Date().getHours()
  const saludo = hora < 13 ? '☀️ Buenos días' : hora < 20 ? '👋 Buenas tardes' : '🌙 Buenas noches'

  const sesionHoy = sesiones?.find(s => s.fecha === hoy)
  const proximaSesion = sesiones?.find(s => s.fecha > hoy)
  const ultimoCheckin = checkins?.[0]
  const diasSinCI = ultimoCheckin?.fecha
    ? Math.floor((Date.now() - new Date(ultimoCheckin.fecha).getTime()) / 864e5)
    : 999
  const ciUrgente = diasSinCI >= 7

  const pesos = checkins?.filter(c => c.peso).slice().reverse() || []
  const pesoActual = pesos[pesos.length - 1]?.peso
  const pesoInicial = pesos[0]?.peso
  const diffPeso = pesoActual && pesoInicial ? +(pesoActual - pesoInicial).toFixed(1) : null

  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const ahora = new Date()

  return (
    <div className="space-y-3 pb-2">
      {/* Saludo */}
      <div className="pt-1 pb-2">
        <p className="text-xs text-[#9B9B9B]">{saludo}</p>
        <p className="text-2xl font-bold text-[#0A0A0A] mt-0.5">{nombre} 👊</p>
        <p className="text-xs text-[#9B9B9B] mt-1">
          {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][ahora.getDay()]} {ahora.getDate()} {MESES[ahora.getMonth()]}
        </p>
      </div>

      {/* Sesión pendiente de valorar */}
      {pendientes?.length > 0 && (
        <button onClick={() => setTab('progreso')}
          className="w-full flex items-center gap-3 rounded-2xl p-4 border-2 text-left active:scale-95 transition-all"
          style={{ borderColor: color, background: `${color}08` }}>
          <span className="text-2xl flex-shrink-0">⭐</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A0A0A]">¿Cómo fue tu sesión del {
              new Date(pendientes[0].fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long' })
            }?</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">Tarda 10 segundos · Ayuda a tu entrenador</p>
          </div>
          <span className="text-sm font-bold flex-shrink-0" style={{ color }}>Valorar →</span>
        </button>
      )}

      {/* Sesión de hoy */}
      {sesionHoy && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
          <div className="px-4 pt-4 pb-3">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Hoy toca</p>
            <p className="text-white font-bold text-lg mt-0.5">
              {sesionHoy.tipo === 'online' ? 'Entrenamiento online'
                : sesionHoy.tipo === 'grupo' ? 'Entrenamiento en grupo'
                : 'Entrenamiento personal'}
            </p>
            {sesionHoy.hora && (
              <p className="text-white/70 text-sm mt-0.5">
                🕐 {sesionHoy.hora.slice(0, 5)}{sesionHoy.duracion_minutos ? ` · ${sesionHoy.duracion_minutos}min` : ''}
              </p>
            )}
          </div>
          <div className="px-4 py-3 bg-black/10 flex items-center justify-between">
            <button onClick={() => setTab('rutina')} className="text-white/80 text-xs font-medium">
              Ver rutina →
            </button>
          </div>
        </div>
      )}

      {/* Check-in urgente */}
      {ciUrgente && (
        <button onClick={() => setTab('progreso')}
          className="w-full flex items-center gap-3 bg-red-500 rounded-2xl p-4 active:scale-95 transition-all text-left">
          <span className="text-2xl flex-shrink-0">⏰</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">
              {diasSinCI > 900 ? 'Haz tu primer check-in' : `${diasSinCI} días sin check-in`}
            </p>
            <p className="text-xs text-white/70 mt-0.5">Tu entrenador necesita saber cómo estás</p>
          </div>
          <span className="text-white/70">→</span>
        </button>
      )}

      {/* Progreso */}
      {pesos.length >= 2 && (
        <button onClick={() => setTab('progreso')}
          className="w-full bg-white rounded-2xl border border-black/5 p-4 text-left active:scale-95 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Tu progreso</p>
              {diffPeso !== null && (
                <p className="text-2xl font-bold mt-0.5"
                  style={{ color: diffPeso < 0 ? '#10b981' : diffPeso > 0 ? '#6366f1' : '#9B9B9B' }}>
                  {diffPeso > 0 ? '+' : ''}{diffPeso} kg
                </p>
              )}
              <p className="text-xs text-[#9B9B9B] mt-0.5">
                {checkins?.length || 0} check-ins · último hace {diasSinCI === 0 ? 'hoy' : `${diasSinCI}d`}
              </p>
            </div>
            {!ciUrgente && (
              <span className="text-xs bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-full">✓ Al día</span>
            )}
          </div>
          <div className="flex items-end gap-1 h-16 mt-1">
            {pesos.slice(-8).map((c, i, arr) => {
              const min = Math.min(...arr.map(x => x.peso))
              const max = Math.max(...arr.map(x => x.peso))
              const h = max === min ? 60 : Math.max(20, ((c.peso - min) / (max - min)) * 80 + 20)
              const isLast = i === arr.length - 1
              return (
                <div key={i} className="flex-1 rounded-md transition-all"
                  style={{ height: `${h}%`, background: isLast ? color : `${color}35`, minHeight: 8 }} />
              )
            })}
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-xs text-[#9B9B9B]">{pesos[0].peso}kg</p>
            <p className="text-xs font-bold" style={{ color }}>{pesos[pesos.length - 1].peso}kg</p>
          </div>
        </button>
      )}

      {/* Próxima sesión */}
      {!sesionHoy && proximaSesion && (
        <button className="w-full flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-4 text-left active:scale-95 transition-all">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}15` }}>
            <span className="text-lg">📅</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#9B9B9B]">Próxima sesión</p>
            <p className="text-sm font-bold text-[#0A0A0A]">
              {new Date(proximaSesion.fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
              {proximaSesion.hora ? ' · ' + proximaSesion.hora.slice(0, 5) : ''}
            </p>
          </div>
        </button>
      )}

      {/* Accesos rápidos */}
      {(rutina || planNutricion) && (
        <div className="grid grid-cols-2 gap-2">
          {rutina && (
            <button onClick={() => setTab('rutina')}
              className="bg-white border border-black/5 rounded-2xl p-4 text-left active:scale-95 transition-all">
              <span className="text-xl mb-2 block">💪</span>
              <p className="text-xs font-bold text-[#0A0A0A] leading-tight">{rutina.nombre || 'Tu rutina'}</p>
              <p className="text-xs text-[#9B9B9B] mt-1">
                {(rutina.borrador?.dias || rutina.contenido?.dias || []).length} días
              </p>
            </button>
          )}
          {planNutricion && (
            <button onClick={() => setTab('nutricion')}
              className="bg-white border border-black/5 rounded-2xl p-4 text-left active:scale-95 transition-all">
              <span className="text-xl mb-2 block">🥗</span>
              <p className="text-xs font-bold text-[#0A0A0A] leading-tight">{planNutricion.nombre || 'Tu nutrición'}</p>
              <p className="text-xs text-[#9B9B9B] mt-1">
                {planNutricion.calorias_dia ? `${planNutricion.calorias_dia} kcal` : 'Ver plan'}
              </p>
            </button>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {!sesionHoy && !proximaSesion && !rutina && !planNutricion && !checkins?.length && (
        <div className="text-center py-10">
          <p className="text-5xl mb-3">🚀</p>
          <p className="text-sm font-bold text-[#0A0A0A]">¡Bienvenido a tu portal!</p>
          <p className="text-xs text-[#9B9B9B] mt-1 leading-relaxed max-w-xs mx-auto">
            Tu entrenador está preparando tu plan. En breve tendrás aquí tu rutina, tus sesiones y tu progreso.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── TAB RUTINA ───────────────────────────────────────────────────────────────
function TabRutina({ datos, cliente, color, clienteId }) {
  if (!datos) return <Spinner color={color} />
  const { rutina } = datos
  if (!rutina) return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">💪</p>
      <p className="text-sm font-bold text-[#0A0A0A]">Rutina en preparación</p>
      <p className="text-xs text-[#9B9B9B] mt-1">Tu entrenador está diseñando tu plan de entrenamiento.</p>
    </div>
  )

  const dias = rutina.borrador?.dias || rutina.contenido?.dias || []

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xl font-bold text-[#0A0A0A]">{rutina.nombre}</p>
        <p className="text-xs text-[#9B9B9B] mt-0.5">{dias.length} días · {rutina.semanas || 4} semanas</p>
      </div>
      {dias.map((dia, di) => (
        <div key={di} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-black/5 bg-[#F7F6F3]">
            <p className="font-semibold text-[#0A0A0A] text-sm">{dia.nombre || dia.dia}</p>
          </div>
          <div className="divide-y divide-black/5">
            {(dia.ejercicios || []).map((ej, ei) => (
              <div key={ei} className="px-5 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A]">{ej.nombre}</p>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    {ej.series && <span className="text-xs text-[#6B6B6B]">{ej.series} series</span>}
                    {ej.reps && <span className="text-xs text-[#6B6B6B]">· {ej.reps} reps</span>}
                    {ej.peso && <span className="text-xs text-[#6B6B6B]">· {ej.peso}</span>}
                    {ej.descanso && ej.descanso !== '-' && <span className="text-xs text-[#6B6B6B]">· 💤 {ej.descanso}</span>}
                  </div>
                  {ej.notas && <p className="text-xs text-[#9B9B9B] mt-1 italic">{ej.notas}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TAB NUTRICIÓN ────────────────────────────────────────────────────────────
function TabNutricion({ datos, cliente, color }) {
  if (!datos) return <Spinner color={color} />
  const { plan, tieneCuest } = datos

  if (!plan) return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">🥗</p>
      <p className="text-sm font-bold text-[#0A0A0A]">Plan de nutrición en preparación</p>
      {!tieneCuest && (
        <div className="mt-4">
          <p className="text-xs text-[#6B6B6B] mb-3">Tu entrenador necesita tu cuestionario de alimentación primero.</p>
          <a href={`https://forge-studio-os.vercel.app/nutricion-cuest?e=${cliente?.entrenador_id}&c=${cliente?.id}`}
            className="inline-block text-white text-sm font-bold px-5 py-3 rounded-xl"
            style={{ background: color }}>
            Rellenar cuestionario →
          </a>
        </div>
      )}
    </div>
  )

  const contenido = plan.contenido || plan.borrador || {}
  const comidas = contenido.comidas || []

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xl font-bold text-[#0A0A0A]">{plan.nombre}</p>
      </div>

      {/* Macros */}
      {plan.calorias_dia && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Calorías', valor: plan.calorias_dia, unidad: 'kcal', color: color },
            { label: 'Proteína', valor: plan.proteinas_dia, unidad: 'g', color: '#6366f1' },
            { label: 'Carbos', valor: plan.carbos_dia, unidad: 'g', color: '#f59e0b' },
            { label: 'Grasas', valor: plan.grasas_dia, unidad: 'g', color: '#10b981' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-2xl border border-black/5 p-3 text-center">
              <p className="text-lg font-bold" style={{ color: m.color }}>{m.valor || '—'}</p>
              <p className="text-[10px] text-[#9B9B9B]">{m.unidad}</p>
              <p className="text-[10px] text-[#9B9B9B]">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comidas */}
      {comidas.length > 0 && comidas.map((comida, ci) => (
        <div key={ci} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/5 bg-[#F7F6F3]">
            <p className="font-semibold text-[#0A0A0A] text-sm">{comida.nombre}</p>
            {comida.hora && <p className="text-xs text-[#9B9B9B]">{comida.hora}</p>}
          </div>
          <div className="px-5 py-3 space-y-2">
            {(comida.alimentos || []).map((al, ai) => (
              <div key={ai} className="flex items-center justify-between">
                <p className="text-sm text-[#0A0A0A]">{al.nombre || al}</p>
                {al.cantidad && <p className="text-xs text-[#9B9B9B]">{al.cantidad}</p>}
              </div>
            ))}
            {comida.notas && <p className="text-xs text-[#9B9B9B] italic mt-1">{comida.notas}</p>}
          </div>
        </div>
      ))}

      {/* Notas generales */}
      {contenido.notas && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1">📝 Notas de tu entrenador</p>
          <p className="text-sm text-amber-800 leading-relaxed">{contenido.notas}</p>
        </div>
      )}
    </div>
  )
}

// ─── TAB PROGRESO ─────────────────────────────────────────────────────────────
function TabProgreso({ datos, color }) {
  const [subTab, setSubTab] = useState('peso')
  if (!datos) return <Spinner color={color} />
  const { checkins, medidas, marcas, fotos } = datos

  const SUBTABS = [
    { id: 'peso', label: '⚖️ Peso' },
    { id: 'medidas', label: '📏 Medidas' },
    { id: 'marcas', label: '🏆 Marcas' },
    { id: 'fotos', label: '📸 Fotos' },
  ]

  return (
    <div className="space-y-4">
      {/* Subtabs */}
      <div className="grid grid-cols-4 gap-1 bg-black/5 p-1 rounded-xl">
        {SUBTABS.map(s => (
          <button key={s.id} onClick={() => setSubTab(s.id)}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              subTab === s.id ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#6B6B6B]'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {subTab === 'peso' && <SubTabPeso checkins={checkins} color={color} />}
      {subTab === 'medidas' && <SubTabMedidas medidas={medidas} color={color} />}
      {subTab === 'marcas' && <SubTabMarcas marcas={marcas} color={color} />}
      {subTab === 'fotos' && <SubTabFotos fotos={fotos} color={color} />}
    </div>
  )
}

function SubTabPeso({ checkins, color }) {
  const pesos = checkins?.filter(c => c.peso).slice().reverse() || []
  if (!checkins?.length) return (
    <div className="text-center py-10">
      <p className="text-3xl mb-2">📊</p>
      <p className="text-sm font-bold text-[#0A0A0A]">Sin check-ins aún</p>
      <p className="text-xs text-[#9B9B9B] mt-1">Ve registrando tus check-ins semanales para ver tu evolución aquí.</p>
    </div>
  )
  const ultimo = checkins[0]
  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Peso actual', valor: pesos[pesos.length-1]?.peso ? `${pesos[pesos.length-1].peso}kg` : '—', color: '#0A0A0A' },
          { label: 'Check-ins', valor: checkins.length, color: color },
          { label: 'Energía media', valor: checkins.length ? (checkins.reduce((s,c) => s+(c.energia||0), 0)/checkins.length).toFixed(1)+'/5' : '—', color: '#6366f1' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-black/5 p-3 text-center">
            <p className="text-lg font-bold" style={{ color: k.color }}>{k.valor}</p>
            <p className="text-[10px] text-[#9B9B9B]">{k.label}</p>
          </div>
        ))}
      </div>
      {/* Gráfica */}
      {pesos.length > 1 && (
        <div className="bg-white rounded-2xl border border-black/5 p-4">
          <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider mb-3">Evolución del peso</p>
          <div className="flex items-end gap-2 h-32 px-2">
            {pesos.slice(-10).map((c, i, arr) => {
              const min = Math.min(...arr.map(x => x.peso))
              const max = Math.max(...arr.map(x => x.peso))
              const h = max === min ? 60 : Math.max(20, ((c.peso - min) / (max - min)) * 75 + 25)
              const isLast = i === arr.length - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                  <p className={`text-[9px] font-semibold ${isLast ? '' : 'text-[#C0C0C0]'}`}
                    style={isLast ? { color } : {}}>
                    {c.peso}
                  </p>
                  <div className="w-full rounded-lg transition-all"
                    style={{ height: `${h}%`, background: isLast ? color : `${color}25`,
                      minHeight: 16 }} />
                  <p className="text-[8px] text-[#C0C0C0]">
                    {new Date(c.fecha).toLocaleDateString('es-ES', { day:'numeric', month:'short' })}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {/* Historial */}
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/5">
          <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Historial de check-ins</p>
        </div>
        <div className="divide-y divide-black/5">
          {checkins.slice(0, 10).map((c, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-[#0A0A0A]">
                  {new Date(c.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <div className="flex gap-3 mt-0.5">
                  {c.energia && <span className="text-[10px] text-[#9B9B9B]">⚡ {c.energia}/5</span>}
                  {c.fatiga && <span className="text-[10px] text-[#9B9B9B]">🏋️ {c.fatiga}/10</span>}
                  {c.sueno && <span className="text-[10px] text-[#9B9B9B]">😴 {c.sueno}/5</span>}
                </div>
              </div>
              {c.peso && <p className="text-sm font-bold text-[#0A0A0A]">{c.peso}kg</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SubTabMedidas({ medidas, color }) {
  if (!medidas?.length) return (
    <div className="text-center py-10">
      <p className="text-3xl mb-2">📏</p>
      <p className="text-sm font-bold text-[#0A0A0A]">Sin medidas aún</p>
    </div>
  )
  return (
    <div className="space-y-2">
      {medidas.slice(0, 10).map((m, i) => (
        <div key={i} className="bg-white rounded-2xl border border-black/5 p-4">
          <p className="text-xs text-[#9B9B9B] mb-2">
            {new Date(m.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[['Pecho', m.pecho], ['Cintura', m.cintura], ['Cadera', m.cadera],
              ['Muslo', m.muslo], ['Brazo', m.brazo], ['Gemelo', m.gemelo]].filter(([, v]) => v).map(([l, v]) => (
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

function SubTabMarcas({ marcas, color }) {
  if (!marcas?.length) return (
    <div className="text-center py-10">
      <p className="text-3xl mb-2">🏆</p>
      <p className="text-sm font-bold text-[#0A0A0A]">Sin marcas aún</p>
      <p className="text-xs text-[#9B9B9B] mt-1">Las marcas personales se registran desde tu ficha de entrenamientos.</p>
    </div>
  )
  return (
    <div className="space-y-2">
      {marcas.map((m, i) => (
        <div key={i} className="bg-white rounded-2xl border border-black/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}15` }}>
            <span className="text-lg">🏆</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A0A0A] truncate">{m.ejercicio}</p>
            <p className="text-xs text-[#9B9B9B]">
              {new Date(m.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </p>
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

function SubTabFotos({ fotos, color }) {
  if (!fotos?.length) return (
    <div className="text-center py-10">
      <p className="text-3xl mb-2">📸</p>
      <p className="text-sm font-bold text-[#0A0A0A]">Sin fotos aún</p>
    </div>
  )
  return (
    <div className="grid grid-cols-3 gap-2">
      {fotos.map((f, i) => (
        <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#F7F6F3]">
          <img src={f.url} alt={f.tipo || 'Foto'} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  )
}

// ─── TAB MENSAJES ─────────────────────────────────────────────────────────────
function TabMensajes({ datos, setDatos, cliente, clienteId, color }) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [datos?.mensajes?.length])

  if (!datos) return <Spinner color={color} />

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim() || enviando) return
    setEnviando(true)
    const contenido = texto.trim()
    setTexto('')
    await supabase.functions.invoke('portal-accion', {
      body: { accion: 'enviar_mensaje', datos: { contenido } }
    }).catch(() => {})
    const { data } = await supabase.from('mensajes_cliente').select('*')
      .eq('cliente_id', clienteId).order('created_at', { ascending: true })
    setDatos({ mensajes: data || [] })
    setEnviando(false)
  }

  const mensajes = datos.mensajes || []

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {mensajes.length === 0 && (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">✉️</p>
            <p className="text-sm font-bold text-[#0A0A0A]">Sin mensajes aún</p>
            <p className="text-xs text-[#9B9B9B] mt-1">Escribe a tu entrenador aquí.</p>
          </div>
        )}
        {mensajes.map((m, i) => {
          const esEntrenador = m.tipo === 'entrenador' || m.tipo === 'sistema'
          return (
            <div key={i} className={`flex ${esEntrenador ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                esEntrenador
                  ? 'bg-white border border-black/5 text-[#0A0A0A]'
                  : 'text-white'
              }`} style={!esEntrenador ? { background: color } : {}}>
                {m.contenido}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={enviar} className="flex gap-2 pt-3 border-t border-black/5 mt-3">
        <input value={texto} onChange={e => setTexto(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 border border-black/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5C00]" />
        <button type="submit" disabled={!texto.trim() || enviando}
          className="px-4 py-3 rounded-2xl text-white font-bold text-sm disabled:opacity-40"
          style={{ background: color }}>
          {enviando ? '...' : '→'}
        </button>
      </form>
    </div>
  )
}

// ─── TAB PAGOS ────────────────────────────────────────────────────────────────
function TabPagos({ datos, cliente, color }) {
  const [abriendoStripe, setAbriendoStripe] = useState(false)
  if (!datos) return <Spinner color={color} />
  const { pagos, planActivo } = datos

  async function abrirPortalStripe() {
    setAbriendoStripe(true)
    const { data } = await supabase.functions.invoke('stripe-portal-cliente', {
      body: { cliente_id: cliente?.id }
    }).catch(() => ({ data: null }))
    if (data?.url) window.open(data.url, '_blank')
    setAbriendoStripe(false)
  }

  return (
    <div className="space-y-4">
      <p className="text-xl font-bold text-[#0A0A0A]">Pagos</p>

      {/* Plan activo */}
      {planActivo && (
        <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Plan activo</p>
          <p className="text-2xl font-bold">{planActivo.importe}€<span className="text-sm font-normal text-white/70">/mes</span></p>
          <p className="text-sm text-white/80 mt-1">{planActivo.concepto || 'Suscripción mensual'}</p>
          {planActivo.proximo_cobro && (
            <p className="text-xs text-white/60 mt-2">
              Próximo cobro: {new Date(planActivo.proximo_cobro + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
            </p>
          )}
          {cliente?.stripe_customer_id && (
            <button onClick={abrirPortalStripe} disabled={abriendoStripe}
              className="mt-4 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
              {abriendoStripe ? '...' : 'Gestionar suscripción →'}
            </button>
          )}
        </div>
      )}

      {/* Sin plan activo */}
      {!planActivo && !pagos?.length && (
        <div className="text-center py-10">
          <p className="text-3xl mb-2">💳</p>
          <p className="text-sm font-bold text-[#0A0A0A]">Sin pagos registrados</p>
          <p className="text-xs text-[#9B9B9B] mt-1">Tu entrenador te informará cuando haya algo aquí.</p>
        </div>
      )}

      {/* Historial */}
      {pagos?.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/5">
            <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Historial de pagos</p>
          </div>
          <div className="divide-y divide-black/5">
            {pagos.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${
                  ['cobrado','pagado'].includes(p.estado) ? 'bg-emerald-50' : 'bg-amber-50'
                }`}>
                  {['cobrado','pagado'].includes(p.estado) ? '✓' : '⏳'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A]">{p.concepto || 'Pago'}</p>
                  <p className="text-xs text-[#9B9B9B]">
                    {p.fecha_pago ? new Date(p.fecha_pago + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#0A0A0A]">{p.importe}€</p>
                  <span className={`text-[10px] font-bold ${['cobrado','pagado'].includes(p.estado) ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {['cobrado','pagado'].includes(p.estado) ? 'Cobrado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TAB AJUSTES ─────────────────────────────────────────────────────────────
function TabAjustes({ cliente, setCliente, color, clienteId }) {
  const [form, setForm] = useState({
    peso_actual: cliente?.peso_actual || '',
    peso_objetivo: cliente?.peso_objetivo || '',
    objetivo: cliente?.objetivo || '',
  })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true); setOk(false)
    await supabase.from('clientes').update({
      peso_actual: form.peso_actual ? parseFloat(form.peso_actual) : null,
      peso_objetivo: form.peso_objetivo ? parseFloat(form.peso_objetivo) : null,
      objetivo: form.objetivo || null,
    }).eq('id', clienteId)
    setOk(true)
    setGuardando(false)
    setTimeout(() => setOk(false), 3000)
  }

  return (
    <div className="space-y-4">
      <p className="text-xl font-bold text-[#0A0A0A]">Ajustes</p>

      {/* Info personal */}
      <div className="bg-white rounded-2xl border border-black/5 p-5">
        <p className="text-sm font-bold text-[#0A0A0A] mb-1">{cliente?.nombre}</p>
        <p className="text-xs text-[#9B9B9B]">{cliente?.email}</p>
        <p className="text-xs text-[#9B9B9B] mt-0.5 capitalize">{cliente?.tipo} · {cliente?.plan_online || 'presencial'}</p>
      </div>

      {/* Datos actualizables */}
      <form onSubmit={guardar} className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
        <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Mi plan</p>
        <p className="text-xs text-[#9B9B9B] -mt-2">Tu entrenador recibirá una notificación si cambias algo</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[#6B6B6B] block mb-1.5">Peso actual (kg)</label>
            <input type="number" step="0.1" value={form.peso_actual}
              onChange={e => setForm(f => ({ ...f, peso_actual: e.target.value }))}
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B6B6B] block mb-1.5">Peso objetivo (kg)</label>
            <input type="number" step="0.1" value={form.peso_objetivo}
              onChange={e => setForm(f => ({ ...f, peso_objetivo: e.target.value }))}
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-[#6B6B6B] block mb-1.5">Mi objetivo</label>
          <div className="grid grid-cols-2 gap-2">
            {[['perdida_grasa','🔥 Pérdida de grasa'],['ganancia_muscular','💪 Ganar músculo'],
              ['tonificacion','✨ Tonificación'],['rendimiento','🏃 Rendimiento'],
              ['mantenimiento','⚖️ Mantenimiento'],['salud','❤️ Salud']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setForm(f => ({ ...f, objetivo: v }))}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left ${
                  form.objetivo === v ? 'text-white border-transparent' : 'border-black/10 text-[#6B6B6B]'
                }`}
                style={form.objetivo === v ? { background: color } : {}}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={guardando}
          className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40"
          style={{ background: color }}>
          {guardando ? '⏳ Guardando...' : ok ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </form>

      {/* Contraseña */}
      <div className="bg-white rounded-2xl border border-black/5 p-5">
        <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider mb-3">Seguridad</p>
        <button onClick={async () => {
          await supabase.auth.resetPasswordForEmail(cliente?.email || '', {
            redirectTo: `${window.location.origin}/portal`
          })
          alert('Te hemos enviado un email para cambiar tu contraseña.')
        }}
          className="text-sm font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
          Cambiar contraseña →
        </button>
      </div>

      {/* Cerrar sesión */}
      <button onClick={() => supabase.auth.signOut()}
        className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium">
        Cerrar sesión
      </button>
    </div>
  )
}

// ─── Utilidades UI ────────────────────────────────────────────────────────────
function Spinner({ color = '#FF5C00' }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-3 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: color, borderTopColor: 'transparent', borderWidth: 3 }} />
    </div>
  )
}
