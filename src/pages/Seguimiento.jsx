import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Seguimiento({ session }) {
  const [checkins, setCheckins] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ cliente_id:'', peso:'', energia:5, sueno:7, estres:2, sesiones_semana:3, adherencia_entreno:7, adherencia_nutricion:7, pasos_diarios:'', comentario:'' })
  const [loading, setLoading] = useState(false)
  const uid = session.user.id

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const [{ data: ci }, { data: cl }] = await Promise.all([
      supabase.from('checkins').select('*, clientes(nombre)').eq('entrenador_id', uid).order('fecha', { ascending: false }),
      supabase.from('clientes').select('id,nombre').eq('entrenador_id', uid).eq('estado','activo'),
    ])
    setCheckins(ci || [])
    setClientes(cl || [])
  }

  async function guardar() {
    setLoading(true)
    await supabase.from('checkins').insert({ ...form, entrenador_id: uid, peso: form.peso ? Number(form.peso) : null, pasos_diarios: form.pasos_diarios ? Number(form.pasos_diarios) : null })
    setModal(false)
    setForm({ cliente_id:'', peso:'', energia:5, sueno:7, estres:2, sesiones_semana:3, adherencia_entreno:7, adherencia_nutricion:7, pasos_diarios:'', comentario:'' })
    await cargar()
    setLoading(false)
  }

  const ScaleButtons = ({ label, field, min, max, suffix='' }) => (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-2 block">{label}: <span className="text-orange-500 font-bold">{form[field]}{suffix}</span></label>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({length: max-min+1}, (_,i) => i+min).map(v => (
          <button key={v} type="button" onClick={() => setForm({...form,[field]:v})}
            className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${form[field]===v ? (field==='estres'&&v>=4?'bg-red-500 text-white':'bg-orange-500 text-white') : 'border border-gray-200 text-gray-500 hover:border-orange-300'}`}>
            {v}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#111]">Seguimiento</h1>
        <button onClick={() => setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Registrar</button>
      </div>

      <div className="space-y-2">
        {checkins.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Sin seguimientos registrados</p>
          </div>
        ) : checkins.map(ci => (
          <div key={ci.id} className="bg-white rounded-xl border border-gray-100 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-xs">
                  {(ci.clientes?.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-[#111]">{ci.clientes?.nombre}</span>
              </div>
              <div className="flex items-center gap-2">
                {ci.peso && <span className="text-sm font-bold text-orange-500">{ci.peso}kg</span>}
                <span className="text-xs text-gray-400">{new Date(ci.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {ci.energia && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">⚡ {ci.energia}/10</span>}
              {ci.sueno && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">😴 {ci.sueno}h</span>}
              {ci.estres && <span className={`text-xs px-2 py-1 rounded-full ${ci.estres>=4?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>😤 {ci.estres}/5</span>}
              {ci.sesiones_semana!=null && <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-full">🏋️ {ci.sesiones_semana} ses.</span>}
              {ci.pasos_diarios && <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-full">👟 {ci.pasos_diarios.toLocaleString()}</span>}
            </div>
            {ci.comentario && <p className="text-xs text-gray-500 mt-2 italic">"{ci.comentario}"</p>}
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
            <h2 className="font-semibold text-[#111] mb-4">Registrar seguimiento</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm({...form,cliente_id:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Selecciona un cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Peso actual (kg)</label>
                  <input type="number" step="0.1" value={form.peso} onChange={e => setForm({...form,peso:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="70.5" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Pasos diarios</label>
                  <input type="number" value={form.pasos_diarios} onChange={e => setForm({...form,pasos_diarios:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="8000" />
                </div>
              </div>
              <ScaleButtons label="Energía" field="energia" min={1} max={10} suffix="/10" />
              <ScaleButtons label="Sueño (horas)" field="sueno" min={4} max={10} suffix="h" />
              <ScaleButtons label="Estrés" field="estres" min={1} max={5} suffix="/5" />
              <ScaleButtons label="Sesiones esta semana" field="sesiones_semana" min={0} max={7} />
              <ScaleButtons label="Adherencia entreno" field="adherencia_entreno" min={1} max={10} suffix="/10" />
              <ScaleButtons label="Adherencia nutrición" field="adherencia_nutricion" min={1} max={10} suffix="/10" />
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Comentario libre</label>
                <textarea value={form.comentario} onChange={e => setForm({...form,comentario:e.target.value})} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none" placeholder="¿Algo que quieras añadir?" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={!form.cliente_id || loading} className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
