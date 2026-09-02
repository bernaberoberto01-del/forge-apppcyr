import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Pasos del onboarding en orden lógico
export const PASOS_ONBOARDING = {
  // Entrenador
  PERFIL:           'perfil',
  PRIMER_CLIENTE:   'primer_cliente',
  PRIMERA_RUTINA:   'primera_rutina',
  PRIMERA_SESION:   'primera_sesion',
  PRIMER_CHECKIN:   'primer_checkin',
  PRIMER_PAGO:      'primer_pago',
  PRIMER_MENSAJE:   'primer_mensaje',
  // Funciones avanzadas
  IA_RUTINA:        'ia_rutina',
  IA_ANALISIS:      'ia_analisis',
  GRUPO_CREADO:     'grupo_creado',
  STRIPE_ACTIVO:    'stripe_activo',
}

// Mensajes del tutorial por paso
export const TUTORIALES = {
  dashboard: {
    titulo: '¡Bienvenido a Forge! 👋',
    desc: 'Aquí ves todo de un vistazo: clientes nuevos, sesiones de hoy y lo que necesita tu atención. Empieza configurando tu perfil.',
    accion: 'Ir a Configuración',
    ruta: '/configuracion',
    paso: null, // siempre visible hasta que tengan clientes
  },
  clientes: {
    titulo: 'Tus clientes 👥',
    desc: 'Añade tu primer cliente con el botón "+ Nuevo cliente". Puedes crear clientes presenciales o de asesoría online.',
    accion: null,
    paso: 'primer_cliente',
  },
  rutinas: {
    titulo: 'Planes de entrenamiento 💪',
    desc: 'Selecciona un cliente y pulsa "Generar con IA" — Forge crea una rutina personalizada en segundos. Luego la revisas y la publicas.',
    accion: null,
    paso: 'primera_rutina',
  },
  agenda: {
    titulo: 'Tu agenda 📅',
    desc: 'Aquí ves todas tus sesiones. Pulsa en cualquier hueco para crear una sesión nueva. Las sesiones de grupos se gestionan desde Clientes.',
    accion: null,
    paso: 'primera_sesion',
  },
  seguimiento: {
    titulo: 'Seguimiento semanal 📋',
    desc: 'Cada domingo Forge envía automáticamente el check-in a tus clientes. El lunes los ves aquí y puedes generar un mensaje de feedback con IA.',
    accion: null,
    paso: 'primer_checkin',
  },
  pagos: {
    titulo: 'Gestión de cobros 💶',
    desc: 'Crea un plan de cobro por cliente y Forge te avisará cuándo toca cobrar. Puedes generar links de pago por Stripe directamente desde aquí.',
    accion: null,
    paso: 'primer_pago',
  },
  mensajes: {
    titulo: 'Mensajería directa 💬',
    desc: 'Chat directo con tus clientes. Pulsa 💳 para generar un link de pago o ⚡ para usar plantillas rápidas.',
    accion: null,
    paso: 'primer_mensaje',
  },
  nutricion: {
    titulo: 'Planes de nutrición 🥗',
    desc: 'Activa el módulo de nutrición para un cliente y genera su plan con IA. El cliente lo ve en su portal con las pautas semanales.',
    accion: null,
    paso: null,
  },
}

export function useOnboarding(uid) {
  const [progreso, setProgreso] = useState(new Set())
  const [cargado, setCargado] = useState(false)

  useEffect(() => {
    if (!uid) return
    supabase.from('onboarding_progreso')
      .select('paso')
      .eq('user_id', uid)
      .then(({ data }) => {
        setProgreso(new Set((data || []).map(d => d.paso)))
        setCargado(true)
      })
  }, [uid])

  const completar = useCallback(async (paso) => {
    if (!uid || progreso.has(paso)) return
    setProgreso(prev => new Set([...prev, paso]))
    await supabase.from('onboarding_progreso')
      .upsert({ user_id: uid, paso }, { onConflict: 'user_id,paso' })
  }, [uid, progreso])

  const completado = useCallback((paso) => progreso.has(paso), [progreso])
  
  const porcentaje = Math.round(
    (progreso.size / Object.keys(PASOS_ONBOARDING).length) * 100
  )

  return { completar, completado, porcentaje, cargado, progreso }
}
