import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const DIAS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DIAS_FULL  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl border border-white/10">{msg}</div>
}

export default function PortalEntrenador({ session }) {
  const [datos,       setDatos]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [toast,       setToast]       = useState(null)
  const [tab,         setTab]         = useState('hoy')      // hoy | semana | clientes | mensajes
  const [clienteSel,  setClienteSel]  = useState(null)
  const [mensajes,    setMensajes]    = useState([])
  const [texto,       setTexto]       = useState('')
  const [enviando,    setEnviando]    = useState(false)
  const [diaVista,    setDiaVista]    = useState(() => {
    const d = new Date().getDay(); return d === 0 ? 7 : d  // 1=lun…7=dom
  })
  const chatRef = useRef(null)
  const uid = session?.user?.id

  useEffect(() => { if (uid) cargar() }, [uid])
  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight) }, [mensajes])

  // ─── Cargar datos ──────────────────────────────────────────────────────────
  async function cargar() {
    setLoading(true)
    try {
    const hoy   = new Date().toISOString().split('T')[0]
    const lunes = getLunes()

    const [
      { data: miembro },
      { data: recs },
      { data: sesDB },
      { data: alertas },
      { data: msgsNL },
    ] = await Promise.all([
      supabase.from('miembros_centro').select('*,centros(nombre,color_acento)').eq('user_id',uid).eq('activo',true).limit(1).maybeSingle(),
      supabase.from('sesiones_recurrentes').select('id,hora,duracion_minutos,tipo,dias_semana,cliente_id').eq('entrenador_id',uid).eq('activa',true),
      supabase.from('sesiones').select('id,fecha,hora,duracion_minutos,tipo,completada,cancelada,cliente_id,notas').eq('entrenador_id',uid).gte('fecha',lunes).eq('cancelada',false).order('fecha').order('hora'),
      supabase.from('alertas').select('*').eq('entrenador_id',uid).eq('leida',false).order('created_at',{ascending:false}).limit(20),
      supabase.from('mensajes_cliente').select('id,cliente_id,contenido,created_at,clientes(nombre)').eq('entrenador_id',uid).eq('leido_entrenador',false).eq('tipo','cliente').order('created_at',{ascending:false}).limit(10),
    ])

    // Clientes via service_role (evita RLS para entrenadores invitados)
    const { data: cData } = await supabase.functions.invoke('clientes-entrenador')
    const { data: cPropios } = await supabase.from('clientes')
      .select('id,nombre,tipo,nivel,lesiones,objetivo,peso_actual,peso_objetivo,nutricion_activa')
      .eq('entrenador_id',uid).eq('estado','activo')

    const idsYa = new Set((cData?.clientes||[]).map(c=>c.id))
    const clientes = [...(cData?.clientes||[]), ...(cPropios||[]).filter(c=>!idsYa.has(c.id))]
    const cMap = {}; clientes.forEach(c => { cMap[c.id] = c })

    // Expandir recurrentes → semana completa
    const semana = buildSemana(lunes, recs||[], sesDB||[], cMap)

    // Stats
    const sesHoy = semana[hoy] || []
    const todasSem = Object.values(semana).flat()
    const horasSem = Math.round(todasSem.reduce((s,x)=>s+(x.duracion_minutos||60),0)/60*10)/10
    const clientesSem = new Set(todasSem.map(s=>s.cliente_id)).size

    setDatos({ miembro, semana, sesHoy, clientes, cMap, alertas:alertas||[], msgsNL:msgsNL||[], horasSem, clientesSem })
    setLoading(false)
    } catch(e) {
      console.error('PortalEntrenador error:', e)
      setLoading(false)
    }
  }

  function getLunes() {
    const d = new Date(); d.setDate(d.getDate()-((d.getDay()||7)-1)); return d.toISOString().split('T')[0]
  }

  function buildSemana(lunes, recs, sesDB, cMap) {
    const out = {}
    const base = new Date(lunes+'T12:00')
    for (let i=0;i<7;i++) {
      const d2 = new Date(base); d2.setDate(d2.getDate()+i)
      const fecha = d2.toISOString().split('T')[0]
      const dia   = d2.getDay()===0?7:d2.getDay()
      const indDB = sesDB.filter(s=>s.fecha===fecha)
      const indRec = recs
        .filter(r=>(r.dias_semana||[]).includes(dia))
        .filter(r=>!indDB.some(s=>s.hora===r.hora&&s.cliente_id===r.cliente_id))
        .map(r=>({ id:`rec_${r.id}_${fecha}`, fecha, hora:r.hora, duracion_minutos:r.duracion_minutos||60,
          tipo:r.tipo, completada:false, cancelada:false, cliente_id:r.cliente_id, es_rec:true }))
      out[fecha] = [...indDB,...indRec].sort((a,b)=>(a.hora||'').localeCompare(b.hora||''))
    }
    return out
  }

  async function cargarChat(c) {
    setClienteSel(c); setTab('mensajes')
    const { data } = await supabase.from('mensajes_cliente')
      .select('*').eq('entrenador_id',uid).eq('cliente_id',c.id)
      .order('created_at',{ascending:true}).limit(60)
    setMensajes(data||[])
    await supabase.from('mensajes_cliente').update({leido_entrenador:true})
      .eq('entrenador_id',uid).eq('cliente_id',c.id).eq('tipo','cliente')
    setDatos(prev => prev ? {...prev, msgsNL: prev.msgsNL.filter(m=>m.cliente_id!==c.id)} : prev)
  }

  async function enviar() {
    if (!texto.trim()||!clienteSel) return
    setEnviando(true)
    await supabase.from('mensajes_cliente').insert({
      entrenador_id:uid, cliente_id:clienteSel.id,
      contenido:texto.trim(), tipo:'entrenador', leido:false, leido_entrenador:true
    })
    supabase.functions.invoke('notificar-mensaje',{body:{cliente_id:clienteSel.id,tipo:'mensaje_entrenador',preview:texto.slice(0,200)}}).catch(()=>{})
    setTexto('')
    const {data} = await supabase.from('mensajes_cliente').select('*').eq('entrenador_id',uid).eq('cliente_id',clienteSel.id).order('created_at',{ascending:true}).limit(60)
    setMensajes(data||[])
    setEnviando(false)
  }

  async function completar(sesId) {
    if (sesId.startsWith('rec_')) { setToast({msg:'Usa la agenda para gestionar sesiones recurrentes'}); return }
    await supabase.from('sesiones').update({completada:true}).eq('id',sesId)
    cargar(); setToast({msg:'✓ Sesión completada'})
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const d = datos
  const acento = d.miembro?.centros?.color_acento || '#FF5C00'
  const nombre = session.user?.user_metadata?.nombre || d.miembro?.nombre || session.user?.email?.split('@')[0] || 'Entrenador'
  const hoy    = new Date().toISOString().split('T')[0]

  // Día activo para vista semana
  const diasSem = Array.from({length:7},(_,i)=>{ const dd=new Date(getLunes()+'T12:00'); dd.setDate(dd.getDate()+i); return dd })
  const fechaDiaVista = diasSem[diaVista-1]?.toISOString().split('T')[0] || hoy
  const sesionesDia   = d.semana[fechaDiaVista] || []

  // Alertas agrupadas por cliente
  const alertasPorCliente = {}
  d.alertas.forEach(a => {
    if (!alertasPorCliente[a.cliente_id]) alertasPorCliente[a.cliente_id] = []
    alertasPorCliente[a.cliente_id].push(a)
  })

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {toast && <Toast msg={toast.msg} onClose={()=>setToast(null)}/>}

      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs"
            style={{background:acento}}>{ini(nombre)}</div>
          <div>
            <p className="text-white font-bold text-sm leading-none">{nombre.split(' ')[0]}</p>
            <p className="text-white/40 text-xs mt-0.5">{d.miembro?.centros?.nombre||'Mi centro'}</p>
          </div>
        </div>
        {/* KPIs */}
        <div className="hidden sm:flex items-center gap-5">
          <div className="text-center">
            <p className="text-base font-bold text-white">{d.sesHoy.length}</p>
            <p className="text-xs text-white/40">Sesiones hoy</p>
          </div>
          <div className="w-px h-6 bg-white/10"/>
          <div className="text-center">
            <p className="text-base font-bold" style={{color:acento}}>{d.horasSem}h</p>
            <p className="text-xs text-white/40">Esta semana</p>
          </div>
          <div className="w-px h-6 bg-white/10"/>
          <div className="text-center">
            <p className="text-base font-bold text-white">{d.clientesSem}</p>
            <p className="text-xs text-white/40">Clientes activos</p>
          </div>
          {d.alertas.length>0 && <>
            <div className="w-px h-6 bg-white/10"/>
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg px-2.5 py-1">
              <span className="text-sm">⚠️</span>
              <p className="text-xs text-amber-400 font-semibold">{d.alertas.length} alertas</p>
            </div>
          </>}
          {d.msgsNL.length>0 && <>
            <div className="w-px h-6 bg-white/10"/>
            <div className="flex items-center gap-1.5 bg-[#6366f1]/15 border border-[#6366f1]/30 rounded-lg px-2.5 py-1">
              <span className="text-sm">✉️</span>
              <p className="text-xs text-[#6366f1] font-semibold">{d.msgsNL.length} nuevos</p>
            </div>
          </>}
        </div>
        <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/login'}}
          className="text-xs text-white/20 hover:text-white/50 transition-colors">Salir</button>
      </div>

      {/* ── TABS ── */}
      <div className="flex border-b border-white/8 flex-shrink-0 overflow-x-auto">
        {[
          ['hoy',      `Hoy (${d.sesHoy.length})`],
          ['semana',   'Semana'],
          ['clientes', `Clientes (${d.clientes.length})`],
          ['mensajes', 'Mensajes'],
        ].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all relative ${tab===id?'text-white':'text-white/40 border-transparent hover:text-white/70'}`}
            style={tab===id?{borderColor:acento}:{borderColor:'transparent'}}>
            {label}
            {id==='mensajes'&&d.msgsNL.length>0&&(
              <span className="absolute top-2 right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center" style={{fontSize:'9px'}}>{d.msgsNL.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── CONTENIDO ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── HOY ── */}
        {tab==='hoy' && (
          <div className="max-w-3xl mx-auto p-5 space-y-3">
            <p className="text-xs text-white/40 font-bold uppercase tracking-wide">
              {DIAS_FULL[new Date().getDay()]} {new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long'})}
            </p>
            {d.sesHoy.length===0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🏖</p>
                <p className="text-white/40">Sin sesiones programadas hoy</p>
              </div>
            ) : d.sesHoy.map((s,i) => <TarjetaSesion key={i} s={s} cMap={d.cMap} alertas={alertasPorCliente} acento={acento} onComplete={completar} onMsg={c=>{setClienteSel(c);cargarChat(c)}}/>)}

            {/* Alertas del día */}
            {d.alertas.length>0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-white/40 font-bold uppercase tracking-wide">Alertas pendientes</p>
                {d.alertas.slice(0,5).map(a=>(
                  <div key={a.id} className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
                    <span className="text-sm flex-shrink-0 mt-0.5">⚠️</span>
                    <p className="text-xs text-amber-300 leading-relaxed">{a.mensaje}</p>
                  </div>
                ))}
                {d.alertas.length>5&&<p className="text-xs text-white/30 text-center">+{d.alertas.length-5} alertas más en la vista Clientes</p>}
              </div>
            )}
          </div>
        )}

        {/* ── SEMANA ── */}
        {tab==='semana' && (
          <div className="flex flex-col h-full">
            {/* Selector días */}
            <div className="grid grid-cols-7 border-b border-white/8 flex-shrink-0">
              {diasSem.map((dia,i)=>{
                const f = dia.toISOString().split('T')[0]
                const n = (d.semana[f]||[]).length
                const esHoy = f===hoy
                const diaN = i+1
                return (
                  <button key={i} onClick={()=>setDiaVista(diaN)}
                    className={`py-3 flex flex-col items-center gap-1 border-b-2 transition-all ${diaVista===diaN?'border-current':'border-transparent'}`}
                    style={diaVista===diaN?{color:acento,borderColor:acento}:{}}>
                    <p className={`text-xs font-semibold ${esHoy&&diaVista!==diaN?'text-amber-400':diaVista===diaN?'':'text-white/40'}`}>{DIAS_SHORT[dia.getDay()]}</p>
                    <p className={`text-sm font-bold ${diaVista===diaN?'text-white':esHoy?'text-amber-400':'text-white/60'}`}>{dia.getDate()}</p>
                    {n>0&&<div className="w-1.5 h-1.5 rounded-full" style={{background:diaVista===diaN?acento:'rgba(255,255,255,0.3)'}}/>}
                  </button>
                )
              })}
            </div>
            {/* Sesiones del día */}
            <div className="flex-1 overflow-y-auto p-5 max-w-3xl mx-auto w-full space-y-3">
              <p className="text-xs text-white/40 font-bold uppercase tracking-wide">
                {DIAS_FULL[diasSem[diaVista-1]?.getDay()]} — {sesionesDia.length} sesión{sesionesDia.length!==1?'es':''}
              </p>
              {sesionesDia.length===0 ? (
                <div className="text-center py-12"><p className="text-white/30">Sin sesiones</p></div>
              ) : sesionesDia.map((s,i)=><TarjetaSesion key={i} s={s} cMap={d.cMap} alertas={alertasPorCliente} acento={acento} onComplete={completar} onMsg={c=>cargarChat(c)}/>)}
            </div>
          </div>
        )}

        {/* ── CLIENTES ── */}
        {tab==='clientes' && (
          <div className="p-5 max-w-screen-lg mx-auto">
            {d.clientes.length===0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">👥</p>
                <p className="text-white/40">Sin clientes asignados</p>
                <p className="text-white/20 text-sm mt-1">El admin del centro te asigna clientes desde la Agenda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {d.clientes.map(c=>{
                  const alertasC = alertasPorCliente[c.id] || []
                  const sesSem   = Object.values(d.semana).flat().filter(s=>s.cliente_id===c.id).length
                  const msgsC    = d.msgsNL.filter(m=>m.cliente_id===c.id).length
                  return (
                    <div key={c.id} className={`rounded-2xl p-4 border transition-all ${alertasC.length?'bg-amber-500/5 border-amber-500/25':'bg-white/5 border-white/8 hover:bg-white/8'}`}>
                      {/* Cabecera */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{background:acento}}>
                          {ini(c.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{c.nombre}</p>
                          <p className="text-xs text-white/40">{c.nivel} · {c.tipo==='online'?'🌐 Online':'📍 Presencial'}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {sesSem>0&&<span className="text-xs font-bold px-2 py-1 rounded-lg" style={{background:`${acento}25`,color:acento}}>{sesSem}×</span>}
                          <button onClick={()=>cargarChat(c)} className="relative w-7 h-7 rounded-lg bg-white/8 hover:bg-white/15 text-white/50 hover:text-white flex items-center justify-center text-sm transition-all">
                            ✉️
                            {msgsC>0&&<span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white flex items-center justify-center" style={{fontSize:'8px'}}>{msgsC}</span>}
                          </button>
                        </div>
                      </div>
                      {/* Objetivo */}
                      {c.objetivo&&<p className="text-xs text-white/40 mb-2">{c.objetivo.replace(/_/g,' ')}</p>}
                      {/* Lesiones / limitaciones */}
                      {c.lesiones&&c.lesiones!=='ninguna'&&c.lesiones!==''&&(
                        <div className="bg-amber-500/10 rounded-xl px-3 py-2 mb-2">
                          <p className="text-xs text-amber-400 font-semibold mb-0.5">⚡ Limitaciones</p>
                          <p className="text-xs text-amber-300/80">{c.lesiones}</p>
                        </div>
                      )}
                      {/* Alertas */}
                      {alertasC.slice(0,2).map(a=>(
                        <div key={a.id} className="bg-amber-500/10 rounded-xl px-3 py-2 mb-1.5">
                          <p className="text-xs text-amber-400 leading-relaxed">{a.mensaje}</p>
                        </div>
                      ))}
                      {alertasC.length>2&&<p className="text-xs text-amber-500/60 mt-1">+{alertasC.length-2} alertas más</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MENSAJES ── */}
        {tab==='mensajes' && (
          <div className="flex h-[calc(100vh-113px)]">
            {/* Lista clientes */}
            <div className="w-56 border-r border-white/8 overflow-y-auto flex-shrink-0">
              <p className="text-xs text-white/40 font-bold uppercase tracking-wide px-4 pt-4 pb-2">Clientes</p>
              {d.clientes.map(c=>{
                const nl = d.msgsNL.filter(m=>m.cliente_id===c.id).length
                return (
                  <button key={c.id} onClick={()=>cargarChat(c)}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 border-b border-white/5 text-left transition-all ${clienteSel?.id===c.id?'bg-white/10':'hover:bg-white/5'}`}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 relative" style={{background:acento}}>
                      {ini(c.nombre)}
                      {nl>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center" style={{fontSize:'9px'}}>{nl}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.nombre.split(' ')[0]}</p>
                      {c.lesiones&&c.lesiones!=='ninguna'&&c.lesiones!==''&&<p className="text-xs text-amber-500/70 truncate">⚡ {c.lesiones}</p>}
                    </div>
                  </button>
                )
              })}
              {d.clientes.length===0&&<p className="text-xs text-white/20 text-center p-6">Sin clientes</p>}
            </div>

            {/* Chat */}
            {clienteSel ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header chat */}
                <div className="px-5 py-3 border-b border-white/8 flex-shrink-0">
                  <p className="text-sm font-bold text-white">{clienteSel.nombre}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-white/40">{clienteSel.nivel} · {clienteSel.objetivo?.replace(/_/g,' ')}</p>
                    {clienteSel.lesiones&&clienteSel.lesiones!=='ninguna'&&clienteSel.lesiones!==''&&(
                      <span className="text-xs text-amber-400">⚡ {clienteSel.lesiones}</span>
                    )}
                  </div>
                </div>
                {/* Mensajes */}
                <div ref={chatRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {mensajes.length===0&&<p className="text-center text-white/30 text-sm py-8">Sin mensajes aún — escríbele tú primero</p>}
                  {mensajes.map(m=>(
                    <div key={m.id} className={`flex ${m.tipo==='entrenador'?'justify-end':'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.tipo==='entrenador'?'text-white rounded-br-sm':'bg-white/10 text-white/80 rounded-bl-sm'}`}
                        style={m.tipo==='entrenador'?{background:acento}:{}}>
                        {m.contenido}
                        <p className="text-xs mt-1 opacity-50">{new Date(m.created_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Input */}
                <div className="px-5 py-3 border-t border-white/8 flex gap-2 flex-shrink-0">
                  <input value={texto} onChange={e=>setTexto(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar()}}}
                    placeholder={`Escribe a ${clienteSel.nombre.split(' ')[0]}...`}
                    className="flex-1 bg-white/8 text-white text-sm placeholder:text-white/30 px-4 py-2.5 rounded-xl focus:outline-none focus:bg-white/12"/>
                  <button onClick={enviar} disabled={!texto.trim()||enviando}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity flex-shrink-0"
                    style={{background:acento}}>↑</button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/30 text-sm">Selecciona un cliente para ver el chat</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tarjeta de sesión reutilizable ───────────────────────────────────────────
function TarjetaSesion({ s, cMap, alertas, acento, onComplete, onMsg }) {
  const c = cMap[s.cliente_id]
  const alertasC = alertas[s.cliente_id] || []
  const tieneAlerta = alertasC.length > 0
  const tieneLesion = c?.lesiones && c.lesiones !== 'ninguna' && c.lesiones !== ''

  return (
    <div className={`rounded-2xl border transition-all ${s.completada?'bg-white/3 border-white/5 opacity-50':tieneAlerta?'bg-amber-500/5 border-amber-500/20':'bg-white/7 border-white/10'}`}>
      {/* Fila principal */}
      <div className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${s.completada?'bg-white/20':''}`}
          style={s.completada?{}:{background:acento}}>
          {ini(c?.nombre)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-bold truncate ${s.completada?'line-through text-white/40':'text-white'}`}>{c?.nombre||'—'}</p>
            {tieneAlerta && <span className="text-sm flex-shrink-0">⚠️</span>}
            {tieneLesion && <span className="text-sm flex-shrink-0">⚡</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-white/50">{s.hora} · {s.duracion_minutos||60}min</p>
            {c?.nivel&&<span className="text-xs text-white/30">· {c.nivel}</span>}
            {s.tipo==='libre'&&<span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-md text-white/50">libre</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={()=>onMsg(c)}
            className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 text-white/40 hover:text-white flex items-center justify-center text-sm transition-all">
            ✉️
          </button>
          {!s.completada && (
            <button onClick={()=>onComplete(s.id)}
              className="w-8 h-8 rounded-lg bg-white/8 hover:bg-emerald-500/20 hover:text-emerald-400 text-white/30 flex items-center justify-center text-sm transition-all">
              ✓
            </button>
          )}
        </div>
      </div>
      {/* Alertas / lesiones inline */}
      {(tieneLesion || alertasC.length>0) && !s.completada && (
        <div className="px-4 pb-3 space-y-1.5">
          {tieneLesion && (
            <div className="bg-amber-500/10 rounded-xl px-3 py-2">
              <p className="text-xs text-amber-400"><span className="font-semibold">⚡ Limitación:</span> {c.lesiones}</p>
            </div>
          )}
          {alertasC.slice(0,1).map(a=>(
            <div key={a.id} className="bg-amber-500/10 rounded-xl px-3 py-2">
              <p className="text-xs text-amber-400 leading-relaxed">{a.mensaje}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
