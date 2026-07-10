import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const DIAS_FULL = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

function getLunes(fecha) {
  const d = new Date(fecha)
  const dia = d.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  d.setHours(0,0,0,0)
  return d
}

function formatFecha(fecha) {
  return fecha.toISOString().split('T')[0]
}

export default function Agenda({ session }) {
  const [semanaBase, setSemanaBase] = useState(() => getLunes(new Date()))
  const [sesiones, setSesiones] = useState([])
  const [clientes, setClientes] = useState([])
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ cliente_id:'', hora:'09:00', tipo:'presencial', notas:'' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const uid = session.user.id

  const diasSemana = Array.from({length:7}, (_,i) => {
    const d = new Date(semanaBase)
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => { cargar() }, [semanaBase, uid])

  async function cargar() {
    const inicio = formatFecha(semanaBase)
    const fin = formatFecha(new Date(semanaBase.getTime() + 6*86400000))
    const [{ data: se }, { data: cl }] = await Promise.all([
      supabase.from('sesiones').select('*, clientes(nombre, tipo)').eq('entrenador_id', uid)
        .gte('fecha', inicio).lte('fecha', fin).order('fecha'),
      supabase.from('clientes').select('id,nombre,tipo').eq('entrenador_id', uid).eq('estado','activo')
    ])
    setSesiones(se || [])
    setClientes(cl || [])
  }

  async function guardar() {
    setLoading(true)
    const fecha = formatFecha(diasSemana[diaSeleccionado])
    await supabase.from('sesiones').insert({
      entrenador_id: uid, cliente_id: form.cliente_id,
      fecha, hora: form.hora, tipo: form.tipo, completada: false, notas: form.notas
    })
    setModal(false)
    setForm({ cliente_id:'', hora:'09:00', tipo:'presencial', notas:'' })
    await cargar()
    setLoading(false)
  }

  async function marcarCompletada(id, completada) {
    await supabase.from('sesiones').update({ completada: !completada }).eq('id', id)
    await cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta sesión?')) return
    await supabase.from('sesiones').delete().eq('id', id)
    await cargar()
  }

  const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const esHoy = d => formatFecha(d) === formatFecha(new Date())
  const sesionesDia = d => sesiones
    .filter(s => s.fecha === formatFecha(d))
    .sort((a,b) => (a.hora||'00:00').localeCompare(b.hora||'00:00'))
  const totalSemana = sesiones.length
  const completadas = sesiones.filter(s => s.completada).length

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Agenda</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">{completadas}/{totalSemana} sesiones completadas esta semana</p>
        </div>
        <button onClick={() => setModal(true)}
          className="bg-[#FF5C00] hover:bg-[#E05200] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95">
          + Sesión
        </button>
      </div>

      {/* Navegación semana */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setSemanaBase(d => { const n = new Date(d); n.setDate(n.getDate()-7); return n })}
          className="w-9 h-9 bg-white border border-black/10 rounded-xl flex items-center justify-center text-[#6B6B6B] hover:border-[#FF5C00] transition-all">
          ‹
        </button>
        <p className="text-sm font-semibold text-[#0A0A0A]">
          {diasSemana[0].toLocaleDateString('es-ES',{day:'numeric',month:'short'})} — {diasSemana[6].toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}
        </p>
        <button onClick={() => setSemanaBase(d => { const n = new Date(d); n.setDate(n.getDate()+7); return n })}
          className="w-9 h-9 bg-white border border-black/10 rounded-xl flex items-center justify-center text-[#6B6B6B] hover:border-[#FF5C00] transition-all">
          ›
        </button>
      </div>

      {/* Días de la semana - selector */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {diasSemana.map((d, i) => {
          const count = sesionesDia(d).length
          const hoy = esHoy(d)
          const sel = diaSeleccionado === i
          return (
            <button key={i} onClick={() => setDiaSeleccionado(i)}
              className={`flex flex-col items-center py-2.5 px-1 rounded-xl transition-all ${
                sel ? 'bg-[#FF5C00] text-white' :
                hoy ? 'bg-[#FF5C00]/10 text-[#FF5C00]' :
                'bg-white border border-black/5 text-[#6B6B6B]'
              }`}>
              <span className="text-xs font-medium">{DIAS[i]}</span>
              <span className={`text-base font-bold mt-0.5 ${sel ? 'text-white' : ''}`}>{d.getDate()}</span>
              {count > 0 && (
                <div className={`w-1.5 h-1.5 rounded-full mt-1 ${sel ? 'bg-white' : 'bg-[#FF5C00]'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Sesiones del día seleccionado */}
      <div className="mb-2">
        <p className="text-sm font-bold text-[#0A0A0A] mb-3">
          {DIAS_FULL[diaSeleccionado]} {diasSemana[diaSeleccionado].getDate()}
          {esHoy(diasSemana[diaSeleccionado]) && <span className="ml-2 text-xs bg-[#FF5C00] text-white px-2 py-0.5 rounded-full">Hoy</span>}
        </p>

        {sesionesDia(diasSemana[diaSeleccionado]).length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-8 text-center">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-sm text-[#6B6B6B]">Sin sesiones este día</p>
            <button onClick={() => setModal(true)} className="mt-3 text-sm text-[#FF5C00] font-medium">+ Añadir sesión</button>
          </div>
        ) : (
          <div className="space-y-2">
            {sesionesDia(diasSemana[diaSeleccionado]).map(s => (
              <div key={s.id} className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${s.completada ? 'border-emerald-100 opacity-75' : 'border-black/5'}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => marcarCompletada(s.id, s.completada)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      s.completada ? 'bg-emerald-500 text-white' : 'border-2 border-black/15 text-transparent hover:border-emerald-400'
                    }`}>
                    ✓
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${s.completada ? 'line-through text-[#6B6B6B]' : 'text-[#0A0A0A]'}`}>
                      {s.clientes?.nombre}
                    </p>
                    <p className="text-xs text-[#6B6B6B]">{s.hora || '—'} · {s.tipo}{s.notas ? ` · ${s.notas}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      s.completada ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {s.completada ? '✓ Hecha' : 'Pendiente'}
                    </span>
                    <button onClick={() => eliminar(s.id)}
                      className="w-7 h-7 flex items-center justify-center text-[#6B6B6B] hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vista resumen semana completa */}
      <div className="mt-5 bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5 bg-[#F5F5F0]">
          <p className="text-xs font-bold text-[#0A0A0A]">Resumen de la semana</p>
        </div>
        <div className="divide-y divide-black/5">
          {diasSemana.map((d, i) => {
            const ss = sesionesDia(d)
            if (ss.length === 0) return null
            return (
              <div key={i} onClick={() => setDiaSeleccionado(i)}
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#F5F5F0] transition-all">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${esHoy(d) ? 'bg-[#FF5C00] text-white' : 'bg-[#F5F5F0] text-[#6B6B6B]'}`}>
                  {d.getDate()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#0A0A0A]">{DIAS_FULL[i]}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {ss.map(s => (
                      <span key={s.id} className={`text-xs px-2 py-0.5 rounded-full ${s.completada ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                        {s.clientes?.nombre?.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-[#6B6B6B] flex-shrink-0">{ss.length} sesión{ss.length > 1 ? 'es' : ''}</span>
              </div>
            )
          })}
          {sesiones.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-[#6B6B6B]">Sin sesiones esta semana</div>
          )}
        </div>
      </div>

      {/* Modal nueva sesión */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-1">Nueva sesión</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">
              {DIAS_FULL[diaSeleccionado]} {diasSemana[diaSeleccionado].toLocaleDateString('es-ES',{day:'numeric',month:'long'})}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm(f=>({...f,cliente_id:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white">
                  <option value="">Selecciona cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.tipo==='online'?'🌐':'📍'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['presencial','📍 Presencial'],['online','🌐 Online'],['pareja_grupo','👥 Grupo']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setForm(f=>({...f,tipo:v}))}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${form.tipo===v ? 'bg-[#FF5C00] text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Notas (opcional)</label>
                <input value={form.notas} onChange={e => setForm(f=>({...f,notas:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
                  placeholder="Ej: Día de pierna, traer rodilleras..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Hora</label>
                <input type="time" value={form.hora} onChange={e => setForm(f=>({...f,hora:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm font-medium py-2.5 rounded-xl">Cancelar</button>
              <button onClick={guardar} disabled={!form.cliente_id || loading}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-40 transition-all">
                {loading ? 'Guardando...' : 'Añadir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
