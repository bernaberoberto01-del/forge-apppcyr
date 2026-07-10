import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'

export default function Rutinas({ session }) {
  const [rutinas, setRutinas] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [generando, setGenerando] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [editando, setEditando] = useState(false)
  const [notasEdit, setNotasEdit] = useState('')
  const [msgModal, setMsgModal] = useState(null)
  const [msgTexto, setMsgTexto] = useState('')
  const uid = session.user.id

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const [{ data: ru }, { data: cl }] = await Promise.all([
      supabase.from('rutinas').select('*, clientes(nombre, tipo, objetivo)').eq('entrenador_id', uid).order('created_at', { ascending: false }),
      supabase.from('clientes').select('id,nombre,objetivo,nivel,tipo').eq('entrenador_id', uid).eq('estado', 'activo'),
    ])
    setRutinas(ru || [])
    setClientes(cl || [])
  }

  async function generarRutina(clienteId) {
    setGenerando(clienteId)
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generar-rutina`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
      body: JSON.stringify({ cliente_id: clienteId })
    })
    const data = await res.json()
    setGenerando(null)
    if (data.ok) await cargar()
    else alert('Error generando rutina: ' + (data.error || 'desconocido'))
  }

  async function publicar(rutina) {
    await supabase.from('rutinas').update({
      estado: 'publicada',
      contenido: rutina.borrador,
      notas_entrenador: notasEdit,
      updated_at: new Date().toISOString()
    }).eq('id', rutina.id)
    setDetalle(null)
    setEditando(false)
    await cargar()
  }

  async function archivar(id) {
    await supabase.from('rutinas').update({ estado: 'archivada' }).eq('id', id)
    setDetalle(null)
    await cargar()
  }

  async function enviarMensaje(clienteId) {
    if (!msgTexto.trim()) return
    await supabase.from('mensajes_cliente').insert({
      entrenador_id: uid,
      cliente_id: clienteId,
      contenido: msgTexto.trim()
    })
    setMsgTexto('')
    setMsgModal(null)
  }

  const ini = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const statusColor = s => s === 'publicada' ? 'bg-green-50 text-green-700' : s === 'borrador' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'
  const portalUrl = id => `${window.location.origin}/portal/${id}`

  const clientesSinRutina = clientes.filter(c => !rutinas.find(r => r.cliente_id === c.id && r.estado !== 'archivada'))

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#111]">Rutinas</h1>
      </div>

      {/* Clientes sin rutina */}
      {clientesSinRutina.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
          <p className="text-xs font-medium text-amber-700 mb-2">Sin rutina asignada</p>
          <div className="space-y-2">
            {clientesSinRutina.map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">{ini(c.nombre)}</div>
                  <span className="text-sm font-medium">{c.nombre}</span>
                </div>
                <button onClick={() => generarRutina(c.id)} disabled={generando === c.id}
                  className="bg-orange-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">
                  {generando === c.id ? '⏳ Generando...' : '✨ Generar con IA'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de rutinas */}
      <div className="space-y-2">
        {rutinas.filter(r => r.estado !== 'archivada').length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Sin rutinas todavía. Genera una con IA para empezar.</p>
          </div>
        ) : rutinas.filter(r => r.estado !== 'archivada').map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-xs flex-shrink-0">
                {ini(r.clientes?.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#111] truncate">{r.clientes?.nombre}</p>
                <p className="text-xs text-gray-400 truncate">{r.borrador?.nombre || r.contenido?.nombre || 'Rutina'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor(r.estado)}`}>{r.estado}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setDetalle(r); setNotasEdit(r.notas_entrenador || ''); setEditando(false) }}
                className="flex-1 border border-gray-200 text-gray-600 text-xs py-1.5 rounded-lg hover:bg-gray-50">
                Ver rutina
              </button>
              {r.estado === 'publicada' && (
                <button onClick={() => navigator.clipboard.writeText(portalUrl(r.cliente_id))}
                  className="flex-1 border border-orange-200 text-orange-600 text-xs py-1.5 rounded-lg hover:bg-orange-50">
                  📋 Copiar enlace
                </button>
              )}
              <button onClick={() => setMsgModal(r.cliente_id)}
                className="border border-gray-200 text-gray-500 text-xs py-1.5 px-3 rounded-lg hover:bg-gray-50">
                ✉️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal detalle rutina */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-[#111]">{detalle.borrador?.nombre || detalle.contenido?.nombre}</h2>
              <button onClick={() => setDetalle(null)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-4 space-y-3">
              {(detalle.borrador?.dias || detalle.contenido?.dias || []).map(dia => (
                <div key={dia.dia} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-[#111] px-3 py-2">
                    <p className="text-white text-sm font-medium">{dia.nombre}</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {dia.ejercicios?.map((ej, i) => (
                      <div key={i} className="px-3 py-2.5 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-[#111]">{ej.nombre}</p>
                          {ej.notas && <p className="text-xs text-gray-400 mt-0.5">{ej.notas}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-orange-500">{ej.series}×{ej.reps}</p>
                          <p className="text-xs text-gray-400">{ej.descanso}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notas para el cliente (opcional)</label>
                <textarea value={notasEdit} onChange={e => setNotasEdit(e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none"
                  placeholder="Indicaciones especiales, cómo ejecutar los ejercicios..." />
              </div>

              <div className="flex gap-2">
                {detalle.estado === 'borrador' && (
                  <button onClick={() => publicar(detalle)}
                    className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-xl">
                    ✅ Publicar para el cliente
                  </button>
                )}
                {detalle.estado === 'publicada' && (
                  <button onClick={() => navigator.clipboard.writeText(portalUrl(detalle.cliente_id))}
                    className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-xl">
                    📋 Copiar enlace del portal
                  </button>
                )}
                <button onClick={() => archivar(detalle.id)}
                  className="border border-gray-200 text-gray-500 text-sm py-2.5 px-4 rounded-xl">
                  Archivar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal mensaje */}
      {msgModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-semibold text-[#111] mb-3">Enviar mensaje al cliente</h2>
            <textarea value={msgTexto} onChange={e => setMsgTexto(e.target.value)} rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none mb-3"
              placeholder="Escribe tu mensaje..." />
            <div className="flex gap-2">
              <button onClick={() => setMsgModal(null)} className="flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-lg">Cancelar</button>
              <button onClick={() => enviarMensaje(msgModal)} disabled={!msgTexto.trim()}
                className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50">
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
