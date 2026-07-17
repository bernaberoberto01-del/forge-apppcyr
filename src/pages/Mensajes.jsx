import { useState, useEffect, useRef } from 'react'
import ClienteQuickView from '../components/ClienteQuickView'
import { supabase } from '../lib/supabase'

const PLANTILLAS = [
  { id: 'bienvenida', icon: '👋', label: 'Bienvenida', texto: '¡Hola! Bienvenido/a al equipo. Ya tengo tus datos y estoy preparando tu plan personalizado. En breve tendrás tu rutina lista. Cualquier duda, escríbeme aquí o por WhatsApp. ¡Vamos a por ello! 💪' },
  { id: 'rutina_lista', icon: '💪', label: 'Rutina lista', texto: '¡Tu rutina ya está disponible en el portal! Revísala con calma y si tienes alguna duda sobre algún ejercicio no dudes en preguntarme. Esta semana la ponemos en práctica 🔥' },
  { id: 'buen_trabajo', icon: '🙌', label: 'Buen trabajo', texto: 'He revisado tus últimos check-ins y sesiones — vas muy bien. Se nota el esfuerzo y la constancia. Sigue así, los resultados llegan 💯' },
  { id: 'animo', icon: '⚡', label: 'Ánimo', texto: 'Sé que esta semana ha sido dura, pero es en los momentos difíciles cuando se forja el carácter. Un paso cada día es suficiente. Cuenta conmigo 💙' },
  { id: 'recordatorio', icon: '📋', label: 'Check-in', texto: 'Recuerda rellenar el check-in semanal cuando puedas — me ayuda mucho a ajustar tu plan. Solo son 2 minutos y marca la diferencia en tus resultados 🎯' },
  { id: 'progreso', icon: '📈', label: 'Progreso', texto: 'He revisado tu evolución del último mes y los números hablan solos. Estás avanzando exactamente como esperaba. El próximo mes ajustamos el programa para seguir progresando 🚀' },
  { id: 'pausa', icon: '⏸', label: 'Pausa', texto: 'No te preocupes por la pausa — el descanso también es parte del proceso. Cuando retomemos iremos poco a poco y en pocas semanas estarás al nivel donde lo dejaste. Aquí estaré.' },
  { id: 'renovacion', icon: '🔄', label: 'Renovación', texto: 'Tu mensualidad está próxima a vencer. Si quieres renovar, puedes hacerlo desde el portal o dime y te mando el enlace de pago. Un placer seguir trabajando contigo 💪' },
]

const AVATARES = ['#FF5C00','#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#8b5cf6']
const avatarColor = n => AVATARES[(n||'').charCodeAt(0) % AVATARES.length]
const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

