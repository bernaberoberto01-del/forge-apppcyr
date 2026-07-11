import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const defaultConfig = {
  nombre_negocio: 'Forge Studio OS',
  nombre_entrenador: '',
  bio: '',
  foto_url: '',
  color_acento: '#FF5C00',
  modulos: { dashboard:true, clientes:true, rutinas:true, sesiones:true, seguimiento:true, pagos:true, agenda:true },
  cuestionario_bloques: { basico:true, objetivo:true, historial:true, disponibilidad:true, material:true, salud:true, motivacion:true }
}

export const ConfigContext = createContext(defaultConfig)
export const useConfig = () => useContext(ConfigContext)

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  // Hover = 15% más oscuro
  const darken = v => Math.max(0, Math.floor(v * 0.85))
  const toHex = v => v.toString(16).padStart(2,'0')
  const hover = `#${toHex(darken(r))}${toHex(darken(g))}${toHex(darken(b))}`
  return { hover, light: `rgba(${r},${g},${b},0.08)`, border: `rgba(${r},${g},${b},0.2)` }
}

function aplicarColor(acento) {
  if (!acento) return
  const { hover, light, border } = hexToRgb(acento)
  const root = document.documentElement
  root.style.setProperty('--acento', acento)
  root.style.setProperty('--acento-hover', hover)
  root.style.setProperty('--acento-light', light)
  root.style.setProperty('--acento-border', border)
}

export function useConfigLoader(uid) {
  const [config, setConfig] = useState(defaultConfig)
  const [loading, setLoading] = useState(true)

  async function cargar() {
    if (!uid) { setLoading(false); return }
    const { data } = await supabase.from('configuracion').select('*').eq('entrenador_id', uid).single()
    if (data) {
      const merged = {
        ...defaultConfig,
        ...data,
        modulos: { ...defaultConfig.modulos, ...(data.modulos || {}) },
        cuestionario_bloques: { ...defaultConfig.cuestionario_bloques, ...(data.cuestionario_bloques || {}) }
      }
      setConfig(merged)
      aplicarColor(merged.color_acento)
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [uid])

  function actualizar(nuevaConfig) {
    setConfig(nuevaConfig)
    aplicarColor(nuevaConfig.color_acento)
  }

  return { config, loading, actualizar }
}
