import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Pagos({ session }) {
  const [pagos, setPagos] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ cliente_id:'', importe:'', concepto:'', fecha_pago: new Date().toISOString().split('T')[0], valido_hasta:'' })
  const [loading, setLoading] = useState(false)
  const uid = session.user.id

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const [{ data: pg }, { data: cl }] = await Promise.all([
      supabase.from('pagos').select('*, clientes(nombre)').eq('entrenador_id', uid).order('fecha_pago', { ascending: false }),
      supabase.from('clientes').select('id,nombre').eq('entrenador_id', uid).eq('estado','activo'),
    ])
    setPagos(pg || [])
    setClientes(cl || [])
  }

  async function guardar() {
    setLoading(true)
    await supabase.from('pagos').insert({ ...form, entrenador_id: uid, importe: Number(form.importe) })
    setModal(false)
    setForm({ cliente_id:'', importe:'', concepto:'', fecha_pago: new Date().toISOString().split('T')[0], valido_hasta:'' })
    await cargar()
    setLoading(false)
  }

  const status = (p) => {
    if (!p.valido_hasta) return { label:'Sin fecha', cls:'bg-gray-50 text-gray-500' }
    const d = Math.ceil((new Date(p.valido_hasta)-new Date())/86400000)
    if (d < 0) return { label:'Vencido', cls:'bg-red-50 text-red-600' }
    if (d <= 7) return { label:`${d}d`, cls:'bg-amber-50 text-amber-600' }
    return { label:'Al día', cls:'bg-green-50 text-green-700' }
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#111]">Pagos</h1>
        <button onClick={() => setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Registrar</button>
      </div>

      <div className="space-y-2">
        {pagos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Sin pagos registrados</p>
          </div>
        ) : pagos.map(p => {
          const st = status(p)
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-xs flex-shrink-0">
                {(p.clientes?.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#111] truncate">{p.clientes?.nombre}</p>
                <p className="text-xs text-gray-400">{p.concepto || 'Mensualidad'} · {new Date(p.fecha_pago).toLocaleDateString('es-ES')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-orange-500 text-sm">{p.importe}€</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-semibold text-[#111] mb-4">Registrar pago</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm({...form,cliente_id:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Selecciona un cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Importe (€)</label>
                <input type="number" value={form.importe} onChange={e => setForm({...form,importe:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="120" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha pago</label>
                  <input type="date" value={form.fecha_pago} onChange={e => setForm({...form,fecha_pago:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Válido hasta</label>
                  <input type="date" value={form.valido_hasta} onChange={e => setForm({...form,valido_hasta:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Concepto</label>
                <input type="text" value={form.concepto} onChange={e => setForm({...form,concepto:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="Mensualidad julio" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={!form.cliente_id || !form.importe || loading} className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
