// Servicios extra que el centro ofrece además del entrenamiento (VITE_SERVICIOS, de
// "servicios" en la ficha). Con alguno activo, cada cliente tiene una o varias áreas
// (clientes.areas) y la lista de Clientes se separa por área.
const disponibles = String(import.meta.env.VITE_SERVICIOS || '').split(',').map(s => s.trim()).filter(Boolean)

export const SERVICIOS_EXTRA = disponibles.filter(s => s === 'fisioterapia' || s === 'nutricion')
export const ICONO_SERVICIO = { entrenamiento: '💪', fisioterapia: '🩺', nutricion: '🥗' }
export const NOMBRE_SERVICIO = { entrenamiento: 'Entrenamiento', fisioterapia: 'Fisioterapia', nutricion: 'Nutrición' }
export const esServicioExtra = tipo => tipo === 'fisioterapia' || tipo === 'nutricion'

// Áreas del centro: entrenamiento siempre, más los servicios extra.
export const AREAS = ['entrenamiento', ...SERVICIOS_EXTRA]
export const hayAreas = SERVICIOS_EXTRA.length > 0
export const areasDe = c => (c?.areas?.length ? c.areas : ['entrenamiento'])
