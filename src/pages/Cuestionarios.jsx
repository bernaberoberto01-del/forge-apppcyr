import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const OBJ = { perdida_grasa:'Pérdida de grasa', ganancia_muscular:'Ganancia muscular', tonificacion:'Tonificación', fuerza:'Fuerza', rendimiento:'Rendimiento', cambio_rapido_30dias:'Cambio 30 días' }
const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'

export default function Cuestionarios({ session }) {
  const [cuestionarios, setCuestionarios] = useState([])
  const [detalle, setDetalle] = useState(null)
  const [generando, setGenerando] = useState(null)
  const [enlace, setEnlace] = useState('')
  const uid = session.user.id

  useEffect(() => {
    cargar()
    setEnlace(`${window.location.origin}/registro?e=${uid}`)
  }, [uid])

  async function cargar() {
    const { data } = await supabase.from('cuestionarios').select('*').eq('entrenador_id', uid).order('created_at', { ascending: false })
    setCuestionarios(data || [])
  }

  async function convertirCliente(c) {
    // Crear cliente desde cuestionario
    const { data: cliente } = await supabase.from('clientes').insert({
      entrenador_id: uid,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      objetivo: c.objetivo,
      tipo: 'online',
      estado: 'activo',
      peso_actual: c.peso_actual,
      nivel: c.nivel,
      dias_semana: c.dias_semana,
      material: c.material,
      lesiones: c.lesiones,
      notas: `Edad: ${c.edad || '—'} | Altura: ${c.altura || '—'}cm | Plazo: ${c.plazo} | Motivación: ${c.motivacion || '—'}`,
      precio_mensual: 0
    }).select().single()

    if (cliente) {
      await supabase.from('cuestionarios').update({ cliente_id: cliente.id, procesado: true }).eq('id', c.id)
      await cargar()
      return cliente
    }
  }

  async function generarRutinaDesdeCI(c) {
    setGenerando(c.id)
    let clienteId = c.cliente_id

    if (!clienteId) {
      const cliente = await convertirCliente(c)
      if (!cliente) { setGenerando(null); return }
      clienteId = cliente.id
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/generar-rutina`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ cliente_id: clienteId })
    })
    const data = await res.json()
    setGenerando(null)
    if (data.ok) { alert('✅ Rutina generada. Ve a Rutinas para revisarla y publicarla.') }
    else alert('Error: ' + (data.error || 'desconocido'))
  }

  const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#111]">Registros</h1>
      </div>

      {/* Enlace de registro */}
      <div className="bg-[#111] rounded-xl p-4 mb-4">
        <p className="text-xs text-gray-400 mb-1">Tu enlace de registro para nuevos clientes</p>
        <p className="text-orange-400 text-xs font-mono break-all mb-3">{enlace}</p>
        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard.writeText(enlace)}
            className="flex-1 bg-orange-500 text-white text-xs font-medium py-2 rounded-lg">
            📋 Copiar enlace
          </button>
          <button onClick={() => window.open(enlace, '_blank')}
            className="flex-1 border border-white/20 text-white text-xs font-medium py-2 rounded-lg">
            👁 Vista previa
          </button>
        </div>
      </div>

      {/* Lista de cuestionarios */}
      <div className="space-y-2">
        {cuestionarios.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-medium text-[#111]">Sin registros todavía</p>
            <p className="text-sm text-gray-400 mt-1">Comparte el enlace con tus clientes para que rellenen el cuestionario</p>
          </div>
        ) : cuestionarios.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-3.5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{ini(c.nombre)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[#111] truncate">{c.nombre}</p>
                <p className="text-xs text-gray-400">{c.email} · {OBJ[c.objetivo] || c.objetivo}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.procesado ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {c.procesado ? 'Procesado' : 'Nuevo'}
                </span>
                <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('es-ES')}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDetalle(c)} className="flex-1 border border-gray-200 text-gray-600 text-xs py-2 rounded-lg hover:bg-gray-50">
                Ver respuestas
              </button>
              <button onClick={() => generarRutinaDesdeCI(c)} disabled={generando === c.id}
                className="flex-1 bg-orange-500 text-white text-xs font-medium py-2 rounded-lg disabled:opacity-50">
                {generando === c.id ? '⏳ Generando...' : '✨ Generar rutina'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-[#111]">{detalle.nombre}</h2>
              <button onClick={() => setDetalle(null)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              {[
                { titulo: '👤 Datos personales', items: [['Email',detalle.email],['Teléfono',detalle.telefono||'—'],['Edad',detalle.edad?`${detalle.edad} años`:'—'],['Sexo',detalle.sexo||'—'],['Peso',detalle.peso_actual?`${detalle.peso_actual}kg`:'—'],['Altura',detalle.altura?`${detalle.altura}cm`:'—']] },
                { titulo: '🎯 Objetivo', items: [['Objetivo',OBJ[detalle.objetivo]||detalle.objetivo||'—'],['Detalle',detalle.objetivo_detalle||'—'],['Plazo',detalle.plazo?.replace(/_/g,' ')||'—']] },
                { titulo: '📊 Experiencia', items: [['Nivel',detalle.nivel||'—'],['Años entrenando',detalle.anos_entrenando||'0']] },
                { titulo: '💪 Marcas', items: [['Press banca',detalle.marca_press_banca||'—'],['Sentadilla',detalle.marca_sentadilla||'—'],['Peso muerto',detalle.marca_peso_muerto||'—'],['Dominadas',detalle.marca_dominadas||'—'],['Flexiones',detalle.marca_flexiones||'—'],['Press militar',detalle.marca_press_militar||'—']] },
                { titulo: '🏋️ Material y horario', items: [['Material',detalle.material||'—'],['Días/semana',detalle.dias_semana||'—'],['Duración sesión',detalle.duracion_sesion?`${detalle.duracion_sesion}min`:'—'],['Horario',detalle.horario_preferido||'—']] },
                { titulo: '🏥 Salud', items: [['Lesiones',detalle.lesiones||'Ninguna'],['Enfermedades',detalle.enfermedades||'Ninguna'],['Medicación',detalle.medicacion||'Ninguna']] },
                { titulo: '💬 Expectativas', items: [['Motivación',detalle.motivacion||'—'],['Experiencias anteriores',detalle.experiencias_anteriores||'—'],['Compromisos',detalle.compromisos||'—'],['Cómo nos conoció',detalle.como_nos_conocio||'—']] },
              ].map(({ titulo, items }) => (
                <div key={titulo} className="bg-[#F7F7F7] rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">{titulo}</p>
                  <div className="space-y-1.5">
                    {items.map(([l,v]) => (
                      <div key={l} className="flex gap-2">
                        <span className="text-xs text-gray-400 w-28 flex-shrink-0">{l}</span>
                        <span className="text-xs text-[#111] flex-1">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => { generarRutinaDesdeCI(detalle); setDetalle(null) }}
                className="w-full bg-orange-500 text-white text-sm font-medium py-3 rounded-xl">
                ✨ Generar rutina con IA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
