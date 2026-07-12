import { useState, useEffect } from 'react'

const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjkzODY0MywiZXhwIjoyMDkyNTE0NjQzfQ.yBMWMupWMBNNGfIdtOVJSlfnJN1gKKJPGbJZ7C1m-UI'

const call = (fn) => fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
  body: '{}'
}).then(r => r.json())

export default function SetupDemo() {
  const [pasos, setPasos] = useState([
    { label: 'Creando cuenta demo...', estado: 'pendiente' },
    { label: 'Generando 60 clientes con datos reales...', estado: 'pendiente' },
  ])
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { ejecutar() }, [])

  async function ejecutar() {
    // Paso 1: crear usuario
    setPasos(p => p.map((x,i) => i===0 ? {...x,estado:'activo'} : x))
    const r1 = await call('crear-demo')
    if (r1.error && !r1.email) {
      setPasos(p => p.map((x,i) => i===0 ? {...x,estado:'error'} : x))
      setError(r1.error); return
    }
    setPasos(p => p.map((x,i) => i===0 ? {...x,estado:'ok'} : i===1 ? {...x,estado:'activo'} : x))

    // Paso 2: poblar datos
    const r2 = await call('poblar-demo')
    if (r2.error) {
      setPasos(p => p.map((x,i) => i===1 ? {...x,estado:'error'} : x))
      setError(r2.error); return
    }
    setPasos(p => p.map(x => ({...x,estado:'ok'})))
    setResultado(r2)
  }

  const todoOk = pasos.every(p => p.estado === 'ok')

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full">
        <h2 className="font-bold text-[#0A0A0A] text-xl mb-6 text-center">Configurando demo</h2>
        <div className="space-y-3 mb-6">
          {pasos.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                p.estado==='ok' ? 'bg-emerald-500 text-white' :
                p.estado==='activo' ? 'bg-[#FF5C00]' :
                p.estado==='error' ? 'bg-red-500 text-white' :
                'bg-black/10'
              }`}>
                {p.estado==='ok' ? '✓' : p.estado==='activo' ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin block"/> : p.estado==='error' ? '✗' : ''}
              </div>
              <p className={`text-sm ${p.estado==='activo'?'font-semibold text-[#0A0A0A]':'text-[#6B6B6B]'}`}>{p.label}</p>
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl p-3 mb-4">{error}</p>}

        {todoOk && resultado && (
          <>
            <div className="bg-[#F5F5F0] rounded-xl p-4 mb-4 space-y-1">
              <p className="text-xs font-bold text-[#0A0A0A] mb-2">Cuenta demo lista</p>
              <p className="text-sm font-bold text-[#FF5C00]">demo@forge-studio.es</p>
              <p className="text-sm text-[#6B6B6B]">Demo2024!</p>
              <div className="border-t border-black/5 pt-2 mt-2 grid grid-cols-2 gap-1">
                {[
                  ['Clientes', resultado.clientes + 6],
                  ['Sesiones', resultado.sesiones],
                  ['Check-ins', resultado.checkins],
                  ['Pagos', resultado.pagos + 14],
                  ['Rutinas', resultado.rutinas + 2],
                  ['Planes nutrición', resultado.planes_nutricion + 1],
                ].map(([l,v]) => (
                  <p key={l} className="text-xs text-[#6B6B6B]"><span className="font-semibold text-[#0A0A0A]">{v}</span> {l}</p>
                ))}
              </div>
            </div>
            <a href="/login" className="block w-full bg-[#FF5C00] text-white font-bold py-3 rounded-xl text-center">Ir al login →</a>
          </>
        )}
      </div>
    </div>
  )
}
