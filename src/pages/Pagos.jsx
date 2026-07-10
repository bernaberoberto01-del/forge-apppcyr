import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'

export default function Pagos({ session }) {
  const [pagos, setPagos] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(false)
  const [modalStripe, setModalStripe] = useState(false)
  const [form, setForm] = useState({ cliente_id:'', importe:'', concepto:'', fecha_pago: new Date().toISOString().split('T')[0], valido_hasta:'' })
  const [stripeForm, setStripeForm] = useState({ cliente_id:'', importe:'', concepto:'Mensualidad online' })
  const [loading, setLoading] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [ingresosMes, setIngresosMes] = useState(0)
  const uid = session.user.id

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const [{ data: pg }, { data: cl }] = await Promise.all([
      supabase.from('pagos').select('*, clientes(nombre, tipo)').eq('entrenador_id', uid).order('fecha_pago', { ascending: false }),
      supabase.from('clientes').select('id,nombre,tipo,precio_mensual').eq('entrenador_id', uid).eq('estado','activo'),
    ])
    setPagos(pg || [])
    setClientes(cl || [])
    const total = (pg || []).filter(p => p.fecha_pago >= inicioMes).reduce((s, p) => s + Number(p.importe), 0)
    setIngresosMes(total)
  }

  async function guardarManual() {
    setLoading(true)
    await supabase.from('pagos').insert({ ...form, entrenador_id: uid, importe: Number(form.importe) })
    setModal(false)
    setForm({ cliente_id:'', importe:'', concepto:'', fecha_pago: new Date().toISOString().split('T')[0], valido_hasta:'' })
    await cargar()
    setLoading(false)
  }

  async function generarEnlaceStripe() {
    if (!stripeForm.cliente_id || !stripeForm.importe) return
    setGenerando(true)
    const res = await fetch(`${SUPABASE_URL}/functions/v1/crear-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ cliente_id: stripeForm.cliente_id, importe: Number(stripeForm.importe), concepto: stripeForm.concepto })
    })
    const data = await res.json()
    setGenerando(false)
    if (data.url) {
      navigator.clipboard.writeText(data.url)
      alert('✅ Enlace de pago copiado. Mándaselo al cliente por WhatsApp.')
      setModalStripe(false)
    } else {
      alert('Error: ' + (data.error || 'desconocido'))
    }
  }

  const st = p => {
    if (!p.valido_hasta) return { l:'Sin fecha', c:'bg-gray-50 text-gray-500' }
    const d = Math.ceil((new Date(p.valido_hasta)-new Date())/864e5)
    return d<0?{l:'Vencido',c:'bg-red-50 text-red-600'}:d<=7?{l:`${d}d`,c:'bg-amber-50 text-amber-600'}:{l:'Al día',c:'bg-green-50 text-green-700'}
  }
  const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  const clienteOnline = clientes.filter(c => c.tipo === 'online')
  const clientePresencial = clientes.filter(c => c.tipo === 'presencial')

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#111]">Pagos</h1>
        <div className="flex gap-2">
          <button onClick={() => setModalStripe(true)} className="border border-[#635BFF] text-[#635BFF] text-sm font-medium px-3 py-2 rounded-lg hover:bg-[#635BFF]/5 transition-colors">
            💳 Stripe
          </button>
          <button onClick={() => setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Manual
          </button>
        </div>
      </div>

      {/* Resumen mes */}
      <div className="bg-[#111] rounded-xl p-4 mb-4">
        <p className="text-gray-400 text-xs mb-1">Ingresos este mes</p>
        <p className="text-3xl font-bold text-white">{ingresosMes}€</p>
        <div className="flex gap-4 mt-2">
          <div><p className="text-orange-500 font-semibold text-sm">{pagos.filter(p => { const d = new Date(); return new Date(p.fecha_pago).getMonth() === d.getMonth() }).length}</p><p className="text-gray-500 text-xs">Cobros</p></div>
          <div><p className="text-red-400 font-semibold text-sm">{pagos.filter(p => p.valido_hasta && new Date(p.valido_hasta) < new Date()).length}</p><p className="text-gray-500 text-xs">Vencidos</p></div>
          <div><p className="text-amber-400 font-semibold text-sm">{pagos.filter(p => { if (!p.valido_hasta) return false; const d = Math.ceil((new Date(p.valido_hasta)-new Date())/864e5); return d>=0&&d<=7 }).length}</p><p className="text-gray-500 text-xs">Vence pronto</p></div>
        </div>
      </div>

      {/* Lista pagos */}
      <div className="space-y-2">
        {pagos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Sin pagos registrados</p>
          </div>
        ) : pagos.map(p => {
          const { l, c } = st(p)
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-xs flex-shrink-0">
                {ini(p.clientes?.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#111] truncate">{p.clientes?.nombre}</p>
                  {p.clientes?.tipo === 'online' && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0">online</span>}
                </div>
                <p className="text-xs text-gray-400">{p.concepto||'Mensualidad'} · {new Date(p.fecha_pago).toLocaleDateString('es-ES')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-orange-500 text-sm">{p.importe}€</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c}`}>{l}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Stripe */}
      {modalStripe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-semibold text-[#111] mb-1">Cobrar con Stripe</h2>
            <p className="text-xs text-gray-400 mb-4">Genera un enlace de pago y mándaselo al cliente. Cuando pague se activa su acceso automáticamente.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente online</label>
                <select value={stripeForm.cliente_id} onChange={e => {
                  const c = clientes.find(x => x.id === e.target.value)
                  setStripeForm({ ...stripeForm, cliente_id: e.target.value, importe: c?.precio_mensual || stripeForm.importe })
                }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#635BFF]">
                  <option value="">Selecciona cliente</option>
                  {clienteOnline.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.precio_mensual ? `(${c.precio_mensual}€)` : ''}</option>)}
                  {clientePresencial.length > 0 && <optgroup label="Presencial">
                    {clientePresencial.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </optgroup>}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Importe (€)</label>
                <input type="number" step="0.01" value={stripeForm.importe} onChange={e => setStripeForm({ ...stripeForm, importe: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#635BFF]" placeholder="99" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Concepto</label>
                <input type="text" value={stripeForm.concepto} onChange={e => setStripeForm({ ...stripeForm, concepto: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#635BFF]" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalStripe(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-lg">Cancelar</button>
              <button onClick={generarEnlaceStripe} disabled={!stripeForm.cliente_id || !stripeForm.importe || generando}
                className="flex-1 bg-[#635BFF] text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50">
                {generando ? 'Generando...' : '💳 Generar enlace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal manual */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-semibold text-[#111] mb-4">Registrar pago manual</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm({...form,cliente_id:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Selecciona cliente</option>
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
              <button onClick={guardarManual} disabled={!form.cliente_id||!form.importe||loading} className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50">
                {loading?'Guardando...':'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
