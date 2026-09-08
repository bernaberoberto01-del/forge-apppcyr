import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── Componente principal ────────────────────────────────────────────────────
export default function PortalCliente() {
  const [clienteSession, setClienteSession] = useState(undefined)
  const [cliente, setCliente]       = useState(null)
  const [clienteId, setClienteId]   = useState(null)
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)
  const [tab, setTab]               = useState('inicio')
  const [configEntrenador, setConfigEntrenador] = useState(null)

  // Datos por tab — se cargan bajo demanda
  const [rutina, setRutina]                 = useState(null)
  const [planNutricion, setPlanNutricion]   = useState(null)
  const [tieneCuestNutricion, setTieneCuest]= useState(false)
  const [checkins, setCheckins]             = useState([])
  const [marcas, setMarcas]                 = useState([])
  const [medidas, setMedidas]               = useState([])
  const [fotos, setFotos]                   = useState([])
  const [mensajes, setMensajes]             = useState([])
  const [pagos, setPagos]                   = useState([])
  const [sesionesPortal, setSesionesPortal] = useState([])
  const [pendientesValorar, setPendientes]  = useState([])

  // Estado de carga por tab
  const [cargado, setCargado] = useState({})

  // UI
  const [subTabProgreso, setSubTabProgreso] = useState('peso')
  const [valorando, setValorando]           = useState(null)
  const [rpeVal, setRpeVal]                 = useState(null)
  const [fatigaVal, setFatigaVal]           = useState(null)
  const [modalCheckin, setModalCheckin]     = useState(false)
  const [checkinForm, setCheckinForm]       = useState({ energia: null, sueno: null, fatiga: null, estres: null, peso: '', comentario: '' })
  const [enviandoCI, setEnviandoCI]         = useState(false)
  const [guardandoValoracion, setGuardandoValoracion] = useState(false)
  const [textoMsg, setTextoMsg]             = useState('')
  const [enviandoMsg, setEnviandoMsg]       = useState(false)
  const [cancelando, setCancelando]         = useState(null)
  const [motivoCancel, setMotivoCancel]     = useState('')
  const [formPerfil, setFormPerfil]         = useState({peso_actual:'',peso_objetivo:'',objetivo:''})
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [formMarca, setFormMarca]           = useState({ejercicio:'',peso_kg:'',reps:'',notas:''})
  const [pesoFoto, setPesoFoto]             = useState('')
  const [tipoFoto, setTipoFoto]             = useState('frontal')
  const [subiendoFoto, setSubiendoFoto]     = useState(false)
  const [medidaForm, setMedidaForm]         = useState({cintura:'',cadera:'',pecho:'',brazo:'',muslo:''})
  const [toastPortal, setToastPortal]       = useState('')
  const mensajesEndRef                      = useRef(null)

  const marcarVisto = () => {}
  const esNuevo = () => false

  // ── Sesión ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) =>
      setClienteSession(session?.user || null)
    )
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
      setClienteSession(s?.user || null)
    )
    return () => subscription.unsubscribe()
  }, [])

  // ── Carga inicial — solo lo esencial ─────────────────────────────────────
  useEffect(() => {
    if (clienteSession === undefined) return
    if (!clienteSession) { setLoading(false); return }

    async function cargarInicial() {
      setLoading(true)
      const { data: cl, error } = await supabase.from('clientes')
        .select('*').eq('auth_user_id', clienteSession.id).maybeSingle()
      if (error || !cl) { setNotFound(true); setLoading(false); return }

      const cid = cl.id
      setCliente(cl); setClienteId(cid)
      setFormPerfil({
        peso_actual: cl.peso_actual || '',
        peso_objetivo: cl.peso_objetivo || '',
        objetivo: cl.objetivo || ''
      })

      // Configuración del entrenador
      const { data: cfg } = await supabase.from('configuracion')
        .select('nombre_entrenador,foto_url,nombre_negocio,color_acento')
        .eq('entrenador_id', cl.entrenador_id).single().catch(() => ({ data: null }))
      if (cfg) setConfigEntrenador(cfg)

      // Cargar datos del Inicio en paralelo
      const [
        { data: ru },
        { data: ci },
        { data: pn },
        tieneCuest,
        { data: sesFut },
        { data: sesPend },
      ] = await Promise.all([
        supabase.from('rutinas').select('*').eq('cliente_id', cid).eq('estado', 'publicada').order('created_at', { ascending: false }).limit(1),
        supabase.from('checkins').select('*').eq('cliente_id', cid).order('fecha', { ascending: false }).limit(12),
        supabase.from('planes_nutricion').select('*').eq('cliente_id', cid).eq('estado', 'publicado').order('created_at', { ascending: false }).limit(1),
        supabase.from('cuestionarios_nutricion').select('id').eq('cliente_id', cid).limit(1).then(r => !!(r.data?.length)).catch(() => false),
        supabase.from('sesiones').select('*').eq('cliente_id', cid).gte('fecha', new Date().toISOString().split('T')[0]).eq('cancelada', false).order('fecha').order('hora').limit(8),
        supabase.from('sesiones').select('*').eq('cliente_id', cid).eq('completada', true).eq('cancelada', false).is('rpe', null).gte('fecha', new Date(Date.now() - 14 * 864e5).toISOString().split('T')[0]).lte('fecha', new Date().toISOString().split('T')[0]).order('fecha', { ascending: false }).limit(3),
      ])

      setRutina(ru?.[0] || null)
      setCheckins(ci || [])
      setPlanNutricion(pn?.[0] || null)
      setTieneCuest(tieneCuest)
      setSesionesPortal(sesFut || [])
      setPendientes(sesPend || [])
      setCargado(prev => ({ ...prev, inicio: true }))
      setLoading(false)

      // Registrar acceso en segundo plano
      setTimeout(() => {
        supabase.from('actividad_cliente').insert({
          cliente_id: cid, entrenador_id: cl.entrenador_id,
          tipo: 'portal_acceso', descripcion: 'Entró al portal'
        }).catch(() => {})
      }, 3000)
    }

    cargarInicial().catch(() => setLoading(false))
  }, [clienteSession])

  // ── Carga por tab ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!clienteId || cargado[tab]) return

    async function cargarTab() {
      if (tab === 'progreso') {
        const [{ data: mc }, { data: med }, { data: ft }] = await Promise.all([
          supabase.from('marcas_cliente').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }),
          supabase.from('medidas_cliente').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }),
          supabase.from('fotos_progreso').select('*').eq('cliente_id', clienteId).eq('visible_cliente', true).order('fecha', { ascending: false }),
        ])
        setMarcas(mc || []); setMedidas(med || []); setFotos(ft || [])
      }
      if (tab === 'mensajes') {
        const { data: ms } = await supabase.from('mensajes_cliente').select('*')
          .eq('cliente_id', clienteId).order('created_at', { ascending: true })
        setMensajes(ms || [])
        // Marcar como leídos
        await supabase.from('mensajes_cliente').update({ leido: true })
          .eq('cliente_id', clienteId).eq('leido', false)
        setTimeout(() => mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
      if (tab === 'pagos') {
        const { data: pg } = await supabase.from('pagos').select('*')
          .eq('cliente_id', clienteId).order('fecha_pago', { ascending: false })
        setPagos(pg || [])
      }
      setCargado(prev => ({ ...prev, [tab]: true }))
    }

    cargarTab().catch(() => {})
  }, [tab, clienteId])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const color = configEntrenador?.color_acento || '#FF5C00'
  const esOnline = cliente?.tipo === 'online'
  const plan = cliente?.plan_online
  const puedeVerRutina = !esOnline || !plan || plan === 'entrenamiento' || plan === 'completo'
  const puedeVerNutricion = !esOnline || !plan || plan === 'nutricion' || plan === 'completo'
  const mensajesNoLeidos = mensajes.filter(m => !m.leido && m.tipo === 'entrenador').length

  function mostrarToast(msg) {
    setToastPortal(msg)
    setTimeout(() => setToastPortal(''), 3000)
  }

  const TABS = [
    { id: 'inicio', label: 'Inicio', icon: '⊞' },
    ...(puedeVerRutina && rutina ? [{ id: 'rutina', label: 'Rutina', icon: '💪' }] : []),
    ...(puedeVerNutricion && (planNutricion || tieneCuestNutricion) ? [{ id: 'nutricion', label: 'Nutrición', icon: '🥗' }] : []),
    { id: 'progreso', label: 'Progreso', icon: '📈' },
    { id: 'mensajes', label: 'Mensajes', icon: '✉️', badge: mensajesNoLeidos },
    ...(pagos.length > 0 ? [{ id: 'pagos', label: 'Pagos', icon: '💳' }] : []),
    { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
  ]

  // ── Guards ────────────────────────────────────────────────────────────────
  if (clienteSession === undefined || loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F3' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF5C00', borderTopColor: 'transparent' }} />
    </div>
  )

  if (notFound || !clienteSession) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F7F6F3' }}>
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-sm border border-black/5">
        <p className="text-5xl mb-4">🔗</p>
        <p className="text-[#0A0A0A] font-bold text-xl mb-2">Cuenta no reconocida</p>
        <p className="text-[#6B6B6B] text-sm mb-6 leading-relaxed">El email con el que has entrado no está asociado a ningún cliente. Usa el mismo email que le diste a tu entrenador.</p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
          className="w-full text-sm font-bold px-4 py-3.5 rounded-2xl text-white" style={{ background: '#FF5C00' }}>
          Probar con otro email →
        </button>
      </div>
    </div>
  )

  if (!cliente) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F3' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
    </div>
  )

  const nombreCorto = configEntrenador?.nombre_entrenador?.split(' ')[0] || 'Tu entrenador'
  const inicialEntrenador = (configEntrenador?.nombre_entrenador || 'E')[0].toUpperCase()
  const inicialCliente = (cliente.nombre || 'C')[0].toUpperCase()

  async function enviarCheckin() {
    if (!checkinForm.energia || !checkinForm.sueno || !checkinForm.fatiga || !checkinForm.estres) return
    setEnviandoCI(true)
    const hoy = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('checkins').insert({
      cliente_id: clienteId, entrenador_id: cliente.entrenador_id, fecha: hoy,
      energia: checkinForm.energia, sueno: checkinForm.sueno,
      fatiga: checkinForm.fatiga, estres: checkinForm.estres,
      peso: checkinForm.peso ? parseFloat(checkinForm.peso) : null,
      comentario: checkinForm.comentario || null, adherencia_entreno: 5,
    })
    if (!error) {
      setCheckins(prev => [{ id: Date.now()+'', fecha: hoy, ...checkinForm, peso: checkinForm.peso ? parseFloat(checkinForm.peso) : null }, ...prev])
      setModalCheckin(false)
      setCheckinForm({ energia: null, sueno: null, fatiga: null, estres: null, peso: '', comentario: '' })
    }
    setEnviandoCI(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#F7F6F3' }}>

      {/* Toast */}
      {toastPortal && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A] text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          {toastPortal}
        </div>
      )}

      {/* Layout desktop + móvil */}
      <div className="flex h-screen overflow-hidden">

        {/* Sidebar desktop */}
        <div className="hidden md:flex flex-col w-56 bg-white border-r border-black/5 flex-shrink-0">
          {/* Entrenador */}
          <div className="px-4 pt-5 pb-4 border-b border-black/5">
            <p className="text-xs text-[#9B9B9B] mb-2">Tu entrenador</p>
            <div className="flex items-center gap-2.5">
              {configEntrenador?.foto_url
                ? <img src={configEntrenador.foto_url} className="w-8 h-8 rounded-full object-cover" />
                : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: color }}>{inicialEntrenador}</div>
              }
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0A0A0A] truncate">{configEntrenador?.nombre_entrenador || 'Entrenador'}</p>
                <p className="text-xs text-[#9B9B9B] truncate">{configEntrenador?.nombre_negocio || ''}</p>
              </div>
            </div>
          </div>
          {/* Nav */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${tab === t.id ? 'text-white' : 'text-[#6B6B6B] hover:bg-[#F7F6F3] hover:text-[#0A0A0A]'}`}
                style={tab === t.id ? { background: color } : {}}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {t.badge > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{t.badge}</span>
                )}
              </button>
            ))}
          </nav>
          {/* Footer */}
          <div className="px-4 py-4 border-t border-black/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: color }}>{inicialCliente}</div>
              <p className="text-xs text-[#6B6B6B] truncate">{cliente.nombre?.split(' ')[0]}</p>
            </div>
            <button onClick={() => supabase.auth.signOut()}
              className="text-xs text-[#6B6B6B] hover:text-red-500 transition-colors">↩ Cerrar sesión</button>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header móvil */}
          <div className="md:hidden bg-white border-b border-black/5 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {configEntrenador?.foto_url
                ? <img src={configEntrenador.foto_url} className="w-7 h-7 rounded-full object-cover" />
                : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: color }}>{inicialEntrenador}</div>
              }
              <div>
                <p className="text-xs font-semibold text-[#0A0A0A]">{configEntrenador?.nombre_entrenador || 'Tu entrenador'}</p>
                {configEntrenador?.nombre_negocio && <p className="text-[10px] text-[#9B9B9B]">{configEntrenador.nombre_negocio}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: color }}>{inicialCliente}</div>
            </div>
          </div>

          {/* Área de scroll */}
          <div className="flex-1 overflow-y-auto pb-20 md:pb-6">
            <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">

              {/* ── INICIO ── */}
              {tab === 'inicio' && (
                <TabInicio
                  cliente={cliente} color={color} checkins={checkins}
                  rutina={rutina} planNutricion={planNutricion}
                  sesionesPortal={sesionesPortal} pendientesValorar={pendientesValorar}
                  puedeVerNutricion={puedeVerNutricion} tieneCuestNutricion={tieneCuestNutricion}
                  clienteId={clienteId} setTab={setTab}
                  valorando={valorando} setValorando={setValorando}
                  onAbrirCheckin={() => setModalCheckin(true)}
                />
              )}

              {/* ── RUTINA ── */}
              {tab === 'rutina' && (
                <TabRutina rutina={rutina} color={color} esNuevo={esNuevo} marcarVisto={marcarVisto} />
              )}

              {/* ── NUTRICIÓN ── */}
              {tab === 'nutricion' && (
                <TabNutricion
                  planNutricion={planNutricion} tieneCuestNutricion={tieneCuestNutricion}
                  cliente={cliente} color={color} diaActivo={0}
                />
              )}

              {/* ── PROGRESO ── */}
              {tab === 'progreso' && (
                <TabProgreso
                  checkins={checkins} marcas={marcas} medidas={medidas} fotos={fotos}
                  color={color} clienteId={clienteId} entrenadorId={cliente.entrenador_id}
                  subTab={subTabProgreso} setSubTab={setSubTabProgreso}
                  esNuevo={esNuevo} marcarVisto={marcarVisto}
                  formMarca={formMarca} setFormMarca={setFormMarca}
                  setMarcas={setMarcas} mostrarToast={mostrarToast}
                  medidaForm={medidaForm} setMedidaForm={setMedidaForm}
                  setMedidas={setMedidas}
                  pesoFoto={pesoFoto} setPesoFoto={setPesoFoto}
                  tipoFoto={tipoFoto} setTipoFoto={setTipoFoto}
                  subiendoFoto={subiendoFoto} setSubiendoFoto={setSubiendoFoto}
                  setFotos={setFotos}
                />
              )}

              {/* ── MENSAJES ── */}
              {tab === 'mensajes' && (
                <TabMensajes
                  mensajes={mensajes} setMensajes={setMensajes}
                  textoMsg={textoMsg} setTextoMsg={setTextoMsg}
                  enviandoMsg={enviandoMsg} setEnviandoMsg={setEnviandoMsg}
                  color={color} clienteId={clienteId}
                  esNuevo={esNuevo} marcarVisto={marcarVisto}
                  mensajesEndRef={mensajesEndRef}
                />
              )}

              {/* ── PAGOS ── */}
              {tab === 'pagos' && (
                <PagosCliente cliente={cliente} pagos={pagos} color={color} />
              )}

              {/* ── AJUSTES ── */}
              {tab === 'ajustes' && (
                <TabAjustes
                  cliente={cliente} color={color}
                  formPerfil={formPerfil} setFormPerfil={setFormPerfil}
                  guardandoPerfil={guardandoPerfil} setGuardandoPerfil={setGuardandoPerfil}
                  clienteId={clienteId} mostrarToast={mostrarToast}
                  setCliente={setCliente}
                />
              )}

            </div>
          </div>

          {/* Bottom bar móvil */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 z-40 safe-area-pb">
            <div className="flex items-center justify-around px-2 py-2">
              {TABS.slice(0, 5).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative ${tab === t.id ? 'opacity-100' : 'opacity-40'}`}>
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-[9px] font-semibold" style={tab === t.id ? { color } : { color: '#6B6B6B' }}>
                    {t.label}
                  </span>
                  {t.badge > 0 && (
                    <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{t.badge}</span>
                  )}
                </button>
              ))}
              {TABS.length > 5 && (
                <button onClick={() => setTab(TABS.length > 5 ? 'ajustes' : tab)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${['ajustes','pagos'].includes(tab) ? 'opacity-100' : 'opacity-40'}`}>
                  <span className="text-lg">⚙️</span>
                  <span className="text-[9px] font-semibold text-[#6B6B6B]">Más</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal valorar sesión */}
      {valorando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setValorando(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[#0A0A0A] text-lg mb-4">¿Cómo fue tu entreno?</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-[#6B6B6B] mb-2">Esfuerzo (RPE)</p>
                <div className="grid grid-cols-5 gap-2">
                  {[1,2,3,4,5,6,7,8,9,10].map(v => (
                    <button key={v} onClick={() => setRpeVal(v)}
                      className={`py-2 rounded-xl text-sm font-bold transition-all ${rpeVal===v?'text-white':'border border-black/10 text-[#6B6B6B]'}`}
                      style={rpeVal===v?{background:color}:{}}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[#6B6B6B] mb-2">Fatiga post-entreno</p>
                <div className="grid grid-cols-5 gap-2">
                  {[1,2,3,4,5].map(v => (
                    <button key={v} onClick={() => setFatigaVal(v)}
                      className={`py-2 rounded-xl text-sm font-bold transition-all ${fatigaVal===v?'text-white':'border border-black/10 text-[#6B6B6B]'}`}
                      style={fatigaVal===v?{background:color}:{}}>{v}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setValorando(null)}
                  className="flex-1 border border-black/10 text-sm py-3 rounded-xl text-[#6B6B6B]">Cancelar</button>
                <button onClick={async () => {
                  if (!rpeVal) return
                  setGuardandoValoracion(true)
                  await supabase.from('sesiones').update({ rpe: rpeVal, fatiga_post: fatigaVal }).eq('id', valorando.id)
                  setValorando(null); setRpeVal(null); setFatigaVal(null)
                  setGuardandoValoracion(false)
                  mostrarToast('✓ Valoración guardada')
                }} disabled={!rpeVal || guardandoValoracion}
                  className="flex-1 text-white text-sm font-bold py-3 rounded-xl disabled:opacity-50"
                  style={{ background: color }}>
                  {guardandoValoracion ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cancelar sesión */}
      {cancelando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setCancelando(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[#0A0A0A] text-lg mb-1">¿Cancelar sesión?</h3>
            <p className="text-sm text-[#6B6B6B] mb-4">
              {new Date(cancelando.fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              {cancelando.hora ? ' · ' + cancelando.hora.slice(0, 5) : ''}
            </p>
            <textarea value={motivoCancel} onChange={e => setMotivoCancel(e.target.value)}
              rows={2} placeholder="Motivo (opcional)"
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none mb-3 resize-none" />
            <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5 mb-4">⚠ Tu entrenador recibirá una notificación</p>
            <div className="flex gap-2">
              <button onClick={() => setCancelando(null)}
                className="flex-1 border border-black/10 text-sm py-3 rounded-xl text-[#6B6B6B]">Volver</button>
              <button onClick={async () => {
                await supabase.functions.invoke('portal-accion', {
                  body: { accion: 'cancelar_sesion', datos: { sesion_id: cancelando.id, motivo: motivoCancel } }
                })
                setSesionesPortal(prev => prev.filter(s => s.id !== cancelando.id))
                setCancelando(null); setMotivoCancel('')
                mostrarToast('Sesión cancelada')
              }} className="flex-1 text-white text-sm font-bold py-3 rounded-xl bg-red-500">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal check-in semanal */}
      {modalCheckin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModalCheckin(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white">
              <div><p className="font-bold text-[#0A0A0A] text-lg">Check-in semanal</p><p className="text-xs text-[#9B9B9B]">Cuéntame cómo ha ido la semana</p></div>
              <button onClick={() => setModalCheckin(false)} className="text-[#9B9B9B] text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {[
                { key: 'energia', label: '⚡ Energía', max: 5, lo: 'Agotado', hi: 'Excelente' },
                { key: 'sueno', label: '😴 Sueño', max: 5, lo: 'Muy mal', hi: 'Muy bien' },
                { key: 'fatiga', label: '🏋️ Fatiga muscular', max: 10, lo: 'Sin fatiga', hi: 'Al límite' },
                { key: 'estres', label: '🧠 Estrés', max: 10, lo: 'Sin estrés', hi: 'Al límite' },
              ].map(({ key, label, max, lo, hi }) => (
                <div key={key}>
                  <p className="text-sm font-bold text-[#0A0A0A] mb-2">{label}</p>
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${max}, 1fr)` }}>
                    {Array.from({ length: max }, (_, i) => i + 1).map(v => {
                      const sel = checkinForm[key] === v
                      const hot = (key === 'fatiga' || key === 'estres') && v >= 7
                      const med = (key === 'fatiga' || key === 'estres') && v >= 5 && v < 7
                      return (
                        <button key={v} onClick={() => setCheckinForm(f => ({ ...f, [key]: v }))}
                          className={`py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${sel ? 'text-white' : 'border border-black/10 text-[#6B6B6B]'}`}
                          style={sel ? { background: hot ? '#ef4444' : med ? '#f59e0b' : color } : {}}>
                          {v}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1"><p className="text-[10px] text-[#C0C0C0]">{lo}</p><p className="text-[10px] text-[#C0C0C0]">{hi}</p></div>
                </div>
              ))}
              <div>
                <p className="text-sm font-bold text-[#0A0A0A] mb-1">⚖️ Peso <span className="font-normal text-xs text-[#9B9B9B]">(opcional)</span></p>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" placeholder="75.0" value={checkinForm.peso}
                    onChange={e => setCheckinForm(f => ({ ...f, peso: e.target.value }))}
                    className="flex-1 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5C00]" />
                  <span className="text-sm text-[#9B9B9B]">kg</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-[#0A0A0A] mb-1">💬 Comentario <span className="font-normal text-xs text-[#9B9B9B]">(opcional)</span></p>
                <textarea rows={2} placeholder="¿Algo que contarle a tu entrenador?" value={checkinForm.comentario}
                  onChange={e => setCheckinForm(f => ({ ...f, comentario: e.target.value }))}
                  className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none" />
              </div>
              <button onClick={enviarCheckin}
                disabled={!checkinForm.energia || !checkinForm.sueno || !checkinForm.fatiga || !checkinForm.estres || enviandoCI}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
                style={{ background: color }}>
                {enviandoCI ? '⏳ Enviando...' : '✓ Enviar check-in'}
              </button>
              <p className="text-xs text-[#C0C0C0] text-center">Tu entrenador lo recibe automáticamente</p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Tab Inicio ──────────────────────────────────────────────────────────────
function TabInicio({ cliente, color, checkins, rutina, planNutricion, sesionesPortal,
  pendientesValorar, puedeVerNutricion, tieneCuestNutricion, clienteId, setTab,
  valorando, setValorando, onAbrirCheckin }) {

  const hoy = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]
  const nombre = cliente?.nombre?.split(' ')[0] || ''
  const HORAS = hoy.getHours()
  const saludo = HORAS < 13 ? '☀️ Buenos días' : HORAS < 20 ? '👋 Buenas tardes' : '🌙 Buenas noches'
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

  const sesionHoy = sesionesPortal.find(s => s.fecha === hoyStr)
  const proximaSesion = sesionesPortal.find(s => s.fecha > hoyStr)
  const diasSinCI = checkins[0]?.fecha
    ? Math.floor((Date.now() - new Date(checkins[0].fecha).getTime()) / 864e5)
    : 999
  const pesos = checkins.filter(c => c.peso).reverse()
  const diffPeso = pesos.length >= 2 ? +(pesos[pesos.length-1].peso - pesos[0].peso).toFixed(1) : null

  return (
    <div className="space-y-3 pb-2">
      {/* Cabecera */}
      <div className="pt-1 pb-1">
        <p className="text-xs text-[#9B9B9B]">{saludo}</p>
        <p className="text-2xl font-bold text-[#0A0A0A]">{nombre} 👊</p>
        <p className="text-xs text-[#9B9B9B] mt-0.5">{DIAS[hoy.getDay()]} {hoy.getDate()} {MESES[hoy.getMonth()]}</p>
      </div>

      {/* Cuestionario nutrición pendiente */}
      {puedeVerNutricion && !planNutricion && !tieneCuestNutricion && (
        <a href={`https://forge-studio-os.vercel.app/nutricion-cuest?e=${cliente.entrenador_id}&c=${clienteId}`}
          className="flex items-center gap-3 bg-emerald-500 rounded-2xl p-4 active:scale-95 transition-all">
          <span className="text-2xl">🥗</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Rellena tu cuestionario de nutrición</p>
            <p className="text-xs text-white/70 mt-0.5">Tu entrenador lo necesita para crear tu plan</p>
          </div>
          <span className="text-white/70">→</span>
        </a>
      )}

      {/* Sesión pendiente de valorar */}
      {pendientesValorar[0] && (
        <button onClick={() => setValorando(pendientesValorar[0])}
          className="w-full flex items-center gap-3 rounded-2xl p-4 border-2 text-left active:scale-95 transition-all"
          style={{ borderColor: color, background: `${color}08` }}>
          <span className="text-2xl">⭐</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#0A0A0A]">¿Cómo fue tu sesión del {new Date(pendientesValorar[0].fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long' })}?</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">10 segundos · Ayuda a tu entrenador</p>
          </div>
          <span className="text-sm font-bold" style={{ color }}>Valorar →</span>
        </button>
      )}

      {/* Sesión de hoy */}
      {sesionHoy && (
        <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
          <div className="px-4 pt-4 pb-3">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Hoy toca</p>
            <p className="text-white font-bold text-lg">
              {sesionHoy.tipo === 'online' ? 'Entrenamiento online'
                : sesionHoy.tipo === 'grupo' ? 'Entrenamiento en grupo'
                : 'Entrenamiento personal'}
            </p>
            {sesionHoy.hora && <p className="text-white/70 text-sm mt-0.5">🕐 {sesionHoy.hora.slice(0,5)}</p>}
          </div>
          <div className="px-4 py-3 bg-black/10">
            <button onClick={() => setTab('progreso')} className="text-white/80 text-xs font-medium">Ver progreso →</button>
          </div>
        </div>
      )}

      {/* Check-in urgente */}
      {diasSinCI >= 7 && (
        <button onClick={onAbrirCheckin}
          className="flex items-center gap-3 bg-red-500 rounded-2xl p-4 active:scale-95 transition-all">
          <span className="text-2xl">⏰</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">
              {diasSinCI > 900 ? 'Haz tu primer check-in' : `${diasSinCI} días sin check-in`}
            </p>
            <p className="text-xs text-white/70 mt-0.5">Tu entrenador necesita saber cómo estás</p>
          </div>
          <span className="text-white/70">→</span>
        </button>
      )}

      {/* Progreso de peso */}
      {pesos.length >= 2 && (
        <button onClick={() => setTab('progreso')}
          className="w-full bg-white rounded-2xl border border-black/5 p-4 text-left active:scale-95 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Tu progreso</p>
              {diffPeso !== null && (
                <p className="text-2xl font-bold mt-0.5" style={{ color: diffPeso <= 0 ? '#10b981' : '#6366f1' }}>
                  {diffPeso > 0 ? '+' : ''}{diffPeso} kg
                </p>
              )}
              <p className="text-xs text-[#9B9B9B] mt-0.5">{checkins.length} check-ins</p>
            </div>
            {diasSinCI < 7 && <span className="text-xs bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-full">✓ Al día</span>}
          </div>
          <div className="flex items-end gap-1 h-10">
            {pesos.slice(-8).map((c, i, arr) => {
              const min = Math.min(...arr.map(x => x.peso))
              const max = Math.max(...arr.map(x => x.peso))
              const h = max === min ? 60 : ((c.peso - min) / (max - min)) * 65 + 35
              return <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === arr.length-1 ? color : `${color}30` }} />
            })}
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-[#9B9B9B]">{pesos[0].peso}kg</p>
            <p className="text-xs font-bold" style={{ color }}>{pesos[pesos.length-1].peso}kg</p>
          </div>
        </button>
      )}

      {/* Próxima sesión */}
      {!sesionHoy && proximaSesion && (
        <div className="bg-white rounded-2xl border border-black/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
            <span className="text-lg">📅</span>
          </div>
          <div>
            <p className="text-xs text-[#9B9B9B]">Próxima sesión</p>
            <p className="text-sm font-bold text-[#0A0A0A]">
              {new Date(proximaSesion.fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
              {proximaSesion.hora ? ' · ' + proximaSesion.hora.slice(0,5) : ''}
            </p>
          </div>
        </div>
      )}

      {/* Plan activo */}
      {(rutina || planNutricion) && (
        <div className="grid grid-cols-2 gap-2">
          {rutina && (
            <button onClick={() => setTab('rutina')}
              className="bg-white border border-black/5 rounded-2xl p-4 text-left active:scale-95 transition-all">
              <span className="text-xl mb-2 block">💪</span>
              <p className="text-xs font-bold text-[#0A0A0A] leading-tight line-clamp-2">{rutina.nombre || 'Tu rutina'}</p>
              <p className="text-xs text-[#9B9B9B] mt-1">{(rutina.borrador?.dias || rutina.contenido?.dias || []).length} días</p>
            </button>
          )}
          {planNutricion && (
            <button onClick={() => setTab('nutricion')}
              className="bg-white border border-black/5 rounded-2xl p-4 text-left active:scale-95 transition-all">
              <span className="text-xl mb-2 block">🥗</span>
              <p className="text-xs font-bold text-[#0A0A0A] leading-tight line-clamp-2">{planNutricion.nombre || 'Tu nutrición'}</p>
              <p className="text-xs text-[#9B9B9B] mt-1">{planNutricion.calorias_dia ? `${planNutricion.calorias_dia} kcal` : 'Ver plan'}</p>
            </button>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {!sesionHoy && !proximaSesion && !rutina && !planNutricion && checkins.length === 0 && (
        <div className="text-center py-10">
          <p className="text-5xl mb-3">🚀</p>
          <p className="text-sm font-bold text-[#0A0A0A]">¡Bienvenido a tu portal!</p>
          <p className="text-xs text-[#9B9B9B] mt-1 leading-relaxed max-w-xs mx-auto">Tu entrenador está preparando tu plan. En breve tendrás aquí tu rutina y tus sesiones.</p>
        </div>
      )}

      {/* Check-in al día */}
      {diasSinCI < 7 && checkins.length > 0 && (
        <div className="flex items-center gap-3 bg-white border border-black/5 rounded-2xl px-4 py-3">
          <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm">✓</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#0A0A0A]">Check-in al día</p>
            <p className="text-xs text-[#9B9B9B]">Hace {diasSinCI === 0 ? 'hoy' : `${diasSinCI} días`} · {checkins.length} registros</p>
          </div>
          <button onClick={onAbrirCheckin}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: color }}>
            Nuevo
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tab Rutina ───────────────────────────────────────────────────────────────
function TabRutina({ rutina, color, esNuevo, marcarVisto }) {
  if (!rutina) return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">💪</p>
      <p className="text-sm font-bold text-[#0A0A0A]">Sin rutina asignada</p>
      <p className="text-xs text-[#9B9B9B] mt-1">Tu entrenador está preparando tu plan de entrenamiento</p>
    </div>
  )

  const dias = rutina.borrador?.dias || rutina.contenido?.dias || []

  return (
    <div className="space-y-3">
      {esNuevo('rutina') && (
        <div className="bg-gradient-to-r from-[#FF5C00]/10 to-transparent border border-[#FF5C00]/20 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-xl">💪</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#0A0A0A]">¡Tu rutina está lista!</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">Tu entrenador ha preparado tu plan de entrenamiento personalizado</p>
          </div>
          <button onClick={() => marcarVisto('rutina')} className="text-[#9B9B9B] text-sm flex-shrink-0">×</button>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-black/5 p-4">
        <p className="font-bold text-[#0A0A0A]">{rutina.nombre}</p>
        <p className="text-xs text-[#9B9B9B] mt-1">{dias.length} días · {rutina.semanas || 4} semanas</p>
      </div>
      {dias.map((dia, di) => (
        <div key={di} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5 bg-[#F7F6F3]">
            <p className="font-semibold text-[#0A0A0A] text-sm">{dia.nombre || dia.dia}</p>
          </div>
          <div className="divide-y divide-black/5">
            {(dia.ejercicios || []).map((ej, ei) => (
              <div key={ei} className="px-4 py-3 flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white" style={{ background: color }}>
                  {ei + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0A0A0A]">{ej.nombre}</p>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {ej.series && <span className="text-xs text-[#6B6B6B]">📦 {ej.series} series</span>}
                    {ej.reps && <span className="text-xs text-[#6B6B6B]">🔁 {ej.reps} reps</span>}
                    {ej.peso && <span className="text-xs text-[#6B6B6B]">⚖️ {ej.peso}</span>}
                    {ej.descanso && ej.descanso !== '-' && <span className="text-xs text-[#6B6B6B]">💤 {ej.descanso}</span>}
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

// ─── Tab Nutrición ────────────────────────────────────────────────────────────
function TabNutricion({ planNutricion, tieneCuestNutricion, cliente, color }) {
  const [diaActivo, setDiaActivo] = useState(0)

  if (!planNutricion) return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">🥗</p>
      <p className="text-sm font-bold text-[#0A0A0A]">
        {tieneCuestNutricion ? 'Tu plan de nutrición está en preparación' : 'Sin plan de nutrición asignado'}
      </p>
      <p className="text-xs text-[#9B9B9B] mt-1 leading-relaxed max-w-xs mx-auto">
        {tieneCuestNutricion ? 'Tu entrenador está preparando tu plan personalizado con los datos de tu cuestionario' : 'Tu entrenador te asignará un plan pronto'}
      </p>
    </div>
  )

  const contenido = planNutricion.contenido || planNutricion.borrador
  const dias = contenido?.dias || []
  const diaActual = dias[diaActivo]

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-black/5 p-4">
        <p className="font-bold text-[#0A0A0A]">{planNutricion.nombre}</p>
        {planNutricion.calorias_dia && (
          <div className="flex gap-4 mt-3 flex-wrap">
            {[
              ['🔥', planNutricion.calorias_dia + ' kcal', 'Calorías'],
              ['🥩', planNutricion.proteinas_dia ? planNutricion.proteinas_dia + 'g' : '—', 'Proteína'],
              ['🌾', planNutricion.carbohidratos_dia ? planNutricion.carbohidratos_dia + 'g' : '—', 'Carbos'],
              ['🫒', planNutricion.grasas_dia ? planNutricion.grasas_dia + 'g' : '—', 'Grasas'],
            ].map(([icon, val, label]) => (
              <div key={label} className="text-center">
                <p className="text-sm font-bold text-[#0A0A0A]">{icon} {val}</p>
                <p className="text-xs text-[#9B9B9B]">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {dias.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {dias.map((d, i) => (
            <button key={i} onClick={() => setDiaActivo(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${diaActivo === i ? 'text-white' : 'bg-white border border-black/10 text-[#6B6B6B]'}`}
              style={diaActivo === i ? { background: color } : {}}>
              {d.nombre || `Día ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {diaActual && (diaActual.comidas || []).map((comida, ci) => (
        <div key={ci} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
            <p className="text-sm font-bold text-[#0A0A0A]">{comida.nombre}</p>
            {comida.calorias && <span className="text-xs text-[#9B9B9B]">{comida.calorias} kcal</span>}
          </div>
          <div className="divide-y divide-black/4">
            {(comida.alimentos || []).map((al, ai) => (
              <div key={ai} className="px-4 py-2.5 flex items-center justify-between">
                <p className="text-sm text-[#0A0A0A]">{al.nombre || al}</p>
                {al.cantidad && <span className="text-xs text-[#9B9B9B]">{al.cantidad}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {(!diaActual || !(diaActual.comidas?.length)) && dias.length === 0 && (
        <div className="bg-white rounded-2xl border border-black/5 p-6 text-center">
          <p className="text-xs text-[#9B9B9B]">El detalle del plan se mostrará aquí</p>
        </div>
      )}
    </div>
  )
}

// ─── Tab Progreso ─────────────────────────────────────────────────────────────
function TabProgreso({ checkins, marcas, medidas, fotos, color, clienteId, entrenadorId,
  subTab, setSubTab, esNuevo, marcarVisto, formMarca, setFormMarca, setMarcas,
  mostrarToast, medidaForm, setMedidaForm, setMedidas, pesoFoto, setPesoFoto,
  tipoFoto, setTipoFoto, subiendoFoto, setSubiendoFoto, setFotos }) {

  const SUBTABS = [
    { id: 'peso', label: '⚖️ Peso' },
    { id: 'marcas', label: '🏆 Marcas' },
    { id: 'medidas', label: '📏 Medidas' },
    { id: 'fotos', label: '📸 Fotos' },
  ]

  const pesos = checkins.filter(c => c.peso).reverse()

  return (
    <div className="space-y-3">
      {esNuevo('progreso') && (
        <div className="bg-gradient-to-r from-[#FF5C00]/10 to-transparent border border-[#FF5C00]/20 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-xl">📈</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#0A0A0A]">Registra tu progreso</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">Sube tu peso, medidas y fotos para ver tu evolución real</p>
          </div>
          <button onClick={() => marcarVisto('progreso')} className="text-[#9B9B9B] text-sm">×</button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-black/5 p-1 rounded-xl">
        {SUBTABS.map(st => (
          <button key={st.id} onClick={() => setSubTab(st.id)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${subTab === st.id ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#6B6B6B]'}`}>
            {st.label}
          </button>
        ))}
      </div>

      {/* Peso */}
      {subTab === 'peso' && (
        <div className="space-y-3">
          {checkins.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm font-bold text-[#0A0A0A]">Sin datos aún</p>
              <p className="text-xs text-[#9B9B9B] mt-1">Completa tu primer check-in para ver tu evolución</p>
            </div>
          ) : (
            <>
              {pesos.length >= 2 && (
                <div className="bg-white rounded-2xl border border-black/5 p-4">
                  <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider mb-3">Evolución de peso</p>
                  <div className="flex items-end gap-1 h-20">
                    {pesos.slice(-10).map((c, i, arr) => {
                      const min = Math.min(...arr.map(x => x.peso))
                      const max = Math.max(...arr.map(x => x.peso))
                      const h = max === min ? 60 : ((c.peso - min) / (max - min)) * 70 + 30
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-sm" style={{ height: `${h}%`, background: i === arr.length-1 ? color : `${color}30` }} />
                          {i === 0 || i === arr.length-1 ? <p className="text-[9px] text-[#9B9B9B]">{c.peso}</p> : null}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-[#9B9B9B]">{new Date(pesos[0].fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                    <p className="text-xs text-[#9B9B9B]">{new Date(pesos[pesos.length-1].fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {checkins.slice(0, 8).map((ci, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-black/5 px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-[#0A0A0A]">
                        {new Date(ci.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <div className="flex gap-3 mt-1">
                        {ci.energia && <span className="text-xs text-[#9B9B9B]">⚡ {ci.energia}/5</span>}
                        {ci.fatiga && <span className="text-xs text-[#9B9B9B]">🏋️ {ci.fatiga}/10</span>}
                        {ci.sueno && <span className="text-xs text-[#9B9B9B]">😴 {ci.sueno}/5</span>}
                      </div>
                    </div>
                    {ci.peso && <p className="text-lg font-bold" style={{ color }}>{ci.peso}kg</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Marcas */}
      {subTab === 'marcas' && (
        <div className="space-y-3">
          {marcas.length > 0 && (
            <div className="space-y-1.5">
              {marcas.map((m, i) => (
                <div key={i} className="bg-white rounded-2xl border border-black/5 px-4 py-3 flex items-center gap-3">
                  <span className="text-lg">🏆</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A0A0A] truncate">{m.ejercicio}</p>
                    <p className="text-xs text-[#9B9B9B]">{new Date(m.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <p className="text-lg font-bold" style={{ color }}>{m.peso_kg}kg</p>
                  {m.reps && <p className="text-xs text-[#9B9B9B]">× {m.reps}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="bg-white rounded-2xl border border-black/5 p-4">
            <p className="text-sm font-bold text-[#0A0A0A] mb-3">Añadir marca</p>
            <div className="space-y-2">
              <input placeholder="Ejercicio (ej: Sentadilla)" value={formMarca.ejercicio}
                onChange={e => setFormMarca(f => ({ ...f, ejercicio: e.target.value }))}
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Peso (kg)" type="number" value={formMarca.peso_kg}
                  onChange={e => setFormMarca(f => ({ ...f, peso_kg: e.target.value }))}
                  className="border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                <input placeholder="Reps" type="number" value={formMarca.reps}
                  onChange={e => setFormMarca(f => ({ ...f, reps: e.target.value }))}
                  className="border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
              </div>
              <button onClick={async () => {
                if (!formMarca.ejercicio || !formMarca.peso_kg) return
                const { data } = await supabase.from('marcas_cliente').insert({
                  cliente_id: clienteId, entrenador_id: entrenadorId,
                  ejercicio: formMarca.ejercicio.trim(),
                  peso_kg: parseFloat(formMarca.peso_kg),
                  reps: formMarca.reps ? parseInt(formMarca.reps) : null,
                  notas: formMarca.notas || null,
                  fecha: new Date().toISOString().split('T')[0]
                }).select().single()
                if (data) { setMarcas(prev => [data, ...prev]); setFormMarca({ ejercicio: '', peso_kg: '', reps: '', notas: '' }); mostrarToast('✓ Marca guardada') }
              }} className="w-full py-3 rounded-xl text-white text-sm font-bold" style={{ background: color }}>
                Guardar marca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medidas */}
      {subTab === 'medidas' && (
        <div className="space-y-3">
          {medidas.length > 0 && (
            <div className="space-y-1.5">
              {medidas.slice(0, 5).map((m, i) => (
                <div key={i} className="bg-white rounded-2xl border border-black/5 px-4 py-3">
                  <p className="text-xs text-[#9B9B9B] mb-2">{new Date(m.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['cintura', 'Cintura'], ['cadera', 'Cadera'], ['pecho', 'Pecho'], ['brazo', 'Brazo'], ['muslo', 'Muslo']].map(([k, l]) => m[k] ? (
                      <div key={k} className="text-center bg-[#F7F6F3] rounded-xl p-2">
                        <p className="text-sm font-bold text-[#0A0A0A]">{m[k]}cm</p>
                        <p className="text-xs text-[#9B9B9B]">{l}</p>
                      </div>
                    ) : null)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white rounded-2xl border border-black/5 p-4">
            <p className="text-sm font-bold text-[#0A0A0A] mb-3">Registrar medidas</p>
            <div className="grid grid-cols-2 gap-2">
              {[['cintura','Cintura'],['cadera','Cadera'],['pecho','Pecho'],['brazo','Brazo'],['muslo','Muslo']].map(([k,l]) => (
                <div key={k}>
                  <label className="text-xs text-[#9B9B9B] block mb-1">{l} (cm)</label>
                  <input type="number" placeholder="—" value={medidaForm[k]}
                    onChange={e => setMedidaForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
              ))}
            </div>
            <button onClick={async () => {
              const datos = Object.fromEntries(Object.entries(medidaForm).filter(([,v]) => v))
              if (!Object.keys(datos).length) return
              const { data } = await supabase.from('medidas_cliente').insert({
                cliente_id: clienteId, entrenador_id: entrenadorId,
                ...Object.fromEntries(Object.entries(datos).map(([k,v]) => [k, parseFloat(v)])),
                fecha: new Date().toISOString().split('T')[0]
              }).select().single()
              if (data) { setMedidas(prev => [data, ...prev]); setMedidaForm({ cintura:'', cadera:'', pecho:'', brazo:'', muslo:'' }); mostrarToast('✓ Medidas guardadas') }
            }} className="w-full mt-3 py-3 rounded-xl text-white text-sm font-bold" style={{ background: color }}>
              Guardar medidas
            </button>
          </div>
        </div>
      )}

      {/* Fotos */}
      {subTab === 'fotos' && (
        <div className="space-y-3">
          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f, i) => (
                <div key={i} className="aspect-square bg-[#F7F6F3] rounded-xl overflow-hidden">
                  <img src={f.url} alt={f.tipo} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
          <div className="bg-white rounded-2xl border border-black/5 p-4">
            <p className="text-sm font-bold text-[#0A0A0A] mb-3">Subir foto de progreso</p>
            <div className="flex gap-2 mb-3">
              {['frontal','lateral','espalda'].map(t => (
                <button key={t} onClick={() => setTipoFoto(t)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl capitalize transition-all ${tipoFoto === t ? 'text-white' : 'border border-black/10 text-[#6B6B6B]'}`}
                  style={tipoFoto === t ? { background: color } : {}}>
                  {t}
                </button>
              ))}
            </div>
            <input type="number" placeholder="Peso actual (kg)" value={pesoFoto}
              onChange={e => setPesoFoto(e.target.value)}
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm mb-2 focus:outline-none" />
            <label className={`w-full py-3 rounded-xl text-sm font-bold text-center block cursor-pointer ${subiendoFoto ? 'opacity-50' : ''}`}
              style={{ background: color, color: 'white' }}>
              {subiendoFoto ? '⏳ Subiendo...' : '📸 Seleccionar foto'}
              <input type="file" accept="image/*" className="hidden" disabled={subiendoFoto}
                onChange={async e => {
                  const file = e.target.files?.[0]; if (!file) return
                  setSubiendoFoto(true)
                  const ext = file.name.split('.').pop()
                  const path = `${clienteId}/${Date.now()}.${ext}`
                  const { error: upErr } = await supabase.storage.from('fotos-progreso').upload(path, file)
                  if (!upErr) {
                    const { data: { publicUrl } } = supabase.storage.from('fotos-progreso').getPublicUrl(path)
                    const { data: foto } = await supabase.from('fotos_progreso').insert({
                      cliente_id: clienteId, entrenador_id: entrenadorId,
                      url: publicUrl, tipo: tipoFoto, visible_cliente: true,
                      peso: pesoFoto ? parseFloat(pesoFoto) : null,
                      fecha: new Date().toISOString().split('T')[0]
                    }).select().single()
                    if (foto) { setFotos(prev => [foto, ...prev]); mostrarToast('✓ Foto subida') }
                  }
                  setSubiendoFoto(false)
                }} />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Mensajes ─────────────────────────────────────────────────────────────
function TabMensajes({ mensajes, setMensajes, textoMsg, setTextoMsg, enviandoMsg,
  setEnviandoMsg, color, clienteId, esNuevo, marcarVisto, mensajesEndRef }) {

  async function enviar() {
    if (!textoMsg.trim() || enviandoMsg) return
    setEnviandoMsg(true)
    await supabase.functions.invoke('portal-accion', {
      body: { accion: 'enviar_mensaje', datos: { contenido: textoMsg.trim() } }
    }).catch(() => {})
    setTextoMsg('')
    const { data } = await supabase.from('mensajes_cliente').select('*')
      .eq('cliente_id', clienteId).order('created_at', { ascending: true })
    setMensajes(data || [])
    setEnviandoMsg(false)
    setTimeout(() => mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '60vh' }}>
      {esNuevo('mensajes') && (
        <div className="bg-gradient-to-r from-[#FF5C00]/10 to-transparent border border-[#FF5C00]/20 rounded-2xl p-4 flex items-start gap-3 mb-3">
          <span className="text-xl">💬</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#0A0A0A]">Habla con tu entrenador</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">Dudas, comentarios o cualquier cosa — escríbela aquí. Responde en menos de 24h.</p>
          </div>
          <button onClick={() => marcarVisto('mensajes')} className="text-[#9B9B9B] text-sm">×</button>
        </div>
      )}
      {mensajes.length === 0 && (
        <div className="text-center py-10 flex-1 flex flex-col items-center justify-center">
          <p className="text-3xl mb-2">✉️</p>
          <p className="text-sm font-bold text-[#0A0A0A]">Aún no hay mensajes</p>
          <p className="text-xs text-[#9B9B9B] mt-1">Escríbele a tu entrenador directamente aquí</p>
        </div>
      )}
      <div className="space-y-2 flex-1">
        {mensajes.map((m, i) => (
          <div key={i} className={`flex ${m.tipo === 'cliente' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${m.tipo === 'cliente' ? 'text-white' : 'bg-white border border-black/5'}`}
              style={m.tipo === 'cliente' ? { background: color } : {}}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.contenido}</p>
              <p className={`text-[10px] mt-1 ${m.tipo === 'cliente' ? 'text-white/60' : 'text-[#9B9B9B]'}`}>
                {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={mensajesEndRef} />
      </div>
      <div className="mt-4 flex gap-2 sticky bottom-0 bg-[#F7F6F3] pt-2 pb-1">
        <input value={textoMsg} onChange={e => setTextoMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-white border border-black/10 rounded-2xl px-4 py-3 text-sm focus:outline-none" />
        <button onClick={enviar} disabled={!textoMsg.trim() || enviandoMsg}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
          style={{ background: color }}>
          {enviandoMsg ? '⏳' : '→'}
        </button>
      </div>
    </div>
  )
}

// ─── Tab Ajustes ──────────────────────────────────────────────────────────────
function TabAjustes({ cliente, color, formPerfil, setFormPerfil, guardandoPerfil,
  setGuardandoPerfil, clienteId, mostrarToast, setCliente }) {

  const OBJETIVOS = [
    { id: 'perdida_grasa', label: '🔥 Pérdida de grasa' },
    { id: 'ganancia_muscular', label: '💪 Ganar músculo' },
    { id: 'tonificacion', label: '✨ Tonificación' },
    { id: 'rendimiento', label: '🏃 Rendimiento' },
    { id: 'salud', label: '❤️ Salud general' },
  ]

  async function guardar() {
    setGuardandoPerfil(true)
    const updates = {
      peso_actual: formPerfil.peso_actual ? parseFloat(formPerfil.peso_actual) : null,
      peso_objetivo: formPerfil.peso_objetivo ? parseFloat(formPerfil.peso_objetivo) : null,
      objetivo: formPerfil.objetivo || null,
    }
    const { error } = await supabase.from('clientes').update(updates).eq('id', clienteId)
    if (!error) {
      setCliente(prev => ({ ...prev, ...updates }))
      mostrarToast('✓ Perfil actualizado')
    }
    setGuardandoPerfil(false)
  }

  return (
    <div className="space-y-3 pb-4">
      <div className="bg-white rounded-2xl border border-black/5 p-4">
        <p className="text-sm font-bold text-[#0A0A0A] mb-4">Mi perfil</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#9B9B9B] block mb-1">Nombre</label>
            <p className="text-sm font-medium text-[#0A0A0A] px-3 py-2.5 bg-[#F7F6F3] rounded-xl">{cliente.nombre}</p>
          </div>
          <div>
            <label className="text-xs text-[#9B9B9B] block mb-1">Email</label>
            <p className="text-sm font-medium text-[#0A0A0A] px-3 py-2.5 bg-[#F7F6F3] rounded-xl">{cliente.email || '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[#9B9B9B] block mb-1">Peso actual (kg)</label>
              <input type="number" step="0.1" value={formPerfil.peso_actual}
                onChange={e => setFormPerfil(f => ({ ...f, peso_actual: e.target.value }))}
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-[#9B9B9B] block mb-1">Peso objetivo (kg)</label>
              <input type="number" step="0.1" value={formPerfil.peso_objetivo}
                onChange={e => setFormPerfil(f => ({ ...f, peso_objetivo: e.target.value }))}
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#9B9B9B] block mb-2">Mi objetivo</label>
            <div className="space-y-1.5">
              {OBJETIVOS.map(o => (
                <button key={o.id} onClick={() => setFormPerfil(f => ({ ...f, objetivo: o.id }))}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${formPerfil.objetivo === o.id ? 'text-white border-transparent' : 'border-black/10 text-[#6B6B6B] bg-white'}`}
                  style={formPerfil.objetivo === o.id ? { background: color, borderColor: color } : {}}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={guardar} disabled={guardandoPerfil}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
            style={{ background: color }}>
            {guardandoPerfil ? '⏳ Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-4">
        <p className="text-sm font-bold text-[#0A0A0A] mb-3">Cuenta</p>
        <button onClick={() => supabase.auth.resetPasswordForEmail(cliente.email, {
          redirectTo: window.location.origin + '/portal'
        }).then(() => alert('Email enviado para cambiar contraseña'))}
          className="w-full border border-black/10 text-sm py-3 rounded-xl text-[#6B6B6B] font-medium hover:bg-[#F7F6F3] transition-all">
          Cambiar contraseña
        </button>
        <button onClick={() => supabase.auth.signOut()}
          className="w-full mt-2 border border-red-100 text-sm py-3 rounded-xl text-red-500 font-medium hover:bg-red-50 transition-all">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

// ─── Pagos ────────────────────────────────────────────────────────────────────
function PagosCliente({ cliente, pagos, color }) {
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState('')

  const tieneStripe = !!cliente?.stripe_customer_id
  const ultimoPago = pagos?.[0]
  const diasVencimiento = ultimoPago && !tieneStripe ? (() => {
    const v = new Date(ultimoPago.fecha_pago)
    v.setMonth(v.getMonth() + 1)
    return Math.ceil((v - new Date()) / 864e5)
  })() : null

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-black/5 p-4">
        <p className="text-sm font-bold text-[#0A0A0A] mb-3">Mi plan</p>
        {tieneStripe ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">✓ Suscripción activa</span>
            </div>
            <button onClick={async () => {
              setAbriendo(true); setError('')
              const { data, error } = await supabase.functions.invoke('stripe-portal-cliente')
              if (error || !data?.url) setError('No se pudo abrir el portal de pagos')
              else window.open(data.url, '_blank')
              setAbriendo(false)
            }} disabled={abriendo}
              className="w-full border border-black/10 text-sm py-3 rounded-xl text-[#6B6B6B] font-medium disabled:opacity-40">
              {abriendo ? '...' : 'Gestionar suscripción →'}
            </button>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </>
        ) : (
          <p className="text-sm text-[#6B6B6B]">Tu entrenador gestiona tus pagos manualmente</p>
        )}
        {diasVencimiento !== null && (
          <div className={`mt-3 text-xs px-3 py-2 rounded-xl ${diasVencimiento <= 7 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
            {diasVencimiento > 0 ? `Próximo pago en ${diasVencimiento} días` : 'Pago vencido — habla con tu entrenador'}
          </div>
        )}
      </div>
      {pagos.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5">
            <p className="text-sm font-bold text-[#0A0A0A]">Historial de pagos</p>
          </div>
          <div className="divide-y divide-black/4">
            {pagos.slice(0, 6).map((p, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">{new Date(p.fecha_pago + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  {p.concepto && <p className="text-xs text-[#9B9B9B]">{p.concepto}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color }}>{p.importe}€</p>
                  <span className={`text-xs ${p.estado === 'pagado' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {p.estado === 'pagado' ? '✓ Pagado' : 'Pendiente'}
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
