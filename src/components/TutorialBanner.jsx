import { useState, useEffect } from 'react'

/**
 * Banner de tutorial que aparece la primera vez que el usuario
 * visita una sección. Se cierra con X y no vuelve a aparecer.
 * 
 * Props:
 *   tutorial: { titulo, desc, accion, ruta }
 *   completado: boolean — si ya completó este paso
 *   onCompletar: () => void — marcar como visto
 *   onAccion: () => void — acción del botón (opcional)
 */
export default function TutorialBanner({ tutorial, completado, onCompletar, onAccion }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Mostrar solo si no está completado, con un pequeño delay
    if (!completado) {
      const t = setTimeout(() => setVisible(true), 400)
      return () => clearTimeout(t)
    }
  }, [completado])

  if (!visible || completado) return null

  function cerrar() {
    setVisible(false)
    onCompletar?.()
  }

  return (
    <div className="relative bg-gradient-to-r from-[#FF5C00]/10 to-[#6366f1]/10 border border-[#FF5C00]/20 rounded-2xl p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Indicador de tutorial */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-[#FF5C00] rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
          ?
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0A0A0A]">{tutorial.titulo}</p>
          <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">{tutorial.desc}</p>
          {tutorial.accion && (
            <button onClick={() => { onAccion?.(); cerrar() }}
              className="mt-2 text-xs font-semibold text-[#FF5C00] hover:underline">
              {tutorial.accion} →
            </button>
          )}
        </div>
        <button onClick={cerrar}
          className="w-6 h-6 flex items-center justify-center text-[#9B9B9B] hover:text-[#0A0A0A] flex-shrink-0 rounded-lg hover:bg-black/5 transition-all text-sm">
          ×
        </button>
      </div>
    </div>
  )
}

/**
 * Tooltip de descubrimiento — aparece junto a un botón
 * la primera vez que el usuario tiene el contexto para usarlo
 */
export function TooltipDescubrimiento({ texto, visible, onCerrar }) {
  if (!visible) return null

  return (
    <div className="absolute z-20 bottom-full mb-2 left-0 w-48 bg-[#111] text-white text-xs rounded-xl px-3 py-2 shadow-xl">
      <p className="leading-relaxed">{texto}</p>
      <button onClick={onCerrar} className="text-white/50 hover:text-white text-xs mt-1 font-medium">
        Entendido ✓
      </button>
      <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#111]"/>
    </div>
  )
}

/**
 * Barra de progreso del onboarding — se muestra en el Layout
 * hasta que el usuario completa todos los pasos esenciales
 */
export function BarraProgreso({ porcentaje, onClick }) {
  if (porcentaje >= 100) return null

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 bg-[#F7F6F3] hover:bg-[#EEECEA] transition-all border-t border-black/5">
      <div className="flex-1 bg-black/10 rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-[#FF5C00] rounded-full transition-all duration-500" style={{width:`${porcentaje}%`}}/>
      </div>
      <p className="text-xs text-[#6B6B6B] font-medium flex-shrink-0">{porcentaje}% completado</p>
    </button>
  )
}
