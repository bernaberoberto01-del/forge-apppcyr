import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const OBJ = {
  perdida_grasa: { label: 'Pérdida de grasa', color: 'bg-orange-50 text-orange-700' },
  ganancia_muscular: { label: 'Ganancia muscular', color: 'bg-violet-50 text-violet-700' },
  tonificacion: { label: 'Tonificación', color: 'bg-green-50 text-green-700' },
  fuerza: { label: 'Fuerza', color: 'bg-blue-50 text-blue-700' },
  rendimiento: { label: 'Rendimiento', color: 'bg-cyan-50 text-cyan-700' },
  salud_general: { label: 'Salud general', color: 'bg-emerald-50 text-emerald-700' },
  cambio_rapido_30dias: { label: 'Cambio 30 días', color: 'bg-red-50 text-red-700' },
}
const OBJETIVOS_LIST = Object.entries(OBJ)
const initForm = { nombre:'',email:'',telefono:'',objetivo:'perdida_grasa',tipo:'presencial',estado:'activo',peso_actual:'',peso_objetivo:'',nivel:'principiante',dias_semana:3,material:'gimnasio',lesiones:'',notas:'',precio_mensual:'' }
const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const AVATAR_COLORS = ['#FF5C00','#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#8b5cf6','#14b8a6','#f97316','#06b6d4']
const avatarColor = (nombre) => AVATAR_COLORS[(nombre||'').charCodeAt(0) % AVATAR_COLORS.length]
const PER_PAGE = 20

