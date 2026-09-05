import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useOnboardingPortal } from '../hooks/useOnboardingPortal'
import GraficasCliente from '../components/GraficasCliente'

const OBJ = { perdida_grasa:'Pérdida de grasa', ganancia_muscular:'Ganancia muscular', tonificacion:'Tonificación', fuerza:'Fuerza', rendimiento:'Rendimiento', cambio_rapido_30dias:'Cambio 30 días' }

// ─── Mini componente: marcador de sesiones online ───────────────────────────
function SesionesRegistradas({ clienteId, color }) {
  const [sesiones, setSesiones] = useState([])
  const [detalle, setDetalle] = useState(null)
  useEffect(() => {
    supabase.from('sesiones').select('*')
      .eq('cliente_id', clienteId).eq('tipo','online').eq('completada',true)
      .order('fecha',{ascending:false}).limit(10)
      .then(({data})=>setSesiones(data||[]))
  },[clienteId])
  if (!sesiones.length) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-widest">Entrenamientos registrados</p>
      {sesiones.map(s=>(
        <div key={s.id}>
          <button onClick={async()=>{
            if(detalle?.id===s.id){setDetalle(null);return}
            const {data:ejes}=await supabase.from('sesion_ejercicios').select('*').eq('sesion_id',s.id).order('orden')
            setDetalle({...s,ejercicios:ejes||[]})
          }} className="w-full bg-white rounded-2xl border border-black/6 px-4 py-3 flex items-center gap-3 text-left hover:border-black/12 transition-all">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0" style={{background:color}}>💪</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0A0A0A]">{new Date(s.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</p>
              <p className="text-xs text-[#6B6B6B]">{s.duracion_minutos||60}min · RPE {s.rpe||'—'}/10</p>
            </div>
            <span className="text-[#6B6B6B] text-xs">{detalle?.id===s.id?'▲':'▼'}</span>
          </button>
          {detalle?.id===s.id&&(
            <div className="bg-white border border-black/6 border-t-0 rounded-b-2xl px-4 pb-4 space-y-3 -mt-2 pt-2">
              <div className="flex gap-2 flex-wrap">
                {s.rpe&&<span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full font-medium">RPE {s.rpe}/10</span>}
                {s.fatiga_post&&<span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-medium">Fatiga {s.fatiga_post}/5</span>}
                {s.duracion_minutos&&<span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">⏱ {s.duracion_minutos}min</span>}
              </div>
              {detalle.ejercicios?.length>0&&(
                <div className="space-y-2">
                  {detalle.ejercicios.map((ej,i)=>(
                    <div key={i} className="border border-black/6 rounded-xl p-3">
                      <p className="text-sm font-semibold text-[#0A0A0A] mb-2">{ej.ejercicio_nombre}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {(ej.sets||[]).filter(s=>s.peso||s.completado).map((s,j)=>(
                          <div key={j} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${s.completado?'bg-emerald-50 text-emerald-700':'bg-[#F5F5F0] text-[#6B6B6B]'}`}>
                            {s.peso?`${s.peso}kg`:'—'} × {s.reps||'—'}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {s.sensaciones&&<div className="bg-amber-50 rounded-xl p-3"><p className="text-xs font-semibold text-amber-700 mb-1">Sensaciones</p><p className="text-sm text-amber-800">{s.sensaciones}</p></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Portal principal ────────────────────────────────────────────────────────
export default function PortalCliente() {
  const [searchParams] = useSearchParams()
  const [clienteSession, setClienteSession] = useState(undefined)
  const [clienteId, setClienteId] = useState(null)
  const { marcarVisto, esNuevo, TUTORIALES_CLIENTE } = useOnboardingPortal(clienteId)
  const [cliente, setCliente] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('inicio')
  const [registrandoSesion, setRegistrandoSesion] = useState(null) // { dia, ejercicios }
  const [registroData, setRegistroData] = useState({}) // { ejercicioNombre: [{peso, reps}] }
  const [registroRPE, setRegistroRPE] = useState(null)
  const [registroPaso, setRegistroPaso] = useState('ejercicios') // 'ejercicios' | 'rpe'
  const [guardandoRegistro, setGuardandoRegistro] = useState(false)
  const [rutina, setRutina] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [pagos, setPagos] = useState([])
  const [mensajes, setMensajes] = useState([])
  const [mensajesLeidos, setMensajesLeidos] = useState(false)
  const [configEntrenador, setConfigEntrenador] = useState(null)
  const [planNutricion, setPlanNutricion] = useState(null)
  const [tieneCuestNutricion, setTieneCuestNutricion] = useState(false)
  const [tareasExtra, setTareasExtra] = useState([])
  const [diaActivoNutr, setDiaActivoNutr] = useState(0)
  const [cancelando, setCancelando] = useState(null)
  const [motivoCancel, setMotivoCancel] = useState('')
  const [sesionesPortal, setSesionesPortal] = useState([])
  const [pendientesValorar, setPendientesValorar] = useState([])
  const [habitos, setHabitos] = useState([])
  const [habitosHoy, setHabitosHoy] = useState({}) // habito_id -> completado
  const [valorando, setValorando] = useState(null)
  const [rpeVal, setRpeVal] = useState(7)
  const [fatigaVal, setFatigaVal] = useState(2)
  const [sensacionesVal, setSensacionesVal] = useState('')
  const [pasoValoracion, setPasoValoracion] = useState('ejercicios') // 'ejercicios' | 'rpe'
  const [ejerciciosSesion, setEjerciciosSesion] = useState([]) // [{nombre, sets:[{peso,reps}]}]
  const [cargandoEjercicios, setCargandoEjercicios] = useState(false)
  const [guardandoValoracion, setGuardandoValoracion] = useState(false)
  const [entrenadoresSesion, setEntrenadoresSesion] = useState({})
  const [textoMsg, setTextoMsg] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [tipoFoto, setTipoFoto] = useState('frontal')
  const [pesoFoto, setPesoFoto] = useState('')
  const [errorFoto, setErrorFoto] = useState('')
  const [fotos, setFotos] = useState([])
  const [subTabProgreso, setSubTabProgreso] = useState('peso')
  const [medidas, setMedidas] = useState({})
  const [historialMedidas, setHistorialMedidas] = useState([])
  const [marcas, setMarcas] = useState([])
  const [formMarca, setFormMarca] = useState({ ejercicio:'', peso_kg:'', reps:'', notas:'' })
  const [formPerfil, setFormPerfil] = useState(null)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [toastPortal, setToastPortal] = useState('')
  const [modalActividad, setModalActividad] = useState(false)
  const [formActividad, setFormActividad] = useState({ tipo:'caminata', descripcion:'', duracion:'', distancia:'', notas:'' })
  const [guardandoActividad, setGuardandoActividad] = useState(false)

  function mostrarToast(msg) {
    setToastPortal(msg)
    setTimeout(() => setToastPortal(''), 3500)
  }
  const mensajesEndRef = useRef(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setClienteSession(session?.user||null))
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setClienteSession(s?.user||null))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(clienteSession===undefined) return
    if(!clienteSession){setLoading(false);return}
    async function cargar(){
      setLoading(true); setNotFound(false); setCliente(null)
      const {data:cl,error}=await supabase.from('clientes').select('*').eq('auth_user_id',clienteSession.id).maybeSingle()
      if(error||!cl){setNotFound(true);setLoading(false);return}
      const cid=cl.id; setCliente(cl); setClienteId(cid)
      // Registrar acceso al portal
      supabase.from('actividad_cliente').insert({
        cliente_id: cid, entrenador_id: cl.entrenador_id,
        tipo: 'portal_acceso', descripcion: 'Entró al portal'
      }).catch(() => {})
      const [ru,ci,pg,ms,ft,pn,cfg,mc,meds,tieneCuest]=await Promise.all([
        supabase.from('rutinas').select('*').eq('cliente_id',cid).eq('estado','publicada').order('created_at',{ascending:false}).limit(1).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('checkins').select('*').eq('cliente_id',cid).order('fecha',{ascending:false}).limit(12).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('pagos').select('*').eq('cliente_id',cid).order('fecha_pago',{ascending:false}).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('mensajes_cliente').select('*').eq('cliente_id',cid).order('created_at',{ascending:true}).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('fotos_progreso').select('*').eq('cliente_id',cid).eq('visible_cliente',true).order('fecha',{ascending:false}).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('planes_nutricion').select('*').eq('cliente_id',cid).eq('estado','publicado').order('created_at',{ascending:false}).limit(1).then(r=>r.data?.[0]||null).catch(()=>null),
        supabase.from('configuracion').select('nombre_entrenador,foto_url,nombre_negocio,color_acento').eq('entrenador_id',cl.entrenador_id).single().then(r=>r.data||null).catch(()=>null),
        supabase.from('marcas_cliente').select('*').eq('cliente_id',cid).order('fecha',{ascending:false}).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('medidas_cliente').select('*').eq('cliente_id',cid).order('fecha',{ascending:false}).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('cuestionarios_nutricion').select('id').eq('cliente_id',cid).limit(1).then(r=>!!(r.data?.length)).catch(()=>false),
      ])
      setRutina(ru[0]||null); setCheckins(ci); setPagos(pg)
      setMensajes(ms.map(m => m.tipo === 'entrenador' ? {...m, leido: true} : m))
      setFotos(ft); setPlanNutricion(pn); if(cfg)setConfigEntrenador(cfg)
      setMarcas(mc); setHistorialMedidas(meds); setTieneCuestNutricion(tieneCuest)
      const now=new Date(); const hoy=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
      const {data:sesFut}=await supabase.from('sesiones').select('*').eq('cliente_id',cid).gte('fecha',hoy).eq('cancelada',false).order('fecha').order('hora').limit(8)
      setSesionesPortal(sesFut||[])
      const hace7=new Date(now.getTime()-7*864e5); const hace7Str=`${hace7.getFullYear()}-${String(hace7.getMonth()+1).padStart(2,'0')}-${String(hace7.getDate()).padStart(2,'0')}`
      const {data:sesPend}=await supabase.from('sesiones').select('*').eq('cliente_id',cid).eq('tipo','presencial')
        .gte('fecha',hace7Str).lte('fecha',hoy).eq('cancelada',false).is('rpe',null).order('fecha',{ascending:false}).limit(3)
      setPendientesValorar(sesPend||[])
      // Cargar hábitos del día — aislado para que un fallo no bloquee el resto
      const [{ data: habs }, { data: regsHoy }] = await Promise.all([
        supabase.from('habitos').select('*').eq('cliente_id', cid).eq('activo', true).order('orden').then(r => r).catch(() => ({ data: [] })),
        supabase.from('habitos_registro').select('habito_id,completado').eq('cliente_id', cid).eq('fecha', hoy).then(r => r).catch(() => ({ data: [] }))
      ])
      setHabitos(habs || [])
      const mapaHoy = {}
      ;(regsHoy || []).forEach(r => { mapaHoy[r.habito_id] = r.completado })
      setHabitosHoy(mapaHoy)
      if (cl.tipo === 'presencial') {
        const { data: tareas } = await supabase.from('tareas_extra').select('*').eq('cliente_id', cid).eq('activa', true).order('orden')
        setTareasExtra(tareas||[])
      }
      const idsEntrenadores=[...new Set((sesFut||[]).map(s=>s.entrenador_id).filter(id=>id&&id!==cl.entrenador_id))]
      if(idsEntrenadores.length){
        const {data:otrosCfg}=await supabase.from('configuracion').select('entrenador_id,nombre_entrenador,color_acento').in('entrenador_id',idsEntrenadores)
        const mapa={}
        ;(otrosCfg||[]).forEach(c=>{mapa[c.entrenador_id]=c})
        setEntrenadoresSesion(mapa)
      }
      setLoading(false)
    }
    cargar().catch(() => setLoading(false))
  },[clienteSession])

  useEffect(()=>{
    if(tab==='mensajes'&&mensajes.length&&!mensajesLeidos){
      supabase.from('mensajes_cliente').update({leido:true}).eq('cliente_id',clienteId).eq('leido',false)
      setMensajes(prev => prev.map(m => ({...m, leido: true})))
      setMensajesLeidos(true)
    }
    if(tab==='mensajes') setTimeout(()=>mensajesEndRef.current?.scrollIntoView({behavior:'smooth'}),100)
  },[tab,mensajes])

  const color = configEntrenador?.color_acento||'#FF5C00'
  const mensajesNoLeidos = mensajes.filter(m=>!m.leido&&m.tipo==='entrenador').length

  async function guardarValoracion(){
    if(!valorando) return
    setGuardandoValoracion(true)
    const { error } = await supabase.from('sesiones').update({
      rpe: rpeVal, fatiga_post: fatigaVal, sensaciones: sensacionesVal||null, completada: true
    }).eq('id', valorando.id)

    // Guardar ejercicios registrados
    const ejerciciosConDatos = ejerciciosSesion.filter(ej =>
      ej.sets.some(s => s.peso && String(s.peso).trim() !== '')
    )
    if (ejerciciosConDatos.length > 0) {
      // Insertar en sesion_ejercicios
      await supabase.from('sesion_ejercicios').insert(
        ejerciciosConDatos.map((ej, i) => ({
          sesion_id: valorando.id,
          cliente_id: clienteId,
          entrenador_id: cliente?.entrenador_id,
          ejercicio_nombre: ej.nombre,
          patron: ej.patron || null,
          orden: i + 1,
          sets: ej.sets.map((s, si) => ({
            set: si + 1,
            peso: s.peso ? Number(s.peso) : null,
            reps: s.reps || null,
            completado: true
          })),
        }))
      ).catch(() => {})

      // Detectar marcas personales automáticamente
      for (const ej of ejerciciosConDatos) {
        const setsPeso = ej.sets.filter(s => s.peso && !isNaN(Number(s.peso)))
        if (!setsPeso.length) continue
        const maxPeso = Math.max(...setsPeso.map(s => Number(s.peso)))
        if (!maxPeso) continue

        // Comparar con marca actual
        const { data: marcaActual } = await supabase.from('marcas_cliente')
          .select('id,valor')
          .eq('cliente_id', clienteId)
          .ilike('ejercicio', ej.nombre)
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle()

        const valorActual = marcaActual ? parseFloat(marcaActual.peso_kg) : 0
        if (maxPeso > valorActual) {
          // Nueva marca personal 🏆
          await supabase.from('marcas_cliente').insert({
            cliente_id: clienteId,
            entrenador_id: cliente?.entrenador_id,
            ejercicio: ej.nombre,
            valor: String(maxPeso) + 'kg',
            fecha: valorando.fecha,
            notas: `Registrada automáticamente desde sesión`
          }).catch(() => {})

          // Registrar en actividad
          supabase.from('actividad_cliente').insert({
            cliente_id: clienteId,
            entrenador_id: cliente?.entrenador_id,
            tipo: 'marca_personal',
            descripcion: `🏆 Nueva marca: ${ej.nombre} — ${maxPeso}kg`
          }).catch(() => {})
        }
      }
    }

    // Alerta si fatiga alta post-sesión
    if (!error && fatigaVal >= 4) {
      await supabase.from('alertas').insert({
        entrenador_id: cliente?.entrenador_id,
        cliente_id: clienteId,
        tipo: 'fatiga_alta_post_sesion',
        mensaje: `⚠️ ${cliente?.nombre?.split(' ')[0]} ha reportado fatiga ${fatigaVal}/5 tras su sesión de hoy. Considera ajustar la carga.`
      }).catch(() => {})
    }

    // Registrar actividad
    supabase.from('actividad_cliente').insert({
      cliente_id: clienteId,
      entrenador_id: cliente?.entrenador_id,
      tipo: 'sesion_completada',
      descripcion: `Sesión completada · RPE ${rpeVal}/10`
    }).catch(() => {})

    setGuardandoValoracion(false)
    if(!error){
      setPendientesValorar(prev => prev.filter(s => s.id !== valorando.id))
      setValorando(null)
      setRpeVal(7); setFatigaVal(2); setSensacionesVal('')
      setEjerciciosSesion([]); setPasoValoracion('ejercicios')
    }
  }

  // Registro de sesión online — el cliente anota pesos y reps reales
  function abrirRegistroSesion(dia) {
    const ejerciciosFuerza = (dia.ejercicios || []).filter(e =>
      e.patron !== 'calentamiento' && e.patron !== 'movilidad' && e.patron !== 'cardio'
    )
    const dataInicial = {}
    ejerciciosFuerza.forEach(ej => {
      const numSeries = parseInt(ej.series) || 3
      dataInicial[ej.nombre] = Array.from({ length: numSeries }, (_, i) => ({
        set: i + 1, peso: '', reps: ej.reps || '', completado: false
      }))
    })
    setRegistrandoSesion({ dia, ejercicios: ejerciciosFuerza })
    setRegistroData(dataInicial)
    setRegistroRPE(null)
    setRegistroPaso('ejercicios')
  }

  async function guardarRegistroSesion() {
    if (!clienteId || !registrandoSesion) return
    setGuardandoRegistro(true)

    try {
      // 1. Crear la sesión en BD
      const hoy = new Date().toISOString().split('T')[0]
      const { data: sesionNueva } = await supabase.from('sesiones').insert({
        cliente_id: clienteId,
        entrenador_id: cliente.entrenador_id,
        fecha: hoy,
        tipo: 'online',
        completada: true,
        rpe_cliente: registroRPE,
        notas_cliente: `${registrandoSesion.dia.nombre || 'Sesión'} — registrada por el cliente`,
      }).select('id').single()

      if (!sesionNueva) throw new Error('Error creando sesión')

      // 2. Guardar ejercicios con los datos reales
      const ejerciciosParaGuardar = Object.entries(registroData)
        .filter(([_, sets]) => sets.some(s => s.peso || s.reps))
        .map(([nombre, sets], idx) => {
          const ejOriginal = registrandoSesion.ejercicios.find(e => e.nombre === nombre)
          return {
            sesion_id: sesionNueva.id,
            cliente_id: clienteId,
            entrenador_id: cliente.entrenador_id,
            ejercicio_nombre: nombre,
            patron: ejOriginal?.patron || 'fuerza',
            orden: idx + 1,
            sets: sets.filter(s => s.completado || s.peso || s.reps).map(s => ({
              set: s.set,
              peso: s.peso ? parseFloat(s.peso) : null,
              reps: s.reps,
              completado: s.completado,
            })),
          }
        })

      if (ejerciciosParaGuardar.length > 0) {
        await supabase.from('sesion_ejercicios').insert(ejerciciosParaGuardar)
      }

      // 3. Detectar marcas personales automáticamente
      for (const [nombre, sets] of Object.entries(registroData)) {
        const pesosValidos = sets
          .filter(s => s.completado && s.peso)
          .map(s => parseFloat(s.peso))
          .filter(p => !isNaN(p) && p > 0)

        if (pesosValidos.length === 0) continue
        const maxPeso = Math.max(...pesosValidos)

        // Ver la marca anterior
        const { data: marcaAnterior } = await supabase.from('marcas_cliente')
          .select('valor').eq('cliente_id', clienteId).eq('ejercicio', nombre)
          .order('fecha', { ascending: false }).limit(1).maybeSingle()

        const pesoAnterior = marcaAnterior ? parseFloat(marcaAnterior.peso_kg) : 0

        if (maxPeso > pesoAnterior) {
          // ¡Nueva marca personal!
          await supabase.from('marcas_cliente').insert({
            cliente_id: clienteId,
            entrenador_id: cliente.entrenador_id,
            ejercicio: nombre,
            valor: maxPeso,
            unidad: 'kg',
            fecha: hoy,
            notas: `Marca registrada automáticamente — sesión ${hoy}`,
          })
        }
      }

      // 4. Registrar actividad
      await supabase.from('actividad_cliente').insert({
        cliente_id: clienteId,
        entrenador_id: cliente.entrenador_id,
        tipo: 'dia_completado',
        descripcion: `Sesión completada: ${registrandoSesion.dia.nombre || 'Entrenamiento'}`,
      }).catch(() => {})

      setRegistrandoSesion(null)
      setRegistroData({})
      setGuardandoRegistro(false)
      // Mostrar confirmación en inicio
      setTab('inicio')
    } catch (err) {
      console.error('Error guardando sesión:', err)
      setGuardandoRegistro(false)
    }
  }

  async function abrirValoracion(sesion) {
    setValorando(sesion)
    setPasoValoracion('ejercicios')
    setCargandoEjercicios(true)
    setEjerciciosSesion([])

    // Cargar ejercicios de la rutina del día correspondiente
    if (rutina?.borrador?.dias) {
      // Detectar qué día de la semana es la sesión y buscar el día de rutina
      const fechaSesion = new Date(sesion.fecha + 'T12:00')
      const diaSemana = fechaSesion.getDay() || 7 // 1=Lun..7=Dom
      const dias = rutina.borrador.dias || []

      // Intentar encontrar el día por número de día de semana o simplemente el día del índice
      // Como no hay un campo de día de semana en el borrador, usamos el índice del día
      // La sesión tiene tipo que podría indicar el día
      let diaRutina = dias[0] // fallback al primer día

      // Si la sesión tiene día_numero, usarlo
      if (sesion.dia_numero && dias[sesion.dia_numero - 1]) {
        diaRutina = dias[sesion.dia_numero - 1]
      } else if (dias.length > 0) {
        // Rotar por semana: calcular semanas desde inicio del plan
        const inicioRutina = rutina.created_at ? new Date(rutina.created_at) : new Date()
        const diffDias = Math.floor((fechaSesion.getTime() - inicioRutina.getTime()) / 864e5)
        const diaIdx = diffDias % dias.length
        diaRutina = dias[Math.max(0, diaIdx)]
      }

      if (diaRutina?.ejercicios?.length > 0) {
        // Ver si ya hay ejercicios registrados para esta sesión
        const { data: registrados } = await supabase.from('sesion_ejercicios')
          .select('ejercicio_nombre,sets').eq('sesion_id', sesion.id)

        const mapaRegistrados = {}
        ;(registrados || []).forEach(r => { mapaRegistrados[r.ejercicio_nombre] = r.sets })

        // Cargar historial de cada ejercicio para mostrar el peso anterior
        const ejerciciosConHistorial = await Promise.all(
          diaRutina.ejercicios.map(async (ej) => {
            const { data: ultimo } = await supabase.from('sesion_ejercicios')
              .select('sets,created_at')
              .eq('cliente_id', clienteId)
              .ilike('ejercicio_nombre', ej.nombre)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            const ultimoPeso = ultimo?.sets?.find((s) => s.peso)?.peso
            const numSeries = ej.series || 3

            // Si ya registró esta sesión, prellenar con esos datos
            const yaSets = mapaRegistrados[ej.nombre]

            return {
              nombre: ej.nombre,
              patron: ej.patron,
              series: numSeries,
              reps: ej.reps || '8-12',
              ultimoPeso: ultimoPeso || null,
              sets: yaSets || Array.from({ length: numSeries }, (_, i) => ({
                numero: i + 1,
                peso: ultimoPeso ? String(ultimoPeso) : '',
                reps: ej.reps || '8-12'
              }))
            }
          })
        )
        setEjerciciosSesion(ejerciciosConHistorial)
      }
    }
    setCargandoEjercicios(false)
  }

  async function enviarMensaje() {
    if(!textoMsg.trim()||enviandoMsg) return
    setEnviandoMsg(true)
    await supabase.functions.invoke('portal-accion',{body:{accion:'enviar_mensaje',datos:{contenido:textoMsg.trim()}}}).catch(()=>{})
    setTextoMsg('')
    const {data}=await supabase.from('mensajes_cliente').select('*').eq('cliente_id',clienteId).order('created_at',{ascending:true})
    setMensajes(data||[])
    setEnviandoMsg(false)
    setTimeout(()=>mensajesEndRef.current?.scrollIntoView({behavior:'smooth'}),100)
  }

  async function subirFoto(e){
    const file=e.target.files?.[0]; if(!file) return
    if(file.size>10*1024*1024){setErrorFoto('Máximo 10MB');return}
    setSubiendoFoto(true); setErrorFoto('')
    try{
      const ext=file.name.split('.').pop()
      const path=`${clienteId}/${Date.now()}_${tipoFoto}.${ext}`
      const {error:ue}=await supabase.storage.from('progress-photos').upload(path,file)
      if(ue)throw new Error(ue.message)
      const {data:{publicUrl}}=supabase.storage.from('progress-photos').getPublicUrl(path)
      await supabase.from('fotos_progreso').insert({entrenador_id:cliente.entrenador_id,cliente_id:clienteId,url:publicUrl,fecha:new Date().toISOString().split('T')[0],tipo:tipoFoto,peso:pesoFoto?Number(pesoFoto):null,visible_cliente:true})
      const {data}=await supabase.from('fotos_progreso').select('*').eq('cliente_id',clienteId).order('fecha',{ascending:false})
      setFotos(data||[]); setPesoFoto('')
    }catch(err){setErrorFoto(err.message)}
    setSubiendoFoto(false); e.target.value=''
  }

  // ── Guards ──────────────────────────────────────────────────────────────────
  if(clienteSession===undefined||loading) return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#F7F6F3'}}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor:color,borderTopColor:'transparent'}}/>
    </div>
  )
  if(notFound||!clienteSession) return(
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'#F7F6F3'}}>
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">🔗</p>
        <p className="text-[#0A0A0A] font-bold text-lg mb-2">Cuenta no asociada</p>
        <p className="text-[#6B6B6B] text-sm mb-6">Usa el mismo email que tu entrenador tiene registrado.</p>
        <button onClick={()=>supabase.auth.signOut()} className="text-sm font-semibold px-4 py-2 rounded-xl text-white" style={{background:color}}>Cerrar sesión</button>
      </div>
    </div>
  )
  if(!cliente) return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#F7F6F3'}}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor:color,borderTopColor:'transparent'}}/>
    </div>
  )

  const plan = cliente?.plan_online // 'nutricion' | 'entrenamiento' | 'completo' | null
  const esOnline = cliente?.tipo === 'online'

  // Para clientes online, mostrar solo las tabs de su plan
  // Para presenciales, mostrar todo como siempre
  const puedeVerRutina = !esOnline || !plan || plan === 'entrenamiento' || plan === 'completo'
  const puedeVerNutricion = !esOnline || !plan || plan === 'nutricion' || plan === 'completo'
  const puedeMensajes = !esOnline || !plan || plan === 'completo'

  const TABS=[
    {id:'inicio',label:'Inicio',icon:'⊞'},
    ...(puedeVerRutina ? [{id:'rutina',label:'Rutina',icon:'💪'}] : []),
    {id:'agenda',label:'Agenda',icon:'📅'},
    {id:'progreso',label:'Progreso',icon:'📈'},
    ...(puedeMensajes ? [{id:'mensajes',label:'Mensajes',icon:'✉️',badge:mensajesNoLeidos}] : []),
    ...(puedeVerNutricion && (planNutricion || tieneCuestNutricion) ? [{id:'nutricion',label:'Nutrición',icon:'🥗'}] : []),
    ...(pagos.length>0?[{id:'pagos',label:'Pagos',icon:'💳'}]:[]),
    {id:'ajustes',label:'Ajustes',icon:'⚙️'},
  ]

  // ── Layout ──────────────────────────────────────────────────────────────────
  return(
    <div className="min-h-screen" style={{background:'#F7F6F3'}}>

      {/* Toast portal */}
      {toastPortal && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#111] text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl">
          {toastPortal}
        </div>
      )}

      {/* ── Sidebar desktop / Header mobile ── */}
      {/* Mobile: header top */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-black/8">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:color}}>
              {(cliente?.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-[#6B6B6B] leading-none">{configEntrenador?.nombre_negocio||'Tu entrenador'}</p>
              <p className="text-sm font-bold text-[#0A0A0A] leading-tight">{cliente?.nombre?.split(' ')[0]}</p>
            </div>
          </div>
          <button onClick={()=>supabase.auth.signOut()} className="text-xs text-[#6B6B6B] font-medium px-3 py-1.5 rounded-lg border border-black/10 hover:bg-[#F7F6F3]">Salir</button>
        </div>
        {/* Mobile tabs scroll */}
        <div className="flex overflow-x-auto scrollbar-none border-t border-black/5">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex-shrink-0 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all relative whitespace-nowrap ${tab===t.id?'border-b-2 text-[#0A0A0A]':'border-transparent text-[#6B6B6B]'}`}
              style={tab===t.id?{borderBottomColor:color}:{}}>
              {t.label}
              {t.badge>0&&<span className="absolute top-1.5 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-bold" style={{background:color}}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="md:flex md:min-h-screen">

        {/* ── Sidebar desktop ── */}
        <aside className="hidden md:flex md:flex-col md:w-60 md:flex-shrink-0 md:sticky md:top-0 md:h-screen bg-white border-r border-black/8">
          {/* Logo / nombre */}
          <div className="px-6 py-6 border-b border-black/6">
            <p className="text-xs text-[#6B6B6B] font-medium mb-1">{configEntrenador?.nombre_negocio||'Tu entrenador'}</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{background:color}}>
                {(cliente?.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0A0A0A] truncate">{cliente?.nombre}</p>
                <p className="text-xs text-[#6B6B6B] capitalize">{OBJ[cliente?.objetivo]||cliente?.objetivo||'Cliente'}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative text-left ${tab===t.id?'text-white':'text-[#6B6B6B] hover:bg-[#F7F6F3] hover:text-[#0A0A0A]'}`}
                style={tab===t.id?{background:color}:{}}>
                <span className="text-base w-5 text-center flex-shrink-0">{t.icon}</span>
                <span>{t.label}</span>
                {t.badge>0&&<span className="ml-auto w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:color}}>{t.badge}</span>}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-3 py-4 border-t border-black/6">
            <button onClick={()=>supabase.auth.signOut()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6B6B6B] hover:bg-[#F7F6F3] hover:text-[#0A0A0A] transition-all text-left">
              <span className="text-base w-5 text-center">↩</span>
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Contenido principal ── */}
        <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto overscroll-contain" style={{WebkitOverflowScrolling:'touch'}}>
          <div className="max-w-2xl mx-auto space-y-4">

            {/* ══ INICIO ══════════════════════════════════════════════════════ */}
            {tab==='inicio'&&(
              <TarjetasHoy
                cliente={cliente}
                color={color}
                checkins={checkins}
                rutina={rutina}
                planNutricion={planNutricion}
                sesionesPortal={sesionesPortal}
                pendientesValorar={pendientesValorar}
                tareasExtra={tareasExtra}
                fotos={fotos}
                marcas={marcas}
                puedeVerNutricion={puedeVerNutricion}
                tieneCuestNutricion={tieneCuestNutricion}
                clienteId={clienteId}
                setTab={setTab}
                setSubTabProgreso={setSubTabProgreso}
                configEntrenador={configEntrenador}
                mostrarToast={mostrarToast}
                abrirRegistroSesion={abrirRegistroSesion}
                valorando={valorando}
                setValorando={setValorando}
                setSesionesPortal={setSesionesPortal}
              />
            )}
            {tab==='rutina'&&(
              <>
                {/* Tutorial primer acceso */}
                {esNuevo('rutina') && rutina && (
                  <div className="bg-gradient-to-r from-[#FF5C00]/10 to-transparent border border-[#FF5C00]/20 rounded-2xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">💪</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[#0A0A0A]">{TUTORIALES_CLIENTE.rutina.titulo}</p>
                        <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">{TUTORIALES_CLIENTE.rutina.desc}</p>
                      </div>
                      <button onClick={() => marcarVisto('rutina')} className="text-[#9B9B9B] text-sm flex-shrink-0">×</button>
                    </div>
                  </div>
                )}
                {!rutina?(
                  <div className="bg-white rounded-2xl border border-black/6 p-12 text-center">
                    <p className="text-5xl mb-4">💪</p>
                    <p className="font-bold text-[#0A0A0A] text-lg">Tu plan está en preparación</p>
                    <p className="text-sm text-[#6B6B6B] mt-2">Tu entrenador está personalizando tu rutina</p>
                  </div>
                ):(
                  <>
                    <div className="rounded-2xl p-5 text-white" style={{background: rutina.tipo==='evaluacion' ? '#6366f1' : color}}>
                      {rutina.tipo==='evaluacion' && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">📋 SESIÓN DE EVALUACIÓN</span>
                        </div>
                      )}
                      <p className="font-bold text-lg">{rutina.nombre||'Tu rutina personalizada'}</p>
                      <p className="text-white/70 text-sm mt-1">
                        {rutina.tipo==='evaluacion'
                          ? 'Completa los tests y registra tus marcas — esto personaliza tu programa'
                          : `${(rutina.borrador?.dias||rutina.contenido?.dias||[]).length} días · ${rutina.semanas||4} semanas`
                        }
                      </p>
                    </div>
                    {(rutina.borrador?.dias||rutina.contenido?.dias||[]).map((dia,di)=>(
                      <div key={di}>
                      <div className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-black/6 bg-[#F7F6F3]">
                          <p className="font-semibold text-[#0A0A0A] text-sm">{dia.nombre||dia.dia}</p>
                        </div>
                        <div className="divide-y divide-black/5">
                          {(()=>{
                            const ejercicios = dia.ejercicios||[]
                            // Agrupar por campo agrupacion
                            const grupos = []
                            const vistos = new Set()
                            ejercicios.forEach((ej) => {
                              if (!ej.agrupacion) { grupos.push({ tipo:'single', ejercicios:[ej] }); return }
                              const clave = ej.agrupacion.replace(/\d+$/,'') // A1,A2 → A
                              if (vistos.has(clave)) return
                              vistos.add(clave)
                              const miembros = ejercicios.filter((e) => e.agrupacion?.startsWith(clave))
                              const tipo = miembros.length === 2 ? 'biserie' : miembros.length === 3 ? 'triserie' : 'circuito'
                              grupos.push({ tipo, clave, ejercicios: miembros })
                            })
                            return grupos.map((grupo, gi) => (
                              <div key={gi}>
                                {grupo.tipo !== 'single' && (
                                  <div className="px-5 pt-3 pb-1 flex items-center gap-2">
                                    <div className="h-px flex-1 bg-black/5"/>
                                    <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                      style={{background:`${color}15`,color}}>
                                      {grupo.tipo === 'biserie' ? '↕ Biserie' : grupo.tipo === 'triserie' ? '↕ Triserie' : '↕ Circuito'}
                                    </span>
                                    <div className="h-px flex-1 bg-black/5"/>
                                  </div>
                                )}
                                {grupo.ejercicios.map((ej, ei) => (
                                  <div key={ei} className={`px-5 py-3 flex items-start gap-3 ${grupo.tipo !== 'single' && ei < grupo.ejercicios.length-1 ? 'border-l-2 ml-5 pl-4 border-dashed' : ''}`}
                                    style={grupo.tipo !== 'single' && ei < grupo.ejercicios.length-1 ? {borderColor:`${color}40`} : {}}>
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                                      style={{background: grupo.tipo !== 'single' ? `${color}90` : color}}>
                                      {ej.agrupacion || (gi+1)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-[#0A0A0A]">{ej.nombre}</p>
                                      {ej.notas&&<p className="text-xs text-[#6B6B6B] mt-0.5">{ej.notas}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-sm font-bold" style={{color}}>{ej.series}×{ej.reps}</p>
                                      {ej.descanso && ej.descanso !== '-' && <p className="text-xs text-[#6B6B6B]">💤 {ej.descanso}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                      {/* Botón registrar sesión */}
                      <div className="px-4 pb-4">
                        <button onClick={() => abrirRegistroSesion(dia)}
                          className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                          style={{background: color}}>
                          ✓ Registrar esta sesión
                        </button>
                      </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {/* ══ AGENDA ═══════════════════════════════════════════════════════ */}
            {tab==='agenda'&&(
              <AgendaSemana
                clienteId={clienteId}
                sesionesPortal={sesionesPortal}
                color={color}
                cliente={cliente}
                cancelando={cancelando}
                setCancelando={setCancelando}
                motivoCancel={motivoCancel}
                setMotivoCancel={setMotivoCancel}
                onCancelada={(id) => setSesionesPortal(prev => prev.filter(s => s.id !== id))}
              />
            )}

            {/* ══ PROGRESO ════════════════════════════════════════════════════ */}
            {tab==='progreso'&&(
              <>
                {esNuevo('progreso') && (
                  <div className="bg-gradient-to-r from-[#FF5C00]/10 to-transparent border border-[#FF5C00]/20 rounded-2xl p-4 mb-4 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">📈</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0A0A0A]">{TUTORIALES_CLIENTE.progreso.titulo}</p>
                      <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">{TUTORIALES_CLIENTE.progreso.desc}</p>
                    </div>
                    <button onClick={() => marcarVisto('progreso')} className="text-[#9B9B9B] text-sm">×</button>
                  </div>
                )}
                {/* Subtabs */}
                <div className="flex gap-2 bg-white rounded-2xl border border-black/6 p-1.5">
                  {[['peso','⚖️ Peso'],['medidas','📏 Medidas'],['marcas','🏆 Marcas'],['fotos','📸 Fotos']].map(([id,label])=>(
                    <button key={id} onClick={()=>setSubTabProgreso(id)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${subTabProgreso===id?'text-white shadow-sm':'text-[#6B6B6B] hover:text-[#0A0A0A]'}`}
                      style={subTabProgreso===id?{background:color}:{}}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Peso */}
                {subTabProgreso==='peso'&&(
                  <>
                    {checkins.length>=2&&(()=>{
                      const ultimo=checkins[0],primero=checkins[checkins.length-1]
                      const diff=ultimo.peso&&primero.peso?+(ultimo.peso-primero.peso).toFixed(1):null
                      const sem=Math.ceil((new Date(ultimo.fecha)-new Date(primero.fecha))/(7*864e5))
                      const bajando=diff!==null&&diff<0
                      const enMedia=(arr,k)=>(arr.filter(c=>c[k]).reduce((s,c)=>s+c[k],0)/(arr.filter(c=>c[k]).length||1)).toFixed(1)
                      return(
                        <div className="rounded-2xl p-6 text-white" style={{background:'#111'}}>
                          <p className="text-white/50 text-xs mb-4">Últimas {sem} semanas</p>
                          {diff!==null&&(
                            <div className="flex items-end gap-4 mb-5">
                              <div>
                                <p className="text-5xl font-bold" style={{color:bajando?'#10b981':'#6366f1'}}>{diff>0?'+':''}{diff}kg</p>
                                <p className="text-white/40 text-sm mt-1">{primero.peso}kg → {ultimo.peso}kg</p>
                              </div>
                              <div className="flex-1 flex items-end gap-0.5 h-12">
                                {checkins.slice().reverse().filter(c=>c.peso).map((c,i,arr)=>{
                                  const min=Math.min(...arr.map(x=>x.peso)),max=Math.max(...arr.map(x=>x.peso))
                                  const h=max===min?50:((c.peso-min)/(max-min))*80+20
                                  return<div key={i} className="flex-1 rounded-sm" style={{height:`${h}%`,background:color,opacity:0.6}}/>
                                })}
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-3">
                            {[['⚡',enMedia(checkins,'energia'),'/10','Energía'],['💪',enMedia(checkins,'adherencia_entreno'),'/10','Adherencia'],['📅',checkins.length,'','Check-ins']].map(([ic,v,s,l])=>(
                              <div key={l} className="bg-white/8 rounded-xl p-3 text-center">
                                <p className="text-lg">{ic}</p>
                                <p className="text-white font-bold text-base mt-0.5">{v}{s}</p>
                                <p className="text-white/40 text-xs mt-0.5">{l}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                    <div className="bg-white rounded-2xl border border-black/6 p-5">
                      <p className="text-sm font-bold text-[#0A0A0A] mb-4">Evolución</p>
                      <GraficasCliente clienteId={clienteId}/>
                    </div>
                    {checkins.slice(0,6).map(ci=>(
                      <div key={ci.id} className="bg-white rounded-2xl border border-black/6 p-4">
                        <p className="text-xs font-medium text-[#6B6B6B] mb-2">{new Date(ci.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'long'})}</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {ci.peso&&<span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full">⚖️ {ci.peso}kg</span>}
                          {ci.energia&&<span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">⚡ {ci.energia}/10</span>}
                          {ci.estres&&<span className={`text-xs px-2.5 py-1 rounded-full ${ci.estres>=7?'bg-red-50 text-red-700':ci.estres>=5?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700'}`}>😤 {ci.estres}/10</span>}
                          {ci.motivacion&&<span className="text-xs bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full">💫 {ci.motivacion}/7</span>}
                        </div>
                      </div>
                    ))}
                    {cliente?.tipo==='online'&&<SesionesRegistradas clienteId={clienteId} color={color}/>}
                    {/* Gráfico energía y fatiga — visible para presencial y online */}
                    {checkins.length >= 2 && (
                      <div className="bg-white rounded-2xl border border-black/6 p-5">
                        <p className="text-sm font-bold text-[#0A0A0A] mb-4">⚡ Energía y fatiga</p>
                        <div className="space-y-3">
                          {/* Energía */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-semibold text-[#6B6B6B]">Energía</p>
                              <p className="text-xs font-bold text-blue-600">{checkins[0]?.energia||'—'}/10</p>
                            </div>
                            <div className="flex gap-0.5 items-end h-10">
                              {checkins.slice(0,8).reverse().map((ci,i)=>{
                                const v=ci.energia||0
                                const h=v>0?(v/10)*100:5
                                return <div key={i} className="flex-1 rounded-t-sm transition-all" style={{height:`${h}%`,background:`#6366f1`,opacity:0.4+((i/8)*0.6)}}/>
                              })}
                            </div>
                          </div>
                          {/* Fatiga */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-semibold text-[#6B6B6B]">Fatiga</p>
                              <p className="text-xs font-bold text-orange-600">{checkins[0]?.fatiga||'—'}/10</p>
                            </div>
                            <div className="flex gap-0.5 items-end h-10">
                              {checkins.slice(0,8).reverse().map((ci,i)=>{
                                const v=ci.fatiga||0
                                const h=v>0?(v/10)*100:5
                                return <div key={i} className="flex-1 rounded-t-sm transition-all" style={{height:`${h}%`,background:`#f97316`,opacity:0.4+((i/8)*0.6)}}/>
                              })}
                            </div>
                          </div>
                          <p className="text-xs text-[#9B9B9B] text-center">Últimos {Math.min(checkins.length,8)} check-ins</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Medidas */}
                {subTabProgreso==='medidas'&&(
                  <>
                    <div className="bg-white rounded-2xl border border-black/6 p-5">
                      <p className="text-sm font-bold text-[#0A0A0A] mb-4">📏 Registrar medidas</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[['pecho','Pecho'],['cintura','Cintura'],['cadera','Cadera'],['bicep','Bícep'],['muslo','Muslo'],['gemelo','Gemelo']].map(([k,l])=>(
                          <div key={k}>
                            <label className="text-xs text-[#6B6B6B] mb-1 block">{l} (cm)</label>
                            <input type="number" value={medidas[k]||''} onChange={e=>setMedidas(m=>({...m,[k]:e.target.value}))}
                              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none" placeholder="0"
                              onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor=''}/>
                          </div>
                        ))}
                      </div>
                      <button onClick={async()=>{
                        const vals=Object.fromEntries(Object.entries(medidas).filter(([,v])=>v).map(([k,v])=>[k,Number(v)]))
                        if(!Object.keys(vals).length) return
                        await supabase.from('medidas_cliente').insert({entrenador_id:cliente.entrenador_id,cliente_id:clienteId,fecha:new Date().toISOString().split('T')[0],...vals})
                        setMedidas({})
                        const {data}=await supabase.from('medidas_cliente').select('*').eq('cliente_id',clienteId).order('fecha',{ascending:false})
                        setHistorialMedidas(data||[])
                      }} className="w-full mt-4 text-white text-sm font-semibold py-3 rounded-xl transition-all" style={{background:color}}>Guardar medidas</button>
                    </div>
                    {historialMedidas.slice(0,5).map((m,i)=>(
                      <div key={i} className="bg-white rounded-2xl border border-black/6 p-4">
                        <p className="text-xs font-medium text-[#6B6B6B] mb-2">{new Date(m.fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {[['Pecho',m.pecho],['Cintura',m.cintura],['Cadera',m.cadera],['Bícep',m.bicep],['Muslo',m.muslo],['Gemelo',m.gemelo]].filter(([,v])=>v).map(([l,v])=>(
                            <span key={l} className="text-xs bg-[#F7F6F3] text-[#0A0A0A] px-2.5 py-1.5 rounded-full font-medium">{l}: {v}cm</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Marcas */}
                {subTabProgreso==='marcas'&&(
                  <>
                    <div className="bg-white rounded-2xl border border-black/6 p-5">
                      <p className="text-sm font-bold text-[#0A0A0A] mb-4">🏆 Registrar marca personal</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[#6B6B6B] mb-1 block">Ejercicio *</label>
                          <input value={formMarca.ejercicio} onChange={e=>setFormMarca(f=>({...f,ejercicio:e.target.value}))}
                            placeholder="Press banca, Sentadilla, Peso muerto..."
                            className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none"/>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-[#6B6B6B] mb-1 block">Peso (kg)</label>
                            <input type="number" value={formMarca.peso_kg} onChange={e=>setFormMarca(f=>({...f,peso_kg:e.target.value}))}
                              placeholder="80" className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none"/>
                          </div>
                          <div>
                            <label className="text-xs text-[#6B6B6B] mb-1 block">Repeticiones</label>
                            <input type="number" value={formMarca.reps} onChange={e=>setFormMarca(f=>({...f,reps:e.target.value}))}
                              placeholder="1" className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none"/>
                          </div>
                        </div>
                        <input value={formMarca.notas} onChange={e=>setFormMarca(f=>({...f,notas:e.target.value}))}
                          placeholder="Notas (técnica, sensaciones...)"
                          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none"/>
                        <button onClick={async()=>{
                          if(!formMarca.ejercicio.trim()) return
                          await supabase.from('marcas_cliente').insert({entrenador_id:cliente.entrenador_id,cliente_id:cliente.id,ejercicio:formMarca.ejercicio.trim(),peso_kg:formMarca.peso_kg?Number(formMarca.peso_kg):null,reps:formMarca.reps?Number(formMarca.reps):null,notas:formMarca.notas||null,fecha:new Date().toISOString().split('T')[0]})
                          const {data}=await supabase.from('marcas_cliente').select('*').eq('cliente_id',cliente.id).order('fecha',{ascending:false})
                          setMarcas(data||[]); setFormMarca({ejercicio:'',peso_kg:'',reps:'',notas:''})
                        }} disabled={!formMarca.ejercicio.trim()} className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-all" style={{background:color}}>
                          Guardar marca
                        </button>
                      </div>
                    </div>
                    {marcas.length===0?(
                      <div className="bg-white rounded-2xl border border-black/6 p-10 text-center">
                        <p className="text-3xl mb-2">🏆</p>
                        <p className="text-sm text-[#6B6B6B]">Registra tu primera marca personal</p>
                      </div>
                    ):Object.entries(marcas.reduce((acc,m)=>{if(!acc[m.ejercicio])acc[m.ejercicio]=[];acc[m.ejercicio].push(m);return acc},{})).map(([ejercicio,registros])=>{
                      const mejor=registros.reduce((b,r)=>!b||(r.peso_kg>b.peso_kg)?r:b,null)
                      return(
                        <div key={ejercicio} className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                          <div className="px-5 py-4 flex items-center justify-between border-b border-black/6">
                            <p className="font-semibold text-[#0A0A0A]">{ejercicio}</p>
                            {mejor?.peso_kg&&<div className="flex items-center gap-1.5"><span className="text-yellow-400">🏆</span><span className="font-bold text-[#0A0A0A]">{mejor.peso_kg}kg</span>{mejor.reps&&<span className="text-[#6B6B6B] text-sm">× {mejor.reps}</span>}</div>}
                          </div>
                          {registros.filter(r=>r.peso_kg).length>1&&(()=>{
                            const pts=registros.slice().reverse().filter(r=>r.peso_kg)
                            const min=Math.min(...pts.map(x=>x.peso_kg))
                            const max=Math.max(...pts.map(x=>x.peso_kg))
                            const W=300, H=60, pad=8
                            const x=i=>pad+(i/(pts.length-1))*(W-pad*2)
                            const y=v=>H-pad-((v-min)/(max-min||1))*(H-pad*2)
                            const d=pts.map((p,i)=>`${i===0?'M':'L'}${x(i).toFixed(1)},${y(p.peso_kg).toFixed(1)}`).join(' ')
                            return(
                              <div className="px-5 pt-4 pb-2">
                                <div className="flex justify-between text-xs text-[#6B6B6B] mb-1">
                                  <span>{pts[0]?.peso_kg}kg</span>
                                  <span className="font-semibold" style={{color}}>→ {pts[pts.length-1]?.peso_kg}kg</span>
                                </div>
                                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:60}}>
                                  <defs>
                                    <linearGradient id={`grad-${ejercicio.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
                                      <stop offset="100%" stopColor={color} stopOpacity="0"/>
                                    </linearGradient>
                                  </defs>
                                  <path d={`${d} L${x(pts.length-1).toFixed(1)},${H} L${pad},${H} Z`}
                                    fill={`url(#grad-${ejercicio.replace(/\s/g,'')})`}/>
                                  <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  {pts.map((p,i)=>(
                                    <circle key={i} cx={x(i)} cy={y(p.peso_kg)} r="3" fill={i===pts.length-1?color:'white'} stroke={color} strokeWidth="2"/>
                                  ))}
                                </svg>
                                <div className="flex justify-between text-xs text-[#6B6B6B] mt-1">
                                  <span>{new Date(pts[0].fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                                  <span>{new Date(pts[pts.length-1].fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                                </div>
                              </div>
                            )
                          })()}
                          <div className="divide-y divide-black/5">
                            {registros.slice(0,5).map((r,i)=>(
                              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                                <p className="text-xs text-[#6B6B6B]">{new Date(r.fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</p>
                                <div className="flex items-center gap-2">
                                  {r.peso_kg&&<span className="text-sm font-bold text-[#0A0A0A]">{r.peso_kg}kg</span>}
                                  {r.reps&&<span className="text-xs text-[#6B6B6B]">× {r.reps}</span>}
                                  {i===0&&registros[1]?.peso_kg&&r.peso_kg&&(
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.peso_kg>registros[1].peso_kg?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-500'}`}>
                                      {r.peso_kg>registros[1].peso_kg?'+':''}{(r.peso_kg-registros[1].peso_kg).toFixed(1)}kg
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Fotos */}
                {subTabProgreso==='fotos'&&(
                  <>
                    <div className="bg-white rounded-2xl border border-black/6 p-5">
                      <p className="text-sm font-bold text-[#0A0A0A] mb-4">📸 Añadir foto de progreso</p>
                      <div className="flex gap-2 mb-3">
                        {['frontal','lateral','espalda'].map(t=>(
                          <button key={t} onClick={()=>setTipoFoto(t)}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${tipoFoto===t?'text-white':'bg-[#F7F6F3] text-[#6B6B6B]'}`}
                            style={tipoFoto===t?{background:color}:{}}>{t}</button>
                        ))}
                      </div>
                      <input type="number" value={pesoFoto} onChange={e=>setPesoFoto(e.target.value)}
                        placeholder="Peso del día (kg) — opcional"
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none"/>
                      {errorFoto&&<p className="text-red-500 text-xs mb-2">{errorFoto}</p>}
                      <label className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold cursor-pointer transition-all ${subiendoFoto?'opacity-50':''}`} style={{background:color}}>
                        {subiendoFoto?<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Subiendo...</>:<>📷 Subir foto</>}
                        <input type="file" accept="image/*" className="hidden" onChange={subirFoto} disabled={subiendoFoto}/>
                      </label>
                    </div>
                    {fotos.length===0?(
                      <div className="bg-white rounded-2xl border border-black/6 p-10 text-center">
                        <p className="text-3xl mb-2">📷</p>
                        <p className="text-sm text-[#6B6B6B]">Sube tu primera foto de progreso</p>
                      </div>
                    ):Object.entries(fotos.reduce((acc,f)=>{if(!acc[f.fecha])acc[f.fecha]=[];acc[f.fecha].push(f);return acc},{})).map(([fecha,fotosDia])=>(
                      <div key={fecha} className="bg-white rounded-2xl border border-black/6 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-[#0A0A0A]">{new Date(fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long'})}</p>
                          {fotosDia[0]?.peso&&<p className="text-sm font-bold" style={{color}}>{fotosDia[0].peso}kg</p>}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {fotosDia.map(f=>(
                            <div key={f.id} className="relative rounded-xl overflow-hidden aspect-[3/4]">
                              <img src={f.url} alt={f.tipo} className="w-full h-full object-cover"/>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 text-center">
                                <span className="text-white text-xs capitalize font-medium">{f.tipo}</span>
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

            {/* ══ MENSAJES ════════════════════════════════════════════════════ */}
            {tab==='mensajes'&&(
              <div className="flex flex-col" style={{minHeight:'60vh'}}>
                {esNuevo('mensajes') && (
                  <div className="bg-gradient-to-r from-[#FF5C00]/10 to-transparent border border-[#FF5C00]/20 rounded-2xl p-4 mb-4 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">💬</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0A0A0A]">{TUTORIALES_CLIENTE.mensajes.titulo}</p>
                      <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">{TUTORIALES_CLIENTE.mensajes.desc}</p>
                    </div>
                    <button onClick={() => marcarVisto('mensajes')} className="text-[#9B9B9B] text-sm">×</button>
                  </div>
                )}
                <div className="flex-1 space-y-3 mb-4">
                  {mensajes.filter(m=>m.tipo!=='sistema').length===0?(
                    <div className="bg-white rounded-2xl border border-black/6 p-12 text-center">
                      <p className="text-4xl mb-3">✉️</p>
                      <p className="text-sm font-semibold text-[#0A0A0A]">Aún no hay mensajes</p>
                      <p className="text-xs text-[#6B6B6B] mt-1">Escríbele a tu entrenador</p>
                    </div>
                  ):mensajes.filter(m=>m.tipo!=='sistema').map(m=>(
                    <div key={m.id} className={`flex ${m.tipo==='cliente'?'justify-end':'justify-start'}`}>
                      <div className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-3 ${m.tipo==='cliente'?'rounded-br-sm text-white':'bg-white border border-black/6 text-[#0A0A0A] rounded-bl-sm'}`}
                        style={m.tipo==='cliente'?{background:color}:{}}>
                        {m.tipo!=='cliente'&&<p className="text-xs font-semibold mb-1 opacity-60">{configEntrenador?.nombre_entrenador||'Tu entrenador'}</p>}
                        <p className="text-sm leading-relaxed">{m.contenido}</p>
                        <p className={`text-xs mt-1.5 ${m.tipo==='cliente'?'text-white/50':'text-[#6B6B6B]'}`}>
                          {new Date(m.created_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})} · {new Date(m.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={mensajesEndRef}/>
                </div>
                {/* Input fijo */}
                <div className="sticky bottom-4 md:bottom-0">
                  <div className="flex gap-2 bg-white border border-black/10 rounded-2xl p-2 shadow-lg">
                    <textarea value={textoMsg} onChange={e=>setTextoMsg(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviarMensaje()}}}
                      placeholder="Escribe a tu entrenador... (Enter para enviar)" rows={2}
                      className="flex-1 text-sm resize-none focus:outline-none px-2 py-1.5 text-[#0A0A0A] placeholder:text-[#9B9B9B]"/>
                    <button onClick={enviarMensaje} disabled={!textoMsg.trim()||enviandoMsg}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white self-end disabled:opacity-40 flex-shrink-0 transition-all"
                      style={{background:color}}>
                      {enviandoMsg?<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<span className="text-lg">↑</span>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══ NUTRICIÓN ═══════════════════════════════════════════════════ */}
            {tab==='nutricion'&&(
              <>
                {!planNutricion?(
                  tieneCuestNutricion ? (
                    /* Estado 2: cuestionario respondido, plan en preparación */
                    <div className="bg-white rounded-2xl border border-black/6 p-10 text-center">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl" style={{background:`${color}15`}}>
                        ⏳
                      </div>
                      <p className="font-bold text-[#0A0A0A] text-lg mb-2">Cuestionario recibido</p>
                      <p className="text-sm text-[#6B6B6B] leading-relaxed">Tu entrenador ya tiene tus datos y está preparando tu plan nutricional personalizado. En breve lo verás aquí.</p>
                      <div className="mt-5 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{background:color, animationDelay:'0ms'}}/>
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{background:color, animationDelay:'150ms'}}/>
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{background:color, animationDelay:'300ms'}}/>
                      </div>
                    </div>
                  ) : (
                    /* Estado 1: sin cuestionario todavía */
                    <div className="bg-white rounded-2xl border border-black/6 p-8 text-center">
                      <p className="text-5xl mb-4">🥗</p>
                      <p className="font-bold text-[#0A0A0A] text-lg mb-2">Plan en preparación</p>
                      <p className="text-sm text-[#6B6B6B] mb-6">Rellena el cuestionario para que tu entrenador pueda crear un plan nutricional personalizado para ti.</p>
                      <a href={`https://forge-studio-os.vercel.app/nutricion-cuest?e=${cliente.entrenador_id}&c=${cliente.id}`}
                        target="_blank" rel="noreferrer"
                        className="inline-block px-6 py-3 rounded-xl text-white text-sm font-semibold"
                        style={{background:color}}>
                        📋 Rellenar cuestionario nutricional
                      </a>
                    </div>
                  )
                ):(
                  <>
                    <div className="rounded-2xl p-5 text-white" style={{background:'#111'}}>
                      <p className="font-bold text-lg mb-4">{planNutricion.nombre}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[['kcal',planNutricion.calorias_dia,'#FF5C00'],['Prot.',`${planNutricion.proteinas_g}g`,'#6366f1'],['Carbs',`${planNutricion.carbohidratos_g}g`,'#f59e0b'],['Grasa',`${planNutricion.grasas_g}g`,'#10b981']].map(([l,v,c])=>(
                          <div key={l} className="bg-white/8 rounded-xl p-3 text-center">
                            <p className="font-bold text-base" style={{color:c}}>{v}</p>
                            <p className="text-white/50 text-xs mt-0.5">{l}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {(()=>{
                      const menu=planNutricion.contenido?.menu||planNutricion.borrador?.menu||[]
                      const dias=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
                      return(
                        <div className="space-y-3">
                          <div className="flex gap-1.5 bg-white rounded-2xl border border-black/6 p-1.5 overflow-x-auto">
                            {dias.map((d,i)=>(
                              <button key={d} onClick={()=>setDiaActivoNutr(i)}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${i===diaActivoNutr?'text-white':'text-[#6B6B6B]'}`}
                                style={i===diaActivoNutr?{background:color}:{}}>{d}</button>
                            ))}
                          </div>
                          {(menu[diaActivoNutr]?.comidas||[]).map((comida,i)=>(
                            <div key={i} className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                              <div className="px-5 py-3.5 bg-[#F7F6F3] border-b border-black/6 flex items-center justify-between">
                                <span className="font-semibold text-[#0A0A0A] text-sm">{comida.nombre}</span>
                                <span className="text-[#6B6B6B] text-xs">{comida.hora} · {comida.kcal||comida.calorias}kcal</span>
                              </div>
                              <div className="p-4 space-y-2">
                                {(comida.alimentos||[]).map((al,j)=>(
                                  <div key={j} className="flex justify-between items-baseline">
                                    <span className="text-sm text-[#0A0A0A]">{al.nombre}</span>
                                    <span className="text-xs text-[#6B6B6B] font-medium ml-4 flex-shrink-0">{al.cantidad}</span>
                                  </div>
                                ))}
                                {comida.prep&&<p className="text-xs text-[#6B6B6B] border-t border-black/5 pt-2 mt-2">🍳 {comida.prep}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                    {(planNutricion.contenido?.hidratacion||planNutricion.borrador?.hidratacion)&&(
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
                        <span className="text-2xl">💧</span>
                        <div>
                          <p className="text-sm font-bold text-blue-900">{planNutricion.contenido?.hidratacion||planNutricion.borrador?.hidratacion}L de agua al día</p>
                          <p className="text-xs text-blue-600">Hidratación recomendada</p>
                        </div>
                      </div>
                    )}
                    {(planNutricion.contenido?.recomendaciones||planNutricion.borrador?.recomendaciones)?.length>0&&(
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-widest">Recomendaciones</p>
                        {(planNutricion.contenido?.recomendaciones||planNutricion.borrador?.recomendaciones).map((rec,i)=>(
                          <div key={i} className="flex items-start gap-3 bg-white border border-black/6 rounded-xl p-4">
                            <span className="text-lg flex-shrink-0">{['💧','🕐','💪','😴','⚡'][i]||'→'}</span>
                            <p className="text-sm text-[#444] leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {planNutricion.notas_entrenador&&(
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-amber-700 mb-1">📝 Nota de tu entrenador</p>
                        <p className="text-sm text-amber-800">{planNutricion.notas_entrenador}</p>
                      </div>
                    )}
                    {/* Botón actualizar cuestionario */}
                    <a href={`https://forge-studio-os.vercel.app/nutricion-cuest?e=${cliente.entrenador_id}&c=${cliente.id}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full border border-black/10 text-[#6B6B6B] text-sm font-medium py-3 rounded-xl hover:bg-[#F7F6F3] transition-all">
                      📋 Actualizar mis datos nutricionales
                    </a>
                  </>
                )}
              </>
            )}

            {/* ══ CLASES ═══════════════════════════════════════════════════════ */}
            {tab==='clases'&&(
              <ClasesCliente
                clienteId={clienteId}
                entrenadorId={cliente?.entrenador_id}
                color={color}
              />
            )}

            {/* ══ PAGOS ═══════════════════════════════════════════════════════ */}
            {tab==='pagos'&&(
              <PagosCliente cliente={cliente} pagos={pagos} color={color} session={session}/>
            )}

            {/* ══ AJUSTES ══════════════════════════════════════════════════ */}
            {/* ══ HÁBITOS ══════════════════════════════════════════════════════ */}
            {tab==='habitos'&&(
              <HabitosPortal clienteId={clienteId} color={color} />
            )}

            {tab==='ajustes'&&(
              <div className="space-y-3">

                {/* BLOQUE 1 — Mi plan */}
                <div className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                  <div className="px-5 py-4 border-b border-black/6">
                    <p className="text-sm font-bold text-[#0A0A0A]">Mi plan</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">Tu entrenador recibirá una notificación si cambias algo</p>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Peso actual y objetivo */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Peso actual (kg)</label>
                        <input type="number" step="0.1"
                          defaultValue={cliente?.peso_actual||''}
                          onChange={e=>setFormPerfil(f=>({...(f||{}),peso_actual:e.target.value}))}
                          placeholder="75.5"
                          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-[#FF5C00]"/>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Peso objetivo (kg)</label>
                        <input type="number" step="0.1"
                          defaultValue={cliente?.peso_objetivo||''}
                          onChange={e=>setFormPerfil(f=>({...(f||{}),peso_objetivo:e.target.value}))}
                          placeholder="70.0"
                          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-[#FF5C00]"/>
                      </div>
                    </div>

                    {/* Objetivo */}
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Mi objetivo</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ['perdida_grasa','🔥','Pérdida de grasa'],
                          ['ganancia_muscular','💪','Ganar músculo'],
                          ['tonificacion','✨','Tonificación'],
                          ['mantenimiento','⚖️','Mantenimiento'],
                          ['fuerza','🏋️','Fuerza máxima'],
                          ['resistencia','🏃','Resistencia'],
                        ].map(([val,icon,label])=>(
                          <button key={val} type="button"
                            onClick={()=>setFormPerfil(f=>({...(f||{}),objetivo:val}))}
                            className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-left transition-all flex items-center gap-2 ${
                              (formPerfil?.objetivo||cliente?.objetivo)===val
                                ? 'text-white'
                                : 'bg-[#F7F6F3] text-[#6B6B6B]'
                            }`}
                            style={(formPerfil?.objetivo||cliente?.objetivo)===val?{background:color}:{}}>
                            <span>{icon}</span>{label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Días por semana */}
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Días disponibles para entrenar</label>
                      <div className="flex gap-2">
                        {[2,3,4,5,6].map(d=>(
                          <button key={d} type="button"
                            onClick={()=>setFormPerfil(f=>({...(f||{}),dias_semana:d}))}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                              (formPerfil?.dias_semana||cliente?.dias_semana)===d
                                ? 'text-white'
                                : 'bg-[#F7F6F3] text-[#6B6B6B]'
                            }`}
                            style={(formPerfil?.dias_semana||cliente?.dias_semana)===d?{background:color}:{}}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lesiones */}
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Lesiones o limitaciones actuales</label>
                      <textarea
                        defaultValue={cliente?.lesiones||''}
                        onChange={e=>setFormPerfil(f=>({...(f||{}),lesiones:e.target.value}))}
                        placeholder="Ninguna / Describe cualquier molestia o limitación"
                        rows={2}
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"/>
                    </div>

                    <button onClick={async()=>{
                      if(!formPerfil||!Object.keys(formPerfil).length) return
                      setGuardandoPerfil(true)
                      const updates={}
                      if(formPerfil.peso_actual) updates.peso_actual=Number(formPerfil.peso_actual)
                      if(formPerfil.peso_objetivo) updates.peso_objetivo=Number(formPerfil.peso_objetivo)
                      if(formPerfil.objetivo) updates.objetivo=formPerfil.objetivo
                      if(formPerfil.dias_semana) updates.dias_semana=formPerfil.dias_semana
                      if(formPerfil.lesiones!==undefined) updates.lesiones=formPerfil.lesiones
                      await supabase.from('clientes').update(updates).eq('id',cliente.id)
                      // Notificar cambios al entrenador
                      const cambios=[]
                      if(formPerfil.objetivo&&formPerfil.objetivo!==cliente.objetivo) cambios.push(`objetivo: ${formPerfil.objetivo.replace(/_/g,' ')}`)
                      if(formPerfil.dias_semana&&formPerfil.dias_semana!==cliente.dias_semana) cambios.push(`días/semana: ${formPerfil.dias_semana}`)
                      if(formPerfil.lesiones&&formPerfil.lesiones!==cliente.lesiones) cambios.push(`lesiones: ${formPerfil.lesiones}`)
                      if(cambios.length) {
                        await supabase.functions.invoke('portal-accion',{body:{accion:'enviar_mensaje',datos:{
                          contenido:`He actualizado mi perfil: ${cambios.join(' · ')}.`
                        }}}).catch(()=>{})
                      }
                      setFormPerfil(null)
                      setGuardandoPerfil(false)
                    }} disabled={!formPerfil||!Object.keys(formPerfil).length||guardandoPerfil}
                      className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
                      style={{background:color}}>
                      {guardandoPerfil?'Guardando...':'Guardar cambios'}
                    </button>
                  </div>
                </div>

                {/* BLOQUE 2 — Mi cuenta */}
                <div className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                  <div className="px-5 py-4 border-b border-black/6">
                    <p className="text-sm font-bold text-[#0A0A0A]">Mi cuenta</p>
                  </div>
                  <div className="divide-y divide-black/5">
                    <button onClick={async()=>{
                      const {error}=await supabase.auth.resetPasswordForEmail(
                        clienteSession?.email||'',
                        { redirectTo: `${window.location.origin}/reset-password` }
                      )
                      if(!error) mostrarToast('✓ Email enviado — revisa tu bandeja de entrada')
                      else mostrarToast('Error al enviar el email. Inténtalo de nuevo.')
                    }} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F6F3] transition-all text-left">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center text-base">🔑</span>
                        <span className="text-sm font-medium text-[#0A0A0A]">Cambiar contraseña</span>
                      </div>
                      <span className="text-[#6B6B6B]">→</span>
                    </button>
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center text-base">📧</span>
                        <div>
                          <p className="text-sm font-medium text-[#0A0A0A]">Email</p>
                          <p className="text-xs text-[#6B6B6B]">{clienteSession?.email||''}</p>
                        </div>
                      </div>
                    </div>
                    <button onClick={async()=>{
                      await supabase.auth.signOut()
                      window.location.href='/'
                    }} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F6F3] transition-all text-left">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-base">🚪</span>
                        <span className="text-sm font-medium text-red-500">Cerrar sesión</span>
                      </div>
                      <span className="text-red-400">→</span>
                    </button>
                  </div>
                </div>

                {/* BLOQUE 3 — Legal */}
                <div className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                  <div className="px-5 py-4 border-b border-black/6">
                    <p className="text-sm font-bold text-[#0A0A0A]">Legal y privacidad</p>
                  </div>
                  <div className="divide-y divide-black/5">
                    <a href="/privacidad.html" target="_blank" rel="noreferrer"
                      className="flex items-center justify-between px-5 py-4 hover:bg-[#F7F6F3] transition-all">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center text-base">🔒</span>
                        <span className="text-sm font-medium text-[#0A0A0A]">Política de Privacidad</span>
                      </div>
                      <span className="text-[#6B6B6B]">→</span>
                    </a>
                    <button onClick={async()=>{
                      await supabase.functions.invoke('portal-accion',{body:{accion:'enviar_mensaje',datos:{
                        contenido:'Solicito una copia de todos mis datos personales almacenados en el sistema (derecho de acceso RGPD).'
                      }}}).catch(()=>{})
                      mostrarToast('✓ Solicitud enviada — recibirás tus datos en 30 días')
                    }} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F6F3] transition-all text-left">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center text-base">📂</span>
                        <span className="text-sm font-medium text-[#0A0A0A]">Solicitar mis datos</span>
                      </div>
                      <span className="text-[#6B6B6B]">→</span>
                    </button>
                    <button onClick={async()=>{
                      if(!window.confirm('¿Seguro que quieres solicitar la eliminación de tu cuenta y todos tus datos? Esta acción no se puede deshacer.')) return
                      await supabase.functions.invoke('portal-accion',{body:{accion:'enviar_mensaje',datos:{
                        contenido:'Solicito la eliminación de mi cuenta y todos mis datos personales (derecho al olvido RGPD).'
                      }}}).catch(()=>{})
                      mostrarToast('✓ Solicitud enviada — procesaremos la eliminación en 30 días')
                    }} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F6F3] transition-all text-left">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-base">🗑</span>
                        <span className="text-sm font-medium text-red-500">Eliminar mi cuenta</span>
                      </div>
                      <span className="text-red-400">→</span>
                    </button>
                  </div>
                </div>

                <p className="text-center text-xs text-[#9B9B9B] pb-2">Forge Studio OS · v1.0</p>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* MODAL ACTIVIDAD LIBRE */}
      {modalActividad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModalActividad(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-[#0A0A0A]">🚶 Actividad libre</p>
              <button onClick={() => setModalActividad(false)} className="text-[#6B6B6B] text-xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Tipo de actividad</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['caminata','🚶 Caminata'],['carrera','🏃 Carrera'],['bici','🚴 Bici'],['natacion','🏊 Natación'],['deporte','⚽ Deporte'],['otro','💪 Otro']].map(([v,l])=>(
                    <button key={v} type="button" onClick={() => setFormActividad(f=>({...f,tipo:v}))}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all text-center ${formActividad.tipo===v?'text-white':'bg-[#F7F6F3] text-[#6B6B6B]'}`}
                      style={formActividad.tipo===v?{background:color}:{}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Duración (min)</label>
                  <input type="number" value={formActividad.duracion} onChange={e=>setFormActividad(f=>({...f,duracion:e.target.value}))}
                    placeholder="30" className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Distancia (km)</label>
                  <input type="number" step="0.1" value={formActividad.distancia} onChange={e=>setFormActividad(f=>({...f,distancia:e.target.value}))}
                    placeholder="3.5" className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Notas (opcional)</label>
                <input type="text" value={formActividad.notas} onChange={e=>setFormActividad(f=>({...f,notas:e.target.value}))}
                  placeholder="Cómo fue, cómo te sentiste..." className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
              </div>
              <button onClick={async () => {
                setGuardandoActividad(true)
                const desc = [
                  formActividad.tipo.charAt(0).toUpperCase() + formActividad.tipo.slice(1),
                  formActividad.duracion ? `${formActividad.duracion} min` : null,
                  formActividad.distancia ? `${formActividad.distancia} km` : null,
                  formActividad.notas || null,
                ].filter(Boolean).join(' · ')
                await supabase.from('sesiones').insert({
                  cliente_id: cliente.id,
                  entrenador_id: cliente.entrenador_id,
                  fecha: new Date().toISOString().split('T')[0],
                  hora: new Date().toTimeString().slice(0,5),
                  duracion_minutos: formActividad.duracion ? Number(formActividad.duracion) : 30,
                  tipo: 'libre',
                  completada: true,
                  notas: desc,
                })
                setGuardandoActividad(false)
                setModalActividad(false)
                setFormActividad({ tipo:'caminata', descripcion:'', duracion:'', distancia:'', notas:'' })
                mostrarToast('✓ Actividad registrada')
              }} disabled={guardandoActividad}
                className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40"
                style={{background:color}}>
                {guardandoActividad ? 'Guardando...' : 'Registrar actividad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PagosCliente({ cliente, pagos, color, session }) {
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState('')

  const tieneStripe = !!cliente?.stripe_customer_id
  const suscripcionActiva = !!cliente?.suscripcion_activa
  const proximaFactura = cliente?.proxima_factura
  const ultimoPago = pagos?.[0]

  // Calcular días hasta vencimiento si no tiene Stripe
  const diasVencimiento = ultimoPago && !suscripcionActiva ? (() => {
    const v = new Date(ultimoPago.fecha_pago)
    v.setMonth(v.getMonth() + 1)
    return Math.ceil((v - new Date()) / 864e5)
  })() : null

  async function abrirPortalStripe() {
    setAbriendo(true); setError('')
    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal-cliente')
      if (error) throw error
      if (data?.url) window.open(data.url, '_blank')
      else throw new Error(data?.error || 'Error al abrir el portal')
    } catch (e) {
      setError('No se pudo abrir el portal de pagos. Contacta con tu entrenador.')
    }
    setAbriendo(false)
  }

  return (
    <div className="space-y-4">
      {/* Estado principal */}
      <div className={`rounded-2xl p-5 border ${
        suscripcionActiva ? 'bg-emerald-50 border-emerald-100' :
        diasVencimiento !== null && diasVencimiento <= 0 ? 'bg-red-50 border-red-100' :
        diasVencimiento !== null && diasVencimiento <= 7 ? 'bg-amber-50 border-amber-100' :
        'bg-emerald-50 border-emerald-100'
      }`}>
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0">
            {suscripcionActiva ? '🔄' : diasVencimiento !== null && diasVencimiento <= 0 ? '⚠️' : '✅'}
          </span>
          <div className="flex-1">
            {suscripcionActiva ? (
              <>
                <p className="font-bold text-emerald-800">Cobro automático activo</p>
                <p className="text-sm text-emerald-600 mt-0.5">
                  {cliente?.precio_mensual ? `${cliente.precio_mensual}€/mes` : ''}
                  {proximaFactura ? ` · Próximo cobro: ${new Date(proximaFactura+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long'})}` : ''}
                </p>
              </>
            ) : diasVencimiento !== null ? (
              <>
                <p className={`font-bold ${diasVencimiento <= 0 ? 'text-red-800' : diasVencimiento <= 7 ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {diasVencimiento <= 0 ? 'Pago vencido' : diasVencimiento <= 7 ? `Vence en ${diasVencimiento} días` : 'Pago al día'}
                </p>
                <p className={`text-sm mt-0.5 ${diasVencimiento <= 0 ? 'text-red-600' : diasVencimiento <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {ultimoPago?.concepto||'Entrenamiento'} · {Number(ultimoPago?.importe||0).toFixed(0)}€/mes
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-[#6B6B6B]">Sin pagos registrados</p>
                <p className="text-sm text-[#9B9B9B] mt-0.5">Tu entrenador gestionará tu plan de cobro</p>
              </>
            )}
          </div>
        </div>

        {/* Botón portal Stripe */}
        {tieneStripe && (
          <button onClick={abrirPortalStripe} disabled={abriendo}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{background: color, color: 'white'}}>
            {abriendo ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Abriendo...</>
            ) : (
              <>💳 Gestionar método de pago</>
            )}
          </button>
        )}
        {error && <p className="text-xs text-red-600 mt-2 text-center">{error}</p>}
      </div>

      {/* Historial de pagos */}
      {pagos?.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/6 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/6">
            <p className="text-sm font-bold text-[#0A0A0A]">Historial de pagos</p>
          </div>
          {pagos.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-black/6' : ''}`}>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-600 text-lg">✓</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0A0A0A] truncate">{p.concepto || 'Entrenamiento'}</p>
                <p className="text-xs text-[#6B6B6B]">
                  {new Date(p.fecha_pago+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}
                </p>
              </div>
              <p className="text-sm font-bold text-emerald-600 flex-shrink-0">{Number(p.importe).toFixed(0)}€</p>
            </div>
          ))}
        </div>
      )}

      {/* Info si no tiene Stripe */}
      {!tieneStripe && (
        <div className="bg-[#F5F5F0] rounded-2xl p-4 text-center">
          <p className="text-sm text-[#6B6B6B]">Tu entrenador activará el cobro automático cuando lo configure.</p>
          <p className="text-xs text-[#9B9B9B] mt-1">Recibirás un enlace para guardar tu tarjeta.</p>
        </div>
      )}
    </div>
  )
}

// ─── Componente Clases del cliente ───────────────────────────────────────────
function ClasesCliente({ clienteId, entrenadorId, color }) {
  const [clases, setClases] = useState([])
  const [reservas, setReservas] = useState(new Set())
  const [cargando, setCargando] = useState(true)
  const [reservando, setReservando] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!entrenadorId || !clienteId) return
    cargar()
  }, [entrenadorId, clienteId])

  async function cargar() {
    setCargando(true)
    const hoy = new Date().toISOString().split('T')[0]
    const en30 = new Date(Date.now() + 30*864e5).toISOString().split('T')[0]

    const [{ data: cls }, { data: res }] = await Promise.all([
      supabase.from('clases_con_plazas')
        .eq('entrenador_id', entrenadorId)
        .eq('cancelada', false)
        .gte('fecha', hoy)
        .lte('fecha', en30)
        .order('fecha').order('hora'),
      supabase.from('reservas_clase')
        .select('clase_id')
        .eq('cliente_id', clienteId)
        .eq('estado', 'confirmada'),
    ])
    setClases(cls || [])
    setReservas(new Set((res || []).map(r => r.clase_id)))
    setCargando(false)
  }

  async function reservar(claseId) {
    setReservando(claseId)
    const { error } = await supabase.from('reservas_clase').insert({
      clase_id: claseId, cliente_id: clienteId, entrenador_id: entrenadorId, estado: 'confirmada'
    })
    if (!error) {
      setReservas(prev => new Set([...prev, claseId]))
      setToast('✓ Plaza reservada')
    } else {
      setToast('Error al reservar')
    }
    setReservando(null)
    setTimeout(() => setToast(''), 3000)
    await cargar()
  }

  async function cancelar(claseId) {
    setReservando(claseId)
    await supabase.from('reservas_clase')
      .update({ estado: 'cancelada' })
      .eq('clase_id', claseId)
      .eq('cliente_id', clienteId)
    setReservas(prev => { const n = new Set(prev); n.delete(claseId); return n })
    setToast('Reserva cancelada')
    setTimeout(() => setToast(''), 3000)
    setReservando(null)
    await cargar()
  }

  // Agrupar por semana
  const clasesPorDia = clases.reduce((acc, c) => {
    const fecha = c.fecha
    if (!acc[fecha]) acc[fecha] = []
    acc[fecha].push(c)
    return acc
  }, {})

  const TIPO_ICON = { pilates:'🧘', yoga:'🌿', crossfit:'⚡', funcional:'💪', grupo:'👥', otra:'📋' }

  if (cargando) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-7 h-7 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#111] text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-black/6 p-4">
        <p className="text-sm font-bold text-[#0A0A0A] mb-1">Clases disponibles 👥</p>
        <p className="text-xs text-[#9B9B9B]">Próximos 30 días · Pulsa para reservar tu plaza</p>
      </div>

      {Object.keys(clasesPorDia).length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/6 p-10 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold text-[#0A0A0A]">Sin clases próximas</p>
          <p className="text-sm text-[#9B9B9B] mt-1">Tu entrenador publicará las clases disponibles aquí</p>
        </div>
      ) : Object.entries(clasesPorDia).map(([fecha, cls]) => {
        const d = new Date(fecha + 'T12:00')
        const hoy = new Date().toISOString().split('T')[0]
        const manana = new Date(Date.now()+864e5).toISOString().split('T')[0]
        const label = fecha === hoy ? 'Hoy' : fecha === manana ? 'Mañana'
          : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

        return (
          <div key={fecha}>
            <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-2 capitalize">{label}</p>
            <div className="space-y-2">
              {cls.map(c => {
                const yaReservada = reservas.has(c.id)
                const llena = c.plazas_libres <= 0 && !yaReservada
                const listaEspera = c.plazas_libres <= 0 && !yaReservada

                return (
                  <div key={c.id} className={`bg-white rounded-2xl border overflow-hidden ${yaReservada ? 'border-emerald-200' : 'border-black/6'}`}>
                    <div className="flex items-center">
                      {/* Franja de color */}
                      <div className="w-1 self-stretch rounded-l-2xl flex-shrink-0" style={{background: c.color || color}}/>
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{TIPO_ICON[c.tipo] || '👥'}</span>
                              <p className="text-sm font-bold text-[#0A0A0A] truncate">{c.nombre}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[#9B9B9B]">
                              <span>{c.hora?.slice(0,5)}</span>
                              <span>{c.duracion_minutos} min</span>
                              <span className={`font-semibold ${c.plazas_libres <= 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {yaReservada ? '✓ Reservada' : llena ? 'Completa' : `${c.plazas_libres} plaza${c.plazas_libres !== 1 ? 's' : ''}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {yaReservada ? (
                              <button onClick={() => cancelar(c.id)} disabled={reservando === c.id}
                                className="text-xs border border-red-200 text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-all disabled:opacity-40">
                                {reservando === c.id ? '...' : 'Cancelar'}
                              </button>
                            ) : llena ? (
                              <span className="text-xs bg-[#F5F5F0] text-[#9B9B9B] px-3 py-2 rounded-xl font-medium">Llena</span>
                            ) : (
                              <button onClick={() => reservar(c.id)} disabled={reservando === c.id}
                                className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all disabled:opacity-40 active:scale-95"
                                style={{background: color}}>
                                {reservando === c.id ? '...' : 'Reservar'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Hábitos — vista del cliente ──────────────────────────────────────────
function HabitosPortal({ clienteId, color }) {
  const [habitos, setHabitos] = useState([])
  const [registros, setRegistros] = useState({})
  const [cargando, setCargando] = useState(true)
  const [marcando, setMarcando] = useState(null)

  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!clienteId) return
    cargar()
  }, [clienteId])

  async function cargar() {
    setCargando(true)
    const lunes = new Date()
    lunes.setDate(lunes.getDate() - ((lunes.getDay() || 7) - 1))
    const inicioSemana = lunes.toISOString().split('T')[0]

    const [{ data: h }, { data: r }] = await Promise.all([
      supabase.from('habitos').select('*').eq('cliente_id', clienteId).eq('activo', true).order('orden'),
      supabase.from('habitos_registro').select('*').eq('cliente_id', clienteId).gte('fecha', inicioSemana),
    ])
    setHabitos(h || [])
    const mapa = {}
    ;(r || []).forEach(reg => { mapa[`${reg.habito_id}_${reg.fecha}`] = reg })
    setRegistros(mapa)
    setCargando(false)
  }

  async function toggleHabito(habitoId, fecha) {
    setMarcando(habitoId)
    const key = `${habitoId}_${fecha}`
    const yaCompletado = !!registros[key]

    if (yaCompletado) {
      await supabase.from('habitos_registro').delete()
        .eq('habito_id', habitoId).eq('fecha', fecha)
      setRegistros(prev => { const n = {...prev}; delete n[key]; return n })
    } else {
      const { data } = await supabase.from('habitos_registro').insert({
        habito_id: habitoId, cliente_id: clienteId, fecha, completado: true
      }).select().single()
      if (data) setRegistros(prev => ({...prev, [key]: data}))
      // Registrar actividad
      supabase.from('actividad_cliente').insert({
        cliente_id: clienteId, tipo: 'habito_completado',
        descripcion: `Hábito completado: ${habitos.find(h => h.id === habitoId)?.nombre}`
      }).catch(() => {})
    }
    setMarcando(null)
  }

  // Días de la semana actual
  const diasSemana = Array.from({length: 7}, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() || 7) - 1) + i)
    return d.toISOString().split('T')[0]
  })
  const DIAS_LABEL = ['L','M','X','J','V','S','D']

  if (cargando) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-3 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  if (habitos.length === 0) return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">🎯</p>
      <p className="font-bold text-[#0A0A0A]">Sin hábitos asignados</p>
      <p className="text-sm text-[#9B9B9B] mt-1 leading-relaxed max-w-xs mx-auto">
        Tu entrenador te asignará hábitos diarios para trabajar fuera del entreno.
      </p>
    </div>
  )

  // Calcular racha y % semana
  const completadosHoy = habitos.filter(h => registros[`${h.id}_${hoy}`]).length
  const totalSemana = habitos.reduce((sum, h) => {
    return sum + diasSemana.filter(d => registros[`${h.id}_${d}`]).length
  }, 0)
  const maxSemana = habitos.length * 7

  return (
    <div className="space-y-4">
      {/* Resumen semana */}
      <div className="rounded-2xl p-4" style={{background:`${color}12`, border:`1px solid ${color}30`}}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[#0A0A0A]">Esta semana</p>
          <p className="text-sm font-bold" style={{color}}>{totalSemana}/{maxSemana}</p>
        </div>
        <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{width:`${maxSemana > 0 ? (totalSemana/maxSemana)*100 : 0}%`, background:color}}/>
        </div>
        <p className="text-xs text-[#9B9B9B] mt-1.5">
          Hoy: {completadosHoy}/{habitos.length} hábitos completados
        </p>
      </div>

      {/* Lista de hábitos */}
      <div className="space-y-3">
        {habitos.map(h => {
          const completadoHoy = !!registros[`${h.id}_${hoy}`]
          const completadosSemana = diasSemana.filter(d => registros[`${h.id}_${d}`]).length

          return (
            <div key={h.id} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <span className="text-2xl flex-shrink-0">{h.icono}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0A0A0A]">{h.nombre}</p>
                  {h.descripcion && <p className="text-xs text-[#9B9B9B] mt-0.5">{h.descripcion}</p>}
                  <p className="text-xs text-[#9B9B9B] mt-1">{completadosSemana}/7 días esta semana</p>
                </div>
                {/* Botón de hoy */}
                <button
                  onClick={() => toggleHabito(h.id, hoy)}
                  disabled={marcando === h.id}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0 ${
                    completadoHoy
                      ? 'text-white text-xl'
                      : 'border-2 text-2xl'
                  } ${marcando === h.id ? 'opacity-50' : ''}`}
                  style={completadoHoy
                    ? {background: color}
                    : {borderColor: `${color}40`}
                  }>
                  {completadoHoy ? '✓' : h.icono}
                </button>
              </div>

              {/* Mini calendario semana */}
              <div className="px-4 pb-3 flex gap-1.5">
                {diasSemana.map((dia, i) => {
                  const completado = !!registros[`${h.id}_${dia}`]
                  const esHoy = dia === hoy
                  const esFuturo = dia > hoy
                  return (
                    <button
                      key={dia}
                      onClick={() => !esFuturo && toggleHabito(h.id, dia)}
                      disabled={esFuturo || marcando === h.id}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all ${
                        esFuturo ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                      } ${esHoy ? 'ring-1' : ''}`}
                      style={esHoy ? {ringColor: color} : {}}>
                      <span className="text-[10px] text-[#9B9B9B] font-medium">{DIAS_LABEL[i]}</span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all ${
                        completado ? 'text-white' : 'bg-black/5'
                      }`}
                        style={completado ? {background: color} : {}}>
                        {completado ? '✓' : ''}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Agenda de la semana del cliente ──────────────────────────────────────
// ─── Agenda del cliente — vista semana y mes ──────────────────────────────
function AgendaSemana({ clienteId, sesionesPortal, color, cliente, cancelando, setCancelando, motivoCancel, setMotivoCancel, onCancelada }) {
  const [vista, setVista] = useState('semana') // 'semana' | 'mes'
  const [offset, setOffset] = useState(0)
  const [sesionesExtra, setSesionesExtra] = useState(null)

  const hoy = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]

  // ── Cálculos de rango ──────────────────────────────────────────────────
  function getRango() {
    if (vista === 'semana') {
      const lunes = new Date(hoy)
      lunes.setDate(hoy.getDate() - ((hoy.getDay() || 7) - 1) + offset * 7)
      const dias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(lunes)
        d.setDate(lunes.getDate() + i)
        return d
      })
      return { desde: dias[0], hasta: dias[6], dias }
    } else {
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1)
      const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + offset + 1, 0)
      const dias = []
      const d = new Date(primerDia)
      while (d <= ultimoDia) { dias.push(new Date(d)); d.setDate(d.getDate() + 1) }
      return { desde: primerDia, hasta: ultimoDia, dias, primerDia }
    }
  }

  const rango = getRango()
  const desdeStr = rango.desde.toISOString().split('T')[0]
  const hastaStr = rango.hasta.toISOString().split('T')[0]

  useEffect(() => {
    const esActual = offset === 0
    if (esActual && sesionesPortal) { setSesionesExtra(null); return }
    supabase.from('sesiones').select('*')
      .eq('cliente_id', clienteId)
      .gte('fecha', desdeStr).lte('fecha', hastaStr)
      .eq('cancelada', false)
      .order('fecha').order('hora')
      .then(({ data }) => setSesionesExtra(data || []))
  }, [offset, vista])

  const sesiones = sesionesExtra !== null ? sesionesExtra : (sesionesPortal || [])
  const porFecha = {}
  sesiones.forEach(s => { if (!porFecha[s.fecha]) porFecha[s.fecha] = []; porFecha[s.fecha].push(s) })

  const DIAS_CORTO = ['L','M','X','J','V','S','D']
  const DIAS_LARGO = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

  // Título del periodo
  const titulo = vista === 'semana'
    ? offset === 0 ? 'Esta semana'
      : offset === 1 ? 'Próxima semana'
      : offset === -1 ? 'Semana pasada'
      : `${rango.dias[0].getDate()} ${MESES_CORTO[rango.dias[0].getMonth()]} — ${rango.dias[6].getDate()} ${MESES_CORTO[rango.dias[6].getMonth()]}`
    : offset === 0 ? 'Este mes'
      : MESES[rango.primerDia.getMonth()] + ' ' + rango.primerDia.getFullYear()

  return (
    <div className="space-y-3">
      {/* Selector vista + navegación */}
      <div className="flex items-center gap-2">
        <button onClick={() => setOffset(v => v - 1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-black/10 text-[#6B6B6B] hover:bg-[#F5F5F0] active:scale-95 transition-all flex-shrink-0">
          ←
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold text-[#0A0A0A]">{titulo}</p>
        </div>
        <button onClick={() => setOffset(v => v + 1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-black/10 text-[#6B6B6B] hover:bg-[#F5F5F0] active:scale-95 transition-all flex-shrink-0">
          →
        </button>
      </div>

      {/* Toggle semana/mes */}
      <div className="flex gap-1 bg-black/5 p-1 rounded-xl">
        {[['semana','Semana'],['mes','Mes']].map(([v,l]) => (
          <button key={v} onClick={() => { setVista(v); setOffset(0) }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${vista===v?'bg-white text-[#0A0A0A] shadow-sm':'text-[#6B6B6B]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── VISTA SEMANA ── */}
      {vista === 'semana' && (
        <div className="space-y-2">
          {rango.dias.map((dia, i) => {
            const fechaStr = dia.toISOString().split('T')[0]
            const esHoy = fechaStr === hoyStr
            const esPasado = fechaStr < hoyStr
            const sess = porFecha[fechaStr] || []

            return (
              <div key={fechaStr}
                className={`rounded-2xl border overflow-hidden ${esHoy ? '' : 'border-black/5'}`}
                style={{
                  background: esHoy ? `${color}08` : 'white',
                  borderColor: esHoy ? `${color}40` : undefined
                }}>
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold w-7" style={{color: esHoy ? color : '#9B9B9B'}}>
                      {DIAS_LARGO[i]}
                    </span>
                    <span className={`text-sm font-bold ${esHoy ? 'text-[#0A0A0A]' : esPasado ? 'text-[#C0C0C0]' : 'text-[#6B6B6B]'}`}>
                      {dia.getDate()}
                    </span>
                    {esHoy && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                        style={{background: color}}>Hoy</span>
                    )}
                  </div>
                  {sess.length > 0 && (
                    <span className="text-xs font-semibold" style={{color}}>
                      {sess.length} sesión{sess.length > 1 ? 'es' : ''}
                    </span>
                  )}
                </div>
                {sess.length > 0 ? (
                  <div className="divide-y divide-black/4">
                    {sess.map(s => (
                      <div key={s.id} className="px-4 py-2.5 flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full flex-shrink-0"
                          style={{background: s.completada ? '#10b981' : color}}/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0A0A0A]">
                            {s.tipo === 'online' ? 'Entreno online'
                              : s.tipo === 'grupo' ? 'Entreno en grupo'
                              : 'Entrenamiento personal'}
                          </p>
                          <p className="text-xs text-[#9B9B9B]">
                            {s.hora ? s.hora.slice(0,5) : ''}
                            {s.duracion_minutos ? ` · ${s.duracion_minutos}min` : ''}
                            {s.completada ? ' · ✓ Completado' : ''}
                          </p>
                        </div>
                        {!s.completada && new Date(s.fecha + 'T23:59') > new Date() && setCancelando && (
                          <button onClick={() => setCancelando(s)}
                            className="text-xs text-[#C0C0C0] hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 transition-all flex-shrink-0">
                            Cancelar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 pb-2.5">
                    <p className="text-xs text-[#E0E0E0]">Sin sesiones</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── VISTA MES ── */}
      {vista === 'mes' && (
        <div>
          {/* Cabecera días */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS_CORTO.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-[#9B9B9B] py-1">{d}</div>
            ))}
          </div>

          {/* Grid del mes */}
          {(() => {
            const primerDia = rango.primerDia
            const diasOffset = (primerDia.getDay() || 7) - 1 // lunes = 0
            const totalDias = rango.dias.length
            const celdas = diasOffset + totalDias
            const filas = Math.ceil(celdas / 7)

            return Array.from({ length: filas }, (_, fila) => (
              <div key={fila} className="grid grid-cols-7 gap-1 mb-1">
                {Array.from({ length: 7 }, (_, col) => {
                  const idx = fila * 7 + col
                  const diaIdx = idx - diasOffset
                  if (diaIdx < 0 || diaIdx >= totalDias) {
                    return <div key={col} className="aspect-square"/>
                  }
                  const dia = rango.dias[diaIdx]
                  const fechaStr = dia.toISOString().split('T')[0]
                  const esHoy = fechaStr === hoyStr
                  const esPasado = fechaStr < hoyStr
                  const sess = porFecha[fechaStr] || []
                  const tieneSesion = sess.length > 0

                  return (
                    <div key={col}
                      className="aspect-square rounded-xl flex flex-col items-center justify-center relative"
                      style={{
                        background: esHoy ? color : tieneSesion ? `${color}15` : 'transparent',
                      }}>
                      <span className={`text-xs font-bold ${esHoy ? 'text-white' : esPasado ? 'text-[#C0C0C0]' : tieneSesion ? 'text-[#0A0A0A]' : 'text-[#6B6B6B]'}`}>
                        {dia.getDate()}
                      </span>
                      {tieneSesion && !esHoy && (
                        <div className="w-1 h-1 rounded-full mt-0.5" style={{background: color}}/>
                      )}
                      {tieneSesion && esHoy && (
                        <div className="w-1 h-1 rounded-full mt-0.5 bg-white/60"/>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          })()}

          {/* Lista de sesiones del mes */}
          {sesiones.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wide mb-2">
                {sesiones.length} sesión{sesiones.length > 1 ? 'es' : ''} este mes
              </p>
              {sesiones.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl border border-black/5 px-3 py-2.5">
                  <div className="w-1 h-8 rounded-full flex-shrink-0"
                    style={{background: s.completada ? '#10b981' : color}}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0A0A0A]">
                      {new Date(s.fecha + 'T12:00').toLocaleDateString('es-ES', {weekday:'short', day:'numeric', month:'short'})}
                      {s.hora ? ' · ' + s.hora.slice(0,5) : ''}
                    </p>
                    <p className="text-xs text-[#9B9B9B]">
                      {s.tipo === 'online' ? 'Entreno online' : s.tipo === 'grupo' ? 'Grupo' : 'Personal'}
                      {s.completada ? ' · ✓' : ''}
                    </p>
                  </div>
                  {!s.completada && new Date(s.fecha + 'T23:59') > new Date() && setCancelando && (
                    <button onClick={() => setCancelando(s)}
                      className="text-xs text-[#C0C0C0] hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 transition-all flex-shrink-0">
                      Cancelar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {sesiones.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-[#0A0A0A]">Sin sesiones este mes</p>
              <p className="text-xs text-[#9B9B9B] mt-1">Tu entrenador añadirá tus próximas sesiones</p>
            </div>
          )}
        </div>
      )}

      {/* Resumen semana */}
      {vista === 'semana' && sesiones.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            [sesiones.length, 'Total', '#0A0A0A'],
            [sesiones.filter(s => s.completada).length, 'Completadas', '#10b981'],
            [sesiones.filter(s => !s.completada).length, 'Pendientes', color],
          ].map(([n, l, c]) => (
            <div key={l} className="bg-white rounded-2xl border border-black/5 p-3 text-center">
              <p className="text-xl font-bold" style={{color: c}}>{n}</p>
              <p className="text-xs text-[#9B9B9B] mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal cancelar sesión */}
      {cancelando && setCancelando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => { setCancelando(null); setMotivoCancel && setMotivoCancel('') }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[#0A0A0A] text-lg mb-1">¿Cancelar sesión?</h3>
            <p className="text-sm text-[#6B6B6B] mb-4">
              {new Date(cancelando.fecha + 'T12:00').toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'})}
              {cancelando.hora ? ' · ' + cancelando.hora.slice(0,5) : ''}
            </p>
            <textarea
              value={motivoCancel || ''}
              onChange={e => setMotivoCancel && setMotivoCancel(e.target.value)}
              rows={2}
              placeholder="Motivo (opcional)"
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none mb-3 resize-none"/>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5 mb-4">
              ⚠ Tu entrenador recibirá una notificación
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setCancelando(null); setMotivoCancel && setMotivoCancel('') }}
                className="flex-1 border border-black/10 text-sm py-3 rounded-xl text-[#6B6B6B] font-medium">
                Volver
              </button>
              <button
                onClick={async () => {
                  await supabase.functions.invoke('portal-accion', {
                    body: { accion: 'cancelar_sesion', datos: { sesion_id: cancelando.id, motivo: motivoCancel || '' } }
                  })
                  onCancelada && onCancelada(cancelando.id)
                  setCancelando(null)
                  setMotivoCancel && setMotivoCancel('')
                }}
                className="flex-1 text-white text-sm font-semibold py-3 rounded-xl bg-red-500">
                Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Centro de mando del día ──────────────────────────────────────────────
function TarjetasHoy({
  cliente, color, checkins, rutina, planNutricion, sesionesPortal,
  pendientesValorar, tareasExtra, fotos, marcas, puedeVerNutricion,
  tieneCuestNutricion, clienteId, setTab, setSubTabProgreso,
  configEntrenador, mostrarToast, abrirRegistroSesion,
  valorando, setValorando, setSesionesPortal
}) {
  const hoy = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]
  const nombre = cliente?.nombre?.split(' ')[0] || ''

  // Sesión de hoy
  const sesionHoy = sesionesPortal.find(s => s.fecha === hoyStr && !s.completada)
  // Próxima sesión futura
  const proximaSesion = sesionesPortal.find(s => s.fecha > hoyStr)
  // Días sin check-in
  const diasSinCheckin = checkins[0]?.fecha
    ? Math.floor((Date.now() - new Date(checkins[0].fecha).getTime()) / 864e5)
    : 999
  const checkinUrgente = diasSinCheckin >= 7
  const checkinHecho = diasSinCheckin < 7

  // Sesión pendiente de valorar
  const sesionPendiente = pendientesValorar[0]

  // Día de rutina que toca hoy (por día de semana)
  const diasSemana = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const diaHoy = diasSemana[hoy.getDay()]
  const diasRutina = rutina?.borrador?.dias || rutina?.contenido?.dias || []
  const rutinaHoy = diasRutina.find(d =>
    d.nombre?.toLowerCase().includes(diaHoy) ||
    d.dia?.toLowerCase().includes(diaHoy)
  ) || (sesionHoy && diasRutina[0]) // fallback: primer día si hay sesión hoy

  // Último peso
  const ultimoPeso = checkins.find(c => c.peso)?.peso
  const primerPeso = [...checkins].reverse().find(c => c.peso)?.peso
  const diffPeso = ultimoPeso && primerPeso ? +(ultimoPeso - primerPeso).toFixed(1) : null
  const bajando = diffPeso !== null && diffPeso < 0

  // Streak de sesiones (últimas 4 semanas)
  const haceN = (n) => new Date(Date.now() - n * 864e5).toISOString().split('T')[0]
  const sesionesUltimas4 = checkins.filter(c => c.fecha >= haceN(28)).length

  const DIAS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

  // ── Saludo dinámico ───────────────────────────────────────────────────
  const horaActual = hoy.getHours()
  const saludo = horaActual < 13 ? '☀️ Buenos días' : horaActual < 20 ? '👋 Buenas tardes' : '🌙 Buenas noches'

  return (
    <div className="space-y-3 pb-4">

      {/* ── Cabecera — saludo + fecha ── */}
      <div className="pt-1 pb-2">
        <p className="text-xs text-[#9B9B9B]">{saludo}</p>
        <p className="text-2xl font-bold text-[#0A0A0A] mt-0.5">{nombre} 👊</p>
        <p className="text-xs text-[#9B9B9B] mt-1">
          {DIAS_ES[hoy.getDay()]} {hoy.getDate()} {MESES_ES[hoy.getMonth()]}
          {configEntrenador?.nombre_negocio ? ` · ${configEntrenador.nombre_negocio}` : ''}
        </p>
      </div>

      {/* ── 1. CUESTIONARIO NUTRICIÓN URGENTE ── */}
      {puedeVerNutricion && !planNutricion && !tieneCuestNutricion && (
        <a href={`https://forge-studio-os.vercel.app/nutricion-cuest?e=${cliente.entrenador_id}&c=${cliente.id}`}
          className="flex items-center gap-3 bg-emerald-500 rounded-2xl p-4 active:scale-95 transition-all">
          <span className="text-2xl flex-shrink-0">🥗</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Rellena tu cuestionario de nutrición</p>
            <p className="text-xs text-white/70 mt-0.5">Tu entrenador lo necesita para crear tu plan</p>
          </div>
          <span className="text-white/70 flex-shrink-0">→</span>
        </a>
      )}

      {/* ── 2. SESIÓN PENDIENTE DE VALORAR ── */}
      {sesionPendiente && !valorando && (
        <button onClick={() => setValorando(sesionPendiente)}
          className="w-full flex items-center gap-3 rounded-2xl p-4 border-2 active:scale-95 transition-all text-left"
          style={{borderColor: color, background: `${color}08`}}>
          <span className="text-2xl flex-shrink-0">⭐</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A0A0A]">¿Cómo fue tu sesión del {new Date(sesionPendiente.fecha + 'T12:00').toLocaleDateString('es-ES', {weekday:'long'})}?</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">Tarda 10 segundos · Ayuda a tu entrenador</p>
          </div>
          <span className="text-sm font-bold flex-shrink-0" style={{color}}>Valorar →</span>
        </button>
      )}

      {/* ── 3. SESIÓN DE HOY ── */}
      {sesionHoy && (
        <div className="rounded-2xl overflow-hidden border border-black/5"
          style={{background: `linear-gradient(135deg, ${color}, ${color}cc)`}}>
          <div className="px-4 pt-4 pb-3">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Hoy toca</p>
            <p className="text-white font-bold text-lg">
              {sesionHoy.tipo === 'online' ? 'Entrenamiento online'
                : sesionHoy.tipo === 'grupo' ? 'Entrenamiento en grupo'
                : 'Entrenamiento personal'}
            </p>
            {sesionHoy.hora && (
              <p className="text-white/70 text-sm mt-0.5">🕐 {sesionHoy.hora.slice(0,5)}{sesionHoy.duracion_minutos ? ` · ${sesionHoy.duracion_minutos}min` : ''}</p>
            )}
          </div>
          {rutinaHoy && (
            <div className="px-4 py-3 bg-black/10 flex items-center justify-between">
              <div>
                <p className="text-white/60 text-xs">Rutina del día</p>
                <p className="text-white text-sm font-semibold">{rutinaHoy.nombre || rutinaHoy.dia}</p>
                <p className="text-white/60 text-xs mt-0.5">{(rutinaHoy.ejercicios||[]).length} ejercicios</p>
              </div>
              <button
                onClick={() => abrirRegistroSesion(rutinaHoy)}
                className="bg-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95 transition-all"
                style={{color}}>
                ✓ Registrar
              </button>
            </div>
          )}
          {!rutinaHoy && (
            <div className="px-4 py-3 bg-black/10">
              <button onClick={() => setTab('agenda')}
                className="text-white/80 text-xs font-medium">Ver agenda →</button>
            </div>
          )}
        </div>
      )}

      {/* ── 4. CHECK-IN SEMANAL ── */}
      {checkinUrgente && (
        <a href={`https://forge-studio-os.vercel.app/seguimiento?c=${clienteId}`}
          className="flex items-center gap-3 bg-red-500 rounded-2xl p-4 active:scale-95 transition-all animate-pulse">
          <span className="text-2xl flex-shrink-0">⏰</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">
              {diasSinCheckin > 900 ? 'Haz tu primer check-in' : `${diasSinCheckin} días sin check-in`}
            </p>
            <p className="text-xs text-white/70 mt-0.5">Tu entrenador necesita saber cómo estás</p>
          </div>
          <span className="text-white/70">→</span>
        </a>
      )}

      {/* ── 5. PROGRESO — gráfica motivacional ── */}
      {checkins.length >= 2 && (() => {
        const pesos = checkins.filter(c => c.peso).slice().reverse()
        return (
          <button onClick={() => setTab('progreso')}
            className="w-full bg-white rounded-2xl border border-black/5 p-4 text-left active:scale-95 transition-all hover:shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Tu progreso</p>
                {diffPeso !== null && (
                  <p className="text-2xl font-bold mt-0.5" style={{color: bajando ? '#10b981' : '#6366f1'}}>
                    {bajando ? '' : '+'}{diffPeso} kg
                  </p>
                )}
                <p className="text-xs text-[#9B9B9B] mt-0.5">
                  {checkins.length} check-ins · último hace {diasSinCheckin === 0 ? 'hoy' : `${diasSinCheckin}d`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {checkinHecho && (
                  <span className="text-xs bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-full">✓ Al día</span>
                )}
                <span className="text-[#9B9B9B] text-sm ml-1">→</span>
              </div>
            </div>
            {/* Mini gráfica */}
            {pesos.length > 1 && (
              <div className="flex items-end gap-1 h-12">
                {pesos.slice(-8).map((c, i, arr) => {
                  const min = Math.min(...arr.map(x => x.peso))
                  const max = Math.max(...arr.map(x => x.peso))
                  const h = max === min ? 60 : ((c.peso - min) / (max - min)) * 65 + 35
                  const isLast = i === arr.length - 1
                  return (
                    <div key={c.id || i} className="flex-1 rounded-sm transition-all"
                      style={{height: `${h}%`, background: isLast ? color : `${color}30`}}/>
                  )
                })}
              </div>
            )}
            {pesos.length > 1 && (
              <div className="flex justify-between mt-1.5">
                <p className="text-xs text-[#9B9B9B]">{pesos[0].peso}kg</p>
                <p className="text-xs font-bold" style={{color}}>{pesos[pesos.length-1].peso}kg</p>
              </div>
            )}
          </button>
        )
      })()}

      {/* ── 6. PRÓXIMA SESIÓN (si no hay hoy) ── */}
      {!sesionHoy && proximaSesion && (
        <button onClick={() => setTab('agenda')}
          className="w-full flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-4 text-left active:scale-95 transition-all hover:shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background: `${color}15`}}>
            <span className="text-lg">📅</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#9B9B9B]">Próxima sesión</p>
            <p className="text-sm font-bold text-[#0A0A0A]">
              {new Date(proximaSesion.fecha + 'T12:00').toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'short'})}
              {proximaSesion.hora ? ' · ' + proximaSesion.hora.slice(0,5) : ''}
            </p>
          </div>
          <span className="text-[#9B9B9B] text-sm">→</span>
        </button>
      )}

      {/* ── 7. PLAN ACTIVO — rutina + nutrición ── */}
      {(rutina || planNutricion) && (
        <div className="grid grid-cols-2 gap-2">
          {rutina && (
            <button onClick={() => setTab('rutina')}
              className="bg-white border border-black/5 rounded-2xl p-4 text-left active:scale-95 transition-all hover:shadow-sm">
              <span className="text-xl mb-2 block">💪</span>
              <p className="text-xs font-bold text-[#0A0A0A] leading-tight">{rutina.nombre || 'Tu rutina'}</p>
              <p className="text-xs text-[#9B9B9B] mt-1">{diasRutina.length} días</p>
            </button>
          )}
          {planNutricion && (
            <button onClick={() => setTab('nutricion')}
              className="bg-white border border-black/5 rounded-2xl p-4 text-left active:scale-95 transition-all hover:shadow-sm">
              <span className="text-xl mb-2 block">🥗</span>
              <p className="text-xs font-bold text-[#0A0A0A] leading-tight">{planNutricion.nombre || 'Tu nutrición'}</p>
              <p className="text-xs text-[#9B9B9B] mt-1">{planNutricion.calorias_dia ? `${planNutricion.calorias_dia} kcal` : 'Ver plan'}</p>
            </button>
          )}
        </div>
      )}

      {/* ── 8. MARCAS PERSONALES — si hay ── */}
      {marcas.length > 0 && (
        <button onClick={() => { setTab('progreso'); setSubTabProgreso && setSubTabProgreso('marcas') }}
          className="w-full bg-white border border-black/5 rounded-2xl p-4 text-left active:scale-95 transition-all hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">🏆 Marcas personales</p>
            <span className="text-[#9B9B9B] text-sm">→</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {marcas.slice(0, 4).map((m, i) => (
              <div key={i} className="flex-shrink-0 bg-[#F7F6F3] rounded-xl px-3 py-2">
                <p className="text-xs text-[#9B9B9B] truncate max-w-24">{m.ejercicio}</p>
                <p className="text-sm font-bold text-[#0A0A0A]">{m.peso_kg}kg</p>
              </div>
            ))}
          </div>
        </button>
      )}

      {/* ── 9. TRABAJO EXTRA — presencial ── */}
      {cliente?.tipo === 'presencial' && tareasExtra.length > 0 && (
        <div className="bg-white border border-black/5 rounded-2xl p-4">
          <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider mb-3">💡 Tu trabajo extra</p>
          <div className="space-y-2">
            {tareasExtra.map(t => (
              <div key={t.id} className="flex items-center gap-3 bg-[#F7F6F3] rounded-xl px-3 py-2.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background: color}}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A]">{t.texto}</p>
                  {t.frecuencia && <p className="text-xs text-[#9B9B9B]">{t.frecuencia}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 10. ESTADO VACÍO — cliente nuevo ── */}
      {!sesionHoy && !proximaSesion && !rutina && !planNutricion && checkins.length === 0 && (
        <div className="text-center py-10">
          <p className="text-5xl mb-3">🚀</p>
          <p className="text-sm font-bold text-[#0A0A0A]">¡Bienvenido a tu portal!</p>
          <p className="text-xs text-[#9B9B9B] mt-1 leading-relaxed max-w-xs mx-auto">
            Tu entrenador está preparando tu plan. En breve tendrás aquí tu rutina, tus sesiones y tu progreso.
          </p>
        </div>
      )}

      {/* ── 11. AVISO FOTO PROGRESO ── */}
      {(rutina || planNutricion) && (() => {
        const diasSinFoto = fotos[0]?.fecha
          ? Math.floor((Date.now() - new Date(fotos[0].fecha + 'T12:00').getTime()) / 864e5)
          : 999
        if (diasSinFoto < 30) return null
        return (
          <button onClick={() => { setTab('progreso'); setSubTabProgreso && setSubTabProgreso('fotos') }}
            className="w-full flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 active:scale-95 transition-all text-left">
            <span className="text-lg flex-shrink-0">📸</span>
            <p className="text-xs text-amber-700 flex-1 leading-relaxed">
              {diasSinFoto > 900 ? 'Aún no has subido fotos de progreso' : `${diasSinFoto} días sin fotos de progreso`}
              {' '}— ayuda a ver los cambios reales
            </p>
            <span className="text-amber-600 text-xs font-bold flex-shrink-0">Subir →</span>
          </button>
        )
      })()}

      {/* ── 12. CHECK-IN AL DÍA — motivación ── */}
      {!checkinUrgente && checkins.length > 0 && (
        <div className="flex items-center gap-3 bg-white border border-black/5 rounded-2xl px-4 py-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm">✓</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#0A0A0A]">Check-in al día</p>
            <p className="text-xs text-[#9B9B9B]">Último hace {diasSinCheckin === 0 ? 'hoy' : `${diasSinCheckin} días`} · {sesionesUltimas4} sesiones este mes</p>
          </div>
          <a href={`https://forge-studio-os.vercel.app/seguimiento?c=${clienteId}`}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
            style={{background: color}}>
            Nuevo
          </a>
        </div>
      )}

    </div>
  )
}
