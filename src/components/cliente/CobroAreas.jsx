import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { AREAS, NOMBRE_SERVICIO, ICONO_SERVICIO, areasDe } from '../../lib/servicios'

// Cobro por área (función "bonos" de la ficha del centro): tarifa mensual, bono de
// sesiones o sesión suelta. Las sesiones completadas descuentan del bono, o generan un
// pago pendiente si la modalidad es "suelta", con el trigger de la migración 0011.
const MODALIDADES = [
  ['tarifa', 'Tarifa mensual', '€/mes'],
  ['bono', 'Bono', ''],
  ['suelta', 'Sesión suelta', '€/sesión'],
]
const fmt = f => new Date(f + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
const hoy = () => new Date().toLocaleDateString('sv-SE')
const bonoVacio = () => ({ sesiones_total: 10, precio: '', caduca: '', pagado: true })

const restantes = b => b.sesiones_total - (b.bono_usos?.length || 0)
const caducado = b => b.caduca && b.caduca < hoy()

function TarjetaBono({ bono, onUsar, onDesactivar }) {
  const quedan = restantes(bono)
  const pct = Math.min(100, ((bono.sesiones_total - quedan) / bono.sesiones_total) * 100)
  const agotado = quedan <= 0 || caducado(bono)
  const ultimos = [...(bono.bono_usos || [])].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3)
  return (
    <div className={`border rounded-xl p-3 space-y-2 ${agotado ? 'border-black/5 opacity-60' : 'border-emerald-100'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0A0A0A]">Bono {bono.sesiones_total} sesiones{bono.precio ? ` · ${bono.precio}€` : ''}</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${agotado ? 'bg-[#F5F5F0] text-[#6B6B6B]' : 'bg-emerald-50 text-emerald-700'}`}>
          {caducado(bono) ? 'Caducado' : `${quedan} restante${quedan === 1 ? '' : 's'}`}
        </span>
      </div>
      <div className="h-1.5 bg-[#F5F5F0] rounded-full overflow-hidden"><div className="h-full bg-acento" style={{ width: `${pct}%` }} /></div>
      <p className="text-[11px] text-[#9B9B9B]">
        Comprado {fmt(bono.fecha_compra)}{bono.caduca ? ` · caduca ${fmt(bono.caduca)}` : ' · sin caducidad'}
        {ultimos.length ? ` · usado: ${ultimos.map(u => fmt(u.fecha) + (u.manual ? ' (manual)' : '')).join(', ')}` : ''}
      </p>
      <div className="flex gap-2">
        {!agotado && <button onClick={() => onUsar(bono)} className="flex-1 border border-black/10 text-xs font-semibold py-1.5 rounded-lg hover:bg-[#F5F5F0]">− Descontar 1 a mano</button>}
        <button onClick={() => onDesactivar(bono)} className="flex-1 border border-black/10 text-xs text-[#6B6B6B] py-1.5 rounded-lg hover:bg-[#F5F5F0]">Archivar</button>
      </div>
    </div>
  )
}

