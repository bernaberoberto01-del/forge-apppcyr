import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ESCALAS = [
  { label: 'Energía', field: 'energia', min: 1, max: 10, suffix: '/10', color: 'blue' },
  { label: 'Sueño (horas)', field: 'sueno', min: 4, max: 10, suffix: 'h', color: 'purple' },
  { label: 'Estrés', field: 'estres', min: 1, max: 5, suffix: '/5', red: true },
  { label: 'Fatiga muscular', field: 'fatiga', min: 1, max: 5, suffix: '/5', red: true },
  { label: 'Motivación', field: 'motivacion', min: 1, max: 7, suffix: '/7', color: 'yellow' },
  { label: 'Calidad entreno', field: 'calidad_entreno', min: 1, max: 7, suffix: '/7', color: 'green' },
  { label: 'Adherencia entreno', field: 'adherencia_entreno', min: 1, max: 10, suffix: '/10', color: 'orange' },
  { label: 'Adherencia nutrición', field: 'adherencia_nutricion', min: 1, max: 10, suffix: '/10', color: 'orange' },
]

const initForm = {
  cliente_id: '', peso: '', energia: 7, sueno: 7, estres: 2, fatiga: 2,
  motivacion: 5, calidad_entreno: 5, sesiones_semana: 3,
  adherencia_entreno: 7, adherencia_nutricion: 7, pasos_diarios: '', comentario: ''
}

const badgeColor = (field, val) => {
  if (field === 'estres' || field === 'fatiga') return val >= 4 ? 'bg-red-50 text-red-700' : val >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
  if (field === 'energia' || field === 'motivacion' || field === 'calidad_entreno') return val >= 7 ? 'bg-green-50 text-green-700' : val >= 4 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
  if (field === 'adherencia_entreno' || field === 'adherencia_nutricion') return val >= 7 ? 'bg-green-50 text-green-700' : val >= 4 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
  return 'bg-gray-50 text-gray-600'
}

export default function Seguimiento({ session }) {
  const [checkins, setCheckins] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initForm)
  const [loading, setLoading] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const uid = session.user.id

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const [{ data: ci }, { data: cl }] = await Promise.all([
      supabase.from('checkins').select('*, clientes(nombre, tipo)').eq('entrenador_id', uid).order('fecha', { ascending: false }).limit(50),
      supabase.from('clientes').select('id,nombre,tipo').eq('entrenador_id', uid).eq('estado', 'activo'),
    ])
    setCheckins(ci || [])
    setClientes(cl || [])
  }

  async function guardar() {
    setLoading(true)
    await supabase.from('checkins').insert({
      ...form,
      entrenador_id: uid,
      peso: form.peso ? Number(form.peso) : null,
      pasos_diarios: form.pasos_diarios ? Number(form.pasos_diarios) : null
    })
    setModal(false)
    setForm(initForm)
    await cargar()
    setLoading(false)
  }

  const Btn = ({ field, val }) => {
    const active = form[field] === val
    const isRed = (field === 'estres' || field === 'fatiga') && val >= 4
    return (
      <button type="button" onClick={() => setForm(f => ({ ...f, [field]: val }))}
        className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all ${active
          ? isRed ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
          : 'border border-gray-200 text-gray-500 hover:border-orange-300'}`}>
        {val}
      </button>
    )
  }

  const filtrados = filtroCliente === 'todos' ? checkins : checkins.filter(c => c.cliente_id === filtroCliente)
  const ini = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Seguimiento</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Check-ins semanales automáticos · Detecta fatiga, estrés y abandono antes de que ocurran</p>
        <button onClick={() => setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Registrar
        </button>
      </div>

      {/* Filtro por cliente */}
      {clientes.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button onClick={() => setFiltroCliente('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${filtroCliente === 'todos' ? 'bg-[#111] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            Todos
          </button>
          {clientes.map(c => (
            <button key={c.id} onClick={() => setFiltroCliente(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${filtroCliente === c.id ? 'bg-[#111] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
              {c.nombre.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Lista checkins */}
      <div className="space-y-2">
        {filtrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Sin seguimientos registrados</p>
          </div>
        ) : filtrados.map(ci => (
          <div key={ci.id} className="bg-white rounded-xl border border-gray-100 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-xs flex-shrink-0">
                  {ini(ci.clientes?.nombre)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#111]">{ci.clientes?.nombre}</p>
                  <p className="text-xs text-gray-400">{new Date(ci.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="text-right">
                {ci.peso && <p className="text-base font-bold text-orange-500">{ci.peso}kg</p>}
                {ci.pasos_diarios && <p className="text-xs text-gray-400">👟 {ci.pasos_diarios.toLocaleString()}</p>}
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {ci.energia && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('energia', ci.energia)}`}>⚡ {ci.energia}/10</span>}
              {ci.sueno && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-medium">😴 {ci.sueno}h</span>}
              {ci.estres && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('estres', ci.estres)}`}>😤 {ci.estres}/5</span>}
              {ci.fatiga && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('fatiga', ci.fatiga)}`}>🔥 {ci.fatiga}/5</span>}
              {ci.motivacion && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('motivacion', ci.motivacion)}`}>💫 {ci.motivacion}/7</span>}
              {ci.calidad_entreno && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('calidad_entreno', ci.calidad_entreno)}`}>🏋️ {ci.calidad_entreno}/7</span>}
              {ci.sesiones_semana != null && <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-full font-medium">📅 {ci.sesiones_semana} ses</span>}
              {ci.adherencia_entreno && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('adherencia_entreno', ci.adherencia_entreno)}`}>💪 {ci.adherencia_entreno}/10</span>}
              {ci.adherencia_nutricion && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('adherencia_nutricion', ci.adherencia_nutricion)}`}>🥗 {ci.adherencia_nutricion}/10</span>}
            </div>
            {ci.comentario && <p className="text-xs text-gray-500 mt-2 italic border-t border-gray-50 pt-2">"{ci.comentario}"</p>}
          </div>
        ))}
      </div>

      {/* Modal registrar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
            <h2 className="font-semibold text-[#111] mb-4">Registrar seguimiento</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Peso (kg)</label>
                  <input type="number" step="0.1" value={form.peso} onChange={e => setForm(f => ({ ...f, peso: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="70.5" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Pasos diarios</label>
                  <input type="number" value={form.pasos_diarios} onChange={e => setForm(f => ({ ...f, pasos_diarios: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="8000" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Sesiones esta semana: <span className="text-orange-500 font-bold">{form.sesiones_semana}</span></label>
                <div className="flex gap-1.5 flex-wrap">
                  {[0,1,2,3,4,5,6,7].map(v => <Btn key={v} field="sesiones_semana" val={v} />)}
                </div>
              </div>

              {ESCALAS.map(({ label, field, min, max, suffix }) => (
                <div key={field}>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">{label}: <span className="text-orange-500 font-bold">{form[field]}{suffix}</span></label>
                  <div className="flex gap-1.5 flex-wrap">
                    {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(v => <Btn key={v} field={field} val={v} />)}
                  </div>
                </div>
              ))}

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Comentario</label>
                <textarea value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))}
                  rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none"
                  placeholder="Observaciones de la sesión..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setModal(false); setForm(initForm) }} className="flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={!form.cliente_id || loading}
                className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
