import { useState, useEffect, useCallback } from 'react'

// Onboarding del portal del cliente — usa localStorage
// Se guarda por clienteId para que sea persistente por usuario

const TUTORIALES_CLIENTE = {
  inicio: {
    titulo: '¡Bienvenido a tu portal! 👋',
    desc: 'Aquí tienes todo tu plan centralizado. Consulta tu rutina, registra tu progreso y habla con tu entrenador.',
  },
  rutina: {
    titulo: 'Tu rutina personalizada 💪',
    desc: 'Aquí ves los ejercicios de cada día con series, repeticiones y tiempos de descanso. Cuando termines un entreno, valora el esfuerzo.',
  },
  progreso: {
    titulo: 'Registra tu progreso 📈',
    desc: 'Sube tu peso semanalmente, anota tus medidas y sube fotos para ver la evolución real. Tu entrenador lo revisa.',
  },
  mensajes: {
    titulo: 'Habla con tu entrenador 💬',
    desc: 'Dudas, comentarios o cualquier cosa — escríbela aquí. Tu entrenador te responde en menos de 24h.',
  },
  nutricion: {
    titulo: 'Tu plan de alimentación 🥗',
    desc: 'Pautas de alimentación adaptadas a tu objetivo. No es una dieta estricta — son hábitos que funcionan con tu estilo de vida.',
  },
  checkin: {
    titulo: 'Check-in semanal 📋',
    desc: 'Cada semana te llega un cuestionario rápido. Cuanto más honesto seas, mejor puede ajustar tu entrenador el plan.',
  },
}

export function useOnboardingPortal(clienteId) {
  const key = clienteId ? `forge_onboarding_cliente_${clienteId}` : null
  const [vistos, setVistos] = useState(new Set())

  useEffect(() => {
    if (!key) return
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '[]')
      setVistos(new Set(stored))
    } catch {}
  }, [key])

  const marcarVisto = useCallback((seccion) => {
    if (!key) return
    setVistos(prev => {
      const nuevo = new Set([...prev, seccion])
      try { localStorage.setItem(key, JSON.stringify([...nuevo])) } catch {}
      return nuevo
    })
  }, [key])

  const esNuevo = useCallback((seccion) => !vistos.has(seccion), [vistos])

  return { marcarVisto, esNuevo, TUTORIALES_CLIENTE }
}
