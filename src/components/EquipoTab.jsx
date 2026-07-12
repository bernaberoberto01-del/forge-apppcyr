import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COLORES = ['#FF5C00','#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#8b5cf6','#14b8a6']
const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

export default function EquipoTab({ centro, miembros, esAdmin, recargar, session, uid, showToast }) {
  if (!uid) return null
  const [statsEntrenadores, setStatsEntrenadores] = useState({})
  const [modalInvitar, setModalInvitar] = useState(false)
  const [modalCrear, setModalCrear] = useState(false)
  const [formInvitar, setFormInvitar] = useState({ email:'', rol:'entrenador', nombre:'', color: COLORES[1] })
  const [formCentro, setFormCentro] = useState({ nombre:'', color_acento:'#FF5C00' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (centro && miembros?.length) cargarStats() }, [centro, miembros])

  async function cargarStats() {
    if (!centro?.id) return
    const hace30 = new Date(Date.now()-30*864e5).toISOString().split('T')[0]
    const inicioSemana = (() => { const d=new Date(); d.setDate(d.getDate()-((d.getDay()||7)-1)); return d.toISOString().split('T')[0] })()
    
    const [sesMesR, sesSemR, clientesR, extrasR] = await Promise.all([
      supabase.from('sesiones').select('entrenador_id,completada,duracion_minutos').eq('centro_id', centro.id).gte('fecha', hace30).then(r=>r.data||[]).catch(()=>[]),
      supabase.from('sesiones').select('entrenador_id,completada,duracion_minutos').eq('centro_id', centro.id).gte('fecha', inicioSemana).then(r=>r.data||[]).catch(()=>[]),
      supabase.from('clientes').select('entrenador_id,estado').eq('centro_id', centro.id).then(r=>r.data||[]).catch(()=>[]),
      supabase.from('horas_extra').select('entrenador_id,horas,fecha').eq('centro_id', centro.id).gte('fecha', hace30).then(r=>r.data||[]).catch(()=>[]),
    ])
    const stats = {}
    ;(miembros||[]).forEach(m => {
      const mesC = sesMesR.filter(s=>s.entrenador_id===m.user_id&&s.completada)
      const semC = sesSemR.filter(s=>s.entrenador_id===m.user_id&&s.completada)
      const horasMes = mesC.reduce((s,x)=>s+(x.duracion_minutos||60),0)/60
      const horasSem = semC.reduce((s,x)=>s+(x.duracion_minutos||60),0)/60
      const extrasMes = extrasR.filter(h=>h.entrenador_id===m.user_id).reduce((s,x)=>s+Number(x.horas),0)
      const clientes = clientesR.filter(c=>c.entrenador_id===m.user_id&&c.estado==='activo').length
      stats[m.user_id] = { horasMes: Math.round(horasMes*10)/10, horasSem: Math.round(horasSem*10)/10, extrasMes, clientes, sesiones: mesC.length }
    })
    setStatsEntrenadores(stats)
  }

  async function crearCentro() {
    if (!formCentro.nombre) return
    setLoading(true)
    const { data: nuevo, error } = await supabase.from('centros')
      .insert({ nombre: formCentro.nombre, color_acento: formCentro.color_acento, owner_id: uid })
      .select().single()
    
    if (error || !nuevo) {
      showToast('Error al crear centro: ' + (error?.message || 'inténtalo de nuevo'), 'error')
      setLoading(false)
      return
    }

    const { error: e2 } = await supabase.from('miembros_centro').insert({
      centro_id: nuevo.id, user_id: uid, rol: 'admin',
      nombre: session?.user?.user_metadata?.nombre || session?.user?.email?.split('@')[0] || 'Admin',
      email: session?.user?.email || '', color: '#FF5C00', activo: true
    })
    
    if (e2) {
      showToast('Centro creado pero error añadiendo miembro: ' + e2.message, 'error')
    } else {
      showToast(`Centro "${formCentro.nombre}" creado`)
    }
    setModalCrear(false)
    recargar?.()
    setLoading(false)
  }

  async function invitar() {
    if (!formInvitar.email || !centro) return
    setLoading(true)
    const { data: inv } = await supabase.from('invitaciones_centro').insert({ centro_id: centro.id, email: formInvitar.email, rol: formInvitar.rol }).select().single()
    if (inv) {
      const enlace = `${window.location.origin}/unirse/${inv.token}`
      await navigator.clipboard.writeText(enlace)
      showToast('Enlace de invitación copiado')
    }
    setModalInvitar(false)
    setFormInvitar({ email:'', rol:'entrenador', nombre:'', color: COLORES[1] })
    setLoading(false)
  }

  async function cambiarColor(miembroId, color) {
    await supabase.from('miembros_centro').update({ color }).eq('id', miembroId)
    recargar?.()
  }

  async function eliminarMiembro(id) {
    if (!confirm('¿Quitar este entrenador del centro?')) return
    await supabase.from('miembros_centro').update({ activo: false }).eq('id', id)
    showToast('Entrenador eliminado del centro')
    recargar?.()
  }

  // Sin centro
  if (!centro) return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-[#FF5C00]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🏋️</div>
      <p className="font-bold text-[#0A0A0A] mb-1">Sin centro configurado</p>
      <p className="text-sm text-[#6B6B6B] mb-6 leading-relaxed max-w-xs mx-auto">Crea un centro para gestionar varios entrenadores, ver su agenda compartida y el registro de horas.</p>
      <button onClick={() => setModalCrear(true)} className="bg-[#FF5C00] text-white text-sm font-bold px-6 py-3 rounded-xl">Crear centro</button>

      {modalCrear && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 text-left">
            <h2 className="font-bold text-[#0A0A0A] mb-4">Nuevo centro</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre del centro *</label>
                <input value={formCentro.nombre} onChange={e=>setFormCentro(f=>({...f,nombre:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
                  placeholder="Ej: Studio Fitness Murcia" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Color del centro</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORES.map(col=>(
                    <button key={col} onClick={()=>setFormCentro(f=>({...f,color_acento:col}))} type="button"
                      className="w-8 h-8 rounded-xl border-2 transition-all"
                      style={{background:col,borderColor:formCentro.color_acento===col?'#0A0A0A':'transparent'}} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setModalCrear(false)} className="flex-1 border border-black/10 text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={crearCentro} disabled={!formCentro.nombre||loading}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {loading?'Creando...':'Crear centro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const maxHorasMes = Math.max(...(miembros||[]).map(m=>statsEntrenadores[m.user_id]?.horasMes||0),1)

  return (
    <div className="space-y-4">
      {/* Header del centro */}
      <div className="bg-[#111] rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-white font-bold">{centro.nombre}</p>
          <p className="text-white/40 text-xs">{(miembros||[]).length} entrenadores</p>
        </div>
        {esAdmin && (
          <button onClick={()=>setModalInvitar(true)}
            className="bg-[#FF5C00] text-white text-xs font-semibold px-3 py-2 rounded-lg">
            + Invitar
          </button>
        )}
      </div>

      {/* Lista entrenadores con horas */}
      <div className="space-y-2">
        {(miembros||[]).map(m => {
          const st = statsEntrenadores[m.user_id] || {}
          const esYo = m.user_id === uid
          const totalMes = (st.horasMes||0) + (st.extrasMes||0)
          return (
            <div key={m.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{background:m.color||'#FF5C00'}}>
                  {ini(m.nombre||m.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#0A0A0A] truncate">{m.nombre||m.email?.split('@')[0]}</p>
                    {esYo && <span className="text-xs bg-[#FF5C00]/10 text-[#FF5C00] px-2 py-0.5 rounded-full">Tú</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.rol==='admin'?'bg-purple-50 text-purple-700':'bg-[#F5F5F0] text-[#6B6B6B]'}`}>{m.rol}</span>
                  </div>
                  <p className="text-xs text-[#6B6B6B]">{st.clientes||0} clientes · {st.sesiones||0} sesiones/mes</p>
                </div>
                {esAdmin && !esYo && (
                  <button onClick={()=>eliminarMiembro(m.id)} className="text-[#6B6B6B] hover:text-red-500 text-xl">×</button>
                )}
              </div>

              {/* Horas semana/mes */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  [`${st.horasSem||0}h`, 'Esta semana', '#FF5C00'],
                  [`${st.horasMes||0}h`, 'Sesiones mes', '#6366f1'],
                  [`${totalMes.toFixed(1)}h`, 'Total mes', '#10b981'],
                ].map(([v,l,col])=>(
                  <div key={l} className="bg-[#F5F5F0] rounded-xl p-2.5 text-center">
                    <p className="text-sm font-bold" style={{color:col}}>{v}</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">{l}</p>
                  </div>
                ))}
              </div>

              {/* Barra de horas mes */}
              <div className="mb-3">
                <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{width:`${Math.min((totalMes/maxHorasMes)*100,100)}%`,background:m.color||'#FF5C00'}} />
                </div>
              </div>

              {/* Color en agenda */}
              {(esYo || esAdmin) && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[#6B6B6B] flex-shrink-0">Color agenda:</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {COLORES.map(col=>(
                      <button key={col} onClick={()=>cambiarColor(m.id,col)} type="button"
                        className="w-5 h-5 rounded-lg border-2 transition-all"
                        style={{background:col,borderColor:m.color===col?'#0A0A0A':'transparent'}} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal invitar */}
      {modalInvitar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-4">Invitar entrenador</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Email *</label>
                <input type="email" value={formInvitar.email} onChange={e=>setFormInvitar(f=>({...f,email:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
                  placeholder="entrenador@email.com" />
              </div>
              <div className="flex gap-2">
                {[['entrenador','Entrenador'],['admin','Admin']].map(([v,l])=>(
                  <button key={v} onClick={()=>setFormInvitar(f=>({...f,rol:v}))} type="button"
                    className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-all ${formInvitar.rol===v?'bg-[#FF5C00] border-[#FF5C00] text-white':'border-black/10 text-[#6B6B6B]'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Color en agenda</label>
                <div className="flex gap-2">
                  {COLORES.map(col=>(
                    <button key={col} onClick={()=>setFormInvitar(f=>({...f,color:col}))} type="button"
                      className="w-7 h-7 rounded-lg border-2 transition-all"
                      style={{background:col,borderColor:formInvitar.color===col?'#0A0A0A':'transparent'}} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setModalInvitar(false)} className="flex-1 border border-black/10 text-sm py-2.5 rounded-xl">Cancelar</button>
              <button onClick={invitar} disabled={!formInvitar.email||loading}
                className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                {loading?'Generando...':'📋 Copiar enlace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
