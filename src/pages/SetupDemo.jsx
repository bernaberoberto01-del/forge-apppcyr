import { useState, useEffect } from 'react'

const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjkzODY0MywiZXhwIjoyMDkyNTE0NjQzfQ.yBMWMupWMBNNGfIdtOVJSlfnJN1gKKJPGbJZ7C1m-UI'

export default function SetupDemo() {
  const [estado, setEstado] = useState('esperando')
  const [resultado, setResultado] = useState(null)

  useEffect(() => { ejecutar() }, [])

  async function ejecutar() {
    setEstado('ejecutando')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/crear-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
        body: '{}'
      })
      const data = await res.json()
      setResultado(data)
      setEstado(data.ok ? 'ok' : 'error')
    } catch (e) {
      setResultado({ error: e.message })
      setEstado('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
        {estado === 'ejecutando' && (
          <>
            <div className="w-10 h-10 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-semibold text-[#0A0A0A]">Creando cuenta demo...</p>
          </>
        )}
        {estado === 'ok' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
            <h2 className="font-bold text-[#0A0A0A] mb-3">Cuenta demo creada</h2>
            <div className="bg-[#F5F5F0] rounded-xl p-4 text-left mb-4">
              <p className="text-sm font-bold text-[#0A0A0A]">demo@forge-studio.es</p>
              <p className="text-sm text-[#6B6B6B]">Demo2024!</p>
            </div>
            <a href="/login" className="block w-full bg-[#FF5C00] text-white font-bold py-3 rounded-xl">Ir al login →</a>
          </>
        )}
        {estado === 'error' && (
          <>
            <p className="text-4xl mb-3">⚠️</p>
            <h2 className="font-bold text-[#0A0A0A] mb-2">Error</h2>
            <p className="text-sm text-red-600 mb-4">{resultado?.error}</p>
            <button onClick={ejecutar} className="bg-[#FF5C00] text-white px-6 py-2 rounded-xl font-semibold">Reintentar</button>
          </>
        )}
      </div>
    </div>
  )
}
