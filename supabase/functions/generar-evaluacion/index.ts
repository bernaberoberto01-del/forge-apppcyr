import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

function ejerciciosEvaluacion(cliente: any, cuestionario: any): any[] {
  const nivel = cliente.nivel || 'principiante'
  const tipo = cliente.tipo_entrenamiento || 'fuerza'
  const lesiones = (cliente.lesiones || cuestionario?.lesiones || '').toLowerCase()
  const tieneRodilla = /rodill|condromal|gonalg|menisco/.test(lesiones)
  const tieneHombro = /hombro|manguito|rotat/.test(lesiones)
  const tieneColumna = /lumbar|cervical|hernia/.test(lesiones)

  // Material disponible — leer del cuestionario primero, luego del cliente
  const material = cuestionario?.material || cliente.material || 'gimnasio'
  const sinMaterial = material === 'sin_material'
  const materialBasico = material === 'material_basico' // mancuernas y gomas
  const tieneGimnasio = material === 'gimnasio'

  const base = [
    { orden:1, nombre:'Calentamiento evaluación', patron:'calentamiento', series:1, reps:'8-10 min', descanso:'-',
      notas: sinMaterial
        ? 'Movilidad articular completa: cuello, hombros, cadera, rodillas, tobillos. Jumping jacks suaves 2 min.'
        : 'Movilidad completa + activación. Prepara bien cada articulación antes de testar.' },
  ]

  const tests: any[] = []

  // ── SIN MATERIAL — solo peso corporal ────────────────────────────────────
  if (sinMaterial) {
    // Empuje
    if (!tieneHombro) {
      tests.push({ orden:2, nombre:'Flexiones — Test de fuerza', patron:'fuerza', series:3,
        reps:'máx reps', descanso:'2 min',
        notas:'Máximo de repeticiones con buena técnica (pecho toca suelo, cuerpo recto). Registrar número en Marcas. Si es muy fácil: elevar pies. Si muy difícil: apoyar rodillas.' })
    } else {
      tests.push({ orden:2, nombre:'Flexiones inclinadas — Test (sin carga de hombro)', patron:'fuerza', series:3,
        reps:'máx reps', descanso:'2 min',
        notas:'Manos elevadas (mesa, silla). Reduce presión en el hombro. Registrar máximo.' })
    }

    // Tirón (sin material solo con algo de apoyo)
    tests.push({ orden:3, nombre:'Remo invertido — Test (mesa o barra baja)', patron:'fuerza', series:3,
      reps:'máx reps', descanso:'2 min',
      notas:'Tumbado bajo una mesa resistente, tirar del borde. Si no hay posibilidad: anotar 0 y evaluar en próxima sesión con implemento. Registrar.' })

    // Pierna
    if (!tieneRodilla) {
      tests.push({ orden:4, nombre:'Sentadilla libre — Test de movilidad y fuerza', patron:'fuerza', series:3,
        reps:'20 reps lentas', descanso:'90s',
        notas:'Evaluar profundidad, rodillas sobre punta del pie, talones en suelo. Registrar calidad (buena/mejorable/limitada) y fatiga.' })
      tests.push({ orden:5, nombre:'Zancada estática — Test de equilibrio', patron:'fuerza', series:2,
        reps:'10 por pierna', descanso:'90s',
        notas:'Sin peso. Evaluar equilibrio y movilidad de cadera. Registrar si hay limitación notable.' })
    } else {
      tests.push({ orden:4, nombre:'Sentadilla en silla — Test adaptado', patron:'fuerza', series:3,
        reps:'15 reps', descanso:'90s',
        notas:'Sentarse y levantarse de silla sin impulso de brazos. Evaluar control de rodilla sin dolor.' })
    }

    // Core
    if (!tieneColumna) {
      tests.push({ orden:6, nombre:'Plancha frontal — Test core', patron:'core', series:1,
        reps:'máximo tiempo', descanso:'-',
        notas:'Cuerpo recto, cadera neutra. Aguantar el máximo posible. Registrar tiempo en Marcas.' })
      tests.push({ orden:7, nombre:'Plancha lateral — Test estabilidad', patron:'core', series:1,
        reps:'máximo tiempo cada lado', descanso:'-',
        notas:'Cada lado. Registrar tiempo. Indica desequilibrios laterales.' })
    } else {
      tests.push({ orden:6, nombre:'Dead bug — Test core sin compresión lumbar', patron:'core', series:2,
        reps:'8 por lado', descanso:'60s',
        notas:'Espalda neutra en suelo. Extender brazo y pierna opuesta. Sin dolor lumbar.' })
    }

    // Cardio/resistencia
    tests.push({ orden:8, nombre:'Burpees modificados — Test resistencia', patron:'cardio', series:1,
      reps:'máx en 1 min', descanso:'-',
      notas:'Versión sin salto si hay rodilla. Contar repeticiones en 1 minuto. Registrar número. Indica capacidad cardiovascular base.' })
  }

  // ── MATERIAL BÁSICO — mancuernas y gomas ─────────────────────────────────
  else if (materialBasico) {
    if (!tieneHombro) {
      tests.push({ orden:2, nombre:'Press mancuernas — Test de fuerza', patron:'fuerza', series:3,
        reps:'8 reps progresivas', descanso:'2 min',
        notas:'Aumentar peso cada serie. Registrar el máximo con 8 reps limpias.' })
    } else {
      tests.push({ orden:2, nombre:'Flexiones — Test (hombro protegido)', patron:'fuerza', series:3,
        reps:'máx reps', descanso:'2 min',
        notas:'Sin carga axial de hombro. Registrar máximo.' })
    }
    tests.push({ orden:3, nombre:'Remo mancuerna — Test tirón', patron:'fuerza', series:3,
      reps:'8 reps por brazo', descanso:'2 min',
      notas:'Apoyo en banco o silla. Aumentar peso cada serie. Registrar máximo.' })
    if (!tieneRodilla) {
      tests.push({ orden:4, nombre:'Sentadilla con mancuernas — Test pierna', patron:'fuerza', series:3,
        reps:'10 reps progresivas', descanso:'2 min',
        notas:'Mancuernas en los lados. Registrar el peso máximo con 10 reps y buena técnica.' })
    } else {
      tests.push({ orden:4, nombre:'Hip thrust con mancuerna — Test cadena posterior', patron:'fuerza', series:3,
        reps:'10 reps', descanso:'2 min',
        notas:'Hombros en banco, mancuerna en cadera. Sin impacto en rodilla.' })
    }
    if (!tieneColumna) {
      tests.push({ orden:5, nombre:'Peso muerto mancuernas — Test', patron:'fuerza', series:3,
        reps:'8 reps progresivas', descanso:'2 min',
        notas:'Espalda neutra. Registrar máximo con 8 reps.' })
    }
    tests.push({ orden:6, nombre:'Plancha — Test core', patron:'core', series:1,
      reps:'máximo tiempo', descanso:'-',
      notas:'Registrar tiempo en Marcas.' })
  }

  // ── GIMNASIO COMPLETO ────────────────────────────────────────────────────
  else {
    if (!tieneHombro) {
      tests.push({ orden:2, nombre:'Press banca — Test de fuerza', patron:'fuerza', series:3,
        reps:'5 reps progresivas', descanso:'3 min',
        notas:'Serie 1: 50% estimado. Serie 2: 70%. Serie 3: máximo con buena técnica. Registrar en Marcas.' })
    } else {
      tests.push({ orden:2, nombre:'Press pectoral en máquina — Test', patron:'fuerza', series:3,
        reps:'8 reps progresivas', descanso:'2 min',
        notas:'Sin dolor de hombro. Registrar peso máximo con 8 reps limpias.' })
    }
    if (nivel === 'principiante') {
      tests.push({ orden:3, nombre:'Remo en máquina — Test', patron:'fuerza', series:3,
        reps:'8 reps progresivas', descanso:'2 min',
        notas:'Aumentar peso cada serie. Registrar máximo con técnica correcta.' })
    } else {
      tests.push({ orden:3, nombre:'Dominadas o Jalón — Test', patron:'fuerza', series:3,
        reps:'máx reps o 5 reps pesadas', descanso:'3 min',
        notas:'Dominadas: máx reps con peso corporal. Sin dominadas: jalón máximo peso 5 reps.' })
    }
    if (!tieneRodilla) {
      if (nivel === 'principiante') {
        tests.push({ orden:4, nombre:'Prensa de piernas — Test', patron:'fuerza', series:3,
          reps:'8 reps progresivas', descanso:'2 min',
          notas:'Más seguro que sentadilla para testar fuerza de pierna. Registrar máximo con 8 reps.' })
      } else {
        tests.push({ orden:4, nombre:'Sentadilla — Test de fuerza', patron:'fuerza', series:3,
          reps:'5 reps progresivas', descanso:'3 min',
          notas:'Serie 1: 60%. Serie 2: 75%. Serie 3: máximo con buena técnica. Registrar.' })
      }
    } else {
      tests.push({ orden:4, nombre:'Hip Thrust — Test (sin impacto rodilla)', patron:'fuerza', series:3,
        reps:'8 reps progresivas', descanso:'2 min',
        notas:'Cadena posterior sin rodilla. Registrar máximo con 8 reps.' })
    }
    if (!tieneColumna) {
      tests.push({ orden:5, nombre:'Peso muerto rumano — Test', patron:'fuerza', series:3,
        reps:'5 reps progresivas', descanso:'3 min',
        notas:'Menos técnico que convencional. Registrar máximo con espalda neutra.' })
    }
    tests.push({ orden:6, nombre:'Plank — Test de resistencia de core', patron:'core', series:1,
      reps:'máximo tiempo', descanso:'-',
      notas:'Registrar tiempo en Marcas.' })
    if (tipo === 'crossfit' && nivel !== 'principiante') {
      tests.push({ orden:7, nombre:'Test metabólico — 500m remo ergómetro', patron:'cardio', series:1,
        reps:'500m', descanso:'-',
        notas:'Al máximo esfuerzo. Registrar tiempo.' })
    }
    if (tipo === 'hibrido' && !tieneRodilla) {
      tests.push({ orden:7, nombre:'Test de carrera — 1km', patron:'cardio', series:1,
        reps:'1km', descanso:'-',
        notas:'Al ritmo más constante posible. Registrar tiempo.' })
    }
  }

  const final = { orden: tests.length + 2, nombre:'Registro de marcas', patron:'movilidad', series:1, reps:'-', descanso:'-',
    notas:'📋 Registra TODOS los resultados en el apartado de Marcas de tu portal. Actualizarán tus referencias para el próximo mes.' }

  return [...base, ...tests, final]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS })

  try {
    const { cliente_id } = await req.json().catch(() => ({}))
    if (!cliente_id) return new Response(JSON.stringify({ error: 'cliente_id requerido' }), { status: 400, headers: CORS })

    const [{ data: cliente }, { data: cuestionario }] = await Promise.all([
      sb.from('clientes').select('*').eq('id', cliente_id).single(),
      sb.from('cuestionarios').select('material,lesiones,nivel').eq('cliente_id', cliente_id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
    ])

    if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404, headers: CORS })
    if (cliente.entrenador_id !== user.id) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })

    const { data: evals } = await sb.from('rutinas').select('id').eq('cliente_id', cliente_id).eq('tipo', 'evaluacion')
    const numEval = (evals?.length || 0) + 1
    const esInicial = numEval === 1

    // Material efectivo — cuestionario tiene prioridad sobre el campo del cliente
    const materialEfectivo = cuestionario?.material || cliente.material || 'gimnasio'

    const ejercicios = ejerciciosEvaluacion({ ...cliente, material: materialEfectivo }, cuestionario)

    const nombreEval = esInicial
      ? `Evaluación Inicial — ${cliente.nombre.split(' ')[0]}`
      : `Evaluación ${numEval} (${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}) — ${cliente.nombre.split(' ')[0]}`

    const tipoMaterialLabel = materialEfectivo === 'sin_material' ? 'peso corporal'
      : materialEfectivo === 'material_basico' ? 'mancuernas y gomas'
      : 'gimnasio completo'

    const contenido = {
      nombre: nombreEval,
      descripcion: esInicial
        ? `Test de punto de partida — ${tipoMaterialLabel}. Registra todos los resultados en Marcas.`
        : 'Revisión de progreso. Compara con tu evaluación anterior.',
      semanas: 1,
      dias: [{
        dia: 1,
        nombre: esInicial ? 'Día 0 - Evaluación Inicial' : `Evaluación ${numEval}`,
        patron_principal: `Evaluación — ${tipoMaterialLabel}`,
        ejercicios
      }]
    }

    const { data: saved, error } = await sb.from('rutinas').insert({
      cliente_id, entrenador_id: user.id,
      nombre: nombreEval,
      objetivo: cliente.objetivo,
      semanas: 1, dias_semana: 1,
      borrador: contenido,
      notas_entrenador: esInicial
        ? `📋 EVALUACIÓN INICIAL — ${tipoMaterialLabel.toUpperCase()}\n\nAdaptada al material disponible del cliente.\nUna vez completada, los resultados actualizarán sus marcas de referencia.\nPublica ANTES de la rutina principal.`
        : `📋 EVALUACIÓN ${numEval}\nComparar progreso desde evaluación anterior.`,
      estado: 'borrador',
      tipo: 'evaluacion'
    }).select().single()

    if (error) throw new Error(error.message)

    await sb.from('alertas').insert({
      entrenador_id: user.id, cliente_id,
      tipo: 'rutina_lista',
      mensaje: `${esInicial ? 'Evaluación inicial' : 'Evaluación '+ numEval} de ${cliente.nombre.split(' ')[0]} lista (${tipoMaterialLabel}) — revísala y publícala`
    })

    return new Response(JSON.stringify({ ok: true, evaluacion: saved, numero: numEval, es_inicial: esInicial, material: materialEfectivo }), { headers: CORS })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
