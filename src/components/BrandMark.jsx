import { BRAND } from '../lib/brand'

// Contenido del recuadro de logo: la imagen del centro si está configurada y,
// si no, la "F" de Forge. El recuadro (tamaño, fondo, esquinas) lo pone quien lo usa.
export default function BrandMark({ size }) {
  if (BRAND.logo) {
    return <img src={BRAND.logo} alt={BRAND.nombre} className="w-full h-full object-cover rounded-[inherit]" />
  }
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
      <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
      <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
    </svg>
  )
}
