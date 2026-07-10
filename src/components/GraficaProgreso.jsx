import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111] text-white text-xs px-3 py-2 rounded-xl shadow-lg">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>{p.name}: {p.value}{p.unit || ''}</p>
      ))}
    </div>
  )
}

// Gráfica de peso
export function GraficaPeso({ checkins, pesoObjetivo }) {
  const datos = checkins
    .filter(c => c.peso)
    .slice(0, 12)
    .reverse()
    .map(c => ({
      fecha: new Date(c.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      peso: Number(c.peso),
    }))

  if (datos.length < 2) return (
    <div className="flex items-center justify-center h-24 text-xs text-[#6B6B6B]">
      Mínimo 2 registros de peso para mostrar la gráfica
    </div>
  )

  const min = Math.min(...datos.map(d => d.peso)) - 2
  const max = Math.max(...datos.map(d => d.peso)) + 2

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={datos} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
        <YAxis domain={[min, max]} tick={{ fontSize: 10, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {pesoObjetivo && <ReferenceLine y={pesoObjetivo} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} />}
        <Line type="monotone" dataKey="peso" name="Peso" unit="kg" stroke="#FF5C00" strokeWidth={2.5} dot={{ fill: '#FF5C00', r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Gráfica de energía y estrés
export function GraficaBienestar({ checkins }) {
  const datos = checkins
    .filter(c => c.energia || c.estres)
    .slice(0, 8)
    .reverse()
    .map(c => ({
      fecha: new Date(c.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      energia: c.energia,
      estres: c.estres ? c.estres * 2 : null, // escalar de 1-5 a 1-10 para misma escala
      motivacion: c.motivacion,
    }))

  if (datos.length < 2) return (
    <div className="flex items-center justify-center h-24 text-xs text-[#6B6B6B]">
      Mínimo 2 seguimientos para mostrar la gráfica
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={datos} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="energia" name="Energía" unit="/10" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
        <Line type="monotone" dataKey="motivacion" name="Motivación" unit="/7" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} strokeDasharray="4 4" />
        <Line type="monotone" dataKey="estres" name="Estrés×2" unit="" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} strokeDasharray="2 2" />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Gráfica de fuerza (progresión mensual)
export function GraficaFuerza({ progresion }) {
  if (!progresion?.length || progresion.length < 2) return (
    <div className="flex items-center justify-center h-24 text-xs text-[#6B6B6B]">
      Mínimo 2 controles de progresión para mostrar la gráfica
    </div>
  )

  const datos = progresion.slice(0, 6).reverse().map(p => ({
    fecha: new Date(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    banca: p.press_banca_kg,
    sentadilla: p.sentadilla_kg,
    muerto: p.peso_muerto_kg,
    militar: p.press_militar_kg,
  }))

  const lineas = [
    { key: 'banca', label: 'Banca', color: '#FF5C00' },
    { key: 'sentadilla', label: 'Sentadilla', color: '#3b82f6' },
    { key: 'muerto', label: 'Muerto', color: '#10b981' },
    { key: 'militar', label: 'Militar', color: '#f59e0b' },
  ].filter(l => datos.some(d => d[l.key]))

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={datos} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {lineas.map(l => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} unit="kg"
            stroke={l.color} strokeWidth={2} dot={{ fill: l.color, r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// Gráfica adherencia
export function GraficaAdherencia({ checkins }) {
  const datos = checkins
    .filter(c => c.adherencia_entreno)
    .slice(0, 8)
    .reverse()
    .map(c => ({
      fecha: new Date(c.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      entreno: c.adherencia_entreno,
      nutricion: c.adherencia_nutricion,
    }))

  if (datos.length < 2) return (
    <div className="flex items-center justify-center h-24 text-xs text-[#6B6B6B]">
      Mínimo 2 seguimientos para mostrar la gráfica
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={datos} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="entreno" name="Entreno" unit="/10" stroke="#FF5C00" strokeWidth={2} dot={{ fill: '#FF5C00', r: 3 }} />
        <Line type="monotone" dataKey="nutricion" name="Nutrición" unit="/10" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} strokeDasharray="4 4" />
      </LineChart>
    </ResponsiveContainer>
  )
}
