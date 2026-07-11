import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import ClienteQuickView from '../components/ClienteQuickView'

const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'

const ESCALAS = [
  { label: 'Energía', field: 'energia', min: 1, max: 10, suffix: '/10', color: 'blue' },
  { label: 'Sueño (horas)', field: 'sueno', min: 4, max: 10, suffix: 'h', color: 'purple' },
  { label: 'Estrés', field: 'estres', min: 1, max: 5, suffix: '/5', red: true },
  { label: 'Fatiga muscular', field: 'fatiga', min: 1, max: 5, suffix: '/5', red: true },
  { label: 'Motivación', field: 'motivacion', min: 1, max: 7, suffix: '/7', color: 'yellow' },
  { label: 'Calidad entreno', field: 'calidad_entreno', min: 1, max: 7, suffix: '/7', color: 'green' },
  { label: 'Adherencia entreno', field: 'adherencia_entreno', min: 1, max: 10, suffix: '/10', color: 'orange' },
  { label: 'Adherencia nutrición', field: 'adherencia_nutricion', min: 1, max: 10, suffix: '/10', color: 'orange' },
]

const initForm = {
  cliente_id: '', fecha: new Date().toISOString().split('T')[0], peso: '', energia: 7, sueno: 7, estres: 2, fatiga: 2,
  motivacion: 5, calidad_entreno: 5, sesiones_semana: 3,
  adherencia_entreno: 7, adherencia_nutricion: 7, pasos_diarios: '', comentario: ''
}

const badgeColor = (field, val) => {
  if (field === 'estres' || field === 'fatiga') return val >= 4 ? 'bg-red-50 text-red-700' : val >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
  if (field === 'energia' || field === 'motivacion' || field === 'calidad_entreno') return val >= 7 ? 'bg-green-50 text-green-700' : val >= 4 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
  if (field === 'adherencia_entreno' || field === 'adherencia_nutricion') return val >= 7 ? 'bg-green-50 text-green-700' : val >= 4 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
  return 'bg-[#F5F5F0] text-[#6B6B6B]'
}

