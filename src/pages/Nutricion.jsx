import { useState, useEffect, useMemo } from 'react'
import ClienteQuickView from '../components/ClienteQuickView'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'

const DIAS_SEMANA = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

function Toast({ msg, tipo='ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 whitespace-nowrap ${tipo==='error'?'bg-red-600':'bg-[#111]'}`}>
      <span>{tipo==='error'?'⚠':'✓'}</span> {msg}
    </div>
  )
}

const MacroBadge = ({ label, valor, unit, color }) => (
  <div className="flex-1 bg-white rounded-xl p-3 text-center border border-black/5">
    <p className="text-2xl font-bold" style={{color}}>{valor || 0}</p>
    <p className="text-xs text-[#6B6B6B] mt-0.5">{label} ({unit})</p>
  </div>
)

export default function Nutricion({ session }) {
  const [clientes, setClientes] = useState([])
  const [planes, setPlanes] = useState([])
  const [cuests, setCuests] = useState([])
  const [generando, setGenerando] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [diaActivo, setDiaActivo] = useState(0)
  const [notasEdit, setNotasEdit] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('activos')
  const [toast, setToast] = useState(null)
  const [quickView, setQuickView] = useState(null)
  const [modalActivar, setModalActivar] = useState(null)
  const [modalCuest, setModalCuest] = useState(null)
  const [cuest, setCuest] = useState({})
  const uid = session.user.id

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const [{ data: cl }, { data: pl }, { data: cu }] = await Promise.all([
      supabase.from('clientes').select('id,nombre,tipo,nivel,peso_actual,peso_objetivo,objetivo,nutricion_activa').eq('entrenador_id', uid).eq('estado','activo').order('nombre'),
      supabase.from('planes_nutricion').select('*, clientes(nombre)').eq('entrenador_id', uid).order('created_at', { ascending: false }),
      supabase.from('cuestionarios_nutricion').select('cliente_id, created_at').eq('entrenador_id', uid)
    ])
    setClientes(cl || [])
    setPlanes(pl || [])
    setCuests(cu || [])
  }

  async function activarNutricion(clienteId, valor) {
    await supabase.from('clientes').update({ nutricion_activa: valor }).eq('id', clienteId)
    if (valor) {
      // Enviar enlace cuestionario (se muestra en UI)
      setModalActivar(clienteId)
    }
    await cargar()
  }

  async function generarPlan(clienteId) {
    setGenerando(clienteId)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generar-nutricion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ cliente_id: clienteId })
      })
      const data = await res.json()
      if (data.ok) { setToast({ msg: 'Plan generado — revísalo y publícalo' }); await cargar() }
      else setToast({ msg: data.error || 'Error al generar', tipo: 'error' })
    } catch (e) { setToast({ msg: e.message, tipo: 'error' }) }
    setGenerando(null)
  }

  async function publicar(plan) {
    await supabase.from('planes_nutricion').update({ estado: 'publicado', contenido: plan.borrador, notas_entrenador: notasEdit }).eq('id', plan.id)
    setDetalle(null)
    setToast({ msg: `Plan publicado para ${plan.clientes?.nombre}` })
    await cargar()
  }

  async function guardarCuest(clienteId) {
    await supabase.from('cuestionarios_nutricion').insert({ ...cuest, cliente_id: clienteId, entrenador_id: uid })
    setModalCuest(null)
    setCuest({})
    setToast({ msg: 'Cuestionario guardado — ya puedes generar el plan' })
    await cargar()
  }

  const clientesConNutricion = clientes.filter(c => c.nutricion_activa)
  const clientesSinPlan = clientesConNutricion.filter(c => !planes.find(p => p.cliente_id === c.id && p.estado !== 'archivado'))
  const planesActivos = planes.filter(p => p.estado !== 'archivado')

  const planFiltrado = useMemo(() => {
    let r = planesActivos
    if (busqueda) { const b = busqueda.toLowerCase(); r = r.filter(p => p.clientes?.nombre?.toLowerCase().includes(b)) }
    if (filtro === 'borrador') r = r.filter(p => p.estado === 'borrador')
    if (filtro === 'publicado') r = r.filter(p => p.estado === 'publicado')
    return r
  }, [planesActivos, busqueda, filtro])

  const portalUrl = id => `${window.location.origin}/portal/${id}`
  const cuestUrl = (entrenadorId, clienteId) => `${window.location.origin}/nutricion-cuest?e=${entrenadorId}&c=${clienteId}`

  const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* Cabecera */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Nutrición</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Planes personalizados con IA · Activa por cliente según tu oferta</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          ['Con nutrición', clientesConNutricion.length, '#FF5C00'],
          ['Sin plan', clientesSinPlan.length, '#f59e0b'],
          ['Publicados', planes.filter(p=>p.estado==='publicado').length, '#10b981'],
        ].map(([l,v,c])=>(
          <div key={l} className="bg-white rounded-xl border border-black/5 shadow-sm p-3.5 text-center">
            <p className="text-2xl font-bold" style={{color:c}}>{v}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Clientes con nutrición activa sin plan */}
      {clientesSinPlan.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-amber-700 mb-3">⚠ Sin plan nutricional ({clientesSinPlan.length})</p>
          <div className="space-y-2">
            {clientesSinPlan.map(c => {
              const tieneCuest = cuests.some(cu => cu.cliente_id === c.id)
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#FF5C00] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{ini(c.nombre)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">{c.nombre}</p>
                    <p className="text-xs text-[#6B6B6B]">{tieneCuest ? '✓ Cuestionario completado' : '⚠ Sin cuestionario'}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {!tieneCuest && (
                      <button onClick={() => { setModalCuest(c); setCuest({ peso: c.peso_actual, objetivo: c.objetivo }) }}
                        className="border border-black/15 text-[#6B6B6B] text-xs font-medium px-2.5 py-1.5 rounded-lg hover:border-[#111]">
                        📋 Cuest.
                      </button>
                    )}
                    <button onClick={() => generarPlan(c.id)} disabled={generando === c.id}
                      className="bg-[#FF5C00] text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
                      {generando === c.id ? '⏳' : '✨ IA'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activar nutrición para clientes */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 mb-4">
        <p className="text-sm font-bold text-[#0A0A0A] mb-3">Activar nutrición por cliente</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {clientes.map(c => (
            <div key={c.id} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-[#FF5C00]">{ini(c.nombre)}</div>
              <p className="flex-1 text-sm text-[#0A0A0A] truncate">{c.nombre}</p>
              <button onClick={() => activarNutricion(c.id, !c.nutricion_activa)}
                className={`w-11 h-6 rounded-full transition-all flex-shrink-0 relative ${c.nutricion_activa ? 'bg-[#FF5C00]' : 'bg-black/20'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${c.nutricion_activa ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Buscador y filtros */}
      {planesActivos.length > 0 && (
        <>
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por cliente..."
              className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
            {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">×</button>}
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {[['todos','Todos'],['borrador','Borrador'],['publicado','Publicado']].map(([v,l])=>(
              <button key={v} onClick={() => setFiltro(v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtro===v?'bg-[#FF5C00] text-white':'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
                {l}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Lista planes */}
      <div className="space-y-2">
        {planFiltrado.length === 0 && planesActivos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">🥗</p>
            <p className="font-semibold text-[#0A0A0A]">Sin planes nutricionales</p>
            <p className="text-sm text-[#6B6B6B] mt-1">Activa nutrición para un cliente y genera su plan con IA</p>
          </div>
        ) : planFiltrado.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-xs flex-shrink-0">{ini(p.clientes?.nombre)}</div>
              <div className="flex-1 min-w-0">
                <button onClick={e=>{e.stopPropagation();setQuickView(p.cliente_id)}} className="text-sm font-semibold text-[#0A0A0A] truncate hover:text-[#FF5C00] transition-colors">{p.clientes?.nombre}</button>
                <p className="text-xs text-[#6B6B6B]">{p.calorias_dia}kcal · P:{p.proteinas_g}g · C:{p.carbohidratos_g}g · G:{p.grasas_g}g</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${p.estado==='publicado'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>
                {p.estado==='publicado'?'✓ Publicado':'Borrador'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setDetalle(p); setNotasEdit(p.notas_entrenador||''); setDiaActivo(0) }}
                className="flex-1 border border-black/10 text-[#0A0A0A] text-xs font-medium py-2 rounded-lg hover:bg-[#F5F5F0]">Ver plan</button>
              {p.estado==='publicado' && (
                <button onClick={() => { navigator.clipboard.writeText(portalUrl(p.cliente_id)); setToast({ msg: 'Enlace copiado' }) }}
                  className="flex-1 border border-[#FF5C00]/30 text-[#FF5C00] text-xs font-medium py-2 rounded-lg hover:bg-[#FF5C00]/5">📋 Portal</button>
              )}
              <button onClick={() => generarPlan(p.cliente_id)} disabled={generando===p.cliente_id}
                className="border border-black/10 text-[#6B6B6B] text-xs py-2 px-3 rounded-lg hover:bg-[#F5F5F0] disabled:opacity-40">
                {generando===p.cliente_id?'⏳':'🔄'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal detalle plan */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-black/5 sticky top-0 bg-white z-10 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[#0A0A0A]">{detalle.clientes?.nombre}</h2>
                <p className="text-xs text-[#6B6B6B]">{detalle.nombre}</p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-[#6B6B6B] text-xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Macros resumen */}
              <div className="grid grid-cols-4 gap-2">
                <MacroBadge label="Calorías" valor={detalle.calorias_dia} unit="kcal" color="#FF5C00" />
                <MacroBadge label="Proteínas" valor={detalle.proteinas_g} unit="g" color="#6366f1" />
                <MacroBadge label="Carbos" valor={detalle.carbohidratos_g} unit="g" color="#f59e0b" />
                <MacroBadge label="Grasas" valor={detalle.grasas_g} unit="g" color="#10b981" />
              </div>

              {/* Notas generales */}
              {(detalle.borrador?.notas || detalle.contenido?.notas) && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">💡 Recomendaciones IA</p>
                  <p className="text-sm text-blue-800 leading-relaxed">{detalle.borrador?.notas || detalle.contenido?.notas}</p>
                </div>
              )}

              {/* Navegación días */}
              <div>
                <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Menú semanal</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {DIAS_SEMANA.map((d,i) => (
                    <button key={d} onClick={() => setDiaActivo(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${diaActivo===i?'bg-[#FF5C00] text-white':'bg-[#F5F5F0] text-[#6B6B6B] hover:bg-black/10'}`}>
                      {d.slice(0,3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comidas del día */}
              {(() => {
                const menu = detalle.borrador?.menu || detalle.contenido?.menu || []
                const diaData = menu[diaActivo]
                if (!diaData) return <p className="text-sm text-[#6B6B6B] text-center py-4">Sin datos para este día</p>
                return (
                  <div className="space-y-2">
                    {(diaData.comidas || []).map((comida, i) => (
                      <div key={i} className="border border-black/8 rounded-xl overflow-hidden">
                        <div className="bg-[#0A0A0A] px-4 py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold text-sm">{comida.nombre}</span>
                            <span className="text-white/40 text-xs">{comida.hora}</span>
                          </div>
                          <div className="flex gap-2 text-xs text-white/60">
                            <span>{comida.calorias}kcal</span>
                            <span>P:{comida.proteinas_g}g</span>
                          </div>
                        </div>
                        <div className="p-3 space-y-1.5">
                          {(comida.alimentos || []).map((al, j) => (
                            <div key={j} className="flex items-center justify-between text-sm">
                              <span className="text-[#0A0A0A]">{al.nombre}</span>
                              <span className="text-[#6B6B6B] text-xs font-medium">{al.cantidad}</span>
                            </div>
                          ))}
                          {comida.prep && (
                            <p className="text-xs text-[#6B6B6B] border-t border-black/5 pt-2 mt-2 leading-relaxed">
                              🍳 {comida.prep}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Disclaimer legal */}
              <div className="bg-[#F5F5F0] border border-black/8 rounded-xl p-3 flex gap-2">
                <span className="text-sm flex-shrink-0">⚖️</span>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  <span className="font-semibold text-[#0A0A0A]">Aviso legal:</span> Este plan nutricional es orientativo y no constituye prescripción dietética. Para un seguimiento médico-nutricional, consulta con un dietista-nutricionista titulado.
                </p>
              </div>
      {/* Hidratación */}
              {(detalle.borrador?.hidratacion || detalle.contenido?.hidratacion) && (
                <div className="bg-[#F5F5F0] rounded-xl p-3 flex items-center gap-3">
                  <span className="text-2xl">💧</span>
                  <div>
                    <p className="text-sm font-semibold text-[#0A0A0A]">{detalle.borrador?.hidratacion || detalle.contenido?.hidratacion}L de agua al día</p>
                    <p className="text-xs text-[#6B6B6B]">Hidratación recomendada</p>
                  </div>
                </div>
              )}

              {/* Notas entrenador */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Notas para el cliente</label>
                <textarea value={notasEdit} onChange={e => setNotasEdit(e.target.value)} rows={3}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                  placeholder="Indicaciones especiales, ajustes, contexto..." />
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                {detalle.estado==='borrador' ? (
                  <button onClick={() => publicar(detalle)} className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl">
                    ✅ Publicar para el cliente
                  </button>
                ) : (
                  <button onClick={() => { navigator.clipboard.writeText(portalUrl(detalle.cliente_id)); setToast({ msg: 'Enlace copiado' }) }}
                    className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl">
                    📋 Copiar enlace portal
                  </button>
                )}
                <button onClick={() => generarPlan(detalle.cliente_id)} disabled={generando===detalle.cliente_id}
                  className="border border-black/10 text-[#6B6B6B] text-sm py-3 px-4 rounded-xl hover:bg-[#F5F5F0] disabled:opacity-40">
                  {generando===detalle.cliente_id?'⏳':'🔄 Regenerar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cuestionario nutricional */}
      {modalCuest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-black/5 sticky top-0 bg-white z-10 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[#0A0A0A]">Cuestionario nutricional</h2>
                <p className="text-xs text-[#6B6B6B]">{modalCuest.nombre}</p>
              </div>
              <button onClick={() => setModalCuest(null)} className="text-[#6B6B6B] text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Datos físicos */}
              <div>
                <p className="text-xs font-bold text-[#0A0A0A] mb-2 uppercase tracking-wide">Datos físicos</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['Peso (kg)','peso','number'],['Altura (cm)','altura','number'],['Edad','edad','number']].map(([l,k,t])=>(
                    <div key={k}>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">{l}</label>
                      <input type={t} value={cuest[k]||''} onChange={e=>setCuest(c=>({...c,[k]:e.target.value}))}
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Sexo</label>
                    <select value={cuest.sexo||''} onChange={e=>setCuest(c=>({...c,sexo:e.target.value}))}
                      className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                      <option value="">Selecciona</option>
                      <option value="hombre">Hombre</option>
                      <option value="mujer">Mujer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actividad y objetivo */}
              <div>
                <p className="text-xs font-bold text-[#0A0A0A] mb-2 uppercase tracking-wide">Actividad y objetivo</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Nivel de actividad</label>
                    <select value={cuest.nivel_actividad||''} onChange={e=>setCuest(c=>({...c,nivel_actividad:e.target.value}))}
                      className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                      <option value="">Selecciona</option>
                      <option value="sedentario">Sedentario (sin ejercicio)</option>
                      <option value="ligero">Ligero (1-2 días/sem)</option>
                      <option value="moderado">Moderado (3-4 días/sem)</option>
                      <option value="activo">Activo (5-6 días/sem)</option>
                      <option value="muy_activo">Muy activo (2x/día)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Objetivo nutricional</label>
                    <select value={cuest.objetivo||''} onChange={e=>setCuest(c=>({...c,objetivo:e.target.value}))}
                      className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                      <option value="">Selecciona</option>
                      <option value="perdida_grasa">Pérdida de grasa</option>
                      <option value="ganancia_muscular">Ganancia muscular</option>
                      <option value="recomposicion">Recomposición corporal</option>
                      <option value="mantenimiento">Mantenimiento</option>
                      <option value="rendimiento">Rendimiento deportivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Velocidad de progreso</label>
                    <select value={cuest.velocidad_progreso||''} onChange={e=>setCuest(c=>({...c,velocidad_progreso:e.target.value}))}
                      className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                      <option value="">Selecciona</option>
                      <option value="lento">Lento y sostenible (0.25kg/sem)</option>
                      <option value="moderado">Moderado (0.5kg/sem)</option>
                      <option value="rapido">Rápido (0.75-1kg/sem)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Hábitos */}
              <div>
                <p className="text-xs font-bold text-[#0A0A0A] mb-2 uppercase tracking-wide">Hábitos alimentarios</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Comidas al día</label>
                      <select value={cuest.comidas_dia||''} onChange={e=>setCuest(c=>({...c,comidas_dia:Number(e.target.value)}))}
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                        <option value="">—</option>
                        {[2,3,4,5,6].map(n=><option key={n} value={n}>{n} comidas</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Tiempo cocinar</label>
                      <select value={cuest.tiempo_cocina||''} onChange={e=>setCuest(c=>({...c,tiempo_cocina:e.target.value}))}
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                        <option value="">—</option>
                        <option value="10-15 minutos">Muy poco (10-15 min)</option>
                        <option value="30 minutos">Normal (30 min)</option>
                        <option value="1 hora">Me gusta cocinar (1h)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Tipo de dieta</label>
                    <select value={cuest.tipo_dieta||''} onChange={e=>setCuest(c=>({...c,tipo_dieta:e.target.value}))}
                      className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                      <option value="">Selecciona</option>
                      {['Omnívora','Vegetariana','Vegana','Pescetariana','Sin gluten','Sin lactosa','Cetogénica','Paleo'].map(d=><option key={d} value={d.toLowerCase()}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Entrena cuándo</label>
                    <select value={cuest.entrena_cuando||''} onChange={e=>setCuest(c=>({...c,entrena_cuando:e.target.value}))}
                      className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                      <option value="">—</option>
                      <option value="mañana en ayunas">Mañana en ayunas</option>
                      <option value="mañana">Mañana (con desayuno)</option>
                      <option value="mediodía">Mediodía</option>
                      <option value="tarde">Tarde</option>
                      <option value="noche">Noche</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Restricciones */}
              <div>
                <p className="text-xs font-bold text-[#0A0A0A] mb-2 uppercase tracking-wide">Restricciones y preferencias</p>
                <div className="space-y-2">
                  {[['Alergias e intolerancias','alergias','Ej: lactosa, gluten, frutos secos...'],['Alimentos que no le gustan','alimentos_no_gustan','Ej: hígado, sardinas, coles de bruselas...'],['Alimentos favoritos','alimentos_favoritos','Ej: pollo, arroz, huevos, frutas...'],['Suplementos que toma','suplementos','Ej: proteína whey, creatina, vitamina D...'],['Notas adicionales','notas','Contexto extra relevante...']].map(([l,k,ph])=>(
                    <div key={k}>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">{l}</label>
                      <input value={cuest[k]||''} onChange={e=>setCuest(c=>({...c,[k]:e.target.value}))} placeholder={ph}
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-black/5 sticky bottom-0 bg-white flex gap-2">
              <button onClick={() => setModalCuest(null)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-3 rounded-xl">Cancelar</button>
              <button onClick={() => guardarCuest(modalCuest.id)}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl">
                💾 Guardar y generar plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal enlace cuestionario */}
      {modalActivar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🥗</div>
            <h2 className="font-bold text-[#0A0A0A] mb-2">Nutrición activada</h2>
            <p className="text-sm text-[#6B6B6B] mb-4">Puedes rellenar el cuestionario aquí directamente o mándale el enlace al cliente para que lo rellene él.</p>
            <button onClick={() => { navigator.clipboard.writeText(cuestUrl(uid, modalActivar)); setToast({ msg: 'Enlace cuestionario copiado' }); setModalActivar(null) }}
              className="w-full border border-black/10 text-[#0A0A0A] text-sm font-medium py-2.5 rounded-xl mb-2 hover:bg-[#F5F5F0]">
              📋 Copiar enlace para el cliente
            </button>
            <button onClick={() => { const c = clientes.find(x=>x.id===modalActivar); setModalCuest(c); setCuest({ peso: c?.peso_actual, objetivo: c?.objetivo }); setModalActivar(null) }}
              className="w-full bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl">
              ✍️ Rellenar yo ahora
            </button>
            <button onClick={() => setModalActivar(null)} className="mt-2 text-xs text-[#6B6B6B]">Cerrar</button>
          </div>
        </div>
      )}
      {quickView && <ClienteQuickView clienteId={quickView} onClose={() => setQuickView(null)} />}
    </div>
  )
}