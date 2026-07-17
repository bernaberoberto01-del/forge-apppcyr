import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { TIPOS_MAP } from '../utils/tiposEntrenamiento'

const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const AVATARES = ['#FF5C00','#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#8b5cf6']
const avatarColor = n => AVATARES[(n||'').charCodeAt(0) % AVATARES.length]

export default function ClienteQuickView({ clienteId, onClose }) {
  const [cliente, setCliente] = useState(null)
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!clienteId) return
    async function cargar() {
      const [{ data: cl }, { data: ci }, { data: se }, { data: ru }, { data: pg }] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', clienteId).single(),
        supabase.from('checkins').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }).limit(2),
        supabase.from('sesiones').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }).limit(5),
        supabase.from('rutinas').select('nombre, estado, dias_semana').eq('cliente_id', clienteId).eq('estado','publicada').limit(1),
        supabase.from('pagos').select('valido_hasta, importe').eq('cliente_id', clienteId).order('fecha_pago', { ascending: false }).limit(1),
      ])
      setCliente(cl)
      setData({ checkins: ci||[], sesiones: se||[], rutina: ru?.[0], pago: pg?.[0] })
      setLoading(false)
    }
    cargar()
  }, [clienteId])

  if (!clienteId) return null

  const ci0 = data.checkins?.[0]
  const ci1 = data.checkins?.[1]
  const ses30 = data.sesiones?.filter(s => new Date(s.fecha) > new Date(Date.now()-30*864e5)).length || 0
  const ultimaSesion = data.sesiones?.[0]
  const diasPago = data.pago?.valido_hasta ? Math.ceil((new Date(data.pago.valido_hasta)-new Date())/864e5) : null
  const tendenciaEnergia = ci0?.energia && ci1?.energia ? ci0.energia - ci1.energia : null
  const tendenciaPeso = ci0?.peso && ci1?.peso ? (ci0.peso - ci1.peso).toFixed(1) : null

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : !cliente ? (
          <div className="p-6 text-center"><p className="text-[#6B6B6B]">Cliente no encontrado</p></div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-black/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: avatarColor(cliente.nombre) }}>
                  {ini(cliente.nombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0A0A0A]">{cliente.nombre}</p>
                  <p className="text-xs text-[#6B6B6B]">
                    {cliente.tipo === 'online' ? '🌐 Online' : '📍 Presencial'} · {cliente.nivel}
                    {cliente.tipo_entrenamiento && TIPOS_MAP[cliente.tipo_entrenamiento] ? ` · ${TIPOS_MAP[cliente.tipo_entrenamiento].icon} ${TIPOS_MAP[cliente.tipo_entrenamiento].label}` : ''}
                  </p>
                </div>
                <button onClick={onClose} className="text-[#6B6B6B] text-xl w-8 h-8 flex items-center justify-center">×</button>
              </div>

              {/* Métricas clave */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  ['⚖️', ci0?.peso ? `${ci0.peso}kg` : '—', tendenciaPeso ? `${Number(tendenciaPeso)>0?'+':''}${tendenciaPeso}` : null, Number(tendenciaPeso)<0?'text-emerald-500':'text-red-400'],
                  ['⚡', ci0?.energia ? `${ci0.energia}/10` : '—', tendenciaEnergia ? (tendenciaEnergia>0?'↑':'↓') : null, tendenciaEnergia>0?'text-emerald-500':'text-red-400'],
                  ['🏋️', `${ses30}`, 'ses/mes', 'text-[#6B6B6B]'],
                  ['💳', diasPago !== null ? (diasPago < 0 ? 'Venc.' : `${diasPago}d`) : '—', 'pago', diasPago !== null && diasPago < 0 ? 'text-red-400' : 'text-emerald-500'],
                ].map(([icon, val, sub, color], i) => (
                  <div key={i} className="bg-[#F5F5F0] rounded-xl p-2 text-center">
                    <p className="text-sm">{icon}</p>
                    <p className="text-xs font-bold text-[#0A0A0A] mt-0.5">{val}</p>
                    {sub && <p className={`text-[10px] font-medium ${color}`}>{sub}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Rutina activa */}
              {data.rutina && (
                <div className="bg-[#F5F5F0] rounded-xl p-3 flex items-center gap-2">
                  <span className="text-base">💪</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0A0A0A] truncate">{data.rutina.nombre}</p>
                    <p className="text-xs text-[#6B6B6B]">{data.rutina.dias_semana} días/sem · publicada</p>
                  </div>
                </div>
              )}

              {/* Última sesión */}
              {ultimaSesion && (
                <div className="bg-[#F5F5F0] rounded-xl p-3 flex items-center gap-2">
                  <span className="text-base">🏋️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0A0A0A]">Última sesión</p>
                    <p className="text-xs text-[#6B6B6B]">
                      {new Date(ultimaSesion.fecha).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})}
                      {ultimaSesion.rpe ? ` · RPE ${ultimaSesion.rpe}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Último CI resumen */}
              {ci0 && (
                <div className="border border-black/5 rounded-xl p-3">
                  <p className="text-xs font-semibold text-[#0A0A0A] mb-2">
                    Último check-in — {new Date(ci0.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      ['⚡',ci0.energia,'/10',ci0.energia>=7?'bg-emerald-50 text-emerald-700':ci0.energia<=3?'bg-red-50 text-red-700':'bg-amber-50 text-amber-700'],
                      ['😤',ci0.estres,'/5',ci0.estres>=4?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'],
                      ['🔥',ci0.fatiga,'/5',ci0.fatiga>=4?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'],
                      ['💫',ci0.motivacion,'/7',ci0.motivacion>=5?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'],
                      ['💪',ci0.adherencia_entreno,'/10',ci0.adherencia_entreno>=7?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'],
                    ].filter(([,v])=>v).map(([ic,v,s,cls])=>(
                      <span key={ic} className={`text-xs px-2 py-1 rounded-full font-medium ${cls}`}>{ic} {v}{s}</span>
                    ))}
                  </div>
                  {ci0.comentario && <p className="text-xs text-[#6B6B6B] mt-2 italic">"{ci0.comentario}"</p>}
                </div>
              )}

              {/* Lesiones */}
              {cliente.lesiones && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700">⚠ {cliente.lesiones}</p>
                </div>
              )}

              {/* Acciones rápidas */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => { navigate('/clientes'); onClose(); setTimeout(() => window.dispatchEvent(new CustomEvent('abrir-cliente', { detail: clienteId })), 300) }}
                  className="col-span-2 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl">
                  Ver perfil completo →
                </button>
                <button onClick={() => { navigate('/seguimiento'); onClose() }}
                  className="border border-black/10 text-[#6B6B6B] text-xs font-medium py-2 rounded-xl hover:bg-[#F5F5F0]">
                  📋 Seguimiento
                </button>
                <button onClick={() => { navigate('/rutinas'); onClose() }}
                  className="border border-black/10 text-[#6B6B6B] text-xs font-medium py-2 rounded-xl hover:bg-[#F5F5F0]">
                  💪 Rutinas
                </button>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/seguimiento/${clienteId}`); onClose() }}
                  className="border border-black/10 text-[#6B6B6B] text-xs font-medium py-2 rounded-xl hover:bg-[#F5F5F0]">
                  📨 Enviar CI
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
