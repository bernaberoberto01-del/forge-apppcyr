import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Sesiones({ session }) {
  const [sesiones, setSesiones] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ cliente_id:'', fecha: new Date().toISOString().split('T')[0], tipo:'presencial', notas:'' })
  const [loading, setLoading] = useState(false)
  const uid = session.user.id

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const [{ data: se }, { data: cl }] = await Promise.all([
      supabase.from('sesiones').select('*, clientes(nombre)').eq('entrenador_id', uid).order('fecha', { ascending: false }),
      supabase.from('clientes').select('id,nombre').eq('entrenador_id', uid).eq('estado','activo'),
    ])
    setSesiones(se || [])
    setClientes(cl || [])
  }

  async function guardar() {
    setLoading(true)
    await supabase.from('sesiones').insert({ ...form, entrenador_id: uid })
    setModal(false)
    setForm({ cliente_id:'', fecha: new Date().toISOString().split('T')[0], tipo:'presencial', notas:'' })
    await cargar()
    setLoading(false)
  }

  const ini = (n) => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#111]">Sesiones</h1>
        <button onClick={() => setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Registrar</button>
      </div>

      <div className="space-y-2">
        {sesiones.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Sin sesiones registradas</p>
          </div>
        ) : sesiones.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-xs flex-shrink-0">{ini(s.clientes?.nombre)}</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#111]">{s.clientes?.nombre}</p>
              <p className="text-xs text-gray-400">{s.tipo} · {new Date(s.fecha).toLocaleDateString('es-ES')}</p>
              {s.notas && <p className="text-xs text-gray-400 mt-0.5 italic">{s.notas}</p>}
            </div>
            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">✓</span>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-semibold text-[#111] mb-4">Registrar sesión</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm({...form,cliente_id:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Selecciona un cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm({...form,fecha:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({...form,tipo:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                    <option value="presencial">Presencial</option>
                    <option value="pareja_grupo">Pareja/Grupo</option>
                    <option value="clase_grupal">Clase grupal</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notas (opcional)</label>
                <textarea value={form.notas} onChange={e => setForm({...form,notas:e.target.value})} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none" />
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
