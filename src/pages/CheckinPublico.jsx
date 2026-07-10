import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CheckinPublico() {
  const { clienteId } = useParams()
  const [cliente, setCliente] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ peso:'', energia:5, sueno:7, estres:2, sesiones_semana:3, adherencia_entreno:7, adherencia_nutricion:7, pasos_diarios:'', comentario:'' })

  useEffect(() => {
    supabase.from('clientes').select('id,nombre,entrenador_id').eq('id', clienteId).single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setCliente(data)
        setLoading(false)
      })
  }, [clienteId])

  async function enviar() {
    setSending(true)
    await supabase.from('checkins').insert({
      cliente_id: clienteId,
      entrenador_id: cliente.entrenador_id,
      peso: form.peso ? Number(form.peso) : null,
      energia: form.energia, sueno: form.sueno, estres: form.estres,
      sesiones_semana: form.sesiones_semana, adherencia_entreno: form.adherencia_entreno,
      adherencia_nutricion: form.adherencia_nutricion,
      pasos_diarios: form.pasos_diarios ? Number(form.pasos_diarios) : null,
      comentario: form.comentario
    })
    setEnviado(true)
    setSending(false)
  }

  const ScaleBtn = ({ field, val, color='orange' }) => {
    const active = form[field] === val
    return (
      <button type="button" onClick={() => setForm({...form,[field]:val})}
        className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${active ? (color==='red'?'bg-red-500 text-white':'bg-orange-500 text-white') : 'border border-gray-200 text-gray-500 hover:border-orange-300'}`}>
        {val}
      </button>
    )
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
  if (notFound) return <div className="min-h-screen flex items-center justify-center p-4"><div className="text-center"><p className="text-2xl mb-2">🔗</p><p className="text-gray-500">Enlace no válido</p></div></div>
  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F7F7]">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
        <h2 className="text-xl font-bold text-[#111] mb-2">¡Gracias, {cliente.nombre}!</h2>
        <p className="text-gray-500 text-sm">Tu entrenador ya tiene tu actualización semanal.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 rounded-xl mb-3">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect x="5" y="5" width="4" height="18" rx="1" fill="white"/>
              <rect x="5" y="5" width="13" height="4" rx="1" fill="white"/>
              <rect x="5" y="13" width="9" height="3.5" rx="1" fill="white"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#111]">Seguimiento semanal</h1>
          <p className="text-gray-500 text-sm mt-1">Hola {cliente.nombre}, ¿cómo ha ido tu semana?</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Peso actual (kg)</label>
              <input type="number" step="0.1" value={form.peso} onChange={e => setForm({...form,peso:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="70.5" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Pasos diarios</label>
              <input type="number" value={form.pasos_diarios} onChange={e => setForm({...form,pasos_diarios:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="8000" />
            </div>
          </div>

          {[
            { label:'Energía esta semana', field:'energia', min:1, max:10, suffix:'/10' },
            { label:'Calidad del sueño (horas)', field:'sueno', min:4, max:10, suffix:'h' },
            { label:'Nivel de estrés', field:'estres', min:1, max:5, suffix:'/5', red:true },
            { label:'Sesiones completadas', field:'sesiones_semana', min:0, max:7 },
            { label:'Adherencia al entrenamiento', field:'adherencia_entreno', min:1, max:10, suffix:'/10' },
            { label:'Adherencia a la nutrición', field:'adherencia_nutricion', min:1, max:10, suffix:'/10' },
          ].map(({ label, field, min, max, suffix='', red }) => (
            <div key={field}>
              <label className="text-xs font-medium text-gray-600 mb-2 block">{label}: <span className="text-orange-500 font-bold">{form[field]}{suffix}</span></label>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({length:max-min+1},(_,i)=>i+min).map(v => <ScaleBtn key={v} field={field} val={v} color={red&&v>=4?'red':'orange'} />)}
              </div>
            </div>
          ))}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Comentario o dudas (opcional)</label>
            <textarea value={form.comentario} onChange={e => setForm({...form,comentario:e.target.value})} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none" placeholder="¿Algo que quieras contarme esta semana?" />
          </div>

          <button onClick={enviar} disabled={sending} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
            {sending ? 'Enviando...' : 'Enviar seguimiento'}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Forge Studio OS</p>
      </div>
    </div>
  )
}
