import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { TIPOS_MAP } from '../utils/tiposEntrenamiento'
import { BRAND } from '../lib/brand'

const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const AVATARES = [BRAND.color,'#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#8b5cf6']
const avatarColor = n => AVATARES[(n||'').charCodeAt(0) % AVATARES.length]
const fmt = d => d ? new Date(d).toLocaleDateString('es-ES',{day:'numeric',month:'short'}) : '—'

// Mini sparkline SVG (sin librería externa)
function Sparkline({ values, color = '#FF5C00', height = 28, width = 80 }) {
  if (!values || values.length < 2) return null
  const valid = values.filter(v => v != null && !isNaN(v))
  if (valid.length < 2) return null
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((( v ?? min) - min) / range) * height
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts.split(' ').pop().split(',')[0]} cy={pts.split(' ').pop().split(',')[1]} r="2.5" fill={color}/>
    </svg>
  )
}

// Gráfica de peso con fondo degradado
function GraficaPeso({ checkins }) {
  if (!checkins || checkins.length < 2) return null
  const datos = [...checkins].reverse().filter(c => c.peso).slice(-8)
  if (datos.length < 2) return null
  const W = 240, H = 60
  const pesos = datos.map(c => c.peso)
  const min = Math.min(...pesos) - 1
  const max = Math.max(...pesos) + 1
  const range = max - min || 1
  const points = datos.map((c, i) => {
    const x = (i / (datos.length - 1)) * W
    const y = H - ((c.peso - min) / range) * H
    return [x, y, c]
  })
  const polyPts = points.map(([x,y]) => `${x},${y}`).join(' ')
  const areaPts = `0,${H} ${polyPts} ${W},${H}`
  const tendencia = pesos[pesos.length-1] - pesos[0]
  const color = tendencia < 0 ? '#10b981' : tendencia > 0 ? '#ef4444' : '#6b7280'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#9B9B9B] font-medium">EVOLUCIÓN PESO</span>
        <span className={`text-[10px] font-bold ${tendencia < 0 ? 'text-emerald-500' : tendencia > 0 ? 'text-red-400' : 'text-[#9B9B9B]'}`}>
          {tendencia !== 0 ? `${tendencia > 0 ? '+' : ''}${tendencia.toFixed(1)} kg` : '= estable'}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <linearGradient id="gradPeso" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={areaPts} fill="url(#gradPeso)"/>
        <polyline points={polyPts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {points.map(([x,y,c], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={i === points.length-1 ? 3.5 : 2} fill={color}/>
            {i === 0 || i === points.length-1 ? (
              <text x={x} y={y-6} textAnchor={i===0?'start':'end'} fontSize="8" fill="#9B9B9B">{c.peso}kg</text>
            ) : null}
          </g>
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[#C0C0C0]">{fmt(datos[0]?.fecha)}</span>
        <span className="text-[9px] text-[#C0C0C0]">{fmt(datos[datos.length-1]?.fecha)}</span>
      </div>
    </div>
  )
}

// Barra de métrica con color semafórico
function BarraMetrica({ label, valor, max, colorFn }) {
  if (!valor) return null
  const pct = Math.round((valor / max) * 100)
  const color = colorFn(valor)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#9B9B9B] w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-[#F0F0EC] rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }}/>
      </div>
      <span className="text-[10px] font-bold text-[#0A0A0A] w-6 text-right">{valor}</span>
    </div>
  )
}

export default function ClienteQuickView({ clienteId, onClose }) {
  const [cliente, setCliente] = useState(null)
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('resumen') // 'resumen' | 'progreso' | 'fotos'
  const [fotoIdx, setFotoIdx] = useState({ antes: 0, despues: -1 })
  const navigate = useNavigate()

  useEffect(() => {
    if (!clienteId) return
    setLoading(true)
    setTab('resumen')
    async function cargar() {
      const [{ data: cl }, { data: ci }, { data: se }, { data: ru }, { data: pg }, { data: fo }] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', clienteId).single(),
        supabase.from('checkins').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }).limit(12),
        supabase.from('sesiones').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }).limit(20),
        supabase.from('rutinas').select('nombre, estado, dias_semana').eq('cliente_id', clienteId).eq('estado','publicada').limit(1),
        supabase.from('pagos').select('valido_hasta, importe').eq('cliente_id', clienteId).order('fecha_pago', { ascending: false }).limit(1),
        supabase.from('fotos_progreso').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: true }).limit(20),
      ])
      setCliente(cl)
      setData({ checkins: ci||[], sesiones: se||[], rutina: ru?.[0], pago: pg?.[0], fotos: fo||[] })
      // inicializar índices fotos
      if (fo && fo.length > 0) {
        setFotoIdx({ antes: 0, despues: fo.length > 1 ? fo.length - 1 : 0 })
      }
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

  // RPE últimas 10 sesiones con rpe
  const rpeData = [...(data.sesiones||[])].reverse().filter(s => s.rpe).slice(-10).map(s => s.rpe)
  const rpePromedio = rpeData.length ? (rpeData.reduce((a,b)=>a+b,0)/rpeData.length).toFixed(1) : null

  // Último PR (sesión con máximo peso en cualquier ejercicio)
  let ultimoPR = null
  for (const ses of (data.sesiones||[])) {
    if (!ses.ejercicios) continue
    const ejers = Array.isArray(ses.ejercicios) ? ses.ejercicios : []
    for (const ej of ejers) {
      const sets = Array.isArray(ej.sets) ? ej.sets : []
      const maxPeso = Math.max(...sets.map(s => parseFloat(s.peso)||0))
      if (maxPeso > 0) {
        ultimoPR = { nombre: ej.nombre || ej.ejercicio_nombre, peso: maxPeso, fecha: ses.fecha }
        break
      }
    }
    if (ultimoPR) break
  }

  // Adherencia promedio últimos 4 CI
  const adherencia4 = data.checkins?.slice(0,4).filter(c=>c.adherencia_entreno).map(c=>c.adherencia_entreno)
  const adherenciaPromedio = adherencia4?.length ? Math.round(adherencia4.reduce((a,b)=>a+b,0)/adherencia4.length) : null

  const TABS = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'progreso', label: 'Progreso' },
    ...(data.fotos?.length ? [{ id: 'fotos', label: `Fotos ${data.fotos.length > 0 ? `(${data.fotos.length})` : ''}` }] : []),
  ]

  const fotoAntes = data.fotos?.[fotoIdx.antes]
  const fotoDespues = data.fotos?.[fotoIdx.despues]

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-4 border-acento border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : !cliente ? (
          <div className="p-6 text-center"><p className="text-[#6B6B6B]">Cliente no encontrado</p></div>
        ) : (
          <>
            {/* Header fijo */}
            <div className="p-4 border-b border-black/5 flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: avatarColor(cliente.nombre) }}>
                  {ini(cliente.nombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0A0A0A]">{cliente.nombre}</p>
                  <p className="text-xs text-[#6B6B6B]">
                    {cliente.tipo === 'online' ? '🌐 Online' : '📍 Presencial'} · {cliente.nivel || 'sin nivel'}
                    {cliente.tipo_entrenamiento && TIPOS_MAP[cliente.tipo_entrenamiento] ? ` · ${TIPOS_MAP[cliente.tipo_entrenamiento].icon} ${TIPOS_MAP[cliente.tipo_entrenamiento].label}` : ''}
                  </p>
                </div>
                <button onClick={onClose} className="text-[#6B6B6B] text-xl w-8 h-8 flex items-center justify-center">×</button>
              </div>

              {/* KPIs top */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  ['⚖️', ci0?.peso ? `${ci0.peso}kg` : '—', tendenciaPeso ? `${Number(tendenciaPeso)>0?'+':''}${tendenciaPeso}` : null, Number(tendenciaPeso)<0?'text-emerald-500':'text-red-400'],
                  ['⚡', ci0?.energia ? `${ci0.energia}/10` : '—', tendenciaEnergia !== null ? (tendenciaEnergia>0?'↑':'↓') : null, tendenciaEnergia>0?'text-emerald-500':'text-red-400'],
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

              {/* Tabs */}
              <div className="flex gap-1 mt-3">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${tab===t.id ? 'bg-[#0A0A0A] text-white' : 'text-[#6B6B6B] hover:bg-[#F5F5F0]'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido scrollable */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3">

              {/* ── TAB RESUMEN ── */}
              {tab === 'resumen' && (
                <>
                  {/* Vista de progreso unificada — resumen 6 líneas */}
                  <div className="border border-black/5 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-bold text-[#9B9B9B] tracking-wide">RESUMEN DE PROGRESO</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#6B6B6B]">⚖️ Peso actual</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#0A0A0A]">{ci0?.peso ? `${ci0.peso} kg` : '—'}</span>
                          {tendenciaPeso && <span className={`text-[10px] font-semibold ${Number(tendenciaPeso)<0?'text-emerald-500':'text-red-400'}`}>{Number(tendenciaPeso)>0?'+':''}{tendenciaPeso} kg</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#6B6B6B]">⚡ Energía media</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#0A0A0A]">{ci0?.energia ? `${ci0.energia}/10` : '—'}</span>
                          <Sparkline values={data.checkins?.slice(0,6).reverse().map(c=>c.energia)} color="#f59e0b" height={16} width={40}/>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#6B6B6B]">💪 Adherencia</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#0A0A0A]">{adherenciaPromedio ? `${adherenciaPromedio}/10` : '—'}</span>
                          {adherenciaPromedio && <span className={`text-[10px] font-semibold ${adherenciaPromedio>=7?'text-emerald-500':adherenciaPromedio>=5?'text-amber-500':'text-red-400'}`}>{adherenciaPromedio>=7?'Buena':adherenciaPromedio>=5?'Regular':'Baja'}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#6B6B6B]">📅 Último CI</span>
                        <span className="text-xs font-bold text-[#0A0A0A]">{ci0 ? fmt(ci0.fecha) : '—'}</span>
                      </div>
                      {ultimoPR && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6B6B6B]">🏆 Último PR</span>
                          <span className="text-xs font-bold text-[#0A0A0A]">{ultimoPR.nombre} — {ultimoPR.peso} kg</span>
                        </div>
                      )}
                      {rpePromedio && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6B6B6B]">📊 RPE promedio</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#0A0A0A]">{rpePromedio}/10</span>
                            <Sparkline values={rpeData} color="#8b5cf6" height={16} width={40}/>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

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
                          {fmt(ultimaSesion.fecha)}
                          {ultimaSesion.rpe ? ` · RPE ${ultimaSesion.rpe}` : ''}
                          {ultimaSesion.duracion_minutos ? ` · ${ultimaSesion.duracion_minutos}min` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Último CI resumen */}
                  {ci0 && (
                    <div className="border border-black/5 rounded-xl p-3">
                      <p className="text-xs font-semibold text-[#0A0A0A] mb-2">
                        Último check-in — {fmt(ci0.fecha)}
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
                </>
              )}

              {/* ── TAB PROGRESO ── */}
              {tab === 'progreso' && (
                <>
                  {/* Gráfica de peso */}
                  {data.checkins?.filter(c=>c.peso).length >= 2 ? (
                    <div className="border border-black/5 rounded-xl p-3">
                      <GraficaPeso checkins={data.checkins}/>
                    </div>
                  ) : (
                    <div className="border border-black/5 rounded-xl p-4 text-center">
                      <p className="text-xs text-[#9B9B9B]">Sin suficientes datos de peso todavía</p>
                    </div>
                  )}

                  {/* Gráfica RPE */}
                  {rpeData.length >= 2 && (
                    <div className="border border-black/5 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[#9B9B9B] tracking-wide">RPE ÚLTIMAS SESIONES</span>
                        <span className="text-[10px] font-bold text-[#6B6B6B]">Media: {rpePromedio}/10</span>
                      </div>
                      <div className="flex items-end gap-1">
                        {rpeData.map((v,i) => {
                          const pct = (v/10)*100
                          const color = v>=8?'#ef4444':v>=6?'#f59e0b':'#10b981'
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                              <span className="text-[8px] text-[#9B9B9B]">{v}</span>
                              <div className="w-full rounded-sm" style={{ height: `${Math.max(4, pct*0.4)}px`, background: color, opacity: i===rpeData.length-1?1:0.6 }}/>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-[#C0C0C0]">anterior</span>
                        <span className="text-[9px] text-[#C0C0C0]">último</span>
                      </div>
                    </div>
                  )}

                  {/* Métricas wellbeing últimos CI */}
                  {data.checkins?.length >= 1 && (
                    <div className="border border-black/5 rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-bold text-[#9B9B9B] tracking-wide">BIENESTAR ÚLTIMO CI</p>
                      <BarraMetrica label="Energía" valor={ci0?.energia} max={10} colorFn={v=>v>=7?'#10b981':v>=4?'#f59e0b':'#ef4444'}/>
                      <BarraMetrica label="Estrés" valor={ci0?.estres} max={5} colorFn={v=>v<=2?'#10b981':v<=3?'#f59e0b':'#ef4444'}/>
                      <BarraMetrica label="Fatiga" valor={ci0?.fatiga} max={5} colorFn={v=>v<=2?'#10b981':v<=3?'#f59e0b':'#ef4444'}/>
                      <BarraMetrica label="Motivación" valor={ci0?.motivacion} max={7} colorFn={v=>v>=5?'#10b981':v>=3?'#f59e0b':'#ef4444'}/>
                      <BarraMetrica label="Adherencia" valor={ci0?.adherencia_entreno} max={10} colorFn={v=>v>=7?'#10b981':v>=5?'#f59e0b':'#ef4444'}/>
                    </div>
                  )}

                  {/* Historial últimos CI simplificado */}
                  {data.checkins?.length > 0 && (
                    <div className="border border-black/5 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-[#9B9B9B] tracking-wide mb-2">HISTORIAL CHECK-INS</p>
                      <div className="space-y-1.5">
                        {data.checkins.slice(0,5).map((ci, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] text-[#9B9B9B] w-16 flex-shrink-0">{fmt(ci.fecha)}</span>
                            <div className="flex-1 flex gap-1 flex-wrap">
                              {ci.peso && <span className="text-[10px] bg-[#F5F5F0] px-1.5 py-0.5 rounded-full">{ci.peso}kg</span>}
                              {ci.energia && <span className="text-[10px] bg-[#F5F5F0] px-1.5 py-0.5 rounded-full">⚡{ci.energia}</span>}
                              {ci.fatiga && <span className="text-[10px] bg-[#F5F5F0] px-1.5 py-0.5 rounded-full">🔥{ci.fatiga}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!data.checkins?.length && !rpeData.length && (
                    <div className="border border-black/5 rounded-xl p-6 text-center">
                      <p className="text-2xl mb-2">📊</p>
                      <p className="text-xs text-[#9B9B9B]">Sin datos de progreso todavía</p>
                      <p className="text-[10px] text-[#C0C0C0] mt-1">Los check-ins y sesiones irán apareciendo aquí</p>
                    </div>
                  )}
                </>
              )}

              {/* ── TAB FOTOS ── */}
              {tab === 'fotos' && (
                <>
                  {data.fotos?.length >= 1 ? (
                    <>
                      <p className="text-[10px] font-bold text-[#9B9B9B] tracking-wide">COMPARATIVA ANTES / DESPUÉS</p>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Foto ANTES */}
                        <div className="space-y-1">
                          <p className="text-[10px] text-center text-[#9B9B9B] font-medium">ANTES</p>
                          {fotoAntes ? (
                            <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#F5F5F0]">
                              <img src={fotoAntes.url} alt="antes" className="w-full h-full object-cover"/>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1">
                                <p className="text-[9px] text-white text-center">{fmt(fotoAntes.fecha)}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-[3/4] rounded-xl bg-[#F5F5F0] flex items-center justify-center">
                              <p className="text-[10px] text-[#C0C0C0]">Sin foto</p>
                            </div>
                          )}
                          {/* Selector foto antes */}
                          {data.fotos.length > 1 && (
                            <div className="flex gap-1 justify-center">
                              {data.fotos.slice(0, Math.ceil(data.fotos.length/2)).map((_, i) => (
                                <button key={i} onClick={() => setFotoIdx(f=>({...f, antes: i}))}
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${fotoIdx.antes===i?'bg-[#0A0A0A]':'bg-[#D0D0C8]'}`}/>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Foto DESPUÉS */}
                        <div className="space-y-1">
                          <p className="text-[10px] text-center text-[#9B9B9B] font-medium">DESPUÉS</p>
                          {fotoDespues && fotoDespues !== fotoAntes ? (
                            <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#F5F5F0]">
                              <img src={fotoDespues.url} alt="después" className="w-full h-full object-cover"/>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1">
                                <p className="text-[9px] text-white text-center">{fmt(fotoDespues.fecha)}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-[3/4] rounded-xl bg-[#F5F5F0] flex items-center justify-center">
                              <p className="text-[10px] text-[#C0C0C0]">{data.fotos.length <= 1 ? 'Sólo 1 foto' : 'Sin foto'}</p>
                            </div>
                          )}
                          {/* Selector foto después */}
                          {data.fotos.length > 1 && (
                            <div className="flex gap-1 justify-center">
                              {data.fotos.slice(Math.floor(data.fotos.length/2)).map((_, i) => {
                                const realIdx = Math.floor(data.fotos.length/2) + i
                                return (
                                  <button key={i} onClick={() => setFotoIdx(f=>({...f, despues: realIdx}))}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${fotoIdx.despues===realIdx?'bg-[#0A0A0A]':'bg-[#D0D0C8]'}`}/>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Lista todas las fotos */}
                      {data.fotos.length > 2 && (
                        <div className="border border-black/5 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-[#9B9B9B] tracking-wide mb-2">TODAS LAS FOTOS ({data.fotos.length})</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {data.fotos.map((f, i) => (
                              <button key={i} onClick={() => setFotoIdx({ antes: i, despues: data.fotos.length-1 })}
                                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${fotoIdx.antes===i?'border-acento':'border-transparent'}`}>
                                <img src={f.url} alt={`foto ${i+1}`} className="w-full h-full object-cover"/>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="border border-black/5 rounded-xl p-6 text-center">
                      <p className="text-2xl mb-2">📸</p>
                      <p className="text-xs text-[#9B9B9B]">Sin fotos de progreso</p>
                      <p className="text-[10px] text-[#C0C0C0] mt-1">El cliente puede subir fotos desde su portal</p>
                    </div>
                  )}
                </>
              )}

              {/* Acciones rápidas — siempre visibles */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => { navigate('/clientes'); onClose(); setTimeout(() => window.dispatchEvent(new CustomEvent('abrir-cliente', { detail: clienteId })), 300) }}
                  className="col-span-2 bg-acento text-white text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-all">
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
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/seguimiento/${clienteId}`).then(()=>{}).catch(()=>{}); onClose() }}
                  className="col-span-2 border border-black/10 text-[#6B6B6B] text-xs font-medium py-2 rounded-xl hover:bg-[#F5F5F0]">
                  📨 Copiar link de check-in
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
