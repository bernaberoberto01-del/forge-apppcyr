import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { BRAND, colorMarca } from '../lib/brand'
import BrandMark from '../components/BrandMark'
import { moduloVisible } from '../lib/modulos'
import { ytEmbed, ytMiniatura } from '../lib/youtube'
import { registerSW, subscribePush, savePushSub, unsubscribePush, pushSupported, pushPermissionState } from '../lib/push'

// El portal respeta los módulos que el centro tiene ocultos: si el centro no usa
// Seguimiento, Mensajes o Nutrición, sus clientes no ven el check-in, el chat ni
// la nutrición (nadie les respondería). En Forge están todos visibles.
const VER_CHECKIN = moduloVisible('seguimiento')
const VER_MENSAJES = moduloVisible('mensajes')
const VER_NUTRICION = moduloVisible('nutricion')

// ─── helpers ─────────────────────────────────────────────────────────────────
const qa = p => p.then(r => r.data || []).catch(() => [])
const q1 = p => p.then(r => r.data?.[0] || r.data || null).catch(() => null)
const hoyStr = () => new Date().toISOString().split('T')[0]
const hace = d => new Date(Date.now() - d * 864e5).toISOString().split('T')[0]
// Formatea una fecha de forma segura. Si viene como fecha pura "YYYY-MM-DD"
// (10 caracteres, sin hora) le añade T12:00 para evitar que se muestre un día
// antes por el cambio de zona horaria; si ya viene como timestamp completo
// (p.ej. checkins.fecha, que es timestamptz) se usa tal cual. Nunca revienta
// con "Invalid Date": si no hay fecha o no se puede parsear, devuelve '—'.
const formatearFecha = (fecha, opciones = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!fecha) return '—'
  const valor = typeof fecha === 'string' && fecha.length === 10 ? fecha + 'T12:00' : fecha
  const d = new Date(valor)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-ES', opciones)
}
// Mismas reglas que en RegistroCliente.jsx: quita espacios/guiones y antepone
// +34 a móviles españoles sin prefijo (empiezan por 6, 7 o 9).
const normalizarTelefono = raw => {
  const limpio = raw.replace(/[\s-]/g, '')
  return /^[679]/.test(limpio) ? '+34' + limpio : limpio
}
const telefonoValido = raw => raw.replace(/\D/g, '').length >= 9
const rmEpley = (peso, reps) => reps <= 1 ? peso : +(peso * (1 + reps / 30)).toFixed(1)
const parseReps = (r) => { if (!r) return 1; const n = parseInt(String(r).split('-')[0]); return isNaN(n) ? 1 : n }
// Convierte textos de descanso tipo "90s", "2min", "3-4 min" a segundos (usa el número mayor del rango)
const parseDescansoSegundos = (desc) => {
  if (!desc || desc === '-') return null
  const str = String(desc).toLowerCase()
  const nums = str.match(/\d+(\.\d+)?/g)
  if (!nums || !nums.length) return null
  const ultimo = parseFloat(nums[nums.length - 1])
  return Math.round(/min/.test(str) ? ultimo * 60 : ultimo)
}
const ZONAS_LESION = ['Rodilla','Hombro','Lumbar','Cervical','Tobillo','Cadera','Muñeca','Codo','Isquiotibial','Cuádriceps','Gemelo','Otro']
const SEVERIDADES = [['leve','Leve'],['moderada','Moderada'],['grave','Grave']]
const CATEGORIAS_SUPLEMENTO = [
  ['rendimiento', 'Rendimiento'], ['recuperacion', 'Recuperación'], ['salud', 'Salud'], ['bienestar', 'Bienestar'],
]
const normalizaCategoria = c => (c || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const PRIORIDAD_COLOR = { alta: 'bg-emerald-50 text-emerald-600', media: 'bg-amber-50 text-amber-600', baja: 'bg-[#F4F3F0] text-[#9B9B9B]' }
const PLANES_INFO = [
  { id: 'nutricion', nombre: 'Nutrición', precio: 29, incluye: ['Plan de nutrición personalizado', 'Seguimiento de comidas', 'Ajustes periódicos'] },
  { id: 'entrenamiento', nombre: 'Entrenamiento', precio: 35, incluye: ['Rutina de entrenamiento personalizada', 'Seguimiento de cargas', 'Protocolos de recuperación ante lesiones'] },
  { id: 'completo', nombre: 'Completo', precio: 49, incluye: ['Todo lo de Entrenamiento', 'Todo lo de Nutrición', 'Suplementación personalizada'] },
]

function BloqueoOverlay({ mensaje, boton, onClick, color }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 p-6">
      <div className="bg-white rounded-2xl p-5 max-w-xs text-center shadow-xl border border-black/5">
        <p className="text-sm font-bold text-[#0A0A0A] mb-3 leading-relaxed">{mensaje}</p>
        <button onClick={onClick} className="text-white text-xs font-black px-4 py-2.5 rounded-xl active:scale-95 transition-all" style={{ background: color }}>{boton}</button>
      </div>
    </div>
  )
}

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
  const [ciForm, setCiForm] = useState({ energia: null, sueno: null, fatiga: null, estres: null, sesiones: null, cargas: null, motivacion: null, pasos: '', logro: '', peso: '', nota: '' })
  const [enviandoCI, setEnviandoCI] = useState(false)
  const [ciEditandoId, setCiEditandoId] = useState(null)
  const [valorando, setValorando] = useState(null)
  const [rpe, setRpe] = useState(null)
  const [fatigaVal, setFatigaVal] = useState(null)
  const [notaValoracion, setNotaValoracion] = useState('')
  const [guardandoVal, setGuardandoVal] = useState(false)
  const [modalActividad, setModalActividad] = useState(false)
  const [actForm, setActForm] = useState({ tipo: '', duracion: '', rpe: null, nota: '' })
  const [guardandoAct, setGuardandoAct] = useState(false)
  const [modalRegistro, setModalRegistro] = useState(null)
  const [registroSets, setRegistroSets] = useState({})
  const [guardandoRegistro, setGuardandoRegistro] = useState(false)
  const [sesionGuardadaId, setSesionGuardadaId] = useState(null)
  const [seccionMasInicial, setSeccionMasInicial] = useState(null)
  const [textoMsg, setTextoMsg] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const [toast, setToast] = useState('')
  const [activandoPlan, setActivandoPlan] = useState(false)
  const [modoPreview, setModoPreview] = useState(false)
  const [telefonoInput, setTelefonoInput] = useState('')
  const [guardandoTelefono, setGuardandoTelefono] = useState(false)
  const [pushSuscrito, setPushSuscrito] = useState(() => pushPermissionState() === 'granted')
  const mensajesEndRef = useRef(null)

  // Onboarding overlay — 3 pasos descartable
  const [onbStep, setOnbStep] = useState(0)
  const [onbCerrado, setOnbCerrado] = useState(() => {
    try { return !!localStorage.getItem('portal_onboarding_v1') } catch { return false }
  })

  function bloqueadoPreview() {
    showToast('👁 Modo vista previa — solo lectura')
  }

  const color = colorMarca(config?.color_acento)

  const ACTIVIDADES = [
    { id: 'footing', label: '🏃 Footing' }, { id: 'ciclismo', label: '🚴 Ciclismo' },
    { id: 'natacion', label: '🏊 Natación' }, { id: 'futbol', label: '⚽ Fútbol' },
    { id: 'padel', label: '🎾 Pádel' }, { id: 'yoga', label: '🧘 Yoga' },
    { id: 'escalada', label: '🧗 Escalada' }, { id: 'otro', label: '💪 Otro' },
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSesion(session?.user || null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSesion(s?.user || null))
    // Registrar Service Worker en silencio — sin pedir permiso todavía
    registerSW()
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    if (checkout === 'success') {
      showToast('✓ Pago completado correctamente. Tu plan está activo.')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (checkout === 'cancelled') {
      showToast('El proceso de pago fue cancelado.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (sesion === undefined) return
    if (!sesion) { setCargando(false); return }
    cargarTodo()
  }, [sesion])

  // Clasificación de "cliente nuevo" — se decide UNA vez, con el primer dato
  // cargado, y no se recalcula aunque los datos cambien durante la sesión.
  // Así, si completa los pasos mientras el onboarding está abierto, sigue
  // viendo la pantalla (incluido el estado final "tu plan está listo") en
  // vez de que desaparezca a mitad de sesión. Al volver a cargar la app de
  // cero (nueva sesión), se reevalúa con los datos ya actualizados y, si
  // ya no cumple las 3 condiciones, deja de mostrarse — así es como
  // "desaparece automáticamente" para el cliente en la práctica.
  const [modoOnboarding, setModoOnboarding] = useState(null) // null = aún sin decidir
  useEffect(() => {
    if (!datos || modoOnboarding !== null) return
    const esNuevo = !datos.cuest && (datos.checkins?.length || 0) < 2 && !datos.rutina
    setModoOnboarding(esNuevo && VER_CHECKIN)
  }, [datos])

  async function cargarTodo() {
    setCargando(true)
    // Modo preview: el entrenador abre el portal de un cliente suyo desde Clientes.jsx
    // (?cliente_id=...). Solo se activa si la sesión logueada es realmente su
    // entrenador — nunca por un token en la URL (reusable, filtrable en logs/historial).
    const previewId = new URLSearchParams(window.location.search).get('cliente_id')
    let cl, error
    if (previewId) {
      const r = await supabase.from('clientes').select('*').eq('id', previewId).eq('entrenador_id', sesion.id).maybeSingle()
      cl = r.data; error = r.error
    } else {
      const r = await supabase.from('clientes').select('*').eq('auth_user_id', sesion.id).maybeSingle()
      cl = r.data; error = r.error
    }
    if (error || !cl) { setSinCuenta(true); setCargando(false); return }
    setCliente(cl)
    setModoPreview(!!previewId)
    const cid = cl.id, eid = cl.entrenador_id, hoy = hoyStr()

    const [cfg, rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes,
      mensajes, pagos, marcas, medidas, fotos, cuest, ejerciciosHist, sesionesEstaSemana, nutricionRegistros, suplementacion, planCobro, sesionesPendientesValorar, lesiones, bibRaw] = await Promise.all([
      q1(supabase.from('configuracion').select('*').eq('entrenador_id', eid)),
      q1(supabase.from('rutinas').select('id,nombre,semanas,fecha_inicio,contenido,borrador').eq('cliente_id', cid).eq('estado', 'publicada').order('created_at', { ascending: false })),
      q1(supabase.from('planes_nutricion').select('*').eq('cliente_id', cid).in('estado', ['publicado', 'publicada']).order('created_at', { ascending: false })),
      qa(supabase.from('checkins').select('*').eq('cliente_id', cid).order('fecha', { ascending: false }).limit(52)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).gte('fecha', hoy).eq('cancelada', false).order('fecha').order('hora').limit(10)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).eq('fecha', hoy).eq('cancelada', false)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).eq('completada', true).eq('cancelada', false).eq('tipo', 'online').is('rpe', null).gte('fecha', hace(14)).lte('fecha', hoy).order('fecha', { ascending: false }).limit(3)),
      qa(supabase.from('mensajes_cliente').select('*').eq('cliente_id', cid).order('created_at', { ascending: true })),
      qa(supabase.from('pagos').select('*').eq('cliente_id', cid).order('fecha_pago', { ascending: false })),
      qa(supabase.from('marcas_cliente').select('*').eq('cliente_id', cid).order('fecha', { ascending: false })),
      qa(supabase.from('medidas_cliente').select('*').eq('cliente_id', cid).order('fecha', { ascending: false })),
      qa(supabase.from('fotos_progreso').select('*').eq('cliente_id', cid).eq('visible_cliente', true).order('fecha', { ascending: false })),
      q1(supabase.from('cuestionarios_nutricion').select('*').eq('cliente_id', cid).order('created_at', { ascending: false }).limit(1)),
      qa(supabase.from('sesion_ejercicios').select('ejercicio_nombre,sets,patron,sesion_id').eq('cliente_id', cid).order('created_at', { ascending: false }).limit(500)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).eq('cancelada', false).gte('fecha', hace(30)).lte('fecha', new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0]).order('fecha').order('hora')),
      qa(supabase.from('nutricion_registros').select('fecha,dia_nombre').eq('cliente_id', cid).gte('fecha', hace(30)).order('fecha', { ascending: false })),
      q1(supabase.from('suplementacion_cliente').select('*').eq('cliente_id', cid)),
      q1(supabase.from('planes_cobro').select('*').eq('cliente_id', cid).order('created_at', { ascending: false }).limit(1)),
      qa(supabase.from('sesiones').select('*').eq('cliente_id', cid).eq('valoracion_pendiente', true).is('rpe', null).gte('fecha', hace(30)).order('fecha', { ascending: false })),
      qa(supabase.from('lesiones_cliente').select('*').eq('cliente_id', cid).order('created_at', { ascending: false })),
      qa(supabase.from('ejercicios_biblioteca').select('nombre,youtube_url,consejos_tecnica').eq('entrenador_id', eid)),
    ])

    // Índice nombre→datos para lookup O(1) en TabEntrena y ModalRegistroSesion
    const biblioteca = {}
    for (const e of bibRaw) if (e.nombre) biblioteca[e.nombre.toLowerCase()] = e

    setConfig(cfg)
    setDatos({ rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes, mensajes, pagos, marcas, medidas, fotos, cuest, ejerciciosHist, sesionesEstaSemana, nutricionRegistros, suplementacion, planCobro, sesionesPendientesValorar, lesiones, biblioteca })
    if (!previewId) {
      supabase.from('mensajes_cliente').update({ leido: true }).eq('cliente_id', cid).eq('leido', false).then(() => {}).catch(() => {})
      setTimeout(() => supabase.from('actividad_cliente').insert({ cliente_id: cid, entrenador_id: eid, tipo: 'portal_acceso', descripcion: 'Entró al portal' }).then(() => {}).catch(() => {}), 2000)
      // Onboarding: avisar al entrenador solo la primera vez que coinciden
      // cuestionario de nutrición + primer check-in (se deduplica consultando
      // si ya existe la notificación, en vez de depender de un flag en BD).
      if (cuest && checkins.length >= 1) {
        supabase.from('notificaciones_admin').select('id').eq('cliente_id', cid).eq('tipo', 'onboarding_completo').maybeSingle()
          .then(({ data: yaNotificado }) => {
            if (yaNotificado) return
            supabase.from('notificaciones_admin').insert({
              entrenador_id: eid, cliente_id: cid, tipo: 'onboarding_completo',
              titulo: `${cl.nombre} ha completado su perfil`,
              descripcion: 'Ya puedes preparar su plan personalizado. Tiene cuestionario de nutrición y primer check-in.',
              leida: false, url_destino: `/clientes?highlight=${cid}`,
            }).then(() => {}).catch(() => {})
          }).catch(() => {})
      }
    }
    setCargando(false)
  }

  async function enviarCheckin() {
    if (modoPreview) return bloqueadoPreview()
    if (!ciForm.energia || !ciForm.sueno || !ciForm.fatiga || !ciForm.estres) return
    setEnviandoCI(true)
    try {
      const diasPlan = cliente.dias_semana || 3
      const adherencia = ciForm.sesiones != null ? Math.min(10, Math.max(1, Math.round((ciForm.sesiones / diasPlan) * 10))) : null
      const peso = ciForm.peso ? parseFloat(ciForm.peso) : null

      if (ciEditandoId) {
        const { error } = await supabase.from('checkins').update({
          peso, energia: ciForm.energia, sueno: ciForm.sueno, fatiga: ciForm.fatiga, estres: ciForm.estres,
          sesiones_semana: ciForm.sesiones, cargas_sensacion: ciForm.cargas,
          motivacion: ciForm.motivacion, logro_semana: ciForm.logro || null,
          pasos_diarios: ciForm.pasos ? parseInt(ciForm.pasos) : null,
          comentario: ciForm.nota || null, adherencia_entreno: adherencia,
        }).eq('id', ciEditandoId).eq('cliente_id', cliente.id)
        if (!error) {
          setDatos(d => ({ ...d, checkins: d.checkins.map(c => c.id === ciEditandoId
            ? { ...c, peso, energia: ciForm.energia, sueno: ciForm.sueno, fatiga: ciForm.fatiga, estres: ciForm.estres, sesiones_semana: ciForm.sesiones, cargas_sensacion: ciForm.cargas, comentario: ciForm.nota || null, adherencia_entreno: adherencia }
            : c) }))
          setModalCI(false)
          setCiEditandoId(null)
          setCiForm({ energia: null, sueno: null, fatiga: null, estres: null, sesiones: null, cargas: null, motivacion: null, pasos: '', logro: '', peso: '', nota: '' })
          showToast('✓ Check-in actualizado')
        } else {
          showToast('⚠️ Error al guardar — inténtalo de nuevo')
        }
      } else {
        const { error } = await supabase.from('checkins').insert({
          cliente_id: cliente.id, entrenador_id: cliente.entrenador_id, fecha: hoyStr(),
          energia: ciForm.energia, sueno: ciForm.sueno, fatiga: ciForm.fatiga, estres: ciForm.estres,
          sesiones_semana: ciForm.sesiones, sesiones_planificadas: diasPlan,
          cargas_sensacion: ciForm.cargas,
          motivacion: ciForm.motivacion,
          logro_semana: ciForm.logro || null,
          pasos_diarios: ciForm.pasos ? parseInt(ciForm.pasos) : null,
          peso, comentario: ciForm.nota || null, adherencia_entreno: adherencia,
        })
        if (!error) {
          setDatos(d => ({ ...d, checkins: [{ id: Date.now()+'', fecha: hoyStr(), ...ciForm, peso, adherencia_entreno: adherencia }, ...d.checkins] }))
          setModalCI(false)
          setCiForm({ energia: null, sueno: null, fatiga: null, estres: null, sesiones: null, cargas: null, motivacion: null, pasos: '', logro: '', peso: '', nota: '' })
          showToast('✓ Check-in enviado')
        } else {
          showToast('⚠️ Error al enviar — inténtalo de nuevo')
        }
      }
    } catch (e) {
      showToast('⚠️ Error al enviar — inténtalo de nuevo')
    } finally {
      setEnviandoCI(false)
    }
  }

  function editarCheckin(c) {
    setCiForm({
      energia: c.energia, sueno: c.sueno, fatiga: c.fatiga, estres: c.estres,
      sesiones: c.sesiones_semana ?? null, cargas: c.cargas_sensacion ?? null,
      motivacion: c.motivacion ?? null,
      pasos: c.pasos_diarios != null ? String(c.pasos_diarios) : '',
      logro: c.logro_semana || '',
      peso: c.peso != null ? String(c.peso) : '', nota: c.comentario || '',
    })
    setCiEditandoId(c.id)
    setModalCI(true)
  }

  async function guardarValoracion() {
    if (modoPreview) return bloqueadoPreview()
    if (!rpe || !fatigaVal || !valorando) return
    setGuardandoVal(true)
    await supabase.from('sesiones').update({ rpe, fatiga_post: fatigaVal, notas_cliente: notaValoracion || null, valoracion_pendiente: false }).eq('id', valorando.id)
    setDatos(d => ({ ...d, pendientes: d.pendientes.filter(s => s.id !== valorando.id), sesionesPendientesValorar: (d.sesionesPendientesValorar||[]).filter(s => s.id !== valorando.id) }))
    setValorando(null); setRpe(null); setFatigaVal(null); setNotaValoracion('')
    showToast('✓ Sesión valorada')
    setGuardandoVal(false)
  }

  async function guardarActividad() {
    if (modoPreview) return bloqueadoPreview()
    if (!actForm.tipo || !actForm.duracion || guardandoAct) return
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

  async function guardarRegistroSesion(duracionMinutos) {
    if (modoPreview) return bloqueadoPreview()
    if (!modalRegistro || guardandoRegistro) return
    setGuardandoRegistro(true)
    const { data: sesNueva, error } = await supabase.from('sesiones').insert({
      cliente_id: cliente.id, entrenador_id: cliente.entrenador_id,
      fecha: hoyStr(), tipo: 'online', completada: true, cancelada: false, notas: modalRegistro.nombre,
      valoracion_pendiente: true,
      duracion_minutos: duracionMinutos || null,
    }).select().single()
    if (error || !sesNueva) {
      setGuardandoRegistro(false)
      showToast('⚠️ Error al guardar la sesión — inténtalo de nuevo')
      return
    }
    const rows = (modalRegistro.ejercicios || []).map((ej, i) => ({
      sesion_id: sesNueva.id, cliente_id: cliente.id,
      ejercicio_nombre: ej.nombre, patron: ej.patron || null, orden: i,
      sets: (registroSets[i] || []).filter(s => s.completada || s.peso || s.reps),
    })).filter(r => r.sets.length > 0)
    if (rows.length) await supabase.from('sesion_ejercicios').insert(rows)
    setSesionGuardadaId(sesNueva.id)
    // NO reseteamos guardandoRegistro aquí — lo reseteamos al cerrar para evitar doble registro
  }

  function cerrarModalRegistro() {
    setModalRegistro(null); setRegistroSets({}); setSesionGuardadaId(null); setGuardandoRegistro(false)
    showToast('✓ Sesión registrada')
    cargarTodo()
  }

  async function enviarMensaje(e) {
    e.preventDefault()
    if (modoPreview) return bloqueadoPreview()
    if (!textoMsg.trim() || enviandoMsg) return
    setEnviandoMsg(true)
    const texto = textoMsg.trim(); setTextoMsg('')
    await supabase.functions.invoke('portal-accion', { body: { accion: 'enviar_mensaje', datos: { contenido: texto } } }).catch(() => {})
    const msgs = await qa(supabase.from('mensajes_cliente').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: true }))
    setDatos(d => ({ ...d, mensajes: msgs }))
    setEnviandoMsg(false)
    setTimeout(() => mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    // Activar push tras primer mensaje — momento de valor natural, no crea fricción
    if (!pushSuscrito && pushSupported() && pushPermissionState() !== 'denied') {
      setTimeout(async () => {
        const { subscription, permiso } = await subscribePush()
        if (subscription && permiso === 'granted') {
          await savePushSub(supabase, cliente.id, subscription)
          setPushSuscrito(true)
        }
      }, 800)
    }
  }

  async function guardarTelefono() {
    if (modoPreview) return bloqueadoPreview()
    if (!telefonoValido(telefonoInput)) return showToast('Número no válido — mínimo 9 dígitos')
    setGuardandoTelefono(true)
    const telefono = normalizarTelefono(telefonoInput.trim())
    const { error } = await supabase.from('clientes').update({ telefono }).eq('id', cliente.id)
    if (!error) {
      setCliente(c => ({ ...c, telefono }))
      setTelefonoInput('')
      showToast('✓ Teléfono guardado')
    } else {
      showToast('Error al guardar — inténtalo de nuevo')
    }
    setGuardandoTelefono(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (sesion === undefined || cargando) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: BRAND.color }}>
          <BrandMark size={24} />
        </div>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: BRAND.color, borderTopColor: 'transparent' }} />
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

  if (!datos) return (
    <div className="min-h-screen pb-24" style={{ background: '#F2F1EE' }}>
      {/* Header skeleton */}
      <div className="px-5 pt-6 pb-4">
        <div className="h-3 w-24 rounded-full mb-2 animate-pulse" style={{ background: 'rgba(10,10,10,0.08)' }} />
        <div className="h-6 w-48 rounded-full animate-pulse" style={{ background: 'rgba(10,10,10,0.12)' }} />
      </div>
      {/* Tab bar skeleton */}
      <div className="px-5 mb-4">
        <div className="h-10 rounded-2xl animate-pulse" style={{ background: 'rgba(10,10,10,0.1)' }} />
      </div>
      {/* Cards skeleton */}
      <div className="px-5 space-y-3">
        <div className="h-32 rounded-3xl animate-pulse" style={{ background: '#0A0A0A', opacity: 0.85 }} />
        <div className="h-24 rounded-2xl animate-pulse" style={{ background: '#0A0A0A', opacity: 0.7 }} />
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#0A0A0A', opacity: 0.5 + i*0.1 }} />
          ))}
        </div>
        <div className="h-40 rounded-2xl animate-pulse" style={{ background: 'rgba(10,10,10,0.07)' }} />
      </div>
    </div>
  )

  const { rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes, mensajes, pagos, marcas, medidas, fotos, cuest, ejerciciosHist, sesionesEstaSemana, nutricionRegistros, suplementacion, planCobro, sesionesPendientesValorar, lesiones, biblioteca = {} } = datos
  const esOnline = cliente.tipo === 'online'

  // Onboarding guiado — pasos 1 y 2 en vivo (badges), paso 3 informativo.
  const pasoCuestionarioDone = !!cuest
  const pasoCheckinDone = (checkins?.length || 0) >= 1
  const pasoRutinaDone = !!rutina
  const mostrarOnboarding = esOnline && modoOnboarding === true
  // Cuenta demo del entrenador o cliente marcado como acceso_libre: acceso
  // completo siempre, sin pasar por pago ni suscripción.
  const tieneAccesoLibre = cliente.is_demo || cliente.acceso_libre
  const plan = tieneAccesoLibre ? 'completo' : ((planCobro?.estado === 'activo' ? planCobro.plan : null) || cliente.plan_online || null)
  const acceso = {
    rutinas: ['entrenamiento', 'completo'].includes(plan),
    nutricion: ['nutricion', 'completo'].includes(plan),
    suplementacion: plan === 'completo',
    lesiones_musculares: ['entrenamiento', 'completo'].includes(plan),
    progreso: true,
    checkin: true,
    mensajes: true,
  }
  // Mostrar si tiene plan, o si directamente tiene datos en BD
  const verRutina = !esOnline || acceso.rutinas || !!(datos?.rutina)
  const verNutricion = VER_NUTRICION && (!esOnline || acceso.nutricion || !!(datos?.nutricion))
  const bloqueadoRutina = esOnline && !verRutina
  const bloqueadoNutricion = esOnline && !verNutricion

  // Si el tab activo queda fuera de los tabs visibles (p.ej. plan cambiado en BD),
  // volver a Inicio para no mostrar una pantalla vacía. Ajuste de estado durante el
  // render (patrón soportado por React) en vez de useEffect: verRutina/verNutricion
  // se calculan después del "if (!datos) return" de arriba, así que un useEffect aquí
  // violaría las Rules of Hooks (hooks llamados condicionalmente entre renders).
  if (tab === 'entrena' && !verRutina) setTab('hoy')
  if (tab === 'nutricion' && !verNutricion) setTab('hoy')

  // Pago vencido: plan manual (sin suscripción activa en Stripe) con más de 35 días desde el último pago
  const ultimoPago = pagos?.[0] || null
  const diasDesdeUltimoPago = ultimoPago?.fecha_pago ? Math.floor((Date.now() - new Date(ultimoPago.fecha_pago + 'T00:00').getTime()) / 864e5) : null
  const tieneSuscripcionStripeActiva = planCobro?.estado === 'activo'
  const pagoVencido = esOnline && !tieneAccesoLibre && !tieneSuscripcionStripeActiva && diasDesdeUltimoPago !== null && diasDesdeUltimoPago > 35
  const diasVencido = pagoVencido ? diasDesdeUltimoPago - 30 : 0

  // Lead aceptado con un plan sugerido pero aún sin pagar — plan_online está puesto
  // pero plan_activo sigue en false hasta que llegue checkout.session.completed.
  // No se mezcla con el blur de pagoVencido: aquí no hay nada que mostrar todavía,
  // así que se sustituye toda la pantalla por la activación.
  // is_demo o acceso_libre nunca pasan por esta pantalla.
  const faltaActivarPlan = esOnline && !tieneAccesoLibre && !!cliente.plan_online && !cliente.plan_activo && !tieneSuscripcionStripeActiva

  // Lead aceptado (estado='contacto') pero sin plan todavía asignado — la IA no
  // sugirió uno o el entrenador aún no ha elegido tarifa. Sin esto el cliente
  // vería un portal vacío sin ningún mensaje. El entrenador manda el enlace de
  // pago manualmente desde Mensajes.jsx; aquí solo se informa de que está en curso.
  const faltaAsignarPlan = esOnline && !tieneAccesoLibre && cliente.estado === 'contacto' && !cliente.plan_online

  if (faltaAsignarPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F2F1EE' }}>
        {modoPreview && (
          <div className="fixed top-0 inset-x-0 z-50 w-full px-4 py-2 text-center text-xs md:text-sm font-bold text-white"
            style={{ background: '#F59E0B', paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}>
            👁 Modo vista previa — estás viendo el portal de {cliente.nombre}
          </div>
        )}
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border border-black/5">
          <p className="text-5xl mb-4">📋</p>
          <p className="font-bold text-xl mb-2 text-[#0A0A0A]">¡Ya casi está!</p>
          <p className="text-sm text-[#6B6B6B] leading-relaxed">
            Tu entrenador está preparando tu plan personalizado. En breve recibirás el enlace para activarlo.
          </p>
        </div>
      </div>
    )
  }

  if (faltaActivarPlan) {
    const planInfo = PLANES_INFO.find(p => p.id === cliente.plan_online)
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F2F1EE' }}>
        {modoPreview && (
          <div className="fixed top-0 inset-x-0 z-50 w-full px-4 py-2 text-center text-xs md:text-sm font-bold text-white"
            style={{ background: '#F59E0B', paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}>
            👁 Modo vista previa — estás viendo el portal de {cliente.nombre}
          </div>
        )}
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border border-black/5">
          <p className="text-5xl mb-4">💳</p>
          <p className="font-bold text-xl mb-2 text-[#0A0A0A]">Activa tu plan para acceder</p>
          <p className="text-sm text-[#6B6B6B] mb-1 leading-relaxed">
            Tu entrenador te ha preparado el plan <strong>{planInfo?.nombre || cliente.plan_online}</strong>
            {planInfo ? ` (${planInfo.precio}€/mes)` : ''}.
          </p>
          <p className="text-sm text-[#6B6B6B] mb-6 leading-relaxed">
            Activa tu suscripción para empezar a usar tu rutina, tu plan de nutrición y todo tu seguimiento.
          </p>
          <button onClick={async () => {
            if (modoPreview) return bloqueadoPreview()
            setActivandoPlan(true)
            try {
              const { data, error } = await supabase.functions.invoke('crear-checkout-suscripcion', { body: { cliente_id: cliente.id, plan: cliente.plan_online } })
              if (error) throw error
              if (data?.url) { window.location.href = data.url; return }
              showToast('Error al generar el pago — contacta con tu entrenador')
            } catch (e) {
              showToast('Error al generar el pago — contacta con tu entrenador')
            }
            setActivandoPlan(false)
          }} disabled={activandoPlan || modoPreview}
            className="w-full font-bold py-3.5 rounded-2xl text-white text-sm disabled:opacity-50" style={{ background: color }}>
            {activandoPlan ? 'Abriendo pago...' : '💳 Activar plan'}
          </button>
          {toast && <p className="text-xs text-red-500 mt-3">{toast}</p>}
        </div>
      </div>
    )
  }

  function irAPagos() { setSeccionMasInicial('pagos'); setTab('mas') }

  async function solicitarCambioPlan(planSolicitado) {
    if (modoPreview) return bloqueadoPreview()
    await supabase.from('solicitudes_cambio_plan').insert({
      cliente_id: cliente.id, entrenador_id: cliente.entrenador_id,
      plan_actual: plan, plan_solicitado: planSolicitado, estado: 'pendiente',
    })
    const PLAN_LABEL = { nutricion: 'Nutrición', entrenamiento: 'Entrenamiento', completo: 'Completo' }
    await supabase.functions.invoke('portal-accion', { body: { accion: 'enviar_mensaje', datos: { contenido: `📋 ${cliente.nombre} ha solicitado cambiar al plan ${PLAN_LABEL[planSolicitado] || planSolicitado} (actualmente en ${PLAN_LABEL[plan] || 'sin plan'}). Revísalo cuando puedas.` } } }).catch(() => {})
  }
  const nombre = cliente.nombre?.split(' ')[0] || ''
  const iniciales = cliente.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
  const msgNoLeidos = VER_MENSAJES ? mensajes.filter(m => !m.leido && m.tipo === 'entrenador').length : 0

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

  // Día actual de la rutina para el FAB (calculado aquí para que esté disponible en el layout padre)
  const diasRutinaFAB = rutina?.borrador?.dias || rutina?.contenido?.dias || []
  const sesCompletadasFAB = (sesionesEstaSemana || []).filter(s => s.completada).length
  const diaFAB = diasRutinaFAB.length > 0 ? diasRutinaFAB[sesCompletadasFAB % diasRutinaFAB.length] : null

  // Visibilidad de tabs según plan — un cliente de solo Nutrición no ve Entrena y viceversa.
  // verRutina / verNutricion ya incluyen la lógica de acceso y la excepción "tiene datos en BD".
  // M9 F3 — Nombres de tabs personalizables por el entrenador
  const nombreTabEntrena = config?.portal_nombre_rutinas?.trim() || 'Entrena'
  const TABS = [
    { id: 'hoy',       label: 'Inicio',    icon: '⊞' },
    { id: 'entrena',   label: nombreTabEntrena, icon: '💪',  oculto: !verRutina },
    { id: 'nutricion', label: 'Alimentación', icon: '🥗',  oculto: !verNutricion },
    { id: 'progreso',  label: 'Progreso',  icon: '📈' },
    { id: 'mas',       label: 'Más',       icon: '···', badge: msgNoLeidos },
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
  ].filter(i => VER_MENSAJES || i.id !== 'mensajes')

  return (
    <>
    {modoPreview && (
      <div className="sticky top-0 z-50 w-full px-4 py-2 text-center text-xs md:text-sm font-bold text-white"
        style={{ background: '#F59E0B', paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}>
        👁 Modo vista previa — estás viendo el portal de {cliente.nombre}
      </div>
    )}
    {/* M9 F3 — color_fondo personalizado del centro, fallback a #F4F3F0 */}
    <div className="min-h-screen flex" style={{ background: config?.color_fondo || '#F4F3F0', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica Neue,sans-serif' }}>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-black/6 fixed h-full z-20">
        <div className="px-5 py-6 border-b border-black/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color }}>
              <BrandMark size={18} />
            </div>
            <div><p className="text-xs font-bold text-[#0A0A0A]">{BRAND.nombre}</p><p className="text-[10px] text-[#9B9B9B]">Tu portal</p></div>
          </div>
          <div className="flex items-center gap-3">
            {/* M9 F1 — Logo del centro en sidebar: preferir logo sobre foto */}
            {(config?.logo_url || config?.foto_url)
              ? <img src={config.logo_url || config.foto_url} alt="" className={`w-10 h-10 rounded-xl flex-shrink-0 ${config.logo_url ? 'object-contain p-0.5 bg-[#F7F6F3]' : 'object-cover'}`} />
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
        {/* M9 F3 — Texto de pie personalizado del centro */}
        {config?.portal_pie?.trim() && (
          <div className="px-5 pb-2">
            <p className="text-[10px] text-[#C0C0C0] text-center leading-relaxed">{config.portal_pie}</p>
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
        {pagoVencido && (
          <div className="sticky top-0 z-30 px-4 py-2 text-center text-xs font-bold text-white" style={{ background: '#F59E0B' }}>
            Tu suscripción lleva {diasVencido} día{diasVencido !== 1 ? 's' : ''} vencida. Renueva para ver tu plan completo.
          </div>
        )}
        {/* Header móvil — negro, datos clave */}
        <div className="md:hidden sticky z-20 px-4 flex items-center gap-3"
          style={{ background: '#0A0A0A', height: 52, top: pagoVencido ? 32 : 0 }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: color }}>
            <BrandMark size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate tracking-tight leading-none">{nombre}</p>
            {semanasActivas > 0 ? (
              <p className="text-[10px] font-bold mt-0.5" style={{ color }}>
                {semanasActivas} sem · ACTIVO
              </p>
            ) : config?.nombre_negocio ? (
              <p className="text-[10px] font-medium mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {config.nombre_negocio}
              </p>
            ) : null}
          </div>
          {/* M9 F1 — Logo del centro tiene prioridad sobre foto del entrenador */}
          {(config?.logo_url || config?.foto_url) && (
            <img
              src={config.logo_url || config.foto_url}
              alt=""
              className={`flex-shrink-0 opacity-90 object-contain ${config.logo_url ? 'w-8 h-8 rounded-lg' : 'w-7 h-7 rounded-full object-cover'}`}
            />
          )}
          <button onClick={() => supabase.auth.signOut()}
            className="text-[10px] text-white/30 font-medium ml-1">Salir</button>
        </div>

        {/* Contenido */}
        <div className="flex-1 px-4 md:px-8 py-5 max-w-2xl w-full mx-auto pb-28 md:pb-10">
          {tab === 'hoy' && !cliente.telefono && !modoPreview && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3">
              <p className="text-sm font-semibold text-amber-800 mb-3 leading-relaxed">
                📱 Añade tu número de WhatsApp para que {config?.nombre_entrenador || 'tu entrenador'} pueda contactarte directamente
              </p>
              <div className="flex gap-2">
                <input type="tel" value={telefonoInput} onChange={e => setTelefonoInput(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="flex-1 border border-amber-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-amber-400" />
                <button onClick={guardarTelefono} disabled={guardandoTelefono || !telefonoInput.trim()}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-all"
                  style={{ background: color }}>
                  {guardandoTelefono ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
          {tab === 'hoy' && (
            mostrarOnboarding
              ? <OnboardingNuevoCliente cliente={cliente} color={color} config={config}
                  pasoCuestionarioDone={pasoCuestionarioDone} pasoCheckinDone={pasoCheckinDone} pasoRutinaDone={pasoRutinaDone}
                  setModalCI={modoPreview ? bloqueadoPreview : setModalCI} setTab={setTab} />
              : <TabHoy cliente={cliente} color={color} config={config} checkins={checkins} rutina={rutina} nutricion={nutricion} sesiones={sesiones} sesionesHoy={sesionesHoy} pendientes={pendientes} sesionesPendientesValorar={sesionesPendientesValorar} cuest={cuest} verRutina={verRutina} verNutricion={verNutricion} setTab={setTab} setModalCI={modoPreview ? bloqueadoPreview : setModalCI} setValorando={modoPreview ? bloqueadoPreview : setValorando} sesionesEstaSemana={sesionesEstaSemana} semanasActivas={semanasActivas} setModalActividad={modoPreview ? bloqueadoPreview : setModalActividad} setModalRegistro={modoPreview ? bloqueadoPreview : setModalRegistro} ejerciciosHist={ejerciciosHist} editarCheckin={modoPreview ? bloqueadoPreview : editarCheckin} />
          )}
          {tab === 'entrena' && (
            <div className="relative">
              <div style={(pagoVencido || bloqueadoRutina) ? { filter: `blur(${pagoVencido ? 8 : 4}px)`, pointerEvents: 'none' } : {}}>
                <TabEntrena rutina={rutina} color={color} ejerciciosHist={ejerciciosHist} setModalRegistro={modoPreview ? bloqueadoPreview : setModalRegistro} esOnline={esOnline} biblioteca={biblioteca} cliente={cliente} onEntrenoGuardado={cargarTodo} setValorando={modoPreview ? bloqueadoPreview : setValorando} />
              </div>
              {pagoVencido ? (
                <BloqueoOverlay mensaje="Tu plan está pausado. Renueva para seguir." boton="Renovar ahora" onClick={irAPagos} color={color} />
              ) : bloqueadoRutina ? (
                <BloqueoOverlay mensaje="Tu plan actual no incluye rutinas de entrenamiento" boton="Ver planes" onClick={irAPagos} color={color} />
              ) : null}
            </div>
          )}
          {tab === 'nutricion' && (
            <div className="relative">
              <div style={(pagoVencido || bloqueadoNutricion) ? { filter: `blur(${pagoVencido ? 8 : 4}px)`, pointerEvents: 'none' } : {}}>
                <TabNutricion nutricion={nutricion} cuest={cuest} cliente={cliente} color={color} nutricionRegistros={nutricionRegistros} suplementacion={suplementacion} cargarTodo={cargarTodo} acceso={acceso} irAPagos={irAPagos} modoPreview={modoPreview} config={config} setTab={setTab} checkins={checkins} />
              </div>
              {pagoVencido ? (
                <BloqueoOverlay mensaje="Tu plan está pausado. Renueva para seguir." boton="Renovar ahora" onClick={irAPagos} color={color} />
              ) : bloqueadoNutricion ? (
                <BloqueoOverlay mensaje="Tu plan actual no incluye plan de nutrición" boton="Ver planes" onClick={irAPagos} color={color} />
              ) : null}
            </div>
          )}
          {tab === 'progreso' && <TabProgreso checkins={checkins} marcas={marcas} medidas={medidas} fotos={fotos} ejerciciosHist={ejerciciosHist} color={color} subTab={subTab} setSubTab={setSubTab} cliente={cliente} cargarTodo={cargarTodo} modoPreview={modoPreview} />}
          {tab === 'mensajes' && VER_MENSAJES && <TabMensajes mensajes={mensajes} textoMsg={textoMsg} setTextoMsg={setTextoMsg} enviandoMsg={enviandoMsg} enviarMensaje={enviarMensaje} color={color} endRef={mensajesEndRef} modoPreview={modoPreview} config={config} />}
          {tab === 'mas' && <TabMas pagos={pagos} planCobro={planCobro} plan={plan} cliente={cliente} setCliente={setCliente} color={color} tabsExtra={[]} setTab={setTab} msgNoLeidos={msgNoLeidos} seccionInicial={seccionMasInicial} onConsumirSeccionInicial={() => setSeccionMasInicial(null)} solicitarCambioPlan={solicitarCambioPlan} lesiones={lesiones} cargarTodo={cargarTodo} modoPreview={modoPreview} pushSuscrito={pushSuscrito} setPushSuscrito={setPushSuscrito} />}
        </div>

        {/* FAB — botón flotante entreno, visible desde hoy/nutricion/progreso */}
        {!modoPreview && diaFAB && !['mensajes', 'mas', 'entrena'].includes(tab) && (
          <button
            onClick={() => {
              if (esOnline) {
                setModalRegistro(diaFAB)
              } else {
                setTab('entrena')
              }
            }}
            className="md:hidden fixed z-30 active:scale-90 transition-all duration-150 shadow-2xl"
            style={{
              bottom: 'calc(72px + max(env(safe-area-inset-bottom, 0px), 8px))',
              right: 20,
              width: 52,
              height: 52,
              borderRadius: 16,
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Iniciar entreno"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/>
            </svg>
          </button>
        )}

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

        {/* Onboarding overlay — 3 pasos, solo clientes online nuevos, descartable */}
        {mostrarOnboarding && !onbCerrado && (() => {
          const cerrar = () => {
            try { localStorage.setItem('portal_onboarding_v1', '1') } catch {}
            setOnbCerrado(true)
          }
          const pasos = [
            {
              emoji: '💪',
              titulo: 'Tu plan de entreno',
              desc: 'Aquí encontrarás tu rutina semanal. Puedes registrar cada sesión y ver tu progreso en tiempo real.',
              tab: 'entrena',
              tabLabel: 'Ir a Entrena',
              ocultarSiNoAcceso: !verRutina,
            },
            {
              emoji: '📊',
              titulo: 'Tu progreso',
              desc: 'Registra tu peso, medidas y fotos. Verás cómo avanzas semana a semana hacia tu objetivo.',
              tab: 'progreso',
              tabLabel: 'Ver Progreso',
              ocultarSiNoAcceso: false,
            },
            {
              emoji: '💬',
              titulo: 'Habla con tu entrenador',
              desc: 'Tienes acceso directo a tu entrenador. Escríbele cuando quieras, te responde en 24h.',
              tab: 'mas',
              tabLabel: 'Ir a Mensajes',
              ocultarSiNoAcceso: !VER_MENSAJES,
            },
          ].filter(p => !p.ocultarSiNoAcceso)
          if (!pasos.length) return null
          const paso = pasos[Math.min(onbStep, pasos.length - 1)]
          const esUltimo = onbStep >= pasos.length - 1
          return (
            <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
              onClick={cerrar}>
              <div className="w-full max-w-sm mx-4 mb-[calc(72px+max(env(safe-area-inset-bottom,0px),8px)+12px)] md:mb-0 md:mx-auto"
                style={{ borderRadius: 28, background: '#0A0A0A', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}>
                {/* Header con X */}
                <div className="flex items-center justify-between px-5 pt-5 pb-0">
                  <div className="flex gap-1.5">
                    {pasos.map((_, i) => (
                      <div key={i} className="h-1 rounded-full transition-all duration-300"
                        style={{ width: i === onbStep ? 20 : 8, background: i <= onbStep ? color : 'rgba(255,255,255,0.15)' }} />
                    ))}
                  </div>
                  <button onClick={cerrar}
                    className="w-7 h-7 flex items-center justify-center rounded-full active:opacity-60 transition-opacity"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 1 }}>
                    ×
                  </button>
                </div>
                {/* Contenido del paso */}
                <div className="px-5 pt-5 pb-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                    style={{ background: `${color}20` }}>
                    {paso.emoji}
                  </div>
                  <p className="text-white font-black text-xl mb-2 leading-tight">{paso.titulo}</p>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>{paso.desc}</p>
                  {/* Botones */}
                  <div className="flex gap-3">
                    {!esUltimo && (
                      <button onClick={cerrar}
                        className="flex-1 py-3 rounded-xl text-sm font-bold active:opacity-70 transition-opacity"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                        Saltar
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (esUltimo) {
                          cerrar()
                          setTab(paso.tab)
                        } else {
                          setOnbStep(s => s + 1)
                        }
                      }}
                      className="flex-1 py-3 rounded-xl text-sm font-black active:scale-95 transition-all duration-150"
                      style={{ background: color, color: 'white' }}>
                      {esUltimo ? paso.tabLabel : 'Siguiente →'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Toast */}
        {toast && <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-xl whitespace-nowrap" style={{ background: color }}>{toast}</div>}

        {/* Modal check-in */}
        {modalCI && <ModalCheckin color={color} ciForm={ciForm} setCiForm={setCiForm} enviandoCI={enviandoCI} enviarCheckin={enviarCheckin} editando={!!ciEditandoId} onClose={() => { setModalCI(false); setCiEditandoId(null) }} />}

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
              <div className="mb-4">
                <p className="text-sm font-bold text-[#0A0A0A] mb-2">📝 Nota (opcional)</p>
                <textarea value={notaValoracion} onChange={e => setNotaValoracion(e.target.value)} rows={2}
                  placeholder="Algo que quieras contarle a tu entrenador..."
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" />
              </div>
              <button onClick={guardarValoracion} disabled={!rpe||!fatigaVal||guardandoVal}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95"
                style={{ background: color }}>{guardandoVal?'⏳...':'✓ Guardar valoración'}</button>
            </div>
          </div>
        )}

        {/* Modal actividad */}
        {modalActividad && <ModalActividad color={color} actForm={actForm} setActForm={setActForm} guardandoAct={guardandoAct} guardarActividad={guardarActividad} onClose={() => setModalActividad(false)} ACTIVIDADES={ACTIVIDADES} />}

        {/* Modal registro sesión */}
        {modalRegistro && <ModalRegistroSesion dia={modalRegistro} color={color} registroSets={registroSets} setRegistroSets={setRegistroSets} ejerciciosHist={ejerciciosHist} guardandoRegistro={guardandoRegistro} guardarRegistroSesion={guardarRegistroSesion} onClose={() => { setModalRegistro(null); setRegistroSets({}); setSesionGuardadaId(null) }} sesionGuardadaId={sesionGuardadaId} cliente={cliente} onFinalizar={cerrarModalRegistro} acceso={acceso} solicitarCambioPlan={solicitarCambioPlan} modoPreview={modoPreview} biblioteca={biblioteca} />}

      </main>
    </div>
    </>
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
        <button onClick={() => { setEnviado(false); setRecuperar(false) }} className="text-acento text-sm font-semibold">← Volver</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: BRAND.color }}>
            <BrandMark size={32} />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">{BRAND.nombre}</h1>
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
                  <button type="button" onClick={() => setRecuperar(true)} className="text-acento text-xs font-medium">¿La olvidaste?</button>
                </div>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)} required placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>
            )}
            {error && <p className="text-red-400 text-xs rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)' }}>{error}</p>}
            <button type="submit" disabled={loading || !email || (!recuperar && !pass)}
              className="w-full font-bold py-3.5 rounded-xl text-white disabled:opacity-40 active:scale-95 transition-all"
              style={{ background: BRAND.color }}>{loading ? '...' : recuperar ? 'Enviar enlace' : 'Entrar'}</button>
            {recuperar && <button type="button" onClick={() => setRecuperar(false)} className="w-full text-white/40 text-sm py-2">← Volver</button>}
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Onboarding guiado (cliente nuevo) ─────────────────────────────────────────
function OnboardingNuevoCliente({ cliente, color, config, pasoCuestionarioDone, pasoCheckinDone, pasoRutinaDone, setModalCI, setTab }) {
  const nombreEntrenador = config?.nombre_entrenador || 'Tu entrenador'
  const obligatoriosListos = pasoCuestionarioDone && pasoCheckinDone
  const completados = (pasoCuestionarioDone ? 1 : 0) + (pasoCheckinDone ? 1 : 0) + (pasoRutinaDone ? 1 : 0)
  const pasoActual = Math.min(completados + 1, 3)
  const urlCuestionario = `${window.location.origin}/nutricion-cuest?e=${cliente.entrenador_id}&c=${cliente.id}`

  return (
    <div className="rounded-3xl p-5 md:p-6" style={{ background: '#0A0A0A' }}>
      <div className="space-y-5">
        {/* Progreso */}
        <div>
          {obligatoriosListos ? (
            <p className="text-white font-black text-lg leading-tight flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
              ¡Todo listo! {nombreEntrenador} está preparando tu plan
            </p>
          ) : (
            <>
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Paso {pasoActual} de 3
              </p>
              <h1 className="text-white font-black text-2xl tracking-tight leading-tight">Vamos a conocerte</h1>
            </>
          )}
          <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(completados / 3) * 100}%`, background: color }} />
          </div>
        </div>

        {/* Paso 1 — Cuestionario */}
        <div className="bg-white rounded-2xl p-5 border border-black/5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="font-black text-[#0A0A0A] text-base leading-tight">1. Cuéntame cómo eres</p>
            {pasoCuestionarioDone
              ? <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">✓ Listo</span>
              : <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-50 flex-shrink-0" style={{ color }}>Pendiente</span>}
          </div>
          <p className="text-sm text-[#6B6B6B] leading-relaxed mb-4">
            Necesito conocer tu alimentación, rutinas y objetivos para preparar tu plan personalizado
          </p>
          {!pasoCuestionarioDone && (
            <a href={urlCuestionario}
              className="block text-center text-white text-sm font-black py-3 rounded-xl active:scale-95 transition-all"
              style={{ background: color }}>
              Rellenar cuestionario →
            </a>
          )}
        </div>

        {/* Paso 2 — Check-in */}
        <div className="bg-white rounded-2xl p-5 border border-black/5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="font-black text-[#0A0A0A] text-base leading-tight">2. Tu primer check-in</p>
            {pasoCheckinDone
              ? <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">✓ Listo</span>
              : <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-50 flex-shrink-0" style={{ color }}>Pendiente</span>}
          </div>
          <p className="text-sm text-[#6B6B6B] leading-relaxed mb-4">
            Cuéntame cómo estás hoy — energía, sueño, estrés. Es el punto de partida de todo
          </p>
          {!pasoCheckinDone && (
            <button onClick={() => setModalCI(true)}
              className="w-full text-white text-sm font-black py-3 rounded-xl active:scale-95 transition-all"
              style={{ background: color }}>
              Hacer mi check-in →
            </button>
          )}
        </div>

        {/* Paso 3 — Plan (informativo) */}
        <div className="bg-white rounded-2xl p-5 border border-black/5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="font-black text-[#0A0A0A] text-base leading-tight">3. Tu plan {pasoRutinaDone ? 'está listo' : 'está en camino'}</p>
            {pasoRutinaDone
              ? <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">✓ Listo</span>
              : <span className="text-xl flex-shrink-0">⏳</span>}
          </div>
          <p className="text-sm text-[#6B6B6B] leading-relaxed mb-4">
            {pasoRutinaDone
              ? 'Tu entrenador ya ha preparado tu rutina personalizada.'
              : `En cuanto completes los pasos anteriores, ${nombreEntrenador} preparará tu plan personalizado. Te avisaremos cuando esté listo.`}
          </p>
          {pasoRutinaDone && (
            <button onClick={() => setTab('entrena')}
              className="w-full text-white text-sm font-black py-3 rounded-xl active:scale-95 transition-all"
              style={{ background: color }}>
              Ver mi plan →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TAB HOY ──────────────────────────────────────────────────────────────────
function TabHoy({ cliente, color, config, checkins, rutina, nutricion, sesiones, sesionesHoy, pendientes, sesionesPendientesValorar, cuest, verRutina, verNutricion, setTab, setModalCI, setValorando, sesionesEstaSemana, semanasActivas, setModalActividad, setModalRegistro, ejerciciosHist, editarCheckin }) {
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
  const ciUrgente = VER_CHECKIN && diasSinCI >= 7
  const diffPeso = pesos.length >= 2 ? +(pesos[pesos.length-1].peso - pesos[0].peso).toFixed(1) : null
  const diasRutina = rutina?.borrador?.dias || rutina?.contenido?.dias || []
  // Día de rutina que toca: sesiones completadas desde el lunes de esta semana
  // (sesionesEstaSemana trae 30 días para la agenda y las valoraciones; si se
  // contaran todas, el día cambiaría según sesiones de semanas anteriores).
  const lunesStr = (() => { const d = new Date(ahora); d.setDate(d.getDate() - (d.getDay() || 7) + 1); return d.toLocaleDateString('sv-SE') })()
  const sesCompletadas = (sesionesEstaSemana || []).filter(s => s.completada && s.fecha >= lunesStr && s.fecha <= hoy).length
  const diaHoy = diasRutina.length > 0 ? diasRutina[sesCompletadas % diasRutina.length] : null

  // Récord personal reciente: el último ejercicio registrado esta semana con nuevo máximo histórico
  const recordReciente = (() => {
    if (!ejerciciosHist?.length) return null
    const haceDosDias = new Date(ahora); haceDosDias.setDate(ahora.getDate() - 2)
    const haceDosDiasStr = haceDosDias.toLocaleDateString('sv-SE')
    // Registros de los últimos 2 días (sesion_ejercicios con su sesion)
    const recientes = ejerciciosHist.filter(r => r.sesiones?.fecha >= haceDosDiasStr)
    if (!recientes.length) return null
    // Por cada ejercicio reciente, ver si superó su máximo anterior
    for (const reg of recientes) {
      const nombre = reg.ejercicio_nombre
      const setsReciente = (reg.sets || []).filter(s => s.peso && !isNaN(+s.peso) && s.completada)
      if (!setsReciente.length) continue
      const maxReciente = Math.max(...setsReciente.map(s => +s.peso))
      // Buscar el máximo histórico anterior (registros más antiguos del mismo ejercicio)
      const anteriores = ejerciciosHist.filter(r => r.ejercicio_nombre === nombre && r.sesiones?.fecha < reg.sesiones?.fecha)
      if (!anteriores.length) continue // sin historial previo no podemos comparar
      const maxAnterior = Math.max(...anteriores.flatMap(r =>
        (r.sets || []).filter(s => s.peso && !isNaN(+s.peso)).map(s => +s.peso)
      ))
      if (maxReciente > maxAnterior) {
        return { nombre, peso: maxReciente, anterior: maxAnterior, fecha: reg.sesiones?.fecha }
      }
    }
    return null
  })()

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

      {/* Resumen semanal de progreso */}
      {(sesCompletadas > 0 || (pesos.length >= 2)) && !esNuevo && (() => {
        // Diff de peso esta semana (último check-in de la semana vs el anterior)
        const pesosEstaSemana = (checkins || []).filter(c => c.peso && c.fecha >= lunesStr)
        const pesoUltimo = pesosEstaSemana[0]?.peso ?? null
        const pesoAnteriorSemana = (checkins || []).filter(c => c.peso && c.fecha < lunesStr)[0]?.peso ?? null
        const diffPesoSemana = pesoUltimo !== null && pesoAnteriorSemana !== null ? +(pesoUltimo - pesoAnteriorSemana).toFixed(1) : null
        const meta = cliente?.peso_objetivo || null
        const faltaParaMeta = meta && pesoUltimo ? +(pesoUltimo - meta).toFixed(1) : null
        return (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#0A0A0A' }}>
            <div className="px-4 pt-3.5 pb-1.5">
              <p className="text-[9px] font-black tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Esta semana</p>
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${[sesCompletadas > 0, diffPesoSemana !== null, faltaParaMeta !== null].filter(Boolean).length || 1}, 1fr)` }}>
              {sesCompletadas > 0 && (
                <div className="px-4 pb-4 pt-1 border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-3xl font-black text-white leading-none">{sesCompletadas}</p>
                  <p className="text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>sesion{sesCompletadas !== 1 ? 'es' : ''}</p>
                </div>
              )}
              {diffPesoSemana !== null && (
                <div className="px-4 pb-4 pt-1 border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-3xl font-black leading-none" style={{ color: diffPesoSemana < 0 ? '#10b981' : diffPesoSemana > 0 ? '#818cf8' : 'rgba(255,255,255,0.5)' }}>
                    {diffPesoSemana > 0 ? '+' : ''}{diffPesoSemana}
                  </p>
                  <p className="text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>kg sem</p>
                </div>
              )}
              {faltaParaMeta !== null && (
                <div className="px-4 pb-4 pt-1">
                  <p className="text-3xl font-black leading-none" style={{ color: faltaParaMeta <= 0 ? '#10b981' : color }}>
                    {faltaParaMeta <= 0 ? '✓' : `${faltaParaMeta > 0 ? '+' : ''}${faltaParaMeta}`}
                  </p>
                  <p className="text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>para meta</p>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Récord personal reciente */}
      {recordReciente && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0A0A0A' }}>
          <div className="px-4 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: `${color}25` }}>
              🏆
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black tracking-[0.15em] uppercase mb-0.5" style={{ color }}>Nuevo récord personal</p>
              <p className="text-white font-black text-base leading-tight truncate">{recordReciente.nombre}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {recordReciente.peso}kg <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span> antes {recordReciente.anterior}kg
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-black" style={{ color }}>+{(recordReciente.peso - recordReciente.anterior).toFixed(1)}</p>
              <p className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>kg</p>
            </div>
          </div>
        </div>
      )}

      {/* Último check-in — editable si es de hoy o ayer */}
      {checkins?.[0] && (
        <div className="bg-white rounded-2xl border border-black/5 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Último check-in</p>
            {diasSinCI <= 1 && (
              <button onClick={() => editarCheckin(checkins[0])} className="text-[10px] font-bold" style={{ color }}>✏️ Editar</button>
            )}
          </div>
          <div className="flex gap-2.5 flex-wrap">
            {checkins[0].energia != null && <span className="text-[10px] font-bold text-[#9B9B9B]" title="Energía">⚡ Energía {checkins[0].energia}/5</span>}
            {checkins[0].sueno != null && <span className="text-[10px] font-bold text-[#9B9B9B]" title="Sueño">😴 Sueño {checkins[0].sueno}/5</span>}
            {checkins[0].fatiga != null && <span className="text-[10px] font-bold text-[#9B9B9B]" title="Fatiga">🏋️ Fatiga {checkins[0].fatiga}/5</span>}
            {checkins[0].estres != null && <span className="text-[10px] font-bold text-[#9B9B9B]" title="Estrés">🧠 Estrés {checkins[0].estres}/5</span>}
            {checkins[0].peso != null && <span className="text-[10px] font-bold text-[#9B9B9B]">⚖️ {checkins[0].peso}kg</span>}
          </div>
        </div>
      )}

      {/* Bienvenida nuevo */}
      {esNuevo && (
        <div className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
          <div className="px-5 py-6">
            {/* M9 F3 — Mensaje de bienvenida personalizado */}
            <p className="text-white/60 text-xs font-semibold mb-1.5">{config?.portal_bienvenida?.trim() || `Bienvenido a ${BRAND.nombre}`}</p>
            <p className="text-white font-bold text-xl leading-snug">{config?.nombre_entrenador||'Tu entrenador'} está preparando tu plan</p>
            <p className="text-white/60 text-sm mt-2">En breve tendrás tu rutina, plan de nutrición y progreso.</p>
            {verNutricion && !cuest && (
              <a href={`${window.location.origin}/nutricion-cuest?e=${cliente.entrenador_id}&c=${cliente.id}`}
                className="mt-4 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white font-black text-sm active:scale-95 transition-all"
                style={{ color }}>
                🥗 Rellenar cuestionario de nutrición →
              </a>
            )}
          </div>
          {VER_MENSAJES && (
          <div className="px-5 py-3.5 bg-black/15 flex items-center justify-between">
            <p className="text-white/60 text-xs">¿Alguna duda?</p>
            <button onClick={() => setTab('mensajes')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/20 text-white active:scale-95">Escribir →</button>
          </div>
          )}
        </div>
      )}

      {/* Cuestionario nutrición */}
      {verNutricion && !nutricion && !cuest && !esNuevo && (
        <a href={`${window.location.origin}/nutricion-cuest?e=${cliente.entrenador_id}&c=${cliente.id}`}
          className="flex items-center gap-4 rounded-2xl p-4 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><span className="text-xl">🥗</span></div>
          <div className="flex-1"><p className="text-sm font-bold text-white">Cuestionario de nutrición</p><p className="text-xs text-white/70 mt-0.5">Necesario para crear tu plan personalizado</p></div>
          <span className="text-white/70 text-xl flex-shrink-0">→</span>
        </a>
      )}

      {/* Sesiones presenciales pendientes de valorar */}
      {sesionesPendientesValorar?.length > 0 && (
        <div className="rounded-2xl p-4 border-2 space-y-3" style={{ borderColor: color, background: `${color}06` }}>
          <p className="text-sm font-bold text-[#0A0A0A]">
            Tienes {sesionesPendientesValorar.length} sesión{sesionesPendientesValorar.length > 1 ? 'es' : ''} pendiente{sesionesPendientesValorar.length > 1 ? 's' : ''} de valorar
          </p>
          <div className="space-y-2">
            {sesionesPendientesValorar.map(s => (
              <div key={s.id} className="bg-white rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0A0A0A]">{new Date(s.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'})}</p>
                  {s.hora && <p className="text-xs text-[#6B6B6B]">{s.hora.slice(0,5)}</p>}
                </div>
                <button onClick={() => setValorando(s)}
                  className="text-white text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0 active:scale-95 transition-all" style={{ background: color }}>
                  Valorar
                </button>
              </div>
            ))}
          </div>
        </div>
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

      {/* Próxima sesión — presencial sin sesión programada hoy */}
      {!sesionHoy && !esOnline && (() => {
        const proxima = (sesiones || []).find(s => s.fecha > hoy)
        if (!proxima) return null
        const fechaProxima = new Date(proxima.fecha + 'T12:00:00')
        const hoyDate = new Date()
        hoyDate.setHours(0,0,0,0)
        const diasHasta = Math.round((fechaProxima - hoyDate) / 86400000)
        const DIAS_L = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
        const MESES_L = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
        const labelDias = diasHasta === 0 ? 'Hoy' : diasHasta === 1 ? 'Mañana' : `En ${diasHasta} días`
        // Ejercicios principales del día que toca (máx 3)
        const ejerciciosPrincipales = (diaHoy?.ejercicios || []).slice(0, 3)
        const totalEjercicios = (diaHoy?.ejercicios || []).length
        return (
          <div className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)`, border: `1.5px solid ${color}25` }}>
            {/* Header con countdown */}
            <div className="px-5 pt-4 pb-3 flex items-start justify-between">
              <div>
                <p className="text-[9px] font-black tracking-[0.18em] uppercase mb-1" style={{ color }}>Próxima sesión</p>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: color }}>
                    <span className="text-[8px] font-black text-white/70 uppercase leading-none">{DIAS_L[fechaProxima.getDay()]}</span>
                    <span className="text-lg font-black text-white leading-tight">{fechaProxima.getDate()}</span>
                  </div>
                  <div>
                    <p className="text-base font-black text-[#0A0A0A]">
                      {diasHasta === 0 ? 'Hoy' : diasHasta === 1 ? 'Mañana' : `${DIAS_L[fechaProxima.getDay()]} ${fechaProxima.getDate()} ${MESES_L[fechaProxima.getMonth()]}`}
                    </p>
                    {proxima.hora && (
                      <p className="text-xs text-[#6B6B6B]">🕐 {proxima.hora.slice(0,5)}{proxima.duracion_minutos ? ` · ${proxima.duracion_minutos} min` : ''}</p>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-white" style={{ background: color }}>{labelDias}</span>
            </div>
            {/* Qué toca */}
            {diaHoy && (
              <div className="mx-4 mb-4 rounded-2xl bg-white/70 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black tracking-[0.12em] uppercase text-[#9B9B9B]">Qué toca</p>
                  <span className="text-[9px] font-bold text-[#9B9B9B]">{totalEjercicios} ejercicios</span>
                </div>
                <p className="text-sm font-black text-[#0A0A0A] mb-1.5">{diaHoy.nombre}</p>
                {ejerciciosPrincipales.length > 0 && (
                  <div className="space-y-1">
                    {ejerciciosPrincipales.map((ej, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                        <p className="text-[11px] text-[#6B6B6B] truncate">{ej.nombre}
                          {ej.series && ej.reps && <span className="text-[#C0C0C0]"> · {ej.series}×{ej.reps}</span>}
                        </p>
                      </div>
                    ))}
                    {totalEjercicios > 3 && (
                      <p className="text-[10px] text-[#C0C0C0] pl-3">+{totalEjercicios - 3} más</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* CTA */}
            <div className="px-4 pb-4">
              <button onClick={() => setTab('entrena')}
                className="w-full py-3 rounded-2xl text-sm font-black text-white active:scale-95 transition-all"
                style={{ background: color }}>
                Ver rutina completa →
              </button>
            </div>
          </div>
        )
      })()}

      {/* Próxima sesión online — sin sesión registrada hoy */}
      {!sesionHoy && diaHoy && esOnline && (
        <div className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)`, border: `1.5px solid ${color}25` }}>
          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-start justify-between">
            <div>
              <p className="text-[9px] font-black tracking-[0.18em] uppercase mb-1.5" style={{ color }}>Entrena hoy</p>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-black text-white"
                  style={{ background: color }}>
                  {sesCompletadas % diasRutina.length + 1}
                </div>
                <div>
                  <p className="text-base font-black text-[#0A0A0A]">{diaHoy.nombre}</p>
                  <p className="text-[11px] text-[#9B9B9B]">{(diaHoy.ejercicios||[]).length} ejercicios · día {sesCompletadas % diasRutina.length + 1} de {diasRutina.length}</p>
                </div>
              </div>
            </div>
            {rutina && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>{limpiarNombreRutina(rutina.nombre)}</span>
            )}
          </div>
          {/* Ejercicios principales */}
          {(diaHoy.ejercicios||[]).length > 0 && (
            <div className="mx-4 mb-4 rounded-2xl bg-white/70 px-4 py-3">
              <p className="text-[10px] font-black tracking-[0.12em] uppercase text-[#9B9B9B] mb-2">Ejercicios</p>
              <div className="space-y-1">
                {(diaHoy.ejercicios||[]).slice(0,4).map((ej, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                    <p className="text-[11px] text-[#6B6B6B] truncate">{ej.nombre}
                      {ej.series && ej.reps && <span className="text-[#C0C0C0]"> · {ej.series}×{ej.reps}</span>}
                    </p>
                  </div>
                ))}
                {(diaHoy.ejercicios||[]).length > 4 && (
                  <p className="text-[10px] text-[#C0C0C0] pl-3">+{(diaHoy.ejercicios||[]).length - 4} más</p>
                )}
              </div>
            </div>
          )}
          {/* CTAs */}
          <div className="px-4 pb-4 flex gap-2">
            <button onClick={() => setTab('entrena')}
              className="flex-1 py-3 rounded-2xl text-xs font-black border-2 text-[#0A0A0A] active:scale-95 transition-all"
              style={{ borderColor: `${color}30`, background: 'white' }}>
              Ver detalle
            </button>
            <button onClick={() => setModalRegistro(diaHoy)}
              className="flex-1 py-3 rounded-2xl text-xs font-black text-white active:scale-95 transition-all"
              style={{ background: color }}>
              ✓ Registrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Check-in urgente */}
      {ciUrgente && (
        <button onClick={() => setModalCI(true)}
          className="w-full flex items-center gap-4 rounded-2xl p-4 active:scale-95 text-left"
          style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 flex-shrink-0">
            <span className="text-xl">⏰</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">{diasSinCI>900?'Haz tu primer check-in':`${diasSinCI} días sin check-in`}</p>
            <p className="text-xs text-white/80 mt-0.5 leading-relaxed">El check-in semanal ayuda a tu entrenador a ajustar tu plan · solo 30 segundos</p>
          </div>
          <span className="text-white/80 text-xl flex-shrink-0">→</span>
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
              {rutina ? limpiarNombreRutina(rutina.nombre) : 'En preparación'}
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
        {/* Con check-in atrasado ya sale el aviso rojo arriba: aquí no se repite.
            Sin módulo Seguimiento en el centro, no hay check-in. */}
        {VER_CHECKIN && !ciUrgente && (
          <button onClick={() => setModalCI(true)}
            className="rounded-2xl p-4 text-left active:scale-[0.98] transition-all bg-white">
            <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B] mb-2">Check-in</p>
            <p className="text-sm font-black text-[#0A0A0A] leading-tight">
              {`Hace ${diasSinCI === 0 ? 'hoy' : diasSinCI + 'd'}`}
            </p>
            <p className="text-[10px] font-bold mt-2" style={{ color }}>Nuevo →</p>
          </button>
        )}
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




// ─── Botón temporizador de descanso ───────────────────────────────────────────
function BotonTemporizador({ segundos, label, color }) {
  const [restante, setRestante] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  if (!segundos) return null

  function iniciar() {
    setRestante(segundos)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setRestante(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          return null
        }
        return r - 1
      })
    }, 1000)
  }

  const enCurso = restante !== null
  const urgente = enCurso && restante <= 10

  return (
    <button type="button" onClick={iniciar} disabled={enCurso}
      className="text-xs font-bold px-1.5 py-0.5 rounded-md transition-all active:scale-95"
      style={{
        color: urgente ? '#ef4444' : enCurso ? color : '#9B9B9B',
        background: urgente ? '#fef2f2' : enCurso ? `${color}15` : 'transparent',
      }}>
      {enCurso ? `⏱ ${restante}s` : `💤 ${label}`}
    </button>
  )
}

// Limpia nombres de rutina con partes duplicadas (ej: "Rutina perdida grasa - perdida grasa - 5 dias")
function limpiarNombreRutina(nombre) {
  if (!nombre) return nombre
  const partes = nombre.split(' - ')
  const sinDups = partes.filter((p, i) => partes.indexOf(p) === i)
  return sinDups.join(' - ')
}

// ─── Modo Entreno Activo ──────────────────────────────────────────────────────
function ModoEntrenoActivo({ dia, color, histPorEj, biblioteca, onGuardar, onCerrar, cliente }) {
  const ejercicios = dia.ejercicios || []
  const [ejActivo, setEjActivo] = useState(0)
  const [setActivo, setSetActivo] = useState(0)
  // setsLog[ejIdx] = [{peso, reps, completada}, ...]
  const [setsLog, setSetsLog] = useState(() => {
    const init = {}
    ejercicios.forEach((ej, i) => {
      const numSeries = parseInt(ej.series) || 3
      init[i] = Array.from({ length: numSeries }, () => ({ peso: '', reps: '', completada: false }))
    })
    return init
  })
  const [descansando, setDescansando] = useState(false)
  const [segundosRestantes, setSegundosRestantes] = useState(0)
  const [segundosTotales, setSegundosTotales] = useState(0)
  const [faseResumen, setFaseResumen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [celebrando, setCelebrando] = useState(false)
  const timerRef = useRef(null)
  const inputPesoRef = useRef(null)
  const inicioRef = useRef(Date.now())

  const ej = ejercicios[ejActivo]
  const totalSets = parseInt(ej?.series) || 3
  const setsDelEj = setsLog[ejActivo] || []
  const setActualData = setsDelEj[setActivo] || { peso: '', reps: '', completada: false }
  const hist = histPorEj?.[ej?.nombre]
  const bibEntry = biblioteca?.[(ej?.nombre || '').toLowerCase()]

  // Iniciar timer de descanso
  const iniciarDescanso = (segundos) => {
    if (!segundos) return
    clearInterval(timerRef.current)
    setSegundosTotales(segundos)
    setSegundosRestantes(segundos)
    setDescansando(true)
    timerRef.current = setInterval(() => {
      setSegundosRestantes(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setDescansando(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => {
    // Auto-focus en peso al cambiar ejercicio/set
    setTimeout(() => inputPesoRef.current?.focus(), 100)
    return () => clearInterval(timerRef.current)
  }, [ejActivo, setActivo])

  const updateSet = (campo, valor) => {
    setSetsLog(prev => {
      const copia = { ...prev }
      copia[ejActivo] = copia[ejActivo].map((s, i) =>
        i === setActivo ? { ...s, [campo]: valor } : s
      )
      return copia
    })
  }

  const completarSet = () => {
    // Marcar set como completado
    setSetsLog(prev => {
      const copia = { ...prev }
      copia[ejActivo] = copia[ejActivo].map((s, i) =>
        i === setActivo ? { ...s, completada: true } : s
      )
      return copia
    })

    const esUltimoSet = setActivo >= totalSets - 1
    const esUltimoEj = ejActivo >= ejercicios.length - 1

    if (!esUltimoSet) {
      // Iniciar descanso y avanzar al siguiente set
      const descSeg = parseDescansoSegundos(ej?.descanso)
      if (descSeg) iniciarDescanso(descSeg)
      setSetActivo(prev => prev + 1)
    } else if (!esUltimoEj) {
      // Avanzar al siguiente ejercicio
      const descSeg = parseDescansoSegundos(ej?.descanso)
      if (descSeg) iniciarDescanso(descSeg)
      setEjActivo(prev => prev + 1)
      setSetActivo(0)
    } else {
      // Fin del entreno — mostrar resumen
      clearInterval(timerRef.current)
      setDescansando(false)
      setFaseResumen(true)
    }
  }

  const saltarSet = () => {
    const esUltimoSet = setActivo >= totalSets - 1
    const esUltimoEj = ejActivo >= ejercicios.length - 1
    if (!esUltimoSet) {
      setSetActivo(prev => prev + 1)
    } else if (!esUltimoEj) {
      setEjActivo(prev => prev + 1)
      setSetActivo(0)
    } else {
      setFaseResumen(true)
    }
  }

  const guardarEntreno = async () => {
    setGuardando(true)
    const duracionMin = Math.round((Date.now() - inicioRef.current) / 60000)
    try {
      await onGuardar(setsLog, ejercicios, dia, duracionMin)
      setGuardado(true)
      setCelebrando(true)
      setTimeout(() => setCelebrando(false), 3000)
    } catch (e) {
      console.error('Error guardando entreno:', e)
    } finally {
      setGuardando(false)
    }
  }

  // ── Fase resumen ──
  if (faseResumen) {
    const seriesRealizadas = Object.values(setsLog).flat().filter(s => s.completada && (s.peso || s.reps)).length
    const duracionMin = Math.round((Date.now() - inicioRef.current) / 60000)

    // Confetti particles — colores vivos sobre fondo oscuro
    const CONFETTI_COLORS = [color, '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
    const confettiParticles = Array.from({ length: 40 }, (_, i) => {
      const col = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      const left = 5 + (i * 2.4) % 90
      const delay = (i * 0.07) % 1.2
      const dur = 1.8 + (i % 5) * 0.25
      const size = 6 + (i % 4) * 3
      const isCircle = i % 3 !== 0
      return { col, left, delay, dur, size, isCircle, id: i }
    })

    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0A' }}>
        {/* Confetti overlay */}
        {celebrando && (
          <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
            <style>{`
              @keyframes confetti-fall {
                0%   { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
                70%  { opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
              }
              @keyframes confetti-sway {
                0%, 100% { margin-left: 0px; }
                25%       { margin-left: 12px; }
                75%       { margin-left: -12px; }
              }
            `}</style>
            {confettiParticles.map(p => (
              <div key={p.id} style={{
                position: 'absolute',
                left: `${p.left}%`,
                top: '-20px',
                width: p.isCircle ? p.size : p.size * 0.7,
                height: p.isCircle ? p.size : p.size * 1.4,
                borderRadius: p.isCircle ? '50%' : '2px',
                background: p.col,
                animation: `confetti-fall ${p.dur}s ${p.delay}s ease-in forwards, confetti-sway ${p.dur * 0.6}s ${p.delay}s ease-in-out infinite`,
              }} />
            ))}
            {/* Texto celebración centrado */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div style={{
                fontSize: 72,
                animation: 'confetti-fall 0.5s ease-out reverse forwards',
                animationFillMode: 'both',
              }}>🏆</div>
              <p className="text-white font-black text-2xl mt-3 text-center px-6" style={{
                textShadow: `0 0 20px ${color}`,
              }}>¡Así se hace!</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-12 pb-6 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-5"
              style={{ background: `${color}20` }}>🏁</div>
            <p className="text-white font-black text-3xl mb-2">¡Entreno terminado!</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {seriesRealizadas} series · {duracionMin} min
            </p>
          </div>

          {/* Resumen por ejercicio */}
          <div className="px-4 pb-4 space-y-2">
            {ejercicios.map((ej, ei) => {
              const sets = (setsLog[ei] || []).filter(s => s.completada || s.peso || s.reps)
              if (!sets.length) return null
              return (
                <div key={ei} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-sm font-bold text-white mb-2">{ej.nombre}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sets.map((s, si) => (
                      <div key={si} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                        style={{ background: s.completada ? `${color}25` : 'rgba(255,255,255,0.08)', color: s.completada ? color : 'rgba(255,255,255,0.4)' }}>
                        {s.peso ? `${s.peso}kg` : '—'} × {s.reps || '—'}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-4 pb-8 pt-4 space-y-2.5 flex-shrink-0" style={{ background: '#0A0A0A' }}>
          {!guardado ? (
            <button onClick={guardarEntreno} disabled={guardando}
              className="w-full py-4 rounded-2xl text-white font-black text-base active:scale-95 transition-all disabled:opacity-50"
              style={{ background: color }}>
              {guardando ? '⏳ Guardando...' : '💾 Guardar entrenamiento'}
            </button>
          ) : (
            <div className="w-full py-4 rounded-2xl text-center font-black text-base"
              style={{ background: `${color}20`, color }}>
              ✓ Guardado correctamente
            </div>
          )}
          <button onClick={onCerrar}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
            {guardado ? 'Cerrar' : 'Cerrar sin guardar'}
          </button>
        </div>
      </div>
    )
  }

  // ── Set activo — pantalla principal ──
  const progresoPct = Math.round(((ejActivo * totalSets + setActivo) / (ejercicios.length * totalSets)) * 100)
  const numSerieDisplay = setActivo + 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0A' }}>
      {/* Barra de progreso */}
      <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full transition-all duration-300 rounded-full" style={{ width: `${progresoPct}%`, background: color }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        <div>
          <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Ej {ejActivo + 1}/{ejercicios.length}
          </p>
          <p className="text-white font-black text-lg leading-tight mt-0.5">{ej?.nombre}</p>
        </div>
        <button onClick={onCerrar}
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg active:scale-95"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>✕</button>
      </div>

      {/* Subtítulo del ejercicio */}
      <div className="px-5 pb-3 flex-shrink-0">
        <div className="flex flex-wrap gap-2">
          {ej?.series && <span className="text-xs rounded-lg px-2.5 py-1 font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{ej.series} series</span>}
          {ej?.reps && <span className="text-xs rounded-lg px-2.5 py-1 font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{ej.reps} reps</span>}
          {ej?.peso && <span className="text-xs rounded-lg px-2.5 py-1 font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{ej.peso}</span>}
        </div>
      </div>

      {/* Timer de descanso */}
      {descansando && (
        <div className="mx-4 mb-3 rounded-2xl px-4 py-3 flex items-center gap-3 flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3"
                stroke={color}
                strokeDasharray={`${(segundosRestantes / segundosTotales) * 100} 100`}
                strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{segundosRestantes}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Descansando</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Siguiente: Serie {numSerieDisplay} — prepárate</p>
          </div>
          <button onClick={() => { clearInterval(timerRef.current); setDescansando(false) }}
            className="text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95"
            style={{ background: color, color: 'white' }}>Saltar</button>
        </div>
      )}

      {/* SERIE ACTUAL */}
      <div className="flex-1 flex flex-col justify-center px-5">
        <div className="rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.08)` }}>
          {/* Número de serie */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] font-black tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Serie</p>
            <div className="flex gap-1.5">
              {Array.from({ length: totalSets }).map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                  style={i < setActivo ? { background: color, color: 'white' }
                    : i === setActivo ? { background: `${color}30`, color, border: `2px solid ${color}` }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
                  {i < setActivo ? '✓' : i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Referencia histórica */}
          {hist && (
            <div className="mb-4 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-[10px] font-black tracking-widest uppercase mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Última vez</p>
              <p className="text-sm font-bold" style={{ color }}>
                {hist.maxPeso}kg
                {hist.rmMax > hist.maxPeso && <span className="text-xs font-normal text-[rgba(255,255,255,0.4)] ml-2">· RM ~{hist.rmMax}kg</span>}
              </p>
            </div>
          )}

          {/* Inputs peso y reps */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Peso (kg)</p>
              <input
                ref={inputPesoRef}
                type="number"
                inputMode="decimal"
                placeholder={hist ? `${hist.maxPeso}` : '0'}
                value={setActualData.peso}
                onChange={e => updateSet('peso', e.target.value)}
                className="w-full text-3xl font-black text-white text-center rounded-2xl py-4 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(255,255,255,0.1)`, caretColor: color }}
              />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Reps</p>
              <input
                type="number"
                inputMode="numeric"
                placeholder={ej?.reps ? String(parseReps(ej.reps)) : '0'}
                value={setActualData.reps}
                onChange={e => updateSet('reps', e.target.value)}
                className="w-full text-3xl font-black text-white text-center rounded-2xl py-4 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(255,255,255,0.1)`, caretColor: color }}
              />
            </div>
          </div>

          {/* Nota del ejercicio */}
          {ej?.notas && (
            <p className="text-[10px] leading-relaxed mb-4 italic" style={{ color: 'rgba(255,255,255,0.3)' }}>💡 {ej.notas}</p>
          )}

          {/* Botón serie completada */}
          <button onClick={completarSet}
            className="w-full py-4 rounded-2xl font-black text-lg text-white active:scale-95 transition-all"
            style={{ background: color }}>
            ✓ Serie completada
          </button>
        </div>
      </div>

      {/* Footer con progreso y saltar */}
      <div className="px-5 pb-8 pt-4 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-white font-semibold">{dia.nombre || `Día`}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{progresoPct}% completado</p>
        </div>
        <button onClick={saltarSet}
          className="text-xs font-bold px-4 py-2 rounded-xl active:scale-95"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
          Saltar →
        </button>
      </div>
    </div>
  )
}

function TabEntrena({ rutina, color, ejerciciosHist, setModalRegistro, esOnline, biblioteca = {}, cliente, onEntrenoGuardado, setValorando }) {
  const [diaAbierto, setDiaAbierto] = useState(null) // null = todos cerrados
  const [videoEj, setVideoEj] = useState(null) // { nombre, youtube_url, consejos_tecnica }
  const [entrenoActivo, setEntrenoActivo] = useState(null) // dia object

  if (!rutina) return (
    <div className="space-y-3 pb-4">
      <div className="rounded-3xl overflow-hidden" style={{ background: '#0A0A0A' }}>
        <div className="px-5 pt-6 pb-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{ background: `${color}20` }}>💪</div>
          <p className="text-white font-black text-2xl leading-tight mb-2">Rutina en<br/>preparación</p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>Tu entrenador está diseñando tu plan personalizado. Te avisaremos cuando esté lista.</p>
        </div>
        <div className="px-5 pb-5">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[9px] font-black tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>Mientras tanto</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: `${color}20` }}>📊</div>
                <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>Completa tu check-in semanal</p>
              </div>
              {VER_MENSAJES && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: `${color}20` }}>💬</div>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>Consulta dudas con tu entrenador</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Calcular semana actual del bloque
  const semInfo = (() => {
    const totalSem = rutina.semanas || 4
    if (!rutina.fecha_inicio) return { semActual: null, totalSem, completado: false, faltan: null }
    const inicio = new Date(rutina.fecha_inicio + 'T00:00:00')
    const hoy = new Date()
    const diasTranscurridos = Math.floor((hoy - inicio) / (1000*60*60*24))
    if (diasTranscurridos < 0) return { semActual: null, totalSem, completado: false, faltan: Math.abs(diasTranscurridos) }
    if (diasTranscurridos >= totalSem * 7) return { semActual: totalSem, totalSem, completado: true, faltan: 0 }
    const semActual = Math.floor(diasTranscurridos / 7) + 1
    return { semActual, totalSem, completado: false, faltan: null }
  })()

  // Días: si hay estructura de semanas diferenciadas, usar la semana actual
  const contenidoBase = rutina.borrador || rutina.contenido || {}
  const diasDeSemana = semInfo.semActual && contenidoBase.semanas?.[semInfo.semActual - 1]?.dias
  const dias = diasDeSemana || contenidoBase.dias || []

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
    <>
    <div className="space-y-3">
      {/* Modal vídeo ejercicio */}
      {videoEj && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setVideoEj(null)}>
          <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="font-bold text-[#0A0A0A] text-base leading-tight pr-4">{videoEj.nombre}</p>
              <button onClick={() => setVideoEj(null)}
                className="w-8 h-8 rounded-full bg-[#F2F1EE] flex items-center justify-center text-[#9B9B9B] text-lg flex-shrink-0 active:scale-95">✕</button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`${ytEmbed(videoEj.youtube_url)}?autoplay=1&rel=0&modestbranding=1`}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
                title={videoEj.nombre}
              />
            </div>
            {videoEj.consejos_tecnica && (
              <div className="px-5 py-4 border-t border-black/5">
                <p className="text-xs font-semibold text-[#0A0A0A] mb-1.5">💡 Técnica</p>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">{videoEj.consejos_tecnica}</p>
              </div>
            )}
            <div className="h-safe-area-bottom pb-5" />
          </div>
        </div>
      )}

      <div className="pb-1 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">{limpiarNombreRutina(rutina.nombre)}</h2>
          <p className="text-xs text-[#9B9B9B] mt-0.5">{dias.length} días · {semInfo.totalSem} semanas</p>
        </div>
        {diaAbierto !== null && (
          <button onClick={() => setDiaAbierto(null)}
            className="text-xs text-[#9B9B9B] active:scale-95">Cerrar todo</button>
        )}
      </div>

      {/* Badge de semana actual — solo si hay fecha de inicio */}
      {rutina.fecha_inicio && (
        <div className="rounded-2xl overflow-hidden" style={{ background: semInfo.completado ? '#ecfdf5' : `${color}14` }}>
          <div className="px-4 py-3 flex items-center gap-3">
            {semInfo.faltan !== null ? (
              // Aún no ha empezado
              <>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${color}22` }}>📅</div>
                <div>
                  <p className="text-sm font-bold text-[#0A0A0A]">Empieza en {semInfo.faltan} días</p>
                  <p className="text-xs text-[#9B9B9B]">Bloque de {semInfo.totalSem} semanas</p>
                </div>
              </>
            ) : semInfo.completado ? (
              // Bloque completado
              <>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl flex-shrink-0">✅</div>
                <div>
                  <p className="text-sm font-bold text-emerald-800">Bloque completado</p>
                  <p className="text-xs text-emerald-600">{semInfo.totalSem} semanas finalizadas</p>
                </div>
              </>
            ) : (
              // En curso
              <>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
                  <span className="text-lg font-black" style={{ color }}>{semInfo.semActual}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#0A0A0A]">Semana {semInfo.semActual} de {semInfo.totalSem}</p>
                  <div className="mt-1.5 h-1.5 bg-black/8 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((semInfo.semActual / semInfo.totalSem) * 100)}%`, background: color }} />
                  </div>
                </div>
                <span className="text-xs font-semibold flex-shrink-0" style={{ color }}>{Math.round((semInfo.semActual / semInfo.totalSem) * 100)}%</span>
              </>
            )}
          </div>
        </div>
      )}

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
                    const bibEntry = biblioteca[(ej.nombre || '').toLowerCase()]
                    const tieneVideo = !!ytEmbed(bibEntry?.youtube_url) // enlace válido, si no no hay botón ▶
                    return (
                      <div key={ei} className="px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[#0A0A0A] flex-1">{ej.nombre}</p>
                              {tieneVideo && (
                                <button
                                  onClick={() => setVideoEj(bibEntry)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-all"
                                  style={{ background: `${color}15` }}
                                  title="Ver vídeo">
                                  <span className="text-[10px]" style={{ color }}>▶</span>
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                              {ej.series && <span className="text-xs text-[#9B9B9B]">{ej.series} series</span>}
                              {ej.reps && <span className="text-xs text-[#9B9B9B]">· {ej.reps} reps</span>}
                              {ej.peso && <span className="text-xs text-[#9B9B9B]">· {ej.peso}</span>}
                              {ej.descanso && ej.descanso !== '-' && (
                                <>
                                  <span className="text-xs text-[#9B9B9B]">·</span>
                                  <BotonTemporizador segundos={parseDescansoSegundos(ej.descanso)} label={ej.descanso} color={color} />
                                </>
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

                {/* Botones de acción del día */}
                <div className="px-4 py-3 border-t border-black/5 flex gap-2" style={{ background: `${color}04` }}>
                  <button onClick={() => setEntrenoActivo(dia)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white active:scale-95 transition-all"
                    style={{ background: color }}>
                    💪 Empezar entreno
                  </button>
                  {esOnline && (
                    <button onClick={() => setModalRegistro(dia)}
                      className="py-3 px-3 rounded-xl text-sm font-bold active:scale-95 transition-all border border-black/10"
                      style={{ color: color, background: 'white' }}
                      title="Registrar sin modo activo">
                      ✓
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>

    {/* Overlay modo entreno activo */}
    {entrenoActivo && (
      <ModoEntrenoActivo
        dia={entrenoActivo}
        color={color}
        histPorEj={histPorEj}
        biblioteca={biblioteca}
        cliente={cliente}
        onCerrar={() => setEntrenoActivo(null)}
        onGuardar={async (setsLog, ejercicios, dia, duracionMin) => {
          if (!cliente) return
          const tipo = esOnline ? 'online' : 'presencial'
          const { data: sesNueva, error } = await supabase.from('sesiones').insert({
            cliente_id: cliente.id,
            entrenador_id: cliente.entrenador_id,
            fecha: new Date().toISOString().split('T')[0],
            tipo,
            completada: true,
            cancelada: false,
            notas: dia.nombre || 'Entreno activo',
            valoracion_pendiente: true,
            duracion_minutos: duracionMin || null,
          }).select().single()
          if (error) throw error
          const rows = ejercicios.map((ej, i) => ({
            sesion_id: sesNueva.id,
            cliente_id: cliente.id,
            ejercicio_nombre: ej.nombre,
            patron: ej.patron || null,
            orden: i,
            sets: (setsLog[i] || []).filter(s => s.completada || s.peso || s.reps),
          })).filter(r => r.sets.length > 0)
          if (rows.length) await supabase.from('sesion_ejercicios').insert(rows)
          // Tras confetti (3s), cerrar entreno y abrir valoración inmediata
          setTimeout(() => {
            setEntrenoActivo(null)
            if (onEntrenoGuardado) onEntrenoGuardado()
            // Abrir valoración para la sesión recién creada
            if (setValorando && sesNueva) {
              setTimeout(() => setValorando({ ...sesNueva, _postEntreno: true }), 300)
            }
          }, 3200)
        }}
      />
    )}
    </>
  )
}

// ─── Tab Mensajes ─────────────────────────────────────────────────────────────
function TabMensajes({ mensajes, textoMsg, setTextoMsg, enviandoMsg, enviarMensaje, color, endRef, modoPreview, config }) {
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes?.length])
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Header entrenador */}
      <div className="flex items-center gap-3 pb-3 mb-1 border-b border-black/5 flex-shrink-0">
        {config?.foto_url
          ? <img src={config.foto_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          : <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${color}18`, color }}>{(config?.nombre_entrenador || 'E').slice(0, 2).toUpperCase()}</div>
        }
        <div>
          <p className="text-sm font-bold text-[#0A0A0A]">{config?.nombre_entrenador || 'Tu entrenador'}</p>
          <p className="text-[10px] text-[#9B9B9B]">Tu entrenador personal</p>
        </div>
      </div>
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
          placeholder={modoPreview ? 'Solo lectura en vista previa' : 'Escribe un mensaje...'}
          disabled={modoPreview}
          className="flex-1 border border-black/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-acento bg-white disabled:opacity-50" />
        <button type="submit" disabled={!textoMsg.trim() || enviandoMsg || modoPreview}
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

// ─── Tab Más ──────────────────────────────────────────────────────────────────
function TabMas({ pagos, planCobro, plan, cliente, setCliente, color, tabsExtra = [], setTab, msgNoLeidos = 0, seccionInicial, onConsumirSeccionInicial, solicitarCambioPlan, lesiones, cargarTodo, modoPreview, pushSuscrito, setPushSuscrito }) {
  const [seccion, setSeccion] = useState(seccionInicial || 'menu')
  const [form, setForm] = useState({ peso_actual: cliente?.peso_actual || '', peso_objetivo: cliente?.peso_objetivo || '', objetivo: cliente?.objetivo || '' })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [mostrarCambioPlan, setMostrarCambioPlan] = useState(false)
  const [solicitudEnviada, setSolicitudEnviada] = useState(false)
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(null)
  const [lesionForm, setLesionForm] = useState({ zona: '', severidad: 'leve', descripcion: '' })
  const [guardandoLesion, setGuardandoLesion] = useState(false)
  const [lesionEnviada, setLesionEnviada] = useState(false)

  useEffect(() => { if (seccionInicial && onConsumirSeccionInicial) onConsumirSeccionInicial() }, [])

  const pagosPendientes = pagos?.filter(p => p.estado !== 'cobrado').length || 0
  const lesionesActivas = lesiones?.filter(l => l.estado === 'activa').length || 0

  async function guardarLesion() {
    if (modoPreview || !lesionForm.zona) return
    setGuardandoLesion(true)
    await supabase.from('lesiones_cliente').insert({
      cliente_id: cliente.id, entrenador_id: cliente.entrenador_id,
      zona: lesionForm.zona, severidad: lesionForm.severidad, descripcion: lesionForm.descripcion || null,
      estado: 'activa', fecha_inicio: hoyStr(),
    })
    setLesionForm({ zona: '', severidad: 'leve', descripcion: '' })
    setGuardandoLesion(false)
    setLesionEnviada(true)
    await cargarTodo?.()
    setTimeout(() => setLesionEnviada(false), 3000)
  }

  const ITEMS = [
    {
      id: 'mensajes',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
      label: 'Mensajes',
      desc: msgNoLeidos > 0 ? `${msgNoLeidos} mensaje${msgNoLeidos > 1 ? 's' : ''} sin leer` : 'Chat con tu entrenador',
      badge: msgNoLeidos,
      urgente: msgNoLeidos > 0,
    },
    ...(pagos?.length || planCobro ? [{
      id: 'pagos',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
      label: 'Pagos',
      desc: pagosPendientes > 0 ? `${pagosPendientes} pago${pagosPendientes > 1 ? 's' : ''} pendiente${pagosPendientes > 1 ? 's' : ''}` : 'Historial de pagos',
      badge: pagosPendientes,
      urgente: pagosPendientes > 0,
    }] : []),
    {
      id: 'lesiones',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>,
      label: 'Lesiones',
      desc: lesionesActivas > 0 ? `${lesionesActivas} activa${lesionesActivas > 1 ? 's' : ''}` : 'Reportar una molestia',
      badge: 0,
      urgente: false,
    },
    {
      id: 'ajustes',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
      label: 'Ajustes',
      desc: 'Objetivo, peso, contraseña',
      badge: 0,
      urgente: false,
    },
  ].filter(i => VER_MENSAJES || i.id !== 'mensajes')

  async function guardar(e) {
    e.preventDefault()
    if (modoPreview) return
    setGuardando(true); setOk(false)
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
    return (
      <div className="space-y-4">
        <button onClick={() => setSeccion('menu')} className="text-xs font-bold flex items-center gap-1.5" style={{ color }}>← Volver</button>
        <p className="text-xl font-black text-[#0A0A0A] tracking-tight">Ajustes</p>
        <form onSubmit={guardar} className="bg-white rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[['Peso actual (kg)','peso_actual','ej. 75'],['Peso objetivo (kg)','peso_objetivo','ej. 70']].map(([label,key,ph]) => (
              <div key={key}>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9B9B9B] block mb-2">{label}</label>
                <input type="number" step="0.1" value={form[key]} placeholder={ph}
                  onChange={e => setForm(f => ({...f,[key]:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none placeholder:font-normal placeholder:text-[#C0C0C0]" />
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
          <button type="submit" disabled={guardando || modoPreview}
            className="w-full py-3.5 rounded-xl text-white font-black text-sm disabled:opacity-40"
            style={{background:ok?'#10b981':color}}>
            {guardando?'Guardando...':ok?'✓ Guardado':'Guardar'}
          </button>
        </form>
        <div className="bg-white rounded-2xl p-4">
          <button onClick={async()=>{await supabase.auth.resetPasswordForEmail(cliente?.email||'',{redirectTo:`${window.location.origin}/`});alert('Email enviado.')}}
            className="text-sm font-bold text-[#6B6B6B]">Cambiar contraseña →</button>
        </div>
        {pushSupported() && (
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#0A0A0A]">Notificaciones push</p>
              <p className="text-xs text-[#9B9B9B] mt-0.5">
                {pushSuscrito ? 'Activadas — te avisamos de mensajes y sesiones' : 'Desactivadas'}
              </p>
            </div>
            <button
              onClick={async () => {
                if (pushSuscrito) {
                  await unsubscribePush(supabase)
                  setPushSuscrito(false)
                } else {
                  const { subscription, permiso } = await subscribePush()
                  if (subscription && permiso === 'granted') {
                    await savePushSub(supabase, cliente.id, subscription)
                    setPushSuscrito(true)
                  }
                }
              }}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${pushSuscrito ? 'bg-[#10b981]' : 'bg-black/10'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${pushSuscrito ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        )}
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
        {planCobro?.estado === 'pago_fallido' && (
          <div className="rounded-2xl p-4 border border-red-200 bg-red-50">
            <p className="text-sm font-black text-red-700 mb-1">⚠️ Hay un problema con tu pago</p>
            <p className="text-xs text-red-600 leading-relaxed">Contacta con tu entrenador para actualizar tu método de pago y no perder el acceso a tu plan.</p>
          </div>
        )}
        {planCobro?.estado === 'activo' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#0A0A0A' }}>
            <div className="px-5 py-4">
              <p className="text-[9px] font-black tracking-[0.15em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Suscripción activa</p>
              <p className="text-lg font-black text-white capitalize">{planCobro.concepto || planCobro.plan}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-2xl font-black" style={{ color }}>{planCobro.importe}€<span className="text-xs text-white/40">/mes</span></p>
                {planCobro.proximo_cobro && (
                  <p className="text-[10px] text-white/40 text-right">Próximo cobro<br/><span className="text-white font-bold text-xs">{new Date(planCobro.proximo_cobro+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long'})}</span></p>
                )}
              </div>
            </div>
          </div>
        )}
        {plan && (
          <div>
            {!mostrarCambioPlan && !solicitudEnviada && (
              <button onClick={() => setMostrarCambioPlan(true)} className="text-xs font-bold underline" style={{ color }}>¿Quieres cambiar de plan?</button>
            )}
            {mostrarCambioPlan && !solicitudEnviada && (
              <div className="space-y-2 mt-2">
                {PLANES_INFO.filter(p => p.id !== plan).map(p => (
                  <div key={p.id} className="bg-white rounded-2xl p-4 border border-black/5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-black text-[#0A0A0A]">{p.nombre}</p>
                      <p className="text-sm font-black" style={{ color }}>{p.precio}€/mes</p>
                    </div>
                    <ul className="text-xs text-[#6B6B6B] space-y-0.5 mb-2.5 list-disc list-inside">
                      {p.incluye.map((inc, idx) => <li key={idx}>{inc}</li>)}
                    </ul>
                    <button onClick={async () => { setEnviandoSolicitud(p.id); await solicitarCambioPlan(p.id); setEnviandoSolicitud(null); setSolicitudEnviada(true) }}
                      disabled={enviandoSolicitud === p.id || modoPreview}
                      className="w-full text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-40 active:scale-95 transition-all" style={{ background: color }}>
                      {enviandoSolicitud === p.id ? 'Enviando...' : 'Solicitar este plan'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {solicitudEnviada && (
              <p className="text-xs text-emerald-600 font-bold mt-2">Solicitud enviada. Tu entrenador se pondrá en contacto contigo.</p>
            )}
          </div>
        )}
        {!pagos?.length ? (
          <p className="text-sm text-[#6B6B6B] text-center py-4">Sin pagos registrados aún</p>
        ) : (
          <>
            {pagos.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 flex items-center justify-between border border-black/5">
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">{p.concepto||'Mensualidad'}</p>
                  <p className="text-xs text-[#6B6B6B]">{p.fecha_pago?new Date(p.fecha_pago+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'}):''}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="font-bold text-emerald-600">{p.importe}€</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.estado==='pendiente' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'}`}>
                    {p.estado==='pendiente' ? '⏳ Pendiente' : '✓ Pagado'}
                  </span>
                </div>
              </div>
            ))}
            <p className="text-xs text-[#9B9B9B] text-right pt-1">Total facturado: {pagos.reduce((s,p)=>s+Number(p.importe||0),0)}€</p>
          </>
        )}
      </div>
    )
  }

  if (seccion === 'lesiones') {
    const SEVERIDAD_COLOR = { leve: 'bg-[#F4F3F0] text-[#6B6B6B]', moderada: 'bg-amber-50 text-amber-600', grave: 'bg-red-50 text-red-600' }
    const ESTADO_LABEL = { activa: 'Activa', en_seguimiento: 'En seguimiento', resuelta: 'Resuelta' }
    return (
      <div className="space-y-4">
        <button onClick={() => setSeccion('menu')} className="text-xs font-bold flex items-center gap-1.5" style={{ color }}>← Volver</button>
        <p className="text-xl font-black text-[#0A0A0A] tracking-tight">Lesiones</p>

        <div className="bg-white rounded-2xl p-4 space-y-3">
          <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Reportar una molestia</p>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B] mb-1.5">Zona afectada</p>
            <div className="grid grid-cols-3 gap-2">
              {ZONAS_LESION.map(z => (
                <button key={z} type="button" onClick={() => setLesionForm(f => ({ ...f, zona: z }))}
                  className="py-2 rounded-xl text-xs font-bold border transition-all"
                  style={lesionForm.zona === z ? { background: color, color: 'white', borderColor: color } : { borderColor: 'rgba(0,0,0,0.1)', color: '#6B6B6B' }}>
                  {z}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B] mb-1.5">Severidad</p>
            <div className="flex gap-2">
              {SEVERIDADES.map(([k, l]) => (
                <button key={k} type="button" onClick={() => setLesionForm(f => ({ ...f, severidad: k }))}
                  className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
                  style={lesionForm.severidad === k ? { background: color, color: 'white', borderColor: color } : { borderColor: 'rgba(0,0,0,0.1)', color: '#6B6B6B' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B] mb-1.5">Descripción (opcional)</p>
            <textarea value={lesionForm.descripcion} onChange={e => setLesionForm(f => ({ ...f, descripcion: e.target.value }))} rows={2}
              placeholder="Qué ha pasado..."
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" />
          </div>
          <button onClick={guardarLesion} disabled={!lesionForm.zona || guardandoLesion || modoPreview}
            className="w-full py-3.5 rounded-xl text-white font-black text-sm disabled:opacity-40 active:scale-95 transition-all"
            style={{ background: lesionEnviada ? '#10b981' : color }}>
            {guardandoLesion ? 'Enviando...' : lesionEnviada ? '✓ Reportada' : 'Reportar lesión'}
          </button>
        </div>

        {!lesiones?.length ? (
          <p className="text-sm text-[#6B6B6B] text-center py-4">Sin lesiones reportadas</p>
        ) : (
          <div className="space-y-3">
            {lesiones.map(l => (
              <div key={l.id} className="bg-white rounded-2xl p-4 border border-black/5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-black text-[#0A0A0A]">{l.zona}</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${SEVERIDAD_COLOR[l.severidad] || SEVERIDAD_COLOR.leve}`}>{(l.severidad || 'leve').toUpperCase()}</span>
                </div>
                <p className="text-[10px] text-[#9B9B9B] mb-1.5">{formatearFecha(l.fecha_inicio)} · {ESTADO_LABEL[l.estado] || l.estado}</p>
                {l.descripcion && <p className="text-xs text-[#6B6B6B] leading-relaxed mb-2">{l.descripcion}</p>}
                {l.protocolo_generado && l.protocolo_ia ? (
                  <div className="mt-2 pt-2 border-t border-black/5 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>🩹 Protocolo de recuperación</p>
                    {l.protocolo_ia.resumen && <p className="text-xs text-[#0A0A0A] leading-relaxed">{l.protocolo_ia.resumen}</p>}
                    {Array.isArray(l.protocolo_ia.ejercicios_rehab) && l.protocolo_ia.ejercicios_rehab.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[#9B9B9B] mb-1">Ejercicios de rehabilitación</p>
                        <div className="space-y-1">
                          {l.protocolo_ia.ejercicios_rehab.map((e, i) => (
                            <p key={i} className="text-xs text-[#444]">• {e.ejercicio} — {e.series}x{e.reps}{e.notas ? ` (${e.notas})` : ''}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(l.protocolo_ia.ejercicios_evitar) && l.protocolo_ia.ejercicios_evitar.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-red-500 mb-1">Evitar</p>
                        <p className="text-xs text-[#444]">{l.protocolo_ia.ejercicios_evitar.join(', ')}</p>
                      </div>
                    )}
                    {l.protocolo_ia.progresion && <p className="text-xs text-[#6B6B6B] italic">{l.protocolo_ia.progresion}</p>}
                  </div>
                ) : (
                  <p className="text-[10px] text-[#9B9B9B] mt-1">⏳ Tu entrenador está preparando tu protocolo de recuperación</p>
                )}
              </div>
            ))}
          </div>
        )}
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

// ─── Tab Nutrición ────────────────────────────────────────────────────────────
function TabNutricion({ nutricion, cuest, cliente, color, nutricionRegistros = [], suplementacion, cargarTodo, acceso, irAPagos, modoPreview, config, setTab, checkins = [] }) {
  const [diaAbierto, setDiaAbierto] = useState(null)
  const [guardandoDia, setGuardandoDia] = useState(null)
  const [registrosLocales, setRegistrosLocales] = useState(nutricionRegistros)
  const [guardandoAdherencia, setGuardandoAdherencia] = useState(false)
  const [adherenciaLocal, setAdherenciaLocal] = useState(null)

  if (!nutricion) {
    const nombreEntrenador = config?.nombre_entrenador || 'Tu entrenador'
    return (
      <div className="space-y-3 pb-4">
        <div className="rounded-3xl overflow-hidden" style={{ background: '#0A0A0A' }}>
          <div className="px-5 pt-6 pb-5">
            {/* Avatar entrenador + estado */}
            <div className="flex items-center gap-3 mb-5">
              {config?.foto_url ? (
                <img src={config.foto_url} alt={nombreEntrenador}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  style={{ border: `2px solid ${color}40` }} />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ background: `${color}20` }}>💪</div>
              )}
              <div>
                <p className="text-xs font-black text-white">{nombreEntrenador}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Preparando tu plan</p>
                </div>
              </div>
            </div>
            {/* Mensaje del entrenador */}
            <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(255,255,255,0.05)', borderLeft: `3px solid ${color}` }}>
              <p className="text-sm leading-relaxed text-white font-medium">
                {!cuest
                  ? `Hola, estoy trabajando en tu plan de alimentación personalizado. Para diseñarlo necesito que rellenes un breve cuestionario.`
                  : `He recibido tu cuestionario. Estoy diseñando tu plan de alimentación personalizado. Te aviso en cuanto esté listo.`
                }
              </p>
            </div>
            {!cuest ? (
              <>
                <a href={`${window.location.origin}/nutricion-cuest?e=${cliente?.entrenador_id}&c=${cliente?.id}`}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-all text-white mb-3"
                  style={{ background: color }}>
                  📋 Rellenar cuestionario →
                </a>
                {setTab && (
                  <button onClick={() => setTab('mas')}
                    className="w-full py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                    💬 Escribir a {nombreEntrenador}
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 py-3 px-4 rounded-2xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <span className="text-lg">✓</span>
                  <p className="text-sm font-semibold" style={{ color: '#10b981' }}>Cuestionario enviado</p>
                </div>
                {setTab && (
                  <button onClick={() => setTab('mas')}
                    className="w-full py-3.5 rounded-2xl text-sm font-black active:scale-95 transition-all text-white"
                    style={{ background: color }}>
                    💬 Escribir a {nombreEntrenador}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {cuest && <SuplementacionSection cuest={cuest} suplementacion={suplementacion} color={color} cliente={cliente} cargarTodo={cargarTodo} acceso={acceso} irAPagos={irAPagos} modoPreview={modoPreview} />}
        {/* M6 F1 — Disclaimer legal (estado sin plan) */}
        <div className="bg-[#F7F6F3] rounded-xl px-4 py-3 border border-black/5">
          <p className="text-[10px] text-[#9B9B9B] leading-relaxed">
            <span className="font-bold">ⓘ Aviso:</span> Las orientaciones nutricionales no sustituyen la consulta con un dietista-nutricionista colegiado. Ante cualquier condición de salud, consulta con un profesional sanitario.
          </p>
        </div>
      </div>
    )
  }

  const contenido = nutricion.contenido || nutricion.borrador || {}
  const macrosSrc = contenido.macros || {}

  const macros = [
    { label: 'Calorías', val: nutricion.calorias_dia || macrosSrc.calorias_dia, unit: 'kcal', c: color },
    { label: 'Proteína', val: nutricion.proteinas_g || macrosSrc.proteinas_g, unit: 'g', c: '#6366f1' },
    { label: 'Carbos', val: nutricion.carbohidratos_g || macrosSrc.carbohidratos_g, unit: 'g', c: '#f59e0b' },
    { label: 'Grasas', val: nutricion.grasas_g || macrosSrc.grasas_g, unit: 'g', c: '#10b981' },
  ].filter(m => m.val)

  const tieneMenu = Array.isArray(contenido.menu) && contenido.menu.length > 0
  // Normalizar nombres de días (algunos planes guardados sin tildes)
  const DIAS_NORM = { 'Miercoles': 'Miércoles', 'Sabado': 'Sábado', 'miercoles': 'Miércoles', 'sabado': 'Sábado' }
  const dias = tieneMenu ? contenido.menu.map(d => ({ ...d, dia: DIAS_NORM[d.dia] || d.dia })) : []
  const hidratacion = contenido.hidratacion || macrosSrc.hidratacion_litros || null

  // Tracker: fechas registradas
  const fechasRegistradas = new Set(registrosLocales.map(r => r.fecha))
  const hoy = hoyStr()

  async function registrarDia(dia, diaNombre) {
    if (modoPreview) return
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

  // Check-in nutricional semanal
  const inicioSemana = (() => {
    const d = new Date(); const dia = d.getDay(); const diff = dia === 0 ? -6 : 1 - dia
    d.setDate(d.getDate() + diff); return d.toISOString().split('T')[0]
  })()
  const checkinNutSemana = checkins.find(c => c.fecha >= inicioSemana && c.adherencia_nutricion)
  const adherenciaEfectiva = adherenciaLocal || checkinNutSemana?.adherencia_nutricion || null
  const ultimas4Semanas = (() => {
    const semanas = []
    for (let i = 3; i >= 0; i--) {
      const ini = new Date(); const diaIni = ini.getDay(); const diffIni = diaIni === 0 ? -6 : 1 - diaIni
      ini.setDate(ini.getDate() + diffIni - i * 7)
      const fin = new Date(ini); fin.setDate(fin.getDate() + 6)
      const iniStr = ini.toISOString().split('T')[0]
      const finStr = fin.toISOString().split('T')[0]
      const ci = checkins.find(c => c.fecha >= iniStr && c.fecha <= finStr && c.adherencia_nutricion)
      semanas.push({ semana: i, adherencia: ci?.adherencia_nutricion || null })
    }
    return semanas
  })()

  async function guardarAdherenciaNutricion(valor) {
    if (modoPreview || guardandoAdherencia) return
    setGuardandoAdherencia(true)
    setAdherenciaLocal(valor)
    // Si ya hay checkin esta semana, actualizar; si no, crear
    if (checkinNutSemana?.id) {
      await supabase.from('checkins').update({ adherencia_nutricion: valor }).eq('id', checkinNutSemana.id).then(() => {}).catch(() => {})
    } else {
      await supabase.from('checkins').insert({
        cliente_id: cliente.id, entrenador_id: cliente.entrenador_id,
        fecha: hoy, adherencia_nutricion: valor
      }).then(() => {}).catch(() => {})
    }
    setGuardandoAdherencia(false)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="pb-1">
        <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Plan de alimentación</p>
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

      {/* Check-in nutricional semanal — M6F2 */}
      {tieneMenu && (
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🥗</span>
              <span className="font-semibold text-[#0A0A0A] text-sm">¿Seguiste el plan esta semana?</span>
            </div>
            <div className="flex gap-1">
              {ultimas4Semanas.map((s, i) => (
                <div key={i} title={s.semana === 0 ? 'Esta semana' : `Hace ${s.semana} semana${s.semana > 1 ? 's' : ''}`}
                  className={`w-2 h-2 rounded-full ${
                    s.adherencia === 'si' ? 'bg-emerald-500' :
                    s.adherencia === 'mas_o_menos' ? 'bg-amber-400' :
                    s.adherencia === 'no' ? 'bg-red-400' : 'bg-black/10'
                  }`} />
              ))}
            </div>
          </div>
          {adherenciaEfectiva ? (
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: adherenciaEfectiva === 'si' ? '#ecfdf5' : adherenciaEfectiva === 'mas_o_menos' ? '#fffbeb' : '#fef2f2' }}>
              <span className="text-2xl">
                {adherenciaEfectiva === 'si' ? '💯' : adherenciaEfectiva === 'mas_o_menos' ? '👌' : '😕'}
              </span>
              <div>
                <p className="text-sm font-medium text-[#0A0A0A]">
                  {adherenciaEfectiva === 'si' ? '¡Semana perfecta!' : adherenciaEfectiva === 'mas_o_menos' ? 'Más o menos' : 'No esta semana'}
                </p>
                <p className="text-xs text-[#9B9B9B]">Registrado esta semana</p>
              </div>
              {!modoPreview && (
                <button onClick={() => { setAdherenciaLocal(null); guardarAdherenciaNutricion(null) }}
                  className="ml-auto text-xs text-[#9B9B9B] hover:text-[#0A0A0A] transition-colors">
                  Cambiar
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {[
                { valor: 'si', emoji: '💯', label: 'Sí' },
                { valor: 'mas_o_menos', emoji: '👌', label: 'Más o menos' },
                { valor: 'no', emoji: '😕', label: 'No' }
              ].map(({ valor, emoji, label }) => (
                <button key={valor}
                  onClick={() => guardarAdherenciaNutricion(valor)}
                  disabled={guardandoAdherencia || modoPreview}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-black/5 hover:border-black/10 active:scale-95 transition-all disabled:opacity-50 bg-[#F7F6F3]">
                  <span className="text-xl">{emoji}</span>
                  <span className="text-xs text-[#0A0A0A] font-medium">{label}</span>
                </button>
              ))}
            </div>
          )}
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
                          <div className="space-y-2">
                            {(comida.alimentos || []).map((al, ai) => (
                              <div key={ai}>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-[#0A0A0A] font-medium">{typeof al === 'string' ? al : al.nombre}</p>
                                  {al.cantidad && <p className="text-xs font-black text-[#9B9B9B] flex-shrink-0 ml-3">{al.cantidad}</p>}
                                </div>
                                {al.alternativa && (
                                  <p className="text-[10px] text-[#9B9B9B] mt-0.5 pl-0.5">
                                    <span className="font-bold">↔</span> Alt: {al.alternativa}
                                  </p>
                                )}
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
                          <button onClick={() => registrarDia(dia, dia.dia)} disabled={!!guardandoDia || modoPreview}
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

      {/* Aviso legal */}
      <div className="flex gap-2.5 p-3.5 rounded-2xl" style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.06)' }}>
        <span className="text-sm flex-shrink-0">⚖️</span>
        <p className="text-[10px] text-[#6B6B6B] leading-relaxed">
          <span className="font-semibold text-[#0A0A0A]">Aviso importante: </span>
          Este plan de alimentación es orientativo para rendimiento deportivo y composición corporal. No constituye prescripción dietética ni sustituye la consulta con un dietista-nutricionista titulado.
        </p>
      </div>

      <SuplementacionSection cuest={cuest} suplementacion={suplementacion} color={color} cliente={cliente} cargarTodo={cargarTodo} acceso={acceso} irAPagos={irAPagos} modoPreview={modoPreview} />

      {/* M6 F1 — Disclaimer legal nutrición */}
      <div className="bg-[#F7F6F3] rounded-xl px-4 py-3 border border-black/5">
        <p className="text-[10px] text-[#9B9B9B] leading-relaxed">
          <span className="font-bold">ⓘ Aviso importante:</span> Este plan de alimentación es una orientación nutricional elaborada por tu entrenador y no constituye asesoramiento médico o dietético-nutricional con fines clínicos. No sustituye la consulta con un dietista-nutricionista colegiado. Si tienes alguna condición de salud, alergia o intolerancia, consulta con un profesional sanitario antes de seguir estas recomendaciones.
        </p>
      </div>
    </div>
  )
}

// ─── Sección Suplementación (dentro de Nutrición) ────────────────────────────
function SuplementacionSection({ cuest, suplementacion, color, cliente, cargarTodo, acceso, irAPagos, modoPreview }) {
  const [activando, setActivando] = useState(false)

  async function activarSuplementacion() {
    if (modoPreview || !cuest?.id) return
    setActivando(true)
    await supabase.from('cuestionarios_nutricion').update({ interes_suplementacion: true }).eq('id', cuest.id)
    await cargarTodo()
    setActivando(false)
  }

  const recomendaciones = suplementacion?.recomendaciones || []

  return (
    <div className="bg-white rounded-2xl p-4 space-y-3">
      <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Suplementación</p>
      {!cuest?.interes_suplementacion ? (
        acceso && !acceso.suplementacion ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">💊</p>
            <p className="text-sm font-black text-[#0A0A0A] mb-3 leading-relaxed max-w-xs mx-auto">La suplementación personalizada está incluida en el plan Completo</p>
            <button onClick={irAPagos} className="text-white text-sm font-black px-5 py-2.5 rounded-xl active:scale-95 transition-all" style={{ background: color }}>Ver planes</button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">💊</p>
            <p className="text-sm font-black text-[#0A0A0A] mb-1">¿Quieres llevar tu nutrición un paso más allá?</p>
            <p className="text-xs text-[#6B6B6B] mb-3 leading-relaxed max-w-xs mx-auto">Tu entrenador puede prepararte recomendaciones de suplementación personalizadas.</p>
            <button onClick={activarSuplementacion} disabled={activando || modoPreview}
              className="text-white text-sm font-black px-5 py-2.5 rounded-xl disabled:opacity-40 active:scale-95 transition-all" style={{ background: color }}>
              {activando ? 'Activando...' : 'Activar suplementación'}
            </button>
          </div>
        )
      ) : !recomendaciones.length ? (
        <div className="text-center py-4">
          <p className="text-2xl mb-2">⏳</p>
          <p className="text-sm font-black text-[#0A0A0A]">Tu entrenador está preparando tus recomendaciones</p>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORIAS_SUPLEMENTO.map(([key, label]) => {
            const items = recomendaciones.filter(r => normalizaCategoria(r.categoria) === key)
            if (!items.length) return null
            return (
              <div key={key}>
                <p className="text-[10px] font-black text-[#9B9B9B] uppercase tracking-widest mb-2">{label}</p>
                <div className="space-y-2">
                  {items.map((r, i) => (
                    <div key={i} className="bg-[#F4F3F0] rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-black text-[#0A0A0A]">{r.nombre}</p>
                        {r.prioridad && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${PRIORIDAD_COLOR[r.prioridad] || PRIORIDAD_COLOR.baja}`}>{r.prioridad.toUpperCase()}</span>}
                      </div>
                      {r.dosis && <p className="text-xs text-[#6B6B6B]">📏 {r.dosis}{r.cuando ? ` · ${r.cuando}` : ''}</p>}
                      {r.motivo && <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">{r.motivo}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab Progreso ─────────────────────────────────────────────────────────────
// ─── TAB PROGRESO ─────────────────────────────────────────────────────────────
function TabProgreso({ checkins, marcas, medidas, fotos, ejerciciosHist, color, subTab, setSubTab, cliente, cargarTodo, modoPreview }) {
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
      {subTab === 'peso'    && <SubPeso checkins={checkins} color={color} cliente={cliente} />}
      {subTab === 'fuerza'  && <SubFuerza ejerciciosHist={ejerciciosHist} color={color} />}
      {subTab === 'medidas' && <SubMedidas medidas={medidas} color={color} cliente={cliente} cargarTodo={cargarTodo} modoPreview={modoPreview} />}
      {subTab === 'fotos'   && <SubFotos fotos={fotos} color={color} cliente={cliente} cargarTodo={cargarTodo} modoPreview={modoPreview} />}
    </div>
  )
}

// ─── SubPeso ─────────────────────────────────────────────────────────────────
function SubPeso({ checkins, color, cliente }) {
  const pesos = (checkins || []).filter(c => c.peso).slice().reverse()
  const pesoActual = pesos[pesos.length - 1]?.peso
  const pesoInicial = pesos[0]?.peso
  const diff = pesoActual && pesoInicial ? +(pesoActual - pesoInicial).toFixed(1) : null

  // Proyección objetivo — M7F2
  const proyeccion = (() => {
    const objetivo = parseFloat(cliente?.peso_objetivo)
    if (!objetivo || !pesoActual || pesos.length < 3) return null
    const hayTendencia = (objetivo < pesoActual && diff < 0) || (objetivo > pesoActual && diff > 0)
    if (!hayTendencia) return null
    const recientes = pesos.slice(-8)
    if (recientes.length < 2) return null
    const diasEntrePrimeroYUltimo = (() => {
      try {
        const d1 = new Date(recientes[0].fecha); const d2 = new Date(recientes[recientes.length - 1].fecha)
        return Math.abs((d2 - d1) / (1000 * 60 * 60 * 24)) || 1
      } catch { return 7 }
    })()
    const kgTotal = Math.abs(recientes[recientes.length - 1].peso - recientes[0].peso)
    const kgSemana = kgTotal / (diasEntrePrimeroYUltimo / 7)
    if (kgSemana < 0.01) return null
    const kgRestantes = Math.abs(pesoActual - objetivo)
    const semanas = Math.round(kgRestantes / kgSemana)
    if (semanas > 104) return null // más de 2 años → no mostrar
    return { semanas, kgSemana: kgSemana.toFixed(2), objetivo }
  })()
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

      {/* Proyección objetivo — M7F2 */}
      {proyeccion && (
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
              <span className="text-xl">🎯</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-[#0A0A0A]">
                Llegas a tu objetivo en <span style={{ color }}>~{proyeccion.semanas} semana{proyeccion.semanas !== 1 ? 's' : ''}</span>
              </p>
              <p className="text-[10px] text-[#9B9B9B] mt-0.5">
                Al ritmo actual de {proyeccion.kgSemana} kg/semana · Objetivo: {proyeccion.objetivo} kg
              </p>
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-black/5">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round(Math.abs((pesoActual - pesoInicial) / ((pesoActual - proyeccion.objetivo) + Math.abs(pesoActual - pesoInicial))) * 100))}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
          </div>
        </div>
      )}

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
                  {formatearFecha(c.fecha, {weekday:'short',day:'numeric',month:'short'})}
                </p>
                <div className="flex gap-2.5 mt-1.5 flex-wrap">
                  {c.energia  != null && <span className="text-[10px] font-bold text-[#9B9B9B]">⚡ Energía {c.energia}/5</span>}
                  {c.fatiga   != null && <span className="text-[10px] font-bold text-[#9B9B9B]">🏋️ Fatiga {c.fatiga}/5</span>}
                  {c.sueno    != null && <span className="text-[10px] font-bold text-[#9B9B9B]">😴 Sueño {c.sueno}/5</span>}
                  {c.estres   != null && <span className="text-[10px] font-bold text-[#9B9B9B]">🧠 Estrés {c.estres}/5</span>}
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
function SubMedidas({ medidas, color, cliente, cargarTodo, modoPreview }) {
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
    if (modoPreview) return
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
        <button onClick={() => setMostrando('form')} disabled={modoPreview}
          className="text-xs font-black px-4 py-2 rounded-xl text-white active:scale-95 disabled:opacity-40"
          style={{ background: color }}>+ Añadir</button>
      </div>

      {!hayMedidas ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#0A0A0A' }}>
          <p className="text-4xl mb-4">📏</p>
          <p className="text-base font-black text-white">Sin medidas aún</p>
          <p className="text-xs mt-2 mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>Registra tu primera medición para ver tu evolución</p>
          <button onClick={() => setMostrando('form')} disabled={modoPreview}
            className="px-6 py-3 rounded-xl text-sm font-black text-white active:scale-95 disabled:opacity-40"
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

          {/* Gráficas de evolución por medida — solo campos con ≥2 puntos */}
          {(() => {
            const camposConDatos = CAMPOS.filter(campo => {
              const pts = (medidas || []).filter(m => m[campo.key] != null).length
              return pts >= 2
            })
            if (!camposConDatos.length) return null
            return (
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-black/5">
                  <p className="text-[9px] font-black tracking-[0.15em] uppercase text-[#9B9B9B]">Evolución</p>
                </div>
                <div className="divide-y divide-black/4">
                  {camposConDatos.map(campo => {
                    // datos cronológicos (medidas viene desc, invertimos para la gráfica)
                    const datos = (medidas || [])
                      .filter(m => m[campo.key] != null)
                      .slice(0, 8)
                      .reverse()
                    const vals = datos.map(m => m[campo.key])
                    const min = Math.min(...vals)
                    const max = Math.max(...vals)
                    const range = max - min || 0.1
                    const actual = vals[vals.length - 1]
                    const anterior = vals[vals.length - 2]
                    const diff = anterior != null ? +(actual - anterior).toFixed(1) : null
                    const W = 280, H = 52, padX = 6, padY = 6
                    const iW = W - padX * 2
                    const iH = H - padY * 2
                    const pts = datos.map((d, i) => ({
                      x: padX + (i / (datos.length - 1)) * iW,
                      y: padY + (1 - (d[campo.key] - min) / range) * iH,
                    }))
                    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
                    const areaPath = `M ${pts[0].x.toFixed(1)},${H} ` + pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ` L ${pts[pts.length-1].x.toFixed(1)},${H} Z`
                    const gradId = `mg_${campo.key}`
                    return (
                      <div key={campo.key} className="px-5 py-3 flex items-center gap-4">
                        {/* Label + valor actual */}
                        <div className="flex-shrink-0 w-16">
                          <p className="text-[9px] font-black uppercase tracking-wider text-[#9B9B9B]">{campo.label}</p>
                          <p className="text-lg font-black text-[#0A0A0A] leading-tight">
                            {actual}<span className="text-[10px] font-normal text-[#9B9B9B] ml-0.5">cm</span>
                          </p>
                          {diff !== null && diff !== 0 && (
                            <p className="text-[9px] font-black" style={{ color: diff < 0 ? '#10b981' : '#ef4444' }}>
                              {diff > 0 ? '+' : ''}{diff}cm
                            </p>
                          )}
                          {diff === 0 && (
                            <p className="text-[9px] font-bold text-[#9B9B9B]">sin cambio</p>
                          )}
                        </div>
                        {/* Sparkline SVG */}
                        <div className="flex-1 min-w-0">
                          <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible', display: 'block' }}>
                            <defs>
                              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity="0.15"/>
                                <stop offset="100%" stopColor={color} stopOpacity="0"/>
                              </linearGradient>
                            </defs>
                            {/* Área */}
                            <path d={areaPath} fill={`url(#${gradId})`} />
                            {/* Línea */}
                            <path d={linePath} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            {/* Puntos — solo primero y último */}
                            {pts.map((p, i) => {
                              if (i !== 0 && i !== pts.length - 1) return null
                              const esUltimo = i === pts.length - 1
                              return (
                                <circle key={i} cx={p.x} cy={p.y} r={esUltimo ? 4 : 3}
                                  fill={esUltimo ? color : 'white'}
                                  stroke={color} strokeWidth="2" />
                              )
                            })}
                          </svg>
                        </div>
                        {/* Cantidad de mediciones */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[9px] font-black text-[#C0C0C0]">{datos.length}</p>
                          <p className="text-[8px] text-[#C0C0C0]">med.</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

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


// ─── ComparativaFotosSlider ───────────────────────────────────────────────────
// Slider interactivo antes/después. El usuario arrastra para revelar la imagen "ahora".
function ComparativaFotosSlider({ fotoAntes, fotoAhora, color }) {
  const [pos, setPos] = useState(50) // porcentaje 0-100
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef(null)

  function getPos(clientX) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return 50
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  }

  function onStart(e) {
    e.preventDefault()
    setDragging(true)
  }
  function onMove(e) {
    if (!dragging) return
    const x = e.touches ? e.touches[0].clientX : e.clientX
    setPos(getPos(x))
  }
  function onEnd() { setDragging(false) }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0A0A0A' }}>
      <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between">
        <p className="text-[9px] font-black tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Inicio vs Ahora</p>
        <p className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>← arrastra →</p>
      </div>
      <div
        ref={containerRef}
        className="relative w-full select-none"
        style={{ aspectRatio: '3/4', cursor: dragging ? 'ew-resize' : 'col-resize', touchAction: 'none' }}
        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
      >
        {/* Foto ANTES (fondo completo) */}
        <img src={fotoAntes.url} alt="Inicio" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

        {/* Foto AHORA (recortada por clip) */}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100-pos}% 0 0)` }}>
          <img src={fotoAhora.url} alt="Ahora" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        </div>

        {/* Línea divisora */}
        <div className="absolute top-0 bottom-0" style={{ left: `${pos}%`, transform: 'translateX(-50%)', width: 2, background: 'white', boxShadow: '0 0 8px rgba(0,0,0,0.5)' }}>
          {/* Handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 8L2 5L2 11L5 8Z" fill="#0A0A0A"/>
              <path d="M11 8L14 5V11L11 8Z" fill="#0A0A0A"/>
              <line x1="8" y1="2" x2="8" y2="14" stroke="#0A0A0A" strokeWidth="1.5"/>
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-0 left-0 px-3 py-2" style={{ background: 'rgba(0,0,0,0.65)' }}>
          <p className="text-white text-[9px] font-black uppercase tracking-widest">
            INICIO · {new Date(fotoAntes.fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
          </p>
        </div>
        <div className="absolute bottom-0 right-0 px-3 py-2" style={{ background: `${color}dd` }}>
          <p className="text-white text-[9px] font-black uppercase tracking-widest">
            AHORA · {new Date(fotoAhora.fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── SubFotos ─────────────────────────────────────────────────────────────────
function SubFotos({ fotos, color, cliente, cargarTodo, modoPreview }) {
  const [subiendo, setSubiendo] = useState(false)
  const [tipo, setTipo] = useState('frente')
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef(null)

  const TIPOS = [
    { id:'frente',  label:'Frente' },
    { id:'lateral', label:'Lateral' },
    { id:'espalda', label:'Espalda' },
  ]

  async function subirFoto(e) {
    if (modoPreview) return
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
          <input ref={fileRef} type="file" accept="image/*" capture="environment" disabled={modoPreview}
            onChange={subirFoto} className="hidden" id="foto-up" />
          <label htmlFor={modoPreview ? undefined : 'foto-up'}
            className={`w-full py-3.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all ${modoPreview ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
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
          {/* Comparativa inicio vs ahora — slider interactivo */}
          {fechas.length >= 2 && (() => {
            const fotoAntes = grupos[fechas[fechas.length-1]]?.[0]
            const fotoAhora = grupos[fechas[0]]?.[0]
            return fotoAntes && fotoAhora
              ? <ComparativaFotosSlider fotoAntes={fotoAntes} fotoAhora={fotoAhora} color={color} />
              : null
          })()}

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
function ModalCheckin({ color, ciForm, setCiForm, enviandoCI, enviarCheckin, editando, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-black/5 flex items-center justify-between">
          <div>
            <p className="font-bold text-[#0A0A0A] text-lg">{editando ? 'Editar check-in' : 'Check-in semanal'}</p>
            <p className="text-xs text-[#9B9B9B] mt-0.5">{editando ? 'Corrige los datos que hayas enviado' : 'Cuéntame cómo ha ido la semana'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F7F6F3] text-[#6B6B6B] text-xl font-light">×</button>
        </div>
        <div className="px-6 py-5 space-y-6">

          {/* — Escalas obligatorias — */}
          {[
            { k: 'energia', icon: '⚡', label: 'Energía general', opciones: ['Agotado','Bajo','Normal','Bien','Excelente'], tipo: 'positiva' },
            { k: 'sueno', icon: '😴', label: 'Calidad del sueño', opciones: ['Muy mal','Mal','Regular','Bien','Perfecta'], tipo: 'positiva' },
            { k: 'estres', icon: '🧠', label: 'Nivel de estrés', opciones: ['Relajado','Leve','Moderado','Alto','Al límite'], tipo: 'negativa' },
            { k: 'fatiga', icon: '🏋️', label: 'Fatiga muscular', opciones: ['Sin fatiga','Leve','Moderada','Alta','Al límite'], tipo: 'negativa' },
          ].map(({ k, icon, label, opciones, tipo }) => (
            <div key={k}>
              <div className="flex items-center gap-2 mb-3">
                <span>{icon}</span>
                <p className="text-sm font-bold text-[#0A0A0A]">{label}</p>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1,2,3,4,5].map(v => {
                  const sel = ciForm[k] === v
                  const bg = tipo === 'positiva'
                    ? (v <= 2 ? '#ef4444' : v === 3 ? '#f59e0b' : color)
                    : (v <= 2 ? '#10b981' : v === 3 ? '#f59e0b' : '#ef4444')
                  return (
                    <button key={v} onClick={() => setCiForm(f => ({ ...f, [k]: v }))}
                      className={`flex flex-col items-center gap-1 py-4 rounded-xl transition-all active:scale-95 ${sel ? 'text-white' : 'border border-black/10 text-[#9B9B9B] hover:border-black/20'}`}
                      style={sel ? { background: bg } : {}}>
                      <span className="text-base font-bold">{v}</span>
                      <span className={`text-[9px] leading-tight text-center ${sel ? 'text-white/90' : 'text-[#9B9B9B]'}`}>{opciones[v - 1]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* — Motivación (1-7) — */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span>🔥</span>
              <p className="text-sm font-bold text-[#0A0A0A]">Motivación</p>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[1,2,3,4,5,6,7].map(v => {
                const sel = ciForm.motivacion === v
                const motivLabels = ['💀','😞','😐','🙂','😊','💪','🚀']
                const bg = v <= 2 ? '#ef4444' : v <= 4 ? '#f59e0b' : color
                return (
                  <button key={v} onClick={() => setCiForm(f => ({ ...f, motivacion: v }))}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all active:scale-95 ${sel ? 'text-white' : 'border border-black/10 text-[#9B9B9B] hover:border-black/20'}`}
                    style={sel ? { background: bg } : {}}>
                    <span className="text-sm">{motivLabels[v - 1]}</span>
                    <span className="text-xs font-bold">{v}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-[#C0C0C0] mt-1.5 text-center">1 = sin ganas · 7 = imparable</p>
          </div>

          {/* — Sesiones completadas — */}
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] mb-2">🏃 Sesiones completadas <span className="text-[#9B9B9B] font-normal text-xs">(opcional)</span></p>
            <div className="grid grid-cols-6 gap-1.5">
              {[0,1,2,3,4,5].map(v => {
                const sel = ciForm.sesiones === v
                return (
                  <button key={v} onClick={() => setCiForm(f => ({ ...f, sesiones: v }))}
                    className={`py-4 rounded-xl text-base font-bold transition-all active:scale-95 ${sel ? 'text-white' : 'border border-black/10 text-[#9B9B9B] hover:border-black/20'}`}
                    style={sel ? { background: color } : {}}>
                    {v === 5 ? '5+' : v}
                  </button>
                )
              })}
            </div>
          </div>

          {/* — Sensación de cargas — */}
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] mb-2">💪 Sensación con las cargas <span className="text-[#9B9B9B] font-normal text-xs">(opcional)</span></p>
            <div className="grid grid-cols-2 gap-2">
              {[['muy_facil','😴 Muy fácil'],['bien','💪 En mi punto'],['duro','😤 Exigente'],['muy_duro','🔥 Al límite']].map(([v,l]) => {
                const sel = ciForm.cargas === v
                return (
                  <button key={v} onClick={() => setCiForm(f => ({ ...f, cargas: v }))}
                    className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${sel ? 'text-white' : 'border border-black/10 text-[#9B9B9B] hover:border-black/20'}`}
                    style={sel ? { background: color } : {}}>
                    {l}
                  </button>
                )
              })}
            </div>
          </div>

          {/* — Pasos diarios (media) — */}
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] mb-2">👟 Pasos diarios (media) <span className="text-[#9B9B9B] font-normal text-xs">(opcional)</span></p>
            <div className="flex items-center gap-2">
              <input type="number" step="100" min="0" placeholder="8000" value={ciForm.pasos}
                onChange={e => setCiForm(f => ({ ...f, pasos: e.target.value }))}
                className="flex-1 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black/20" />
              <span className="text-sm text-[#9B9B9B] font-medium">pasos/día</span>
            </div>
          </div>

          {/* — Peso — */}
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] mb-2">⚖️ Peso <span className="text-[#9B9B9B] font-normal text-xs">(opcional)</span></p>
            <div className="flex items-center gap-2">
              <input type="number" step="0.1" placeholder="75.0" value={ciForm.peso}
                onChange={e => setCiForm(f => ({ ...f, peso: e.target.value }))}
                className="flex-1 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black/20" />
              <span className="text-sm text-[#9B9B9B] font-medium">kg</span>
            </div>
          </div>

          {/* — Logro de la semana — */}
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] mb-2">🏆 Tu mayor logro esta semana <span className="text-[#9B9B9B] font-normal text-xs">(opcional)</span></p>
            <input type="text" maxLength={120} placeholder="Ej: completé las 4 sesiones, subí peso en press banca…" value={ciForm.logro}
              onChange={e => setCiForm(f => ({ ...f, logro: e.target.value }))}
              className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black/20" />
          </div>

          {/* — Nota libre — */}
          <div>
            <p className="text-sm font-bold text-[#0A0A0A] mb-2">💬 ¿Algo más que contarle a tu entrenador? <span className="text-[#9B9B9B] font-normal text-xs">(opcional)</span></p>
            <textarea rows={2} placeholder="Lesión, viaje, cambio en la dieta, lo que sea..." value={ciForm.nota}
              onChange={e => setCiForm(f => ({ ...f, nota: e.target.value }))}
              className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none" />
          </div>

          <button onClick={enviarCheckin}
            disabled={!ciForm.energia || !ciForm.sueno || !ciForm.fatiga || !ciForm.estres || enviandoCI}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
            style={{ background: color }}>
            {enviandoCI ? '⏳ Guardando...' : editando ? '✓ Guardar cambios' : '✓ Enviar check-in'}
          </button>
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
function ModalRegistroSesion({ dia, color, registroSets, setRegistroSets, ejerciciosHist, guardandoRegistro, guardarRegistroSesion, onClose, sesionGuardadaId, cliente, onFinalizar, acceso, solicitarCambioPlan, modoPreview, biblioteca = {} }) {
  const ejercicios = dia?.ejercicios || []
  const [tieneMolestia, setTieneMolestia] = useState(null)
  const [molestiaForm, setMolestiaForm] = useState({ zona: '', severidad: 'leve', descripcion: '' })
  const [guardandoMolestia, setGuardandoMolestia] = useState(false)
  const [molestiaBloqueada, setMolestiaBloqueada] = useState(false)
  const [solicitandoCambio, setSolicitandoCambio] = useState(false)
  const [cambioSolicitado, setCambioSolicitado] = useState(false)
  const [videoEjModal, setVideoEjModal] = useState(null) // { nombre, youtube_url, consejos_tecnica }
  const [confirmando, setConfirmando] = useState(false) // panel de confirmación antes de guardar

  // ── Timer ──
  const [segundos, setSegundos] = useState(0)
  const timerRef = useRef(null)
  useEffect(() => {
    if (sesionGuardadaId) return // no seguir contando tras guardar
    timerRef.current = setInterval(() => setSegundos(s => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [sesionGuardadaId])
  const duracionMinutos = Math.max(1, Math.round(segundos / 60))
  const timerStr = segundos < 3600
    ? `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`
    : `${Math.floor(segundos / 3600)}h ${String(Math.floor((segundos % 3600) / 60)).padStart(2, '0')}m`

  async function guardarMolestia() {
    if (modoPreview || !molestiaForm.zona) return
    setGuardandoMolestia(true)
    await supabase.from('lesiones_cliente').insert({
      cliente_id: cliente.id, entrenador_id: cliente.entrenador_id, sesion_id: sesionGuardadaId,
      zona: molestiaForm.zona, severidad: molestiaForm.severidad, descripcion: molestiaForm.descripcion || null,
      estado: 'activa', fecha_inicio: hoyStr(),
    })
    setGuardandoMolestia(false)
    if (acceso && !acceso.lesiones_musculares) {
      setMolestiaBloqueada(true)
    } else {
      onFinalizar()
    }
  }

  if (sesionGuardadaId) return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4">
        {molestiaBloqueada ? (
          <>
            <p className="text-sm font-bold text-[#0A0A0A] text-center">Para recibir un protocolo de recuperación muscular necesitas el plan Entrenamiento o Completo</p>
            {cambioSolicitado ? (
              <p className="text-xs text-emerald-600 font-bold text-center">Solicitud enviada. Tu entrenador se pondrá en contacto contigo.</p>
            ) : (
              <button onClick={async () => { setSolicitandoCambio(true); await solicitarCambioPlan?.('entrenamiento'); setSolicitandoCambio(false); setCambioSolicitado(true) }}
                disabled={solicitandoCambio}
                className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all" style={{ background: color }}>
                {solicitandoCambio ? 'Enviando...' : 'Solicitar cambio de plan'}
              </button>
            )}
            <button onClick={onFinalizar} className="w-full py-3 rounded-xl border border-black/10 text-[#6B6B6B] font-bold text-sm active:scale-95 transition-all">Cerrar</button>
          </>
        ) : tieneMolestia === null ? (
          <>
            <div className="text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-lg font-bold text-[#0A0A0A]">¡Sesión guardada!</p>
            </div>
            <p className="text-sm font-bold text-[#0A0A0A] text-center mt-2">¿Has sentido alguna molestia hoy?</p>
            <div className="flex gap-2">
              <button onClick={onFinalizar} className="flex-1 py-3 rounded-xl border border-black/10 text-[#6B6B6B] font-bold text-sm active:scale-95 transition-all">No</button>
              <button onClick={() => setTieneMolestia(true)} className="flex-1 py-3 rounded-xl text-white font-bold text-sm active:scale-95 transition-all" style={{ background: color }}>Sí</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-[#0A0A0A]">Cuéntanos qué ha pasado</p>
            <div>
              <p className="text-xs font-semibold text-[#6B6B6B] mb-1.5">Zona afectada</p>
              <div className="grid grid-cols-3 gap-2">
                {ZONAS_LESION.map(z => (
                  <button key={z} type="button" onClick={() => setMolestiaForm(f => ({...f, zona: z}))}
                    className="py-2 rounded-xl text-xs font-bold border transition-all"
                    style={molestiaForm.zona === z ? { background: color, color: 'white', borderColor: color } : { borderColor: 'rgba(0,0,0,0.1)', color: '#6B6B6B' }}>
                    {z}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6B6B6B] mb-1.5">Severidad</p>
              <div className="flex gap-2">
                {SEVERIDADES.map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setMolestiaForm(f => ({...f, severidad: k}))}
                    className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
                    style={molestiaForm.severidad === k ? { background: color, color: 'white', borderColor: color } : { borderColor: 'rgba(0,0,0,0.1)', color: '#6B6B6B' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6B6B6B] mb-1.5">Descripción (opcional)</p>
              <textarea value={molestiaForm.descripcion} onChange={e => setMolestiaForm(f => ({...f, descripcion: e.target.value}))} rows={2}
                placeholder="Qué ha pasado..."
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" />
            </div>
            <button onClick={guardarMolestia} disabled={!molestiaForm.zona || guardandoMolestia}
              className="w-full py-3.5 rounded-xl text-white font-black text-sm disabled:opacity-40 active:scale-95 transition-all" style={{ background: color }}>
              {guardandoMolestia ? 'Guardando...' : 'Reportar y finalizar'}
            </button>
          </>
        )}
      </div>
    </div>
  )

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

  // ── Panel de confirmación ──
  if (confirmando) return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4">
        <div className="text-center">
          <p className="text-2xl mb-1">🏋️</p>
          <p className="text-lg font-bold text-[#0A0A0A]">¿Terminas el entrenamiento?</p>
          <p className="text-sm text-[#9B9B9B] mt-1">Duración: <span className="font-bold text-[#0A0A0A]">{timerStr}</span></p>
        </div>
        <div className="bg-[#F7F6F3] rounded-2xl p-4 space-y-2">
          {Object.entries(registroSets).map(([ei, sets]) => {
            const ej = ejercicios[parseInt(ei)]
            if (!ej) return null
            const comp = sets.filter(s => s.completada).length
            const maxPeso = Math.max(0, ...sets.filter(s => s.peso).map(s => parseFloat(s.peso) || 0))
            return (
              <div key={ei} className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#0A0A0A] flex-1 min-w-0 truncate pr-2">{ej.nombre}</p>
                <p className="text-xs text-[#9B9B9B] flex-shrink-0">
                  {comp}/{sets.length} series{maxPeso > 0 ? ` · ${maxPeso} kg` : ''}
                  {comp === sets.length ? ' ✓' : ''}
                </p>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setConfirmando(false)}
            className="flex-1 py-3.5 rounded-2xl border border-black/10 text-[#6B6B6B] font-bold text-sm active:scale-95 transition-all">
            Revisar
          </button>
          <button onClick={() => { clearInterval(timerRef.current); guardarRegistroSesion(duracionMinutos) }}
            disabled={guardandoRegistro}
            className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
            style={{ background: color }}>
            {guardandoRegistro ? '⏳ Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4 border-b border-black/5 flex items-start justify-between flex-shrink-0">
          <div className="flex-1 min-w-0 mr-3">
            <p className="font-bold text-[#0A0A0A] text-lg">{dia.nombre}</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-[#9B9B9B]">{ejercicios.length} ejercicios</p>
              <p className="text-xs font-bold tabular-nums" style={{ color }}>{timerStr}</p>
            </div>
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
          {/* Mini-modal vídeo dentro del modal de registro */}
          {videoEjModal && (
            <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.8)' }}
              onClick={() => setVideoEjModal(null)}>
              <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <p className="font-bold text-[#0A0A0A] text-base leading-tight pr-4">{videoEjModal.nombre}</p>
                  <button onClick={() => setVideoEjModal(null)}
                    className="w-8 h-8 rounded-full bg-[#F2F1EE] flex items-center justify-center text-[#9B9B9B] text-lg flex-shrink-0 active:scale-95">✕</button>
                </div>
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={`${ytEmbed(videoEjModal.youtube_url)}?autoplay=1&rel=0&modestbranding=1`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    title={videoEjModal.nombre}
                  />
                </div>
                {videoEjModal.consejos_tecnica && (
                  <div className="px-5 py-4 border-t border-black/5">
                    <p className="text-xs font-semibold text-[#0A0A0A] mb-1.5">💡 Técnica</p>
                    <p className="text-xs text-[#6B6B6B] leading-relaxed">{videoEjModal.consejos_tecnica}</p>
                  </div>
                )}
                <div className="pb-5" />
              </div>
            </div>
          )}

          {ejercicios.map((ej, ei) => {
            const hist = histEj[ej.nombre]
            const setsEj = registroSets[ei]
            const n = parseInt(ej.series) || 3
            const compEj = setsEj ? setsEj.filter(s => s.completada).length : 0
            const bibEntry = biblioteca[(ej.nombre || '').toLowerCase()]
            const tieneVideo = !!ytEmbed(bibEntry?.youtube_url) // enlace válido, si no no hay botón ▶

            return (
              <div key={ei} className="border-b border-black/4 last:border-0 px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold text-[#0A0A0A] flex-1">{ej.nombre}</p>
                  {tieneVideo && (
                    <button onClick={() => setVideoEjModal(bibEntry)}
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-all"
                      style={{ background: `${color}15` }}>
                      <span className="text-[10px]" style={{ color }}>▶</span>
                    </button>
                  )}
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
          <button onClick={() => setConfirmando(true)} disabled={guardandoRegistro || Object.keys(registroSets).length === 0}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95"
            style={{ background: color }}>
            {`✓ Terminar entrenamiento${totalComp > 0 ? ` · ${totalComp} series` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
