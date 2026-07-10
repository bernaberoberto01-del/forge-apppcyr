const PESOS_NIVEL = {
  principiante: {
    press_banca:25, press_inclinado:20, press_mancuernas:12, press_militar:20, elevaciones:6,
    dominadas:null, jalon:30, remo_barra:35, remo_mancuerna:12,
    sentadilla:35, prensa:60, extension_cuad:30, peso_muerto:45, peso_muerto_rumano:30,
    hip_thrust:30, curl_biceps:8, triceps:8, fondos:null
  },
  intermedio: {
    press_banca:60, press_inclinado:50, press_mancuernas:22, press_militar:40, elevaciones:10,
    dominadas:5, jalon:55, remo_barra:65, remo_mancuerna:22,
    sentadilla:75, prensa:120, extension_cuad:50, peso_muerto:90, peso_muerto_rumano:60,
    hip_thrust:70, curl_biceps:14, triceps:14, fondos:5
  },
  avanzado: {
    press_banca:90, press_inclinado:75, press_mancuernas:34, press_militar:60, elevaciones:16,
    dominadas:15, jalon:80, remo_barra:95, remo_mancuerna:34,
    sentadilla:110, prensa:180, extension_cuad:75, peso_muerto:130, peso_muerto_rumano:90,
    hip_thrust:100, curl_biceps:20, triceps:20, fondos:20
  }
}

function detectarEjercicio(nombre, patron) {
  const combo = ((nombre||'') + ' ' + (patron||'')).toLowerCase()
  if (combo.match(/press.*banca|bench|pecho.*plan|push.*horizont|empuje.*horizont|horizont.*push|horizont.*empuj/)) return 'press_banca'
  if (combo.match(/press.*inclinad|incline/)) return 'press_inclinado'
  if (combo.match(/press.*mancuerna.*plan|dumbbell.*press.*flat/)) return 'press_mancuernas'
  if (combo.match(/press.*militar|overhead|press.*hombro|militar|push.*vert|empuje.*vert|vert.*push|vert.*empuj/)) return 'press_militar'
  if (combo.match(/elevaci|lateral raise|pájar|pajar|face pull/)) return 'elevaciones'
  if (combo.match(/dominada|pull.?up|chin.?up/)) return 'dominadas'
  if (combo.match(/jalón|jalon|lat pull|pulldown/)) return 'jalon'
  if (combo.match(/remo.*barra|barbell row|barra.*t\b|remo.*t\b|t-bar/)) return 'remo_barra'
  if (combo.match(/remo.*mancuerna|dumbbell row|unilateral.*row|row.*unilat/)) return 'remo_mancuerna'
  if (combo.match(/remo|row|tracción|traccion|tirón|tiron|pull.*horizont|horizont.*pull/)) return 'remo_barra'
  if (combo.match(/sentadilla|squat|goblet|hack squat|bilateral.*pierna/)) return 'sentadilla'
  if (combo.match(/prensa.*piern|leg press/)) return 'prensa'
  if (combo.match(/extensi.*cuad|leg extens/)) return 'extension_cuad'
  if (combo.match(/rumano|romanian|rdl/)) return 'peso_muerto_rumano'
  if (combo.match(/peso.*muerto|deadlift|bisagra|hip hinge|cadena.*post|posterior.*cadena/)) return 'peso_muerto'
  if (combo.match(/hip thrust|glút|glut|hip extens/)) return 'hip_thrust'
  if (combo.match(/curl.*bícep|bicep.*curl|flexi.*codo/)) return 'curl_biceps'
  if (combo.match(/tricep|franc[eé]s|press.*clos|skull/)) return 'triceps'
  if (combo.match(/fondo|dips|paralela/)) return 'fondos'
  // Fallback por patrón general
  if (combo.match(/push|empuje/)) return 'press_banca'
  if (combo.match(/pull|tirón|tracción/)) return 'remo_barra'
  if (combo.match(/squat|sentadilla|bilateral/)) return 'sentadilla'
  if (combo.match(/hinge|bisagra|deadlift|muerto/)) return 'peso_muerto'
  return null
}

export function getPesoRecomendado(nombre, patron, nivel, marcas, cuest) {
  const nv = nivel || 'principiante'
  const ej = detectarEjercicio(nombre, patron)
  if (!ej) return null
  const parseKg = str => { const m = (str||'').toString().match(/[\d.]+/); return m ? parseFloat(m[0]) : null }
  // 1. Progresión mensual real
  if (marcas) {
    const rm = { press_banca: marcas.press_banca_kg, press_inclinado: marcas.press_banca_kg?.toFixed ? marcas.press_banca_kg*0.85 : null, press_mancuernas: marcas.press_banca_kg?.toFixed ? marcas.press_banca_kg*0.4 : null, press_militar: marcas.press_militar_kg, dominadas: marcas.dominadas_lastre_kg, sentadilla: marcas.sentadilla_kg, peso_muerto: marcas.peso_muerto_kg, peso_muerto_rumano: marcas.peso_muerto_kg?.toFixed ? marcas.peso_muerto_kg*0.7 : null }[ej]
    if (rm) return Math.round(rm * 0.75 / 2.5) * 2.5
  }
  // 2. Marcas del cuestionario
  if (cuest) {
    const rm = { press_banca: parseKg(cuest.marca_press_banca), press_inclinado: parseKg(cuest.marca_press_banca) ? parseKg(cuest.marca_press_banca)*0.85 : null, press_mancuernas: parseKg(cuest.marca_press_banca) ? parseKg(cuest.marca_press_banca)*0.4 : null, press_militar: parseKg(cuest.marca_press_militar), dominadas: parseKg(cuest.marca_dominadas), sentadilla: parseKg(cuest.marca_sentadilla), peso_muerto: parseKg(cuest.marca_peso_muerto), peso_muerto_rumano: parseKg(cuest.marca_peso_muerto) ? parseKg(cuest.marca_peso_muerto)*0.7 : null }[ej]
    if (rm && !isNaN(rm)) return Math.round(rm * 0.75 / 2.5) * 2.5
  }
  // 3. Tabla por nivel — siempre disponible
  return (PESOS_NIVEL[nv] || PESOS_NIVEL.principiante)[ej] || null
}
