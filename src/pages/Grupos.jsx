import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const TARIFAS = {
  pareja: { 2: { pp: 175, total: 350 }, 3: { pp: 260, total: 520 }, 4: { pp: 340, total: 680 } },
  grupo:  { 3: { pp: 160, total: null } },
}

function getTarifa(tipo, nDias) {
  return TARIFAS[tipo]?.[nDias] || null
}

const initForm = {
  nombre: '', tipo: 'pareja', dias_semana: [], hora: '09:00', duracion_minutos: 60, notas: ''
}

export default function Grupos({ session }) {
  const [grupos,      setGrupos]      = useState([])
  const [clientes,    setClientes]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [sel,         setSel]         = useState(null)   // grupo seleccionado
  const [modal,       setModal]       = useState(false)
  const [editando,    setEditando]    = useState(false)  // editar grupo seleccionado
  const [form,        setForm]        = useState(initForm)
  const [guardando,   setGuardando]   = useState(false)
  const [clienteAdd,  setClienteAdd]  = useState('')
  const [añadiendo,   setAñadiendo]   = useState(false)
  const uid = session?.user?.id

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [{ data: gs }, { data: cs }] = await Promise.all([
      supabase.from('grupos')
        .select('*, grupo_clientes(id, cliente_id, activo, clientes(id, nombre, email, tipo, dias_semana, precio_mensual))')
        .eq('entrenador_id', uid).eq('activo', true).order('created_at'),
      supabase.from('clientes')
        .select('id, nombre, email, tipo, dias_semana, precio_mensual, modalidad, grupo_id')
        .eq('entrenador_id', uid).eq('estado', 'activo').order('nombre'),
    ])
    setGrupos(gs || [])
    setClientes(cs || [])
    if (sel) {
      const updated = (gs || []).find(g => g.id === sel.id)
      if (updated) setSel(updated)
    }
    setLoading(false)
  }

  function abrirNuevo() {
    setForm(initForm); setModal(true)
  }

  function abrirEditar(g) {
    setForm({
      nombre: g.nombre,
      tipo: g.tipo,
      dias_semana: g.dias_semana || [],
      hora: g.hora?.slice(0, 5) || '09:00',
      duracion_minutos: g.duracion_minutos || 60,
      notas: g.notas || '',
    })
    setEditando(true)
  }

  async function guardar() {
    setGuardando(true)
    const tarifa = getTarifa(form.tipo, form.dias_semana.length)
    const payload = {
      entrenador_id: uid,
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      dias_semana: form.dias_semana,
      hora: form.hora,
      duracion_minutos: Number(form.duracion_minutos) || 60,
      precio_por_persona: tarifa?.pp || 0,
      precio_total: tarifa?.total || 0,
      notas: form.notas.trim() || null,
    }
    if (editando && sel) {
      await supabase.from('grupos').update(payload).eq('id', sel.id)
    } else {
      await supabase.from('grupos').insert(payload)
    }
    setModal(false); setEditando(false)
    await cargar(); setGuardando(false)
  }

  async function eliminarGrupo() {
    if (!confirm('¿Eliminar este grupo? Los clientes no se borran.')) return
    await supabase.from('grupos').update({ activo: false }).eq('id', sel.id)
    setSel(null); await cargar()
  }

  async function añadirCliente() {
    if (!clienteAdd || !sel) return
    const miembros = sel.grupo_clientes?.filter(m => m.activo) || []
    const max = sel.tipo === 'pareja' ? 2 : 6
    if (miembros.length >= max) { alert(`Máximo ${max} personas`); return }
    setAñadiendo(true)
    const tarifa = getTarifa(sel.tipo, sel.dias_semana?.length || 0)
    await supabase.from('grupo_clientes').upsert(
      { grupo_id: sel.id, cliente_id: clienteAdd, activo: true },
      { onConflict: 'grupo_id,cliente_id' }
    )
    // Actualizar el cliente con modalidad, grupo_id y precio calculado
    await supabase.from('clientes').update({
      modalidad: sel.tipo === 'pareja' ? 'pareja' : 'grupo',
      grupo_id: sel.id,
      precio_mensual: tarifa?.pp || 0,
    }).eq('id', clienteAdd)
    setClienteAdd(''); await cargar(); setAñadiendo(false)
  }

  async function quitarCliente(gc) {
    await supabase.from('grupo_clientes').update({ activo: false }).eq('id', gc.id)
    // Resetear modalidad del cliente
    await supabase.from('clientes').update({ modalidad: 'individual', grupo_id: null }).eq('id', gc.cliente_id)
    await cargar()
  }

  async function crearSesiones() {
    const miembros = sel.grupo_clientes?.filter(m => m.activo) || []
    if (miembros.length === 0) { alert('Añade clientes primero'); return }
    if (!confirm(`¿Crear sesiones recurrentes para ${miembros.length} miembros?`)) return
    const rows = miembros.map(m => ({
      entrenador_id: uid, cliente_id: m.cliente_id,
      hora: sel.hora, duracion_minutos: sel.duracion_minutos,
      dias_semana: sel.dias_semana, tipo: 'presencial',
      activa: true, grupo_id: sel.id,
    }))
    await supabase.from('sesiones_recurrentes').insert(rows)
    alert('✓ Sesiones creadas en la Agenda')
  }

  const tarifa = getTarifa(form.tipo, form.dias_semana.length)
  const miembrosSel = sel?.grupo_clientes?.filter(m => m.activo) || []
  const maxSel = sel?.tipo === 'pareja' ? 2 : 6
  const tarifaSel = sel ? getTarifa(sel.tipo, sel.dias_semana?.length || 0) : null

  // Clientes que no están ya en este grupo
  const clientesDisponibles = clientes.filter(c =>
    !miembrosSel.some(m => m.cliente_id === c.id)
  )

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex-1 flex overflow-hidden bg-[#F7F6F3]">

      {/* ── COLUMNA IZQUIERDA: Lista ── */}
      <div className={`flex flex-col bg-white border-r border-black/8 ${sel ? 'hidden md:flex md:w-80' : 'flex-1 md:w-80 md:flex-none'}`}>
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-[#0A0A0A] text-lg">Grupos</h1>
            <p className="text-xs text-[#9B9B9B] mt-0.5">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={abrirNuevo}
            className="bg-[#0A0A0A] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#222] transition-all">
            + Nuevo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {grupos.length === 0 && (
            <div className="text-center py-16 px-4">
              <p className="text-4xl mb-3">👥</p>
              <p className="font-semibold text-[#6B6B6B]">Sin grupos todavía</p>
              <p className="text-sm text-[#9B9B9B] mt-1 leading-relaxed">Crea un grupo para gestionar parejas o grupos de entrenamiento con tarifa compartida</p>
              <button onClick={abrirNuevo}
                className="mt-4 bg-[#FF5C00] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#e55200] transition-all">
                Crear primer grupo
              </button>
            </div>
          )}
          {grupos.map(g => {
            const miembros = g.grupo_clientes?.filter(m => m.activo) || []
            const max = g.tipo === 'pareja' ? 2 : 6
            const t = getTarifa(g.tipo, g.dias_semana?.length || 0)
            const activo = sel?.id === g.id
            return (
              <div key={g.id} onClick={() => setSel(g)}
                className={`rounded-2xl p-4 cursor-pointer transition-all border ${activo ? 'border-[#FF5C00] bg-[#FF5C00]/5' : 'bg-white border-black/8 hover:border-black/20 hover:shadow-sm'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{g.tipo === 'pareja' ? '👫' : '👥'}</span>
                    <div>
                      <p className="font-bold text-[#0A0A0A] text-sm">{g.nombre}</p>
                      <p className="text-xs text-[#9B9B9B] capitalize">{g.tipo} · {g.hora?.slice(0,5)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {t && <p className="text-sm font-bold text-[#FF5C00]">{t.pp}€/p</p>}
                    <p className={`text-xs font-medium mt-0.5 ${miembros.length >= max ? 'text-emerald-600' : 'text-[#9B9B9B]'}`}>
                      {miembros.length}/{max} {miembros.length >= max ? '· Completo' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 mb-2.5">
                  {(g.dias_semana || []).map(d => (
                    <span key={d} className="text-xs bg-[#F5F5F0] text-[#6B6B6B] px-2 py-0.5 rounded-lg font-medium">{DIAS[d]}</span>
                  ))}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {miembros.map(m => (
                    <span key={m.id} className="text-xs bg-[#0A0A0A] text-white px-2.5 py-1 rounded-full font-medium">
                      {m.clientes?.nombre?.split(' ')[0]}
                    </span>
                  ))}
                  {miembros.length === 0 && <span className="text-xs text-[#C0C0C0] italic">Sin miembros</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── COLUMNA DERECHA: Detalle ── */}
      {sel ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header detalle */}
          <div className="bg-white border-b border-black/5 px-5 py-4 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setSel(null)} className="md:hidden w-8 h-8 flex items-center justify-center text-[#6B6B6B]">←</button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl">{sel.tipo === 'pareja' ? '👫' : '👥'}</span>
                <h2 className="font-bold text-[#0A0A0A] text-lg">{sel.nombre}</h2>
                <span className="text-xs bg-[#F5F5F0] text-[#6B6B6B] px-2 py-0.5 rounded-lg capitalize">{sel.tipo}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <p className="text-xs text-[#9B9B9B]">{sel.hora?.slice(0,5)} · {sel.duracion_minutos}min</p>
                <div className="flex gap-1">
                  {(sel.dias_semana || []).map(d => (
                    <span key={d} className="text-xs bg-[#F5F5F0] text-[#6B6B6B] px-2 py-0.5 rounded-lg font-medium">{DIAS[d]}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => abrirEditar(sel)}
                className="text-xs border border-black/10 text-[#6B6B6B] px-3 py-1.5 rounded-xl hover:bg-[#F5F5F0] transition-all">
                ✏️ Editar
              </button>
              <button onClick={eliminarGrupo}
                className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-all">
                Eliminar
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 max-w-2xl mx-auto w-full">

            {/* Tarifa */}
            <div className="bg-white rounded-2xl border border-black/8 p-5">
              <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-4">Tarifa mensual</p>
              {tarifaSel ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#F5F5F0] rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-[#0A0A0A]">{tarifaSel.pp}€</p>
                    <p className="text-xs text-[#9B9B9B] mt-0.5">por persona</p>
                  </div>
                  {tarifaSel.total && (
                    <div className="bg-[#FF5C00]/8 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-[#FF5C00]">{tarifaSel.total}€</p>
                      <p className="text-xs text-[#9B9B9B] mt-0.5">total grupo</p>
                    </div>
                  )}
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-emerald-700">{tarifaSel.pp * miembrosSel.length}€</p>
                    <p className="text-xs text-[#9B9B9B] mt-0.5">ingresos reales</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-sm text-amber-700">Selecciona días válidos para calcular la tarifa estándar</p>
                </div>
              )}
              <p className="text-xs text-[#9B9B9B] mt-3">{sel.dias_semana?.length} días/semana · {sel.tipo}</p>
            </div>

            {/* Miembros */}
            <div className="bg-white rounded-2xl border border-black/8 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide">
                  Miembros — {miembrosSel.length}/{maxSel}
                </p>
                {miembrosSel.length >= maxSel && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Completo</span>
                )}
              </div>

              {/* Lista miembros */}
              <div className="space-y-2 mb-4">
                {miembrosSel.length === 0 && (
                  <p className="text-sm text-[#C0C0C0] text-center py-4">Sin miembros — añade clientes abajo</p>
                )}
                {miembrosSel.map(m => (
                  <div key={m.id} className="flex items-center gap-3 bg-[#F7F6F3] rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {m.clientes?.nombre?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A] truncate">{m.clientes?.nombre}</p>
                      <p className="text-xs text-[#9B9B9B]">{m.clientes?.email}</p>
                    </div>
                    {tarifaSel && (
                      <span className="text-xs font-bold text-[#FF5C00] flex-shrink-0">{tarifaSel.pp}€/mes</span>
                    )}
                    <button onClick={() => quitarCliente(m)}
                      className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 px-2.5 py-1 rounded-lg transition-all flex-shrink-0">
                      Quitar
                    </button>
                  </div>
                ))}
              </div>

              {/* Añadir cliente */}
              {miembrosSel.length < maxSel && (
                <div className="flex gap-2">
                  <select value={clienteAdd} onChange={e => setClienteAdd(e.target.value)}
                    className="flex-1 border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#FF5C00]">
                    <option value="">— Añadir cliente al grupo —</option>
                    {clientesDisponibles.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  <button onClick={añadirCliente} disabled={!clienteAdd || añadiendo}
                    className="bg-[#0A0A0A] text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40 hover:bg-[#222] transition-all flex-shrink-0">
                    {añadiendo ? '...' : 'Añadir'}
                  </button>
                </div>
              )}
            </div>

            {/* Agenda */}
            <div className="bg-white rounded-2xl border border-black/8 p-5">
              <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-2">Programación</p>
              <p className="text-sm text-[#6B6B6B] mb-4">
                Crea sesiones recurrentes para todos los miembros. Aparecerán en la Agenda agrupadas bajo el nombre del grupo.
              </p>
              <button onClick={crearSesiones}
                className="w-full border border-[#0A0A0A] text-[#0A0A0A] text-sm font-semibold py-3 rounded-xl hover:bg-[#0A0A0A] hover:text-white transition-all">
                📅 Crear sesiones recurrentes en la Agenda
              </button>
            </div>

            {/* Notas */}
            {sel.notas && (
              <div className="bg-white rounded-2xl border border-black/8 p-5">
                <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-2">Notas</p>
                <p className="text-sm text-[#444] leading-relaxed">{sel.notas}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-3">👈</p>
            <p className="text-[#9B9B9B]">Selecciona un grupo</p>
          </div>
        </div>
      )}

      {/* ── MODAL CREAR/EDITAR ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => { setModal(false); setEditando(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[#0A0A0A] mb-5">{editando ? `Editar — ${sel?.nombre}` : 'Nuevo grupo'}</h2>
            <div className="space-y-4">

              {/* Nombre */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Nombre</label>
                <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                  placeholder="Ej: Pareja Lunes/Miércoles · Ana y Carlos"
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
              </div>

              {/* Tipo */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Modalidad</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['pareja', '👫', 'Pareja', 'Máx. 2 personas', '2-4 días/sem'],
                    ['grupo',  '👥', 'Grupo',  '3 a 6 personas',  'Solo 3 días/sem'],
                  ].map(([v, ic, l, sub, info]) => (
                    <button key={v} type="button"
                      onClick={() => setForm({...form, tipo: v, dias_semana: []})}
                      className={`py-3 px-3 rounded-xl border text-left transition-all ${form.tipo===v ? 'border-[#FF5C00] bg-[#FF5C00]/5' : 'border-black/10 hover:border-black/20'}`}>
                      <p className="text-xl mb-1">{ic}</p>
                      <p className={`text-sm font-bold ${form.tipo===v ? 'text-[#FF5C00]' : 'text-[#0A0A0A]'}`}>{l}</p>
                      <p className="text-xs text-[#9B9B9B] mt-0.5">{sub}</p>
                      <p className="text-xs text-[#C0C0C0] mt-0.5">{info}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Días */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">
                  Días de entrenamiento
                  {form.tipo === 'grupo' && <span className="text-amber-600 ml-1">(exactamente 3 días)</span>}
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {[1,2,3,4,5,6,7].map(d => {
                    const sel2 = form.dias_semana.includes(d)
                    const maxD = form.tipo === 'grupo' ? 3 : 4
                    const disabled = !sel2 && form.dias_semana.length >= maxD
                    return (
                      <button key={d} type="button" disabled={disabled}
                        onClick={() => {
                          const curr = form.dias_semana
                          setForm({...form, dias_semana: sel2 ? curr.filter(x=>x!==d) : [...curr,d].sort()})
                        }}
                        className={`py-2 rounded-xl text-xs font-semibold transition-all ${sel2 ? 'text-white' : 'border border-black/10 text-[#6B6B6B]'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                        style={sel2 ? {background:'#0A0A0A'} : {}}>
                        {DIAS[d]}
                      </button>
                    )
                  })}
                </div>
                {tarifa && (
                  <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between">
                    <p className="text-xs text-emerald-700">{form.dias_semana.length} días/sem · {form.tipo}</p>
                    <p className="text-sm font-bold text-emerald-700">
                      {tarifa.pp}€/p{tarifa.total ? ` · ${tarifa.total}€ total` : ''}
                    </p>
                  </div>
                )}
                {form.dias_semana.length > 0 && !tarifa && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <p className="text-xs text-amber-700">Esta combinación no tiene tarifa estándar — el precio se ajustará manualmente</p>
                  </div>
                )}
              </div>

              {/* Hora y duración */}
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
                  rows={2} placeholder="Ej: amigos del trabajo, nivel intermedio…"
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"/>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setModal(false); setEditando(false) }}
                  className="flex-1 border border-black/10 text-[#6B6B6B] text-sm font-medium py-3 rounded-xl hover:bg-[#F5F5F0]">
                  Cancelar
                </button>
                <button onClick={guardar}
                  disabled={!form.nombre.trim() || form.dias_semana.length === 0 || guardando}
                  className="flex-1 bg-[#0A0A0A] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 hover:bg-[#222] transition-all">
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear grupo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
