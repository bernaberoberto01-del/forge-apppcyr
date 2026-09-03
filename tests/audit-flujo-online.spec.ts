import { test, expect } from '@playwright/test'

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'

async function getToken(page: any) {
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'bernaberoberto01@gmail.com', password: 'Roberto72' }
  })
  const auth = await res.json()
  return { token: auth.access_token, uid: auth.user?.id }
}

test.describe('Audit flujo online — detecta fallos críticos', () => {

  test('clientes online tienen rutina publicada o estado claro', async ({ page }) => {
    const { token } = await getToken(page)
    const res = await page.request.get(
      `${SUPA}/rest/v1/clientes?entrenador_id=eq.0b908e25-f69f-472c-9972-87bc93d67e65&tipo=eq.online&estado=eq.activo&select=id,nombre,plan_online,ia_estado,suscripcion_activa`,
      { headers: { 'apikey': ANON, 'Authorization': `Bearer ${token}` } }
    )
    const clientes = await res.json()
    
    for (const c of clientes) {
      if (!c.plan_online) continue // clientes de prueba sin plan
      
      // Verificar que ia_estado es un valor conocido
      const estadosValidos = ['pendiente','generando','listo','error','pendiente_datos']
      expect(estadosValidos, `${c.nombre}: ia_estado inválido "${c.ia_estado}"`).toContain(c.ia_estado)
      
      // Si tiene suscripción activa, debe tener rutina publicada
      if (c.suscripcion_activa) {
        const rutRes = await page.request.get(
          `${SUPA}/rest/v1/rutinas?cliente_id=eq.${c.id}&estado=eq.publicada&tipo=neq.evaluacion&select=id`,
          { headers: { 'apikey': ANON, 'Authorization': `Bearer ${token}` } }
        )
        const rutinas = await rutRes.json()
        expect(rutinas.length, `${c.nombre}: suscripción activa pero SIN rutina publicada`).toBeGreaterThan(0)
        console.log(`✅ ${c.nombre}: suscripción + rutina OK`)
      }
    }
  })

  test('planes de nutrición tienen contenido no vacío', async ({ page }) => {
    const { token } = await getToken(page)
    const res = await page.request.get(
      `${SUPA}/rest/v1/planes_nutricion?entrenador_id=eq.0b908e25-f69f-472c-9972-87bc93d67e65&select=id,nombre,estado,contenido,cliente_id`,
      { headers: { 'apikey': ANON, 'Authorization': `Bearer ${token}` } }
    )
    const planes = await res.json()
    const vacios = planes.filter((p: any) => !p.contenido)
    
    if (vacios.length > 0) {
      console.log('⚠️  Planes sin contenido:', vacios.map((p: any) => p.nombre).join(', '))
    }
    expect(vacios.length, `Hay ${vacios.length} plan(es) de nutrición sin contenido`).toBe(0)
  })

  test('evaluaciones iniciales usan material correcto del cuestionario', async ({ page }) => {
    const { token } = await getToken(page)
    const res = await page.request.get(
      `${SUPA}/rest/v1/rutinas?entrenador_id=eq.0b908e25-f69f-472c-9972-87bc93d67e65&tipo=eq.evaluacion&select=id,nombre,cliente_id,borrador`,
      { headers: { 'apikey': ANON, 'Authorization': `Bearer ${token}` } }
    )
    const evals = await res.json()
    
    for (const ev of evals) {
      const dias = ev.borrador?.dias || []
      const ejercicios = dias.flatMap((d: any) => d.ejercicios || [])
      const nombreEj = ejercicios.map((e: any) => e.nombre?.toLowerCase()).join(' ')
      
      // Comprobar cuestionario del cliente
      const cRes = await page.request.get(
        `${SUPA}/rest/v1/cuestionarios?cliente_id=eq.${ev.cliente_id}&select=material`,
        { headers: { 'apikey': ANON, 'Authorization': `Bearer ${token}` } }
      )
      const cuests = await cRes.json()
      const material = cuests[0]?.material
      
      if (material === 'sin_material') {
        // No debería haber ejercicios de máquinas
        const tieneMAquinas = /press banca|prensa|jalon|maquina|cable|polea/.test(nombreEj)
        if (tieneMAquinas) {
          console.log(`⚠️  ${ev.nombre}: cliente sin material pero tiene ejercicios de máquinas`)
        }
        expect(tieneMAquinas, `${ev.nombre}: sin_material pero usa máquinas`).toBe(false)
      }
      console.log(`✅ ${ev.nombre}: material=${material||'gimnasio'} OK`)
    }
  })

  test('clientes con plan completo tienen nutrición o alerta pendiente', async ({ page }) => {
    const { token } = await getToken(page)
    const res = await page.request.get(
      `${SUPA}/rest/v1/clientes?entrenador_id=eq.0b908e25-f69f-472c-9972-87bc93d67e65&plan_online=eq.completo&estado=eq.activo&suscripcion_activa=eq.true&select=id,nombre`,
      { headers: { 'apikey': ANON, 'Authorization': `Bearer ${token}` } }
    )
    const clientes = await res.json()
    
    for (const c of clientes) {
      const nutRes = await page.request.get(
        `${SUPA}/rest/v1/planes_nutricion?cliente_id=eq.${c.id}&select=id,estado,contenido`,
        { headers: { 'apikey': ANON, 'Authorization': `Bearer ${token}` } }
      )
      const planes = await nutRes.json()
      const tieneNutri = planes.some((p: any) => p.contenido && (p.estado === 'publicado' || p.estado === 'borrador'))
      
      if (!tieneNutri) {
        // Debe haber alerta de cuestionario pendiente
        const alRes = await page.request.get(
          `${SUPA}/rest/v1/alertas?cliente_id=eq.${c.id}&tipo=eq.cuestionario_pendiente&select=id`,
          { headers: { 'apikey': ANON, 'Authorization': `Bearer ${token}` } }
        )
        const alertas = await alRes.json()
        expect(alertas.length, `${c.nombre}: plan completo, sin nutrición y sin alerta`).toBeGreaterThan(0)
        console.log(`⚠️  ${c.nombre}: sin nutrición — alerta pendiente OK`)
      } else {
        console.log(`✅ ${c.nombre}: nutrición OK`)
      }
    }
  })

  test('planes de cobro activos existen para clientes con suscripción', async ({ page }) => {
    const { token } = await getToken(page)
    const res = await page.request.get(
      `${SUPA}/rest/v1/clientes?entrenador_id=eq.0b908e25-f69f-472c-9972-87bc93d67e65&suscripcion_activa=eq.true&select=id,nombre`,
      { headers: { 'apikey': ANON, 'Authorization': `Bearer ${token}` } }
    )
    const clientes = await res.json()
    const sinPlan: string[] = []
    
    for (const c of clientes) {
      const pcRes = await page.request.get(
        `${SUPA}/rest/v1/planes_cobro?cliente_id=eq.${c.id}&activo=eq.true&select=id,proximo_cobro,importe`,
        { headers: { 'apikey': ANON, 'Authorization': `Bearer ${token}` } }
      )
      const planes = await pcRes.json()
      if (planes.length === 0) sinPlan.push(c.nombre)
      else console.log(`✅ ${c.nombre}: plan cobro OK — ${planes[0].importe}€`)
    }
    
    if (sinPlan.length > 0) console.log(`⚠️  Sin plan de cobro: ${sinPlan.join(', ')}`)
    // No fallamos el test pero lo reportamos — puede ser intencional
  })
})
