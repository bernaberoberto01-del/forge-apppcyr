import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const EJERCICIOS = [
  { key: 'press_banca', label: 'Press de banca', icon: '🏋️', tieneReps: true },
  { key: 'sentadilla', label: 'Sentadilla', icon: '🦵', tieneReps: true },
  { key: 'peso_muerto', label: 'Peso muerto', icon: '💪', tieneReps: true },
  { key: 'dominadas', label: 'Dominadas', icon: '🔝', tieneReps: true, soloReps: true },
  { key: 'press_militar', label: 'Press militar', icon: '⬆️', tieneReps: true },
  { key: 'flexiones', label: 'Flexiones', icon: '👐', soloReps: true },
]

export default function ProgresionFuerza() {
  const { clienteId } = useParams()
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enviado, setEnviado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [historial, setHistorial] = useState([])
  const [form, setForm] = useState({
    press_banca_kg: '', press_banca_reps: '',
    sentadilla_kg: '', sentadilla_reps: '',
    peso_muerto_kg: '', peso_muerto_reps: '',
    dominadas_reps: '', dominadas_kg: '',
    press_militar_kg: '', press_militar_reps: '',
    flexiones_reps: '',
    progreso_percibido: 3,
    comentario: ''
  })

  useEffect(() => {
    async function cargar() {
      const { data: cl } = await supabase.from('clientes').select('*').eq('id', clienteId).single()
      if (!cl) { setLoading(false); return }
      setCliente(cl)
      const { data: hist } = await supabase.from('progresion_fuerza')
        .select('*').eq('cliente_id', clienteId)
        .order('fecha', { ascending: false }).limit(3)
      setHistorial(hist || [])
      setLoading(false)
    }
    cargar()
  }, [clienteId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function guardar() {
    setGuardando(true)
    const semana = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 864e5))
    await supabase.from('progresion_fuerza').insert({
      cliente_id: clienteId,
      entrenador_id: cliente.entrenador_id,
      fecha: new Date().toISOString().split('T')[0],
      semana_numero: semana,
      press_banca_kg: form.press_banca_kg ? Number(form.press_banca_kg) : null,
      press_banca_reps: form.press_banca_reps ? Number(form.press_banca_reps) : null,
      sentadilla_kg: form.sentadilla_kg ? Number(form.sentadilla_kg) : null,
      sentadilla_reps: form.sentadilla_reps ? Number(form.sentadilla_reps) : null,
      peso_muerto_kg: form.peso_muerto_kg ? Number(form.peso_muerto_kg) : null,
      peso_muerto_reps: form.peso_muerto_reps ? Number(form.peso_muerto_reps) : null,
      dominadas_reps: form.dominadas_reps ? Number(form.dominadas_reps) : null,
      dominadas_kg: form.dominadas_kg ? Number(form.dominadas_kg) : null,
      press_militar_kg: form.press_militar_kg ? Number(form.press_militar_kg) : null,
      press_militar_reps: form.press_militar_reps ? Number(form.press_militar_reps) : null,
      flexiones_reps: form.flexiones_reps ? Number(form.flexiones_reps) : null,
      progreso_percibido: form.progreso_percibido,
      comentario: form.comentario || null
    })
    setEnviado(true)
    setGuardando(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!cliente) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4">
      <div className="text-center"><p className="text-4xl mb-3">🔗</p><p className="text-[#6B6B6B]">Enlace no válido</p></div>
    </div>
  )

  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F0]">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl">💪</div>
        <h2 className="text-2xl font-bold text-[#0A0A0A] mb-2">¡Marcas registradas!</h2>
        <p className="text-[#6B6B6B] text-sm leading-relaxed">Tu entrenador ya tiene tu progreso del mes. Lo usará para preparar tu rutina del mes que viene.</p>
        <div className="mt-6 bg-white rounded-2xl border border-black/5 p-4">
          <p className="text-xs font-semibold text-[#6B6B6B] mb-1">Próxima revisión</p>
          <p className="text-sm text-[#0A0A0A] font-medium">En aproximadamente 4 semanas</p>
        </div>
      </div>
    </div>
  )

  const ultimoHistorial = historial[0]

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Header */}
      <div className="bg-[#111] px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF5C00] rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
              {cliente.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-white font-bold">Revisión mensual</h1>
              <p className="text-white/50 text-xs mt-0.5">Hola {cliente.nombre.split(' ')[0]} · ¿Cuánto mueves ahora?</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-10 space-y-4">
        {/* Intro */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
          <p className="text-sm text-[#0A0A0A] leading-relaxed">
            Apunta tus <strong>marcas aproximadas</strong> de este mes. No tienen que ser exactas — una estimación es suficiente. Si no haces algún ejercicio déjalo en blanco.
          </p>
          {ultimoHistorial && (
            <div className="mt-3 pt-3 border-t border-black/5">
              <p className="text-xs text-[#6B6B6B] font-medium">Última revisión: {new Date(ultimoHistorial.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
            </div>
          )}
        </div>

        {/* Ejercicios */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-[#0A0A0A]">
            <p className="text-white text-sm font-bold">Marcas de este mes</p>
          </div>
          <div className="divide-y divide-black/5">
            {EJERCICIOS.map(ej => {
              const anterior = ultimoHistorial ? ultimoHistorial[`${ej.key}_kg`] : null
              const anteriorReps = ultimoHistorial ? ultimoHistorial[`${ej.key}_reps`] : null
              return (
                <div key={ej.key} className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ej.icon}</span>
                      <p className="text-sm font-semibold text-[#0A0A0A]">{ej.label}</p>
                    </div>
                    {anterior && (
                      <p className="text-xs text-[#6B6B6B]">Anterior: {anterior}kg × {anteriorReps}</p>
                    )}
                    {!anterior && anteriorReps && (
                      <p className="text-xs text-[#6B6B6B]">Anterior: {anteriorReps} reps</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!ej.soloReps && (
                      <div className="flex-1">
                        <label className="text-xs text-[#6B6B6B] mb-1 block">Peso (kg)</label>
                        <input type="number" step="0.5" value={form[`${ej.key}_kg`]}
                          onChange={e => set(`${ej.key}_kg`, e.target.value)}
                          placeholder={anterior ? `Antes: ${anterior}` : 'ej: 80'}
                          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] text-center" />
                      </div>
                    )}
                    <div className={ej.soloReps ? 'flex-1' : 'w-28'}>
                      <label className="text-xs text-[#6B6B6B] mb-1 block">
                        {ej.key === 'dominadas' && form.dominadas_kg ? 'Reps lastradas' : 'Repeticiones'}
                      </label>
                      <input type="number" value={form[`${ej.key}_reps`]}
                        onChange={e => set(`${ej.key}_reps`, e.target.value)}
                        placeholder={anteriorReps ? `Antes: ${anteriorReps}` : 'ej: 8'}
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] text-center" />
                    </div>
                    {ej.key === 'dominadas' && (
                      <div className="w-28">
                        <label className="text-xs text-[#6B6B6B] mb-1 block">Lastre (kg)</label>
                        <input type="number" step="0.5" value={form.dominadas_kg}
                          onChange={e => set('dominadas_kg', e.target.value)}
                          placeholder="0"
                          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] text-center" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Progreso percibido */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
          <p className="text-sm font-bold text-[#0A0A0A] mb-1">¿Cómo ves tu progreso este mes?</p>
          <p className="text-xs text-[#6B6B6B] mb-3">1 = Sin progreso · 5 = Muy bueno</p>
          <div className="flex gap-2">
            {[
              [1, '😞', 'Sin progreso'],
              [2, '😐', 'Poco'],
              [3, '🙂', 'Normal'],
              [4, '😊', 'Bueno'],
              [5, '🚀', 'Excelente'],
            ].map(([v, emoji, label]) => (
              <button key={v} type="button" onClick={() => set('progreso_percibido', v)}
                className={`flex-1 py-3 rounded-xl border text-center transition-all ${form.progreso_percibido === v
                  ? 'border-[#FF5C00] bg-[#FF5C00]/5'
                  : 'border-black/8 hover:border-black/20'}`}>
                <p className="text-xl">{emoji}</p>
                <p className={`text-xs mt-1 font-medium ${form.progreso_percibido === v ? 'text-[#FF5C00]' : 'text-[#6B6B6B]'}`}>{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Comentario */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
          <label className="text-sm font-bold text-[#0A0A0A] mb-1.5 block">¿Algo que quieras comentar? (opcional)</label>
          <textarea value={form.comentario} onChange={e => set('comentario', e.target.value)}
            rows={3} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
            placeholder="Cómo te has sentido este mes, lesiones, dudas..." />
        </div>

        <button onClick={guardar} disabled={guardando}
          className="w-full bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold py-4 rounded-2xl text-base transition-all active:scale-98 disabled:opacity-50">
          {guardando ? 'Enviando...' : '💪 Enviar mis marcas'}
        </button>

        <p className="text-center text-xs text-[#6B6B6B]">Forge Studio OS · Solo tarda 2 minutos</p>
      </div>
    </div>
  )
}
