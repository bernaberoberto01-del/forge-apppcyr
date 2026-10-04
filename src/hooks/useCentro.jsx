import { useState, useEffect, useMemo, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { BRAND } from '../lib/brand'

const CentroContext = createContext(null)

export function CentroProvider({ session, children }) {
  const [centro, setCentro] = useState(null)
  const [miembro, setMiembro] = useState(null) // mi rol en el centro
  const [miembros, setMiembros] = useState([]) // todos los miembros
  const [loading, setLoading] = useState(true)
  const [equipo, setEquipo] = useState(null) // ids de entrenador cuyos clientes veo (null = solo yo)
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
        await cargarEquipo(memData.centros)
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
          await cargarEquipo(centroOwner)
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
              nombre: 'Admin', email: '', color: BRAND.color, activo: true
            })
          }
        } else {
          setCentro(null); setMiembro(null); setMiembros([]); setEquipo(null)
        }
      }
    } catch (e) {
      setCentro(null); setMiembro(null); setMiembros([]); setEquipo(null)
    }
    setLoading(false)
  }

  // La lista la calcula la BD (mi_equipo) con la misma regla que las políticas
  // RLS: así pantalla y permisos no pueden desincronizarse. Un entrenador que no
  // es admin no puede leer todos los miembros, por eso no se saca de `miembros`.
  async function cargarEquipo(c) {
    if (!c?.comparte_clientes) { setEquipo(null); return }
    const { data, error } = await supabase.rpc('mi_equipo')
    setEquipo(!error && data?.length ? data.map(r => (typeof r === 'string' ? r : r.mi_equipo)) : null)
  }

  const esAdmin = miembro?.rol === 'admin' || (centro && centro.owner_id === uid)
  const colorPropio = miembro?.color || BRAND.color

  return (
    <CentroContext.Provider value={{ centro, miembro, miembros, loading, esAdmin, colorPropio, equipo, recargar: cargar }}>
      {/* Las pantallas filtran por el equipo al montarse: no renderizarlas antes de saberlo */}
      {loading && uid ? <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-acento border-t-transparent rounded-full animate-spin" /></div> : children}
    </CentroContext.Provider>
  )
}

export function useCentro() {
  return useContext(CentroContext)
}

// Ids de entrenador cuyos clientes ve este usuario: [uid] salvo que su centro
// comparta clientes. Usar con .in('entrenador_id', equipo).
export function useEquipo(uid) {
  const ctx = useContext(CentroContext)
  const lista = ctx?.equipo
  return useMemo(() => (lista?.length ? [...new Set([uid, ...lista])] : [uid]), [uid, lista])
}
