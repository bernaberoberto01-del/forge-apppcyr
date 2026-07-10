import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const initForm = { cliente_id:'', importe:'', concepto:'', fecha_pago: new Date().toISOString().split('T')[0], valido_hasta:'' }

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111] text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2">
      <span className="text-emerald-400">✓</span> {msg}
    </div>
  )
}

export default function Pagos({ session }) {
  const [pagos, setPagos] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(false)
  const [modalStripe, setModalStripe] = useState(false)
  const [form, setForm] = useState(initForm)
  const [editId, setEditId] = useState(null)
  const [stripeForm, setStripeForm] = useState({ cliente_id:'', importe:'', concepto:'Mensualidad online' })
  const [loading, setLoading] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [toast, setToast] = useState('')
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

  async function guardar() {
    setLoading(true)
    if (editId) {
      await supabase.from('pagos').update({ ...form, importe: Number(form.importe) }).eq('id', editId)
      setToast('Pago actualizado')
    } else {
      await supabase.from('pagos').insert({ ...form, entrenador_id: uid, importe: Number(form.importe) })
      setToast('Pago registrado')
    }
    setModal(false); setEditId(null); setForm(initForm)
    await cargar(); setLoading(false)
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este pago?')) return
    await supabase.from('pagos').delete().eq('id', id)
    setToast('Pago eliminado')
    await cargar()
  }

  function abrirEditar(p) {
    setForm({ cliente_id: p.cliente_id, importe: p.importe, concepto: p.concepto || '', fecha_pago: p.fecha_pago, valido_hasta: p.valido_hasta || '' })
    setEditId(p.id); setModal(true)
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
      setModalStripe(false)
      setToast('Enlace de pago copiado — mándaselo al cliente')
    } else {
      setToast('Error al generar enlace: ' + (data.error || 'desconocido'))
    }
  }

  const st = p => {
    if (!p.valido_hasta) return { l:'Sin fecha', c:'bg-black/5 text-[#6B6B6B]' }
    const d = Math.ceil((new Date(p.valido_hasta)-new Date())/864e5)
    return d<0 ? {l:'Vencido',c:'bg-red-50 text-red-600'} : d<=7 ? {l:`${d}d`,c:'bg-amber-50 text-amber-600'} : {l:'Al día',c:'bg-emerald-50 text-emerald-700'}
  }
  const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const clienteOnline = clientes.filter(c => c.tipo === 'online')
  const clientePresencial = clientes.filter(c => c.tipo === 'presencial')
  const hoy = new Date().toISOString().split('T')[0]
  const vencidos = pagos.filter(p => p.valido_hasta && p.valido_hasta < hoy).length
  const proxVencer = pagos.filter(p => { if(!p.valido_hasta) return false; const d=Math.ceil((new Date(p.valido_hasta)-new Date())/864e5); return d>=0&&d<=7 }).length

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Pagos</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Registra cobros manuales o genera enlaces Stripe · Los pagos online activan el acceso automáticamente</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setModalStripe(true)}
            className="border border-[#635BFF] text-[#635BFF] text-sm font-semibold px-3 py-2.5 rounded-xl hover:bg-[#635BFF]/5 transition-all">
            💳 Stripe
          </button>
          <button onClick={() => { setForm(initForm); setEditId(null); setModal(true) }}
            className="bg-[#FF5C00] hover:bg-[#E05200] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95">
            + Manual
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-[#111] rounded-2xl p-5 mb-4">
        <p className="text-white/40 text-xs mb-1">Ingresos este mes</p>
        <p className="text-4xl font-bold text-white mb-3">{ingresosMes.toLocaleString('es-ES')}€</p>
        <div className="flex gap-5">
          <div><p className="text-[#FF5C00] font-bold text-lg">{pagos.filter(p => new Date(p.fecha_pago).getMonth() === new Date().getMonth() && new Date(p.fecha_pago).getFullYear() === new Date().getFullYear()).length}</p><p className="text-white/40 text-xs">Cobros</p></div>
          <div><p className="text-red-400 font-bold text-lg">{vencidos}</p><p className="text-white/40 text-xs">Vencidos</p></div>
          <div><p className="text-amber-400 font-bold text-lg">{proxVencer}</p><p className="text-white/40 text-xs">Vence pronto</p></div>
        </div>
      </div>

      {/* Lista pagos */}
      <div className="space-y-2">
        {pagos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">💶</p>
            <p className="font-semibold text-[#0A0A0A]">Sin pagos registrados</p>
            <p className="text-sm text-[#6B6B6B] mt-1">Registra un cobro manual o genera un enlace de pago con Stripe</p>
          </div>
        ) : pagos.map(p => {
          const { l, c } = st(p)
          return (
            <div key={p.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-[#FF5C00]/10 rounded-full flex items-center justify-center text-[#FF5C00] font-bold text-xs flex-shrink-0">
                  {ini(p.clientes?.nombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#0A0A0A] truncate">{p.clientes?.nombre}</p>
                    {p.clientes?.tipo === 'online' && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0">online</span>}
                  </div>
                  <p className="text-xs text-[#6B6B6B]">{p.concepto||'Mensualidad'} · {new Date(p.fecha_pago).toLocaleDateString('es-ES')}</p>
                  {p.valido_hasta && <p className="text-xs text-[#6B6B6B]/60">Hasta: {new Date(p.valido_hasta).toLocaleDateString('es-ES')}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-[#FF5C00] text-base">{p.importe}€</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c}`}>{l}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2.5 border-t border-black/5">
                <button onClick={() => abrirEditar(p)}
                  className="flex-1 border border-black/10 text-[#0A0A0A] text-xs font-medium py-2 rounded-lg hover:bg-[#F5F5F0] transition-all">
                  ✏️ Editar
                </button>
                <button onClick={() => eliminar(p.id)}
                  className="flex-1 border border-red-100 text-red-500 text-xs font-medium py-2 rounded-lg hover:bg-red-50 transition-all">
                  🗑 Eliminar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Stripe */}
      {modalStripe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-1">Cobrar con Stripe</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">Genera un enlace de pago. Cuando el cliente pague se activa su acceso automáticamente.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente</label>
                <select value={stripeForm.cliente_id} onChange={e => {
                  const c = clientes.find(x => x.id === e.target.value)
                  setStripeForm({ ...stripeForm, cliente_id: e.target.value, importe: c?.precio_mensual || stripeForm.importe })
                }} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#635BFF] bg-white">
                  <option value="">Selecciona cliente</option>
                  {clienteOnline.length > 0 && <optgroup label="Online">{clienteOnline.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.precio_mensual?` (${c.precio_mensual}€)`:''}</option>)}</optgroup>}
                  {clientePresencial.length > 0 && <optgroup label="Presencial">{clientePresencial.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Importe (€)</label>
                <input type="number" step="0.01" value={stripeForm.importe} onChange={e => setStripeForm({ ...stripeForm, importe: e.target.value })}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#635BFF]" placeholder="99" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Concepto</label>
                <input type="text" value={stripeForm.concepto} onChange={e => setStripeForm({ ...stripeForm, concepto: e.target.value })}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#635BFF]" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalStripe(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={generarEnlaceStripe} disabled={!stripeForm.cliente_id || !stripeForm.importe || generando}
                className="flex-1 bg-[#635BFF] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {generando ? 'Generando...' : '💳 Generar enlace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal manual/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-4">{editId ? 'Editar pago' : 'Registrar pago manual'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm({...form,cliente_id:e.target.value})} disabled={!!editId}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white disabled:opacity-60">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Importe (€)</label>
                <input type="number" value={form.importe} onChange={e => setForm({...form,importe:e.target.value})}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" placeholder="120" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Fecha pago</label>
                  <input type="date" value={form.fecha_pago} onChange={e => setForm({...form,fecha_pago:e.target.value})}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Válido hasta</label>
                  <input type="date" value={form.valido_hasta} onChange={e => setForm({...form,valido_hasta:e.target.value})}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Concepto</label>
                <input type="text" value={form.concepto} onChange={e => setForm({...form,concepto:e.target.value})}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" placeholder="Mensualidad julio" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setModal(false); setEditId(null); setForm(initForm) }}
                className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={guardar} disabled={!form.cliente_id||!form.importe||loading}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {loading ? 'Guardando...' : editId ? 'Guardar cambios' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
