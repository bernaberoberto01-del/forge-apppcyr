import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GraficasCliente from '../components/GraficasCliente'

const OBJ = { perdida_grasa:'Pérdida de grasa', ganancia_muscular:'Ganancia muscular', tonificacion:'Tonificación', fuerza:'Fuerza', rendimiento:'Rendimiento', cambio_rapido_30dias:'Cambio 30 días' }

// ─── Mini componente: marcador de sesiones online ───────────────────────────
function SesionesRegistradas({ clienteId, color }) {
  const [sesiones, setSesiones] = useState([])
  const [detalle, setDetalle] = useState(null)
  useEffect(() => {
    supabase.from('sesiones').select('*')
      .eq('cliente_id', clienteId).eq('tipo','online').eq('completada',true)
      .order('fecha',{ascending:false}).limit(10)
      .then(({data})=>setSesiones(data||[]))
  },[clienteId])
  if (!sesiones.length) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-widest">Entrenamientos registrados</p>
      {sesiones.map(s=>(
        <div key={s.id}>
          <button onClick={async()=>{
            if(detalle?.id===s.id){setDetalle(null);return}
            const {data:ejes}=await supabase.from('sesion_ejercicios').select('*').eq('sesion_id',s.id).order('orden')
            setDetalle({...s,ejercicios:ejes||[]})
          }} className="w-full bg-white rounded-2xl border border-black/6 px-4 py-3 flex items-center gap-3 text-left hover:border-black/12 transition-all">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0" style={{background:color}}>💪</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0A0A0A]">{new Date(s.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</p>
              <p className="text-xs text-[#6B6B6B]">{s.duracion_minutos||60}min · RPE {s.rpe||'—'}/10</p>
            </div>
            <span className="text-[#6B6B6B] text-xs">{detalle?.id===s.id?'▲':'▼'}</span>
          </button>
          {detalle?.id===s.id&&(
            <div className="bg-white border border-black/6 border-t-0 rounded-b-2xl px-4 pb-4 space-y-3 -mt-2 pt-2">
              <div className="flex gap-2 flex-wrap">
                {s.rpe&&<span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full font-medium">RPE {s.rpe}/10</span>}
                {s.fatiga_post&&<span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-medium">Fatiga {s.fatiga_post}/5</span>}
                {s.duracion_minutos&&<span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">⏱ {s.duracion_minutos}min</span>}
              </div>
              {detalle.ejercicios?.length>0&&(
                <div className="space-y-2">
                  {detalle.ejercicios.map((ej,i)=>(
                    <div key={i} className="border border-black/6 rounded-xl p-3">
                      <p className="text-sm font-semibold text-[#0A0A0A] mb-2">{ej.ejercicio_nombre}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {(ej.sets||[]).filter(s=>s.peso||s.completado).map((s,j)=>(
                          <div key={j} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${s.completado?'bg-emerald-50 text-emerald-700':'bg-[#F5F5F0] text-[#6B6B6B]'}`}>
                            {s.peso?`${s.peso}kg`:'—'} × {s.reps||'—'}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {s.sensaciones&&<div className="bg-amber-50 rounded-xl p-3"><p className="text-xs font-semibold text-amber-700 mb-1">Sensaciones</p><p className="text-sm text-amber-800">{s.sensaciones}</p></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Portal principal ────────────────────────────────────────────────────────
export default function PortalCliente() {
  const [searchParams] = useSearchParams()
  const [clienteSession, setClienteSession] = useState(undefined)
  const [clienteId, setClienteId] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('inicio')
  const [rutina, setRutina] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [pagos, setPagos] = useState([])
  const [mensajes, setMensajes] = useState([])
  const [mensajesLeidos, setMensajesLeidos] = useState(false)
  const [configEntrenador, setConfigEntrenador] = useState(null)
  const [planNutricion, setPlanNutricion] = useState(null)
  const [tieneCuestNutricion, setTieneCuestNutricion] = useState(false)
  const [tareasExtra, setTareasExtra] = useState([])
  const [diaActivoNutr, setDiaActivoNutr] = useState(0)
  const [cancelando, setCancelando] = useState(null)
  const [motivoCancel, setMotivoCancel] = useState('')
  const [sesionesPortal, setSesionesPortal] = useState([])
  const [pendientesValorar, setPendientesValorar] = useState([])
  const [valorando, setValorando] = useState(null)
  const [rpeVal, setRpeVal] = useState(7)
  const [fatigaVal, setFatigaVal] = useState(2)
  const [sensacionesVal, setSensacionesVal] = useState('')
  const [guardandoValoracion, setGuardandoValoracion] = useState(false)
  const [entrenadoresSesion, setEntrenadoresSesion] = useState({})
  const [textoMsg, setTextoMsg] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [tipoFoto, setTipoFoto] = useState('frontal')
  const [pesoFoto, setPesoFoto] = useState('')
  const [errorFoto, setErrorFoto] = useState('')
  const [fotos, setFotos] = useState([])
  const [subTabProgreso, setSubTabProgreso] = useState('peso')
  const [medidas, setMedidas] = useState({})
  const [historialMedidas, setHistorialMedidas] = useState([])
  const [marcas, setMarcas] = useState([])
  const [formMarca, setFormMarca] = useState({ ejercicio:'', peso_kg:'', reps:'', notas:'' })
  const [formPerfil, setFormPerfil] = useState(null)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [toastPortal, setToastPortal] = useState('')

  function mostrarToast(msg) {
    setToastPortal(msg)
    setTimeout(() => setToastPortal(''), 3500)
  }
  const mensajesEndRef = useRef(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setClienteSession(session?.user||null))
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setClienteSession(s?.user||null))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(clienteSession===undefined) return
    if(!clienteSession){setLoading(false);return}
    async function cargar(){
      setLoading(true); setNotFound(false); setCliente(null)
      const {data:cl,error}=await supabase.from('clientes').select('*').eq('auth_user_id',clienteSession.id).maybeSingle()
      if(error||!cl){setNotFound(true);setLoading(false);return}
      const cid=cl.id; setCliente(cl); setClienteId(cid)
      const [ru,ci,pg,ms,ft,pn,cfg,mc,meds,tieneCuest]=await Promise.all([
        supabase.from('rutinas').select('*').eq('cliente_id',cid).eq('estado','publicada').order('created_at',{ascending:false}).limit(1).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('checkins').select('*').eq('cliente_id',cid).order('fecha',{ascending:false}).limit(12).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('pagos').select('*').eq('cliente_id',cid).order('fecha_pago',{ascending:false}).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('mensajes_cliente').select('*').eq('cliente_id',cid).order('created_at',{ascending:true}).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('fotos_progreso').select('*').eq('cliente_id',cid).eq('visible_cliente',true).order('fecha',{ascending:false}).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('planes_nutricion').select('*').eq('cliente_id',cid).eq('estado','publicado').order('created_at',{ascending:false}).limit(1).then(r=>r.data?.[0]||null).catch(()=>null),
        supabase.from('configuracion').select('nombre_entrenador,foto_url,nombre_negocio,color_acento').eq('entrenador_id',cl.entrenador_id).single().then(r=>r.data||null).catch(()=>null),
        supabase.from('marcas_cliente').select('*').eq('cliente_id',cid).order('fecha',{ascending:false}).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('medidas_cliente').select('*').eq('cliente_id',cid).order('fecha',{ascending:false}).then(r=>r.data||[]).catch(()=>[]),
        supabase.from('cuestionarios_nutricion').select('id').eq('cliente_id',cid).limit(1).then(r=>!!(r.data?.length)).catch(()=>false),
      ])
      setRutina(ru[0]||null); setCheckins(ci); setPagos(pg)
      setMensajes(ms.map(m => m.tipo === 'entrenador' ? {...m, leido: true} : m))
      setFotos(ft); setPlanNutricion(pn); if(cfg)setConfigEntrenador(cfg)
      setMarcas(mc); setHistorialMedidas(meds); setTieneCuestNutricion(tieneCuest)
      const now=new Date(); const hoy=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
      const {data:sesFut}=await supabase.from('sesiones').select('*').eq('cliente_id',cid).gte('fecha',hoy).eq('cancelada',false).order('fecha').order('hora').limit(8)
      setSesionesPortal(sesFut||[])
      const hace7=new Date(now.getTime()-7*864e5); const hace7Str=`${hace7.getFullYear()}-${String(hace7.getMonth()+1).padStart(2,'0')}-${String(hace7.getDate()).padStart(2,'0')}`
      const {data:sesPend}=await supabase.from('sesiones').select('*').eq('cliente_id',cid).eq('tipo','presencial')
        .gte('fecha',hace7Str).lte('fecha',hoy).eq('cancelada',false).is('rpe',null).order('fecha',{ascending:false}).limit(3)
      setPendientesValorar(sesPend||[])
      if (cl.tipo === 'presencial') {
        const { data: tareas } = await supabase.from('tareas_extra').select('*').eq('cliente_id', cid).eq('activa', true).order('orden')
        setTareasExtra(tareas||[])
      }
      const idsEntrenadores=[...new Set((sesFut||[]).map(s=>s.entrenador_id).filter(id=>id&&id!==cl.entrenador_id))]
      if(idsEntrenadores.length){
        const {data:otrosCfg}=await supabase.from('configuracion').select('entrenador_id,nombre_entrenador,color_acento').in('entrenador_id',idsEntrenadores)
        const mapa={}
        ;(otrosCfg||[]).forEach(c=>{mapa[c.entrenador_id]=c})
        setEntrenadoresSesion(mapa)
      }
      setLoading(false)
    }
    cargar()
  },[clienteSession])

  useEffect(()=>{
    if(tab==='mensajes'&&mensajes.length&&!mensajesLeidos){
      supabase.from('mensajes_cliente').update({leido:true}).eq('cliente_id',clienteId).eq('leido',false)
      setMensajes(prev => prev.map(m => ({...m, leido: true})))
      setMensajesLeidos(true)
    }
    if(tab==='mensajes') setTimeout(()=>mensajesEndRef.current?.scrollIntoView({behavior:'smooth'}),100)
  },[tab,mensajes])

  const color = configEntrenador?.color_acento||'#FF5C00'
  const mensajesNoLeidos = mensajes.filter(m=>!m.leido&&m.tipo==='entrenador').length

  async function guardarValoracion(){
    if(!valorando) return
    setGuardandoValoracion(true)
    const { error } = await supabase.from('sesiones').update({
      rpe: rpeVal, fatiga_post: fatigaVal, sensaciones: sensacionesVal||null, completada: true
    }).eq('id', valorando.id)
    setGuardandoValoracion(false)
    if(!error){
      setPendientesValorar(prev => prev.filter(s => s.id !== valorando.id))
      setValorando(null); setRpeVal(7); setFatigaVal(2); setSensacionesVal('')
    }
  }

  async function enviarMensaje(){
    if(!textoMsg.trim()||enviandoMsg) return
    setEnviandoMsg(true)
    await supabase.functions.invoke('portal-accion',{body:{accion:'enviar_mensaje',datos:{contenido:textoMsg.trim()}}}).catch(()=>{})
    setTextoMsg('')
    const {data}=await supabase.from('mensajes_cliente').select('*').eq('cliente_id',clienteId).order('created_at',{ascending:true})
    setMensajes(data||[])
    setEnviandoMsg(false)
    setTimeout(()=>mensajesEndRef.current?.scrollIntoView({behavior:'smooth'}),100)
  }

  async function subirFoto(e){
    const file=e.target.files?.[0]; if(!file) return
    if(file.size>10*1024*1024){setErrorFoto('Máximo 10MB');return}
    setSubiendoFoto(true); setErrorFoto('')
    try{
      const ext=file.name.split('.').pop()
      const path=`${clienteId}/${Date.now()}_${tipoFoto}.${ext}`
      const {error:ue}=await supabase.storage.from('progress-photos').upload(path,file)
      if(ue)throw new Error(ue.message)
      const {data:{publicUrl}}=supabase.storage.from('progress-photos').getPublicUrl(path)
      await supabase.from('fotos_progreso').insert({entrenador_id:cliente.entrenador_id,cliente_id:clienteId,url:publicUrl,fecha:new Date().toISOString().split('T')[0],tipo:tipoFoto,peso:pesoFoto?Number(pesoFoto):null,visible_cliente:true})
      const {data}=await supabase.from('fotos_progreso').select('*').eq('cliente_id',clienteId).order('fecha',{ascending:false})
      setFotos(data||[]); setPesoFoto('')
    }catch(err){setErrorFoto(err.message)}
    setSubiendoFoto(false); e.target.value=''
  }

  // ── Guards ──────────────────────────────────────────────────────────────────
  if(clienteSession===undefined||loading) return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#F7F6F3'}}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor:color,borderTopColor:'transparent'}}/>
    </div>
  )
  if(notFound||!clienteSession) return(
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'#F7F6F3'}}>
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">🔗</p>
        <p className="text-[#0A0A0A] font-bold text-lg mb-2">Cuenta no asociada</p>
        <p className="text-[#6B6B6B] text-sm mb-6">Usa el mismo email que tu entrenador tiene registrado.</p>
        <button onClick={()=>supabase.auth.signOut()} className="text-sm font-semibold px-4 py-2 rounded-xl text-white" style={{background:color}}>Cerrar sesión</button>
      </div>
    </div>
  )
  if(!cliente) return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#F7F6F3'}}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor:color,borderTopColor:'transparent'}}/>
    </div>
  )

  const TABS=[
    {id:'inicio',label:'Inicio',icon:'⊞'},
    {id:'rutina',label:'Rutina',icon:'💪'},
    {id:'progreso',label:'Progreso',icon:'📈'},
    {id:'mensajes',label:'Mensajes',icon:'✉️',badge:mensajesNoLeidos},
    ...(planNutricion||cliente?.nutricion_activa||tieneCuestNutricion?[{id:'nutricion',label:'Nutrición',icon:'🥗'}]:[]),
    ...(pagos.length>0?[{id:'pagos',label:'Pagos',icon:'💳'}]:[]),
    {id:'ajustes',label:'Ajustes',icon:'⚙️'},
  ]

  // ── Layout ──────────────────────────────────────────────────────────────────
  return(
    <div className="min-h-screen" style={{background:'#F7F6F3'}}>

      {/* Toast portal */}
      {toastPortal && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#111] text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl">
          {toastPortal}
        </div>
      )}

      {/* ── Sidebar desktop / Header mobile ── */}
      {/* Mobile: header top */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-black/8">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:color}}>
              {(cliente?.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-[#6B6B6B] leading-none">{configEntrenador?.nombre_negocio||'Tu entrenador'}</p>
              <p className="text-sm font-bold text-[#0A0A0A] leading-tight">{cliente?.nombre?.split(' ')[0]}</p>
            </div>
          </div>
          <button onClick={()=>supabase.auth.signOut()} className="text-xs text-[#6B6B6B] font-medium px-3 py-1.5 rounded-lg border border-black/10 hover:bg-[#F7F6F3]">Salir</button>
        </div>
        {/* Mobile tabs scroll */}
        <div className="flex overflow-x-auto scrollbar-none border-t border-black/5">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex-shrink-0 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all relative whitespace-nowrap ${tab===t.id?'border-b-2 text-[#0A0A0A]':'border-transparent text-[#6B6B6B]'}`}
              style={tab===t.id?{borderBottomColor:color}:{}}>
              {t.label}
              {t.badge>0&&<span className="absolute top-1.5 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-bold" style={{background:color}}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="md:flex md:min-h-screen">

        {/* ── Sidebar desktop ── */}
        <aside className="hidden md:flex md:flex-col md:w-60 md:flex-shrink-0 md:sticky md:top-0 md:h-screen bg-white border-r border-black/8">
          {/* Logo / nombre */}
          <div className="px-6 py-6 border-b border-black/6">
            <p className="text-xs text-[#6B6B6B] font-medium mb-1">{configEntrenador?.nombre_negocio||'Tu entrenador'}</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{background:color}}>
                {(cliente?.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0A0A0A] truncate">{cliente?.nombre}</p>
                <p className="text-xs text-[#6B6B6B] capitalize">{OBJ[cliente?.objetivo]||cliente?.objetivo||'Cliente'}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative text-left ${tab===t.id?'text-white':'text-[#6B6B6B] hover:bg-[#F7F6F3] hover:text-[#0A0A0A]'}`}
                style={tab===t.id?{background:color}:{}}>
                <span className="text-base w-5 text-center flex-shrink-0">{t.icon}</span>
                <span>{t.label}</span>
                {t.badge>0&&<span className="ml-auto w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:color}}>{t.badge}</span>}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-3 py-4 border-t border-black/6">
            <button onClick={()=>supabase.auth.signOut()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6B6B6B] hover:bg-[#F7F6F3] hover:text-[#0A0A0A] transition-all text-left">
              <span className="text-base w-5 text-center">↩</span>
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Contenido principal ── */}
        <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* ══ INICIO ══════════════════════════════════════════════════════ */}
            {tab==='inicio'&&(
              <>
                {/* Bienvenida */}
                <div className="rounded-2xl p-6 text-white" style={{background:`linear-gradient(135deg, ${color}, ${color}cc)`}}>
                  <p className="text-white/70 text-sm mb-1">Bienvenido/a</p>
                  <p className="text-2xl font-bold">{cliente?.nombre?.split(' ')[0]} 👋</p>
                  <p className="text-white/70 text-sm mt-2">{OBJ[cliente?.objetivo]||'Tu plan personalizado te espera'}</p>
                </div>

                {/* Sesiones presenciales pendientes de valorar */}
                {cliente?.tipo==='presencial'&&pendientesValorar.map(s=>(
                  <button key={s.id} onClick={()=>setValorando(s)}
                    className="w-full bg-white rounded-2xl border-2 p-5 text-left transition-all hover:shadow-sm" style={{borderColor:color}}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:`${color}15`}}>💪</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#0A0A0A]">¿Cómo fue tu entreno del {new Date(s.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'})}?</p>
                        <p className="text-xs text-[#6B6B6B] mt-0.5">Cuéntanos el esfuerzo y la fatiga · 20 segundos</p>
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0" style={{color}}>Valorar →</span>
                    </div>
                  </button>
                ))}

                {/* Aviso fotos de progreso desactualizadas */}
                {(() => {
                  const ultimaFoto = fotos[0]?.fecha
                  const diasSinFoto = ultimaFoto ? Math.floor((Date.now()-new Date(ultimaFoto+'T12:00').getTime())/864e5) : 999
                  if (diasSinFoto < 30) return null
                  return (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      <span className="text-lg flex-shrink-0">📸</span>
                      <p className="text-xs text-amber-700 flex-1">{diasSinFoto>900?'Aún no has subido ninguna foto de progreso':`Llevas ${diasSinFoto} días sin subir una foto de progreso`} — ayuda a ver los cambios reales.</p>
                      <button onClick={()=>{setTab('progreso');setSubTabProgreso('fotos')}} className="text-xs font-semibold text-amber-700 flex-shrink-0">Subir →</button>
                    </div>
                  )
                })()}

                {/* Trabajo extra (presencial) */}
                {cliente?.tipo==='presencial'&&tareasExtra.length>0&&(
                  <div className="bg-white rounded-2xl border border-black/6 p-5">
                    <p className="text-sm font-bold text-[#0A0A0A] mb-1">💡 Tu trabajo extra</p>
                    <p className="text-xs text-[#6B6B6B] mb-3">Para complementar tus sesiones presenciales</p>
                    <div className="space-y-2">
                      {tareasExtra.map(t=>(
                        <div key={t.id} className="flex items-center gap-3 bg-[#F7F6F3] rounded-xl px-3.5 py-2.5">
                          <span className="text-lg flex-shrink-0">✓</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0A0A0A]">{t.texto}</p>
                            {t.frecuencia&&<p className="text-xs text-[#6B6B6B]">{t.frecuencia}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Próximas sesiones presencial */}
                {cliente?.tipo==='presencial'&&sesionesPortal.length>0&&(
                  <div className="bg-white rounded-2xl border border-black/6 p-5">
                    <p className="text-sm font-bold text-[#0A0A0A] mb-3">📅 Próximas sesiones</p>
                    <div className="space-y-2">
                      {sesionesPortal.slice(0,4).map(s=>{
                        const esHoy=s.fecha===new Date().toISOString().split('T')[0]
                        const esMañana=s.fecha===new Date(Date.now()+864e5).toISOString().split('T')[0]
                        const label=esHoy?'Hoy':esMañana?'Mañana':new Date(s.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})
                        const otroEntrenador=s.entrenador_id&&s.entrenador_id!==cliente?.entrenador_id?entrenadoresSesion[s.entrenador_id]:null
                        return(
                          <div key={s.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${esHoy?'bg-orange-50 border-orange-200':'bg-[#F7F6F3] border-transparent'}`}>
                            <div className="flex-1">
                              <p className={`text-sm font-semibold ${esHoy?'':'text-[#0A0A0A]'}`} style={esHoy?{color}:{}}>{label}</p>
                              <p className="text-xs text-[#6B6B6B]">{s.hora} · {s.duracion_minutos||60}min</p>
                              {otroEntrenador&&(
                                <p className="text-xs font-medium mt-0.5 flex items-center gap-1.5" style={{color:otroEntrenador.color_acento||'#FF5C00'}}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{background:otroEntrenador.color_acento||'#FF5C00'}} />
                                  Con {otroEntrenador.nombre_entrenador||'tu entrenador'}
                                </p>
                              )}
                            </div>
                            <button onClick={()=>setCancelando(s)} className="text-xs text-[#6B6B6B] border border-black/10 px-3 py-1.5 rounded-lg hover:border-red-300 hover:text-red-500 transition-all bg-white">Cancelar</button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Gráfica de progreso — motivación principal */}
                {checkins.length >= 2 ? (() => {
                  const pesosConFecha = checkins.slice().reverse().filter(c => c.peso)
                  const primero = checkins[checkins.length - 1]
                  const ultimo = checkins[0]
                  const diff = primero.peso && ultimo.peso ? +(ultimo.peso - primero.peso).toFixed(1) : null
                  const bajando = diff !== null && diff < 0
                  const subiendo = diff !== null && diff > 0
                  const sem = primero.fecha && ultimo.fecha
                    ? Math.ceil((new Date(ultimo.fecha) - new Date(primero.fecha)) / (7 * 864e5))
                    : null
                  return (
                    <button onClick={() => setTab('progreso')}
                      className="w-full bg-white rounded-2xl border border-black/6 p-5 text-left hover:border-black/12 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-widest mb-1">Tu progreso</p>
                          {diff !== null && (
                            <p className="text-3xl font-bold" style={{color: bajando ? '#10b981' : subiendo ? '#6366f1' : '#0A0A0A'}}>
                              {bajando ? '' : '+'}{diff}kg
                            </p>
                          )}
                          {sem && <p className="text-xs text-[#6B6B6B] mt-0.5">en {sem} semana{sem !== 1 ? 's' : ''}</p>}
                        </div>
                        <span className="text-[#6B6B6B] text-sm">Ver todo →</span>
                      </div>
                      {/* Mini gráfica de barras */}
                      {pesosConFecha.length > 1 && (
                        <div className="flex items-end gap-1 h-14">
                          {pesosConFecha.map((c, i) => {
                            const min = Math.min(...pesosConFecha.map(x => x.peso))
                            const max = Math.max(...pesosConFecha.map(x => x.peso))
                            const h = max === min ? 60 : ((c.peso - min) / (max - min)) * 70 + 30
                            const isLast = i === pesosConFecha.length - 1
                            return (
                              <div key={c.id} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full rounded-sm transition-all"
                                  style={{ height: `${h}%`, background: isLast ? color : `${color}35` }} />
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <div className="flex justify-between mt-2">
                        <p className="text-xs text-[#6B6B6B]">{primero.peso && `${primero.peso}kg`}</p>
                        <p className="text-xs font-semibold" style={{color}}>{ultimo.peso && `${ultimo.peso}kg`}</p>
                      </div>
                    </button>
                  )
                })() : (
                  <button onClick={() => setTab('progreso')}
                    className="w-full bg-white rounded-2xl border border-black/6 p-5 text-left hover:border-black/12 hover:shadow-sm transition-all">
                    <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-widest mb-2">Tu progreso</p>
                    <p className="text-sm text-[#6B6B6B]">Completa tu primer check-in para ver tu evolución aquí</p>
                  </button>
                )}

                {/* Card check-ins */}
                <button onClick={()=>setTab('progreso')} className="bg-white rounded-2xl border border-black/6 p-5 text-left hover:border-black/12 hover:shadow-sm transition-all">
                  <p className="text-2xl mb-2">📊</p>
                  <p className="text-2xl font-bold text-[#0A0A0A]">{checkins.length}</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">Check-ins realizados</p>
                </button>

                {/* Acciones online */}
                {cliente?.tipo==='online'&&(() => {
                  const diasSin = checkins[0]?.fecha ? Math.floor((Date.now()-new Date(checkins[0].fecha+'T12:00').getTime())/864e5) : 999
                  const urgente = diasSin >= 7
                  return (
                  <div className="grid grid-cols-2 gap-3">
                    <a href="/seguimiento"
                      className={`rounded-2xl p-5 flex flex-col items-start active:scale-95 transition-all ${urgente?'ring-2 ring-offset-2 animate-pulse':''}`}
                      style={{background: urgente?'#ef4444':color, ...(urgente?{'--tw-ring-color':'#ef4444'}:{})}}>
                      <span className="text-2xl mb-2">{urgente?'⏰':'📋'}</span>
                      <p className="text-sm font-bold text-white">Check-in semanal</p>
                      <p className="text-xs text-white/70 mt-0.5">{urgente ? (diasSin>900?'Aún no has hecho ninguno':`${diasSin} días sin registrar`) : 'Cómo te encuentras'}</p>
                    </a>
                    <a href="/sesion"
                      className="bg-[#111] rounded-2xl p-5 flex flex-col items-start active:scale-95 transition-all">
                      <span className="text-2xl mb-2">🏋️</span>
                      <p className="text-sm font-bold text-white">Registrar entreno</p>
                      <p className="text-xs text-white/50 mt-0.5">Apunta el entreno de hoy</p>
                    </a>
                  </div>
                  )
                })()}

                {/* Check-in presencial */}
                {cliente?.tipo==='presencial'&&(() => {
                  const diasSin = checkins[0]?.fecha ? Math.floor((Date.now()-new Date(checkins[0].fecha+'T12:00').getTime())/864e5) : 999
                  const urgente = diasSin >= 7
                  return (
                  <a href="/seguimiento"
                    className={`flex items-center gap-4 rounded-2xl p-5 active:scale-95 transition-all ${urgente?'ring-2 ring-offset-2 animate-pulse':''}`}
                    style={{background: urgente?'#ef4444':color, ...(urgente?{'--tw-ring-color':'#ef4444'}:{})}}>
                    <span className="text-3xl">{urgente?'⏰':'📋'}</span>
                    <div>
                      <p className="text-sm font-bold text-white">Check-in semanal</p>
                      <p className="text-xs text-white/70">{urgente ? (diasSin>900?'Aún no has hecho ninguno — ¡empecemos!':`Llevas ${diasSin} días sin contarme cómo vas`) : 'Cuéntame cómo va la semana'}</p>
                    </div>
                    <span className="ml-auto text-white/70">→</span>
                  </a>
                  )
                })()}

                {/* Último check-in */}
                {checkins[0]&&(
                  <div className="bg-white rounded-2xl border border-black/6 p-5">
                    <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-widest mb-3">Último check-in · {new Date(checkins[0].fecha).toLocaleDateString('es-ES',{day:'numeric',month:'long'})}</p>
                    <div className="flex gap-2 flex-wrap">
                      {checkins[0].peso&&<span className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full font-medium">⚖️ {checkins[0].peso}kg</span>}
                      {checkins[0].energia&&<span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium">⚡ Energía {checkins[0].energia}/10</span>}
                      {checkins[0].motivacion&&<span className="text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full font-medium">💫 Motivación {checkins[0].motivacion}/7</span>}
                    </div>
                  </div>
                )}

                {/* Modal cancelar sesión */}
                {cancelando&&(
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={()=>{setCancelando(null);setMotivoCancel('')}}>
                    <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e=>e.stopPropagation()}>
                      <h3 className="font-bold text-[#0A0A0A] text-lg mb-1">¿Cancelar sesión?</h3>
                      <p className="text-sm text-[#6B6B6B] mb-4">{new Date(cancelando.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})} · {cancelando.hora}</p>
                      <textarea value={motivoCancel} onChange={e=>setMotivoCancel(e.target.value)} rows={2} placeholder="Motivo (opcional)" className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none mb-3 resize-none" style={{'--tw-ring-color':color}}/>
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5 mb-4">⚠ Tu entrenador recibirá una notificación</p>
                      <div className="flex gap-2">
                        <button onClick={()=>{setCancelando(null);setMotivoCancel('')}} className="flex-1 border border-black/10 text-sm py-3 rounded-xl text-[#6B6B6B] font-medium">Volver</button>
                        <button onClick={async()=>{
                          await supabase.functions.invoke('portal-accion',{body:{accion:'cancelar_sesion',datos:{sesion_id:cancelando.id,motivo:motivoCancel}}})
                          setSesionesPortal(prev=>prev.filter(s=>s.id!==cancelando.id))
                          setCancelando(null);setMotivoCancel('')
                        }} className="flex-1 text-white text-sm font-semibold py-3 rounded-xl" style={{background:'#ef4444'}}>Confirmar</button>
                      </div>
                    </div>
                  </div>
                )}

                {valorando&&(
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={()=>setValorando(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                      <h3 className="font-bold text-[#0A0A0A] text-lg mb-1">¿Cómo fue tu entreno?</h3>
                      <p className="text-sm text-[#6B6B6B] mb-5">{new Date(valorando.fecha+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</p>

                      <p className="text-sm font-bold text-[#0A0A0A] mb-1">Esfuerzo percibido (RPE): <span style={{color}}>{rpeVal}/10</span></p>
                      <p className="text-xs text-[#6B6B6B] mb-3">1 = Muy suave · 10 = Al máximo</p>
                      <div className="flex gap-1.5 flex-wrap mb-5">
                        {[1,2,3,4,5,6,7,8,9,10].map(v=>(
                          <button key={v} type="button" onClick={()=>setRpeVal(v)}
                            className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                            style={rpeVal===v?{background:color,color:'white'}:{background:'#F5F5F0',color:'#6B6B6B'}}>{v}</button>
                        ))}
                      </div>

                      <p className="text-sm font-bold text-[#0A0A0A] mb-1">Fatiga muscular: <span style={{color}}>{fatigaVal}/5</span></p>
                      <p className="text-xs text-[#6B6B6B] mb-3">1 = Fresco · 5 = Muy fatigado</p>
                      <div className="flex gap-1.5 mb-5">
                        {[1,2,3,4,5].map(v=>(
                          <button key={v} type="button" onClick={()=>setFatigaVal(v)}
                            className="flex-1 h-10 rounded-lg text-sm font-bold transition-all"
                            style={fatigaVal===v?{background: v>=4?'#ef4444':color,color:'white'}:{background:'#F5F5F0',color:'#6B6B6B'}}>{v}</button>
                        ))}
                      </div>

                      <textarea value={sensacionesVal} onChange={e=>setSensacionesVal(e.target.value)} rows={2}
                        placeholder="¿Alguna sensación o molestia que contar? (opcional)"
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none mb-5 resize-none"/>

                      <div className="flex gap-2">
                        <button onClick={()=>setValorando(null)} className="flex-1 border border-black/10 text-sm py-3 rounded-xl text-[#6B6B6B] font-medium">Ahora no</button>
                        <button onClick={guardarValoracion} disabled={guardandoValoracion}
                          className="flex-1 text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-50" style={{background:color}}>
                          {guardandoValoracion?'Guardando...':'Guardar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ══ RUTINA ══════════════════════════════════════════════════════ */}
            {tab==='rutina'&&(
              <>
                {!rutina?(
                  <div className="bg-white rounded-2xl border border-black/6 p-12 text-center">
                    <p className="text-5xl mb-4">💪</p>
                    <p className="font-bold text-[#0A0A0A] text-lg">Tu plan está en preparación</p>
                    <p className="text-sm text-[#6B6B6B] mt-2">Tu entrenador está personalizando tu rutina</p>
                  </div>
                ):(
                  <>
                    <div className="rounded-2xl p-5 text-white" style={{background: rutina.tipo==='evaluacion' ? '#6366f1' : color}}>
                      {rutina.tipo==='evaluacion' && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">📋 SESIÓN DE EVALUACIÓN</span>
                        </div>
                      )}
                      <p className="font-bold text-lg">{rutina.nombre||'Tu rutina personalizada'}</p>
                      <p className="text-white/70 text-sm mt-1">
                        {rutina.tipo==='evaluacion'
                          ? 'Completa los tests y registra tus marcas — esto personaliza tu programa'
                          : `${(rutina.borrador?.dias||rutina.contenido?.dias||[]).length} días · ${rutina.semanas||4} semanas`
                        }
                      </p>
                    </div>
                    {(rutina.borrador?.dias||rutina.contenido?.dias||[]).map((dia,di)=>(
                      <div key={di} className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-black/6 bg-[#F7F6F3]">
                          <p className="font-semibold text-[#0A0A0A] text-sm">{dia.nombre||dia.dia}</p>
                        </div>
                        <div className="divide-y divide-black/5">
                          {(()=>{
                            const ejercicios = dia.ejercicios||[]
                            // Agrupar por campo agrupacion
                            const grupos = []
                            const vistos = new Set()
                            ejercicios.forEach((ej) => {
                              if (!ej.agrupacion) { grupos.push({ tipo:'single', ejercicios:[ej] }); return }
                              const clave = ej.agrupacion.replace(/\d+$/,'') // A1,A2 → A
                              if (vistos.has(clave)) return
                              vistos.add(clave)
                              const miembros = ejercicios.filter((e) => e.agrupacion?.startsWith(clave))
                              const tipo = miembros.length === 2 ? 'biserie' : miembros.length === 3 ? 'triserie' : 'circuito'
                              grupos.push({ tipo, clave, ejercicios: miembros })
                            })
                            return grupos.map((grupo, gi) => (
                              <div key={gi}>
                                {grupo.tipo !== 'single' && (
                                  <div className="px-5 pt-3 pb-1 flex items-center gap-2">
                                    <div className="h-px flex-1 bg-black/5"/>
                                    <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                      style={{background:`${color}15`,color}}>
                                      {grupo.tipo === 'biserie' ? '↕ Biserie' : grupo.tipo === 'triserie' ? '↕ Triserie' : '↕ Circuito'}
                                    </span>
                                    <div className="h-px flex-1 bg-black/5"/>
                                  </div>
                                )}
                                {grupo.ejercicios.map((ej, ei) => (
                                  <div key={ei} className={`px-5 py-3 flex items-start gap-3 ${grupo.tipo !== 'single' && ei < grupo.ejercicios.length-1 ? 'border-l-2 ml-5 pl-4 border-dashed' : ''}`}
                                    style={grupo.tipo !== 'single' && ei < grupo.ejercicios.length-1 ? {borderColor:`${color}40`} : {}}>
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                                      style={{background: grupo.tipo !== 'single' ? `${color}90` : color}}>
                                      {ej.agrupacion || (gi+1)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-[#0A0A0A]">{ej.nombre}</p>
                                      {ej.notas&&<p className="text-xs text-[#6B6B6B] mt-0.5">{ej.notas}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-sm font-bold" style={{color}}>{ej.series}×{ej.reps}</p>
                                      {ej.descanso && ej.descanso !== '-' && <p className="text-xs text-[#6B6B6B]">💤 {ej.descanso}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {/* ══ PROGRESO ════════════════════════════════════════════════════ */}
            {tab==='progreso'&&(
              <>
                {/* Subtabs */}
                <div className="flex gap-2 bg-white rounded-2xl border border-black/6 p-1.5">
                  {[['peso','⚖️ Peso'],['medidas','📏 Medidas'],['marcas','🏆 Marcas'],['fotos','📸 Fotos']].map(([id,label])=>(
                    <button key={id} onClick={()=>setSubTabProgreso(id)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${subTabProgreso===id?'text-white shadow-sm':'text-[#6B6B6B] hover:text-[#0A0A0A]'}`}
                      style={subTabProgreso===id?{background:color}:{}}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Peso */}
                {subTabProgreso==='peso'&&(
                  <>
                    {checkins.length>=2&&(()=>{
                      const ultimo=checkins[0],primero=checkins[checkins.length-1]
                      const diff=ultimo.peso&&primero.peso?+(ultimo.peso-primero.peso).toFixed(1):null
                      const sem=Math.ceil((new Date(ultimo.fecha)-new Date(primero.fecha))/(7*864e5))
                      const bajando=diff!==null&&diff<0
                      const enMedia=(arr,k)=>(arr.filter(c=>c[k]).reduce((s,c)=>s+c[k],0)/(arr.filter(c=>c[k]).length||1)).toFixed(1)
                      return(
                        <div className="rounded-2xl p-6 text-white" style={{background:'#111'}}>
                          <p className="text-white/50 text-xs mb-4">Últimas {sem} semanas</p>
                          {diff!==null&&(
                            <div className="flex items-end gap-4 mb-5">
                              <div>
                                <p className="text-5xl font-bold" style={{color:bajando?'#10b981':'#6366f1'}}>{diff>0?'+':''}{diff}kg</p>
                                <p className="text-white/40 text-sm mt-1">{primero.peso}kg → {ultimo.peso}kg</p>
                              </div>
                              <div className="flex-1 flex items-end gap-0.5 h-12">
                                {checkins.slice().reverse().filter(c=>c.peso).map((c,i,arr)=>{
                                  const min=Math.min(...arr.map(x=>x.peso)),max=Math.max(...arr.map(x=>x.peso))
                                  const h=max===min?50:((c.peso-min)/(max-min))*80+20
                                  return<div key={i} className="flex-1 rounded-sm" style={{height:`${h}%`,background:color,opacity:0.6}}/>
                                })}
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-3">
                            {[['⚡',enMedia(checkins,'energia'),'/10','Energía'],['💪',enMedia(checkins,'adherencia_entreno'),'/10','Adherencia'],['📅',checkins.length,'','Check-ins']].map(([ic,v,s,l])=>(
                              <div key={l} className="bg-white/8 rounded-xl p-3 text-center">
                                <p className="text-lg">{ic}</p>
                                <p className="text-white font-bold text-base mt-0.5">{v}{s}</p>
                                <p className="text-white/40 text-xs mt-0.5">{l}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                    <div className="bg-white rounded-2xl border border-black/6 p-5">
                      <p className="text-sm font-bold text-[#0A0A0A] mb-4">Evolución</p>
                      <GraficasCliente clienteId={clienteId}/>
                    </div>
                    {checkins.slice(0,6).map(ci=>(
                      <div key={ci.id} className="bg-white rounded-2xl border border-black/6 p-4">
                        <p className="text-xs font-medium text-[#6B6B6B] mb-2">{new Date(ci.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'long'})}</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {ci.peso&&<span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full">⚖️ {ci.peso}kg</span>}
                          {ci.energia&&<span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">⚡ {ci.energia}/10</span>}
                          {ci.estres&&<span className={`text-xs px-2.5 py-1 rounded-full ${ci.estres>=4?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'}`}>😤 {ci.estres}/5</span>}
                          {ci.motivacion&&<span className="text-xs bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full">💫 {ci.motivacion}/7</span>}
                        </div>
                      </div>
                    ))}
                    {cliente?.tipo==='online'&&<SesionesRegistradas clienteId={clienteId} color={color}/>}
                  </>
                )}

                {/* Medidas */}
                {subTabProgreso==='medidas'&&(
                  <>
                    <div className="bg-white rounded-2xl border border-black/6 p-5">
                      <p className="text-sm font-bold text-[#0A0A0A] mb-4">📏 Registrar medidas</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[['pecho','Pecho'],['cintura','Cintura'],['cadera','Cadera'],['bicep','Bícep'],['muslo','Muslo'],['gemelo','Gemelo']].map(([k,l])=>(
                          <div key={k}>
                            <label className="text-xs text-[#6B6B6B] mb-1 block">{l} (cm)</label>
                            <input type="number" value={medidas[k]||''} onChange={e=>setMedidas(m=>({...m,[k]:e.target.value}))}
                              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none" placeholder="0"
                              onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor=''}/>
                          </div>
                        ))}
                      </div>
                      <button onClick={async()=>{
                        const vals=Object.fromEntries(Object.entries(medidas).filter(([,v])=>v).map(([k,v])=>[k,Number(v)]))
                        if(!Object.keys(vals).length) return
                        await supabase.from('medidas_cliente').insert({entrenador_id:cliente.entrenador_id,cliente_id:clienteId,fecha:new Date().toISOString().split('T')[0],...vals})
                        setMedidas({})
                        const {data}=await supabase.from('medidas_cliente').select('*').eq('cliente_id',clienteId).order('fecha',{ascending:false})
                        setHistorialMedidas(data||[])
                      }} className="w-full mt-4 text-white text-sm font-semibold py-3 rounded-xl transition-all" style={{background:color}}>Guardar medidas</button>
                    </div>
                    {historialMedidas.slice(0,5).map((m,i)=>(
                      <div key={i} className="bg-white rounded-2xl border border-black/6 p-4">
                        <p className="text-xs font-medium text-[#6B6B6B] mb-2">{new Date(m.fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {[['Pecho',m.pecho],['Cintura',m.cintura],['Cadera',m.cadera],['Bícep',m.bicep],['Muslo',m.muslo],['Gemelo',m.gemelo]].filter(([,v])=>v).map(([l,v])=>(
                            <span key={l} className="text-xs bg-[#F7F6F3] text-[#0A0A0A] px-2.5 py-1.5 rounded-full font-medium">{l}: {v}cm</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Marcas */}
                {subTabProgreso==='marcas'&&(
                  <>
                    <div className="bg-white rounded-2xl border border-black/6 p-5">
                      <p className="text-sm font-bold text-[#0A0A0A] mb-4">🏆 Registrar marca personal</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[#6B6B6B] mb-1 block">Ejercicio *</label>
                          <input value={formMarca.ejercicio} onChange={e=>setFormMarca(f=>({...f,ejercicio:e.target.value}))}
                            placeholder="Press banca, Sentadilla, Peso muerto..."
                            className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none"/>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-[#6B6B6B] mb-1 block">Peso (kg)</label>
                            <input type="number" value={formMarca.peso_kg} onChange={e=>setFormMarca(f=>({...f,peso_kg:e.target.value}))}
                              placeholder="80" className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none"/>
                          </div>
                          <div>
                            <label className="text-xs text-[#6B6B6B] mb-1 block">Repeticiones</label>
                            <input type="number" value={formMarca.reps} onChange={e=>setFormMarca(f=>({...f,reps:e.target.value}))}
                              placeholder="1" className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none"/>
                          </div>
                        </div>
                        <input value={formMarca.notas} onChange={e=>setFormMarca(f=>({...f,notas:e.target.value}))}
                          placeholder="Notas (técnica, sensaciones...)"
                          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none"/>
                        <button onClick={async()=>{
                          if(!formMarca.ejercicio.trim()) return
                          await supabase.from('marcas_cliente').insert({entrenador_id:cliente.entrenador_id,cliente_id:cliente.id,ejercicio:formMarca.ejercicio.trim(),peso_kg:formMarca.peso_kg?Number(formMarca.peso_kg):null,reps:formMarca.reps?Number(formMarca.reps):null,notas:formMarca.notas||null,fecha:new Date().toISOString().split('T')[0]})
                          const {data}=await supabase.from('marcas_cliente').select('*').eq('cliente_id',cliente.id).order('fecha',{ascending:false})
                          setMarcas(data||[]); setFormMarca({ejercicio:'',peso_kg:'',reps:'',notas:''})
                        }} disabled={!formMarca.ejercicio.trim()} className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-all" style={{background:color}}>
                          Guardar marca
                        </button>
                      </div>
                    </div>
                    {marcas.length===0?(
                      <div className="bg-white rounded-2xl border border-black/6 p-10 text-center">
                        <p className="text-3xl mb-2">🏆</p>
                        <p className="text-sm text-[#6B6B6B]">Registra tu primera marca personal</p>
                      </div>
                    ):Object.entries(marcas.reduce((acc,m)=>{if(!acc[m.ejercicio])acc[m.ejercicio]=[];acc[m.ejercicio].push(m);return acc},{})).map(([ejercicio,registros])=>{
                      const mejor=registros.reduce((b,r)=>!b||(r.peso_kg>b.peso_kg)?r:b,null)
                      return(
                        <div key={ejercicio} className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                          <div className="px-5 py-4 flex items-center justify-between border-b border-black/6">
                            <p className="font-semibold text-[#0A0A0A]">{ejercicio}</p>
                            {mejor?.peso_kg&&<div className="flex items-center gap-1.5"><span className="text-yellow-400">🏆</span><span className="font-bold text-[#0A0A0A]">{mejor.peso_kg}kg</span>{mejor.reps&&<span className="text-[#6B6B6B] text-sm">× {mejor.reps}</span>}</div>}
                          </div>
                          {registros.filter(r=>r.peso_kg).length>1&&(()=>{
                            const pts=registros.slice().reverse().filter(r=>r.peso_kg)
                            const min=Math.min(...pts.map(x=>x.peso_kg))
                            const max=Math.max(...pts.map(x=>x.peso_kg))
                            const W=300, H=60, pad=8
                            const x=i=>pad+(i/(pts.length-1))*(W-pad*2)
                            const y=v=>H-pad-((v-min)/(max-min||1))*(H-pad*2)
                            const d=pts.map((p,i)=>`${i===0?'M':'L'}${x(i).toFixed(1)},${y(p.peso_kg).toFixed(1)}`).join(' ')
                            return(
                              <div className="px-5 pt-4 pb-2">
                                <div className="flex justify-between text-xs text-[#6B6B6B] mb-1">
                                  <span>{pts[0]?.peso_kg}kg</span>
                                  <span className="font-semibold" style={{color}}>→ {pts[pts.length-1]?.peso_kg}kg</span>
                                </div>
                                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:60}}>
                                  <defs>
                                    <linearGradient id={`grad-${ejercicio.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
                                      <stop offset="100%" stopColor={color} stopOpacity="0"/>
                                    </linearGradient>
                                  </defs>
                                  <path d={`${d} L${x(pts.length-1).toFixed(1)},${H} L${pad},${H} Z`}
                                    fill={`url(#grad-${ejercicio.replace(/\s/g,'')})`}/>
                                  <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  {pts.map((p,i)=>(
                                    <circle key={i} cx={x(i)} cy={y(p.peso_kg)} r="3" fill={i===pts.length-1?color:'white'} stroke={color} strokeWidth="2"/>
                                  ))}
                                </svg>
                                <div className="flex justify-between text-xs text-[#6B6B6B] mt-1">
                                  <span>{new Date(pts[0].fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                                  <span>{new Date(pts[pts.length-1].fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                                </div>
                              </div>
                            )
                          })()}
                          <div className="divide-y divide-black/5">
                            {registros.slice(0,5).map((r,i)=>(
                              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                                <p className="text-xs text-[#6B6B6B]">{new Date(r.fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</p>
                                <div className="flex items-center gap-2">
                                  {r.peso_kg&&<span className="text-sm font-bold text-[#0A0A0A]">{r.peso_kg}kg</span>}
                                  {r.reps&&<span className="text-xs text-[#6B6B6B]">× {r.reps}</span>}
                                  {i===0&&registros[1]?.peso_kg&&r.peso_kg&&(
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.peso_kg>registros[1].peso_kg?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-500'}`}>
                                      {r.peso_kg>registros[1].peso_kg?'+':''}{(r.peso_kg-registros[1].peso_kg).toFixed(1)}kg
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Fotos */}
                {subTabProgreso==='fotos'&&(
                  <>
                    <div className="bg-white rounded-2xl border border-black/6 p-5">
                      <p className="text-sm font-bold text-[#0A0A0A] mb-4">📸 Añadir foto de progreso</p>
                      <div className="flex gap-2 mb-3">
                        {['frontal','lateral','espalda'].map(t=>(
                          <button key={t} onClick={()=>setTipoFoto(t)}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${tipoFoto===t?'text-white':'bg-[#F7F6F3] text-[#6B6B6B]'}`}
                            style={tipoFoto===t?{background:color}:{}}>{t}</button>
                        ))}
                      </div>
                      <input type="number" value={pesoFoto} onChange={e=>setPesoFoto(e.target.value)}
                        placeholder="Peso del día (kg) — opcional"
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none"/>
                      {errorFoto&&<p className="text-red-500 text-xs mb-2">{errorFoto}</p>}
                      <label className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold cursor-pointer transition-all ${subiendoFoto?'opacity-50':''}`} style={{background:color}}>
                        {subiendoFoto?<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Subiendo...</>:<>📷 Seleccionar foto</>}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={subirFoto} disabled={subiendoFoto}/>
                      </label>
                    </div>
                    {fotos.length===0?(
                      <div className="bg-white rounded-2xl border border-black/6 p-10 text-center">
                        <p className="text-3xl mb-2">📷</p>
                        <p className="text-sm text-[#6B6B6B]">Sube tu primera foto de progreso</p>
                      </div>
                    ):Object.entries(fotos.reduce((acc,f)=>{if(!acc[f.fecha])acc[f.fecha]=[];acc[f.fecha].push(f);return acc},{})).map(([fecha,fotosDia])=>(
                      <div key={fecha} className="bg-white rounded-2xl border border-black/6 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-[#0A0A0A]">{new Date(fecha+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long'})}</p>
                          {fotosDia[0]?.peso&&<p className="text-sm font-bold" style={{color}}>{fotosDia[0].peso}kg</p>}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {fotosDia.map(f=>(
                            <div key={f.id} className="relative rounded-xl overflow-hidden aspect-[3/4]">
                              <img src={f.url} alt={f.tipo} className="w-full h-full object-cover"/>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 text-center">
                                <span className="text-white text-xs capitalize font-medium">{f.tipo}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {/* ══ MENSAJES ════════════════════════════════════════════════════ */}
            {tab==='mensajes'&&(
              <div className="flex flex-col" style={{minHeight:'60vh'}}>
                <div className="flex-1 space-y-3 mb-4">
                  {mensajes.filter(m=>m.tipo!=='sistema').length===0?(
                    <div className="bg-white rounded-2xl border border-black/6 p-12 text-center">
                      <p className="text-4xl mb-3">✉️</p>
                      <p className="text-sm font-semibold text-[#0A0A0A]">Aún no hay mensajes</p>
                      <p className="text-xs text-[#6B6B6B] mt-1">Escríbele a tu entrenador</p>
                    </div>
                  ):mensajes.filter(m=>m.tipo!=='sistema').map(m=>(
                    <div key={m.id} className={`flex ${m.tipo==='cliente'?'justify-end':'justify-start'}`}>
                      <div className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-3 ${m.tipo==='cliente'?'rounded-br-sm text-white':'bg-white border border-black/6 text-[#0A0A0A] rounded-bl-sm'}`}
                        style={m.tipo==='cliente'?{background:color}:{}}>
                        {m.tipo!=='cliente'&&<p className="text-xs font-semibold mb-1 opacity-60">{configEntrenador?.nombre_entrenador||'Tu entrenador'}</p>}
                        <p className="text-sm leading-relaxed">{m.contenido}</p>
                        <p className={`text-xs mt-1.5 ${m.tipo==='cliente'?'text-white/50':'text-[#6B6B6B]'}`}>
                          {new Date(m.created_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})} · {new Date(m.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={mensajesEndRef}/>
                </div>
                {/* Input fijo */}
                <div className="sticky bottom-4 md:bottom-0">
                  <div className="flex gap-2 bg-white border border-black/10 rounded-2xl p-2 shadow-lg">
                    <textarea value={textoMsg} onChange={e=>setTextoMsg(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviarMensaje()}}}
                      placeholder="Escribe a tu entrenador... (Enter para enviar)" rows={2}
                      className="flex-1 text-sm resize-none focus:outline-none px-2 py-1.5 text-[#0A0A0A] placeholder:text-[#9B9B9B]"/>
                    <button onClick={enviarMensaje} disabled={!textoMsg.trim()||enviandoMsg}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white self-end disabled:opacity-40 flex-shrink-0 transition-all"
                      style={{background:color}}>
                      {enviandoMsg?<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<span className="text-lg">↑</span>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══ NUTRICIÓN ═══════════════════════════════════════════════════ */}
            {tab==='nutricion'&&(
              <>
                {!planNutricion?(
                  tieneCuestNutricion ? (
                    /* Estado 2: cuestionario respondido, plan en preparación */
                    <div className="bg-white rounded-2xl border border-black/6 p-10 text-center">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl" style={{background:`${color}15`}}>
                        ⏳
                      </div>
                      <p className="font-bold text-[#0A0A0A] text-lg mb-2">Cuestionario recibido</p>
                      <p className="text-sm text-[#6B6B6B] leading-relaxed">Tu entrenador ya tiene tus datos y está preparando tu plan nutricional personalizado. En breve lo verás aquí.</p>
                      <div className="mt-5 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{background:color, animationDelay:'0ms'}}/>
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{background:color, animationDelay:'150ms'}}/>
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{background:color, animationDelay:'300ms'}}/>
                      </div>
                    </div>
                  ) : (
                    /* Estado 1: sin cuestionario todavía */
                    <div className="bg-white rounded-2xl border border-black/6 p-8 text-center">
                      <p className="text-5xl mb-4">🥗</p>
                      <p className="font-bold text-[#0A0A0A] text-lg mb-2">Plan en preparación</p>
                      <p className="text-sm text-[#6B6B6B] mb-6">Rellena el cuestionario para que tu entrenador pueda crear un plan nutricional personalizado para ti.</p>
                      <a href={`https://forge-studio-os.vercel.app/nutricion-cuest?e=${cliente.entrenador_id}&c=${cliente.id}`}
                        target="_blank" rel="noreferrer"
                        className="inline-block px-6 py-3 rounded-xl text-white text-sm font-semibold"
                        style={{background:color}}>
                        📋 Rellenar cuestionario nutricional
                      </a>
                    </div>
                  )
                ):(
                  <>
                    <div className="rounded-2xl p-5 text-white" style={{background:'#111'}}>
                      <p className="font-bold text-lg mb-4">{planNutricion.nombre}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[['kcal',planNutricion.calorias_dia,'#FF5C00'],['Prot.',`${planNutricion.proteinas_g}g`,'#6366f1'],['Carbs',`${planNutricion.carbohidratos_g}g`,'#f59e0b'],['Grasa',`${planNutricion.grasas_g}g`,'#10b981']].map(([l,v,c])=>(
                          <div key={l} className="bg-white/8 rounded-xl p-3 text-center">
                            <p className="font-bold text-base" style={{color:c}}>{v}</p>
                            <p className="text-white/50 text-xs mt-0.5">{l}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {(()=>{
                      const menu=planNutricion.contenido?.menu||planNutricion.borrador?.menu||[]
                      const dias=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
                      return(
                        <div className="space-y-3">
                          <div className="flex gap-1.5 bg-white rounded-2xl border border-black/6 p-1.5 overflow-x-auto">
                            {dias.map((d,i)=>(
                              <button key={d} onClick={()=>setDiaActivoNutr(i)}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${i===diaActivoNutr?'text-white':'text-[#6B6B6B]'}`}
                                style={i===diaActivoNutr?{background:color}:{}}>{d}</button>
                            ))}
                          </div>
                          {(menu[diaActivoNutr]?.comidas||[]).map((comida,i)=>(
                            <div key={i} className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                              <div className="px-5 py-3.5 bg-[#F7F6F3] border-b border-black/6 flex items-center justify-between">
                                <span className="font-semibold text-[#0A0A0A] text-sm">{comida.nombre}</span>
                                <span className="text-[#6B6B6B] text-xs">{comida.hora} · {comida.kcal||comida.calorias}kcal</span>
                              </div>
                              <div className="p-4 space-y-2">
                                {(comida.alimentos||[]).map((al,j)=>(
                                  <div key={j} className="flex justify-between items-baseline">
                                    <span className="text-sm text-[#0A0A0A]">{al.nombre}</span>
                                    <span className="text-xs text-[#6B6B6B] font-medium ml-4 flex-shrink-0">{al.cantidad}</span>
                                  </div>
                                ))}
                                {comida.prep&&<p className="text-xs text-[#6B6B6B] border-t border-black/5 pt-2 mt-2">🍳 {comida.prep}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                    {(planNutricion.contenido?.hidratacion||planNutricion.borrador?.hidratacion)&&(
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
                        <span className="text-2xl">💧</span>
                        <div>
                          <p className="text-sm font-bold text-blue-900">{planNutricion.contenido?.hidratacion||planNutricion.borrador?.hidratacion}L de agua al día</p>
                          <p className="text-xs text-blue-600">Hidratación recomendada</p>
                        </div>
                      </div>
                    )}
                    {(planNutricion.contenido?.recomendaciones||planNutricion.borrador?.recomendaciones)?.length>0&&(
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-widest">Recomendaciones</p>
                        {(planNutricion.contenido?.recomendaciones||planNutricion.borrador?.recomendaciones).map((rec,i)=>(
                          <div key={i} className="flex items-start gap-3 bg-white border border-black/6 rounded-xl p-4">
                            <span className="text-lg flex-shrink-0">{['💧','🕐','💪','😴','⚡'][i]||'→'}</span>
                            <p className="text-sm text-[#444] leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {planNutricion.notas_entrenador&&(
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-amber-700 mb-1">📝 Nota de tu entrenador</p>
                        <p className="text-sm text-amber-800">{planNutricion.notas_entrenador}</p>
                      </div>
                    )}
                    {/* Botón actualizar cuestionario */}
                    <a href={`https://forge-studio-os.vercel.app/nutricion-cuest?e=${cliente.entrenador_id}&c=${cliente.id}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full border border-black/10 text-[#6B6B6B] text-sm font-medium py-3 rounded-xl hover:bg-[#F7F6F3] transition-all">
                      📋 Actualizar mis datos nutricionales
                    </a>
                  </>
                )}
              </>
            )}

            {/* ══ PAGOS ═══════════════════════════════════════════════════════ */}
            {tab==='pagos'&&(
              <>
                {pagos[0]&&(()=>{
                  const ult=pagos[0],vence=new Date(ult.fecha_pago)
                  vence.setMonth(vence.getMonth()+1)
                  const dias=Math.ceil((vence-new Date())/864e5)
                  return(
                    <div className={`rounded-2xl p-5 flex items-center gap-4 border ${dias>7?'bg-emerald-50 border-emerald-100':'bg-red-50 border-red-100'}`}>
                      <span className="text-3xl">{dias>7?'✅':'⚠️'}</span>
                      <div>
                        <p className={`font-bold ${dias>7?'text-emerald-800':'text-red-800'}`}>{dias>7?'Suscripción al día':dias>0?`Vence en ${dias} días`:'Pago vencido'}</p>
                        <p className={`text-sm mt-0.5 ${dias>7?'text-emerald-600':'text-red-600'}`}>{ult.concepto} · {Number(ult.importe).toFixed(0)}€/mes</p>
                      </div>
                    </div>
                  )
                })()}
                <div className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                  {pagos.map((p,i)=>(
                    <div key={p.id} className={`flex items-center gap-4 px-5 py-4 ${i>0?'border-t border-black/6':''}`}>
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-600">✓</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0A0A0A] truncate">{p.concepto||'Entrenamiento'}</p>
                        <p className="text-xs text-[#6B6B6B]">{new Date(p.fecha_pago+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</p>
                      </div>
                      <p className="text-sm font-bold text-emerald-600 flex-shrink-0">+{Number(p.importe).toFixed(0)}€</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ══ AJUSTES ══════════════════════════════════════════════════ */}
            {tab==='ajustes'&&(
              <div className="space-y-3">

                {/* BLOQUE 1 — Mi plan */}
                <div className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                  <div className="px-5 py-4 border-b border-black/6">
                    <p className="text-sm font-bold text-[#0A0A0A]">Mi plan</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">Tu entrenador recibirá una notificación si cambias algo</p>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Peso actual y objetivo */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Peso actual (kg)</label>
                        <input type="number" step="0.1"
                          defaultValue={cliente?.peso_actual||''}
                          onChange={e=>setFormPerfil(f=>({...(f||{}),peso_actual:e.target.value}))}
                          placeholder="75.5"
                          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-[#FF5C00]"/>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Peso objetivo (kg)</label>
                        <input type="number" step="0.1"
                          defaultValue={cliente?.peso_objetivo||''}
                          onChange={e=>setFormPerfil(f=>({...(f||{}),peso_objetivo:e.target.value}))}
                          placeholder="70.0"
                          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-[#FF5C00]"/>
                      </div>
                    </div>

                    {/* Objetivo */}
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Mi objetivo</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ['perdida_grasa','🔥','Pérdida de grasa'],
                          ['ganancia_muscular','💪','Ganar músculo'],
                          ['tonificacion','✨','Tonificación'],
                          ['mantenimiento','⚖️','Mantenimiento'],
                          ['fuerza','🏋️','Fuerza máxima'],
                          ['resistencia','🏃','Resistencia'],
                        ].map(([val,icon,label])=>(
                          <button key={val} type="button"
                            onClick={()=>setFormPerfil(f=>({...(f||{}),objetivo:val}))}
                            className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-left transition-all flex items-center gap-2 ${
                              (formPerfil?.objetivo||cliente?.objetivo)===val
                                ? 'text-white'
                                : 'bg-[#F7F6F3] text-[#6B6B6B]'
                            }`}
                            style={(formPerfil?.objetivo||cliente?.objetivo)===val?{background:color}:{}}>
                            <span>{icon}</span>{label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Días por semana */}
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Días disponibles para entrenar</label>
                      <div className="flex gap-2">
                        {[2,3,4,5,6].map(d=>(
                          <button key={d} type="button"
                            onClick={()=>setFormPerfil(f=>({...(f||{}),dias_semana:d}))}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                              (formPerfil?.dias_semana||cliente?.dias_semana)===d
                                ? 'text-white'
                                : 'bg-[#F7F6F3] text-[#6B6B6B]'
                            }`}
                            style={(formPerfil?.dias_semana||cliente?.dias_semana)===d?{background:color}:{}}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lesiones */}
                    <div>
                      <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Lesiones o limitaciones actuales</label>
                      <textarea
                        defaultValue={cliente?.lesiones||''}
                        onChange={e=>setFormPerfil(f=>({...(f||{}),lesiones:e.target.value}))}
                        placeholder="Ninguna / Describe cualquier molestia o limitación"
                        rows={2}
                        className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"/>
                    </div>

                    <button onClick={async()=>{
                      if(!formPerfil||!Object.keys(formPerfil).length) return
                      setGuardandoPerfil(true)
                      const updates={}
                      if(formPerfil.peso_actual) updates.peso_actual=Number(formPerfil.peso_actual)
                      if(formPerfil.peso_objetivo) updates.peso_objetivo=Number(formPerfil.peso_objetivo)
                      if(formPerfil.objetivo) updates.objetivo=formPerfil.objetivo
                      if(formPerfil.dias_semana) updates.dias_semana=formPerfil.dias_semana
                      if(formPerfil.lesiones!==undefined) updates.lesiones=formPerfil.lesiones
                      await supabase.from('clientes').update(updates).eq('id',cliente.id)
                      // Notificar cambios al entrenador
                      const cambios=[]
                      if(formPerfil.objetivo&&formPerfil.objetivo!==cliente.objetivo) cambios.push(`objetivo: ${formPerfil.objetivo.replace(/_/g,' ')}`)
                      if(formPerfil.dias_semana&&formPerfil.dias_semana!==cliente.dias_semana) cambios.push(`días/semana: ${formPerfil.dias_semana}`)
                      if(formPerfil.lesiones&&formPerfil.lesiones!==cliente.lesiones) cambios.push(`lesiones: ${formPerfil.lesiones}`)
                      if(cambios.length) {
                        await supabase.functions.invoke('portal-accion',{body:{accion:'enviar_mensaje',datos:{
                          contenido:`He actualizado mi perfil: ${cambios.join(' · ')}.`
                        }}}).catch(()=>{})
                      }
                      setFormPerfil(null)
                      setGuardandoPerfil(false)
                    }} disabled={!formPerfil||!Object.keys(formPerfil).length||guardandoPerfil}
                      className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
                      style={{background:color}}>
                      {guardandoPerfil?'Guardando...':'Guardar cambios'}
                    </button>
                  </div>
                </div>

                {/* BLOQUE 2 — Mi cuenta */}
                <div className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                  <div className="px-5 py-4 border-b border-black/6">
                    <p className="text-sm font-bold text-[#0A0A0A]">Mi cuenta</p>
                  </div>
                  <div className="divide-y divide-black/5">
                    <button onClick={async()=>{
                      const {error}=await supabase.auth.resetPasswordForEmail(
                        clienteSession?.email||'',
                        { redirectTo: `${window.location.origin}/reset-password` }
                      )
                      if(!error) mostrarToast('✓ Email enviado — revisa tu bandeja de entrada')
                      else mostrarToast('Error al enviar el email. Inténtalo de nuevo.')
                    }} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F6F3] transition-all text-left">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center text-base">🔑</span>
                        <span className="text-sm font-medium text-[#0A0A0A]">Cambiar contraseña</span>
                      </div>
                      <span className="text-[#6B6B6B]">→</span>
                    </button>
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center text-base">📧</span>
                        <div>
                          <p className="text-sm font-medium text-[#0A0A0A]">Email</p>
                          <p className="text-xs text-[#6B6B6B]">{clienteSession?.email||''}</p>
                        </div>
                      </div>
                    </div>
                    <button onClick={async()=>{
                      await supabase.auth.signOut()
                      window.location.href='/'
                    }} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F6F3] transition-all text-left">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-base">🚪</span>
                        <span className="text-sm font-medium text-red-500">Cerrar sesión</span>
                      </div>
                      <span className="text-red-400">→</span>
                    </button>
                  </div>
                </div>

                {/* BLOQUE 3 — Legal */}
                <div className="bg-white rounded-2xl border border-black/6 overflow-hidden">
                  <div className="px-5 py-4 border-b border-black/6">
                    <p className="text-sm font-bold text-[#0A0A0A]">Legal y privacidad</p>
                  </div>
                  <div className="divide-y divide-black/5">
                    <a href="/privacidad.html" target="_blank" rel="noreferrer"
                      className="flex items-center justify-between px-5 py-4 hover:bg-[#F7F6F3] transition-all">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center text-base">🔒</span>
                        <span className="text-sm font-medium text-[#0A0A0A]">Política de Privacidad</span>
                      </div>
                      <span className="text-[#6B6B6B]">→</span>
                    </a>
                    <button onClick={async()=>{
                      await supabase.functions.invoke('portal-accion',{body:{accion:'enviar_mensaje',datos:{
                        contenido:'Solicito una copia de todos mis datos personales almacenados en el sistema (derecho de acceso RGPD).'
                      }}}).catch(()=>{})
                      mostrarToast('✓ Solicitud enviada — recibirás tus datos en 30 días')
                    }} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F6F3] transition-all text-left">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center text-base">📂</span>
                        <span className="text-sm font-medium text-[#0A0A0A]">Solicitar mis datos</span>
                      </div>
                      <span className="text-[#6B6B6B]">→</span>
                    </button>
                    <button onClick={async()=>{
                      if(!window.confirm('¿Seguro que quieres solicitar la eliminación de tu cuenta y todos tus datos? Esta acción no se puede deshacer.')) return
                      await supabase.functions.invoke('portal-accion',{body:{accion:'enviar_mensaje',datos:{
                        contenido:'Solicito la eliminación de mi cuenta y todos mis datos personales (derecho al olvido RGPD).'
                      }}}).catch(()=>{})
                      mostrarToast('✓ Solicitud enviada — procesaremos la eliminación en 30 días')
                    }} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F6F3] transition-all text-left">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-base">🗑</span>
                        <span className="text-sm font-medium text-red-500">Eliminar mi cuenta</span>
                      </div>
                      <span className="text-red-400">→</span>
                    </button>
                  </div>
                </div>

                <p className="text-center text-xs text-[#9B9B9B] pb-2">Forge Studio OS · v1.0</p>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}
