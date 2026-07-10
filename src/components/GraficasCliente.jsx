import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts'

const EJERCICIOS_FUERZA = [
  { key: 'press_banca', label: 'Press banca', color: '#FF5C00' },
  { key: 'sentadilla', label: 'Sentadilla', color: '#6366f1' },
  { key: 'peso_muerto', label: 'Peso muerto', color: '#10b981' },
  { key: 'dominadas', label: 'Dominadas', color: '#f59e0b' },
  { key: 'press_militar', label: 'Press militar', color: '#ec4899' },
]

const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111] text-white px-3 py-2 rounded-xl text-xs shadow-lg">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}{p.unit || ''}</p>
      ))}
    </div>
  )
}

export default function GraficasCliente({ clienteId }) {
  const [checkins, setCheckins] = useState([])
  const [progresion, setProgresion] = useState([])
  const [tabGrafica, setTabGrafica] = useState('peso')
  const [ejercicioFuerza, setEjercicioFuerza] = useState('press_banca')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [{ data: ci }, { data: pf }] = await Promise.all([
        supabase.from('checkins').select('*').eq('cliente_id', clienteId)
          .order('fecha', { ascending: true }).limit(16),
        supabase.from('progresion_fuerza').select('*').eq('cliente_id', clienteId)
          .order('fecha', { ascending: true }).limit(12),
      ])
      setCheckins(ci || [])
      setProgresion(pf || [])
      setLoading(false)
    }
    cargar()
  }, [clienteId])

  const fmtFecha = f => {
    const d = new Date(f)
    return `${d.getDate()}/${d.getMonth()+1}`
  }

  // Datos para gráfica de peso
  const dataPeso = checkins.filter(c => c.peso).map(c => ({
    fecha: fmtFecha(c.fecha),
    Peso: Number(c.peso)
  }))

  // Datos para gráfica de bienestar
  const dataBienestar = checkins.map(c => ({
    fecha: fmtFecha(c.fecha),
    Energía: c.energia,
    Motivación: c.motivacion,
    Estrés: c.estres,
  }))

  // Datos para adherencia
  const dataAdherencia = checkins.map(c => ({
    fecha: fmtFecha(c.fecha),
    Entreno: c.adherencia_entreno,
    Nutrición: c.adherencia_nutricion,
  }))

  // Datos para fuerza
  const ej = EJERCICIOS_FUERZA.find(e => e.key === ejercicioFuerza)
  const dataFuerza = progresion
    .filter(p => p[`${ejercicioFuerza}_kg`] || p[`${ejercicioFuerza}_reps`])
    .map(p => ({
      fecha: fmtFecha(p.fecha),
      kg: p[`${ejercicioFuerza}_kg`] || p['dominadas_lastre_kg'] || null,
      reps: p[`${ejercicioFuerza}_reps`] || p['dominadas_reps'] || null,
    }))

  const tabs = [
    { id: 'peso', label: '⚖️ Peso' },
    { id: 'bienestar', label: '⚡ Bienestar' },
    { id: 'adherencia', label: '💪 Adherencia' },
    { id: 'fuerza', label: '🏋️ Fuerza' },
  ]

  if (loading) return <div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-3 border-[#FF5C00] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      {/* Tabs gráficas */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTabGrafica(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all ${
              tabGrafica === t.id ? 'bg-[#FF5C00] text-white' : 'bg-[#F5F5F0] text-[#6B6B6B] hover:bg-black/5'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PESO */}
      {tabGrafica === 'peso' && (
        <div>
          {dataPeso.length < 2 ? (
            <div className="h-32 flex items-center justify-center text-sm text-[#6B6B6B] bg-[#F5F5F0] rounded-xl">
              Sin suficientes datos de peso todavía
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#6B6B6B]">Evolución de peso (kg)</p>
                {dataPeso.length >= 2 && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    dataPeso[dataPeso.length-1].Peso < dataPeso[0].Peso
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {dataPeso[dataPeso.length-1].Peso < dataPeso[0].Peso ? '↓' : '↑'}
                    {Math.abs(dataPeso[dataPeso.length-1].Peso - dataPeso[0].Peso).toFixed(1)}kg total
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={dataPeso}>
                  <defs>
                    <linearGradient id="gradPeso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF5C00" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#FF5C00" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B6B6B' }} axisLine={false} tickLine={false} domain={['auto','auto']} unit="kg" width={40} />
                  <Tooltip content={<TooltipCustom />} />
                  <Area type="monotone" dataKey="Peso" stroke="#FF5C00" strokeWidth={2.5} fill="url(#gradPeso)" dot={{ fill: '#FF5C00', r: 3 }} activeDot={{ r: 5 }} unit="kg" />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}

      {/* BIENESTAR */}
      {tabGrafica === 'bienestar' && (
        <div>
          {dataBienestar.length < 2 ? (
            <div className="h-32 flex items-center justify-center text-sm text-[#6B6B6B] bg-[#F5F5F0] rounded-xl">
              Sin suficientes datos todavía
            </div>
          ) : (
            <>
              <p className="text-xs text-[#6B6B6B] mb-2">Energía, motivación y estrés semanal</p>
              <div className="flex gap-3 mb-2">
                {[['Energía','#FF5C00'],['Motivación','#6366f1'],['Estrés','#ef4444']].map(([l,c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{background:c}} />
                    <span className="text-xs text-[#6B6B6B]">{l}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={dataBienestar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B6B6B' }} axisLine={false} tickLine={false} domain={[0,10]} width={25} />
                  <Tooltip content={<TooltipCustom />} />
                  <Line type="monotone" dataKey="Energía" stroke="#FF5C00" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Motivación" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Estrés" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}

      {/* ADHERENCIA */}
      {tabGrafica === 'adherencia' && (
        <div>
          {dataAdherencia.length < 2 ? (
            <div className="h-32 flex items-center justify-center text-sm text-[#6B6B6B] bg-[#F5F5F0] rounded-xl">
              Sin suficientes datos todavía
            </div>
          ) : (
            <>
              <p className="text-xs text-[#6B6B6B] mb-2">Adherencia al entreno y nutrición (1-10)</p>
              <div className="flex gap-3 mb-2">
                {[['Entreno','#FF5C00'],['Nutrición','#10b981']].map(([l,c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{background:c}} />
                    <span className="text-xs text-[#6B6B6B]">{l}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dataAdherencia} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B6B6B' }} axisLine={false} tickLine={false} domain={[0,10]} width={25} />
                  <Tooltip content={<TooltipCustom />} />
                  <Bar dataKey="Entreno" fill="#FF5C00" radius={[4,4,0,0]} />
                  <Bar dataKey="Nutrición" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}

      {/* FUERZA */}
      {tabGrafica === 'fuerza' && (
        <div>
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            {EJERCICIOS_FUERZA.map(e => (
              <button key={e.key} onClick={() => setEjercicioFuerza(e.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 transition-all ${
                  ejercicioFuerza === e.key ? 'text-white' : 'bg-[#F5F5F0] text-[#6B6B6B]'
                }`}
                style={ejercicioFuerza === e.key ? { background: e.color } : {}}>
                {e.label}
              </button>
            ))}
          </div>
          {dataFuerza.length < 2 ? (
            <div className="h-32 flex items-center justify-center text-sm text-[#6B6B6B] bg-[#F5F5F0] rounded-xl">
              Sin datos de {ej?.label} todavía
            </div>
          ) : (
            <>
              <p className="text-xs text-[#6B6B6B] mb-2">Progresión de {ej?.label}</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={dataFuerza}>
                  <defs>
                    <linearGradient id="gradFuerza" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ej?.color} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={ej?.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B6B6B' }} axisLine={false} tickLine={false} domain={['auto','auto']} unit="kg" width={40} />
                  <Tooltip content={<TooltipCustom />} />
                  <Area type="monotone" dataKey="kg" name="Peso" stroke={ej?.color} strokeWidth={2.5} fill="url(#gradFuerza)" dot={{ fill: ej?.color, r: 3 }} unit="kg" />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}
    </div>
  )
}