export default function Seguimiento({ session }) {
  const [checkins, setCheckins] = useState([])
  const [clientes, setClientes] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initForm)
  const [loading, setLoading] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const uid = session.user.id
  const [busqueda, setBusqueda] = useState('')
  const [filtroAlerta, setFiltroAlerta] = useState('todos')
  const [detalleCI, setDetalleCI] = useState(null)
  const [quickView, setQuickView] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState('')

  const checkinsFiltrados = useMemo(() => {
    let r = [...checkins]
    if (filtroCliente !== 'todos') r = r.filter(x => x.cliente_id === filtroCliente)
    if (busqueda) { const b = busqueda.toLowerCase(); r = r.filter(x => x.clientes?.nombre?.toLowerCase().includes(b)) }
    if (filtroAlerta === 'fatiga') r = r.filter(x => x.fatiga >= 4 || x.estres >= 4)
    if (filtroAlerta === 'energia_baja') r = r.filter(x => x.energia <= 3)
    if (filtroAlerta === 'baja_adherencia') r = r.filter(x => x.adherencia_entreno <= 4)
    return r
  }, [checkins, filtroCliente, busqueda, filtroAlerta])

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const [{ data: ci }, { data: cl }] = await Promise.all([
      supabase.from('checkins').select('*, clientes(nombre, tipo)').eq('entrenador_id', uid).order('fecha', { ascending: false }).limit(100),
      supabase.from('clientes').select('id,nombre,tipo').eq('entrenador_id', uid).eq('estado', 'activo'),
    ])
    setCheckins(ci || [])
    setClientes(cl || [])
  }

  async function reenviarCheckin() {
    setEnviando(true)
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/checkin-semanal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` }
      })
      setToast('Check-in enviado a todos los clientes activos ✓')
    } catch { setToast('Error al enviar') }
    setEnviando(false)
    setTimeout(() => setToast(''), 3000)
  }

  async function copiarEnlaceCheckin(clienteId) {
    const url = `${window.location.origin}/seguimiento/${clienteId}`
    await navigator.clipboard.writeText(url)
    setToast('Enlace de seguimiento copiado ✓')
    setTimeout(() => setToast(''), 3000)
  }

  async function guardar() {
    setLoading(true)
    await supabase.from('checkins').insert({
      ...form,
      entrenador_id: uid,
      peso: form.peso ? Number(form.peso) : null,
      pasos_diarios: form.pasos_diarios ? Number(form.pasos_diarios) : null
    })
    setModal(false)
    setForm(initForm)
    await cargar()
    setLoading(false)
  }

  const Btn = ({ field, val }) => {
    const active = form[field] === val
    const isRed = (field === 'estres' || field === 'fatiga') && val >= 4
    return (
      <button type="button" onClick={() => setForm(f => ({ ...f, [field]: val }))}
        className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all ${active
          ? isRed ? 'bg-red-500 text-white' : 'bg-[#FF5C00] text-white'
          : 'border border-black/10 text-[#6B6B6B] hover:border-orange-300'}`}>
        {val}
      </button>
    )
  }


  // Etiquetas descriptivas por escala y valor
  const getEtiqueta = (campo, valor) => {
    const escalas = {
      energia: { 1:'Agotado', 2:'Muy baja', 3:'Baja', 4:'Por debajo de lo normal', 5:'Normal', 6:'Bien', 7:'Bastante bien', 8:'Alta', 9:'Muy alta', 10:'Excelente' },
      sueno: { 1:'1h', 2:'2h', 3:'3h', 4:'4h', 5:'5h', 6:'6h', 7:'7h', 8:'8h', 9:'9h', 10:'10h+' },
      estres: { 1:'Sin estrés', 2:'Leve', 3:'Moderado', 4:'Alto', 5:'Muy alto' },
      fatiga: { 1:'Sin fatiga', 2:'Leve', 3:'Moderada', 4:'Alta', 5:'Muy alta' },
      motivacion: { 1:'Sin motivación', 2:'Muy baja', 3:'Baja', 4:'Normal', 5:'Bien', 6:'Alta', 7:'Máxima' },
      calidad_entreno: { 1:'Muy mala', 2:'Mala', 3:'Regular', 4:'Normal', 5:'Buena', 6:'Muy buena', 7:'Excelente' },
      adherencia_entreno: { 1:'0%', 2:'20%', 3:'30%', 4:'40%', 5:'50%', 6:'60%', 7:'70%', 8:'80%', 9:'90%', 10:'100%' },
      adherencia_nutricion: { 1:'0%', 2:'20%', 3:'30%', 4:'40%', 5:'50%', 6:'60%', 7:'70%', 8:'80%', 9:'90%', 10:'100%' },
    }
    return escalas[campo]?.[valor] || `${valor}`
  }
  const ini = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111] text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2">
          <span className="text-emerald-400">✓</span> {toast}
        </div>
      )}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Seguimiento</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Check-ins semanales · Detecta fatiga y abandono antes de que ocurran</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={reenviarCheckin} disabled={enviando} title="Reenviar check-in a todos los clientes"
            className="border border-black/10 text-[#6B6B6B] text-sm font-medium px-3 py-2 rounded-xl hover:bg-[#F5F5F0] transition-all disabled:opacity-40">
            {enviando ? '⏳' : '📨'}
          </button>
          <button onClick={() => setModal(true)}
            className="bg-[#FF5C00] hover:bg-[#E05200] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95">
            + Registrar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          ['Total CI', checkins.length, '#FF5C00'],
          ['Con fatiga alta', checkins.filter(x=>x.fatiga>=4||x.estres>=4).length, '#ef4444'],
          ['Energía baja', checkins.filter(x=>x.energia<=3).length, '#f59e0b'],
        ].map(([l,v,c])=>(
          <div key={l} className="bg-white rounded-xl border border-black/5 shadow-sm p-3.5 text-center">
            <p className="text-2xl font-bold" style={{color:c}}>{v}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por cliente..."
          className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
        {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">×</button>}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setFiltroAlerta('todos')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroAlerta==='todos'?'bg-[#FF5C00] text-white':'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
          Todos ({checkins.length})
        </button>
        <button onClick={() => setFiltroAlerta('fatiga')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroAlerta==='fatiga'?'bg-red-500 text-white':'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'}`}>
          ⚡ Fatiga alta
        </button>
        <button onClick={() => setFiltroAlerta('energia_baja')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroAlerta==='energia_baja'?'bg-amber-500 text-white':'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
          🔋 Energía baja
        </button>
        <button onClick={() => setFiltroAlerta('baja_adherencia')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroAlerta==='baja_adherencia'?'bg-violet-500 text-white':'bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100'}`}>
          📉 Baja adherencia
        </button>
        {clientes.length > 1 && <>
          <div className="w-px bg-black/10 flex-shrink-0" />
          {clientes.map(c => (
            <button key={c.id} onClick={() => setFiltroCliente(filtroCliente===c.id?'todos':c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filtroCliente===c.id?'bg-[#111] text-white':'bg-white border border-black/10 text-[#6B6B6B] hover:border-[#FF5C00]'}`}>
              {c.nombre.split(' ')[0]}
            </button>
          ))}
        </>}
      </div>

      {/* Lista checkins */}
      <div className="space-y-2">
        {checkinsFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-black/5 p-8 text-center">
            <p className="text-[#6B6B6B] text-sm">Sin seguimientos registrados</p>
          </div>
        ) : checkinsFiltrados.map(ci => (
          <div key={ci.id} onClick={() => setDetalleCI(ci)} className="bg-white rounded-xl border border-black/5 p-3.5 cursor-pointer hover:shadow-md hover:border-[#FF5C00]/20 transition-all">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-[#FF5C00] font-bold text-xs flex-shrink-0">
                  {ini(ci.clientes?.nombre)}
                </div>
                <div>
                  <button onClick={e=>{e.stopPropagation();setQuickView(ci.cliente_id)}} className="text-sm font-medium text-[#0A0A0A] hover:text-[#FF5C00] transition-colors">{ci.clientes?.nombre}</button>
                  <p className="text-xs text-[#6B6B6B]">{new Date(ci.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="text-right">
                {ci.peso && <p className="text-base font-bold text-[#FF5C00]">{ci.peso}kg</p>}
                {ci.pasos_diarios && <p className="text-xs text-[#6B6B6B]">👟 {ci.pasos_diarios.toLocaleString()}</p>}
                <button onClick={() => copiarEnlaceCheckin(ci.cliente_id)}
                  className="text-xs text-[#6B6B6B] hover:text-[#FF5C00] mt-1 transition-colors">
                  🔗 CI
                </button>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {ci.energia && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('energia', ci.energia)}`}>⚡ {ci.energia}/10</span>}
              {ci.sueno && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-medium">😴 {ci.sueno}h</span>}
              {ci.estres && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('estres', ci.estres)}`}>😤 {ci.estres}/5</span>}
              {ci.fatiga && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('fatiga', ci.fatiga)}`}>🔥 {ci.fatiga}/5</span>}
              {ci.motivacion && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('motivacion', ci.motivacion)}`}>💫 {ci.motivacion}/7</span>}
              {ci.calidad_entreno && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('calidad_entreno', ci.calidad_entreno)}`}>🏋️ {ci.calidad_entreno}/7</span>}
              {ci.sesiones_semana != null && <span className="text-xs bg-[#F5F5F0] text-[#6B6B6B] px-2 py-1 rounded-full font-medium">📅 {ci.sesiones_semana} ses</span>}
              {ci.adherencia_entreno && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('adherencia_entreno', ci.adherencia_entreno)}`}>💪 {ci.adherencia_entreno}/10</span>}
              {ci.adherencia_nutricion && <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor('adherencia_nutricion', ci.adherencia_nutricion)}`}>🥗 {ci.adherencia_nutricion}/10</span>}
            </div>
            {ci.comentario && <p className="text-xs text-[#6B6B6B] mt-2 italic border-t border-black/5 pt-2">"{ci.comentario}"</p>}
            {/* Tendencia vs CI anterior del mismo cliente */}
            {(() => {
              const anterior = checkinsFiltrados.find(x => x.cliente_id === ci.cliente_id && x.fecha < ci.fecha)
              if (!anterior) return null
              const diffEnergia = ci.energia && anterior.energia ? ci.energia - anterior.energia : null
              const diffPeso = ci.peso && anterior.peso ? (ci.peso - anterior.peso).toFixed(1) : null
              if (!diffEnergia && !diffPeso) return null
              return (
                <div className="flex gap-2 mt-2 pt-2 border-t border-black/5">
                  {diffEnergia !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diffEnergia > 0 ? 'bg-emerald-50 text-emerald-700' : diffEnergia < 0 ? 'bg-red-50 text-red-600' : 'bg-[#F5F5F0] text-[#6B6B6B]'}`}>
                      ⚡ {diffEnergia > 0 ? '+' : ''}{diffEnergia} vs anterior
                    </span>
                  )}
                  {diffPeso !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${Number(diffPeso) < 0 ? 'bg-emerald-50 text-emerald-700' : Number(diffPeso) > 0 ? 'bg-red-50 text-red-600' : 'bg-[#F5F5F0] text-[#6B6B6B]'}`}>
                      ⚖️ {Number(diffPeso) > 0 ? '+' : ''}{diffPeso}kg
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        ))}
      </div>

      {/* Modal detalle check-in */}
      {detalleCI && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-black/5 sticky top-0 bg-white flex items-center justify-between">
              <div>
                <p className="font-bold text-[#0A0A0A]">{detalleCI.clientes?.nombre}</p>
                <p className="text-xs text-[#6B6B6B]">
                  {new Date(detalleCI.fecha).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                </p>
              </div>
              <button onClick={() => setDetalleCI(null)} className="text-[#6B6B6B] text-xl w-8 h-8 flex items-center justify-center">×</button>
            </div>

            <div className="p-4 space-y-4">
              {/* Peso y pasos destacados */}
              {(detalleCI.peso || detalleCI.pasos_diarios) && (
                <div className="grid grid-cols-2 gap-2">
                  {detalleCI.peso && (
                    <div className="bg-[#FF5C00]/8 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#FF5C00]">{detalleCI.peso}kg</p>
                      <p className="text-xs text-[#6B6B6B] mt-0.5">Peso corporal</p>
                    </div>
                  )}
                  {detalleCI.pasos_diarios && (
                    <div className="bg-[#F5F5F0] rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#0A0A0A]">{Number(detalleCI.pasos_diarios).toLocaleString()}</p>
                      <p className="text-xs text-[#6B6B6B] mt-0.5">Pasos diarios</p>
                    </div>
                  )}
                </div>
              )}

              {/* Escalas detalladas */}
              <div className="space-y-2">
                {[
                  { campo:'energia', label:'Energía', icon:'⚡', max:10, desc:'Nivel de energía general durante la semana' },
                  { campo:'sueno', label:'Sueño', icon:'😴', max:10, desc:'Horas de sueño promedio por noche' },
                  { campo:'estres', label:'Estrés', icon:'😤', max:5, desc:'Nivel de estrés percibido', invertido:true },
                  { campo:'fatiga', label:'Fatiga', icon:'🔥', max:5, desc:'Fatiga acumulada del entrenamiento', invertido:true },
                  { campo:'motivacion', label:'Motivación', icon:'💫', max:7, desc:'Motivación para entrenar' },
                  { campo:'calidad_entreno', label:'Calidad entreno', icon:'🏋️', max:7, desc:'Calidad percibida de los entrenamientos' },
                  { campo:'sesiones_semana', label:'Sesiones realizadas', icon:'📅', max:7, desc:'Número de sesiones completadas esta semana', noBar:true },
                  { campo:'adherencia_entreno', label:'Adherencia entreno', icon:'💪', max:10, desc:'Cumplimiento del plan de entrenamiento' },
                  { campo:'adherencia_nutricion', label:'Adherencia nutrición', icon:'🥗', max:10, desc:'Cumplimiento del plan nutricional' },
                ].map(({ campo, label, icon, max, desc, invertido, noBar }) => {
                  const val = detalleCI[campo]
                  if (!val && val !== 0) return null
                  const pct = (val / max) * 100
                  const etiqueta = getEtiqueta(campo, val)
                  const esAlerta = invertido ? val >= 4 : val <= 3
                  const esBien = invertido ? val <= 2 : val >= Math.ceil(max * 0.7)
                  const colorBar = esAlerta ? '#ef4444' : esBien ? '#10b981' : '#FF5C00'
                  return (
                    <div key={campo} className="bg-[#F5F5F0] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{icon}</span>
                          <div>
                            <p className="text-xs font-semibold text-[#0A0A0A]">{label}</p>
                            <p className="text-xs text-[#6B6B6B]">{desc}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold" style={{color: colorBar}}>{val}/{max}</p>
                          <p className="text-xs text-[#6B6B6B]">{etiqueta}</p>
                        </div>
                      </div>
                      {!noBar && (
                        <div className="h-1.5 bg-black/8 rounded-full overflow-hidden mt-2">
                          <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, background: colorBar}} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Comentario del cliente */}
              {detalleCI.comentario && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-700 mb-2">💬 Comentario del cliente</p>
                  <p className="text-sm text-amber-800 leading-relaxed">"{detalleCI.comentario}"</p>
                </div>
              )}

              {/* Alerta de atención si hay valores preocupantes */}
              {(detalleCI.fatiga >= 4 || detalleCI.estres >= 4 || detalleCI.energia <= 3 || detalleCI.motivacion <= 2) && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1.5">⚠ Puntos de atención</p>
                  <div className="space-y-1">
                    {detalleCI.fatiga >= 4 && <p className="text-xs text-red-600">• Fatiga alta ({detalleCI.fatiga}/5) — considera reducir la carga esta semana</p>}
                    {detalleCI.estres >= 4 && <p className="text-xs text-red-600">• Estrés elevado ({detalleCI.estres}/5) — puede afectar la recuperación</p>}
                    {detalleCI.energia <= 3 && <p className="text-xs text-red-600">• Energía baja ({detalleCI.energia}/10) — revisar descanso y nutrición</p>}
                    {detalleCI.motivacion <= 2 && <p className="text-xs text-red-600">• Motivación muy baja ({detalleCI.motivacion}/7) — contactar al cliente</p>}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setQuickView(detalleCI.cliente_id); setDetalleCI(null) }}
                  className="flex-1 bg-[#F5F5F0] text-[#0A0A0A] text-sm font-medium py-2.5 rounded-xl hover:bg-black/10">
                  👤 Ver cliente
                </button>
                <button onClick={() => { copiarEnlaceCheckin(detalleCI.cliente_id); setDetalleCI(null) }}
                  className="flex-1 border border-black/10 text-[#6B6B6B] text-sm font-medium py-2.5 rounded-xl hover:bg-[#F5F5F0]">
                  🔗 Enviar nuevo CI
                </button>
                <button onClick={() => setDetalleCI(null)}
                  className="flex-1 bg-[#111] text-white text-sm font-semibold py-2.5 rounded-xl">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
            <h2 className="font-semibold text-[#0A0A0A] mb-4">Registrar seguimiento</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#6B6B6B] mb-1 block">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5C00]">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B6B6B] mb-1 block">Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#6B6B6B] mb-1 block">Peso (kg)</label>
                  <input type="number" step="0.1" value={form.peso} onChange={e => setForm(f => ({ ...f, peso: e.target.value }))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5C00]" placeholder="70.5" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B6B6B] mb-1 block">Pasos diarios</label>
                  <input type="number" value={form.pasos_diarios} onChange={e => setForm(f => ({ ...f, pasos_diarios: e.target.value }))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5C00]" placeholder="8000" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#6B6B6B] mb-2 block">Sesiones esta semana: <span className="text-[#FF5C00] font-bold">{form.sesiones_semana}</span></label>
                <div className="flex gap-1.5 flex-wrap">
                  {[0,1,2,3,4,5,6,7].map(v => <Btn key={v} field="sesiones_semana" val={v} />)}
                </div>
              </div>

              {ESCALAS.map(({ label, field, min, max, suffix }) => (
                <div key={field}>
                  <label className="text-xs font-medium text-[#6B6B6B] mb-2 block">{label}: <span className="text-[#FF5C00] font-bold">{form[field]}{suffix}</span></label>
                  <div className="flex gap-1.5 flex-wrap">
                    {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(v => <Btn key={v} field={field} val={v} />)}
                  </div>
                </div>
              ))}

              <div>
                <label className="text-xs font-medium text-[#6B6B6B] mb-1 block">Comentario</label>
                <textarea value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))}
                  rows={2} className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                  placeholder="Observaciones de la sesión..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setModal(false); setForm(initForm) }} className="flex-1 border border-black/10 text-[#6B6B6B] text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={guardar} disabled={!form.cliente_id || loading}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      {quickView && <ClienteQuickView clienteId={quickView} onClose={() => setQuickView(null)} />}
  )
}
