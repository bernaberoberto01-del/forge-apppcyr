import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

function Toast({ msg, tipo='ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 ${tipo==='error'?'bg-red-600':'bg-[#111]'}`}>
      <span>{tipo==='error'?'⚠':'✓'}</span> {msg}
    </div>
  )
}

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: '📅' },
  { id: 'semana', label: 'Semana', icon: '🗓' },
  { id: 'clientes', label: 'Clientes', icon: '👥' },
  { id: 'mensajes', label: 'Mensajes', icon: '✉️' },
]

export default function PortalEntrenador({ session }) {
  const [tab, setTab] = useState('hoy')
  const [loading, setLoading] = useState(true)
  const [datos, setDatos] = useState(null)
  const [toast, setToast] = useState(null)
  const [mensajesNL, setMensajesNL] = useState(0)
  const uid = session?.user?.id

  useEffect(() => { if (uid) cargar() }, [uid])

  async function cargar() {
    setLoading(true)
    const hoy = new Date().toISOString().split('T')[0]
    const lunes = (() => { const d = new Date(); d.setDate(d.getDate()-((d.getDay()||7)-1)); return d.toISOString().split('T')[0] })()
    const domingo = (() => { const d = new Date(); d.setDate(d.getDate()-((d.getDay()||7)-1)+6); return d.toISOString().split('T')[0] })()

    const [
      { data: sesHoy },
      { data: sesSem },
      { data: clientes },
      { data: msgs },
      { data: miembro },
    ] = await Promise.all([
      supabase.from('sesiones').select('*, clientes(nombre,objetivo,tipo)').eq('entrenador_id', uid).eq('fecha', hoy).eq('cancelada', false).order('hora'),
      supabase.from('sesiones').select('*, clientes(nombre)').eq('entrenador_id', uid).gte('fecha', lunes).lte('fecha', domingo).eq('cancelada', false).order('fecha').order('hora'),
      supabase.from('clientes').select('id,nombre,objetivo,estado,peso_actual,peso_objetivo,tipo,nivel').eq('entrenador_id', uid).eq('estado', 'activo').order('nombre'),
      supabase.from('mensajes_cliente').select('*, clientes(nombre)').eq('entrenador_id', uid).order('created_at', { ascending: false }).limit(30),
      supabase.from('miembros_centro').select('*, centros(nombre,color_acento)').eq('user_id', uid).eq('activo', true).limit(1).maybeSingle(),
    ])

    // Horas semana
    const horasSem = (sesSem||[]).filter(s=>s.completada).reduce((s,x)=>s+(x.duracion_minutos||60),0)/60

    // Checkins pendientes
    const hace7 = new Date(Date.now()-7*864e5).toISOString().split('T')[0]
    const { data: checkins } = await supabase.from('checkins').select('cliente_id').eq('entrenador_id', uid).gte('fecha', hace7)
    const conCI = new Set((checkins||[]).map(c=>c.cliente_id))
    const sinCI = (clientes||[]).filter(c => !conCI.has(c.id))

    const nlMsgs = (msgs||[]).filter(m => !m.leido && m.tipo !== 'entrenador').length
    setMensajesNL(nlMsgs)

    setDatos({ sesHoy: sesHoy||[], sesSem: sesSem||[], clientes: clientes||[], msgs: msgs||[], horasSem: Math.round(horasSem*10)/10, sinCI, miembro })
    setLoading(false)
  }

  async function marcarCompletada(sesId, actual) {
    await supabase.from('sesiones').update({ completada: !actual }).eq('id', sesId)
    setDatos(d => ({
      ...d,
      sesHoy: d.sesHoy.map(s => s.id===sesId ? {...s, completada: !actual} : s),
      sesSem: d.sesSem.map(s => s.id===sesId ? {...s, completada: !actual} : s),
    }))
    setToast({ msg: actual ? 'Marcada como pendiente' : '✓ Sesión completada' })
  }

  async function enviarMensaje(clienteId, texto) {
    if (!texto.trim()) return
    await supabase.from('mensajes_cliente').insert({
      entrenador_id: uid, cliente_id: clienteId,
      contenido: texto, tipo: 'entrenador', leido: false
    })
    await cargar()
    setToast({ msg: 'Mensaje enviado' })
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const d = datos
  const acento = d.miembro?.centros?.color_acento || '#FF5C00'
  const nombre = session.user?.user_metadata?.nombre || d.miembro?.nombre || session.user?.email?.split('@')[0]

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col max-w-lg mx-auto">
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs">{d.miembro?.centros?.nombre || 'Mi centro'}</p>
            <h1 className="text-white text-xl font-bold mt-0.5">Hola, {nombre.split(' ')[0]} 👋</h1>
          </div>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm" style={{background: acento}}>
            {ini(nombre)}
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            [d.sesHoy.length, 'Hoy', acento],
            [`${d.horasSem}h`, 'Esta semana', '#6366f1'],
            [d.clientes.length, 'Clientes', '#10b981'],
          ].map(([v,l,c]) => (
            <div key={l} className="bg-white/5 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-white">{v}</p>
              <p className="text-xs text-white/40 mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Alerta check-ins pendientes */}
        {d.sinCI.length > 0 && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-400 leading-relaxed">
              <span className="font-semibold">{d.sinCI.length} cliente{d.sinCI.length>1?'s':''}</span> sin check-in esta semana: {d.sinCI.slice(0,2).map(c=>c.nombre.split(' ')[0]).join(', ')}{d.sinCI.length>2?`…`:''}.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-1 bg-white/5 p-1 rounded-2xl">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all relative ${tab===t.id?'bg-white text-[#0A0A0A]':'text-white/40'}`}>
              {t.id === 'mensajes' && mensajesNL > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center" style={{fontSize:'9px'}}>{mensajesNL}</span>
              )}
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">

        {/* HOY */}
        {tab === 'hoy' && (
          d.sesHoy.length === 0
            ? <div className="text-center py-16">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-white font-semibold">Sin sesiones hoy</p>
                <p className="text-white/40 text-sm mt-1">Disfruta el descanso</p>
              </div>
            : d.sesHoy.map(s => (
              <div key={s.id} className={`rounded-2xl p-4 border ${s.completada?'bg-white/3 border-white/5':'bg-white/8 border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{background: s.completada ? '#1a1a1a' : acento}}>
                    {ini(s.clientes?.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${s.completada?'text-white/40 line-through':'text-white'}`}>
                      {s.clientes?.nombre}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">{s.hora} · {s.duracion_minutos||60}min · {s.tipo}</p>
                  </div>
                  <button onClick={() => marcarCompletada(s.id, s.completada)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 transition-all ${s.completada?'bg-emerald-500/20 text-emerald-400':'bg-white/10 text-white/50 hover:bg-white/20'}`}>
                    ✓
                  </button>
                </div>
                {s.notas && (
                  <p className="text-xs text-white/30 mt-2.5 pl-15">{s.notas}</p>
                )}
              </div>
            ))
        )}

        {/* SEMANA */}
        {tab === 'semana' && (() => {
          const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
          const hoy = new Date().toISOString().split('T')[0]
          const porDia = d.sesSem.reduce((acc, s) => {
            if (!acc[s.fecha]) acc[s.fecha] = []
            acc[s.fecha].push(s)
            return acc
          }, {})
          const completadas = d.sesSem.filter(s=>s.completada).length
          const horas = Math.round(d.sesSem.filter(s=>s.completada).reduce((s,x)=>s+(x.duracion_minutos||60),0)/60*10)/10

          return (
            <>
              <div className="grid grid-cols-2 gap-2 mb-1">
                {[[completadas,'Completadas','#10b981'],[`${horas}h`,'Trabajadas','#6366f1']].map(([v,l,c])=>(
                  <div key={l} className="bg-white/5 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold" style={{color:c}}>{v}</p>
                    <p className="text-xs text-white/40 mt-1">{l}</p>
                  </div>
                ))}
              </div>
              {Object.entries(porDia).map(([fecha, ses]) => {
                const esHoy = fecha === hoy
                const diaIdx = new Date(fecha+'T12:00').getDay()
                const diaLabel = dias[(diaIdx+6)%7]
                return (
                  <div key={fecha}>
                    <p className={`text-xs font-bold mb-2 ${esHoy?'text-[#FF5C00]':'text-white/40'}`}>
                      {diaLabel.toUpperCase()} {esHoy && '· HOY'}
                    </p>
                    <div className="space-y-2">
                      {ses.map(s => (
                        <div key={s.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${s.completada?'bg-white/3 border border-white/5':'bg-white/8'}`}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{background: s.completada?'#1a1a1a':acento}}>
                            {ini(s.clientes?.nombre)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${s.completada?'text-white/30 line-through':'text-white'}`}>
                              {s.clientes?.nombre}
                            </p>
                          </div>
                          <p className="text-xs text-white/40 flex-shrink-0">{s.hora}</p>
                          {s.completada && <span className="text-emerald-400 text-xs flex-shrink-0">✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {d.sesSem.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">🗓</p>
                  <p className="text-white font-semibold">Sin sesiones esta semana</p>
                </div>
              )}
            </>
          )
        })()}

        {/* CLIENTES */}
        {tab === 'clientes' && (
          d.clientes.length === 0
            ? <div className="text-center py-16">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-white font-semibold">Sin clientes asignados</p>
              </div>
            : d.clientes.map(c => {
              const obj = {perdida_grasa:'Pérdida de grasa',ganancia_muscular:'Ganancia muscular',tonificacion:'Tonificación',fuerza:'Fuerza',rendimiento:'Rendimiento',salud_general:'Salud general'}
              const sinCI = d.sinCI.find(x=>x.id===c.id)
              return (
                <div key={c.id} className="bg-white/5 border border-white/8 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{background: acento}}>
                      {ini(c.nombre)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{c.nombre}</p>
                      <p className="text-xs text-white/40">{obj[c.objetivo]||c.objetivo} · {c.nivel} · {c.tipo}</p>
                    </div>
                    {sinCI && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full flex-shrink-0">Sin CI</span>}
                  </div>
                  {c.peso_actual && (
                    <div className="flex items-center gap-3 mt-3 pl-14">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          background: acento,
                          width: c.peso_objetivo ? `${Math.max(0,Math.min(100, 100-(Math.abs(c.peso_actual-c.peso_objetivo)/Math.abs((c.peso_actual||70)-(c.peso_objetivo||70)+0.01))*100))}%` : '50%'
                        }}/>
                      </div>
                      <p className="text-xs text-white/40 flex-shrink-0">{c.peso_actual}kg → {c.peso_objetivo||'?'}kg</p>
                    </div>
                  )}
                </div>
              )
            })
        )}

        {/* MENSAJES */}
        {tab === 'mensajes' && (() => {
          // Agrupar por cliente
          const porCliente = d.msgs.reduce((acc, m) => {
            const cid = m.cliente_id
            if (!acc[cid]) acc[cid] = { nombre: m.clientes?.nombre, msgs: [], noLeidos: 0 }
            acc[cid].msgs.push(m)
            if (!m.leido && m.tipo !== 'entrenador') acc[cid].noLeidos++
            return acc
          }, {})

          return Object.entries(porCliente).map(([cid, conv]) => (
            <MiniChat key={cid} clienteId={cid} conv={conv} uid={uid} acento={acento} onSend={enviarMensaje} />
          ))
        })()}

      </div>

      {/* Cerrar sesión */}
      <div className="px-5 py-4 border-t border-white/5">
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
          className="w-full text-xs text-white/20 hover:text-white/40 transition-colors py-2">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function MiniChat({ clienteId, conv, uid, acento, onSend }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')

  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
      <button onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center gap-3 p-4 text-left">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{background: acento}}>
          {(conv.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{conv.nombre}</p>
          <p className="text-xs text-white/40 truncate">{conv.msgs[0]?.contenido}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {conv.noLeidos > 0 && (
            <span className="w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center text-xs font-bold">{conv.noLeidos}</span>
          )}
          <span className="text-white/30 text-xs">{abierto?'▲':'▼'}</span>
        </div>
      </button>
      {abierto && (
        <div className="border-t border-white/5">
          <div className="max-h-48 overflow-y-auto px-4 py-3 space-y-2">
            {conv.msgs.slice().reverse().map(m => (
              <div key={m.id} className={`flex ${m.tipo==='entrenador'?'justify-end':'justify-start'}`}>
                <div className={`max-w-[80%] text-xs px-3 py-2 rounded-xl leading-relaxed ${m.tipo==='entrenador'?'text-white rounded-br-sm':'bg-white/10 text-white/80 rounded-bl-sm'}`}
                  style={m.tipo==='entrenador'?{background:acento}:{}}>
                  {m.contenido}
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 pb-3 flex gap-2">
            <input value={texto} onChange={e=>setTexto(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&texto.trim()){ onSend(clienteId,texto); setTexto('') }}}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-white/10 text-white text-xs placeholder:text-white/30 px-3 py-2.5 rounded-xl focus:outline-none focus:bg-white/15" />
            <button onClick={()=>{ if(texto.trim()){ onSend(clienteId,texto); setTexto('') }}}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0"
              style={{background:acento}}>
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
