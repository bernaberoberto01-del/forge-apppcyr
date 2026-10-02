// Marca de la instancia (una por despliegue), leída de las variables VITE_BRAND_*
// de Vercel. Es la que se ve antes de iniciar sesión, cuando aún no se puede
// leer la configuración del entrenador desde la base de datos.
// Los valores por defecto son los de Forge: respaldo temporal hasta que Forge
// tenga sus propias variables definidas.
const env = import.meta.env

const HEX6 = /^#[0-9A-Fa-f]{6}$/

export const BRAND = {
  nombre: env.VITE_BRAND_NAME || 'Forge',
  subtitulo: env.VITE_BRAND_TAGLINE || 'Studio OS',
  nombreCompleto: env.VITE_BRAND_FULLNAME || 'Forge Studio OS',
  // Siempre #RRGGBB: hay código que le concatena un canal alfa (`${color}15`).
  color: HEX6.test(env.VITE_BRAND_COLOR || '') ? env.VITE_BRAND_COLOR : '#FF5C00',
  logo: env.VITE_BRAND_LOGO || '',
}
