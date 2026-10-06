// Módulos ocultos en esta instancia (VITE_MODULOS_OCULTOS, lista separada por comas,
// que sale de "modulosOcultos" en la ficha del centro). Ocultar no borra datos: solo
// quita el módulo del menú, redirige su ruta y retira sus avisos del Dashboard.
// Ids: dashboard, clientes, rutinas, seguimiento, pagos, agenda, nutricion, mensajes, tutorial
const ocultos = new Set(
  String(import.meta.env.VITE_MODULOS_OCULTOS || '').split(',').map(s => s.trim()).filter(Boolean)
)

export const moduloVisible = id => !ocultos.has(id)
