import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { AREAS, NOMBRE_SERVICIO, ICONO_SERVICIO, hayAreas } from '../../lib/servicios'

// Historial clínico y observaciones de un cliente (función "historial" de la ficha del centro).
// Lo ve y escribe todo el equipo del centro; el cliente no lo ve en su portal.
const TIPOS = { observacion: '📝 Observación', medico: '🩺 Médico' }
const hoy = () => new Date().toLocaleDateString('sv-SE')
const vacio = () => ({ tipo: 'observacion', area: '', fecha: hoy(), texto: '' })

async function nombreAutor(uid) {
  const { data: m } = await supabase.from('miembros_centro').select('nombre').eq('user_id', uid).eq('activo', true).limit(1).maybeSingle()
  if (m?.nombre) return m.nombre
  const { data: c } = await supabase.from('configuracion').select('nombre_entrenador').eq('entrenador_id', uid).maybeSingle()
  return c?.nombre_entrenador || null
}

export default function HistorialClinico({ cliente, uid, onToast }) {
  const [entradas, setEntradas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState('')

  async function cargar() {
    setCargando(true)
    const { data, error } = await supabase.from('historial_clinico').select('*')
      .eq('cliente_id', cliente.id).order('fecha', { ascending: false }).order('created_at', { ascending: false })
    if (error) onToast?.('No se pudo cargar el historial', 'error')
    setEntradas(data || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [cliente.id])

  async function guardar() {
    if (!form.texto.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('historial_clinico').insert({
      entrenador_id: cliente.entrenador_id, cliente_id: cliente.id,
      tipo: form.tipo, area: form.area || null, fecha: form.fecha || hoy(),
      texto: form.texto.trim(), autor_id: uid, autor_nombre: await nombreAutor(uid),
    })
    setGuardando(false)
    if (error) { onToast?.('No se pudo guardar la entrada', 'error'); return }
    setForm(vacio()); onToast?.('Entrada añadida'); cargar()
  }

  async function borrar(id) {
    if (!window.confirm('¿Borrar esta entrada del historial?')) return
    const { error } = await supabase.from('historial_clinico').delete().eq('id', id)
    if (error) { onToast?.('No se pudo borrar', 'error'); return }
    setEntradas(e => e.filter(x => x.id !== id))
  }

  const antecedentes = [['⚠ Lesiones', cliente.lesiones], ['Enfermedades', cliente.enfermedades], ['Medicación', cliente.medicacion]].filter(([, v]) => v)
  const visibles = filtro ? entradas.filter(e => e.tipo === filtro) : entradas

  return (
    <div className="space-y-4">
      <div className="bg-red-50/60 border border-red-100 rounded-2xl p-4">
        <p className="text-xs font-semibold text-red-700 mb-2">Antecedentes</p>
        {antecedentes.length ? antecedentes.map(([l, v]) => (
          <p key={l} className="text-sm text-[#0A0A0A] mb-1"><span className="font-semibold">{l}:</span> {v}</p>
        )) : <p className="text-sm text-[#6B6B6B]">Sin lesiones, enfermedades ni medicación registradas.</p>}
        <p className="text-[11px] text-[#9B9B9B] mt-2">Se editan en ✏️ Editar cliente.</p>
      </div>

      <div className="bg-white border border-black/5 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-[#6B6B6B]">Nueva entrada</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(TIPOS).map(([id, l]) => (
            <button key={id} type="button" onClick={() => setForm(f => ({ ...f, tipo: id }))}
              className={`py-2 rounded-xl border text-xs font-semibold transition-all ${form.tipo === id ? 'bg-acento border-acento text-white' : 'border-black/10 text-[#0A0A0A]'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            className="flex-1 border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-acento" />
          {hayAreas && (
            <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
              className="flex-1 border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-acento bg-white">
              <option value="">Sin área</option>
              {AREAS.map(a => <option key={a} value={a}>{ICONO_SERVICIO[a]} {NOMBRE_SERVICIO[a]}</option>)}
            </select>
          )}
        </div>
        <textarea value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} rows={3}
          placeholder={form.tipo === 'medico' ? 'Diagnóstico, pruebas, tratamiento, informe…' : 'Observaciones de la sesión, evolución…'}
          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-acento resize-none" />
        <button onClick={guardar} disabled={!form.texto.trim() || guardando}
          className="w-full bg-acento text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Añadir al historial'}
        </button>
      </div>

      <div className="flex gap-1.5">
        {[['', 'Todo'], ...Object.entries(TIPOS)].map(([id, l]) => (
          <button key={id} onClick={() => setFiltro(id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filtro === id ? 'bg-[#0A0A0A] text-white' : 'bg-[#F5F5F0] text-[#6B6B6B]'}`}>{l}</button>
        ))}
      </div>

      {cargando ? <p className="text-sm text-[#9B9B9B] text-center py-4">Cargando…</p>
        : !visibles.length ? <p className="text-sm text-[#6B6B6B] text-center py-4">Sin entradas en el historial</p>
        : (
          <div className="space-y-2">
            {visibles.map(e => (
              <div key={e.id} className={`border rounded-xl p-3 ${e.tipo === 'medico' ? 'border-red-100 bg-red-50/30' : 'border-black/5'}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-[#0A0A0A]">
                    {TIPOS[e.tipo]}{e.area ? ` · ${ICONO_SERVICIO[e.area]} ${NOMBRE_SERVICIO[e.area]}` : ''}
                  </p>
                  <button onClick={() => borrar(e.id)} className="text-[#C0C0C0] hover:text-red-500 text-sm" title="Borrar">×</button>
                </div>
                <p className="text-sm text-[#0A0A0A] whitespace-pre-wrap">{e.texto}</p>
                <p className="text-[11px] text-[#9B9B9B] mt-1.5">
                  {new Date(e.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {e.autor_nombre ? ` · ${e.autor_nombre}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
