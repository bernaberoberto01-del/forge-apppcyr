export const TIPOS_ENTRENAMIENTO = [
  {
    id: 'fuerza',
    label: 'Fuerza',
    icon: '🏋️',
    desc: 'Aumentar el peso máximo en los movimientos principales',
    color: 'bg-blue-50 text-blue-700',
    prompt: 'Enfoque en fuerza máxima. Series de 3-6 reps con cargas altas (85-95% RM). Movimientos compuestos: sentadilla, peso muerto, press banca, press militar. Descansos largos 3-5 min. Periodización lineal o por bloques.'
  },
  {
    id: 'hipertrofia',
    label: 'Hipertrofia',
    icon: '💪',
    desc: 'Aumentar masa muscular y tamaño',
    color: 'bg-purple-50 text-purple-700',
    prompt: 'Enfoque en hipertrofia. Series de 8-12 reps con cargas moderadas (70-80% RM). Combina compuestos e isolation. Técnicas como superseries, drop sets ocasionales. Descansos 60-90 seg. Variedad de ángulos y ejercicios.'
  },
  {
    id: 'perdida_grasa',
    label: 'Pérdida de grasa',
    icon: '🔥',
    desc: 'Quemar grasa manteniendo el músculo',
    color: 'bg-orange-50 text-orange-700',
    prompt: 'Enfoque en pérdida de grasa. Circuitos y supersets con poco descanso (30-60 seg). Combina compuestos con cardio integrado. Series de 12-20 reps. Alta densidad de trabajo. Incluye ejercicios metabólicos y HIIT ocasional.'
  },
  {
    id: 'resistencia',
    label: 'Resistencia',
    icon: '🏃',
    desc: 'Mejorar la capacidad cardiovascular y aguante',
    color: 'bg-emerald-50 text-emerald-700',
    prompt: 'Enfoque en resistencia muscular. Series de 15-25 reps con cargas ligeras-moderadas. Circuitos con mínimo descanso. Combina fuerza con cardio. Incluye trabajo de core y estabilización. Progresión en volumen y densidad.'
  },
  {
    id: 'hibrido',
    label: 'Híbrido',
    icon: '⚡',
    desc: 'Combina fuerza y resistencia cardiovascular',
    color: 'bg-yellow-50 text-yellow-700',
    prompt: 'Entrenamiento híbrido: combina bloques de fuerza (3-6 reps, cargas altas) con bloques de resistencia (12-20 reps, circuitos). Alterna días de fuerza pura con días metabólicos. Desarrolla fuerza y capacidad aeróbica simultáneamente.'
  },
  {
    id: 'crossfit',
    label: 'CrossFit',
    icon: '🎯',
    desc: 'Alta intensidad, movimientos funcionales variados',
    color: 'bg-red-50 text-red-700',
    prompt: 'Estilo CrossFit/funcional de alta intensidad. WODs con movimientos olímpicos (snatch, clean & jerk simplificados), gimnásticos (pull-ups, HSPU, anillas) y metabólicos (box jumps, burpees, kettlebell). AMRAPs y tiempo por rondas. Alta variedad.'
  },
  {
    id: 'potencia',
    label: 'Potencia',
    icon: '💥',
    desc: 'Velocidad de ejecución y explosividad',
    color: 'bg-cyan-50 text-cyan-700',
    prompt: 'Enfoque en potencia y explosividad. Movimientos balísticos: saltos, lanzamientos, sprints, kettlebell swings. Levantamientos olímpicos o variantes. Series cortas 3-5 reps ejecutadas a máxima velocidad. Descansos completos. Plyometría integrada.'
  },
  {
    id: 'movilidad',
    label: 'Movilidad',
    icon: '🧘',
    desc: 'Flexibilidad, movilidad articular y control motor',
    color: 'bg-teal-50 text-teal-700',
    prompt: 'Enfoque en movilidad y control motor. Trabajo de movilidad articular activa (cadera, hombros, tobillo, columna). Fuerza en rangos extremos. Stretching dinámico y estático. Core profundo. Patrones de movimiento corregidos. Integra yoga y FRC.'
  },
  {
    id: 'calistenia',
    label: 'Calistenia',
    icon: '🤸',
    desc: 'Fuerza y control corporal sin máquinas',
    color: 'bg-indigo-50 text-indigo-700',
    prompt: 'Calistenia progresiva. Solo peso corporal: dominadas, fondos, flexiones, muscle-up, pistol squat, handstand. Progresiones por fases hacia habilidades avanzadas. Series de 5-12 reps con variantes difíciles. Elementos de fuerza estática y control.'
  },
  {
    id: 'wellness',
    label: 'Wellness',
    icon: '🌿',
    desc: 'Salud integral, bienestar y longevidad',
    color: 'bg-green-50 text-green-700',
    prompt: 'Enfoque wellness y salud integral. Ejercicios de bajo impacto con correcta técnica. Equilibrio entre fuerza funcional, movilidad y cardio suave. Series de 10-15 reps cómodas. Prioriza la adherencia y sensaciones positivas. Incluye respiración y recuperación.'
  }
]

export const TIPOS_MAP = Object.fromEntries(TIPOS_ENTRENAMIENTO.map(t => [t.id, t]))