export default function CobroAreas({ cliente, onToast, onCambio }) {
  const areas = AREAS.filter(a => areasDe(cliente).includes(a))
  const [mods, setMods] = useState({})
  const [bonos, setBonos] = useState([])
  const [sueltas, setSueltas] = useState([])
  const [nuevoBono, setNuevoBono] = useState(null) // área con el formulario abierto
  const [formBono, setFormBono] = useState(bonoVacio)

  async function cargar() {
    const [m, b, s] = await Promise.all([
      supabase.from('modalidades_cobro').select('*').eq('cliente_id', cliente.id),
      supabase.from('bonos').select('*, bono_usos(id, fecha, manual)').eq('cliente_id', cliente.id).eq('activo', true).order('fecha_compra'),
      supabase.from('pagos').select('*').eq('cliente_id', cliente.id).not('sesion_id', 'is', null).eq('estado', 'pendiente').order('fecha_pago'),
    ])
    if (m.error || b.error || s.error) onToast?.('No se pudo cargar el cobro', 'error')
    setMods(Object.fromEntries((m.data || []).map(x => [x.area, x])))
    setBonos(b.data || [])
    setSueltas(s.data || [])
  }
  useEffect(() => { cargar() }, [cliente.id])

  async function guardarModalidad(area, modalidad, precio) {
    const valor = precio === '' || precio == null ? null : Number(precio)
    const { error } = await supabase.from('modalidades_cobro').upsert(
      { entrenador_id: cliente.entrenador_id, cliente_id: cliente.id, area, modalidad, precio: valor },
      { onConflict: 'cliente_id,area' })
    if (error) { onToast?.('No se pudo guardar la modalidad', 'error'); return }
    // La cuota del gimnasio es la que usan Pagos y el Dashboard
    if (area === 'entrenamiento' && modalidad === 'tarifa' && valor != null) {
      await supabase.from('clientes').update({ precio_mensual: valor }).eq('id', cliente.id)
      onCambio?.({ precio_mensual: valor })
    }
    onToast?.('Modalidad guardada'); cargar()
  }

  async function crearBono(area) {
    const total = Number(formBono.sesiones_total)
    if (!total || total < 1) return
    const precio = formBono.precio === '' ? null : Number(formBono.precio)
    const { error } = await supabase.from('bonos').insert({
      entrenador_id: cliente.entrenador_id, cliente_id: cliente.id, area,
      sesiones_total: total, precio, caduca: formBono.caduca || null,
    })
    if (error) { onToast?.('No se pudo crear el bono', 'error'); return }
    if (formBono.pagado && precio) {
      await supabase.from('pagos').insert({
        entrenador_id: cliente.entrenador_id, cliente_id: cliente.id, importe: precio,
        concepto: `Bono ${total} sesiones · ${NOMBRE_SERVICIO[area]}`, estado: 'pagado', area,
      })
    }
    setNuevoBono(null); setFormBono(bonoVacio()); onToast?.('Bono creado'); cargar()
  }

  async function usarBono(bono) {
    const { error } = await supabase.from('bono_usos').insert({ entrenador_id: bono.entrenador_id, bono_id: bono.id, manual: true })
    if (error) { onToast?.('No se pudo descontar', 'error'); return }
    cargar()
  }

  async function archivarBono(bono) {
    if (!window.confirm('¿Archivar este bono? Dejará de descontar sesiones.')) return
    const { error } = await supabase.from('bonos').update({ activo: false }).eq('id', bono.id)
    if (error) { onToast?.('No se pudo archivar', 'error'); return }
    cargar()
  }

  async function marcarPagado(pago) {
    const { error } = await supabase.from('pagos').update({ estado: 'pagado', fecha_pago: hoy() }).eq('id', pago.id)
    if (error) { onToast?.('No se pudo marcar como pagado', 'error'); return }
    onToast?.('Pago registrado'); cargar()
  }

  return (
    <div className="space-y-4">
      {areas.map(area => {
        const mod = mods[area]
        const bonosArea = bonos.filter(b => b.area === area)
        const sueltasArea = sueltas.filter(p => p.area === area)
        return (
          <div key={area} className="bg-white border border-black/5 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-[#0A0A0A]">{ICONO_SERVICIO[area]} {NOMBRE_SERVICIO[area]}</p>
            <SelectorModalidad key={`${area}-${mod?.modalidad}-${mod?.precio}`} area={area} mod={mod}
              precioMensual={area === 'entrenamiento' ? cliente.precio_mensual : null} onGuardar={guardarModalidad} />

            {(mod?.modalidad === 'bono' || bonosArea.length > 0) && (
              <div className="space-y-2">
                {bonosArea.map(b => <TarjetaBono key={b.id} bono={b} onUsar={usarBono} onDesactivar={archivarBono} />)}
                {nuevoBono === area ? (
                  <div className="border border-black/10 rounded-xl p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-[11px] text-[#6B6B6B]">Sesiones
                        <input type="number" min="1" value={formBono.sesiones_total} onChange={e => setFormBono(f => ({ ...f, sesiones_total: e.target.value }))}
                          className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-sm mt-0.5" /></label>
                      <label className="text-[11px] text-[#6B6B6B]">Precio €
                        <input type="number" min="0" step="0.01" value={formBono.precio} onChange={e => setFormBono(f => ({ ...f, precio: e.target.value }))}
                          className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-sm mt-0.5" /></label>
                      <label className="text-[11px] text-[#6B6B6B]">Caduca (opcional)
                        <input type="date" value={formBono.caduca} onChange={e => setFormBono(f => ({ ...f, caduca: e.target.value }))}
                          className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-sm mt-0.5" /></label>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[#0A0A0A]">
                      <input type="checkbox" checked={formBono.pagado} onChange={e => setFormBono(f => ({ ...f, pagado: e.target.checked }))} />
                      Registrar el pago del bono ahora
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setNuevoBono(null)} className="flex-1 border border-black/10 text-xs py-2 rounded-lg">Cancelar</button>
                      <button onClick={() => crearBono(area)} disabled={!Number(formBono.sesiones_total)}
                        className="flex-1 bg-acento text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-40">Crear bono</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setNuevoBono(area); setFormBono(bonoVacio()) }}
                    className="w-full border border-dashed border-black/15 text-xs font-semibold text-[#6B6B6B] py-2 rounded-xl hover:bg-[#F5F5F0]">＋ Nuevo bono</button>
                )}
              </div>
            )}

            {sueltasArea.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-amber-700">Sesiones sueltas pendientes de pago</p>
                {sueltasArea.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 bg-amber-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-[#0A0A0A]">{p.concepto} · <b>{p.importe}€</b></p>
                    <button onClick={() => marcarPagado(p)} className="text-xs font-semibold text-emerald-700 hover:underline flex-shrink-0">Marcar pagado</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SelectorModalidad({ area, mod, precioMensual, onGuardar }) {
  const [modalidad, setModalidad] = useState(mod?.modalidad || '')
  const [precio, setPrecio] = useState(mod?.precio ?? (modalidad === 'tarifa' && precioMensual ? precioMensual : ''))
  const unidad = MODALIDADES.find(m => m[0] === modalidad)?.[2]
  const cambiado = modalidad && (modalidad !== mod?.modalidad || String(precio ?? '') !== String(mod?.precio ?? ''))
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {MODALIDADES.map(([id, label]) => (
          <button key={id} type="button" onClick={() => {
              setModalidad(id)
              if (id === 'tarifa' && precio === '' && precioMensual) setPrecio(precioMensual)
            }}
            className={`py-2 rounded-xl border text-xs font-semibold transition-all ${modalidad === id ? 'bg-acento border-acento text-white' : 'border-black/10 text-[#0A0A0A]'}`}>{label}</button>
        ))}
      </div>
      {unidad && (
        <div className="flex items-center gap-2">
          <input type="number" min="0" step="0.01" value={precio ?? ''} onChange={e => setPrecio(e.target.value)} placeholder="Precio"
            className="flex-1 border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-acento" />
          <span className="text-xs text-[#6B6B6B]">{unidad}</span>
        </div>
      )}
      {!mod && !modalidad && <p className="text-[11px] text-[#9B9B9B]">Sin modalidad de cobro definida para esta área.</p>}
      {modalidad === 'bono' && <p className="text-[11px] text-[#9B9B9B]">Cada sesión completada de {NOMBRE_SERVICIO[area].toLowerCase()} descuenta una del bono.</p>}
      {modalidad === 'suelta' && <p className="text-[11px] text-[#9B9B9B]">Cada sesión completada sin bono crea un pago pendiente.</p>}
      {cambiado && (
        <button onClick={() => onGuardar(area, modalidad, modalidad === 'bono' ? null : precio)}
          className="w-full bg-[#0A0A0A] text-white text-xs font-semibold py-2 rounded-xl">Guardar modalidad</button>
      )}
    </div>
  )
}