export default function Mensajes({ session }) {
  const [clientes, setClientes] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [noLeidos, setNoLeidos] = useState({})
  const [showPlantillas, setShowPlantillas] = useState(false)
  const [quickView, setQuickView] = useState(null)
  const [toast, setToast] = useState('')
  const endRef = useRef()
  const uid = session.user.id

  useEffect(() => { cargarClientes() }, [uid])
  useEffect(() => { if (seleccionado) cargarMensajes(seleccionado.id) }, [seleccionado])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes])

  async function cargarClientes() {
    const [{ data: cl }, { data: ms }] = await Promise.all([
      supabase.from('clientes').select('id,nombre,tipo,estado').eq('entrenador_id', uid).eq('estado','activo').order('nombre'),
      supabase.from('mensajes_cliente').select('cliente_id,leido_entrenador,tipo,created_at')
        .eq('entrenador_id', uid).eq('leido_entrenador', false).neq('tipo','entrenador').neq('tipo','sistema')
    ])
    setClientes(cl || [])
    const nl = {}
    ;(ms || []).forEach(m => { nl[m.cliente_id] = (nl[m.cliente_id] || 0) + 1 })
    setNoLeidos(nl)
  }

  async function cargarMensajes(clienteId) {
    const { data } = await supabase.from('mensajes_cliente')
      .select('*').eq('cliente_id', clienteId).order('created_at', { ascending: true })
    setMensajes(data || [])
    // Marcar como leídos por el entrenador en la BD
    await supabase.from('mensajes_cliente')
      .update({ leido_entrenador: true })
      .eq('cliente_id', clienteId)
      .eq('entrenador_id', uid)
      .neq('tipo', 'entrenador')
    setNoLeidos(prev => { const n = {...prev}; delete n[clienteId]; return n })
  }

  async function enviar(textoMsg) {
    const msg = textoMsg || texto.trim()
    if (!msg || !seleccionado) return
    setEnviando(true)
    const { error } = await supabase.from('mensajes_cliente').insert({
      entrenador_id: uid,
      cliente_id: seleccionado.id,
      contenido: msg,
      leido: false
    })
    if (!error) {
      setTexto('')
      setShowPlantillas(false)
      await cargarMensajes(seleccionado.id)
    }
    setEnviando(false)
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  ).sort((a,b) => (noLeidos[b.id]||0) - (noLeidos[a.id]||0))

  const totalNoLeidos = Object.values(noLeidos).reduce((s,v) => s+v, 0)

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-screen overflow-hidden">

      {/* Sidebar clientes */}
      <div className={`${seleccionado ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 bg-white border-r border-black/5 flex-shrink-0`}>
        {/* Header */}
        <div className="p-4 border-b border-black/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-[#0A0A0A]">Mensajes</h1>
              {totalNoLeidos > 0 && <p className="text-xs text-[#FF5C00] font-medium">{totalNoLeidos} sin leer</p>}
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm">🔍</span>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full bg-[#F5F5F0] border-0 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF5C00]" />
          </div>
        </div>

        {/* Lista clientes */}
        <div className="flex-1 overflow-y-auto">
          {clientesFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-sm text-[#6B6B6B]">{busqueda ? 'Sin resultados' : 'Sin clientes activos'}</p>
            </div>
          ) : clientesFiltrados.map(c => {
            const nl = noLeidos[c.id] || 0
            const isSelected = seleccionado?.id === c.id
            return (
              <button key={c.id} onClick={() => setSeleccionado(c)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-black/5 transition-all ${isSelected ? 'bg-[#FF5C00]/5 border-l-2 border-l-[#FF5C00]' : 'hover:bg-[#F5F5F0]'}`}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: avatarColor(c.nombre) }}>
                    {ini(c.nombre)}
                  </div>
                  {nl > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF5C00] rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{nl}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${nl > 0 ? 'font-bold text-[#0A0A0A]' : 'font-medium text-[#0A0A0A]'}`}>{c.nombre}</p>
                  <p className="text-xs text-[#6B6B6B]">{c.tipo === 'online' ? '🌐 Online' : '📍 Presencial'}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Conversación */}
      {seleccionado ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F5F0]">
          {/* Header conversación */}
          <div className="bg-white border-b border-black/5 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setSeleccionado(null)} className="md:hidden text-[#6B6B6B] mr-1">←</button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: avatarColor(seleccionado.nombre) }}>
              {ini(seleccionado.nombre)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#0A0A0A] truncate">{seleccionado.nombre}</p>
              <p className="text-xs text-[#6B6B6B]">{seleccionado.tipo === 'online' ? '🌐 Online' : '📍 Presencial'} · ve los mensajes en su portal</p>
            </div>
            <button onClick={() => setQuickView(seleccionado.id)}
              className="text-xs border border-black/10 text-[#6B6B6B] px-3 py-1.5 rounded-lg hover:bg-[#F5F5F0] transition-all flex-shrink-0">
              👤 Perfil
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mensajes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-sm font-semibold text-[#0A0A0A]">Sin mensajes todavía</p>
                <p className="text-xs text-[#6B6B6B] mt-1 mb-4">Usa una plantilla para empezar</p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                  {PLANTILLAS.slice(0,4).map(p => (
                    <button key={p.id} onClick={() => enviar(p.texto)}
                      className="bg-white border border-black/10 rounded-xl p-3 text-left hover:border-[#FF5C00] transition-all">
                      <p className="text-base mb-1">{p.icon}</p>
                      <p className="text-xs font-semibold text-[#0A0A0A]">{p.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {mensajes.map(m => (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[80%]">
                      <div className="bg-[#111] text-white text-sm px-4 py-3 rounded-2xl rounded-br-sm leading-relaxed">
                        {m.contenido}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        <p className="text-xs text-[#6B6B6B]">
                          {new Date(m.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short'})} · {new Date(m.created_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
                        </p>
                        <span className="text-xs text-[#6B6B6B]">{m.leido ? '✓✓' : '✓'}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </>
            )}
          </div>

          {/* Plantillas */}
          {showPlantillas && (
            <div className="bg-white border-t border-black/5 p-3 overflow-x-auto flex-shrink-0">
              <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Plantillas rápidas</p>
              <div className="flex gap-2">
                {PLANTILLAS.map(p => (
                  <button key={p.id} onClick={() => { setTexto(p.texto); setShowPlantillas(false) }}
                    className="flex-shrink-0 bg-[#F5F5F0] border border-black/10 rounded-xl px-3 py-2 text-left hover:border-[#FF5C00] transition-all">
                    <p className="text-base">{p.icon}</p>
                    <p className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap mt-0.5">{p.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="bg-white border-t border-black/5 p-3 flex items-end gap-2 flex-shrink-0">
            <button onClick={() => setShowPlantillas(v => !v)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0 ${showPlantillas ? 'bg-[#FF5C00] text-white' : 'border border-black/10 text-[#6B6B6B] hover:bg-[#F5F5F0]'}`}>
              ⚡
            </button>
            <textarea value={texto} onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              rows={texto.split('\n').length > 2 ? 3 : 1}
              placeholder="Escribe un mensaje... (Enter para enviar)"
              className="flex-1 border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none transition-all" />
            <button onClick={() => enviar()} disabled={!texto.trim() || enviando}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-white disabled:opacity-40 transition-all flex-shrink-0"
              style={{ background: 'var(--acento)' }}>
              {enviando ? '⏳' : '→'}
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#F5F5F0]">
          <div className="text-center">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-lg font-bold text-[#0A0A0A]">Selecciona un cliente</p>
            <p className="text-sm text-[#6B6B6B] mt-2">para ver o enviar mensajes</p>
          </div>
        </div>
      )}
      {quickView && <ClienteQuickView clienteId={quickView} onClose={() => setQuickView(null)} />}
    </div>
  )
}
