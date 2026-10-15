import { diaLocal } from './dateUtils'

// Criterio único de cobro para Clientes, Dashboard y Pagos.
// - Exento: acceso libre o cuenta demo → nunca vence ni cuenta en previstos.
// - Inactivo: cliente que no está 'activo' (baja, pausado, contacto…) → no cuenta.
// - Con plan de cobro activo: manda su proximo_cobro.
// - Sin plan: manda la validez (valido_hasta) de su último pago.
// - Sin plan ni pagos con validez: 'sin_datos'.
//
// planes: filas de planes_cobro (cliente_id, activo, proximo_cobro)
// pagos:  filas de pagos (cliente_id, fecha_pago, valido_hasta)
// Devuelve { estado: 'exento'|'inactivo'|'al_dia'|'vencido'|'sin_datos', hasta: 'YYYY-MM-DD'|null }
export function estadoCobro(cliente, planes = [], pagos = [], hoy = diaLocal(new Date())) {
  if (cliente.acceso_libre || cliente.is_demo) return { estado: 'exento', hasta: null }
  if (cliente.estado !== 'activo') return { estado: 'inactivo', hasta: null }
  const plan = planes.find(p => p.cliente_id === cliente.id && p.activo !== false && p.proximo_cobro)
  let hasta = plan?.proximo_cobro || null
  if (!plan) {
    const ultimo = pagos
      .filter(p => p.cliente_id === cliente.id && p.valido_hasta)
      .sort((a, b) => (b.fecha_pago || '').localeCompare(a.fecha_pago || '') || b.valido_hasta.localeCompare(a.valido_hasta))[0]
    hasta = ultimo?.valido_hasta || null
  }
  if (!hasta) return { estado: 'sin_datos', hasta: null }
  return { estado: hasta < hoy ? 'vencido' : 'al_dia', hasta }
}

// Días hasta (positivo) o desde (negativo) la fecha 'hasta' de estadoCobro.
export function diasHasta(hasta, hoy = diaLocal(new Date())) {
  if (!hasta) return null
  return Math.round((new Date(hasta + 'T12:00') - new Date(hoy + 'T12:00')) / 864e5)
}

// ¿Cuenta para cuotas e ingresos previstos? Solo clientes activos y no exentos.
export const cuentaParaCuotas = c => c.estado === 'activo' && !c.acceso_libre && !c.is_demo
