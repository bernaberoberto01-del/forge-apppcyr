import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const CAMPOS_CSV = [
  { key: 'nombre', label: 'Nombre', requerido: true },
  { key: 'email', label: 'Email', requerido: false },
  { key: 'telefono', label: 'Teléfono', requerido: false },
  { key: 'objetivo', label: 'Objetivo', requerido: false, opciones: ['perdida_grasa','ganancia_muscular','tonificacion','fuerza','rendimiento','salud_general'] },
  { key: 'peso_actual', label: 'Peso actual (kg)', requerido: false },
  { key: 'peso_objetivo', label: 'Peso objetivo (kg)', requerido: false },
  { key: 'nivel', label: 'Nivel', requerido: false, opciones: ['principiante','intermedio','avanzado'] },
  { key: 'tipo', label: 'Tipo', requerido: false, opciones: ['presencial','online'] },
  { key: 'precio_mensual', label: 'Precio mensual (€)', requerido: false },
  { key: 'notas', label: 'Notas', requerido: false },
]

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g,'').toLowerCase())
  const rows = lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g,''))
    return headers.reduce((obj, h, i) => { obj[h] = vals[i] || ''; return obj }, {})
  })
  return { headers, rows }
}

function normalizar(row, mapeo) {
  const result = {}
  Object.entries(mapeo).forEach(([campo, colCSV]) => {
    if (colCSV && row[colCSV] !== undefined) {
      result[campo] = row[colCSV]
    }
  })
  // Normalizar objetivo
  if (result.objetivo) {
    const obj = result.objetivo.toLowerCase().replace(/ /g,'_')
    const validos = ['perdida_grasa','ganancia_muscular','tonificacion','fuerza','rendimiento','salud_general']
    result.objetivo = validos.includes(obj) ? obj : 'perdida_grasa'
  }
  // Normalizar nivel
  if (result.nivel) {
    const niv = result.nivel.toLowerCase()
    result.nivel = ['principiante','intermedio','avanzado'].includes(niv) ? niv : 'principiante'
  }
  // Normalizar tipo
  if (result.tipo) {
    result.tipo = result.tipo.toLowerCase() === 'online' ? 'online' : 'presencial'
  }
  return result
}

