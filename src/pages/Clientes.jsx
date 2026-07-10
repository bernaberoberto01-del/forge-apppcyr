import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const OBJ = { perdida_grasa:'Pérdida de grasa', ganancia_muscular:'Ganancia muscular', tonificacion:'Tonificación', fuerza:'Fuerza', rendimiento:'Rendimiento', salud_general:'Salud general', cambio_rapido_30dias:'Cambio 30 días' }
const OBJETIVOS = Object.entries(OBJ)
const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const initForm = { nombre:'',email:'',telefono:'',objetivo:'perdida_grasa',tipo:'presencial',estado:'activo',peso_actual:'',peso_objetivo:'',nivel:'principiante',dias_semana:3,material:'gimnasio',lesiones:'',notas:'',precio_mensual:0 }

export default function Clientes({ session }) {
  const [clientes, setClientes] = useState([])
  const [cuestionarios, setCuestionarios] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [modalNuevo, setModalNuevo] = useState(false) // 'opcion' | 'manual' | 'enlace' | 'registros'
  const [form, setForm] = useState(initForm)
  const [editId, setEditId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [dData, setDData] = useState({})
  const [dTab, setDTab] = useState('resumen')
  const [loading, setLoading] = useState(false)
  const uid = session.user.id
  const enlaceRegistro = `${window.location.origin}/registro?e=${uid}`

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const [{ data: cl }, { data: cu }] = await Promise.all([
      supabase.from('clientes').select('*').eq('entrenador_id', uid).order('created_at', { ascending: false }),
      supabase.from('cuestionarios').select('*').eq('entrenador_id', uid).eq('procesado', false).order('created_at', { ascending: false }),
    ])
    setClientes(cl || [])
    setCuestionarios(cu || [])
  }

  async function guardar() {
    setLoading(true)
    const p = { ...form, entrenador_id: uid, peso_actual: form.peso_actual ? Number(form.peso_actual) : null, peso_objetivo: form.peso_objetivo ? Number(form.peso_objetivo) : null, precio_mensual: Number(form.precio_mensual) }
    if (editId) await supabase.from('clientes').update(p).eq('id', editId)
    else await supabase.from('clientes').insert(p)
    setModalNuevo(false); setEditId(null); setForm(initForm)
    await cargar(); setLoading(false)
  }

  async function convertirCuestionario(c, tipoOverride) {
    const { data: cliente } = await supabase.from('clientes').insert({
      entrenador_id: uid, nombre: c.nombre, email: c.email, telefono: c.telefono,
      objetivo: c.objetivo, tipo: tipoOverride || c.tipo || 'presencial',
      estado: 'activo', peso_actual: c.peso_actual,
      nivel: c.nivel, dias_semana: c.dias_semana, material: c.material, lesiones: c.lesiones,
      notas: `Edad: ${c.edad||'—'} | Altura: ${c.altura||'—'}cm | Motivación: ${c.motivacion||'—'}`,
      precio_mensual: 0
    }).select().single()
    if (cliente.data) {
      await supabase.from('cuestionarios').update({ cliente_id: cliente.data.id, procesado: true }).eq('id', c.id)
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
    setForm({ nombre:c.nombre||'', email:c.email||'', telefono:c.telefono||'', objetivo:c.objetivo||'perdida_grasa', tipo:c.tipo||'presencial', estado:c.estado||'activo', peso_actual:c.peso_actual||'', peso_objetivo:c.peso_objetivo||'', nivel:c.nivel||'principiante', dias_semana:c.dias_semana||3, material:c.material||'gimnasio', lesiones:c.lesiones||'', notas:c.notas||'', precio_mensual:c.precio_mensual||0 })
    setEditId(c.id); setModalNuevo('manual'); setDetalle(null)
  }

  const filtrados = filtro === 'todos' ? clientes : clientes.filter(c => c.tipo === filtro)
  const psLbl = p => { if (!p?.valido_hasta) return { l:'—', c:'bg-gray-50 text-gray-500' }; const d = Math.ceil((new Date(p.valido_hasta)-new Date())/864e5); return d<0?{l:'Vencido',c:'bg-red-50 text-red-600'}:d<=7?{l:`${d}d`,c:'bg-amber-50 text-amber-600'}:{l:'Al día',c:'bg-green-50 text-green-700'} }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#111]">Clientes</h1>
        <div className="flex gap-2">
          {cuestionarios.length > 0 && (
            <button onClick={() => setModalNuevo('registros')} className="relative bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-3 py-2 rounded-lg">
              📋 {cuestionarios.length} nuevo{cuestionarios.length > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={() => setModalNuevo('opcion')} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nuevo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {['todos','presencial','online'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtro===f?'bg-[#111] text-white':'bg-white text-gray-500 border border-gray-200'}`}>
            {f==='todos'?`Todos (${clientes.length})`:f==='presencial'?`Presencial (${clientes.filter(c=>c.tipo==='presencial').length})`:`Online (${clientes.filter(c=>c.tipo==='online').length})`}
          </button>
        ))}
      </div>

      {/* Lista clientes */}
      <div className="space-y-2">
        {filtrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Sin clientes todavía. Pulsa <strong>+ Nuevo</strong> para añadir.</p>
          </div>
        ) : filtrados.map(c => (
          <div key={c.id} onClick={() => abrirDetalle(c)}
            className="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3 cursor-pointer hover:border-orange-200 transition-colors">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{ini(c.nombre)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#111] truncate">{c.nombre}</p>
              <p className="text-xs text-gray-400">{OBJ[c.objetivo]||c.objetivo}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.estado==='activo'?'bg-green-50 text-green-700':c.estado==='pausado'?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'}`}>{c.estado}</span>
              <span className="text-xs text-gray-400">{c.tipo==='online'?'🌐':'📍'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL OPCIÓN */}
      {modalNuevo === 'opcion' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-semibold text-[#111] mb-4">Añadir cliente</h2>
            <div className="space-y-3">
              <button onClick={() => setModalNuevo('manual')}
                className="w-full border border-gray-200 rounded-xl p-4 text-left hover:border-orange-300 transition-colors">
                <p className="font-medium text-sm text-[#111]">✍️ Rellenar yo los datos</p>
                <p className="text-xs text-gray-400 mt-0.5">Añade al cliente manualmente con sus datos básicos</p>
              </button>
              <button onClick={() => { navigator.clipboard.writeText(enlaceRegistro); setModalNuevo('enlace') }}
                className="w-full border border-gray-200 rounded-xl p-4 text-left hover:border-orange-300 transition-colors">
                <p className="font-medium text-sm text-[#111]">🔗 Enviar enlace de registro</p>
                <p className="text-xs text-gray-400 mt-0.5">El cliente rellena el cuestionario completo de 7 pasos</p>
              </button>
              {cuestionarios.length > 0 && (
                <button onClick={() => setModalNuevo('registros')}
                  className="w-full border border-amber-200 bg-amber-50 rounded-xl p-4 text-left hover:border-amber-300 transition-colors">
                  <p className="font-medium text-sm text-amber-800">📋 Ver registros pendientes ({cuestionarios.length})</p>
                  <p className="text-xs text-amber-600 mt-0.5">Clientes que han rellenado el cuestionario</p>
                </button>
              )}
            </div>
            <button onClick={() => setModalNuevo(false)} className="w-full border border-gray-200 text-gray-600 text-sm py-2.5 rounded-lg mt-3">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL ENLACE COPIADO */}
      {modalNuevo === 'enlace' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">📋</div>
            <h2 className="font-semibold text-[#111] mb-2">¡Enlace copiado!</h2>
            <p className="text-sm text-gray-500 mb-4">Mándaselo al cliente por WhatsApp o email. Cuando lo rellene aparecerá en "Registros pendientes".</p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-400 font-mono break-all">{enlaceRegistro}</p>
            </div>
            <button onClick={() => setModalNuevo(false)} className="w-full bg-orange-500 text-white text-sm font-medium py-2.5 rounded-xl">Listo</button>
          </div>
        </div>
      )}

      {/* MODAL REGISTROS PENDIENTES */}
      {modalNuevo === 'registros' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#111]">Registros pendientes</h2>
              <button onClick={() => setModalNuevo(false)} className="text-gray-400 text-xl">×</button>
            </div>
            {cuestionarios.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin registros pendientes</p>
            ) : (
              <div className="space-y-3">
                {cuestionarios.map(c => (
                  <div key={c.id} className="border border-gray-100 rounded-xl p-3.5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">{ini(c.nombre)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[#111] truncate">{c.nombre}</p>
                        <p className="text-xs text-gray-400">{c.email} · {OBJ[c.objetivo]||c.objetivo}</p>
                        <p className="text-xs text-gray-300">{new Date(c.created_at).toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-2 text-xs text-gray-500 mb-2">
                      <p>Nivel: {c.nivel||'—'} · {c.dias_semana||'—'} días/sem</p>
                      <p>Material: {c.material||'—'}</p>
                      {c.lesiones && <p>Lesiones: {c.lesiones}</p>}
                    </div>
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-600 mb-1.5">Modalidad</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['presencial','online'].map(t => (
                          <button key={t} type="button"
                            onClick={() => {
                              const updated = [...cuestionarios]
                              const idx = updated.findIndex(x => x.id === c.id)
                              updated[idx] = { ...updated[idx], tipo: t }
                              setCuestionarios(updated)
                            }}
                            className={`py-2 rounded-lg text-xs font-semibold transition-all ${(c.tipo||'presencial')===t ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-500'}`}>
                            {t === 'presencial' ? '📍 Presencial' : '🌐 Online'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => convertirCuestionario(c)}
                      className="w-full bg-orange-500 text-white text-xs font-medium py-2 rounded-lg">
                      ✅ Convertir en cliente
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL MANUAL */}
      {modalNuevo === 'manual' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5">
            <h2 className="font-semibold text-[#111] mb-4">{editId?'Editar cliente':'Nuevo cliente'}</h2>
            <div className="space-y-3">
              {[['nombre','Nombre completo *','text'],['email','Email','email'],['telefono','Teléfono','tel']].map(([k,l,t])=>(
                <div key={k}><label className="text-xs font-medium text-gray-600 mb-1 block">{l}</label>
                <input type={t} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"/></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
                <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                  <option value="presencial">Presencial</option><option value="online">Online</option></select></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Estado</label>
                <select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                  <option value="activo">Activo</option><option value="pausado">Pausado</option><option value="baja">Baja</option></select></div>
              </div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Objetivo</label>
              <select value={form.objetivo} onChange={e=>setForm({...form,objetivo:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                {OBJETIVOS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Peso actual (kg)</label>
                <input type="number" step="0.1" value={form.peso_actual} onChange={e=>setForm({...form,peso_actual:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"/></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Peso objetivo (kg)</label>
                <input type="number" step="0.1" value={form.peso_objetivo} onChange={e=>setForm({...form,peso_objetivo:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"/></div>
              </div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Precio mensual (€)</label>
              <input type="number" value={form.precio_mensual} onChange={e=>setForm({...form,precio_mensual:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"/></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Notas internas</label>
              <textarea value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none" placeholder="Lesiones, preferencias..."/></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setModalNuevo(false); setEditId(null); setForm(initForm) }} className="flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={!form.nombre||loading} className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50">
                {loading?'Guardando...':'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETALLE CLIENTE */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">{ini(detalle.nombre)}</div>
                <div className="flex-1"><p className="font-semibold">{detalle.nombre}</p><p className="text-xs text-gray-500">{OBJ[detalle.objetivo]} · {detalle.tipo==='online'?'🌐 Online':'📍 Presencial'}</p></div>
                <button onClick={() => setDetalle(null)} className="text-gray-400 text-xl">×</button>
              </div>
              <div className="flex gap-1">
                {['resumen','seguimientos','sesiones','pagos'].map(t=>(
                  <button key={t} onClick={() => setDTab(t)} className={`flex-1 py-1.5 text-xs font-medium rounded-lg ${dTab===t?'bg-orange-500 text-white':'text-gray-500 hover:bg-gray-50'}`}>
                    {t.charAt(0).toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4">
              {dTab==='resumen'&&(
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[['Peso actual',detalle.peso_actual?`${detalle.peso_actual}kg`:'—'],['Peso objetivo',detalle.peso_objetivo?`${detalle.peso_objetivo}kg`:'—'],['Precio',`${detalle.precio_mensual||0}€/mes`],['Sesiones',`${dData.sesiones?.length||0} total`]].map(([l,v])=>(
                      <div key={l} className="bg-[#F7F7F7] rounded-xl p-3"><p className="text-lg font-bold">{v}</p><p className="text-xs text-gray-500">{l}</p></div>
                    ))}
                  </div>
                  {dData.checkins?.[0]&&(
                    <div className="bg-[#F7F7F7] rounded-xl p-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">Último seguimiento</p>
                      <div className="flex gap-3 flex-wrap">
                        {dData.checkins[0].peso&&<div className="text-center"><p className="text-base font-bold text-orange-500">{dData.checkins[0].peso}kg</p><p className="text-xs text-gray-400">Peso</p></div>}
                        {dData.checkins[0].energia&&<div className="text-center"><p className="text-base font-bold">{dData.checkins[0].energia}/10</p><p className="text-xs text-gray-400">Energía</p></div>}
                        {dData.checkins[0].estres&&<div className="text-center"><p className={`text-base font-bold ${dData.checkins[0].estres>=4?'text-red-500':''}`}>{dData.checkins[0].estres}/5</p><p className="text-xs text-gray-400">Estrés</p></div>}
                        {dData.checkins[0].motivacion&&<div className="text-center"><p className="text-base font-bold">{dData.checkins[0].motivacion}/7</p><p className="text-xs text-gray-400">Motivación</p></div>}
                      </div>
                    </div>
                  )}
                  {detalle.notas&&<div className="bg-amber-50 rounded-xl p-3"><p className="text-xs font-medium text-amber-700 mb-1">Notas</p><p className="text-sm text-amber-800">{detalle.notas}</p></div>}
                  <div className="flex gap-2">
                    <button onClick={()=>abrirEditar(detalle)} className="flex-1 border border-gray-200 text-sm py-2 rounded-lg">Editar</button>
                    <button onClick={()=>eliminar(detalle.id)} className="border border-red-200 text-red-500 text-sm py-2 px-3 rounded-lg">🗑</button>
                  </div>
                </div>
              )}
              {dTab==='seguimientos'&&(
                <div className="space-y-2">{!dData.checkins?.length?<p className="text-sm text-gray-400 text-center py-4">Sin seguimientos</p>:
                  dData.checkins.map(ci=>(
                    <div key={ci.id} className="border border-gray-100 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-2">{new Date(ci.fecha).toLocaleDateString('es-ES')}</p>
                      <div className="flex gap-2 flex-wrap">
                        {ci.peso&&<span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">⚖️ {ci.peso}kg</span>}
                        {ci.energia&&<span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">⚡ {ci.energia}/10</span>}
                        {ci.sueno&&<span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">😴 {ci.sueno}h</span>}
                        {ci.estres&&<span className={`text-xs px-2 py-1 rounded-full ${ci.estres>=4?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>😤 {ci.estres}/5</span>}
                        {ci.fatiga&&<span className={`text-xs px-2 py-1 rounded-full ${ci.fatiga>=4?'bg-red-50 text-red-700':'bg-gray-50 text-gray-600'}`}>🔥 {ci.fatiga}/5</span>}
                        {ci.motivacion&&<span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">💫 {ci.motivacion}/7</span>}
                      </div>
                      {ci.comentario&&<p className="text-xs text-gray-500 mt-2 italic">"{ci.comentario}"</p>}
                    </div>
                  ))}
                </div>
              )}
              {dTab==='sesiones'&&(
                <div>
                  <div className="text-center bg-orange-50 rounded-xl p-3 mb-3">
                    <p className="text-2xl font-bold text-orange-500">{dData.sesiones?.filter(s=>new Date(s.fecha)>new Date(Date.now()-30*864e5)).length||0}</p>
                    <p className="text-xs text-gray-500">Sesiones últimos 30 días</p>
                  </div>
                  {!dData.sesiones?.length?<p className="text-sm text-gray-400 text-center py-4">Sin sesiones</p>:
                    dData.sesiones.map(s=>(<div key={s.id} className="border-b border-gray-50 py-2.5 flex gap-3"><span>🏋️</span><div><p className="text-sm font-medium">{s.tipo}</p><p className="text-xs text-gray-400">{new Date(s.fecha).toLocaleDateString('es-ES')}</p></div></div>))}
                </div>
              )}
              {dTab==='pagos'&&(
                <div className="space-y-2">{!dData.pagos?.length?<p className="text-sm text-gray-400 text-center py-4">Sin pagos</p>:
                  dData.pagos.map(p=>{const{l,c}=psLbl(p);return(
                    <div key={p.id} className="border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                      <div><p className="text-sm font-medium">{p.concepto||'Mensualidad'}</p><p className="text-xs text-gray-400">{new Date(p.fecha_pago).toLocaleDateString('es-ES')}</p></div>
                      <div className="text-right"><p className="font-bold text-orange-500">{p.importe}€</p><span className={`text-xs px-2 py-0.5 rounded-full ${c}`}>{l}</span></div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
