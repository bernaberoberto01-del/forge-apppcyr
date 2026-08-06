import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DIAS_LABEL = ['','Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

// Tarifas según modalidad y días
const TARIFAS = {
  pareja: {
    2: { total: 350, pp: 175 },
    3: { total: 520, pp: 260 },
    4: { total: 680, pp: 340 },
  },
  grupo: {
    3: { total: null, pp: 160 }, // solo 3 días
  }
}

function getPrecio(tipo, dias) {
  const t = TARIFAS[tipo]?.[dias]
  if (!t) return null
  return t
}

const initForm = {
  nombre: '', tipo: 'pareja', dias_semana: [], hora: '09:00',
  duracion_minutos: 60, notas: ''
}

export default function Grupos({ session }) {
  const [grupos,     setGrupos]     = useState([])
  const [clientes,   setClientes]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [editId,     setEditId]     = useState(null)
  const [form,       setForm]       = useState(initForm)
  const [guardando,  setGuardando]  = useState(false)
  const [grupoSel,   setGrupoSel]   = useState(null) // panel detalle
  const [addingCli,  setAddingCli]  = useState(false)
  const [clienteAdd, setClienteAdd] = useState('')
  const uid = session?.user?.id

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [{ data: gs }, { data: cs }] = await Promise.all([
      supabase.from('grupos').select(`
        *, grupo_clientes(id, cliente_id, activo, clientes(id, nombre, email, tipo))
      `).eq('entrenador_id', uid).eq('activo', true).order('created_at'),
      supabase.from('clientes').select('id, nombre, email, tipo').eq('entrenador_id', uid).eq('estado', 'activo').order('nombre'),
    ])
    setGrupos(gs || [])
    setClientes(cs || [])
    // Refrescar el grupo seleccionado si existe
    if (grupoSel) {
      const updated = (gs || []).find(g => g.id === grupoSel.id)
      if (updated) setGrupoSel(updated)
    }
    setLoading(false)
  }

  function abrirNuevo() {
    setEditId(null); setForm(initForm); setModal(true)
  }
  function abrirEditar(g) {
    setEditId(g.id)
    setForm({ nombre: g.nombre, tipo: g.tipo, dias_semana: g.dias_semana || [],
      hora: g.hora?.slice(0,5) || '09:00', duracion_minutos: g.duracion_minutos || 60, notas: g.notas || '' })
    setModal(true)
  }

  async function guardar() {
    if (!form.nombre.trim() || form.dias_semana.length === 0 || !form.hora) return
    setGuardando(true)
    const precio = getPrecio(form.tipo, form.dias_semana.length)
    const payload = {
      entrenador_id: uid,
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      dias_semana: form.dias_semana,
      hora: form.hora,
      duracion_minutos: Number(form.duracion_minutos) || 60,
      precio_por_persona: precio?.pp || 0,
      precio_total: precio?.total || 0,
      notas: form.notas.trim() || null,
    }
    if (editId) await supabase.from('grupos').update(payload).eq('id', editId)
    else await supabase.from('grupos').insert(payload)
    setModal(false); setEditId(null); setForm(initForm)
    await cargar(); setGuardando(false)
  }

  async function eliminarGrupo(id) {
    if (!confirm('¿Eliminar este grupo? Los clientes no se borran.')) return
    await supabase.from('grupos').update({ activo: false }).eq('id', id)
    if (grupoSel?.id === id) setGrupoSel(null)
    await cargar()
  }

  async function addClienteGrupo() {
    if (!clienteAdd || !grupoSel) return
    setAddingCli(true)
    const miembros = grupoSel.grupo_clientes?.filter(m => m.activo) || []
    const maxP = grupoSel.tipo === 'pareja' ? 2 : 6
    if (miembros.length >= maxP) {
      alert(`Máximo ${maxP} personas para ${grupoSel.tipo === 'pareja' ? 'pareja' : 'grupo'}`)
      setAddingCli(false); return
    }
    await supabase.from('grupo_clientes').upsert({
      grupo_id: grupoSel.id, cliente_id: clienteAdd, activo: true
    }, { onConflict: 'grupo_id,cliente_id' })
    setClienteAdd(''); await cargar(); setAddingCli(false)
  }

  async function quitarCliente(gcId) {
    await supabase.from('grupo_clientes').update({ activo: false }).eq('id', gcId)
    await cargar()
  }

  // ── Crear sesiones recurrentes para el grupo ──────────────────────────────
  async function crearSesionesGrupo(g) {
    const miembros = g.grupo_clientes?.filter(m => m.activo) || []
    if (miembros.length === 0) { alert('Añade clientes al grupo primero'); return }
    if (!confirm(`¿Crear sesiones recurrentes para los ${miembros.length} miembros del grupo?`)) return

    const rows = miembros.map(m => ({
      entrenador_id: uid,
      cliente_id: m.cliente_id,
      hora: g.hora,
      duracion_minutos: g.duracion_minutos,
      dias_semana: g.dias_semana,
      tipo: 'presencial',
      activa: true,
    }))
    const { error } = await supabase.from('sesiones_recurrentes').insert(rows)
    if (error) alert('Error: ' + error.message)
    else alert('✓ Sesiones recurrentes creadas en la Agenda')
  }

  const precio = getPrecio(form.tipo, form.dias_semana.length)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="flex-1 flex overflow-hidden">

      {/* ── LISTA GRUPOS ── */}
      <div className={`flex flex-col ${grupoSel ? 'hidden md:flex md:w-80 md:border-r md:border-black/8' : 'flex-1'}`}>
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-[#0A0A0A] text-lg">Grupos</h1>
            <p className="text-xs text-[#9B9B9B] mt-0.5">Parejas y grupos de entrenamiento</p>
          </div>
          <button onClick={abrirNuevo}
            className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl bg-[#0A0A0A] hover:bg-[#222] transition-all">
            + Nuevo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {grupos.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🏃</p>
              <p className="text-[#6B6B6B] font-medium">Sin grupos todavía</p>
              <p className="text-sm text-[#9B9B9B] mt-1">Crea un grupo para entrenar parejas o grupos pequeños</p>
            </div>
          )}
          {grupos.map(g => {
            const miembros = g.grupo_clientes?.filter(m => m.activo) || []
            const maxP = g.tipo === 'pareja' ? 2 : 6
            const lleno = miembros.length >= maxP
            const precio = getPrecio(g.tipo, g.dias_semana?.length || 0)
            return (
              <div key={g.id} onClick={() => setGrupoSel(g)}
                className={`bg-white border rounded-2xl p-4 cursor-pointer hover:shadow-sm transition-all ${grupoSel?.id === g.id ? 'border-[#FF5C00] ring-1 ring-[#FF5C00]/20' : 'border-black/8'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{g.tipo === 'pareja' ? '👫' : '👥'}</span>
                      <p className="font-bold text-[#0A0A0A]">{g.nombre}</p>
                    </div>
                    <p className="text-xs text-[#9B9B9B] mt-0.5 capitalize">{g.tipo} · {g.hora?.slice(0,5)}</p>
                  </div>
                  <div className="text-right">
                    {precio && <p className="text-sm font-bold text-[#FF5C00]">{precio.pp}€/p</p>}
                    <p className={`text-xs mt-0.5 font-semibold ${lleno ? 'text-emerald-600' : 'text-[#9B9B9B]'}`}>
                      {miembros.length}/{maxP} {lleno ? '· Completo' : ''}
                    </p>
                  </div>
                </div>
                {/* Días */}
                <div className="flex gap-1 mb-3">
                  {(g.dias_semana || []).map(d => (
                    <span key={d} className="text-xs bg-[#F5F5F0] text-[#6B6B6B] px-2 py-0.5 rounded-lg font-medium">{DIAS_LABEL[d]}</span>
                  ))}
                </div>
                {/* Miembros */}
                <div className="flex gap-2 flex-wrap">
                  {miembros.map(m => (
                    <span key={m.id} className="text-xs bg-[#0A0A0A] text-white px-2.5 py-1 rounded-full font-medium">
                      {m.clientes?.nombre?.split(' ')[0]}
                    </span>
                  ))}
                  {miembros.length === 0 && <span className="text-xs text-[#C0C0C0]">Sin miembros aún</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── DETALLE GRUPO ── */}
      {grupoSel && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-black/5 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setGrupoSel(null)} className="md:hidden w-8 h-8 flex items-center justify-center text-[#6B6B6B] text-lg">←</button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{grupoSel.tipo === 'pareja' ? '👫' : '👥'}</span>
                <h2 className="font-bold text-[#0A0A0A] text-lg">{grupoSel.nombre}</h2>
                <span className="text-xs bg-[#F5F5F0] text-[#6B6B6B] px-2 py-0.5 rounded-lg capitalize">{grupoSel.tipo}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-[#9B9B9B]">{grupoSel.hora?.slice(0,5)} · {grupoSel.duracion_minutos}min</p>
                <div className="flex gap-1">
                  {(grupoSel.dias_semana || []).map(d => (
                    <span key={d} className="text-xs bg-[#F5F5F0] text-[#6B6B6B] px-2 py-0.5 rounded-lg font-medium">{DIAS_LABEL[d]}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => abrirEditar(grupoSel)} className="text-xs border border-black/10 text-[#6B6B6B] px-3 py-1.5 rounded-xl hover:bg-[#F5F5F0]">Editar</button>
              <button onClick={() => eliminarGrupo(grupoSel.id)} className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-xl hover:bg-red-50">Eliminar</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Tarifa */}
            {(() => {
              const p = getPrecio(grupoSel.tipo, grupoSel.dias_semana?.length || 0)
              const miembros = grupoSel.grupo_clientes?.filter(m => m.activo) || []
              return p ? (
                <div className="bg-[#F5F5F0] rounded-2xl p-4">
                  <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wide mb-3">Tarifa</p>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-2xl font-bold text-[#0A0A0A]">{p.pp}€</p>
                      <p className="text-xs text-[#9B9B9B]">por persona / mes</p>
                    </div>
                    {p.total && (
                      <>
                        <div className="w-px bg-black/10"/>
                        <div>
                          <p className="text-2xl font-bold text-[#FF5C00]">{p.total}€</p>
                          <p className="text-xs text-[#9B9B9B]">total grupo / mes</p>
                        </div>
                      </>
                    )}
                    <div className="w-px bg-black/10"/>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{p.pp * miembros.length}€</p>
                      <p className="text-xs text-[#9B9B9B]">ingresos reales ({miembros.length} miembros)</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#9B9B9B] mt-2">{grupoSel.dias_semana?.length} días/semana · {grupoSel.tipo}</p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-sm text-amber-700">⚠️ Selecciona días válidos para calcular la tarifa</p>
                </div>
              )
            })()}

            {/* Miembros */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wide">
                  Miembros ({(grupoSel.grupo_clientes?.filter(m=>m.activo)||[]).length}/{grupoSel.tipo==='pareja'?2:6})
                </p>
              </div>
              <div className="space-y-2 mb-3">
                {(grupoSel.grupo_clientes?.filter(m=>m.activo)||[]).map(m => (
                  <div key={m.id} className="bg-white border border-black/8 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#0A0A0A]">{m.clientes?.nombre}</p>
                      <p className="text-xs text-[#9B9B9B]">{m.clientes?.email}</p>
                    </div>
                    <button onClick={() => quitarCliente(m.id)}
                      className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 px-2.5 py-1 rounded-lg transition-all">
                      Quitar
                    </button>
                  </div>
                ))}
                {(grupoSel.grupo_clientes?.filter(m=>m.activo)||[]).length === 0 && (
                  <p className="text-sm text-[#C0C0C0] text-center py-4">Sin miembros — añade clientes</p>
                )}
              </div>
              {/* Añadir cliente */}
              {(grupoSel.grupo_clientes?.filter(m=>m.activo)||[]).length < (grupoSel.tipo==='pareja'?2:6) && (
                <div className="flex gap-2">
                  <select value={clienteAdd} onChange={e => setClienteAdd(e.target.value)}
                    className="flex-1 border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#FF5C00]">
                    <option value="">— Selecciona un cliente —</option>
                    {clientes
                      .filter(c => !(grupoSel.grupo_clientes?.filter(m=>m.activo)||[]).some(m=>m.cliente_id===c.id))
                      .map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)
                    }
                  </select>
                  <button onClick={addClienteGrupo} disabled={!clienteAdd || addingCli}
                    className="bg-[#0A0A0A] text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40 hover:bg-[#222] transition-all">
                    {addingCli ? '...' : 'Añadir'}
                  </button>
                </div>
              )}
            </div>

            {/* Crear sesiones en agenda */}
            <div className="bg-white border border-black/8 rounded-2xl p-4">
              <p className="font-semibold text-[#0A0A0A] mb-1">Programar en la agenda</p>
              <p className="text-xs text-[#9B9B9B] mb-3">Crea sesiones recurrentes para todos los miembros del grupo en los días y hora configurados.</p>
              <button onClick={() => crearSesionesGrupo(grupoSel)}
                className="w-full border border-[#0A0A0A] text-[#0A0A0A] text-sm font-semibold py-2.5 rounded-xl hover:bg-[#0A0A0A] hover:text-white transition-all">
                📅 Crear sesiones recurrentes
              </button>
            </div>

            {/* Notas */}
            {grupoSel.notas && (
              <div className="bg-[#F5F5F0] rounded-2xl p-4">
                <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wide mb-1">Notas</p>
                <p className="text-sm text-[#444]">{grupoSel.notas}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL CREAR/EDITAR ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[#0A0A0A] mb-4">{editId ? 'Editar grupo' : 'Nuevo grupo'}</h2>
            <div className="space-y-4">

              {/* Nombre */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Nombre del grupo</label>
                <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                  placeholder="Ej: Pareja Lunes/Miércoles"
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
              </div>

              {/* Tipo */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Modalidad</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['pareja','👫 Pareja','Máx. 2 personas'],['grupo','👥 Grupo','3 a 6 personas']].map(([v,l,sub])=>(
                    <button key={v} type="button" onClick={() => setForm({...form, tipo: v, dias_semana: []})}
                      className={`py-3 px-3 rounded-xl border text-left transition-all ${form.tipo===v?'border-[#FF5C00] bg-[#FF5C00]/5':'border-black/10 hover:border-black/20'}`}>
                      <p className={`text-sm font-semibold ${form.tipo===v?'text-[#FF5C00]':'text-[#0A0A0A]'}`}>{l}</p>
                      <p className="text-xs text-[#9B9B9B] mt-0.5">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Días */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">
                  Días de entrenamiento
                  {form.tipo === 'grupo' && <span className="text-amber-600 ml-1">(solo 3 días para grupo)</span>}
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {[1,2,3,4,5,6,7].map(d => {
                    const sel = form.dias_semana.includes(d)
                    const maxDias = form.tipo === 'grupo' ? 3 : 4
                    const disabled = !sel && form.dias_semana.length >= maxDias
                    return (
                      <button key={d} type="button" disabled={disabled}
                        onClick={() => {
                          const curr = form.dias_semana
                          setForm({...form, dias_semana: sel ? curr.filter(x=>x!==d) : [...curr, d].sort()})
                        }}
                        className={`py-2 rounded-xl text-xs font-semibold transition-all ${sel?'text-white':'border border-black/10 text-[#6B6B6B]'} ${disabled?'opacity-30 cursor-not-allowed':''}`}
                        style={sel?{background:'#0A0A0A'}:{}}>
                        {DIAS_LABEL[d]}
                      </button>
                    )
                  })}
                </div>
                {/* Preview tarifa */}
                {precio && (
                  <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between">
                    <p className="text-xs text-emerald-700 font-semibold">{form.dias_semana.length} días/sem</p>
                    <p className="text-xs text-emerald-700 font-bold">
                      {precio.pp}€/persona{precio.total ? ` · ${precio.total}€ total` : ''}
                    </p>
                  </div>
                )}
                {form.dias_semana.length > 0 && !precio && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <p className="text-xs text-amber-700">Combinación sin tarifa estándar — ajusta manual en Pagos</p>
                  </div>
                )}
              </div>

              {/* Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Hora</label>
                  <input type="time" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Duración (min)</label>
                  <input type="number" value={form.duracion_minutos} onChange={e => setForm({...form, duracion_minutos: e.target.value})}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Notas (opcional)</label>
                <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                  rows={2} placeholder="Ej: amigos del trabajo, nivel intermedio..."
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"/>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setModal(false)}
                  className="flex-1 border border-black/10 text-[#6B6B6B] text-sm font-medium py-2.5 rounded-xl hover:bg-[#F5F5F0]">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={!form.nombre.trim() || form.dias_semana.length === 0 || guardando}
                  className="flex-1 bg-[#0A0A0A] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40 hover:bg-[#222] transition-all">
                  {guardando ? 'Guardando...' : editId ? 'Guardar cambios' : 'Crear grupo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