export default function ImportarDatos({ session }) {
  const [paso, setPaso] = useState(1) // 1=subir 2=mapear 3=previsualizar 4=resultado
  const [csvData, setCsvData] = useState(null)
  const [mapeo, setMapeo] = useState({})
  const [preview, setPreview] = useState([])
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()
  const uid = session.user.id

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target.result
      const parsed = parseCSV(text)
      if (parsed.rows.length === 0) { setError('El archivo está vacío o no tiene el formato correcto'); return }
      setCsvData(parsed)
      // Mapeo automático por nombre de columna
      const autoMapeo = {}
      CAMPOS_CSV.forEach(campo => {
        const match = parsed.headers.find(h =>
          h === campo.key || h === campo.label.toLowerCase() ||
          h.includes(campo.key) || campo.key.includes(h)
        )
        if (match) autoMapeo[campo.key] = match
      })
      setMapeo(autoMapeo)
      setError('')
      setPaso(2)
    }
    reader.readAsText(file, 'UTF-8')
  }

  function generarPreview() {
    if (!csvData) return
    const rows = csvData.rows.slice(0, 5).map(row => normalizar(row, mapeo))
    setPreview(rows)
    setPaso(3)
  }

  async function importar() {
    if (!csvData) return
    setImportando(true)
    const clientes = csvData.rows.map(row => ({
      ...normalizar(row, mapeo),
      entrenador_id: uid,
      estado: 'activo',
      material: 'gimnasio',
      dias_semana: 3,
    })).filter(c => c.nombre?.trim())

    let importados = 0
    let errores = 0
    const BATCH = 50
    for (let i = 0; i < clientes.length; i += BATCH) {
      const lote = clientes.slice(i, i + BATCH)
      const { error } = await supabase.from('clientes').insert(lote)
      if (error) errores += lote.length
      else importados += lote.length
    }
    setResultado({ importados, errores, total: clientes.length })
    setPaso(4)
    setImportando(false)
  }

  function resetear() {
    setPaso(1); setCsvData(null); setMapeo({}); setPreview([]); setResultado(null); setError('')
  }

  function descargarPlantilla() {
    const csv = 'nombre,email,telefono,objetivo,peso_actual,peso_objetivo,nivel,tipo,precio_mensual,notas\nLaura Sánchez,laura@email.com,612345678,perdida_grasa,72,63,principiante,presencial,160,Objetivo boda octubre\nMarcos Ruiz,marcos@email.com,687654321,ganancia_muscular,78,85,intermedio,presencial,200,'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_clientes.csv'; a.click()
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Importar datos</h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5">Trae tus clientes desde cualquier app o Excel</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {[['1','Subir CSV'],['2','Mapear campos'],['3','Previsualizar'],['4','Resultado']].map(([n,l],i) => (
          <div key={n} className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${paso > i+1 ? 'bg-emerald-500 text-white' : paso === i+1 ? 'bg-[#FF5C00] text-white' : 'bg-black/10 text-[#6B6B6B]'}`}>
              {paso > i+1 ? '✓' : n}
            </div>
            <span className={`text-xs font-medium ${paso === i+1 ? 'text-[#0A0A0A]' : 'text-[#6B6B6B]'}`}>{l}</span>
            {i < 3 && <div className="w-6 h-px bg-black/10" />}
          </div>
        ))}
      </div>

      {/* PASO 1: Subir */}
      {paso === 1 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">¿De dónde importar?</p>
            <p className="text-sm text-blue-700 leading-relaxed">
              Funciona con cualquier app que exporte CSV: Trainerize, MyPTHub, Excel, Google Sheets, o cualquier hoja de cálculo. Solo necesitas que tenga una columna con el nombre del cliente.
            </p>
          </div>

          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />

          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-black/15 rounded-2xl p-10 text-center cursor-pointer hover:border-[#FF5C00] hover:bg-[#FF5C00]/3 transition-all">
            <p className="text-4xl mb-3">📂</p>
            <p className="font-semibold text-[#0A0A0A] mb-1">Arrastra tu CSV aquí o pulsa para seleccionar</p>
            <p className="text-sm text-[#6B6B6B]">Archivos .csv o .txt</p>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

          <div className="flex items-center gap-3 p-4 bg-[#F5F5F0] rounded-xl">
            <span className="text-2xl">📋</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#0A0A0A]">¿No tienes CSV?</p>
              <p className="text-xs text-[#6B6B6B]">Descarga nuestra plantilla y rellénala</p>
            </div>
            <button onClick={descargarPlantilla}
              className="border border-black/10 text-sm font-medium px-4 py-2 rounded-xl hover:bg-white transition-all flex-shrink-0">
              Descargar plantilla
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: Mapear */}
      {paso === 2 && csvData && (
        <div className="space-y-4">
          <div className="bg-[#F5F5F0] rounded-xl p-4">
            <p className="text-sm font-semibold text-[#0A0A0A]">Archivo cargado: {csvData.rows.length} filas · {csvData.headers.length} columnas</p>
            <p className="text-xs text-[#6B6B6B] mt-1">Columnas detectadas: {csvData.headers.join(', ')}</p>
          </div>

          <p className="text-sm font-semibold text-[#0A0A0A]">Relaciona las columnas de tu archivo con los campos de Forge:</p>

          <div className="space-y-2">
            {CAMPOS_CSV.map(campo => (
              <div key={campo.key} className="flex items-center gap-3 bg-white border border-black/5 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A]">
                    {campo.label}
                    {campo.requerido && <span className="text-[#FF5C00] ml-1">*</span>}
                  </p>
                </div>
                <select value={mapeo[campo.key] || ''}
                  onChange={e => setMapeo(m => ({ ...m, [campo.key]: e.target.value }))}
                  className="border border-black/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#FF5C00] bg-white flex-shrink-0">
                  <option value="">— No importar —</option>
                  {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={resetear} className="flex-1 border border-black/10 text-[#6B6B6B] text-sm py-3 rounded-xl">← Volver</button>
            <button onClick={generarPreview} disabled={!mapeo.nombre}
              className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40">
              Previsualizar →
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Previsualizar */}
      {paso === 3 && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-emerald-800">
              ✓ Listos para importar: <strong>{csvData.rows.length} clientes</strong>
            </p>
            <p className="text-xs text-emerald-700 mt-1">Mostrando los primeros 5 como ejemplo:</p>
          </div>

          <div className="space-y-2">
            {preview.map((c, i) => (
              <div key={i} className="bg-white border border-black/5 rounded-xl p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center text-[#FF5C00] font-bold text-xs flex-shrink-0">
                    {(c.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A0A0A] truncate">{c.nombre || '—'}</p>
                    <p className="text-xs text-[#6B6B6B]">
                      {c.email || 'Sin email'} · {c.objetivo?.replace(/_/g,' ') || 'Sin objetivo'} · {c.nivel || 'principiante'}
                    </p>
                  </div>
                  {c.precio_mensual && <span className="text-sm font-bold text-emerald-600 flex-shrink-0">{c.precio_mensual}€</span>}
                </div>
              </div>
            ))}
            {csvData.rows.length > 5 && (
              <p className="text-xs text-[#6B6B6B] text-center py-2">... y {csvData.rows.length - 5} más</p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-xs text-amber-700">⚠ La importación crea los clientes como <strong>activos</strong>. Podrás editar sus datos desde la pantalla de Clientes.</p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setPaso(2)} className="flex-1 border border-black/10 text-[#6B6B6B] text-sm py-3 rounded-xl">← Revisar mapeo</button>
            <button onClick={importar} disabled={importando}
              className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40">
              {importando ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importando...
                </span>
              ) : `Importar ${csvData.rows.length} clientes →`}
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: Resultado */}
      {paso === 4 && resultado && (
        <div className="text-center py-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl ${resultado.errores === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {resultado.errores === 0 ? '✅' : '⚠️'}
          </div>
          <h2 className="text-xl font-bold text-[#0A0A0A] mb-2">
            {resultado.errores === 0 ? '¡Importación completada!' : 'Importación con advertencias'}
          </h2>
          <div className="grid grid-cols-3 gap-3 my-6 max-w-xs mx-auto">
            {[
              [resultado.importados, 'Importados', '#10b981'],
              [resultado.errores, 'Errores', resultado.errores > 0 ? '#f59e0b' : '#10b981'],
              [resultado.total, 'Total', '#6B6B6B'],
            ].map(([v,l,c]) => (
              <div key={l} className="bg-white border border-black/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold" style={{color:c}}>{v}</p>
                <p className="text-xs text-[#6B6B6B]">{l}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={resetear} className="border border-black/10 text-sm font-medium px-5 py-2.5 rounded-xl">
              Importar más
            </button>
            <a href="/clientes" className="bg-[#FF5C00] text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
              Ver clientes →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
