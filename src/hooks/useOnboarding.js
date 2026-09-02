import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const PASOS_ONBOARDING = {
  PERFIL:           'perfil',
  PRIMER_CLIENTE:   'primer_cliente',
  PRIMERA_RUTINA:   'primera_rutina',
  PRIMERA_SESION:   'primera_sesion',
  PRIMER_CHECKIN:   'primer_checkin',
  PRIMER_PAGO:      'primer_pago',
  PRIMER_MENSAJE:   'primer_mensaje',
  IA_RUTINA:        'ia_rutina',
  IA_ANALISIS:      'ia_analisis',
  GRUPO_CREADO:     'grupo_creado',
  STRIPE_ACTIVO:    'stripe_activo',
}

export const TUTORIALES = {
  dashboard: {
    titulo: '¡Bienvenido a Forge! 👋',
    desc: 'Aquí ves todo de un vistazo: clientes nuevos, sesiones de hoy y lo que necesita tu atención. Empieza configurando tu perfil.',
    accion: 'Ir a Configuración',
    ruta: '/configuracion',
    paso: null,
  },
  clientes: {
    titulo: 'Tus clientes 👥',
    desc: 'Añade tu primer cliente con el botón "+ Nuevo cliente". Puedes crear clientes presenciales o de asesoría online.',
    paso: 'primer_cliente',
  },
  rutinas: {
    titulo: 'Planes de entrenamiento 💪',
    desc: 'Selecciona un cliente y pulsa "Generar con IA" — Forge crea una rutina personalizada en segundos. Luego la revisas y la publicas.',
    paso: 'primera_rutina',
  },
  agenda: {
    titulo: 'Tu agenda 📅',
    desc: 'Aquí ves todas tus sesiones. Pulsa en cualquier hueco para crear una sesión nueva.',
    paso: 'primera_sesion',
  },
  seguimiento: {
    titulo: 'Seguimiento semanal 📋',
    desc: 'Cada domingo Forge envía automáticamente el check-in a tus clientes. El lunes los ves aquí y puedes generar un mensaje de feedback con IA.',
    paso: 'primer_checkin',
  },
  pagos: {
    titulo: 'Gestión de cobros 💶',
    desc: 'Crea un plan de cobro por cliente y Forge te avisará cuándo toca cobrar.',
    paso: 'primer_pago',
  },
  mensajes: {
    titulo: 'Mensajería directa 💬',
    desc: 'Chat directo con tus clientes. Pulsa 💳 para generar un link de pago o ⚡ para usar plantillas rápidas.',
    paso: 'primer_mensaje',
  },
  nutricion: {
    titulo: 'Planes de nutrición 🥗',
    desc: 'Activa el módulo de nutrición para un cliente y genera su plan con IA.',
    paso: null,
  },
}

export function useOnboarding(uid) {
  const [progreso, setProgreso] = useState(new Set())
  const [cargado, setCargado] = useState(false)

  useEffect(() => {
    if (!uid) return
    cargarYSincronizar()
  }, [uid])

  async function cargarYSincronizar() {
    // Cargar pasos ya guardados
    const { data: pasos } = await supabase.from('onboarding_progreso')
      .select('paso').eq('user_id', uid)

    const yaCompletados = new Set((pasos || []).map(d => d.paso))

    // Detectar automáticamente pasos completados por actividad real
    const [
      { count: nClientes },
      { count: nRutinas },
      { count: nSesiones },
      { count: nCheckins },
      { count: nPagos },
      { count: nMensajes },
      { count: nGrupos },
    ] = await Promise.all([
      supabase.from('clientes').select('*', {count:'exact',head:true}).eq('entrenador_id', uid).eq('estado','activo'),
      supabase.from('rutinas').select('*', {count:'exact',head:true}).eq('entrenador_id', uid),
      supabase.from('sesiones').select('*', {count:'exact',head:true}).eq('entrenador_id', uid),
      supabase.from('checkins').select('*', {count:'exact',head:true}).eq('entrenador_id', uid),
      supabase.from('planes_cobro').select('*', {count:'exact',head:true}).eq('entrenador_id', uid),
      supabase.from('mensajes_cliente').select('*', {count:'exact',head:true}).eq('entrenador_id', uid).eq('tipo','entrenador'),
      supabase.from('grupos').select('*', {count:'exact',head:true}).eq('entrenador_id', uid).eq('activo',true),
    ])

    const detectados = []
    if (nClientes > 0) detectados.push('primer_cliente')
    if (nRutinas > 0) detectados.push('primera_rutina', 'ia_rutina')
    if (nSesiones > 0) detectados.push('primera_sesion')
    if (nCheckins > 0) detectados.push('primer_checkin', 'ia_analisis')
    if (nPagos > 0) detectados.push('primer_pago')
    if (nMensajes > 0) detectados.push('primer_mensaje')
    if (nGrupos > 0) detectados.push('grupo_creado')

    // Guardar los nuevos en BD
    const nuevos = detectados.filter(p => !yaCompletados.has(p))
    if (nuevos.length > 0) {
      await supabase.from('onboarding_progreso').upsert(
        nuevos.map(paso => ({ user_id: uid, paso })),
        { onConflict: 'user_id,paso' }
      )
    }

    const todos = new Set([...yaCompletados, ...detectados])
    setProgreso(todos)
    setCargado(true)
  }

  const completar = useCallback(async (paso) => {
    if (!uid || progreso.has(paso)) return
    setProgreso(prev => new Set([...prev, paso]))
    await supabase.from('onboarding_progreso')
      .upsert({ user_id: uid, paso }, { onConflict: 'user_id,paso' })
  }, [uid, progreso])

  const completado = useCallback((paso) => progreso.has(paso), [progreso])

  const totalPasos = Object.keys(PASOS_ONBOARDING).length
  const porcentaje = Math.round((progreso.size / totalPasos) * 100)

  return { completar, completado, porcentaje, cargado, progreso }
}
