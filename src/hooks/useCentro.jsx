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
      // Primero buscar si soy miembro de algún centro
      const { data: memData } = await supabase
        .from('miembros_centro')
        .select('*, centros(*)')
        .eq('user_id', uid)
        .eq('activo', true)
        .limit(1)
        .maybeSingle()

      if (memData?.centros) {
        setCentro(memData.centros)
        setMiembro(memData)
        // Cargar todos los miembros — owner puede verlos todos por RLS
        const { data: todos } = await supabase
          .from('miembros_centro')
          .select('*')
          .eq('centro_id', memData.centro_id)
          .eq('activo', true)
          .order('rol')
        setMiembros(todos || [])
      } else {
        // Ver si soy owner de algún centro aunque no tenga registro de miembro
        const { data: centroOwner } = await supabase
          .from('centros')
          .select('*')
          .eq('owner_id', uid)
          .limit(1)
          .maybeSingle()

        if (centroOwner) {
          setCentro(centroOwner)
          const { data: todos } = await supabase
            .from('miembros_centro')
            .select('*')
            .eq('centro_id', centroOwner.id)
            .eq('activo', true)
            .order('rol')
          setMiembros(todos || [])
          // Crear mi registro de miembro si no existe
          if (!(todos || []).find(m => m.user_id === uid)) {
            await supabase.from('miembros_centro').insert({
              centro_id: centroOwner.id, user_id: uid, rol: 'admin',
              nombre: 'Admin', email: '', color: '#FF5C00', activo: true
            })
          }
        } else {
          setCentro(null); setMiembro(null); setMiembros([])
        }
      }
    } catch (e) {
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
