import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import EquipoTab from '../components/EquipoTab'
import { useCentro } from '../hooks/useCentro.jsx'

const MODULOS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', desc: 'Métricas, alertas y resumen general', obligatorio: true },
  { id: 'clientes', label: 'Clientes', icon: '👥', desc: 'Gestión de clientes y registros', obligatorio: true },
  { id: 'rutinas', label: 'Rutinas', icon: '💪', desc: 'Creación y gestión de rutinas con IA', obligatorio: false },
  { id: 'sesiones', label: 'Sesiones', icon: '🏋️', desc: 'Registro de entrenamientos y pesos', obligatorio: false },
  { id: 'seguimiento', label: 'Seguimiento', icon: '📋', desc: 'Check-ins semanales y alertas', obligatorio: false },
  { id: 'pagos', label: 'Pagos', icon: '💶', desc: 'Cobros manuales y Stripe', obligatorio: false },
  { id: 'agenda', label: 'Agenda', icon: '📅', desc: 'Calendario semanal de sesiones', obligatorio: false },
  { id: 'nutricion', label: 'Nutrición', icon: '🥗', desc: 'Planes nutricionales con IA por cliente', obligatorio: false },
  { id: 'mensajes', label: 'Mensajes', icon: '💬', desc: 'Comunicación directa con clientes', obligatorio: false },
]

const COLORES = [
  { id: '#FF5C00', label: 'Naranja Forge' },
  { id: '#6366f1', label: 'Índigo' },
  { id: '#10b981', label: 'Esmeralda' },
  { id: '#f59e0b', label: 'Ámbar' },
  { id: '#ec4899', label: 'Rosa' },
  { id: '#0ea5e9', label: 'Azul cielo' },
  { id: '#8b5cf6', label: 'Violeta' },
  { id: '#111111', label: 'Negro' },
]

