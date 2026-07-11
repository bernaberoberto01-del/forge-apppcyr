import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import ClienteQuickView from '../components/ClienteQuickView'

const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'

function Toast({ msg, tipo='ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 whitespace-nowrap ${tipo==='error'?'bg-red-600':'bg-[#111]'}`}>
      <span>{tipo==='error'?'⚠':'✓'}</span> {msg}
    </div>
  )
}

const FRECUENCIAS = { mensual:'Mensual', quincenal:'Quincenal', semanal:'Semanal' }
const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

function proximoCobro(plan) {
  if (!plan.proximo_cobro) return null
  return new Date(plan.proximo_cobro + 'T12:00')
}
function diasRestantes(plan) {
  const p = proximoCobro(plan)
  if (!p) return null
  return Math.ceil((p - new Date()) / 864e5)
}

export default function Pagos({ session }) {
  const [tab, setTab] = useState('estado')
  const [pagos, setPagos] = useState([])
  const [clientes, setClientes] = useState([])
  const [planes, setPlanes] = useState([])
  const [modal, setModal] = useState(false)
  const [modalPlan, setModalPlan] = useState(false)
  const [editandoPlan, setEditandoPlan] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [quickView, setQuickView] = useState(null)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ cliente_id:'', importe:'', concepto:'Entrenamiento personal', fecha_pago: new Date().toISOString().split('T')[0], periodo:'' })
  const [formPlan, setFormPlan] = useState({ cliente_id:'', importe:'', concepto:'Entrenamiento personal', frecuencia:'mensual', dia_cobro:1 })
  const [loading, setLoading] = useState(false)
  const [generandoStripe, setGenerandoStripe] = useState(null)
  const uid = session.user.id

  function generarRecibo(pago) {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, sans-serif; color: #0A0A0A; padding: 40px; max-width: 600px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #FF5C00; }
  .logo { font-size: 24px; font-weight: 800; color: #FF5C00; }
  .recibo-num { font-size: 13px; color: #6B6B6B; text-align: right; }
  .recibo-num strong { display: block; font-size: 16px; color: #0A0A0A; }
  .section { margin-bottom: 24px; }
  .label { font-size: 11px; color: #6B6B6B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .value { font-size: 15px; font-weight: 500; }
  .amount-box { background: #F5F5F0; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0; }
  .amount { font-size: 48px; font-weight: 800; color: #FF5C00; }
  .amount-label { font-size: 13px; color: #6B6B6B; margin-top: 4px; }
  .footer { font-size: 11px; color: #6B6B6B; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">Forge Studio</div>
    <div class="recibo-num">
      <span>Recibo</span>
      <strong>#${pago.id?.slice(-6).toUpperCase()}</strong>
    </div>
  </div>
  <div class="grid">
    <div class="section">
      <div class="label">Cliente</div>
      <div class="value">${pago.clientes?.nombre || '—'}</div>
    </div>
    <div class="section">
      <div class="label">Fecha de pago</div>
      <div class="value">${new Date(pago.fecha_pago+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</div>
    </div>
    <div class="section">
      <div class="label">Concepto</div>
      <div class="value">${pago.concepto || 'Entrenamiento personal'}</div>
    </div>
    <div class="section">
      <div class="label">Periodo</div>
      <div class="value">${pago.periodo || new Date(pago.fecha_pago+'T12:00').toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</div>
    </div>
  </div>
  <div class="amount-box">
    <div class="amount">${Number(pago.importe).toFixed(2)}€</div>
    <div class="amount-label">Importe total pagado</div>
  </div>
  <div class="footer">
    Recibo generado el ${new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})} · Forge Studio OS
  </div>
</body>
</html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const [{ data: pg }, { data: cl }, { data: pl }] = await Promise.all([
      supabase.from('pagos').select('*, clientes(nombre,tipo)').eq('entrenador_id', uid).order('fecha_pago', { ascending: false }),
      supabase.from('clientes').select('id,nombre,tipo,precio_mensual').eq('entrenador_id', uid).eq('estado','activo'),
      supabase.from('planes_cobro').select('*, clientes(nombre)').eq('entrenador_id', uid).eq('activo', true).order('proximo_cobro'),
    ])
    setPagos(pg || [])
    setClientes(cl || [])
    setPlanes(pl || [])
  }

  async function registrarPago() {
    if (!form.cliente_id || !form.importe) return
    setLoading(true)
    const { error } = await supabase.from('pagos').insert({
      entrenador_id: uid, cliente_id: form.cliente_id,
      importe: Number(form.importe), concepto: form.concepto,
      fecha_pago: form.fecha_pago, periodo: form.periodo,
      valido_hasta: new Date(new Date(form.fecha_pago).setMonth(new Date(form.fecha_pago).getMonth()+1)).toISOString().split('T')[0]
    })
    if (error) setToast('Error al registrar')
    else { setToast('Pago registrado'); setModal(false); setForm({ cliente_id:'', importe:'', concepto:'Entrenamiento personal', fecha_pago: new Date().toISOString().split('T')[0], periodo:'' }) }
    await cargar()
    setLoading(false)
  }

  async function guardarPlan() {
    if (!formPlan.cliente_id || !formPlan.importe) return
    setLoading(true)
    const hoy = new Date()
    const proximo = new Date(hoy.getFullYear(), hoy.getMonth() + (hoy.getDate() >= formPlan.dia_cobro ? 1 : 0), formPlan.dia_cobro)
    const data = {
      entrenador_id: uid, cliente_id: formPlan.cliente_id,
      importe: Number(formPlan.importe), concepto: formPlan.concepto,
      frecuencia: formPlan.frecuencia, dia_cobro: Number(formPlan.dia_cobro),
      proximo_cobro: proximo.toISOString().split('T')[0], activo: true
    }
    if (editandoPlan) {
      await supabase.from('planes_cobro').update(data).eq('id', editandoPlan.id)
      setToast('Plan actualizado')
    } else {
      await supabase.from('planes_cobro').insert(data)
      setToast('Plan de cobro creado')
    }
    setModalPlan(false)
    setEditandoPlan(null)
    setFormPlan({ cliente_id:'', importe:'', concepto:'Entrenamiento personal', frecuencia:'mensual', dia_cobro:1 })
    await cargar()
    setLoading(false)
  }

  async function marcarCobrado(plan) {
    const hoy = new Date()
    let siguiente
    if (plan.frecuencia === 'mensual') siguiente = new Date(hoy.getFullYear(), hoy.getMonth()+1, plan.dia_cobro)
    else if (plan.frecuencia === 'quincenal') siguiente = new Date(hoy.getTime() + 14*864e5)
    else siguiente = new Date(hoy.getTime() + 7*864e5)

    await supabase.from('planes_cobro').update({ ultimo_cobro: hoy.toISOString().split('T')[0], proximo_cobro: siguiente.toISOString().split('T')[0] }).eq('id', plan.id)
    await supabase.from('pagos').insert({
      entrenador_id: uid, cliente_id: plan.cliente_id,
      importe: plan.importe, concepto: plan.concepto,
      fecha_pago: hoy.toISOString().split('T')[0],
      valido_hasta: siguiente.toISOString().split('T')[0]
    })
    setToast(`✓ Cobro registrado — próximo ${siguiente.toLocaleDateString('es-ES',{day:'numeric',month:'short'})}`)
    await cargar()
  }

  async function eliminarPlan(id) {
    if (!confirm('¿Eliminar este plan de cobro?')) return
    await supabase.from('planes_cobro').delete().eq('id', id)
    setToast('Plan eliminado'); await cargar()
  }

  async function eliminarPago(id) {
    if (!confirm('¿Eliminar este pago?')) return
    await supabase.from('pagos').delete().eq('id', id)
    await cargar()
  }

  async function generarEnlaceStripe(clienteId, importe, concepto) {
    setGenerandoStripe(clienteId)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/crear-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ cliente_id: clienteId, importe: Number(importe), concepto })
      })
      const data = await res.json()
      if (data.url) {
        await navigator.clipboard.writeText(data.url)
        setToast('Enlace Stripe copiado')
      } else setToast('Error al generar enlace Stripe')
    } catch { setToast('Error al generar enlace') }
    setGenerandoStripe(null)
  }

  const ingresosMes = useMemo(() => {
    const mes = new Date().toISOString().slice(0,7)
    return pagos.filter(p => p.fecha_pago?.startsWith(mes)).reduce((s,p) => s+Number(p.importe||0), 0)
  }, [pagos])

  const pendientesMes = useMemo(() => planes.filter(p => {
    const d = diasRestantes(p)
    return d !== null && d <= 7
  }), [planes])

  const pagosFiltrados = useMemo(() => {
    let r = [...pagos]
    if (busqueda) { const b = busqueda.toLowerCase(); r = r.filter(p => p.clientes?.nombre?.toLowerCase().includes(b) || p.concepto?.toLowerCase().includes(b)) }
    return r
  }, [pagos, busqueda])

  const totalHistorico = pagos.reduce((s,p) => s+Number(p.importe||0), 0)

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      {quickView && <ClienteQuickView clienteId={quickView} onClose={() => setQuickView(null)} />}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Pagos</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Control de cobros y planes automáticos</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => { setEditandoPlan(null); setFormPlan({ cliente_id:'', importe:'', concepto:'Entrenamiento personal', frecuencia:'mensual', dia_cobro:1 }); setModalPlan(true) }}
            className="border border-[#6366f1]/30 text-[#6366f1] text-sm font-semibold px-3 py-2.5 rounded-xl hover:bg-[#6366f1]/5">
            ↻ Plan
          </button>
          <button onClick={() => setModal(true)} className="bg-[#FF5C00] text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
            + Pago
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-[#111] rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[#FF5C00]">{ingresosMes.toFixed(0)}€</p>
            <p className="text-white/40 text-xs mt-0.5">Cobrado este mes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#6366f1]">{planes.length}</p>
            <p className="text-white/40 text-xs mt-0.5">Planes activos</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${pendientesMes.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{pendientesMes.length}</p>
            <p className="text-white/40 text-xs mt-0.5">Vencen en 7 días</p>
          </div>
        </div>
      </div>

      {/* Alertas cobros próximos */}
      {pendientesMes.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-amber-700 mb-2">⏰ Cobros próximos</p>
          <div className="space-y-2">
            {pendientesMes.map(p => {
              const dias = diasRestantes(p)
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A0A0A] truncate">{p.clientes?.nombre}</p>
                    <p className="text-xs text-[#6B6B6B]">{p.importe}€ · {dias === 0 ? 'Hoy' : dias < 0 ? `Vencido hace ${Math.abs(dias)} días` : `En ${dias} días`}</p>
                  </div>
                  <button onClick={() => marcarCobrado(p)}
                    className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0">
                    ✓ Cobrado
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-black/5 p-1 rounded-xl mb-4">
        {[['estado','Planes de cobro'],['historial','Historial']].map(([v,l])=>(
          <button key={v} onClick={() => setTab(v)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab===v?'bg-white shadow-sm text-[#0A0A0A]':'text-[#6B6B6B]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* TAB PLANES */}
      {tab === 'estado' && (
        <div className="space-y-2">
          {planes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-10 text-center">
              <p className="text-4xl mb-3">💳</p>
              <p className="font-semibold text-[#0A0A0A]">Sin planes de cobro</p>
              <p className="text-sm text-[#6B6B6B] mt-1">Crea un plan para cada cliente y el sistema te avisará cuándo cobrar</p>
              <button onClick={() => setModalPlan(true)} className="mt-4 bg-[#FF5C00] text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                ↻ Crear plan
              </button>
            </div>
          ) : planes.map(p => {
            const dias = diasRestantes(p)
            const urgente = dias !== null && dias <= 3
            const vencido = dias !== null && dias < 0
            return (
              <div key={p.id} className={`bg-white rounded-xl border shadow-sm p-4 ${vencido?'border-red-200':urgente?'border-amber-200':'border-black/5'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-[#6366f1]/10 rounded-xl flex items-center justify-center text-[#6366f1] font-bold text-xs flex-shrink-0">
                    {ini(p.clientes?.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setQuickView(p.cliente_id)} className="text-sm font-semibold text-[#0A0A0A] hover:text-[#FF5C00] truncate block text-left">{p.clientes?.nombre}</button>
                    <p className="text-xs text-[#6B6B6B]">{FRECUENCIAS[p.frecuencia]} · día {p.dia_cobro} · {p.importe}€</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${vencido?'text-red-500':urgente?'text-amber-500':'text-[#0A0A0A]'}`}>
                      {dias === null ? '—' : dias < 0 ? `+${Math.abs(dias)}d` : dias === 0 ? 'Hoy' : `${dias}d`}
                    </p>
                    <p className="text-xs text-[#6B6B6B]">próximo cobro</p>
                  </div>
                </div>
                {proximoCobro(p) && (
                  <p className="text-xs text-[#6B6B6B] mb-3">
                    Próximo: {proximoCobro(p).toLocaleDateString('es-ES',{day:'numeric',month:'long'})}
                    {p.ultimo_cobro && ` · Último: ${new Date(p.ultimo_cobro+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}`}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => marcarCobrado(p)} className="flex-1 bg-emerald-500 text-white text-xs font-semibold py-2 rounded-lg">✓ Cobrado</button>
                  <button onClick={() => generarEnlaceStripe(p.cliente_id, p.importe, p.concepto)} disabled={generandoStripe===p.cliente_id}
                    className="border border-[#6B6B6B]/20 text-[#6B6B6B] text-xs py-2 px-2.5 rounded-lg hover:bg-[#F5F5F0] disabled:opacity-40">
                    {generandoStripe===p.cliente_id?'⏳':'💳'}
                  </button>
                  <button onClick={() => { setEditandoPlan(p); setFormPlan({ cliente_id:p.cliente_id, importe:String(p.importe), concepto:p.concepto, frecuencia:p.frecuencia, dia_cobro:p.dia_cobro }); setModalPlan(true) }}
                    className="border border-black/10 text-[#6B6B6B] text-xs py-2 px-2.5 rounded-lg hover:bg-[#F5F5F0]">✏️</button>
                  <button onClick={() => eliminarPlan(p.id)} className="border border-red-100 text-red-400 text-xs py-2 px-2.5 rounded-lg hover:bg-red-50">×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TAB HISTORIAL */}
      {tab === 'historial' && (
        <>
          <div className="bg-[#F5F5F0] rounded-xl p-3 mb-3 flex items-center justify-between">
            <p className="text-sm text-[#6B6B6B]">Total histórico</p>
            <p className="text-lg font-bold text-[#0A0A0A]">{totalHistorico.toFixed(0)}€</p>
          </div>
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por cliente..."
              className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
          </div>
          <div className="space-y-2">
            {pagosFiltrados.length === 0 ? (
              <div className="bg-white rounded-2xl border border-black/5 p-8 text-center">
                <p className="text-3xl mb-2">💳</p>
                <p className="text-sm font-semibold text-[#0A0A0A]">Sin pagos registrados</p>
              </div>
            ) : pagosFiltrados.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-xs flex-shrink-0">{ini(p.clientes?.nombre)}</div>
                <div className="flex-1 min-w-0">
                  <button onClick={() => setQuickView(p.cliente_id)} className="text-sm font-semibold text-[#0A0A0A] hover:text-[#FF5C00] truncate block text-left">{p.clientes?.nombre}</button>
                  <p className="text-xs text-[#6B6B6B]">{p.concepto} · {new Date(p.fecha_pago+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-600">+{Number(p.importe).toFixed(0)}€</p>
                  <button onClick={() => generarRecibo(p)} className="text-[#6B6B6B] hover:text-[#FF5C00] text-sm transition-colors">🧾</button>
                  <button onClick={() => eliminarPago(p.id)} className="text-[#6B6B6B] hover:text-red-500 text-lg">×</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal registrar pago */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-4">Registrar pago</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente *</label>
                <select value={form.cliente_id} onChange={e => { const c = clientes.find(x=>x.id===e.target.value); setForm(f=>({...f,cliente_id:e.target.value,importe:c?.precio_mensual?String(c.precio_mensual):''})) }}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}{c.precio_mensual?` · ${c.precio_mensual}€`:''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Importe (€) *</label>
                  <input type="number" value={form.importe} onChange={e=>setForm(f=>({...f,importe:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Fecha</label>
                  <input type="date" value={form.fecha_pago} onChange={e=>setForm(f=>({...f,fecha_pago:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Concepto</label>
                <input value={form.concepto} onChange={e=>setForm(f=>({...f,concepto:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={registrarPago} disabled={!form.cliente_id||!form.importe||loading}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {loading?'Guardando...':'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal plan de cobro */}
      {modalPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-1">{editandoPlan ? 'Editar plan' : 'Nuevo plan de cobro'}</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">El sistema te avisará cuándo cobrar y actualizará la próxima fecha automáticamente</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente *</label>
                <select value={formPlan.cliente_id} onChange={e => { const c = clientes.find(x=>x.id===e.target.value); setFormPlan(f=>({...f,cliente_id:e.target.value,importe:c?.precio_mensual?String(c.precio_mensual):''})) }}
                  disabled={!!editandoPlan}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white disabled:opacity-60">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Importe (€) *</label>
                  <input type="number" value={formPlan.importe} onChange={e=>setFormPlan(f=>({...f,importe:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Frecuencia</label>
                  <select value={formPlan.frecuencia} onChange={e=>setFormPlan(f=>({...f,frecuencia:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                    <option value="mensual">Mensual</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="semanal">Semanal</option>
                  </select>
                </div>
              </div>
              {formPlan.frecuencia === 'mensual' && (
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Día de cobro del mes</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1,5,10,15,20,25,30].map(d => (
                      <button key={d} type="button" onClick={() => setFormPlan(f=>({...f,dia_cobro:d}))}
                        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${formPlan.dia_cobro===d?'bg-[#FF5C00] text-white':'border border-black/10 text-[#6B6B6B]'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Concepto</label>
                <input value={formPlan.concepto} onChange={e=>setFormPlan(f=>({...f,concepto:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setModalPlan(false); setEditandoPlan(null) }} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={guardarPlan} disabled={!formPlan.cliente_id||!formPlan.importe||loading}
                className="flex-1 bg-[#6366f1] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {loading?'Guardando...':editandoPlan?'Guardar cambios':'Crear plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
