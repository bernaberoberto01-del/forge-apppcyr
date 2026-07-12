import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const CentroContext = createContext(null)

export function CentroProvider({ session, children }) {
  const [centro, setCentro] = useState(null)
  const [miembro, setMiembro] = useState(null) // mi rol en el centro
  const [miembros, setMiembros] = useState([]) // todos los miembros
  const [loading, setLoading] = useState(true)
  const uid = session?.user?.id

  useEffect(() => {
    if (!uid) return
    cargar()
  }, [uid])

  async function cargar() {
    setLoading(true)
    try {
      const { data: memData } = await supabase
        .from('miembros_centro')
        .select('*, centros(*)')
        .eq('user_id', uid)
        .eq('activo', true)
        .limit(1)
        .single()

      if (memData) {
        setCentro(memData.centros)
        setMiembro(memData)
        const { data: todos } = await supabase
          .from('miembros_centro')
          .select('*')
          .eq('centro_id', memData.centro_id)
          .eq('activo', true)
          .order('rol')
        setMiembros(todos || [])
      } else {
        setCentro(null); setMiembro(null); setMiembros([])
      }
    } catch (_) {
      // Sin centro — modo personal
      setCentro(null); setMiembro(null); setMiembros([])
    }
    setLoading(false)
  }

  const esAdmin = miembro?.rol === 'admin' || (centro && centro.owner_id === uid)
  const colorPropio = miembro?.color || '#FF5C00'

  return (
    <CentroContext.Provider value={{ centro, miembro, miembros, loading, esAdmin, colorPropio, recargar: cargar }}>
      {children}
    </CentroContext.Provider>
  )
}

export function useCentro() {
  return useContext(CentroContext)
}
