import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const GRUPOS = ['Todos','Pecho','Espalda','Hombros','Bíceps','Tríceps','Piernas','Glúteos','Posterior','Core','Full body']

export default function EjercicioInput({ value, onChange, onSelect, placeholder = 'Nombre del ejercicio', uid, className = '' }) {
  const [query, setQuery] = useState(value || '')
  const [sugerencias, setSugerencias] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [biblioteca, setBiblioteca] = useState([])
  const [grupoFiltro, setGrupoFiltro] = useState('Todos')
  const ref = useRef()

  // Cargar biblioteca una vez
  useEffect(() => {
    if (!uid) return
    supabase.from('ejercicios_biblioteca').select('*').eq('entrenador_id', uid)
      .order('usos', { ascending: false }).limit(100)
      .then(({ data }) => setBiblioteca(data || []))
  }, [uid])

  // Sincronizar value externo
  useEffect(() => { setQuery(value || '') }, [value])

  // Filtrar según query
  useEffect(() => {
    if (!query || query.length < 1) {
      // Mostrar más usados
      const filtrados = grupoFiltro === 'Todos' ? biblioteca : biblioteca.filter(e => e.grupo_muscular === grupoFiltro)
      setSugerencias(filtrados.slice(0, 8))
      return
    }
    const q = query.toLowerCase()
    const filtrados = biblioteca.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      e.grupo_muscular?.toLowerCase().includes(q) ||
      e.patron?.toLowerCase().includes(q)
    ).slice(0, 8)
    setSugerencias(filtrados)
  }, [query, biblioteca, grupoFiltro])

  // Cerrar al click fuera
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function seleccionar(ej) {
    setQuery(ej.nombre)
    setAbierto(false)
    onChange?.(ej.nombre)
    onSelect?.(ej)
    // Incrementar contador de uso
    await supabase.from('ejercicios_biblioteca').update({ usos: (ej.usos || 0) + 1 }).eq('id', ej.id)
  }

  async function guardarNuevo() {
    if (!query.trim() || !uid) return
    // Guardar en biblioteca si no existe
    const existe = biblioteca.find(e => e.nombre.toLowerCase() === query.toLowerCase())
    if (!existe) {
      const { data } = await supabase.from('ejercicios_biblioteca').insert({
        entrenador_id: uid, nombre: query.trim(), usos: 1
      }).select().single()
      if (data) setBiblioteca(prev => [...prev, data])
    }
    setAbierto(false)
    onChange?.(query)
    onSelect?.({ nombre: query, patron: '', grupo_muscular: '' })
  }

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange?.(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
        placeholder={placeholder}
        className={`w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] transition-colors ${className}`}
      />

      {abierto && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black/10 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Filtro por grupo */}
          <div className="flex gap-1 p-2 overflow-x-auto border-b border-black/5">
            {GRUPOS.map(g => (
              <button key={g} type="button" onClick={() => setGrupoFiltro(g)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-all ${grupoFiltro === g ? 'bg-[#FF5C00] text-white' : 'bg-[#F5F5F0] text-[#6B6B6B] hover:bg-black/10'}`}>
                {g}
              </button>
            ))}
          </div>

          {/* Sugerencias */}
          <div className="max-h-48 overflow-y-auto">
            {sugerencias.length === 0 && query ? (
              <div className="p-3">
                <p className="text-xs text-[#6B6B6B] mb-2">Sin resultados para "{query}"</p>
                <button type="button" onClick={guardarNuevo}
                  className="w-full bg-[#F5F5F0] hover:bg-black/10 text-[#0A0A0A] text-xs font-medium py-2 px-3 rounded-lg transition-all text-left">
                  ✚ Usar "{query}" y guardar en biblioteca
                </button>
              </div>
            ) : (
              <>
                {sugerencias.map(ej => (
                  <button key={ej.id} type="button" onClick={() => seleccionar(ej)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F5F5F0] transition-all text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0A0A0A] truncate">{ej.nombre}</p>
                      {ej.grupo_muscular && <p className="text-xs text-[#6B6B6B]">{ej.grupo_muscular}{ej.patron ? ` · ${ej.patron.replace(/_/g,' ')}` : ''}</p>}
                    </div>
                    {ej.usos > 0 && <span className="text-xs text-[#6B6B6B] flex-shrink-0">{ej.usos}×</span>}
                  </button>
                ))}
                {query && !sugerencias.find(e => e.nombre.toLowerCase() === query.toLowerCase()) && (
                  <button type="button" onClick={guardarNuevo}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#F5F5F0] border-t border-black/5 transition-all text-left">
                    <span className="text-[#FF5C00] font-bold">+</span>
                    <span className="text-sm text-[#6B6B6B]">Guardar "{query}" en biblioteca</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
