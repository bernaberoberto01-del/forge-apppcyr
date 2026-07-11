import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import ClienteQuickView from '../components/ClienteQuickView'

const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'

const PATRONES = ['empuje_horizontal','empuje_vertical','tiron_vertical','tiron_horizontal','sentadilla','bisagra','hip_extension','core','cardio','aislamiento']
const initEj = () => ({ nombre:'', patron:'empuje_horizontal', series:3, reps:'8-10', descanso:'90s', notas:'' })
const initDia = (n) => ({ dia:n, nombre:`Día ${String.fromCharCode(64+n)}`, patron_principal:'', ejercicios:[initEj()] })
const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111] text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2">
      <span className="text-emerald-400">✓</span> {msg}
    </div>
  )
}

export default function Rutinas({ session }) {
  const [rutinas, setRutinas] = useState([])
  const [clientes, setClientes] = useState([])
  const [generando, setGenerando] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [notasEdit, setNotasEdit] = useState('')
  const [msgModal, setMsgModal] = useState(null)
  const [msgTexto, setMsgTexto] = useState('')
  const [modalManual, setModalManual] = useState(false)
  const [manualClienteId, setManualClienteId] = useState('')
  const [manualNombre, setManualNombre] = useState('')
  const [manualDescripcion, setManualDescripcion] = useState('')
  const [manualDias, setManualDias] = useState([initDia(1), initDia(2), initDia(3)])
  const [guardandoManual, setGuardandoManual] = useState(false)
  const [toast, setToast] = useState('')
  const [quickView, setQuickView] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activas')
  const uid = session.user.id

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const [{ data: ru }, { data: cl }] = await Promise.all([
      supabase.from('rutinas').select('*, clientes(nombre,tipo,objetivo)').eq('entrenador_id', uid).order('created_at', { ascending: false }),
      supabase.from('clientes').select('id,nombre,objetivo,nivel,tipo').eq('entrenador_id', uid).eq('estado','activo'),
    ])
    setRutinas(ru || [])
    setClientes(cl || [])
  }

  async function generarRutina(clienteId) {
    setGenerando(clienteId)
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generar-rutina`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ cliente_id: clienteId })
    })
    const data = await res.json()
    setGenerando(null)
    if (data.ok) { setToast('Rutina generada — revísala y publícala'); await cargar() }
    else { setToast('Error: ' + (data.error || 'desconocido')); }
  }

  async function guardarManual() {
    if (!manualClienteId || !manualNombre) return
    setGuardandoManual(true)
    const cliente = clientes.find(c => c.id === manualClienteId)
    const borrador = { nombre: manualNombre, descripcion: manualDescripcion, semanas: 4, dias: manualDias.filter(d => d.ejercicios.some(e => e.nombre)) }
    await supabase.from('rutinas').insert({ cliente_id: manualClienteId, entrenador_id: uid, nombre: manualNombre, objetivo: cliente?.objetivo, semanas: 4, dias_semana: borrador.dias.length, borrador, estado: 'borrador' })
    setModalManual(false); setManualClienteId(''); setManualNombre(''); setManualDescripcion(''); setManualDias([initDia(1), initDia(2), initDia(3)]); setGuardandoManual(false)
    setToast('Rutina creada como borrador')
    await cargar()
  }

  async function publicar(rutina) {
    await supabase.from('rutinas').update({ estado: 'publicada', contenido: rutina.borrador, notas_entrenador: notasEdit }).eq('id', rutina.id)
    setDetalle(null); setToast(`Rutina publicada para ${rutina.clientes?.nombre} ✓`)
    await cargar()
  }

  async function enviarMensaje(clienteId) {
    if (!msgTexto.trim()) return
    await supabase.from('mensajes_cliente').insert({ entrenador_id: uid, cliente_id: clienteId, contenido: msgTexto.trim() })
    setMsgTexto(''); setMsgModal(null); setToast('Mensaje enviado')
  }

  const updateDia = (di, field, val) => setManualDias(prev => prev.map((d,i) => i===di ? {...d,[field]:val} : d))
  const updateEj = (di, ei, field, val) => setManualDias(prev => prev.map((d,i) => i===di ? {...d, ejercicios: d.ejercicios.map((e,j) => j===ei ? {...e,[field]:val} : e)} : d))
  const addEj = (di) => setManualDias(prev => prev.map((d,i) => i===di ? {...d, ejercicios:[...d.ejercicios, initEj()]} : d))
  const removeEj = (di, ei) => setManualDias(prev => prev.map((d,i) => i===di ? {...d, ejercicios:d.ejercicios.filter((_,j)=>j!==ei)} : d))
  const addDia = () => setManualDias(prev => [...prev, initDia(prev.length+1)])
  const removeDia = (di) => setManualDias(prev => prev.filter((_,i)=>i!==di))

  const clientesSinRutina = clientes.filter(c => !rutinas.find(r => r.cliente_id === c.id && r.estado !== 'archivada'))
  const portalUrl = id => `${window.location.origin}/portal/${id}`

  const rutinasFiltradas = useMemo(() => {
    let r = rutinas.filter(x => x.estado !== 'archivada')
    if (filtroEstado === 'borrador') r = r.filter(x => x.estado === 'borrador')
    if (filtroEstado === 'publicada') r = r.filter(x => x.estado === 'publicada')
    if (busqueda) { const b = busqueda.toLowerCase(); r = r.filter(x => x.clientes?.nombre?.toLowerCase().includes(b) || x.nombre?.toLowerCase().includes(b)) }
    return r
  }, [rutinas, filtroEstado, busqueda])

  const stats = { total: rutinas.filter(r=>r.estado!=='archivada').length, borradores: rutinas.filter(r=>r.estado==='borrador').length, publicadas: rutinas.filter(r=>r.estado==='publicada').length }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Rutinas</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Genera con IA o crea manualmente · Publica para que el cliente la vea en su portal</p>
        </div>
        <button onClick={() => setModalManual(true)} className="bg-[#111] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95 flex-shrink-0">
          ✍️ Manual
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[['Total',stats.total,'#FF5C00'],['Borradores',stats.borradores,'#f59e0b'],['Publicadas',stats.publicadas,'#10b981']].map(([l,v,c])=>(
          <div key={l} className="bg-white rounded-xl border border-black/5 shadow-sm p-3.5 text-center">
            <p className="text-2xl font-bold" style={{color:c}}>{v}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente o nombre de rutina..."
          className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] transition-colors" />
        {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">×</button>}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[['activas','Todas'],['borrador','Borradores'],['publicada','Publicadas']].map(([v,l])=>(
          <button key={v} onClick={() => setFiltroEstado(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroEstado===v ? 'bg-[#FF5C00] text-white' : 'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Clientes sin rutina */}
      {clientesSinRutina.length > 0 && !busqueda && filtroEstado === 'activas' && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-amber-700 mb-3">⚠ Sin rutina ({clientesSinRutina.length})</p>
          <div className="space-y-2">
            {clientesSinRutina.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 bg-[#FF5C00] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{ini(c.nombre)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">{c.nombre}</p>
                    <p className="text-xs text-[#6B6B6B]">{c.nivel} · {c.tipo}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => generarRutina(c.id)} disabled={generando === c.id}
                    className="bg-[#FF5C00] text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
                    {generando === c.id ? '⏳...' : '✨ IA'}
                  </button>
                  <button onClick={() => { setManualClienteId(c.id); setModalManual(true) }}
                    className="border border-black/15 text-[#6B6B6B] text-xs font-medium px-3 py-1.5 rounded-lg hover:border-[#111]">✍️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista rutinas */}
      <div className="space-y-2">
        {rutinasFiltradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">💪</p>
            <p className="font-semibold text-[#0A0A0A]">{busqueda ? 'Sin resultados' : 'Sin rutinas'}</p>
            <p className="text-sm text-[#6B6B6B] mt-1">{busqueda ? `No hay rutinas que coincidan con "${busqueda}"` : 'Genera una con IA o créala manualmente'}</p>
          </div>
        ) : rutinasFiltradas.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center text-[#FF5C00] font-bold text-xs flex-shrink-0">{ini(r.clientes?.nombre)}</div>
              <div className="flex-1 min-w-0">
                <button onClick={e=>{e.stopPropagation();setQuickView(r.cliente_id)}} className="text-sm font-semibold text-[#0A0A0A] truncate hover:text-[#FF5C00] transition-colors">{r.clientes?.nombre}</button>
                <p className="text-xs text-[#6B6B6B] truncate">{r.borrador?.nombre || r.contenido?.nombre || 'Rutina'} · {r.dias_semana} días/sem</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${r.estado==='publicada'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>
                {r.estado==='publicada'?'✓ Publicada':'Borrador'}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setDetalle(r); setNotasEdit(r.notas_entrenador||'') }}
                className="flex-1 border border-black/10 text-[#0A0A0A] text-xs font-medium py-2 rounded-lg hover:bg-[#F5F5F0]">Ver rutina</button>
              {r.estado==='publicada' && (
                <button onClick={() => { navigator.clipboard.writeText(portalUrl(r.cliente_id)); setToast('Enlace copiado') }}
                  className="flex-1 border border-[#FF5C00]/30 text-[#FF5C00] text-xs font-medium py-2 rounded-lg hover:bg-[#FF5C00]/5">📋 Portal</button>
              )}
              <button onClick={() => setMsgModal(r.cliente_id)}
                className="border border-black/10 text-[#6B6B6B] text-xs py-2 px-3 rounded-lg hover:bg-[#F5F5F0]">✉️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white">
              <div><h2 className="font-bold text-[#0A0A0A]">{detalle.borrador?.nombre||detalle.contenido?.nombre}</h2><button onClick={() => setQuickView(detalle.cliente_id)} className="text-xs text-[#6B6B6B] hover:text-[#FF5C00] transition-colors">{detalle.clientes?.nombre} →</button></div>
              <button onClick={() => setDetalle(null)} className="text-[#6B6B6B] text-xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="p-4 space-y-3">
              {(detalle.borrador?.dias||detalle.contenido?.dias||[]).map(dia => (
                <div key={dia.dia} className="border border-black/8 rounded-xl overflow-hidden">
                  <div className="bg-[#0A0A0A] px-4 py-2.5 flex items-center justify-between">
                    <p className="text-white text-sm font-semibold">{dia.nombre}</p>
                    {dia.patron_principal && <p className="text-white/40 text-xs">{dia.patron_principal}</p>}
                  </div>
                  <div className="divide-y divide-black/5">
                    {dia.ejercicios?.map((ej,i) => (
                      <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium text-[#0A0A0A]">{ej.nombre}</p>{ej.notas&&<p className="text-xs text-[#6B6B6B] mt-0.5">{ej.notas}</p>}</div>
                        <div className="text-right flex-shrink-0"><p className="text-sm font-bold text-[#FF5C00]">{ej.series}×{ej.reps}</p><p className="text-xs text-[#6B6B6B]">{ej.descanso}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="bg-[#F5F5F0] border border-black/8 rounded-xl p-3 flex gap-2">
                <span className="text-sm flex-shrink-0">⚖️</span>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  <span className="font-semibold text-[#0A0A0A]">Aviso:</span> Este programa es una guía de entrenamiento personalizada. Si tienes dudas sobre tu estado de salud, consulta con un profesional médico antes de comenzar.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Notas para el cliente</label>
                <textarea value={notasEdit} onChange={e => setNotasEdit(e.target.value)} rows={3}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none" placeholder="Indicaciones especiales..." />
              </div>
              <div className="flex gap-2">
                {detalle.estado==='borrador' ? (
                  <button onClick={() => publicar(detalle)} className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl">✅ Publicar para el cliente</button>
                ) : (
                  <button onClick={() => { navigator.clipboard.writeText(portalUrl(detalle.cliente_id)); setToast('Enlace copiado') }}
                    className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl">📋 Copiar enlace del portal</button>
                )}
                <button onClick={async () => {
                  if (!confirm('¿Regenerar rutina con IA? Se eliminará la actual.')) return
                  await supabase.from('rutinas').delete().eq('id', detalle.id); setDetalle(null)
                  await generarRutina(detalle.cliente_id)
                }} disabled={generando===detalle.cliente_id}
                  className="border border-black/10 text-[#6B6B6B] text-sm py-3 px-3 rounded-xl hover:bg-[#F5F5F0] disabled:opacity-40">
                  {generando===detalle.cliente_id?'⏳':'🔄'}
                </button>
                <button onClick={() => { if(!confirm('¿Eliminar esta rutina?')) return; supabase.from('rutinas').delete().eq('id',detalle.id); setDetalle(null); cargar() }}
                  className="border border-black/10 text-[#6B6B6B] text-sm py-3 px-3 rounded-xl hover:bg-[#F5F5F0]">🗑</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal manual */}
      {modalManual && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-black/5 sticky top-0 bg-white z-10 flex items-center justify-between">
              <h2 className="font-bold text-[#0A0A0A]">Crear rutina manual</h2>
              <button onClick={() => setModalManual(false)} className="text-[#6B6B6B] text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente *</label>
                <select value={manualClienteId} onChange={e => setManualClienteId(e.target.value)}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre *</label>
                <input value={manualNombre} onChange={e => setManualNombre(e.target.value)} placeholder="Ej: Rutina Full Body 3 días"
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Descripción</label>
                <input value={manualDescripcion} onChange={e => setManualDescripcion(e.target.value)} placeholder="Breve descripción del enfoque"
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
              {manualDias.map((dia, di) => (
                <div key={di} className="border border-black/8 rounded-2xl overflow-hidden">
                  <div className="bg-[#F5F5F0] px-4 py-3 flex items-center gap-2">
                    <input value={dia.nombre} onChange={e => updateDia(di,'nombre',e.target.value)}
                      className="flex-1 bg-transparent text-sm font-bold text-[#0A0A0A] focus:outline-none" />
                    {manualDias.length > 1 && <button onClick={() => removeDia(di)} className="text-[#6B6B6B] hover:text-red-500 text-lg">×</button>}
                  </div>
                  <div className="p-3 space-y-2">
                    {dia.ejercicios.map((ej, ei) => (
                      <div key={ei} className="space-y-1.5 border-b border-black/5 pb-2.5 last:border-0 last:pb-0">
                        <div className="flex gap-2">
                          <input value={ej.nombre} onChange={e => updateEj(di,ei,'nombre',e.target.value)} placeholder="Nombre del ejercicio"
                            className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#FF5C00]" />
                          {dia.ejercicios.length > 1 && <button onClick={() => removeEj(di,ei)} className="text-[#6B6B6B] hover:text-red-500 px-2">×</button>}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[['series','Series','number'],['reps','Reps','text'],['descanso','Descanso','text']].map(([k,l,t])=>(
                            <div key={k}>
                              <label className="text-xs text-[#6B6B6B] mb-0.5 block">{l}</label>
                              <input type={t} value={ej[k]} onChange={e => updateEj(di,ei,k,t==='number'?Number(e.target.value):e.target.value)}
                                className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:border-[#FF5C00]" />
                            </div>
                          ))}
                        </div>
                        <input value={ej.notas} onChange={e => updateEj(di,ei,'notas',e.target.value)} placeholder="Notas (opcional)"
                          className="w-full border border-black/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#FF5C00]" />
                      </div>
                    ))}
                    <button onClick={() => addEj(di)} className="w-full border border-dashed border-black/15 text-xs text-[#6B6B6B] py-2 rounded-lg hover:border-[#FF5C00] hover:text-[#FF5C00]">+ Ejercicio</button>
                  </div>
                </div>
              ))}
              <button onClick={addDia} className="w-full border-2 border-dashed border-black/15 text-sm font-medium text-[#6B6B6B] py-3 rounded-2xl hover:border-[#FF5C00] hover:text-[#FF5C00]">+ Añadir día</button>
            </div>
            <div className="p-4 border-t border-black/5 sticky bottom-0 bg-white flex gap-2">
              <button onClick={() => setModalManual(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm font-medium py-3 rounded-xl">Cancelar</button>
              <button onClick={guardarManual} disabled={!manualClienteId||!manualNombre||guardandoManual}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-bold py-3 rounded-xl disabled:opacity-40">
                {guardandoManual?'Guardando...':'💾 Guardar rutina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal mensaje */}
      {msgModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-3">Enviar mensaje al cliente</h2>
            <textarea value={msgTexto} onChange={e => setMsgTexto(e.target.value)} rows={4}
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none mb-3" placeholder="Escribe tu mensaje..." />
            <div className="flex gap-2">
              <button onClick={() => setMsgModal(null)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={() => enviarMensaje(msgModal)} disabled={!msgTexto.trim()}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">Enviar ✉️</button>
            </div>
          </div>
        </div>
      )}
      {quickView && <ClienteQuickView clienteId={quickView} onClose={() => setQuickView(null)} />}
    </div>
  )
}