function Toast({ msg, tipo = 'ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 ${tipo === 'error' ? 'bg-red-600' : 'bg-[#111]'}`}>
      <span>{tipo === 'error' ? '⚠' : '✓'}</span> {msg}
    </div>
  )
}

const defaultConfig = {
  nombre_negocio: '', nombre_entrenador: '', bio: '', foto_url: '', color_acento: '#FF5C00',
  modulos: { dashboard: true, clientes: true, rutinas: true, sesiones: true, seguimiento: true, pagos: true, agenda: true },
  cuestionario_bloques: { basico: true, objetivo: true, historial: true, disponibilidad: true, material: true, salud: true, motivacion: true }
}

export default function Configuracion({ session, onConfigChange }) {
  const [config, setConfig] = useState(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const fotoRef = useRef()
  const [toast, setToast] = useState(null)
  const showToast = (msg, tipo = 'ok') => setToast({ msg, tipo })
  const [tab, setTab] = useState('perfil')
  const uid = session.user.id
  const centroCtx = useCentro()
  const centro = centroCtx?.centro
  const miembros = centroCtx?.miembros || []
  const esAdmin = centroCtx?.esAdmin
  const recargarCentro = centroCtx?.recargar
  const centroLoading = centroCtx?.loading

  useEffect(() => { cargar() }, [uid])

  async function cargar() {
    const { data } = await supabase.from('configuracion').select('*').eq('entrenador_id', uid).single()
    if (data) {
      setConfig({
        ...defaultConfig,
        ...data,
        modulos: { ...defaultConfig.modulos, ...(data.modulos || {}) },
        cuestionario_bloques: { ...defaultConfig.cuestionario_bloques, ...(data.cuestionario_bloques || {}) }
      })
    }
    setLoading(false)
  }

  async function subirFoto(file) {
    if (!file) return
    setSubiendoFoto(true)
    const ext = file.name.split('.').pop()
    const path = `${uid}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatares').upload(path, file, { upsert: true })
    if (error) { setToast({ msg: 'Error al subir foto', tipo: 'error' }); setSubiendoFoto(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(path)
    setConfig(c => ({ ...c, foto_url: publicUrl + '?t=' + Date.now() }))
    setSubiendoFoto(false)
    setToast({ msg: 'Foto subida correctamente' })
  }

  async function guardarCheckin() {
    await supabase.from('checkin_config').upsert({ entrenador_id: uid, campos: camposCheckin, updated_at: new Date().toISOString() }, { onConflict: 'entrenador_id' })
    showToast('Cuestionario guardado')
  }

  function toggleCampo(id) {
    setCamposCheckin(prev => prev.map(c => c.id === id ? { ...c, activo: !c.activo } : c))
  }

  function updateCampoLabel(id, label) {
    setCamposCheckin(prev => prev.map(c => c.id === id ? { ...c, label } : c))
  }

  function addCampoPersonalizado() {
    const nuevo = { id: `custom_${Date.now()}`, label: 'Nuevo campo', tipo: 'escala', min:1, max:10, activo:true, orden: camposCheckin.length+1, custom:true }
    setCamposCheckin(prev => [...prev, nuevo])
  }

  function eliminarCampo(id) {
    setCamposCheckin(prev => prev.filter(c => c.id !== id))
  }

  async function guardar() {
    setSaving(true)
    const { error } = await supabase.from('configuracion').upsert({
      entrenador_id: uid,
      ...config,
      updated_at: new Date().toISOString()
    }, { onConflict: 'entrenador_id' })
    if (error) setToast({ msg: 'Error al guardar: ' + error.message, tipo: 'error' })
    else {
      setToast({ msg: 'Configuración guardada' })
      onConfigChange?.(config)
    }
    setSaving(false)
  }

  const setModulo = (id, val) => setConfig(c => ({ ...c, modulos: { ...c.modulos, [id]: val } }))
  const setBloque = (id, val) => setConfig(c => ({ ...c, cuestionario_bloques: { ...c.cuestionario_bloques, [id]: val } }))

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#FF5C00] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-2xl mx-auto">
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Configuración</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Personaliza Forge a tu imagen y metodología</p>
        </div>
        <button onClick={guardar} disabled={saving}
          className="bg-[#FF5C00] hover:bg-[#E05200] text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40 transition-all active:scale-95">
          {saving ? 'Guardando...' : '💾 Guardar'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/5 p-1 rounded-xl mb-5 overflow-x-auto">
        {[['perfil', '👤 Perfil'], ['equipo', '🏋️ Equipo'], ['modulos', '⚡ Módulos'], ['cuestionario', '📋 Cuestionario'], ['apariencia', '🎨 Apariencia'], ['tarifas', '💶 Tarifas']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-shrink-0 py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${tab === id ? 'bg-white shadow-sm text-[#0A0A0A]' : 'text-[#6B6B6B] hover:text-[#0A0A0A]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* PERFIL */}
      {tab === 'perfil' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-4">Tu identidad</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Nombre de tu negocio / centro</label>
                <input value={config.nombre_negocio} onChange={e => setConfig(c => ({ ...c, nombre_negocio: e.target.value }))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
                  placeholder="Ej: Roberto Bernabé Personal Training" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Tu nombre</label>
                <input value={config.nombre_entrenador} onChange={e => setConfig(c => ({ ...c, nombre_entrenador: e.target.value }))}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"
                  placeholder="Ej: Roberto Bernabé" />
                <p className="text-xs text-[#6B6B6B] mt-1">Aparece en el portal del cliente en lugar de "Tu entrenador"</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Bio corta</label>
                <textarea value={config.bio} onChange={e => setConfig(c => ({ ...c, bio: e.target.value }))}
                  rows={3} className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00] resize-none"
                  placeholder="Ej: CAFD en Murcia especializado en transformación física y fuerza. Más de 50 clientes transformados." />
                <p className="text-xs text-[#6B6B6B] mt-1">Visible en el portal del cliente</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1.5 block">Foto de perfil</label>
                <div className="flex items-center gap-3">
                  {config.foto_url
                    ? <img src={config.foto_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-black/10 flex-shrink-0" onError={e => e.target.style.display='none'} />
                    : <div className="w-16 h-16 rounded-full bg-[#F5F5F0] border-2 border-dashed border-black/20 flex items-center justify-center text-2xl flex-shrink-0">👤</div>
                  }
                  <div className="flex-1">
                    <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={e => subirFoto(e.target.files[0])} />
                    <button onClick={() => fotoRef.current?.click()} disabled={subiendoFoto}
                      className="w-full border border-black/10 text-[#0A0A0A] text-sm font-medium py-2.5 rounded-xl hover:bg-[#F5F5F0] disabled:opacity-40 transition-all">
                      {subiendoFoto ? '⏳ Subiendo...' : '📷 Subir foto'}
                    </button>
                    {config.foto_url && (
                      <button onClick={() => setConfig(c => ({ ...c, foto_url: '' }))}
                        className="w-full text-xs text-red-500 hover:text-red-600 mt-1.5 py-1">
                        Eliminar foto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview portal */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-3">Preview — así te ve el cliente</h2>
            <div className="bg-[#111] rounded-xl p-4 flex items-center gap-3">
              {config.foto_url ? (
                <img src={config.foto_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" onError={e => e.target.style.display='none'} />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: config.color_acento }}>
                  {(config.nombre_entrenador || 'E').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-white text-sm font-semibold">{config.nombre_entrenador || 'Tu entrenador'}</p>
                <p className="text-white/50 text-xs">{config.nombre_negocio || 'Tu centro'}</p>
              </div>
            </div>
            {config.bio && <p className="text-xs text-[#6B6B6B] mt-3 leading-relaxed italic">"{config.bio}"</p>}
          </div>
        </div>
      )}

      {/* MÓDULOS */}
      {tab === 'modulos' && (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
          <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">Módulos del sidebar</h2>
          <p className="text-xs text-[#6B6B6B] mb-4">Activa solo lo que usas — mantén el sidebar limpio</p>
          <div className="space-y-2">
            {MODULOS.map(m => (
              <div key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${config.modulos[m.id] ? 'border-[#FF5C00]/20 bg-[#FF5C00]/3' : 'border-black/5 bg-[#F5F5F0]'}`}>
                <span className="text-xl flex-shrink-0">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0A0A0A]">{m.label}</p>
                  <p className="text-xs text-[#6B6B6B]">{m.desc}</p>
                </div>
                {m.obligatorio ? (
                  <span className="text-xs text-[#6B6B6B] flex-shrink-0">Siempre activo</span>
                ) : (
                  <button onClick={() => setModulo(m.id, !config.modulos[m.id])}
                    className={`w-12 h-6 rounded-full transition-all flex-shrink-0 relative ${config.modulos[m.id] ? 'bg-[#FF5C00]' : 'bg-black/20'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${config.modulos[m.id] ? 'left-6' : 'left-0.5'}`} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 bg-[#F5F5F0] rounded-xl p-3">
            <p className="text-xs text-[#6B6B6B]">
              <span className="font-semibold text-[#0A0A0A]">{Object.values(config.modulos).filter(Boolean).length}</span> de {MODULOS.length} módulos activos
            </p>
          </div>
        </div>
      )}

      {/* CUESTIONARIO */}
      {tab === 'cuestionario' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">Bloques del cuestionario</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">Activa los bloques que quieres que el cliente rellene al registrarse</p>
            <div className="space-y-2">
              {[
                { id: 'basico', label: 'Datos básicos', desc: 'Nombre, email, teléfono, edad, altura', obligatorio: true },
                { id: 'objetivo', label: 'Objetivo y tipo', desc: 'Meta, tipo de entrenamiento, plazo', obligatorio: true },
                { id: 'historial', label: 'Historial deportivo', desc: 'Experiencia previa, nivel actual', obligatorio: false },
                { id: 'disponibilidad', label: 'Disponibilidad', desc: 'Días por semana, horario preferido', obligatorio: false },
                { id: 'material', label: 'Material disponible', desc: 'Gimnasio, casa, aire libre, equipamiento', obligatorio: false },
                { id: 'salud', label: 'Salud y lesiones', desc: 'Lesiones previas, condiciones médicas', obligatorio: false },
                { id: 'motivacion', label: 'Motivación', desc: 'Por qué quiere entrenar, qué le frena', obligatorio: false },
              ].map(b => (
                <div key={b.id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${config.cuestionario_bloques[b.id] ? 'border-[#FF5C00]/20 bg-[#FF5C00]/3' : 'border-black/5 bg-[#F5F5F0]'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A0A0A]">{b.label}</p>
                    <p className="text-xs text-[#6B6B6B]">{b.desc}</p>
                  </div>
                  {b.obligatorio ? (
                    <span className="text-xs text-[#6B6B6B] flex-shrink-0">Siempre activo</span>
                  ) : (
                    <button onClick={() => setBloque(b.id, !config.cuestionario_bloques[b.id])}
                      className={`w-12 h-6 rounded-full transition-all flex-shrink-0 relative ${config.cuestionario_bloques[b.id] ? 'bg-[#FF5C00]' : 'bg-black/20'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${config.cuestionario_bloques[b.id] ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Los bloques desactivados se saltan en el cuestionario</p>
            <p className="text-xs text-amber-600">Los bloques básico y objetivo siempre están activos porque son necesarios para el sistema.</p>
          </div>
        </div>
      )}

      {/* APARIENCIA */}
      {tab === 'apariencia' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">Color de acento</h2>
            <p className="text-xs text-[#6B6B6B] mb-4">El color principal de botones, badges y elementos activos</p>
            <div className="grid grid-cols-4 gap-2">
              {COLORES.map(c => (
                <button key={c.id} onClick={() => { setConfig(cfg => ({ ...cfg, color_acento: c.id })); document.documentElement.style.setProperty('--acento', c.id) }}
                  className={`h-12 rounded-xl transition-all relative ${config.color_acento === c.id ? 'ring-2 ring-offset-2 ring-black scale-105' : 'hover:scale-102'}`}
                  style={{ background: c.id }}>
                  {config.color_acento === c.id && (
                    <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#6B6B6B] mt-3 text-center">{COLORES.find(c => c.id === config.color_acento)?.label}</p>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-3">Preview</h2>
            <div className="space-y-2">
              <button className="w-full py-3 rounded-xl text-white text-sm font-semibold" style={{ background: config.color_acento }}>
                Botón principal
              </button>
              <div className="flex gap-2">
                <span className="text-xs px-3 py-1.5 rounded-full text-white font-medium" style={{ background: config.color_acento }}>Badge activo</span>
                <span className="text-xs px-3 py-1.5 rounded-full font-medium border" style={{ color: config.color_acento, borderColor: config.color_acento + '40' }}>Badge outline</span>
              </div>
              <div className="border-l-4 pl-3 py-1" style={{ borderColor: config.color_acento }}>
                <p className="text-sm font-medium text-[#0A0A0A]">Elemento destacado</p>
                <p className="text-xs text-[#6B6B6B]">Descripción del elemento</p>
              </div>
            </div>
          </div>

          <div className="bg-[#F5F5F0] rounded-xl p-4">
            <p className="text-xs text-[#6B6B6B]">⚠ El cambio de color se aplica globalmente después de guardar y recargar la página. La implementación completa de temas dinámicos estará en la próxima versión.</p>
          </div>
        </div>
      )}

      {tab === 'equipo' && (
        centroLoading
          ? <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/></div>
          : <EquipoTab
              centro={centro}
              miembros={miembros}
              esAdmin={esAdmin}
              recargar={recargarCentro}
              session={session}
              uid={uid}
              showToast={showToast}
            />
      )}

      {tab === 'tarifas' && (
        <TarifasTab uid={uid} showToast={showToast} />
      )}
    </div>
  )
}

// ─── Tab Tarifas ─────────────────────────────────────────────────────────────
const MODALIDAD_LABEL = { individual: '👤 Individual', pareja: '👫 Pareja', grupo: '👥 Grupo' }
const MODALIDAD_COLOR = { individual: 'bg-[#F5F5F0] text-[#6B6B6B]', pareja: 'bg-blue-50 text-blue-700', grupo: 'bg-purple-50 text-purple-700' }

function TarifasTab({ uid, showToast }) {
  const [tarifas, setTarifas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nombre: '', modalidad: 'individual', dias_semana: 2, precio: '', tipo: 'presencial' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('tarifas').select('*').eq('entrenador_id', uid).eq('activa', true).order('modalidad').order('dias_semana')
    setTarifas(data || [])
    setLoading(false)
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.precio) return
    setGuardando(true)
    const payload = { entrenador_id: uid, nombre: form.nombre.trim(), modalidad: form.modalidad, dias_semana: Number(form.dias_semana), precio: Number(form.precio), tipo: form.tipo }
    if (editando) await supabase.from('tarifas').update(payload).eq('id', editando.id)
    else await supabase.from('tarifas').insert(payload)
    setModal(false); setEditando(null)
    await cargar(); setGuardando(false)
    showToast(editando ? 'Tarifa actualizada' : 'Tarifa creada')
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta tarifa?')) return
    await supabase.from('tarifas').update({ activa: false }).eq('id', id)
    await cargar(); showToast('Tarifa eliminada')
  }

  function abrirNueva() {
    setEditando(null); setForm({ nombre: '', modalidad: 'individual', dias_semana: 2, precio: '', tipo: 'presencial' }); setModal(true)
  }
  function abrirEditar(t) {
    setEditando(t); setForm({ nombre: t.nombre, modalidad: t.modalidad, dias_semana: t.dias_semana, precio: String(t.precio), tipo: t.tipo || 'presencial' }); setModal(true)
  }

  // Sugerir precio según modalidad y días
  const SUGERIDOS = { individual: { 2:220,3:330,4:440 }, pareja: { 2:175,3:260,4:340 }, grupo: { 3:160 } }
  const precioSugerido = SUGERIDOS[form.modalidad]?.[form.dias_semana]

  const agrupadasPorTipo = [
    { tipo: 'presencial', label: '📍 Presencial', items: tarifas.filter(t => t.tipo !== 'online') },
    { tipo: 'online', label: '🌐 Online', items: tarifas.filter(t => t.tipo === 'online') },
  ].filter(g => g.items.length > 0)

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#FF5C00] border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-sm font-bold text-[#0A0A0A] mb-1">Tarifas</h2>
          <p className="text-xs text-[#6B6B6B]">Define tus tarifas estándar. Al crear un cliente solo seleccionas la tarifa y el precio se rellena solo.</p>
        </div>
        <button onClick={abrirNueva}
          className="bg-[#FF5C00] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#e05200] transition-all flex-shrink-0">
          + Nueva
        </button>
      </div>

      <div className="space-y-4">
        {agrupadasPorTipo.map(({ tipo, label, items }) => (
          <div key={tipo}>
            <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wide mb-2">{label}</p>
            <div className="space-y-2">
              {items.map(t => (
                <div key={t.id} className="bg-white border border-black/8 rounded-xl px-4 py-3 flex items-center gap-3">
                  {t.tipo !== 'online' && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${MODALIDAD_COLOR[t.modalidad]}`}>
                      {t.dias_semana > 0 ? `${t.dias_semana}d/sem` : 'asesoría'}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-[#0A0A0A] flex-1 truncate">{t.nombre}</p>
                  <p className="text-sm font-bold text-[#FF5C00] flex-shrink-0">{t.precio}€/mes</p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => abrirEditar(t)} className="text-xs border border-black/10 text-[#6B6B6B] px-2.5 py-1.5 rounded-lg hover:bg-[#F5F5F0]">✏️</button>
                    <button onClick={() => eliminar(t.id)} className="text-xs border border-red-100 text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {tarifas.length === 0 && (
          <div className="text-center py-10">
            <p className="text-3xl mb-3">💶</p>
            <p className="text-[#6B6B6B] font-medium">Sin tarifas definidas</p>
            <p className="text-xs text-[#9B9B9B] mt-1">Crea tus tarifas estándar para asignarlas rápidamente a los clientes</p>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={()=>{setModal(false);setEditando(false)}}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-[#0A0A0A] mb-4">{editando?`Editar — ${editando.nombre}`:'Nueva tarifa'}</h3>
            <div className="space-y-4">

              {/* Tipo presencial/online */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Tipo de servicio</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['presencial','📍 Presencial'],['online','🌐 Online']].map(([v,l]) => (
                    <button key={v} type="button"
                      onClick={() => setForm({...form, tipo:v, dias_semana: v==='online'?0:2})}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${form.tipo===v?'border-[#FF5C00] bg-[#FF5C00]/5 text-[#FF5C00]':'border-black/10 text-[#6B6B6B]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">Nombre</label>
                <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}
                  placeholder={form.tipo==='online'?'Ej: Asesoría Completa':'Ej: Individual 3 días'}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
              </div>

              {/* Solo presencial: modalidad y días */}
              {form.tipo !== 'online' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Modalidad</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[['individual','👤 Individual'],['pareja','👫 Pareja'],['grupo','👥 Grupo']].map(([v,l]) => (
                        <button key={v} type="button"
                          onClick={() => setForm({...form, modalidad:v, dias_semana: v==='grupo'?3:form.dias_semana})}
                          className={`py-2 rounded-xl border text-xs font-semibold transition-all ${form.modalidad===v?'border-[#FF5C00] bg-[#FF5C00]/5 text-[#FF5C00]':'border-black/10 text-[#6B6B6B]'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B6B] mb-2 block">Días/semana</label>
                    <div className="flex gap-1">
                      {(form.modalidad==='grupo'?[3]:[2,3,4]).map(d => (
                        <button key={d} type="button"
                          onClick={() => { const p=SUGERIDOS[form.modalidad]?.[d]||''; setForm({...form,dias_semana:d,precio:String(p)}) }}
                          className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${form.dias_semana===d?'border-[#FF5C00] bg-[#FF5C00]/5 text-[#FF5C00]':'border-black/10 text-[#6B6B6B]'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                    {precioSugerido && (
                      <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex justify-between">
                        <p className="text-xs text-emerald-700">{form.modalidad} · {form.dias_semana} días</p>
                        <p className="text-xs font-bold text-emerald-700">Std: {precioSugerido}€</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Precio */}
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] mb-1 block">
                  Precio €/mes
                  {precioSugerido && Number(form.precio) !== precioSugerido && (
                    <button onClick={() => setForm({...form, precio: String(precioSugerido)})}
                      className="ml-2 text-[#FF5C00] font-medium text-xs">std: {precioSugerido}€</button>
                  )}
                </label>
                <input type="number" value={form.precio} onChange={e=>setForm({...form,precio:e.target.value})}
                  placeholder={String(precioSugerido || form.tipo==='online'?'29':'220')}
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF5C00]"/>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={()=>{setModal(false);setEditando(null)}}
                  className="flex-1 border border-black/10 text-[#6B6B6B] text-sm font-medium py-2.5 rounded-xl hover:bg-[#F5F5F0]">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={!form.nombre.trim()||!form.precio||guardando}
                  className="flex-1 bg-[#FF5C00] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40 hover:bg-[#e05200] transition-all">
                  {guardando?'Guardando...':editando?'Guardar cambios':'Crear tarifa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
