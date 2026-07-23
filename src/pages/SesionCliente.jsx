import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function CronometroMetCon({ ej, ejIdx, datosCardio, updateCardio }) {
  const nombreLow = ej.ejercicio_nombre?.toLowerCase() || ''
  const esAMRAP = nombreLow.includes('amrap')
  const esEMOM = nombreLow.includes('emom')
  const esTabata = nombreLow.includes('tabata')
  const esPorTiempo = !esAMRAP && !esEMOM && !esTabata
  const minMatch = ej.ejercicio_nombre?.match(/(\d+)\s*min/i)
  // Tabata: 8 rondas × (20s trabajo + 10s descanso) = 4 min por defecto
  const durMin = esTabata ? 4 : (minMatch ? parseInt(minMatch[1]) : (esAMRAP ? 12 : esEMOM ? 16 : 0))
  const durSeg = esTabata ? 240 : durMin * 60
  const [seg, setSeg] = useState(esPorTiempo ? 0 : durSeg)
  const [activo, setActivo] = useState(false)
  const [cuentaAtras, setCuentaAtras] = useState(null)
  // Estado Tabata
  const [tabataFase, setTabataFase] = useState('trabajo') // trabajo | descanso
  const [tabataRonda, setTabataRonda] = useState(1)
  const [tabataSeg, setTabataSeg] = useState(20) // 20s trabajo, 10s descanso // 3, 2, 1 o null
  const intervalRef = useRef(null)
  const audioCtx = useRef(null)

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current) } }, [])

  // Crear AudioContext bajo demanda (requiere gesto del usuario)
  function getAudio() {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioCtx.current
  }

  function beep(frecuencia = 880, duracion = 0.15, volumen = 0.5) {
    try {
      const ctx = getAudio()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = frecuencia
      osc.type = 'sine'
      gain.gain.setValueAtTime(volumen, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracion)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duracion)
    } catch(e) {}
  }

  function beepFin() {
    // 3 pitidos largos al terminar
    try {
      const ctx = getAudio()
      ;[0, 0.4, 0.8].forEach(delay => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 660
        gain.gain.setValueAtTime(0.6, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + 0.3)
      })
    } catch(e) {}
  }

  function fmt(s) {
    const m = Math.floor(Math.abs(s) / 60)
    const ss = Math.abs(s) % 60
    return String(m).padStart(2,'0') + ':' + String(ss).padStart(2,'0')
  }

  function toggle() {
    if (activo) {
      clearInterval(intervalRef.current)
      setActivo(false)
      setCuentaAtras(null)
      if (esPorTiempo) updateCardio(ejIdx, 'tiempo', fmt(seg))
    } else {
      // Inicializar audio con el gesto del usuario
      getAudio()
      beep(660, 0.1)
      setActivo(true)

      if (esTabata) {
        // Tabata: 20s trabajo → 10s descanso × 8 rondas
        // Usar ref para estado mutable en el interval
        const state = { fase: 'trabajo', ronda: 1, seg: 20 }
        setTabataFase('trabajo'); setTabataRonda(1); setTabataSeg(20)
        intervalRef.current = setInterval(() => {
          state.seg -= 1
          if (state.seg <= 0) {
            if (state.fase === 'trabajo') {
              state.fase = 'descanso'; state.seg = 10
              beep(440, 0.2); if (navigator.vibrate) navigator.vibrate(100)
              setTabataFase('descanso')
            } else {
              if (state.ronda >= 8) {
                clearInterval(intervalRef.current); setActivo(false)
                beepFin(); if (navigator.vibrate) navigator.vibrate([300,100,300,100,300])
                return
              }
              state.ronda += 1; state.fase = 'trabajo'; state.seg = 20
              beep(880, 0.25); if (navigator.vibrate) navigator.vibrate([150,50,150])
              setTabataFase('trabajo'); setTabataRonda(state.ronda)
            }
          }
          if (state.seg === 3) { beep(440, 0.08); if (navigator.vibrate) navigator.vibrate(60) }
          setTabataSeg(state.seg)
        }, 1000)
        return
      }
      intervalRef.current = setInterval(() => {
        setSeg(prev => {
          const next = esPorTiempo ? prev + 1 : prev - 1

          // Fin del tiempo
          if (!esPorTiempo && next <= 0) {
            clearInterval(intervalRef.current)
            setActivo(false)
            setCuentaAtras(null)
            beepFin()
            if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
            return 0
          }

          // EMOM: cuenta atrás 3-2-1 antes de cada cambio de minuto
          if (esEMOM) {
            const segEnMinuto = next % 60 // segundos que quedan en el minuto actual
            if (segEnMinuto === 3) { setCuentaAtras(3); beep(440, 0.1); if(navigator.vibrate) navigator.vibrate(80) }
            else if (segEnMinuto === 2) { setCuentaAtras(2); beep(440, 0.1); if(navigator.vibrate) navigator.vibrate(80) }
            else if (segEnMinuto === 1) { setCuentaAtras(1); beep(440, 0.1); if(navigator.vibrate) navigator.vibrate(80) }
            else if (segEnMinuto === 0) {
              setCuentaAtras(null)
              beep(880, 0.25) // pitido agudo = ¡cambia!
              if(navigator.vibrate) navigator.vibrate([150, 50, 150])
            } else {
              setCuentaAtras(null)
            }
          }

          return next
        })
      }, 1000)
    }
  }

  function reset() {
    clearInterval(intervalRef.current)
    setActivo(false)
    setCuentaAtras(null)
    setSeg(esPorTiempo ? 0 : durSeg)
  }

  const pct = esPorTiempo
    ? (durSeg > 0 ? Math.min((seg / durSeg) * 100, 100) : 0)
    : (durSeg > 0 ? ((durSeg - seg) / durSeg) * 100 : 0)
  const enRojo = !esPorTiempo && seg <= 10 && seg > 0 && activo
  const minutoActual = esEMOM && durSeg > 0 ? Math.floor((durSeg - seg) / 60) + 1 : null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: cuentaAtras ? '#1a0a00' : '#111' }}>
      {/* Cuenta atrás EMOM — ocupa toda la pantalla del bloque */}
      {cuentaAtras && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <p className="text-8xl font-black text-white animate-ping" style={{ color: '#FF5C00' }}>
            {cuentaAtras}
          </p>
        </div>
      )}
      <div className="p-4 text-center relative">
        {/* TABATA */}
        {esTabata ? (
          <div className="p-4 text-center relative">
            <div className={`rounded-xl py-3 mb-3 transition-all ${tabataFase==='trabajo'?'bg-[#FF5C00]':'bg-[#6B6B6B]'}`}>
              <p className="text-white text-xs font-bold uppercase tracking-widest">{tabataFase==='trabajo'?'🔥 TRABAJO':'💤 DESCANSO'}</p>
              <p className="text-white text-5xl font-bold font-mono mt-1">{String(tabataSeg).padStart(2,'0')}s</p>
            </div>
            <div className="flex justify-center gap-1 mb-3">
              {[1,2,3,4,5,6,7,8].map(r=>(
                <div key={r} className={`w-6 h-2 rounded-full transition-all ${r<tabataRonda?'bg-emerald-400':r===tabataRonda?'bg-[#FF5C00]':'bg-white/20'}`}/>
              ))}
            </div>
            <p className="text-white/50 text-xs mb-3">Ronda {tabataRonda} de 8 · 20s trabajo / 10s descanso</p>
          </div>
        ) : (
        <>
        {durSeg > 0 && (
          <div className="h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: pct + '%', background: enRojo ? '#ef4444' : '#FF5C00' }} />
          </div>
        )}

        {/* Cuenta atrás 3-2-1 inline */}
        {cuentaAtras ? (
          <div className="py-2">
            <p className="text-7xl font-black" style={{ color: '#FF5C00' }}>{cuentaAtras}</p>
            <p className="text-white/40 text-sm mt-1">¡Prepárate!</p>
          </div>
        ) : (
          <p className="text-5xl font-bold font-mono tracking-wider mb-1"
            style={{ color: enRojo ? '#ef4444' : 'white' }}>
            {fmt(seg)}
          </p>
        )}

        {esAMRAP && !cuentaAtras && <p className="text-white/30 text-xs mb-2">AMRAP {durMin} min</p>}
        {esEMOM && !cuentaAtras && activo && minutoActual && (
          <p className="text-white/50 text-xs mb-2">Minuto {minutoActual} de {durMin}</p>
        )}
        {esEMOM && !activo && <p className="text-white/30 text-xs mb-2">EMOM {durMin} min · vibra + pitido cada minuto</p>}
        {esPorTiempo && !cuentaAtras && <p className="text-white/30 text-xs mb-2">Tiempo transcurrido</p>}
        </>)}

        <div className="flex gap-2 justify-center mt-2">
          <button onClick={toggle}
            className="px-8 py-3 rounded-xl text-white font-bold text-sm active:scale-95 transition-all"
            style={{ background: activo ? '#6B6B6B' : '#FF5C00' }}>
            {activo ? '⏸ Parar' : esTabata ? '▶ Iniciar Tabata' : '▶ ' + (seg === (esPorTiempo ? 0 : durSeg) ? 'Iniciar' : 'Continuar')}
          </button>
          <button onClick={reset} className="px-4 py-3 rounded-xl text-white/50 border border-white/10 text-sm">↺</button>
        </div>
      </div>
    </div>
  )
}

