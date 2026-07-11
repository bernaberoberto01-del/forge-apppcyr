import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ESCALAS = [
  { label: 'Energía esta semana', field: 'energia', min: 1, max: 10, suffix: '/10', desc: ['1 = Agotado','10 = Al 100%'] },
  { label: 'Sueño (horas por noche)', field: 'sueno', min: 4, max: 10, suffix: 'h', desc: ['4h mínimo','10h máximo'] },
  { label: 'Nivel de estrés', field: 'estres', min: 1, max: 5, suffix: '/5', red: true, desc: ['1 = Tranquilo','5 = Desbordado'] },
  { label: 'Fatiga muscular', field: 'fatiga', min: 1, max: 5, suffix: '/5', red: true, desc: ['1 = Ninguna','5 = Muy alta'] },
  { label: 'Motivación', field: 'motivacion', min: 1, max: 7, suffix: '/7', desc: ['1 = Sin ganas','7 = Muy motivado'] },
  { label: 'Calidad del entrenamiento', field: 'calidad_entreno', min: 1, max: 7, suffix: '/7', desc: ['1 = Pésima','7 = Excelente'] },
  { label: 'Adherencia al entrenamiento', field: 'adherencia_entreno', min: 1, max: 10, suffix: '/10', desc: ['1 = Ninguna sesión','10 = Todas'] },
  { label: 'Adherencia a la nutrición', field: 'adherencia_nutricion', min: 1, max: 10, suffix: '/10', desc: ['1 = Ningún día','10 = Todos los días'] },
]

export default function CheckinPublico() {
  const { clienteId } = useParams()
  const [cliente, setCliente] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({
    peso: '', energia: 7, sueno: 7, estres: 2, fatiga: 2,
    motivacion: 5, calidad_entreno: 5, sesiones_semana: 3,
    adherencia_entreno: 7, adherencia_nutricion: 7,
    pasos_diarios: '', comentario: ''
  })

  useEffect(() => {
    supabase.from('clientes').select('id,nombre,entrenador_id').eq('id', clienteId).single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setCliente(data)
        setLoading(false)
      })
  }, [clienteId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function enviar() {
    setSending(true)
    await supabase.from('checkins').insert({
      cliente_id: clienteId,
      entrenador_id: cliente.entrenador_id,
      peso: form.peso ? Number(form.peso) : null,
      energia: form.energia, sueno: form.sueno, estres: form.estres,
      fatiga: form.fatiga, motivacion: form.motivacion,
      calidad_entreno: form.calidad_entreno,
      sesiones_semana: form.sesiones_semana,
      adherencia_entreno: form.adherencia_entreno,
      adherencia_nutricion: form.adherencia_nutricion,
      pasos_diarios: form.pasos_diarios ? Number(form.pasos_diarios) : null,
      comentario: form.comentario
    })
    setEnviado(true)
    setSending(false)
  }

  const Btn = ({ field, val, red }) => {
    const active = form[field] === val
    return (
      <button type="button" onClick={() => set(field, val)}
        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${active
          ? (red && val >= 4 ? 'bg-red-500 text-white shadow-md' : active && val <= 3 && red ? 'bg-amber-400 text-white' : 'bg-[#FF5C00] text-white shadow-md')
          : 'border border-black/10 text-[#6B6B6B] hover:border-orange-300 hover:text-[#FF5C00]'}`}>
        {val}
      </button>
    )
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" /></div>
  if (notFound) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-3xl mb-2">🔗</p><p className="text-[#6B6B6B]">Enlace no válido</p></div></div>
  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F7F7]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
        <h2 className="text-xl font-bold text-[#111] mb-2">¡Enviado, {cliente.nombre.split(' ')[0]}!</h2>
        <p className="text-[#6B6B6B] text-sm">Tu entrenador ya tiene tu seguimiento semanal. ¡Sigue así! 💪</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="bg-[#111] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <div className="w-7 h-7 bg-[#FF5C00] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
              <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
              <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
              <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Seguimiento semanal</p>
            <p className="text-[#6B6B6B] text-xs">Hola {cliente.nombre.split(' ')[0]}, ¿cómo ha ido tu semana?</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-10 space-y-4">
        {/* Peso y pasos */}
        <div className="bg-white rounded-2xl border border-black/5 p-4">
          <p className="text-sm font-semibold text-[#111] mb-3">Datos objetivos</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#6B6B6B] mb-1 block">Peso actual (kg)</label>
              <input type="number" step="0.1" value={form.peso} onChange={e => set('peso', e.target.value)}
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" placeholder="70.5" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B6B6B] mb-1 block">Pasos diarios</label>
              <input type="number" value={form.pasos_diarios} onChange={e => set('pasos_diarios', e.target.value)}
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]" placeholder="8000" />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-[#6B6B6B] mb-2 block">Sesiones completadas esta semana: <span className="text-[#FF5C00] font-bold">{form.sesiones_semana}</span></label>
            <div className="flex gap-2">
              {[0,1,2,3,4,5,6,7].map(v => (
                <button key={v} type="button" onClick={() => set('sesiones_semana', v)}
                  className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${form.sesiones_semana === v ? 'bg-[#FF5C00] text-white' : 'border border-black/10 text-[#6B6B6B]'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Escalas */}
        {ESCALAS.map(({ label, field, min, max, suffix, red, desc }) => (
          <div key={field} className="bg-white rounded-2xl border border-black/5 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-[#111]">{label}</p>
              <span className={`text-lg font-bold ${red && form[field] >= 4 ? 'text-red-500' : 'text-[#FF5C00]'}`}>{form[field]}{suffix}</span>
            </div>
            {desc && <div className="flex justify-between mb-3"><span className="text-xs text-[#6B6B6B]">{desc[0]}</span><span className="text-xs text-[#6B6B6B]">{desc[1]}</span></div>}
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(v => <Btn key={v} field={field} val={v} red={red} />)}
            </div>
          </div>
        ))}

        {/* Comentario */}
        <div className="bg-white rounded-2xl border border-black/5 p-4">
          <label className="text-sm font-semibold text-[#111] mb-2 block">Comentario o dudas</label>
          <textarea value={form.comentario} onChange={e => set('comentario', e.target.value)} rows={3}
            className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
            placeholder="¿Algo que quieras contarme esta semana?" />
        </div>

        <button onClick={enviar} disabled={sending}
          className="w-full bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-50 text-base">
          {sending ? 'Enviando...' : 'Enviar seguimiento 💪'}
        </button>

        <p className="text-center text-xs text-[#6B6B6B]">Forge Studio OS · Tus datos están protegidos</p>
      </div>
    </div>
  )
}
