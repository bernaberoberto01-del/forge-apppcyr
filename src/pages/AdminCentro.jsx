import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useCentro } from '../hooks/useCentro.jsx'

const COLORES = ['#FF5C00','#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#8b5cf6','#14b8a6']
const ini = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

function Toast({ msg, tipo='ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 ${tipo==='error'?'bg-red-600':'bg-[#111]'}`}>
      <span>{tipo==='error'?'⚠':'✓'}</span> {msg}
    </div>
  )
}

export default function AdminCentro({ session }) {
  const { centro, miembros, esAdmin, recargar } = useCentro()
  const [tab, setTab] = useState('equipo')
  const [toast, setToast] = useState(null)
  const [modalInvitar, setModalInvitar] = useState(false)
  const [modalCrearCentro, setModalCrearCentro] = useState(false)
  const [invitaciones, setInvitaciones] = useState([])
  const [statsEntrenadores, setStatsEntrenadores] = useState({})
  const [formInvitar, setFormInvitar] = useState({ email:'', rol:'entrenador', nombre:'', color: COLORES[1] })
  const [formCentro, setFormCentro] = useState({ nombre:'', color_acento:'#FF5C00' })
  const [loading, setLoading] = useState(false)
  const uid = session.user.id

  useEffect(() => { if (centro) cargarStats() }, [centro, miembros])

  async function cargarStats() {
    if (!centro) return
    const hace30 = new Date(Date.now()-30*864e5).toISOString().split('T')[0]
    const { data: sesiones } = await supabase
      .from('sesiones').select('entrenador_id, completada, duracion_minutos, fecha')
      .eq('centro_id', centro.id).gte('fecha', hace30)
    const { data: clientesData } = await supabase
      .from('clientes').select('entrenador_id, estado')
      .eq('centro_id', centro.id)
    const { data: invs } = await supabase
      .from('invitaciones_centro').select('*')
      .eq('centro_id', centro.id).eq('usado', false)
    setInvitaciones(invs || [])

    const stats = {}
    miembros.forEach(m => {
      const sesMes = (sesiones||[]).filter(s => s.entrenador_id === m.user_id)
      const sesCom = sesMes.filter(s => s.completada)
      const horas = sesCom.reduce((s,x) => s+(x.duracion_minutos||60),0)
      const clActivos = (clientesData||[]).filter(c => c.entrenador_id === m.user_id && c.estado === 'activo')
      stats[m.user_id] = {
        sesiones: sesMes.length,
        completadas: sesCom.length,
        horas: Math.round(horas/60*10)/10,
        clientes: clActivos.length
      }
    })
    setStatsEntrenadores(stats)
  }

  async function crearCentro() {
    if (!formCentro.nombre) return
    setLoading(true)
    const { data: nuevoCentro, error } = await supabase.from('centros').insert({
      nombre: formCentro.nombre, color_acento: formCentro.color_acento, owner_id: uid
    }).select().single()
    if (error) { setToast({ msg: 'Error al crear centro', tipo:'error' }); setLoading(false); return }

    // Añadirme como admin
    await supabase.from('miembros_centro').insert({
      centro_id: nuevoCentro.id, user_id: uid, rol: 'admin',
      nombre: session.user.user_metadata?.nombre || session.user.email?.split('@')[0],
      email: session.user.email, color: '#FF5C00'
    })
    setModalCrearCentro(false)
    setToast({ msg: `Centro "${formCentro.nombre}" creado` })
    recargar()
    setLoading(false)
  }

  async function invitar() {
    if (!formInvitar.email || !centro) return
    setLoading(true)
    // Crear invitación
    const { data: inv } = await supabase.from('invitaciones_centro').insert({
      centro_id: centro.id, email: formInvitar.email, rol: formInvitar.rol
    }).select().single()

    if (inv) {
      // Pre-crear el miembro con email (cuando acepte la invitación se vincula el user_id)
      await supabase.from('miembros_centro').insert({
        centro_id: centro.id, user_id: uid, // placeholder, se actualizará al aceptar
        rol: formInvitar.rol, nombre: formInvitar.nombre || formInvitar.email.split('@')[0],
        email: formInvitar.email, color: formInvitar.color, activo: false
      }).catch(() => {}) // puede fallar si ya existe

      const enlace = `${window.location.origin}/unirse/${inv.token}`
      await navigator.clipboard.writeText(enlace)
      setToast({ msg: 'Enlace de invitación copiado' })
    }
    setModalInvitar(false)
    setFormInvitar({ email:'', rol:'entrenador', nombre:'', color: COLORES[1] })
    await cargarStats()
    setLoading(false)
  }

  async function eliminarMiembro(id) {
    if (!confirm('¿Eliminar este entrenador del centro?')) return
    await supabase.from('miembros_centro').update({ activo: false }).eq('id', id)
    setToast({ msg: 'Entrenador eliminado del centro' })
    recargar()
  }

  async function cambiarColor(miembroId, color) {
    await supabase.from('miembros_centro').update({ color }).eq('id', miembroId)
    recargar()
  }

  async function eliminarInvitacion(id) {
    await supabase.from('invitaciones_centro').delete().eq('id', id)
    await cargarStats()
    setToast({ msg: 'Invitación cancelada' })
  }

  // Sin centro — mostrar pantalla de creación
  if (!centro) {
    return (
      <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-2xl mx-auto">
        {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-[#FF5C00]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🏋️</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] mb-2">Crear tu centro</h1>
          <p className="text-sm text-[#6B6B6B] mb-8 max-w-xs mx-auto leading-relaxed">
            Conecta a varios entrenadores bajo un mismo espacio. Agenda compartida, gestión de clientes y panel de control unificado.
          </p>
          <button onClick={() => setModalCrearCentro(true)}
            className="bg-[#FF5C00] text-white text-sm font-bold px-8 py-3.5 rounded-2xl active:scale-95 transition-all">
            Crear centro →
          </button>
          <p className="text-xs text-[#6B6B6B] mt-4">O pide a tu centro que te envíe un enlace de invitación</p>
        </div>

        {/* Modal crear centro */}
        {modalCrearCentro && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5">
              <h2 className="font-bold text-[#0A0A0A] mb-4">Nuevo centro</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre del centro *</label>
                  <input value={formCentro.nombre} onChange={e => setFormCentro(f=>({...f,nombre:e.target.value}))}
                    className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
                    placeholder="Ej: Box CrossFit Murcia, Studio 3" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Color del centro</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORES.map(col => (
                      <button key={col} onClick={() => setFormCentro(f=>({...f,color_acento:col}))}
                        className="w-8 h-8 rounded-xl border-2 transition-all"
                        style={{ background:col, borderColor: formCentro.color_acento===col ? '#0A0A0A' : 'transparent' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setModalCrearCentro(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
                <button onClick={crearCentro} disabled={!formCentro.nombre||loading}
                  className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40">
                  {loading ? 'Creando...' : 'Crear centro'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl mx-auto">
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">{centro.nombre}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">{miembros.length} entrenadores · Panel de administración</p>
        </div>
        {esAdmin && (
          <button onClick={() => setModalInvitar(true)}
            className="bg-[#FF5C00] text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
            + Invitar
          </button>
        )}
      </div>

      {/* Stats centro */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          ['Entrenadores', miembros.length, '#FF5C00'],
          ['Total sesiones/mes', Object.values(statsEntrenadores).reduce((s,x)=>s+x.sesiones,0), '#6366f1'],
          ['Total clientes', Object.values(statsEntrenadores).reduce((s,x)=>s+x.clientes,0), '#10b981'],
        ].map(([l,v,c])=>(
          <div key={l} className="bg-white rounded-xl border border-black/5 shadow-sm p-3.5 text-center">
            <p className="text-2xl font-bold" style={{color:c}}>{v}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5 leading-tight">{l}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/5 p-1 rounded-xl mb-4">
        {[['equipo','Equipo'],['horas','Horas/mes']].map(([v,l])=>(
          <button key={v} onClick={() => setTab(v)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab===v?'bg-white shadow-sm text-[#0A0A0A]':'text-[#6B6B6B]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* TAB EQUIPO */}
      {tab === 'equipo' && (
        <div className="space-y-3">
          {miembros.map(m => {
            const st = statsEntrenadores[m.user_id] || {}
            const esYo = m.user_id === uid
            return (
              <div key={m.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ background: m.color || '#FF5C00' }}>
                    {ini(m.nombre || m.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#0A0A0A] truncate">{m.nombre || m.email?.split('@')[0]}</p>
                      {esYo && <span className="text-xs bg-[#FF5C00]/10 text-[#FF5C00] px-2 py-0.5 rounded-full font-medium">Tú</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.rol==='admin'?'bg-purple-50 text-purple-700':'bg-[#F5F5F0] text-[#6B6B6B]'}`}>
                        {m.rol}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B6B6B]">{m.email}</p>
                  </div>
                  {esAdmin && !esYo && (
                    <button onClick={() => eliminarMiembro(m.id)} className="text-[#6B6B6B] hover:text-red-500 text-lg flex-shrink-0">×</button>
                  )}
                </div>

                {/* Stats del entrenador */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    [st.clientes||0, 'Clientes'],
                    [st.sesiones||0, 'Sesiones'],
                    [st.completadas||0, 'Completadas'],
                    [`${st.horas||0}h`, 'Horas/mes'],
                  ].map(([v,l])=>(
                    <div key={l} className="bg-[#F5F5F0] rounded-xl p-2 text-center">
                      <p className="text-sm font-bold text-[#0A0A0A]">{v}</p>
                      <p className="text-xs text-[#6B6B6B]">{l}</p>
                    </div>
                  ))}
                </div>

                {/* Selector de color */}
                {(esYo || esAdmin) && (
                  <div className="mt-3 flex items-center gap-2">
                    <p className="text-xs text-[#6B6B6B] flex-shrink-0">Color en agenda:</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {COLORES.map(col => (
                        <button key={col} onClick={() => cambiarColor(m.id, col)}
                          className="w-6 h-6 rounded-lg border-2 transition-all"
                          style={{ background:col, borderColor: m.color===col?'#0A0A0A':'transparent' }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Invitaciones pendientes */}
          {invitaciones.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wide mb-2">Invitaciones pendientes</p>
              {invitaciones.map(inv => (
                <div key={inv.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">{inv.email}</p>
                    <p className="text-xs text-amber-600">Pendiente de aceptar · {inv.rol}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/unirse/${inv.token}`); setToast({ msg: 'Enlace copiado' }) }}
                      className="text-xs border border-amber-200 text-amber-700 px-2.5 py-1.5 rounded-lg">📋</button>
                    <button onClick={() => eliminarInvitacion(inv.id)}
                      className="text-[#6B6B6B] hover:text-red-500 text-lg">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB HORAS */}
      {tab === 'horas' && (
        <div className="space-y-3">
          {miembros.map(m => {
            const st = statsEntrenadores[m.user_id] || {}
            const maxHoras = Math.max(...miembros.map(x => statsEntrenadores[x.user_id]?.horas||0), 1)
            return (
              <div key={m.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: m.color || '#FF5C00' }}>
                    {ini(m.nombre || m.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A0A0A] truncate">{m.nombre || m.email?.split('@')[0]}</p>
                    <p className="text-xs text-[#6B6B6B]">{m.rol}</p>
                  </div>
                  <p className="text-lg font-bold flex-shrink-0" style={{ color: m.color||'#FF5C00' }}>
                    {st.horas||0}h
                  </p>
                </div>
                <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${((st.horas||0)/maxHoras)*100}%`, background: m.color||'#FF5C00' }} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    [`${st.sesiones||0}`, 'sesiones'],
                    [`${st.completadas||0}`, 'completadas'],
                    [`${st.clientes||0}`, 'clientes'],
                  ].map(([v,l])=>(
                    <div key={l} className="text-center">
                      <p className="text-sm font-bold text-[#0A0A0A]">{v}</p>
                      <p className="text-xs text-[#6B6B6B]">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal invitar */}
      {modalInvitar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <h2 className="font-bold text-[#0A0A0A] mb-1">Invitar entrenador</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">Se generará un enlace único. El entrenador lo abre y accede al centro con su cuenta.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Email *</label>
                <input type="email" value={formInvitar.email} onChange={e=>setFormInvitar(f=>({...f,email:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
                  placeholder="entrenador@email.com" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre</label>
                <input value={formInvitar.nombre} onChange={e=>setFormInvitar(f=>({...f,nombre:e.target.value}))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
                  placeholder="Nombre del entrenador" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Rol</label>
                <div className="flex gap-2">
                  {[['entrenador','Entrenador'],['admin','Admin']].map(([v,l])=>(
                    <button key={v} onClick={()=>setFormInvitar(f=>({...f,rol:v}))}
                      className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-all ${formInvitar.rol===v?'bg-[#FF5C00] border-[#FF5C00] text-white':'border-black/10 text-[#6B6B6B]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Color en agenda</label>
                <div className="flex gap-2">
                  {COLORES.map(col => (
                    <button key={col} onClick={()=>setFormInvitar(f=>({...f,color:col}))}
                      className="w-8 h-8 rounded-xl border-2 transition-all"
                      style={{ background:col, borderColor: formInvitar.color===col?'#0A0A0A':'transparent' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setModalInvitar(false)} className="flex-1 border border-black/10 text-[#0A0A0A] text-sm py-2.5 rounded-xl">Cancelar</button>
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