export default function SesionCliente() {
  const [clienteSession, setClienteSession] = useState(undefined) // undefined=cargando, null=sin sesión, objeto=usuario
  const [clienteId, setClienteId] = useState(null) // derivado de la sesión
  const [cliente, setCliente] = useState(null)
  const [marcasCliente, setMarcasCliente] = useState([])
  const [rutina, setRutina] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enviado, setEnviado] = useState(false)
  const [paso, setPaso] = useState(1)
  const [diaSeleccionado, setDiaSeleccionado] = useState(1)
  const [ejercicios, setEjercicios] = useState([])
  const [rpe, setRpe] = useState(7)
  const [fatiga, setFatiga] = useState(2)
  const [sensaciones, setSensaciones] = useState('')
  const [duracion, setDuracion] = useState(60)
  const [guardando, setGuardando] = useState(false)
  const [datosCardio, setDatosCardio] = useState({}) // { ejIdx: { km, ritmo, fc_media, fc_max, notas } }

  // Tipos de formulario por ejercicio:
  // 'carrera'   → km, ritmo, FC media, FC máxima, notas
  // 'fuerza'    → sets con peso + reps + ✓
  // 'corporal'  → sets con reps + ✓ (sin peso — dominadas, fondos, planchas, core)
  // 'skip'      → sin registro (calentamiento, estiramientos, movilidad)

  function tipoFormulario(ej) {
    const patron = (ej.patron || '').toLowerCase()
    const nombre = (ej.ejercicio_nombre || '').toLowerCase()

    // SKIP — no necesita registro
    if (
      patron.includes('calentamiento') || patron.includes('preparacion') ||
      patron.includes('estiramientos') || patron.includes('movilidad') ||
      nombre.includes('calentamiento') || nombre.includes('estiramientos') ||
      nombre.includes('vuelta a la calma') || nombre.includes('stretching') ||
      nombre.includes('activacion neuromuscular')
    ) return 'skip'

    // METCON — trabajo por tiempo (AMRAP, EMOM, For Time, Chipper, Tabata)
    if (
      nombre.includes('amrap') || nombre.includes('emom') ||
      nombre.includes('chipper') || nombre.includes('por tiempo') ||
      nombre.includes('for time') || nombre.includes('metcon') ||
      nombre.includes('tabata') ||
      patron.includes('metabolico') || patron.includes('metcon') ||
      nombre.includes('finisher')
    ) return 'metcon'

    // CARRERA — datos de running
    if (
      patron.includes('cardio') || patron.includes('carrera') ||
      patron.includes('z2') || patron.includes('interval') || patron.includes('fartlek') ||
      nombre.includes('carrera') || nombre.includes('rodaje') || nombre.includes('fartlek') ||
      nombre.includes('tirada') || nombre.includes('series 400') || nombre.includes('assault bike') ||
      nombre.includes('remo ergometro') || nombre.includes('remo erg')
    ) return 'carrera'

    // CORPORAL — reps sin peso (core, calistenia, peso corporal)
    if (
      patron.includes('core') || patron.includes('antirotacion') ||
      patron.includes('calistenia') || patron.includes('peso corporal') ||
      nombre.includes('plank') || nombre.includes('plancha') || nombre.includes('dead bug') ||
      nombre.includes('bird dog') || nombre.includes('pallof') || nombre.includes('crunch') ||
      nombre.includes('abdominal') || nombre.includes('hollow') || nombre.includes('l-sit') ||
      nombre.includes('muscle up') || nombre.includes('handstand') ||
      (nombre.includes('dominadas') && !nombre.includes('lastrad')) ||
      (nombre.includes('fondos') && !nombre.includes('lastrad')) ||
      (nombre.includes('flexiones') && !nombre.includes('lastrad'))
    ) return 'corporal'

    // FUERZA por defecto — peso + reps
    return 'fuerza'
  }

  function updateCardio(ejIdx, field, val) {
    setDatosCardio(prev => ({ ...prev, [ejIdx]: { ...(prev[ejIdx] || {}), [field]: val } }))
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setClienteSession(session?.user || null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setClienteSession(session?.user || null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (clienteSession === undefined) return
    if (!clienteSession) { setLoading(false); return }
    async function cargar() {
      setLoading(true)
      const { data: cl } = await supabase.from('clientes').select('*').eq('auth_user_id', clienteSession.id).maybeSingle()
      if (!cl) { setLoading(false); return }
      setCliente(cl)
      setClienteId(cl.id)
      const [{ data: ru }, { data: marcas }] = await Promise.all([
        supabase.from('rutinas').select('*').eq('cliente_id', cl.id).eq('estado', 'publicada').order('created_at', { ascending: false }).limit(1),
        supabase.from('marcas_cliente').select('ejercicio, peso_kg').eq('cliente_id', cl.id).order('fecha', { ascending: false })
      ])
      if (ru?.[0]) {
        setRutina(ru[0])
        setMarcasCliente(marcas || [])
        cargarDia(ru[0], 1, cl, marcas || [])
      }
      setLoading(false)
    }
    cargar()
  }, [clienteSession])

  // Tabla de referencia por patrón y nivel (% del peso corporal)
  // % del peso corporal como 1RM estimado por ejercicio y nivel
  // Fuente: estándares de Symmetric Strength y criterio conservador para seguridad
  const REFS_EJERCICIO = {
    // Pierna / rodilla
    'sentadilla':         { principiante: 0.75, intermedio: 1.15, avanzado: 1.50 },
    'sentadilla trasera': { principiante: 0.75, intermedio: 1.15, avanzado: 1.50 },
    'front squat':        { principiante: 0.60, intermedio: 0.95, avanzado: 1.25 },
    'goblet squat':       { principiante: 0.25, intermedio: 0.40, avanzado: 0.55 },
    // Empuje horizontal
    'press banca':        { principiante: 0.60, intermedio: 0.90, avanzado: 1.20 },
    'press inclinado':    { principiante: 0.50, intermedio: 0.75, avanzado: 1.00 },
    'press declinado':    { principiante: 0.60, intermedio: 0.90, avanzado: 1.20 },
    // Empuje vertical
    'press militar':      { principiante: 0.40, intermedio: 0.60, avanzado: 0.80 },
    'push press':         { principiante: 0.50, intermedio: 0.70, avanzado: 0.90 },
    'push jerk':          { principiante: 0.55, intermedio: 0.75, avanzado: 0.95 },
    'press hombro':       { principiante: 0.40, intermedio: 0.60, avanzado: 0.80 },
    // Tirón horizontal
    'remo barra':         { principiante: 0.55, intermedio: 0.85, avanzado: 1.10 },
    'remo':               { principiante: 0.55, intermedio: 0.85, avanzado: 1.10 },
    // Tirón vertical
    'jalón':              { principiante: 0.50, intermedio: 0.75, avanzado: 1.00 },
    // Cadena posterior / bisagra
    'peso muerto sumo':   { principiante: 0.90, intermedio: 1.40, avanzado: 1.80 },
    'peso muerto rumano': { principiante: 0.65, intermedio: 1.00, avanzado: 1.35 },
    'peso muerto':        { principiante: 0.85, intermedio: 1.35, avanzado: 1.75 },
    'hip thrust':         { principiante: 0.65, intermedio: 1.10, avanzado: 1.50 },
    // Olímpicos — requieren técnica: conservador hasta avanzado
    'power clean':        { principiante: 0.40, intermedio: 0.65, avanzado: 0.90 },
    'clean':              { principiante: 0.40, intermedio: 0.65, avanzado: 0.90 },
    'snatch':             { principiante: 0.25, intermedio: 0.45, avanzado: 0.65 },
    'thruster':           { principiante: 0.35, intermedio: 0.55, avanzado: 0.75 },
    // Accesorios / complementarios
    'farmer carry':       { principiante: 0.30, intermedio: 0.50, avanzado: 0.70 },
    'kettlebell swing':   { principiante: 0.18, intermedio: 0.30, avanzado: 0.45 },
    'curl':               { principiante: 0.15, intermedio: 0.25, avanzado: 0.35 },
    'press frances':      { principiante: 0.15, intermedio: 0.25, avanzado: 0.35 },
  }
  // Factor de trabajo por nivel (% del 1RM estimado para entrenar)
  // Principiante: 55-60% | Intermedio: 65-70% | Avanzado: 80-85%
  const FACTOR_TRABAJO = { principiante: 0.575, intermedio: 0.675, avanzado: 0.825 }

  function calcularPesoRecomendado(ej, cliente, marcas) {
    const nombreEj = (ej.nombre || ej.ejercicio_nombre || '').toLowerCase().trim()
    const nivel = cliente?.nivel || 'principiante'
    const pesoCorporal = parseFloat(cliente?.peso_actual) || 75

    // 1. Si tiene marca registrada de este ejercicio → usar 85% de su mejor marca
    const marcaEj = marcas?.find(m => {
      const nm = (m.ejercicio || '').toLowerCase()
      return nm === nombreEj || nombreEj.includes(nm.split(' ')[0]) || nm.includes(nombreEj.split(' ')[0])
    })
    if (marcaEj?.peso_kg > 0) {
      return Math.round(marcaEj.peso_kg * 0.85 / 2.5) * 2.5
    }

    // 2. Buscar en tabla por nombre del ejercicio
    const refKey = Object.keys(REFS_EJERCICIO).find(k =>
      nombreEj === k ||
      nombreEj.includes(k) ||
      k.includes(nombreEj) ||
      nombreEj.split(' ').some(w => w.length > 3 && k.includes(w))
    )
    if (refKey) {
      const pct = REFS_EJERCICIO[refKey][nivel]
      if (!pct) return null
      // % de trabajo según nivel del cliente
      return Math.round(pesoCorporal * pct * FACTOR_TRABAJO[nivel] / 2.5) * 2.5
    }

    return null
  }

  function cargarDia(ru, dia, cl, marcas) {
    const clienteRef = cl !== undefined ? cl : cliente
    const marcasRef = marcas || []
    const contenido = ru.contenido || ru.borrador
    const d = contenido?.dias?.find((x) => x.dia === dia) || contenido?.dias?.[dia - 1]
    if (d?.ejercicios) {
      setEjercicios(d.ejercicios.map((ej) => ({
        ejercicio_nombre: ej.nombre, patron: ej.patron, orden: ej.orden, notas: ej.notas || '',
        peso_recomendado: clienteRef ? calcularPesoRecomendado(ej, clienteRef, marcasRef) : null,
        sets: Array.from({ length: ej.series || 3 }, (_, i) => ({
          set: i + 1,
          peso: clienteRef ? (calcularPesoRecomendado(ej, clienteRef, marcasRef) || '') : '',
          reps: ej.reps || '',
          completado: false
        }))
      })))
    }
  }

  function updateSet(ejIdx, setIdx, field, val) {
    setEjercicios(prev => prev.map((e, i) => i === ejIdx ? {
      ...e, sets: e.sets.map((s, j) => j === setIdx ? { ...s, [field]: val } : s)
    } : e))
  }

  async function guardar() {
    setGuardando(true)
    const { data: sesionData, error: sesionError } = await supabase.from('sesiones').insert({
      entrenador_id: cliente.entrenador_id,
      cliente_id: clienteId,
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'online', completada: true,
      rpe, fatiga_post: fatiga, sensaciones,
      duracion_minutos: duracion, dia_rutina: diaSeleccionado
    }).select('id').single()

    if (!sesionError && sesionData?.id) {
      // Guardar por tipo de formulario
      const insertsEj = []
      ejercicios.forEach((e, i) => {
        const tipo = tipoFormulario(e)
        if (tipo === 'skip') return
        if (tipo === 'carrera' || tipo === 'metcon') {
          const dc = datosCardio[i] || {}
          if (Object.values(dc).some(v => v)) {
            insertsEj.push({
              sesion_id: sesionData.id, cliente_id: clienteId, entrenador_id: cliente.entrenador_id,
              ejercicio_nombre: e.ejercicio_nombre, patron: e.patron, orden: e.orden,
              sets: [{ km: dc.km || null, ritmo: dc.ritmo || null, fc_media: dc.fc_media || null, fc_max: dc.fc_max || null }],
              notas: dc.notas || e.notas
            })
          }
        } else {
          // fuerza o corporal
          if (e.sets.some(s => s.peso || s.completado)) {
            insertsEj.push({
              sesion_id: sesionData.id, cliente_id: clienteId, entrenador_id: cliente.entrenador_id,
              ejercicio_nombre: e.ejercicio_nombre, patron: e.patron, orden: e.orden,
              sets: e.sets, notas: e.notas
            })
          }
        }
      })
      if (insertsEj.length > 0) {
        await supabase.from('sesion_ejercicios').insert(insertsEj)
      }
    }
    setEnviado(true)
    setGuardando(false)
  }

  const Btn = ({ val, field, set }) => {
    const active = field === 'rpe' ? rpe === val : fatiga === val
    const isRed = field === 'fatiga' && val >= 4
    return (
      <button type="button" onClick={() => field === 'rpe' ? setRpe(val) : setFatiga(val)}
        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${active
          ? isRed ? 'bg-red-500 text-white' : 'bg-[#FF5C00] text-white'
          : 'border border-black/10 text-[#6B6B6B]'}`}>
        {val}
      </button>
    )
  }

  if (clienteSession === undefined || loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]"><div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" /></div>
  if (!cliente) return <div className="min-h-screen flex items-center justify-center"><p className="text-[#6B6B6B]">No hemos podido cargar tus datos.</p></div>
  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F0]">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl">💪</div>
        <h2 className="text-2xl font-bold text-[#0A0A0A] mb-2">¡Sesión registrada!</h2>
        <p className="text-[#6B6B6B] text-sm">Tu entrenador ya puede ver tu entrenamiento de hoy.</p>
        <a href="/"
          className="block mt-6 bg-[#FF5C00] text-white font-semibold py-3.5 rounded-2xl text-sm text-center">
          Ver mi portal →
        </a>
        <button onClick={() => { setEnviado(false); setPaso(1) }}
          className="block w-full mt-2 text-center text-xs text-[#6B6B6B] py-2">
          Registrar otra sesión
        </button>
      </div>
    </div>
  )

  const dias = (rutina?.contenido?.dias || rutina?.borrador?.dias || [])

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="bg-[#111] px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto">
          <p className="text-white/50 text-xs mb-1">Forge · Registro de sesión</p>
          <h1 className="text-white font-bold text-lg">{cliente.nombre.split(' ')[0]}</h1>
          <p className="text-white/50 text-xs mt-0.5">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-10 space-y-4">
        {/* Selección de día */}
        {dias.length > 0 && paso === 1 && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
            <p className="text-sm font-bold text-[#0A0A0A] mb-3">¿Qué día de rutina es hoy?</p>
            <div className="space-y-2">
              {dias.map(dia => (
                <button key={dia.dia} type="button" onClick={() => { setDiaSeleccionado(dia.dia); cargarDia(rutina, dia.dia, cliente, marcasCliente) }}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all ${diaSeleccionado === dia.dia ? 'border-[#FF5C00] bg-[#FF5C00]/5' : 'border-black/8 hover:border-black/20'}`}>
                  <p className={`text-sm font-semibold ${diaSeleccionado === dia.dia ? 'text-[#FF5C00]' : 'text-[#0A0A0A]'}`}>{dia.nombre}</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">{dia.ejercicios?.length} ejercicios · {dia.patron_principal}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Duración */}
        {paso === 1 && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
            <p className="text-sm font-bold text-[#0A0A0A] mb-3">Duración: <span className="text-[#FF5C00]">{duracion} min</span></p>
            <div className="flex gap-2 flex-wrap">
              {[30, 45, 60, 75, 90].map(v => (
                <button key={v} type="button" onClick={() => setDuracion(v)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${duracion === v ? 'bg-[#FF5C00] text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                  {v}min
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ejercicios */}
        {paso === 1 && ejercicios.map((ej, ejIdx) => {
          const tipo = tipoFormulario(ej)

          // SKIP — calentamiento y estiramientos no necesitan registro
          if (tipo === 'skip') return (
            <div key={ejIdx} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden opacity-60">
              <div className="bg-[#0A0A0A]/70 px-4 py-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-white/20 text-white rounded-lg text-xs font-bold flex items-center justify-center">{ejIdx + 1}</span>
                <p className="text-white text-sm flex-1">{ej.ejercicio_nombre}</p>
                <span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">Sin registro</span>
              </div>
              {ej.notas && <p className="text-xs text-[#6B6B6B] px-4 py-2">{ej.notas}</p>}
            </div>
          )

          return (
          <div key={ejIdx} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="bg-[#0A0A0A] px-4 py-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#FF5C00] text-white rounded-lg text-xs font-bold flex items-center justify-center">{ejIdx + 1}</span>
              <p className="text-white text-sm font-semibold flex-1">{ej.ejercicio_nombre}</p>
              {tipo === 'fuerza' && ej.peso_recomendado && (
                <span className="text-xs bg-[#FF5C00]/20 text-[#FF5C00] px-2 py-0.5 rounded-full font-medium flex-shrink-0">~{ej.peso_recomendado}kg</span>
              )}
              {tipo === 'metcon' && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">⏱ MetCon</span>}
              {tipo === 'carrera' && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">🏃 Carrera</span>}
              {tipo === 'corporal' && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">💪 Corporal</span>}
            </div>

            {/* METCON — AMRAP / EMOM / Por tiempo / Chipper */}
            {tipo === 'metcon' && (
              <div className="p-4 space-y-3">
                {ej.notas && <p className="text-xs text-[#6B6B6B] italic bg-[#F5F5F0] rounded-xl px-3 py-2">{ej.notas}</p>}
                <CronometroMetCon ej={ej} ejIdx={ejIdx} datosCardio={datosCardio} updateCardio={updateCardio} />
                <div className="grid grid-cols-2 gap-2">
                  {ej.ejercicio_nombre?.toLowerCase().includes('amrap') && <>
                    <div>
                      <label className="text-xs text-[#6B6B6B] mb-1 block">Rondas completadas</label>
                      <input type="number" value={datosCardio[ejIdx]?.rondas || ''}
                        onChange={e => updateCardio(ejIdx, 'rondas', e.target.value)}
                        placeholder="5" className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                    </div>
                    <div>
                      <label className="text-xs text-[#6B6B6B] mb-1 block">Reps ronda extra</label>
                      <input type="number" value={datosCardio[ejIdx]?.reps_extra || ''}
                        onChange={e => updateCardio(ejIdx, 'reps_extra', e.target.value)}
                        placeholder="12" className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                    </div>
                  </>}
                  {ej.ejercicio_nombre?.toLowerCase().includes('emom') && <>
                    <div>
                      <label className="text-xs text-[#6B6B6B] mb-1 block">Minutos completados</label>
                      <input type="number" value={datosCardio[ejIdx]?.minutos || ''}
                        onChange={e => updateCardio(ejIdx, 'minutos', e.target.value)}
                        placeholder="16" className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                    </div>
                    <div>
                      <label className="text-xs text-[#6B6B6B] mb-1 block">¿Fallaste algún minuto?</label>
                      <select value={datosCardio[ejIdx]?.fallo || 'no'}
                        onChange={e => updateCardio(ejIdx, 'fallo', e.target.value)}
                        className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5C00]">
                        <option value="no">No, todo completado</option>
                        <option value="si">Sí, algún minuto</option>
                      </select>
                    </div>
                  </>}
                  {!ej.ejercicio_nombre?.toLowerCase().includes('amrap') && !ej.ejercicio_nombre?.toLowerCase().includes('emom') && (
                    <div className="col-span-2">
                      <label className="text-xs text-[#6B6B6B] mb-1 block">Tiempo total (se rellena al parar)</label>
                      <input type="text" value={datosCardio[ejIdx]?.tiempo || ''}
                        onChange={e => updateCardio(ejIdx, 'tiempo', e.target.value)}
                        placeholder="00:00" className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00] font-mono text-lg" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-[#6B6B6B] mb-1 block">Esfuerzo RPE (1-10)</label>
                    <input type="number" min="1" max="10" value={datosCardio[ejIdx]?.rpe_metcon || ''}
                      onChange={e => updateCardio(ejIdx, 'rpe_metcon', e.target.value)}
                      placeholder="8" className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                  </div>
                  <div>
                    <label className="text-xs text-[#6B6B6B] mb-1 block">Pesos usados</label>
                    <input type="text" value={datosCardio[ejIdx]?.pesos || ''}
                      onChange={e => updateCardio(ejIdx, 'pesos', e.target.value)}
                      placeholder="KB 24kg, barra 60kg" className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5C00]" />
                  </div>
                </div>
                <textarea value={datosCardio[ejIdx]?.notas || ''} rows={2}
                  onChange={e => updateCardio(ejIdx, 'notas', e.target.value)}
                  placeholder="Sensaciones, qué fue bien o mal..."
                  className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5C00] resize-none" />
              </div>
            )}

                        {/* CARRERA */}
            {tipo === 'carrera' && (
              <div className="p-4 space-y-3">
                {ej.notas && <p className="text-xs text-[#6B6B6B] italic">{ej.notas}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[#6B6B6B] mb-1 block">Distancia (km)</label>
                    <input type="number" step="0.1" value={datosCardio[ejIdx]?.km || ''}
                      onChange={e => updateCardio(ejIdx, 'km', e.target.value)}
                      placeholder="8.5" className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                  </div>
                  <div>
                    <label className="text-xs text-[#6B6B6B] mb-1 block">Ritmo (min/km)</label>
                    <input type="text" value={datosCardio[ejIdx]?.ritmo || ''}
                      onChange={e => updateCardio(ejIdx, 'ritmo', e.target.value)}
                      placeholder="5:30" className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                  </div>
                  <div>
                    <label className="text-xs text-[#6B6B6B] mb-1 block">FC media (ppm)</label>
                    <input type="number" value={datosCardio[ejIdx]?.fc_media || ''}
                      onChange={e => updateCardio(ejIdx, 'fc_media', e.target.value)}
                      placeholder="145" className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                  </div>
                  <div>
                    <label className="text-xs text-[#6B6B6B] mb-1 block">FC máxima (ppm)</label>
                    <input type="number" value={datosCardio[ejIdx]?.fc_max || ''}
                      onChange={e => updateCardio(ejIdx, 'fc_max', e.target.value)}
                      placeholder="168" className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                  </div>
                </div>
                <textarea value={datosCardio[ejIdx]?.notas || ''} rows={2}
                  onChange={e => updateCardio(ejIdx, 'notas', e.target.value)}
                  placeholder="Sensaciones, condiciones, molestias..."
                  className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5C00] resize-none" />
              </div>
            )}

            {/* CORPORAL — solo reps, sin peso */}
            {tipo === 'corporal' && (
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-8 gap-2 px-1 mb-1">
                  <p className="col-span-1 text-xs text-[#6B6B6B]">Set</p>
                  <p className="col-span-5 text-xs text-[#6B6B6B]">Repeticiones</p>
                  <p className="col-span-2 text-xs text-[#6B6B6B]">✓</p>
                </div>
                {ej.sets.map((s, setIdx) => (
                  <div key={setIdx} className="grid grid-cols-8 gap-2 items-center">
                    <span className="col-span-1 text-xs font-bold text-[#6B6B6B]">{setIdx + 1}</span>
                    <input value={s.reps} onChange={e => updateSet(ejIdx, setIdx, 'reps', e.target.value)}
                      placeholder={s.reps || '—'} className="col-span-5 border border-black/10 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                    <button type="button" onClick={() => updateSet(ejIdx, setIdx, 'completado', !s.completado)}
                      className={`col-span-2 h-9 rounded-lg text-sm font-bold transition-all ${s.completado ? 'bg-emerald-500 text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                      {s.completado ? '✓' : '○'}
                    </button>
                  </div>
                ))}
                {ej.notas && <p className="text-xs text-[#6B6B6B] italic mt-1 px-1">{ej.notas}</p>}
              </div>
            )}

            {/* FUERZA — peso + reps */}
            {tipo === 'fuerza' && (
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-12 gap-2 px-1 mb-1">
                  <p className="col-span-1 text-xs text-[#6B6B6B]">Set</p>
                  <p className="col-span-5 text-xs text-[#6B6B6B]">Peso (kg)</p>
                  <p className="col-span-4 text-xs text-[#6B6B6B]">Reps</p>
                  <p className="col-span-2 text-xs text-[#6B6B6B]">✓</p>
                </div>
              {ej.sets.map((s, setIdx) => (
                <div key={setIdx} className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-1 text-xs font-bold text-[#6B6B6B]">{setIdx + 1}</span>
                  <input type="number" step="0.5" value={s.peso} onChange={e => updateSet(ejIdx, setIdx, 'peso', e.target.value)}
                    placeholder="—" className="col-span-5 border border-black/10 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                  <input value={s.reps} onChange={e => updateSet(ejIdx, setIdx, 'reps', e.target.value)}
                    placeholder={s.reps || '—'} className="col-span-4 border border-black/10 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-[#FF5C00]" />
                  <button type="button" onClick={() => updateSet(ejIdx, setIdx, 'completado', !s.completado)}
                    className={`col-span-2 h-9 rounded-lg text-sm font-bold transition-all ${s.completado ? 'bg-emerald-500 text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                    {s.completado ? '✓' : '○'}
                  </button>
                </div>
              ))}
              {ej.notas && <p className="text-xs text-[#6B6B6B] italic mt-1 px-1">{ej.notas}</p>}
            </div>
            )}
          </div>
          )
        })}

        {/* Valoración */}
        {paso === 2 && (
          <>
            <div className="bg-[#111] rounded-2xl p-4 text-center">
              <p className="text-white font-bold">¿Cómo fue la sesión?</p>
              <p className="text-white/50 text-xs mt-1">Tu entrenador usará esto para ajustar tu próxima rutina</p>
            </div>
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 space-y-5">
              <div>
                <p className="text-sm font-bold text-[#0A0A0A] mb-1">Esfuerzo percibido (RPE): <span className="text-[#FF5C00]">{rpe}/10</span></p>
                <p className="text-xs text-[#6B6B6B] mb-3">1 = Muy ligero · 10 = Máximo esfuerzo</p>
                <div className="flex gap-1.5 flex-wrap">{[1,2,3,4,5,6,7,8,9,10].map(v => <Btn key={v} val={v} field="rpe" />)}</div>
              </div>
              <div>
                <p className="text-sm font-bold text-[#0A0A0A] mb-1">Fatiga generada: <span className="text-[#FF5C00]">{fatiga}/5</span></p>
                <p className="text-xs text-[#6B6B6B] mb-3">1 = Fresco · 5 = Muy fatigado</p>
                <div className="flex gap-1.5">{[1,2,3,4,5].map(v => <Btn key={v} val={v} field="fatiga" />)}</div>
              </div>
              <div>
                <p className="text-sm font-bold text-[#0A0A0A] mb-1.5">Sensaciones (opcional)</p>
                <textarea value={sensaciones} onChange={e => setSensaciones(e.target.value)} rows={3}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                  placeholder="¿Algún dolor, mejora en peso, algo que destacar?" />
              </div>
            </div>
          </>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          {paso === 2 && (
            <button onClick={() => setPaso(1)} className="flex-1 border border-black/10 text-[#0A0A0A] font-semibold py-4 rounded-2xl text-sm">← Atrás</button>
          )}
          {paso === 1 ? (
            <button onClick={() => setPaso(2)} className="flex-1 bg-[#FF5C00] text-white font-bold py-4 rounded-2xl text-sm active:scale-98 transition-all">
              Valorar sesión →
            </button>
          ) : (
            <button onClick={guardar} disabled={guardando} className="flex-1 bg-[#111] text-white font-bold py-4 rounded-2xl text-sm active:scale-98 transition-all disabled:opacity-50">
              {guardando ? 'Guardando...' : '💪 Guardar sesión'}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-[#6B6B6B]">Forge Studio OS</p>
      </div>
    </div>
  )
}
