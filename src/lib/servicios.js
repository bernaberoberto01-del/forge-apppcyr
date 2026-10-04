// Servicios extra que el centro ofrece además del entrenamiento (VITE_SERVICIOS, de
// "servicios" en la ficha). Sus sesiones llevan el cliente escrito a mano: se guarda
// como cliente con estado 'externo', que no aparece en la lista ni en las cifras.
const disponibles = String(import.meta.env.VITE_SERVICIOS || '').split(',').map(s => s.trim()).filter(Boolean)

export const SERVICIOS_EXTRA = disponibles.filter(s => s === 'fisioterapia' || s === 'nutricion')
export const ICONO_SERVICIO = { fisioterapia: '🩺', nutricion: '🥗' }
export const NOMBRE_SERVICIO = { entrenamiento: 'Entrenamiento', fisioterapia: 'Fisioterapia', nutricion: 'Nutrición' }
export const esServicioExtra = tipo => tipo === 'fisioterapia' || tipo === 'nutricion'
