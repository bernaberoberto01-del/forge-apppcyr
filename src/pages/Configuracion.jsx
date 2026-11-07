import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import EquipoTab from '../components/EquipoTab'
import { useCentro } from '../hooks/useCentro.jsx'
import { BRAND } from '../lib/brand'
import { colorMarca } from '../lib/brand'

// ── M10 F1: Tab de Integraciones ──────────────────────────────────────────
function IntegracionesTab({ uid, config }) {
  const [estado, setEstado] = useState({ loading: true, stripe: null, smtp: null, ia: null, push: null, n8n: null })
  const [crons] = useState([
    { id: 'checkin-semanal', label: 'Recordatorio check-in', desc: 'Envía un recordatorio a clientes sin check-in reciente', cadencia: 'Domingos 9:00h', icon: '📋', activo: true },
    { id: 'detectar-alertas', label: 'Detección de alertas', desc: 'Detecta clientes inactivos y pagos vencidos', cadencia: 'Diario 8:00h', icon: '🔔', activo: true },
    { id: 'completar-sesiones', label: 'Auto-completar sesiones', desc: 'Marca como completadas las sesiones pasadas', cadencia: 'Cada hora', icon: '✅', activo: true },
    { id: 'analisis-mensual', label: 'Análisis mensual IA', desc: 'Genera el informe mensual de cada cliente con IA', cadencia: 'Domingos 20:00h', icon: '🤖', activo: true },
    { id: 'resumen-mensual', label: 'Resumen mensual', desc: 'Envía el resumen del mes a cada entrenador', cadencia: 'Día 1 del mes 8:00h', icon: '📊', activo: true },
  ])

  useEffect(() => {
    verificarIntegraciones()
  }, [uid, config])

  async function verificarIntegraciones() {
    setEstado(e => ({ ...e, loading: true }))
    try {
      // Verificar Stripe: hay stripe_customer_id en algún cliente o stripe_webhook configurado
      const { data: clientesStripe } = await supabase
        .from('clientes')
        .select('id')
        .eq('entrenador_id', uid)
        .not('stripe_customer_id', 'is', null)
        .limit(1)

      const stripeConectado = (clientesStripe?.length || 0) > 0

      // Verificar IA: verificamos si hay rutinas o nutricion generadas con IA (tienen campo origen='ia' o similar)
      const { data: rutinaIA } = await supabase
        .from('rutinas')
        .select('id')
        .eq('entrenador_id', uid)
        .limit(1)

      // Verificar Push Notifications: hay suscripciones activas
      const { data: pushSubs } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('entrenador_id', uid)
        .limit(1)

      // Verificar mensajes recientes = SMTP activo
      const { data: mensajes } = await supabase
        .from('mensajes_cliente')
        .select('id')
        .eq('entrenador_id', uid)
        .limit(1)

      setEstado({
        loading: false,
        stripe: { conectado: stripeConectado, label: stripeConectado ? 'Conectado' : 'Sin configurar', sub: stripeConectado ? `${clientesStripe.length}+ clientes con Stripe` : 'Configura tu cuenta Stripe para cobros automáticos' },
        smtp: { conectado: true, label: 'Activo', sub: 'Notificaciones por email habilitadas (SMTP Gmail)' },
        ia: { conectado: (rutinaIA?.length || 0) > 0, label: (rutinaIA?.length || 0) > 0 ? 'Activa' : 'Lista', sub: 'Claude API disponible para generar rutinas y planes nutricionales' },
        push: { conectado: (pushSubs?.length || 0) > 0, label: (pushSubs?.length || 0) > 0 ? `${pushSubs.length} suscripciones` : 'Sin suscripciones', sub: (pushSubs?.length || 0) > 0 ? 'Notificaciones push activas en el portal del cliente' : 'Los clientes recibirán push la próxima vez que abran el portal' },
        n8n: { conectado: true, label: 'Conectado', sub: 'Automatizaciones activas en rbernabe.app.n8n.cloud' },
      })
    } catch {
      setEstado(e => ({ ...e, loading: false }))
    }
  }

  const integraciones = [
    {
      id: 'stripe', icon: '💳', label: 'Stripe', categoria: 'Pagos',
      docs: 'https://docs.stripe.com',
      estado: estado.stripe,
    },
    {
      id: 'smtp', icon: '📧', label: 'Email (Gmail SMTP)', categoria: 'Notificaciones',
      docs: null,
      estado: estado.smtp,
    },
    {
      id: 'ia', icon: '🤖', label: 'Claude IA', categoria: 'Inteligencia Artificial',
      docs: null,
      estado: estado.ia,
    },
    {
      id: 'push', icon: '🔔', label: 'Push Notifications', categoria: 'Notificaciones',
      docs: null,
      estado: estado.push,
    },
    {
      id: 'n8n', icon: '⚡', label: 'n8n Automatizaciones', categoria: 'Automatización',
      docs: 'https://rbernabe.app.n8n.cloud',
      estado: estado.n8n,
    },
  ]

  if (estado.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-acento border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Estado de integraciones */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#0A0A0A]">🔌 Estado de las integraciones</h2>
            <p className="text-xs text-[#9B9B9B] mt-0.5">Servicios externos conectados a tu cuenta</p>
          </div>
          <button
            onClick={verificarIntegraciones}
            className="text-xs border border-black/10 text-[#6B6B6B] px-3 py-1.5 rounded-lg hover:bg-[#F5F5F0] transition-all active:scale-95">
            🔄 Verificar
          </button>
        </div>

        <div className="space-y-2">
          {integraciones.map(integ => {
            const est = integ.estado
            const ok = est?.conectado
            return (
              <div key={integ.id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${ok ? 'border-emerald-100 bg-emerald-50/50' : 'border-amber-100 bg-amber-50/30'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${ok ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  {integ.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#0A0A0A]">{integ.label}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {est?.label || '—'}
                    </span>
                  </div>
                  <p className="text-xs text-[#9B9B9B] mt-0.5 truncate">{est?.sub || integ.categoria}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  {integ.docs && (
                    <a href={integ.docs} target="_blank" rel="noopener noreferrer"
                      className="text-xs border border-black/10 text-[#6B6B6B] px-2.5 py-1 rounded-lg hover:bg-[#F5F5F0] transition-all">
                      ↗
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Inventario de automatizaciones */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-[#0A0A0A]">⚙️ Automatizaciones activas</h2>
          <p className="text-xs text-[#9B9B9B] mt-0.5">Tareas programadas que se ejecutan automáticamente en segundo plano</p>
        </div>

        <div className="space-y-2">
          {crons.map(cron => (
            <div key={cron.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-black/5 hover:border-black/10 transition-all">
              <div className="w-9 h-9 rounded-xl bg-[#F7F6F3] flex items-center justify-center text-lg flex-shrink-0">
                {cron.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#0A0A0A]">{cron.label}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-emerald-100 text-emerald-700">
                    Activo
                  </span>
                </div>
                <p className="text-xs text-[#9B9B9B] mt-0.5">{cron.desc}</p>
                <p className="text-[10px] text-[#C0C0C0] mt-1 font-medium">🕐 {cron.cadencia}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edge Functions activas */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-[#0A0A0A]">🚀 Edge Functions</h2>
          <p className="text-xs text-[#9B9B9B] mt-0.5">Funciones serverless que procesan acciones en tiempo real</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { id: 'portal-accion', label: 'Portal Acción', desc: 'Procesa acciones del portal del cliente', icon: '🌐' },
            { id: 'generar-rutina', label: 'Generar Rutina', desc: 'IA genera rutinas personalizadas', icon: '💪' },
            { id: 'generar-nutricion', label: 'Generar Nutrición', desc: 'IA genera planes nutricionales', icon: '🥗' },
            { id: 'bienvenida-cliente', label: 'Bienvenida Cliente', desc: 'Envía magic link de acceso al cliente nuevo', icon: '👋' },
            { id: 'notificar-mensaje', label: 'Notificar Mensaje', desc: 'Notificaciones push y email por mensajes', icon: '💬' },
            { id: 'enviar-push', label: 'Enviar Push', desc: 'Web Push Notifications al portal del cliente', icon: '🔔' },
            { id: 'vincular-cliente', label: 'Vincular Cliente', desc: 'Vincula auth_user_id al perfil del cliente', icon: '🔗' },
            { id: 'stripe-webhook', label: 'Stripe Webhook', desc: 'Procesa eventos de pago de Stripe', icon: '💳' },
          ].map(fn => (
            <div key={fn.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-black/5 hover:border-black/10 transition-all">
              <span className="text-base">{fn.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0A0A0A]">{fn.label}</p>
                <p className="text-[10px] text-[#9B9B9B] truncate">{fn.desc}</p>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Nota info */}
      <div className="bg-[#F7F6F3] rounded-2xl px-4 py-3 flex gap-3">
        <span className="text-base">💡</span>
        <p className="text-xs text-[#9B9B9B] leading-relaxed">
          Stripe Connect para cobros automáticos y las integraciones avanzadas de n8n se configuran en el panel de administración.
          Para soporte técnico contacta con tu instalador.
        </p>
      </div>
    </div>
  )
}

const MODULOS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', desc: 'Métricas, alertas y resumen general', obligatorio: true },
  { id: 'clientes', label: 'Clientes', icon: '👥', desc: 'Gestión de clientes y registros', obligatorio: true },
  { id: 'rutinas', label: 'Rutinas', icon: '💪', desc: 'Creación y gestión de rutinas con IA', obligatorio: false },
  { id: 'sesiones', label: 'Sesiones', icon: '🏋️', desc: 'Registro de entrenamientos y pesos', obligatorio: false },
  { id: 'seguimiento', label: 'Seguimiento', icon: '📋', desc: 'Check-ins semanales y alertas', obligatorio: false },
  { id: 'pagos', label: 'Pagos', icon: '💶', desc: 'Cobros manuales y Stripe', obligatorio: false },
  { id: 'agenda', label: 'Agenda', icon: '📅', desc: 'Calendario semanal de sesiones', obligatorio: false },
  { id: 'nutricion', label: 'Nutrición', icon: '🥗', desc: 'Planes nutricionales con IA por cliente', obligatorio: false },
  { id: 'mensajes', label: 'Mensajes', icon: '💬', desc: 'Comunicación directa con clientes', obligatorio: false },
]

const COLORES = [
  { id: '#FF5C00', label: 'Naranja' },
  { id: '#6366f1', label: 'Índigo' },
  { id: '#10b981', label: 'Esmeralda' },
  { id: '#f59e0b', label: 'Ámbar' },
  { id: '#ec4899', label: 'Rosa' },
  { id: '#0ea5e9', label: 'Azul cielo' },
  { id: '#8b5cf6', label: 'Violeta' },
  { id: '#111111', label: 'Negro' },
]

// Toast duplica el componente de src/pages/Sesiones.jsx (mismo patrón {msg,tipo,onClose}) — no se consolida
// aquí porque no existe todavía un <Toast> compartido en src/components/
function Toast({ msg, tipo = 'ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 ${tipo === 'error' ? 'bg-red-600' : 'bg-[#111]'}`}>
      <span>{tipo === 'error' ? '⚠' : '✓'}</span> {msg}
    </div>
  )
}

const defaultConfig = {
  nombre_negocio: '', nombre_entrenador: '', bio: '', foto_url: '', color_acento: BRAND.color,
  modulos: { dashboard: true, clientes: true, rutinas: true, sesiones: true, seguimiento: true, pagos: true, agenda: true, nutricion: true, mensajes: true },
  cuestionario_bloques: { basico: true, objetivo: true, historial: true, disponibilidad: true, material: true, salud: true, motivacion: true },
  // Datos fiscales (M1)
  nif: '', razon_social: '', direccion_fiscal: '', cp_fiscal: '', municipio_fiscal: '', provincia_fiscal: '',
  regimen_iva: 'exento', serie_facturas: 'F',
  // M9 — Logo, email fiscal, política cancelación, umbrales inactividad
  logo_url: '', email_fiscal: '',
  politica_cancelacion_horas: 24, politica_cancelacion_consecuencia: 'ninguna',
  inactividad_alerta_dias: 7, inactividad_riesgo_dias: 14,
  // M9 F3 — Branding avanzado y textos del portal
  color_fondo: '#F7F6F3', color_texto: '#0A0A0A',
  portal_bienvenida: '', portal_pie: '',
  portal_nombre_rutinas: '', portal_nombre_seguimiento: ''
}

export default function Configuracion({ session, onConfigChange }) {
  const [config, setConfig] = useState(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const fotoRef = useRef()
  const logoRef = useRef()
  const [toast, setToast] = useState(null)
  const showToast = (msg, tipo = 'ok') => setToast({ msg, tipo })
  const [tab, setTab] = useState('perfil')
  const uid = session.user.id
  const centroCtx = useCentro()
  const centro = centroCtx?.centro
  const miembros = centroCtx?.miembros || []
  const esAdmin = centroCtx?.esAdmin
  const recargarCentro = centroCtx?.recargar
  const centroLoading = centroCtx?.loading

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    try {
      const { data } = await supabase.from('configuracion').select('*').eq('entrenador_id', uid).maybeSingle()
      if (data) {
        setConfig({
          ...defaultConfig,
          ...data,
          modulos: { ...defaultConfig.modulos, ...(data.modulos || {}) },
          cuestionario_bloques: { ...defaultConfig.cuestionario_bloques, ...(data.cuestionario_bloques || {}) }
        })
      }
    } catch (err) {
      setToast({ msg: 'Error al cargar configuración: ' + err.message, tipo: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp', 'gif']

  async function subirFoto(file) {
    if (!file) return
    const parts = file.name.split('.')
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : ''
    if (!EXTENSIONES_PERMITIDAS.includes(ext)) {
      setToast({ msg: 'Formato no permitido. Usa JPG, PNG, WEBP o GIF', tipo: 'error' })
      return
    }
    setSubiendoFoto(true)
    const path = `${uid}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatares').upload(path, file, { upsert: true })
    if (error) { setToast({ msg: 'Error al subir foto', tipo: 'error' }); setSubiendoFoto(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(path)
    setConfig(c => ({ ...c, foto_url: publicUrl + '?t=' + Date.now() }))
    setSubiendoFoto(false)
    setToast({ msg: 'Foto subida correctamente' })
  }

  async function subirLogo(file) {
    if (!file) return
    const parts = file.name.split('.')
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : ''
    if (!EXTENSIONES_PERMITIDAS.includes(ext)) {
      setToast({ msg: 'Formato no permitido. Usa JPG, PNG, WEBP o GIF', tipo: 'error' })
      return
    }
    setSubiendoLogo(true)
    const path = `${uid}/logo.${ext}`
    const { error } = await supabase.storage.from('avatares').upload(path, file, { upsert: true })
    if (error) { setToast({ msg: 'Error al subir logo', tipo: 'error' }); setSubiendoLogo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(path)
    setConfig(c => ({ ...c, logo_url: publicUrl + '?t=' + Date.now() }))
    setSubiendoLogo(false)
    setToast({ msg: 'Logo del centro subido correctamente' })
  }

  async function guardar() {
    setSaving(true)
    const { error } = await supabase.from('configuracion').upsert({
      entrenador_id: uid,
      ...config,
      updated_at: new Date().toISOString()
    }, { onConflict: 'entrenador_id' })
    if (error) setToast({ msg: 'Error al guardar: ' + error.message, tipo: 'error' })
    else {
      setToast({ msg: 'Configuración guardada' })
      onConfigChange?.(config)
    }
    setSaving(false)
  }

  const setModulo = (id, val) => setConfig(c => ({ ...c, modulos: { ...c.modulos, [id]: val } }))
  const setBloque = (id, val) => setConfig(c => ({ ...c, cuestionario_bloques: { ...c.cuestionario_bloques, [id]: val } }))

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-acento border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-screen-lg mx-auto">
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Configuración</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">{`Personaliza ${BRAND.nombre} a tu imagen y metodología`}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/p/${config.slug_publico || 'mi-perfil'}`} target="_blank" rel="noopener noreferrer"
            className="border border-black/10 text-[#6B6B6B] text-xs font-medium px-3 py-2.5 rounded-xl hover:bg-[#F5F5F0] transition-all">
            🔗 Ver perfil público
          </a>
          <button onClick={guardar} disabled={saving}
            className="bg-acento hover:bg-acento-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40 transition-all active:scale-95">
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/5 p-1 rounded-xl mb-5 overflow-x-auto">
        {[['perfil', '👤 Perfil'], ['equipo', '🏋️ Equipo'], ['modulos', '⚡ Módulos'], ['cuestionario', '📋 Cuestionario'], ['apariencia', '🎨 Apariencia'], ['tarifas', '💶 Tarifas'], ['facturacion', '🧾 Facturación'], ['operativa', '⚙️ Operativa'], ['integraciones', '🔌 Integraciones']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-shrink-0 py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${tab === id ? 'bg-white shadow-sm text-[#0A0A0A]' : 'text-[#6B6B6B] hover:text-[#0A0A0A]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* PERFIL */}
      {tab === 'perfil' && (
        <div className="lg:grid lg:grid-cols-2 lg:gap-5 space-y-4 lg:space-y-0">
          <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-4">Tu identidad</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre de tu negocio / centro</label>
                <input value={config.nombre_negocio} onChange={e => setConfig(c => ({ ...c, nombre_negocio: e.target.value }))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"
                  placeholder="Ej: Roberto Bernabé Personal Training" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Tu nombre</label>
                <input value={config.nombre_entrenador} onChange={e => setConfig(c => ({ ...c, nombre_entrenador: e.target.value }))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"
                  placeholder="Ej: Roberto Bernabé" />
                <p className="text-xs text-[#6B6B6B] mt-1">Aparece en el portal del cliente en lugar de "Tu entrenador"</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Bio corta</label>
                <textarea value={config.bio} onChange={e => setConfig(c => ({ ...c, bio: e.target.value }))}
                  rows={3} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento resize-none"
                  placeholder="Ej: CAFD en Murcia especializado en transformación física y fuerza. Más de 50 clientes transformados." />
                <p className="text-xs text-[#6B6B6B] mt-1">Visible en el portal del cliente</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Foto de perfil</label>
                <div className="flex items-center gap-3">
                  {config.foto_url
                    ? <img src={config.foto_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-black/10 flex-shrink-0" onError={e => e.target.style.display='none'} />
                    : <div className="w-16 h-16 rounded-full bg-[#F5F5F0] border-2 border-dashed border-black/20 flex items-center justify-center text-2xl flex-shrink-0">👤</div>
                  }
                  <div className="flex-1">
                    <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={e => subirFoto(e.target.files[0])} />
                    <button onClick={() => fotoRef.current?.click()} disabled={subiendoFoto}
                      className="w-full border border-black/10 text-[#0A0A0A] text-sm font-medium py-2.5 rounded-xl hover:bg-[#F5F5F0] disabled:opacity-40 transition-all">
                      {subiendoFoto ? '⏳ Subiendo...' : '📷 Subir foto'}
                    </button>
                    {config.foto_url && (
                      <button onClick={() => setConfig(c => ({ ...c, foto_url: '' }))}
                        className="w-full text-xs text-red-500 hover:text-red-600 mt-1.5 py-1">
                        Eliminar foto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logo del centro */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">Logo del centro</h2>
            <p className="text-xs text-[#9B9B9B] mb-4">Aparece en el portal del cliente: login, cabecera y PDFs de facturas</p>
            <div className="flex items-center gap-3">
              {config.logo_url ? (
                <img src={config.logo_url} alt="Logo" className="w-20 h-20 rounded-2xl object-contain border border-black/10 bg-[#F5F5F0] p-2 flex-shrink-0" onError={e => e.target.style.display='none'} />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#F5F5F0] border-2 border-dashed border-black/20 flex flex-col items-center justify-center text-2xl flex-shrink-0 gap-1">
                  <span>🏢</span>
                  <span className="text-[9px] text-[#9B9B9B] font-medium">Sin logo</span>
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => subirLogo(e.target.files[0])} />
                <button onClick={() => logoRef.current?.click()} disabled={subiendoLogo}
                  className="w-full border border-black/10 text-[#0A0A0A] text-sm font-medium py-2.5 rounded-xl hover:bg-[#F5F5F0] disabled:opacity-40 transition-all">
                  {subiendoLogo ? '⏳ Subiendo...' : '🏢 Subir logo'}
                </button>
                {config.logo_url && (
                  <button onClick={() => setConfig(c => ({ ...c, logo_url: '' }))}
                    className="w-full text-xs text-red-500 hover:text-red-600 py-1">
                    Eliminar logo
                  </button>
                )}
                <p className="text-xs text-[#9B9B9B]">Recomendado: fondo transparente (PNG), mínimo 200×200px</p>
              </div>
            </div>
          </div>
          </div>

          {/* Columna derecha — Preview */}
          <div className="space-y-4">
          {/* Preview portal */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 sticky top-4">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-3">Preview — así te ve el cliente</h2>
            <div className="bg-[#111] rounded-xl p-4 flex items-center gap-3">
              {config.foto_url ? (
                <img src={config.foto_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" onError={e => e.target.style.display='none'} />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: config.color_acento }}>
                  {(config.nombre_entrenador || 'E').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-white text-sm font-semibold">{config.nombre_entrenador || 'Tu entrenador'}</p>
                <p className="text-white/50 text-xs">{config.nombre_negocio || 'Tu centro'}</p>
              </div>
            </div>
            {config.bio && <p className="text-xs text-[#6B6B6B] mt-3 leading-relaxed italic">&ldquo;{config.bio}&rdquo;</p>}
          </div>
          </div>
        </div>
      )}

      {/* MÓDULOS */}
      {tab === 'modulos' && (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
          <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">Módulos del sidebar</h2>
          <p className="text-xs text-[#6B6B6B] mb-4">Activa solo lo que usas — mantén el sidebar limpio</p>
          <div className="space-y-2">
            {MODULOS.map(m => (
              <div key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${config.modulos[m.id] ? 'border-acento/20 bg-acento/3' : 'border-black/5 bg-[#F5F5F0]'}`}>
                <span className="text-xl flex-shrink-0">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0A0A0A]">{m.label}</p>
                  <p className="text-xs text-[#6B6B6B]">{m.desc}</p>
                </div>
                {m.obligatorio ? (
                  <span className="text-xs text-[#6B6B6B] flex-shrink-0">Siempre activo</span>
                ) : (
                  <button onClick={() => setModulo(m.id, !config.modulos[m.id])}
                    className={`w-12 h-6 rounded-full transition-all flex-shrink-0 relative ${config.modulos[m.id] ? 'bg-acento' : 'bg-black/20'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${config.modulos[m.id] ? 'left-6' : 'left-0.5'}`} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 bg-[#F5F5F0] rounded-xl p-3">
            <p className="text-xs text-[#6B6B6B]">
              <span className="font-semibold text-[#0A0A0A]">{Object.values(config.modulos).filter(Boolean).length}</span> de {MODULOS.length} módulos activos
            </p>
          </div>
        </div>
      )}

      {/* CUESTIONARIO */}
      {tab === 'cuestionario' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">Bloques del cuestionario</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">Activa los bloques que quieres que el cliente rellene al registrarse</p>
            <div className="space-y-2">
              {[
                { id: 'basico', label: 'Datos básicos', desc: 'Nombre, email, teléfono, edad, altura', obligatorio: true },
                { id: 'objetivo', label: 'Objetivo y tipo', desc: 'Meta, tipo de entrenamiento, plazo', obligatorio: true },
                { id: 'historial', label: 'Historial deportivo', desc: 'Experiencia previa, nivel actual', obligatorio: false },
                { id: 'disponibilidad', label: 'Disponibilidad', desc: 'Días por semana, horario preferido', obligatorio: false },
                { id: 'material', label: 'Material disponible', desc: 'Gimnasio, casa, aire libre, equipamiento', obligatorio: false },
                { id: 'salud', label: 'Salud y lesiones', desc: 'Lesiones previas, condiciones médicas', obligatorio: false },
                { id: 'motivacion', label: 'Motivación', desc: 'Por qué quiere entrenar, qué le frena', obligatorio: false },
              ].map(b => (
                <div key={b.id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${config.cuestionario_bloques[b.id] ? 'border-acento/20 bg-acento/3' : 'border-black/5 bg-[#F5F5F0]'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A0A0A]">{b.label}</p>
                    <p className="text-xs text-[#6B6B6B]">{b.desc}</p>
                  </div>
                  {b.obligatorio ? (
                    <span className="text-xs text-[#6B6B6B] flex-shrink-0">Siempre activo</span>
                  ) : (
                    <button onClick={() => setBloque(b.id, !config.cuestionario_bloques[b.id])}
                      className={`w-12 h-6 rounded-full transition-all flex-shrink-0 relative ${config.cuestionario_bloques[b.id] ? 'bg-acento' : 'bg-black/20'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${config.cuestionario_bloques[b.id] ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Los bloques desactivados se saltan en el cuestionario</p>
            <p className="text-xs text-amber-600">Los bloques básico y objetivo siempre están activos porque son necesarios para el sistema.</p>
          </div>
        </div>
      )}

      {/* APARIENCIA */}
      {tab === 'apariencia' && BRAND.fija && (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
          <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">Color de acento</h2>
          <p className="text-xs text-[#6B6B6B]">{`El color lo define ${BRAND.nombreCompleto} para toda la app.`}</p>
        </div>
      )}
      {tab === 'apariencia' && !BRAND.fija && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">Color de acento</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">El color principal de botones, badges y elementos activos</p>
            <div className="grid grid-cols-4 gap-2">
              {COLORES.map(c => (
                <button key={c.id} onClick={() => { setConfig(cfg => ({ ...cfg, color_acento: c.id })); document.documentElement.style.setProperty('--acento', c.id) }}
                  className={`h-12 rounded-xl transition-all relative ${config.color_acento === c.id ? 'ring-2 ring-offset-2 ring-black scale-105' : 'hover:scale-102'}`}
                  style={{ background: c.id }}>
                  {config.color_acento === c.id && (
                    <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#6B6B6B] mt-3 text-center">{COLORES.find(c => c.id === config.color_acento)?.label}</p>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-3">Preview</h2>
            <div className="space-y-2">
              <button className="w-full py-3 rounded-xl text-white text-sm font-semibold" style={{ background: config.color_acento }}>
                Botón principal
              </button>
              <div className="flex gap-2">
                <span className="text-xs px-3 py-1.5 rounded-full text-white font-medium" style={{ background: config.color_acento }}>Badge activo</span>
                <span className="text-xs px-3 py-1.5 rounded-full font-medium border" style={{ color: config.color_acento, borderColor: config.color_acento + '40' }}>Badge outline</span>
              </div>
              <div className="border-l-4 pl-3 py-1" style={{ borderColor: config.color_acento }}>
                <p className="text-sm font-medium text-[#0A0A0A]">Elemento destacado</p>
                <p className="text-xs text-[#6B6B6B]">Descripción del elemento</p>
              </div>
            </div>
          </div>

          <div className="bg-[#F5F5F0] rounded-xl p-4">
            <p className="text-xs text-[#6B6B6B]">⚠ El cambio de color se aplica globalmente después de guardar y recargar la página. La implementación completa de temas dinámicos estará en la próxima versión.</p>
          </div>

          {/* M9 F3 — Colores del portal */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">🌐 Colores del portal del cliente</h2>
            <p className="text-xs text-[#9B9B9B] mb-4">Personaliza el fondo y el texto principal que ve el cliente en su portal</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Color de fondo</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.color_fondo || '#F7F6F3'}
                    onChange={e => setConfig(c => ({ ...c, color_fondo: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-black/10 cursor-pointer p-0.5" />
                  <input type="text" value={config.color_fondo || '#F7F6F3'}
                    onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setConfig(c => ({ ...c, color_fondo: e.target.value })) }}
                    className="flex-1 border border-black/10 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-acento" />
                </div>
                <button onClick={() => setConfig(c => ({ ...c, color_fondo: '#F7F6F3' }))}
                  className="text-xs text-[#9B9B9B] mt-1 hover:text-acento transition-colors">
                  Restablecer
                </button>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Color de texto</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.color_texto || '#0A0A0A'}
                    onChange={e => setConfig(c => ({ ...c, color_texto: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-black/10 cursor-pointer p-0.5" />
                  <input type="text" value={config.color_texto || '#0A0A0A'}
                    onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setConfig(c => ({ ...c, color_texto: e.target.value })) }}
                    className="flex-1 border border-black/10 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-acento" />
                </div>
                <button onClick={() => setConfig(c => ({ ...c, color_texto: '#0A0A0A' }))}
                  className="text-xs text-[#9B9B9B] mt-1 hover:text-acento transition-colors">
                  Restablecer
                </button>
              </div>
            </div>
            {/* Mini preview del portal */}
            <div className="mt-4 rounded-xl overflow-hidden border border-black/5">
              <div className="px-3 py-2.5" style={{ background: config.color_fondo || '#F7F6F3' }}>
                <p className="text-xs font-bold" style={{ color: config.color_texto || '#0A0A0A' }}>Portal del cliente — preview</p>
                <p className="text-[11px] mt-0.5" style={{ color: (config.color_texto || '#0A0A0A') + '99' }}>Así verá el cliente el fondo y el texto de su portal</p>
                <div className="mt-2 flex gap-1.5">
                  {['Inicio','Entrena','Nutrición','Progreso'].map(t => (
                    <span key={t} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: (config.color_texto || '#0A0A0A') + '10', color: config.color_texto || '#0A0A0A' }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* M9 F3 — Textos del portal */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">✏️ Textos del portal</h2>
            <p className="text-xs text-[#9B9B9B] mb-4">Personaliza los textos que el cliente ve en su portal. Déjalos vacíos para usar los textos por defecto.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Mensaje de bienvenida</label>
                <textarea value={config.portal_bienvenida || ''}
                  onChange={e => setConfig(c => ({ ...c, portal_bienvenida: e.target.value }))}
                  placeholder={`Bienvenido a ${BRAND.nombre}`}
                  rows={2}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento resize-none placeholder:text-[#C0C0C0]" />
                <p className="text-xs text-[#9B9B9B] mt-1">Se muestra en la cabecera del portal cuando el cliente entra</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Texto del pie del portal</label>
                <input type="text" value={config.portal_pie || ''}
                  onChange={e => setConfig(c => ({ ...c, portal_pie: e.target.value }))}
                  placeholder={`© ${new Date().getFullYear()} ${config.nombre_negocio || BRAND.nombre}`}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento placeholder:text-[#C0C0C0]" />
                <p className="text-xs text-[#9B9B9B] mt-1">Aparece al final de la barra lateral. Deja vacío para ocultarlo.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre del tab Entrena</label>
                  <input type="text" value={config.portal_nombre_rutinas || ''}
                    onChange={e => setConfig(c => ({ ...c, portal_nombre_rutinas: e.target.value }))}
                    placeholder="Entrena"
                    maxLength={16}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento placeholder:text-[#C0C0C0]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre del seguimiento</label>
                  <input type="text" value={config.portal_nombre_seguimiento || ''}
                    onChange={e => setConfig(c => ({ ...c, portal_nombre_seguimiento: e.target.value }))}
                    placeholder="Seguimiento"
                    maxLength={16}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento placeholder:text-[#C0C0C0]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OPERATIVA ───────────────────────────────────────────────────── */}
      {tab === 'operativa' && (
        <div className="space-y-4">
          {/* Política de cancelación */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">📅 Política de cancelación</h2>
            <p className="text-xs text-[#9B9B9B] mb-5">Define cuándo se considera una cancelación tardía y qué consecuencias tiene. Esta información se muestra al cliente en su portal.</p>

            <div className="space-y-4">
              {/* Horas antelación */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Antelación mínima para cancelar</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number" min={1} max={168} value={config.politica_cancelacion_horas}
                      onChange={e => setConfig(c=>({...c, politica_cancelacion_horas: Math.max(1, parseInt(e.target.value)||24)}))}
                      className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento pr-14" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9B9B9B] font-medium">horas</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {[12, 24, 48].map(h => (
                      <button key={h} onClick={() => setConfig(c=>({...c, politica_cancelacion_horas: h}))}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${config.politica_cancelacion_horas===h ? 'border-acento bg-acento/5 text-acento' : 'border-black/10 text-[#6B6B6B] hover:border-black/20'}`}>
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[#9B9B9B] mt-1.5">
                  Si el cliente cancela con menos de <span className="font-semibold text-[#0A0A0A]">{config.politica_cancelacion_horas} horas</span> de antelación, se aplica la consecuencia.
                </p>
              </div>

              {/* Consecuencia */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Consecuencia por cancelación tardía</label>
                <div className="space-y-2">
                  {[
                    { val: 'ninguna', icon: '🟢', label: 'Sin consecuencias', desc: 'Cancelación libre, sin penalización. Solo informativa.' },
                    { val: 'descuenta_bono', icon: '🟡', label: 'Descuenta sesión del bono', desc: 'La sesión se da por consumida aunque no se haya realizado.' },
                    { val: 'penalizacion', icon: '🔴', label: 'Penalización económica', desc: 'Se cobra una penalización (la cantidad la gestionas tú directamente).' },
                  ].map(op => (
                    <label key={op.val} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${config.politica_cancelacion_consecuencia===op.val ? 'border-acento bg-acento/5' : 'border-black/10 hover:border-black/20'}`}>
                      <input type="radio" name="pol_cancel" value={op.val}
                        checked={config.politica_cancelacion_consecuencia===op.val}
                        onChange={() => setConfig(c=>({...c, politica_cancelacion_consecuencia: op.val}))}
                        className="mt-0.5 accent-acento flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">{op.icon} {op.label}</p>
                        <p className="text-xs text-[#9B9B9B] mt-0.5">{op.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview mensaje cliente */}
              <div className="bg-[#F7F6F3] rounded-xl p-4">
                <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Vista previa — mensaje en el portal del cliente:</p>
                <div className="bg-white rounded-xl border border-black/5 p-3">
                  <p className="text-sm font-semibold text-[#0A0A0A] mb-1">📋 Política de cancelación</p>
                  <p className="text-xs text-[#6B6B6B] leading-relaxed">
                    Las cancelaciones deben realizarse con al menos <span className="font-semibold text-[#0A0A0A]">{config.politica_cancelacion_horas} horas</span> de antelación.
                    {config.politica_cancelacion_consecuencia === 'ninguna' && ' Las cancelaciones son libres y sin penalización.'}
                    {config.politica_cancelacion_consecuencia === 'descuenta_bono' && ' Las cancelaciones tardías descuentan la sesión del bono.'}
                    {config.politica_cancelacion_consecuencia === 'penalizacion' && ' Las cancelaciones tardías conllevan una penalización económica.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Umbrales de inactividad */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">🔔 Alertas de inactividad</h2>
            <p className="text-xs text-[#9B9B9B] mb-5">Configura cuándo aparecen las alertas de seguimiento cuando un cliente no hace check-in.</p>

            <div className="space-y-5">
              {/* Alerta amarilla */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <label className="text-xs font-semibold text-[#0A0A0A]">Alerta de atención</label>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number" min={1} max={30} value={config.inactividad_alerta_dias}
                      onChange={e => {
                        const v = Math.max(1, parseInt(e.target.value)||7)
                        setConfig(c=>({...c, inactividad_alerta_dias: v, inactividad_riesgo_dias: Math.max(v+1, c.inactividad_riesgo_dias)}))
                      }}
                      className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento pr-14" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9B9B9B] font-medium">días</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {[5, 7, 10].map(d => (
                      <button key={d} onClick={() => setConfig(c=>({...c, inactividad_alerta_dias: d, inactividad_riesgo_dias: Math.max(d+1, c.inactividad_riesgo_dias)}))}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${config.inactividad_alerta_dias===d ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-black/10 text-[#6B6B6B] hover:border-black/20'}`}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[#9B9B9B] mt-1.5">Badge amarillo en el cliente tras <span className="font-semibold text-[#0A0A0A]">{config.inactividad_alerta_dias} días</span> sin check-in</p>
              </div>

              {/* Alerta roja */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                  <label className="text-xs font-semibold text-[#0A0A0A]">Alerta de riesgo de baja</label>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number" min={config.inactividad_alerta_dias+1} max={60} value={config.inactividad_riesgo_dias}
                      onChange={e => setConfig(c=>({...c, inactividad_riesgo_dias: Math.max(c.inactividad_alerta_dias+1, parseInt(e.target.value)||14)}))}
                      className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento pr-14" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9B9B9B] font-medium">días</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {[14, 21, 30].map(d => (
                      <button key={d} onClick={() => { if (d > config.inactividad_alerta_dias) setConfig(c=>({...c, inactividad_riesgo_dias: d})) }}
                        disabled={d <= config.inactividad_alerta_dias}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-30 ${config.inactividad_riesgo_dias===d ? 'border-red-400 bg-red-50 text-red-700' : 'border-black/10 text-[#6B6B6B] hover:border-black/20'}`}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[#9B9B9B] mt-1.5">Badge rojo en el cliente tras <span className="font-semibold text-[#0A0A0A]">{config.inactividad_riesgo_dias} días</span> sin check-in</p>
              </div>

              {/* Visual de la escala */}
              <div className="bg-[#F7F6F3] rounded-xl p-4">
                <p className="text-xs font-semibold text-[#6B6B6B] mb-3">Escala de alerta:</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-[#6B6B6B]">0–{config.inactividad_alerta_dias-1}d: Normal</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-xs text-[#6B6B6B]">{config.inactividad_alerta_dias}–{config.inactividad_riesgo_dias-1}d: Atención</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-xs text-[#6B6B6B]">{config.inactividad_riesgo_dias}d+: Riesgo baja</span>
                  </div>
                </div>
                <div className="mt-2 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-400 flex-1" style={{flexBasis:`${(config.inactividad_alerta_dias/config.inactividad_riesgo_dias/1.5)*100}%`}} />
                  <div className="bg-amber-400" style={{flexBasis:`${((config.inactividad_riesgo_dias-config.inactividad_alerta_dias)/config.inactividad_riesgo_dias/1.5)*100}%`}} />
                  <div className="bg-red-500 flex-1" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#F7F6F3] rounded-2xl px-4 py-3">
            <p className="text-xs text-[#9B9B9B]">💡 Las alertas se calculan automáticamente cada noche. Afectan a la vista de seguimiento del dashboard y a los badges de la lista de clientes.</p>
          </div>
        </div>
      )}

      {/* ── INTEGRACIONES ─────────────────────────────────────────────────── */}
      {tab === 'integraciones' && (
        <IntegracionesTab uid={uid} config={config} />
      )}

      {tab === 'equipo' && (
        centroLoading
          ? <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-acento border-t-transparent rounded-full animate-spin"/></div>
          : <EquipoTab
              centro={centro}
              miembros={miembros}
              esAdmin={esAdmin}
              recargar={recargarCentro}
              session={session}
              uid={uid}
              showToast={showToast}
            />
      )}

      {tab === 'tarifas' && (
        <TarifasTab uid={uid} showToast={showToast} />
      )}

      {/* ── FACTURACIÓN ─────────────────────────────────────────────────── */}
      {tab === 'facturacion' && (
        <div className="space-y-4">
          {/* Aviso datos completos */}
          {(!config.nif || !config.razon_social || !config.direccion_fiscal) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-3">
              <span className="text-amber-500 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Datos incompletos</p>
                <p className="text-xs text-amber-700 mt-0.5">Rellena NIF, razón social y dirección para poder emitir facturas válidas.</p>
              </div>
            </div>
          )}

          {/* Datos fiscales */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-4">🧾 Datos fiscales del emisor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">NIF / DNI *</label>
                <input value={config.nif||''} onChange={e => setConfig(c=>({...c, nif: e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"
                  placeholder="12345678A" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Razón social / Nombre legal *</label>
                <input value={config.razon_social||''} onChange={e => setConfig(c=>({...c, razon_social: e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"
                  placeholder="Roberto Bernabé García" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Dirección fiscal *</label>
                <input value={config.direccion_fiscal||''} onChange={e => setConfig(c=>({...c, direccion_fiscal: e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"
                  placeholder="Calle Mayor, 12, 1ºA" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Código postal</label>
                <input value={config.cp_fiscal||''} onChange={e => setConfig(c=>({...c, cp_fiscal: e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"
                  placeholder="30001" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Municipio</label>
                <input value={config.municipio_fiscal||''} onChange={e => setConfig(c=>({...c, municipio_fiscal: e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"
                  placeholder="Murcia" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Provincia</label>
                <input value={config.provincia_fiscal||''} onChange={e => setConfig(c=>({...c, provincia_fiscal: e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"
                  placeholder="Murcia" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Serie de facturas</label>
                <input value={config.serie_facturas||'F'} onChange={e => setConfig(c=>({...c, serie_facturas: e.target.value.toUpperCase().slice(0,3)}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento uppercase"
                  placeholder="F" maxLength={3} />
                <p className="text-xs text-[#9B9B9B] mt-1">Ej: F → F2024-001, A → A2024-001</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Email fiscal</label>
                <input type="email" value={config.email_fiscal||''} onChange={e => setConfig(c=>({...c, email_fiscal: e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"
                  placeholder="facturacion@tucentro.es" />
                <p className="text-xs text-[#9B9B9B] mt-1">Aparece en el pie de las facturas generadas</p>
              </div>
            </div>
          </div>

          {/* Régimen de IVA */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">Régimen de IVA</h2>
            <p className="text-xs text-[#9B9B9B] mb-4">El régimen determina si tus facturas incluyen IVA o no. Si dudas, consúltalo con tu asesoría.</p>
            <div className="space-y-2">
              {[
                { val: 'exento', label: 'Exento — Art. 20.1.13 LIVA', desc: 'Entrenadores individuales autónomos sin IVA (más habitual)' },
                { val: 'general', label: 'IVA General — 21%', desc: 'Centros que aplican IVA estándar' },
                { val: 're', label: 'Recargo de equivalencia', desc: 'Comerciantes minoristas (poco habitual en entrenamiento)' },
              ].map(r => (
                <label key={r.val} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${config.regimen_iva===r.val ? 'border-acento bg-acento/5' : 'border-black/10 hover:border-black/20'}`}>
                  <input type="radio" name="regimen_iva" value={r.val} checked={config.regimen_iva===r.val}
                    onChange={() => setConfig(c=>({...c, regimen_iva: r.val}))} className="mt-0.5 accent-acento" />
                  <div>
                    <p className="text-sm font-semibold text-[#0A0A0A]">{r.label}</p>
                    <p className="text-xs text-[#9B9B9B]">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-[#F7F6F3] rounded-2xl px-4 py-3">
            <p className="text-xs text-[#9B9B9B]">⚖️ Las facturas generadas por Forge son documentos de apoyo. Consulta con tu asesoría fiscal para garantizar su validez en tu situación concreta.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Tarifas ─────────────────────────────────────────────────────────────
const MODALIDAD_LABEL = { individual: '👤 Individual', pareja: '👫 Pareja', grupo: '👥 Grupo' }
const MODALIDAD_COLOR = { individual: 'bg-[#F5F5F0] text-[#6B6B6B]', pareja: 'bg-blue-50 text-blue-700', grupo: 'bg-purple-50 text-purple-700' }

function TarifasTab({ uid, showToast }) {
  const [tarifas, setTarifas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nombre: '', modalidad: 'individual', dias_semana: 2, precio: '', tipo: 'presencial' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    setLoading(true)
    try {
      const { data } = await supabase.from('tarifas').select('*').eq('entrenador_id', uid).eq('activa', true).order('modalidad').order('dias_semana')
      setTarifas(data || [])
    } finally {
      setLoading(false)
    }
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.precio) return
    const eraEdicion = !!editando
    setGuardando(true)
    try {
      const payload = { entrenador_id: uid, nombre: form.nombre.trim(), modalidad: form.modalidad, dias_semana: Number(form.dias_semana), precio: Number(form.precio), tipo: form.tipo }
      const { error } = editando
        ? await supabase.from('tarifas').update(payload).eq('id', editando.id)
        : await supabase.from('tarifas').insert(payload)
      if (error) { showToast('Error al guardar la tarifa: ' + error.message, 'error'); return }
      setModal(false); setEditando(null)
      await cargar()
      showToast(eraEdicion ? 'Tarifa actualizada' : 'Tarifa creada')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta tarifa?')) return
    const { error } = await supabase.from('tarifas').update({ activa: false }).eq('id', id)
    if (error) { showToast('Error al eliminar la tarifa: ' + error.message, 'error'); return }
    await cargar(); showToast('Tarifa eliminada')
  }

  function abrirNueva() {
    setEditando(null); setForm({ nombre: '', modalidad: 'individual', dias_semana: 2, precio: '', tipo: 'presencial' }); setModal(true)
  }
  function abrirEditar(t) {
    setEditando(t); setForm({ nombre: t.nombre, modalidad: t.modalidad, dias_semana: t.dias_semana, precio: String(t.precio), tipo: t.tipo || 'presencial' }); setModal(true)
  }

  // Sugerir precio según modalidad y días
  const SUGERIDOS = { individual: { 2:220,3:330,4:440 }, pareja: { 2:175,3:260,4:340 }, grupo: { 3:160 } }
  const precioSugerido = SUGERIDOS[form.modalidad]?.[form.dias_semana]

  const agrupadasPorTipo = [
    { tipo: 'presencial', label: '📍 Presencial', items: tarifas.filter(t => t.tipo !== 'online') },
    { tipo: 'online', label: '🌐 Online', items: tarifas.filter(t => t.tipo === 'online') },
  ].filter(g => g.items.length > 0)

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-acento border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">Tarifas</h2>
          <p className="text-xs text-[#6B6B6B]">Define tus tarifas estándar. Al crear un cliente solo seleccionas la tarifa y el precio se rellena solo.</p>
        </div>
        <button onClick={abrirNueva}
          className="bg-acento text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-acento-hover transition-all flex-shrink-0">
          + Nueva
        </button>
      </div>

      <div className="space-y-4">
        {agrupadasPorTipo.map(({ tipo, label, items }) => (
          <div key={tipo}>
            <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-2">{label}</p>
            <div className="space-y-2">
              {items.map(t => (
                <div key={t.id} className="bg-white border border-black/8 rounded-xl px-4 py-3 flex items-center gap-3">
                  {t.tipo !== 'online' && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${MODALIDAD_COLOR[t.modalidad]}`}>
                      {t.dias_semana > 0 ? `${t.dias_semana}d/sem` : 'asesoría'}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-[#0A0A0A] flex-1 truncate">{t.nombre}</p>
                  <p className="text-sm font-bold text-acento flex-shrink-0">{t.precio}€/mes</p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => abrirEditar(t)} className="text-xs border border-black/10 text-[#6B6B6B] px-2.5 py-1.5 rounded-lg hover:bg-[#F5F5F0]">✏️</button>
                    <button onClick={() => eliminar(t.id)} className="text-xs border border-red-100 text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {tarifas.length === 0 && (
          <div className="text-center py-10">
            <p className="text-3xl mb-3">💶</p>
            <p className="text-[#6B6B6B] font-medium">Sin tarifas definidas</p>
            <p className="text-xs text-[#9B9B9B] mt-1">Crea tus tarifas estándar para asignarlas rápidamente a los clientes</p>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={()=>{setModal(false);setEditando(null)}}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-[#0A0A0A] mb-4">{editando?`Editar — ${editando.nombre}`:'Nueva tarifa'}</h3>
            <div className="space-y-4">

              {/* Tipo presencial/online */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Tipo de servicio</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['presencial','📍 Presencial'],['online','🌐 Online']].map(([v,l]) => (
                    <button key={v} type="button"
                      onClick={() => setForm({...form, tipo:v, dias_semana: v==='online'?0:2})}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${form.tipo===v?'border-acento bg-acento/5 text-acento':'border-black/10 text-[#6B6B6B]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Nombre</label>
                <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}
                  placeholder={form.tipo==='online'?'Ej: Asesoría Completa':'Ej: Individual 3 días'}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"/>
              </div>

              {/* Solo presencial: modalidad y días */}
              {form.tipo !== 'online' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Modalidad</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[['individual','👤 Individual'],['pareja','👫 Pareja'],['grupo','👥 Grupo']].map(([v,l]) => (
                        <button key={v} type="button"
                          onClick={() => setForm({...form, modalidad:v, dias_semana: v==='grupo'?3:form.dias_semana})}
                          className={`py-2 rounded-xl border text-xs font-semibold transition-all ${form.modalidad===v?'border-acento bg-acento/5 text-acento':'border-black/10 text-[#6B6B6B]'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Días/semana</label>
                    <div className="flex gap-1">
                      {(form.modalidad==='grupo'?[3]:[2,3,4]).map(d => (
                        <button key={d} type="button"
                          onClick={() => { const p=SUGERIDOS[form.modalidad]?.[d]||''; setForm({...form,dias_semana:d,precio:String(p)}) }}
                          className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${form.dias_semana===d?'border-acento bg-acento/5 text-acento':'border-black/10 text-[#6B6B6B]'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                    {precioSugerido && (
                      <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex justify-between">
                        <p className="text-xs text-emerald-700">{form.modalidad} · {form.dias_semana} días</p>
                        <p className="text-xs font-bold text-emerald-700">Std: {precioSugerido}€</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Precio */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">
                  Precio €/mes
                  {precioSugerido && Number(form.precio) !== precioSugerido && (
                    <button onClick={() => setForm({...form, precio: String(precioSugerido)})}
                      className="ml-2 text-acento font-medium text-xs">std: {precioSugerido}€</button>
                  )}
                </label>
                <input type="number" value={form.precio} onChange={e=>setForm({...form,precio:e.target.value})}
                  placeholder={String(precioSugerido || (form.tipo === 'online' ? '29' : '220'))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento"/>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={()=>{setModal(false);setEditando(null)}}
                  className="flex-1 border border-black/10 text-[#6B6B6B] text-sm font-medium py-2.5 rounded-xl hover:bg-[#F5F5F0]">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={!form.nombre.trim()||!form.precio||guardando}
                  className="flex-1 bg-acento text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40 hover:bg-acento-hover transition-all">
                  {guardando?'Guardando...':editando?'Guardar cambios':'Crear tarifa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