export default function Clientes({ session }) {
  const [clientes, setClientes] = useState([])
  const [cuestionarios, setCuestionarios] = useState([])
  const [checkins, setCheckins] = useState([])
  const [pagos, setPagos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroObj, setFiltroObj] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  const [modal, setModal] = useState(false)
  const [modalRegistros, setModalRegistros] = useState(false)
  const [modalEnlace, setModalEnlace] = useState(false)
  const [form, setForm] = useState(initForm)
  const [editId, setEditId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [dTab, setDTab] = useState('resumen')
  const [dData, setDData] = useState({})
  const [loading, setLoading] = useState(false)
  const uid = session.user.id
  const enlaceRegistro = `${window.location.origin}/registro?e=${uid}`

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const hace10 = new Date(Date.now() - 10 * 864e5).toISOString().split('T')[0]
    const [{ data: cl }, { data: cu }, { data: ci }, { data: pg }] = await Promise.all([
      supabase.from('clientes').select('*').eq('entrenador_id', uid).order('created_at', { ascending: false }),
      supabase.from('cuestionarios').select('*').eq('entrenador_id', uid).eq('procesado', false).order('created_at', { ascending: false }),
      supabase.from('checkins').select('cliente_id,fecha').eq('entrenador_id', uid).gte('fecha', hace10),
      supabase.from('pagos').select('cliente_id,valido_hasta').eq('entrenador_id', uid),
    ])
    setClientes(cl || [])
    setCuestionarios(cu || [])
    setCheckins(ci || [])
    setPagos(pg || [])
  }

  // Calcular alertas por cliente
  const alertas = useMemo(() => {
    const map = {}
    const hace7 = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0]
    const hoy = new Date().toISOString().split('T')[0]
    clientes.forEach(c => {
      const tieneCI = checkins.some(x => x.cliente_id === c.id)
      const pagoVencido = pagos.some(x => x.cliente_id === c.id && x.valido_hasta && x.valido_hasta < hoy)
      map[c.id] = { sinCI: !tieneCI && c.estado === 'activo', pagoVencido }
    })
    return map
  }, [clientes, checkins, pagos])

  // Filtrado y búsqueda
  const filtrados = useMemo(() => {
    let r = [...clientes]
    if (busqueda) {
      const b = busqueda.toLowerCase()
      r = r.filter(c => c.nombre?.toLowerCase().includes(b) || c.email?.toLowerCase().includes(b) || c.telefono?.includes(b))
    }
    if (filtroTipo === 'presencial') r = r.filter(c => c.tipo === 'presencial')
    if (filtroTipo === 'online') r = r.filter(c => c.tipo === 'online')
    if (filtroTipo === 'activos') r = r.filter(c => c.estado === 'activo')
    if (filtroTipo === 'sinCI') r = r.filter(c => alertas[c.id]?.sinCI)
    if (filtroTipo === 'vencidos') r = r.filter(c => alertas[c.id]?.pagoVencido)
    if (filtroObj) r = r.filter(c => c.objetivo === filtroObj)
    return r
  }, [clientes, busqueda, filtroTipo, filtroObj, alertas])

  const totalPaginas = Math.ceil(filtrados.length / PER_PAGE)
  const paginados = filtrados.slice((pagina - 1) * PER_PAGE, pagina * PER_PAGE)

  const stats = useMemo(() => ({
    activos: clientes.filter(c => c.estado === 'activo').length,
    ingresos: pagos.filter(p => {
      const d = new Date(); const inicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
      return p.fecha_pago >= inicio
    }).reduce((s, p) => s + Number(p.importe || 0), 0),
    sinCI: Object.values(alertas).filter(a => a.sinCI).length,
    vencidos: Object.values(alertas).filter(a => a.pagoVencido).length,
  }), [clientes, pagos, alertas])

  async function guardar() {
    setLoading(true)
    const p = { ...form, entrenador_id: uid, peso_actual: form.peso_actual ? Number(form.peso_actual) : null, peso_objetivo: form.peso_objetivo ? Number(form.peso_objetivo) : null, precio_mensual: Number(form.precio_mensual) || 0 }
    if (editId) await supabase.from('clientes').update(p).eq('id', editId)
    else await supabase.from('clientes').insert(p)
    setModal(false); setEditId(null); setForm(initForm)
    await cargar(); setLoading(false)
  }

  async function convertirCuestionario(c, tipoOverride) {
    const { data: cliente, error } = await supabase.from('clientes').insert({
      entrenador_id: uid, nombre: c.nombre, email: c.email, telefono: c.telefono,
      objetivo: c.objetivo, tipo: tipoOverride || c.tipo || 'presencial',
      estado: 'activo', peso_actual: c.peso_actual, nivel: c.nivel,
      dias_semana: c.dias_semana, material: c.material, lesiones: c.lesiones,
      notas: `Edad: ${c.edad||'—'} | Altura: ${c.altura||'—'}cm | Motivación: ${c.motivacion||'—'}`,
      precio_mensual: 0
    }).select().single()
    if (error) { alert('Error: ' + error.message); return }
    if (cliente) {
      await supabase.from('cuestionarios').update({ cliente_id: cliente.id, procesado: true }).eq('id', c.id)
      await cargar()
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    await cargar(); setDetalle(null)
  }

  async function abrirDetalle(c) {
    setDetalle(c); setDTab('resumen')
    const [{ data: ci }, { data: pg }, { data: se }] = await Promise.all([
      supabase.from('checkins').select('*').eq('cliente_id', c.id).order('fecha', { ascending: false }),
      supabase.from('pagos').select('*').eq('cliente_id', c.id).order('fecha_pago', { ascending: false }),
      supabase.from('sesiones').select('*').eq('cliente_id', c.id).order('fecha', { ascending: false }),
    ])
    setDData({ checkins: ci||[], pagos: pg||[], sesiones: se||[] })
  }

  function abrirEditar(c) {
    setForm({ nombre:c.nombre||'', email:c.email||'', telefono:c.telefono||'', objetivo:c.objetivo||'perdida_grasa', tipo:c.tipo||'presencial', estado:c.estado||'activo', peso_actual:c.peso_actual||'', peso_objetivo:c.peso_objetivo||'', nivel:c.nivel||'principiante', dias_semana:c.dias_semana||3, material:c.material||'gimnasio', lesiones:c.lesiones||'', notas:c.notas||'', precio_mensual:c.precio_mensual||'' })
    setEditId(c.id); setModal(true); setDetalle(null)
  }

  const Chip = ({ label, value, field, count }) => {
    const active = field === 'tipo' ? filtroTipo === value : filtroObj === value
    return (
      <button onClick={() => {
        if (field === 'tipo') { setFiltroTipo(active ? 'todos' : value); setPagina(1) }
        else { setFiltroObj(active ? '' : value); setPagina(1) }
      }}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${active ? 'bg-[#FF5C00] text-white' : 'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
        {label}{count !== undefined ? ` (${count})` : ''}
      </button>
    )
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Clientes</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">{clientes.length} clientes · {stats.activos} activos</p>
        </div>
        <div className="flex gap-2">
          {cuestionarios.length > 0 && (
            <button onClick={() => setModalRegistros(true)}
              className="relative border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium px-3 py-2 rounded-xl">
              📋 {cuestionarios.length} nuevo{cuestionarios.length > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={() => { setForm(initForm); setEditId(null); setModal(true) }}
            className="bg-[#FF5C00] hover:bg-[#E05200] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95">
            + Nuevo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Activos', value: stats.activos, color: '#FF5C00', filtro: 'activos' },
          { label: 'Ingresos mes', value: `${stats.ingresos}€`, color: '#10b981', filtro: null },
          { label: 'Sin seguimiento', value: stats.sinCI, color: '#f59e0b', filtro: 'sinCI' },
          { label: 'Pago vencido', value: stats.vencidos, color: '#ef4444', filtro: 'vencidos' },
        ].map(s => (
          <div key={s.label} onClick={() => s.filtro && (setFiltroTipo(filtroTipo === s.filtro ? 'todos' : s.filtro), setPagina(1))}
            className={`bg-white rounded-2xl border border-black/5 shadow-sm p-4 ${s.filtro ? 'cursor-pointer hover:shadow-md' : ''} transition-all`}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[#6B6B6B] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
        <input
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] transition-colors"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#0A0A0A]">×</button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <Chip field="tipo" label="Todos" value="todos" count={clientes.length} />
        <Chip field="tipo" label="Presencial" value="presencial" count={clientes.filter(c=>c.tipo==='presencial').length} />
        <Chip field="tipo" label="Online" value="online" count={clientes.filter(c=>c.tipo==='online').length} />
        <div className="w-px bg-black/10 flex-shrink-0" />
        {OBJETIVOS_LIST.map(([k, v]) => (
          <Chip key={k} field="obj" label={v.label} value={k} count={clientes.filter(c=>c.objetivo===k).length} />
        ))}
        <div className="w-px bg-black/10 flex-shrink-0" />
        <button onClick={() => { setFiltroTipo('sinCI'); setPagina(1) }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroTipo==='sinCI' ? 'bg-amber-500 text-white' : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
          ⚠ Sin seguimiento
        </button>
        <button onClick={() => { setFiltroTipo('vencidos'); setPagina(1) }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroTipo==='vencidos' ? 'bg-red-500 text-white' : 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'}`}>
          💳 Pago vencido
        </button>
      </div>

      {/* Enlace registro */}
      <button onClick={() => { navigator.clipboard.writeText(enlaceRegistro); setModalEnlace(true) }}
        className="w-full mb-4 flex items-center gap-3 bg-[#111] hover:bg-[#1a1a1a] text-white px-4 py-3 rounded-xl transition-all text-sm font-medium">
        <span>🔗</span>
        <span>Copiar enlace de registro para nuevos clientes</span>
        <span className="ml-auto text-white/40 text-xs">{enlaceRegistro.slice(0, 40)}...</span>
      </button>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-semibold text-[#0A0A0A]">{busqueda ? 'Sin resultados' : 'Sin clientes todavía'}</p>
          <p className="text-sm text-[#6B6B6B] mt-1">{busqueda ? `No hay clientes que coincidan con "${busqueda}"` : 'Pulsa + Nuevo para añadir tu primer cliente'}</p>
        </div>
      ) : (
        <>
          {/* Header tabla — solo desktop */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1.2fr_1fr_80px] gap-3 px-4 mb-2">
            {['Cliente','Modalidad','Objetivo','Estado','Importe'].map(h => (
              <p key={h} className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">{h}</p>
            ))}
          </div>

          <div className="space-y-1.5">
            {paginados.map(c => {
              const obj = OBJ[c.objetivo]
              const al = alertas[c.id] || {}
              const estadoBadge = al.pagoVencido
                ? { label: '💳 Vencido', cls: 'bg-red-50 text-red-700' }
                : al.sinCI
                ? { label: '⚠ Sin CI', cls: 'bg-amber-50 text-amber-700' }
                : c.estado === 'activo'
                ? { label: '✓ Activo', cls: 'bg-emerald-50 text-emerald-700' }
                : c.estado === 'pausado'
                ? { label: '⏸ Pausado', cls: 'bg-gray-100 text-gray-600' }
                : { label: 'Baja', cls: 'bg-red-50 text-red-600' }

              return (
                <div key={c.id} onClick={() => abrirDetalle(c)}
                  className="bg-white rounded-xl border border-black/5 shadow-sm hover:shadow-md hover:border-[#FF5C00]/30 transition-all cursor-pointer">
                  {/* Mobile */}
                  <div className="md:hidden flex items-center gap-3 p-3.5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: avatarColor(c.nombre) }}>{ini(c.nombre)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A] truncate">{c.nombre}</p>
                      <p className="text-xs text-[#6B6B6B]">{c.tipo === 'online' ? '🌐' : '📍'} {obj?.label || c.objetivo}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoBadge.cls}`}>{estadoBadge.label}</span>
                      {c.precio_mensual > 0 && <span className="text-xs font-bold text-[#FF5C00]">{c.precio_mensual}€</span>}
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1.2fr_1fr_80px] gap-3 items-center px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: avatarColor(c.nombre) }}>{ini(c.nombre)}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0A0A0A] truncate">{c.nombre}</p>
                        <p className="text-xs text-[#6B6B6B] truncate">{c.email}</p>
                      </div>
                    </div>
                    <span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.tipo === 'online' ? 'bg-blue-50 text-blue-700' : 'bg-[#F5F5F0] text-[#6B6B6B]'}`}>
                        {c.tipo === 'online' ? '🌐 Online' : '📍 Presencial'}
                      </span>
                    </span>
                    <span>
                      {obj && <span className={`text-xs px-2 py-1 rounded-full font-medium ${obj.color}`}>{obj.label}</span>}
                    </span>
                    <span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoBadge.cls}`}>{estadoBadge.label}</span>
                    </span>
                    <span className="text-right">
                      <p className={`text-sm font-bold ${al.pagoVencido ? 'text-red-500' : 'text-[#FF5C00]'}`}>
                        {c.precio_mensual > 0 ? `${c.precio_mensual}€` : '—'}
                      </p>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-[#6B6B6B]">Mostrando {(pagina-1)*PER_PAGE+1}-{Math.min(pagina*PER_PAGE, filtrados.length)} de {filtrados.length}</p>
              <div className="flex gap-1">
                <button onClick={() => setPagina(p => Math.max(1, p-1))} disabled={pagina === 1}
                  className="px-3 py-1.5 text-xs border border-black/10 rounded-lg disabled:opacity-40 hover:border-[#FF5C00] transition-all">
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  const p = pagina <= 3 ? i+1 : pagina + i - 2
                  if (p < 1 || p > totalPaginas) return null
                  return (
                    <button key={p} onClick={() => setPagina(p)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${pagina === p ? 'bg-[#FF5C00] text-white' : 'border border-black/10 hover:border-[#FF5C00]'}`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p+1))} disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 text-xs border border-black/10 rounded-lg disabled:opacity-40 hover:border-[#FF5C00] transition-all">
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal enlace copiado */}
      {modalEnlace && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📋</div>
            <h2 className="font-bold text-[#0A0A0A] mb-2">¡Enlace copiado!</h2>
            <p className="text-sm text-[#6B6B6B] mb-4">Mándaselo al cliente por WhatsApp o email. Cuando lo rellene aparecerá en "Registros nuevos".</p>
            <button onClick={() => setModalEnlace(false)} className="w-full bg-[#FF5C00] text-white font-semibold py-3 rounded-xl">Listo</button>
          </div>
        </div>
      )}

      {/* Modal registros pendientes */}
      {modalRegistros && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#0A0A0A]">Registros pendientes</h2>
              <button onClick={() => setModalRegistros(false)} className="text-[#6B6B6B] text-xl">×</button>
            </div>
            <div className="space-y-3">
              {cuestionarios.map(c => (
                <div key={c.id} className="border border-black/8 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: avatarColor(c.nombre) }}>{ini(c.nombre)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#0A0A0A] truncate">{c.nombre}</p>
                      <p className="text-xs text-[#6B6B6B]">{c.email} · {new Date(c.created_at).toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>
                  <div className="bg-[#F5F5F0] rounded-xl p-3 mb-3 text-xs text-[#6B6B6B] space-y-1">
                    <p>Objetivo: {OBJ[c.objetivo]?.label || c.objetivo || '—'}</p>
                    <p>Nivel: {c.nivel||'—'} · {c.dias_semana||'—'} días/sem · {c.material||'—'}</p>
                    {c.lesiones && <p>Lesiones: {c.lesiones}</p>}
                  </div>
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Modalidad</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['presencial','online'].map(t => (
                        <button key={t} type="button"
                          onClick={() => {
                            const updated = cuestionarios.map(x => x.id === c.id ? { ...x, tipo: t } : x)
                            setCuestionarios(updated)
                          }}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all ${(c.tipo||'presencial') === t ? 'bg-[#FF5C00] text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                          {t === 'presencial' ? '📍 Presencial' : '🌐 Online'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => convertirCuestionario(c)}
                    className="w-full bg-[#111] text-white text-sm font-semibold py-2.5 rounded-xl">
                    ✅ Convertir en cliente
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-4">{editId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
            <div className="space-y-3">
              {[['nombre','Nombre completo *','text'],['email','Email','email'],['telefono','Teléfono','tel']].map(([k,l,t]) => (
                <div key={k}>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">{l}</label>
                  <input type={t} value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({...form,tipo:e.target.value})}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                    <option value="presencial">📍 Presencial</option>
                    <option value="online">🌐 Online</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Estado</label>
                  <select value={form.estado} onChange={e => setForm({...form,estado:e.target.value})}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                    <option value="activo">Activo</option>
                    <option value="pausado">Pausado</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Objetivo</label>
                <select value={form.objetivo} onChange={e => setForm({...form,objetivo:e.target.value})}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  {OBJETIVOS_LIST.map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Nivel</label>
                <select value={form.nivel} onChange={e => setForm({...form,nivel:e.target.value})}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Peso actual (kg)</label>
                  <input type="number" step="0.1" value={form.peso_actual} onChange={e => setForm({...form,peso_actual:e.target.value})}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Peso objetivo (kg)</label>
                  <input type="number" step="0.1" value={form.peso_objetivo} onChange={e => setForm({...form,peso_objetivo:e.target.value})}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Precio mensual (€)</label>
                <input type="number" value={form.precio_mensual} onChange={e => setForm({...form,precio_mensual:e.target.value})}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" placeholder="99" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Notas internas</label>
                <textarea value={form.notas} onChange={e => setForm({...form,notas:e.target.value})} rows={2}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                  placeholder="Lesiones, preferencias, observaciones..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setModal(false); setEditId(null); setForm(initForm) }}
                className="flex-1 border border-black/10 text-[#0A0A0A] text-sm font-medium py-2.5 rounded-xl">Cancelar</button>
              <button onClick={guardar} disabled={!form.nombre || loading}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {loading ? 'Guardando...' : editId ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detalle cliente */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-black/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: avatarColor(detalle.nombre) }}>{ini(detalle.nombre)}</div>
                <div className="flex-1">
                  <p className="font-bold text-[#0A0A0A]">{detalle.nombre}</p>
                  <p className="text-xs text-[#6B6B6B]">{OBJ[detalle.objetivo]?.label} · {detalle.tipo === 'online' ? '🌐 Online' : '📍 Presencial'}</p>
                </div>
                <button onClick={() => setDetalle(null)} className="text-[#6B6B6B] text-xl">×</button>
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {['resumen','progreso','seguimientos','sesiones','pagos'].map(t => (
                  <button key={t} onClick={() => setDTab(t)}
                    className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${dTab===t ? 'bg-[#FF5C00] text-white' : 'text-[#6B6B6B] hover:bg-[#F5F5F0]'}`}>
                    {t.charAt(0).toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4">
              {dTab==='resumen' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[['Peso actual',detalle.peso_actual?`${detalle.peso_actual}kg`:'—'],['Peso objetivo',detalle.peso_objetivo?`${detalle.peso_objetivo}kg`:'—'],['Precio',`${detalle.precio_mensual||0}€/mes`]].map(([l,v])=>(
                      <div key={l} className="bg-[#F5F5F0] rounded-xl p-3 text-center">
                        <p className="text-base font-bold text-[#0A0A0A]">{v}</p>
                        <p className="text-xs text-[#6B6B6B] mt-0.5">{l}</p>
                      </div>
                    ))}
                  </div>
                  {dData.checkins?.[0] && (
                    <div className="bg-[#F5F5F0] rounded-xl p-3">
                      <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Último seguimiento</p>
                      <div className="flex gap-2 flex-wrap">
                        {[['⚡',dData.checkins[0].energia,'/10'],['😴',dData.checkins[0].sueno,'h'],['😤',dData.checkins[0].estres,'/5'],['💫',dData.checkins[0].motivacion,'/7']].filter(([,v])=>v).map(([i,v,s])=>(
                          <span key={i} className="text-xs bg-white px-2 py-1 rounded-full">{i} {v}{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {detalle.notas && <div className="bg-amber-50 rounded-xl p-3"><p className="text-xs font-semibold text-amber-700 mb-1">Notas</p><p className="text-sm text-amber-800">{detalle.notas}</p></div>}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => abrirEditar(detalle)} className="flex-1 border border-black/10 text-sm font-medium py-2.5 rounded-xl text-[#0A0A0A]">✏️ Editar</button>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/portal/${detalle.id}`); alert('Enlace del portal copiado') }}
                      className="flex-1 bg-[#111] text-white text-sm font-medium py-2.5 rounded-xl">🔗 Portal</button>
                    <button onClick={() => eliminar(detalle.id)} className="border border-red-200 text-red-500 text-sm px-3 py-2.5 rounded-xl">🗑</button>
                  </div>
                </div>
              )}
              {dTab==='progreso' && (
                <div>
                  <p className="text-sm text-[#6B6B6B] text-center py-8">Las gráficas de progreso se cargan desde el portal del cliente</p>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/portal/${detalle.id}`); alert('Enlace copiado') }}
                    className="w-full bg-[#111] text-white text-sm font-medium py-3 rounded-xl">🔗 Copiar enlace del portal</button>
                </div>
              )}
              {dTab==='seguimientos' && (
                <div className="space-y-2">
                  {!dData.checkins?.length ? <p className="text-sm text-[#6B6B6B] text-center py-6">Sin seguimientos</p> :
                    dData.checkins.map(ci => (
                      <div key={ci.id} className="border border-black/5 rounded-xl p-3">
                        <p className="text-xs text-[#6B6B6B] mb-2">{new Date(ci.fecha).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' })}</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {ci.peso && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">⚖️ {ci.peso}kg</span>}
                          {ci.energia && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">⚡ {ci.energia}/10</span>}
                          {ci.estres && <span className={`text-xs px-2 py-1 rounded-full ${ci.estres>=4?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'}`}>😤 {ci.estres}/5</span>}
                          {ci.motivacion && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">💫 {ci.motivacion}/7</span>}
                          {ci.fatiga && <span className={`text-xs px-2 py-1 rounded-full ${ci.fatiga>=4?'bg-red-50 text-red-700':'bg-gray-50 text-gray-600'}`}>🔥 {ci.fatiga}/5</span>}
                        </div>
                        {ci.comentario && <p className="text-xs text-[#6B6B6B] mt-2 italic">"{ci.comentario}"</p>}
                      </div>
                    ))}
                </div>
              )}
              {dTab==='sesiones' && (
                <div>
                  <div className="bg-[#FF5C00]/8 rounded-xl p-3 mb-3 text-center">
                    <p className="text-2xl font-bold text-[#FF5C00]">{dData.sesiones?.filter(s=>new Date(s.fecha)>new Date(Date.now()-30*864e5)).length||0}</p>
                    <p className="text-xs text-[#6B6B6B]">Sesiones últimos 30 días</p>
                  </div>
                  {!dData.sesiones?.length ? <p className="text-sm text-[#6B6B6B] text-center py-4">Sin sesiones</p> :
                    dData.sesiones.slice(0,8).map(s => (
                      <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-black/5 last:border-0">
                        <span className="text-base">🏋️</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#0A0A0A]">{s.tipo}</p>
                          <p className="text-xs text-[#6B6B6B]">{new Date(s.fecha).toLocaleDateString('es-ES')}</p>
                        </div>
                        {s.rpe && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">RPE {s.rpe}</span>}
                      </div>
                    ))}
                </div>
              )}
              {dTab==='pagos' && (
                <div className="space-y-2">
                  {!dData.pagos?.length ? <p className="text-sm text-[#6B6B6B] text-center py-6">Sin pagos</p> :
                    dData.pagos.map(p => {
                      const d = p.valido_hasta ? Math.ceil((new Date(p.valido_hasta)-new Date())/864e5) : null
                      return (
                        <div key={p.id} className="border border-black/5 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#0A0A0A]">{p.concepto||'Mensualidad'}</p>
                            <p className="text-xs text-[#6B6B6B]">{new Date(p.fecha_pago).toLocaleDateString('es-ES')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#FF5C00]">{p.importe}€</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d!==null&&d<0?'bg-red-50 text-red-600':d!==null&&d<=7?'bg-amber-50 text-amber-600':'bg-emerald-50 text-emerald-700'}`}>
                              {d===null?'—':d<0?'Vencido':d<=7?`${d}d`:'Al día'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
