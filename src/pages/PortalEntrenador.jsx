import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg">{msg}</div>
}

export default function PortalEntrenador({ session }) {
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [diaActivo, setDiaActivo] = useState(new Date().getDay() === 0 ? 1 : new Date().getDay())
  const [vistaRight, setVistaRight] = useState('clientes') // clientes | mensajes
  const [clienteMsg, setClienteMsg] = useState(null) // cliente seleccionado en mensajería
  const [mensajes, setMensajes] = useState([])
  const [textoMsg, setTextoMsg] = useState('')
  const [enviando, setEnviando] = useState(false)
  const uid = session?.user?.id

  useEffect(() => { if (uid) cargar() }, [uid])

  async function cargar() {
    setLoading(true)
    const hoy = new Date().toISOString().split('T')[0]
    const lunes = (() => { const d = new Date(); d.setDate(d.getDate()-((d.getDay()||7)-1)); return d.toISOString().split('T')[0] })()

    const [
      { data: miembro },
      { data: recurrentes },
      { data: sesIndividuales },
      { data: clientesPropios },
      { data: alertas },
      { data: msgs },
    ] = await Promise.all([
      supabase.from('miembros_centro').select('*, centros(nombre,color_acento)').eq('user_id', uid).eq('activo', true).limit(1).maybeSingle(),
      supabase.from('sesiones_recurrentes').select('id,hora,duracion_minutos,tipo,dias_semana,cliente_id,entrenador_id').eq('entrenador_id', uid).eq('activa', true),
      supabase.from('sesiones').select('id,fecha,hora,duracion_minutos,tipo,completada,cancelada,cliente_id,entrenador_id').eq('entrenador_id', uid).gte('fecha', lunes).eq('cancelada', false).order('fecha').order('hora'),
      supabase.from('clientes').select('id,nombre,tipo,nivel,lesiones,objetivo,peso_actual,peso_objetivo').eq('entrenador_id', uid).eq('estado', 'activo'),
      supabase.from('alertas').select('*').eq('entrenador_id', uid).eq('leida', false).order('created_at',{ascending:false}).limit(10),
      supabase.from('mensajes_cliente').select('*, clientes(nombre)').eq('entrenador_id', uid).eq('leido_entrenador', false).eq('tipo','cliente').order('created_at',{ascending:false}).limit(5),
    ])

    // Recopilar todos los cliente_ids de las recurrentes
    const todosClienteIds = [...new Set([
      ...(clientesPropios||[]).map(c => c.id),
      ...(recurrentes||[]).map(r => r.cliente_id),
      ...(sesIndividuales||[]).map(s => s.cliente_id),
    ].filter(Boolean))]

    // Cargar todos los clientes necesarios en una sola query
    const { data: todosClientes } = todosClienteIds.length > 0
      ? await supabase.from('clientes').select('id,nombre,tipo,nivel,lesiones,objetivo,peso_actual,peso_objetivo').in('id', todosClienteIds).eq('estado', 'activo')
      : { data: [] }

    const clienteMap = {}
    ;(todosClientes||[]).forEach(c => { clienteMap[c.id] = c })

    // Expandir recurrentes para toda la semana
    const semanaSesiones = {}
    const lunesDate = new Date(lunes + 'T12:00')
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunesDate); d.setDate(d.getDate() + i)
      const fechaStr = d.toISOString().split('T')[0]
      semanaSesiones[fechaStr] = (sesIndividuales||[]).filter(s => s.fecha === fechaStr)
      const diaSemana = d.getDay() === 0 ? 7 : d.getDay()
      for (const rec of recurrentes||[]) {
        if (!(rec.dias_semana||[]).includes(diaSemana)) continue
        const yaExiste = semanaSesiones[fechaStr].some(s => s.hora === rec.hora && s.cliente_id === rec.cliente_id)
        if (!yaExiste) semanaSesiones[fechaStr].push({
          id: `rec_${rec.id}_${fechaStr}`, cliente_id: rec.cliente_id,
          entrenador_id: uid, fecha: fechaStr, hora: rec.hora,
          duracion_minutos: rec.duracion_minutos || 60, tipo: rec.tipo,
          completada: false, cancelada: false, es_recurrente: true
        })
      }
      semanaSesiones[fechaStr].sort((a,b) => (a.hora||'').localeCompare(b.hora||''))
    }

    // Clientes únicos con sesión esta semana
    const clientes = todosClientes || []
    const clientesConSesion = new Set(Object.values(semanaSesiones).flat().map(s => s.cliente_id))
    const horasSemana = Object.values(semanaSesiones).flat().reduce((s,x) => s + (x.duracion_minutos||60), 0) / 60

    setDatos({ miembro, semanaSesiones, clientes, clienteMap, alertas: alertas||[], msgs: msgs||[], horasSemana: Math.round(horasSemana*10)/10, clientesConSesion: clientesConSesion.size })
    setLoading(false)
  }

  async function cargarMensajes(clienteId) {
    const { data } = await supabase.from('mensajes_cliente')
      .select('*').eq('entrenador_id', uid).eq('cliente_id', clienteId)
      .order('created_at', { ascending: true }).limit(50)
    setMensajes(data || [])
    // Marcar como leídos
    await supabase.from('mensajes_cliente').update({ leido_entrenador: true })
      .eq('entrenador_id', uid).eq('cliente_id', clienteId).eq('tipo', 'cliente')
  }

  async function seleccionarCliente(cliente) {
    setClienteMsg(cliente)
    setVistaRight('mensajes')
    await cargarMensajes(cliente.id)
  }

  async function enviarMensaje() {
    if (!textoMsg.trim() || !clienteMsg) return
    setEnviando(true)
    const { error } = await supabase.from('mensajes_cliente').insert({
      entrenador_id: uid, cliente_id: clienteMsg.id,
      contenido: textoMsg.trim(), tipo: 'entrenador',
      leido: false, leido_entrenador: true
    })
    if (!error) {
      setTextoMsg('')
      await cargarMensajes(clienteMsg.id)
      supabase.functions.invoke('notificar-mensaje', {
        body: { cliente_id: clienteMsg.id, tipo: 'mensaje_entrenador', preview: textoMsg.trim().slice(0,200) }
      }).catch(() => {})
    }
    setEnviando(false)
  }

  async function marcarCompletada(sesId) {
    if (sesId.startsWith('rec_')) return setToast({ msg: 'Marca la sesión desde la agenda completa' })
    await supabase.from('sesiones').update({ completada: true }).eq('id', sesId)
    await cargar()
    setToast({ msg: '✓ Sesión completada' })
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const d = datos
  const acento = d.miembro?.centros?.color_acento || '#FF5C00'
  const nombre = session.user?.user_metadata?.nombre || d.miembro?.nombre || session.user?.email?.split('@')[0] || 'Entrenador'
  const lunesDate = new Date(); lunesDate.setDate(lunesDate.getDate() - ((lunesDate.getDay()||7)-1))
  const diasSemana = Array.from({length:7}, (_,i) => { const d2=new Date(lunesDate); d2.setDate(d2.getDate()+i); return d2 })
  const hoy = new Date().toISOString().split('T')[0]
  const clienteMap = d.clienteMap || {}

  const sesionesDiaActivo = (() => {
    const d2 = diasSemana[diaActivo-1] || diasSemana[0]
    const fecha = d2.toISOString().split('T')[0]
    return d.semanaSesiones[fecha] || []
  })()

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {toast && <Toast msg={toast.msg} onClose={() => setToast(null)} />}

      {/* ── HEADER ── */}
      <div className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{background:acento}}>{ini(nombre)}</div>
          <div>
            <p className="text-white font-bold text-sm">{nombre.split(' ')[0]}</p>
            <p className="text-white/40 text-xs">{d.miembro?.centros?.nombre || 'Mi centro'}</p>
          </div>
        </div>
        {/* Stats rápidas */}
        <div className="flex items-center gap-6">
          <div className="text-center hidden sm:block">
            <p className="text-lg font-bold text-white">{d.clientesConSesion}</p>
            <p className="text-xs text-white/40">Clientes esta semana</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-lg font-bold" style={{color:acento}}>{d.horasSemana}h</p>
            <p className="text-xs text-white/40">Horas estimadas</p>
          </div>
          {d.alertas.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-1.5">
              <span className="text-sm">⚠️</span>
              <p className="text-xs text-amber-400 font-semibold">{d.alertas.length} alerta{d.alertas.length>1?'s':''}</p>
            </div>
          )}
          {d.msgs.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#6366f1]/15 border border-[#6366f1]/30 rounded-xl px-3 py-1.5">
              <span className="text-sm">✉️</span>
              <p className="text-xs text-[#6366f1] font-semibold">{d.msgs.length} mensaje{d.msgs.length>1?'s':''}</p>
            </div>
          )}
          <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/login'}}
            className="text-xs text-white/20 hover:text-white/50 transition-colors">Salir</button>
        </div>
      </div>

      {/* ── LAYOUT PRINCIPAL ── */}
      <div className="flex h-[calc(100vh-65px)]">

        {/* ── COLUMNA IZQUIERDA: Semana + Alertas ── */}
        <div className="w-80 border-r border-white/8 flex flex-col overflow-hidden flex-shrink-0">

          {/* Selector de día */}
          <div className="px-4 pt-4 pb-3 border-b border-white/5">
            <p className="text-xs text-white/40 font-bold uppercase tracking-wide mb-3">Esta semana</p>
            <div className="grid grid-cols-7 gap-1">
              {diasSemana.map((dia, i) => {
                const fechaStr = dia.toISOString().split('T')[0]
                const nSes = (d.semanaSesiones[fechaStr]||[]).length
                const esHoy = fechaStr === hoy
                const diaN = i + 1
                return (
                  <button key={i} onClick={() => setDiaActivo(diaN)}
                    className={`flex flex-col items-center py-1.5 rounded-xl transition-all ${diaActivo===diaN ? 'bg-white/15' : 'hover:bg-white/5'}`}>
                    <p className={`text-xs ${esHoy ? 'font-bold' : 'text-white/40'}`} style={esHoy?{color:acento}:{}}>{DIAS[dia.getDay()]}</p>
                    <p className={`text-sm font-bold mt-0.5 ${diaActivo===diaN ? 'text-white' : esHoy ? '' : 'text-white/60'}`} style={esHoy&&diaActivo!==diaN?{color:acento}:{}}>{dia.getDate()}</p>
                    {nSes > 0 && <div className="w-1.5 h-1.5 rounded-full mt-1" style={{background: diaActivo===diaN ? 'white' : acento}} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sesiones del día seleccionado */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {sesionesDiaActivo.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">🏖</p>
                <p className="text-white/30 text-sm">Sin sesiones</p>
              </div>
            ) : sesionesDiaActivo.map((s, i) => {
              const cliente = clienteMap[s.cliente_id]
              const tieneAlerta = d.alertas.some(a => a.cliente_id === s.cliente_id)
              return (
                <div key={i} className={`rounded-xl p-3 border transition-all ${s.completada ? 'bg-white/3 border-white/5 opacity-50' : 'bg-white/7 border-white/10 hover:bg-white/10'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{background: s.completada ? '#333' : acento}}>
                        {ini(cliente?.nombre)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-semibold ${s.completada ? 'line-through text-white/40' : 'text-white'}`}>{cliente?.nombre || '—'}</p>
                          {tieneAlerta && <span className="text-xs">⚠️</span>}
                        </div>
                        <p className="text-xs text-white/40">{s.hora} · {s.duracion_minutos||60}min</p>
                      </div>
                    </div>
                    {!s.completada && (
                      <button onClick={() => marcarCompletada(s.id)}
                        className="w-7 h-7 rounded-lg bg-white/8 hover:bg-emerald-500/20 hover:text-emerald-400 text-white/30 flex items-center justify-center text-sm transition-all">
                        ✓
                      </button>
                    )}
                  </div>
                  {cliente?.lesiones && cliente.lesiones !== 'ninguna' && cliente.lesiones !== '' && (
                    <div className="mt-2 bg-amber-500/10 rounded-lg px-2.5 py-1.5">
                      <p className="text-xs text-amber-400">⚡ {cliente.lesiones}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Alertas */}
          {d.alertas.length > 0 && (
            <div className="border-t border-white/8 px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs text-white/40 font-bold uppercase tracking-wide">Alertas</p>
              {d.alertas.map(a => (
                <div key={a.id} className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-amber-300 leading-relaxed">{a.mensaje}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── COLUMNA DERECHA: Clientes + Mensajes ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Selector vista */}
          <div className="flex border-b border-white/8 flex-shrink-0">
            <button onClick={() => setVistaRight('clientes')}
              className={`flex-1 py-3 text-sm font-semibold transition-all ${vistaRight==='clientes' ? 'text-white border-b-2' : 'text-white/40 hover:text-white/70'}`}
              style={vistaRight==='clientes' ? {borderColor:acento} : {}}>
              👥 Clientes ({d.clientes.length})
            </button>
            <button onClick={() => setVistaRight('mensajes')}
              className={`flex-1 py-3 text-sm font-semibold transition-all relative ${vistaRight==='mensajes' ? 'text-white border-b-2' : 'text-white/40 hover:text-white/70'}`}
              style={vistaRight==='mensajes' ? {borderColor:acento} : {}}>
              ✉️ Mensajes
              {d.msgs.length > 0 && <span className="absolute top-2 right-8 w-4 h-4 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">{d.msgs.length}</span>}
            </button>
          </div>

          {/* Vista clientes */}
          {vistaRight === 'clientes' && (
            <div className="flex-1 overflow-y-auto p-5">
              {d.clientes.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-3xl mb-3">👥</p>
                  <p className="text-white/40">Sin clientes asignados aún</p>
                  <p className="text-white/20 text-sm mt-1">El admin del centro te asignará clientes desde la agenda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {d.clientes.map(c => {
                    const sesionesSem = Object.values(d.semanaSesiones).flat().filter(s => s.cliente_id === c.id).length
                    const alerta = d.alertas.find(a => a.cliente_id === c.id)
                    const msgNL = d.msgs.filter(m => m.cliente_id === c.id).length
                    return (
                      <div key={c.id} className={`rounded-2xl p-4 border ${alerta ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/5 border-white/8'} hover:bg-white/8 transition-all`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{background:acento}}>
                              {ini(c.nombre)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{c.nombre}</p>
                              <p className="text-xs text-white/40">{c.nivel} · {c.tipo}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 items-center">
                            {sesionesSem > 0 && <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{background:`${acento}20`,color:acento}}>{sesionesSem}×</span>}
                            <button onClick={() => seleccionarCliente(c)}
                              className="relative text-xs px-2 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/50 hover:text-white transition-all">
                              ✉️
                              {msgNL > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white flex items-center justify-center" style={{fontSize:'8px'}}>{msgNL}</span>}
                            </button>
                          </div>
                        </div>
                        {c.objetivo && <p className="text-xs text-white/40 mb-2">{c.objetivo.replace(/_/g,' ')}</p>}
                        {c.lesiones && c.lesiones !== 'ninguna' && c.lesiones !== '' && (
                          <div className="bg-amber-500/10 rounded-lg px-2.5 py-2 mb-2">
                            <p className="text-xs text-amber-400 font-semibold mb-0.5">⚡ Limitaciones</p>
                            <p className="text-xs text-amber-300/80">{c.lesiones}</p>
                          </div>
                        )}
                        {alerta && (
                          <div className="bg-amber-500/10 rounded-lg px-2.5 py-2">
                            <p className="text-xs text-amber-400 leading-relaxed">{alerta.mensaje}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Vista mensajes */}
          {vistaRight === 'mensajes' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Lista clientes */}
              <div className="w-52 border-r border-white/8 overflow-y-auto flex-shrink-0">
                {d.clientes.map(c => {
                  const msgNL = d.msgs.filter(m => m.cliente_id === c.id).length
                  const activo = clienteMsg?.id === c.id
                  return (
                    <button key={c.id} onClick={() => seleccionarCliente(c)}
                      className={`w-full flex items-center gap-2.5 px-3 py-3 border-b border-white/5 text-left transition-all ${activo ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 relative" style={{background:acento}}>
                        {ini(c.nombre)}
                        {msgNL > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center" style={{fontSize:'9px'}}>{msgNL}</span>}
                      </div>
                      <p className="text-sm font-medium text-white truncate">{c.nombre.split(' ')[0]}</p>
                    </button>
                  )
                })}
                {d.clientes.length === 0 && (
                  <p className="text-xs text-white/30 text-center p-4">Sin clientes</p>
                )}
              </div>

              {/* Chat */}
              {clienteMsg ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/8 flex-shrink-0">
                    <p className="text-sm font-bold text-white">{clienteMsg.nombre}</p>
                    <p className="text-xs text-white/40">{clienteMsg.nivel} · {clienteMsg.objetivo?.replace(/_/g,' ')}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                    {mensajes.length === 0 && <p className="text-center text-white/30 text-sm py-8">Sin mensajes aún</p>}
                    {mensajes.map(m => (
                      <div key={m.id} className={`flex ${m.tipo==='entrenador' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${m.tipo==='entrenador' ? 'text-white' : 'bg-white/10 text-white/80'}`}
                          style={m.tipo==='entrenador' ? {background:acento} : {}}>
                          {m.contenido}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-white/8 flex gap-2 flex-shrink-0">
                    <input value={textoMsg} onChange={e=>setTextoMsg(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); enviarMensaje() }}}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-white/8 text-white text-sm placeholder:text-white/30 px-3 py-2 rounded-xl focus:outline-none focus:bg-white/12"/>
                    <button onClick={enviarMensaje} disabled={!textoMsg.trim()||enviando}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
                      style={{background:acento}}>↑</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-white/30 text-sm">Selecciona un cliente</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
