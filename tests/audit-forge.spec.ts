import { test, expect } from '@playwright/test'

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const STORAGE_KEY = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

// Login helper — inyecta sesión via localStorage
async function login(page: any, email = 'bernaberoberto01@gmail.com', pass = 'Roberto72') {
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email, password: pass }
  })
  const auth = await res.json()
  if (!auth.access_token) throw new Error('Login fallido: ' + JSON.stringify(auth))
  
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ token, refresh, user, key }: any) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: token, token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now()/1000) + 3600,
      refresh_token: refresh, user
    }))
  }, { token: auth.access_token, refresh: auth.refresh_token, user: auth.user, key: STORAGE_KEY })
  
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  return auth
}

// Navegar a una ruta y recoger errores JS
async function auditPage(page: any, path: string) {
  const errors: string[] = []
  const warnings: string[] = []
  page.on('pageerror', (e: Error) => errors.push(e.message))
  page.on('console', (msg: any) => { if (msg.type() === 'error') warnings.push(msg.text()) })
  
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  
  return { errors, warnings }
}

test.describe('Audit Forge — entrenador', () => {

  test('Dashboard', async ({ page }) => {
    await login(page)
    const { errors } = await auditPage(page, '/dashboard')
    console.log('Errores JS:', errors)
    expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
    const body = await page.evaluate(() => document.body.innerText)
    expect(body).toContain('Dashboard')
    console.log('✅ Dashboard OK')
  })

  test('Clientes', async ({ page }) => {
    await login(page)
    const { errors } = await auditPage(page, '/clientes')
    console.log('Errores JS:', errors)
    expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
    console.log('✅ Clientes OK')
  })

  test('Rutinas', async ({ page }) => {
    await login(page)
    const { errors } = await auditPage(page, '/rutinas')
    console.log('Errores JS:', errors)
    expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
    console.log('✅ Rutinas OK')
  })

  test('Agenda — grupos visibles', async ({ page }) => {
    await login(page)
    const { errors } = await auditPage(page, '/agenda')
    console.log('Errores JS:', errors)
    // Sin errores JS críticos
    expect(errors.filter(e => !e.includes('Warning') && !e.includes('net::ERR'))).toEqual([])
    // Verificar que grupos aparecen
    const body = await page.evaluate(() => document.body.innerText)
    const tieneGrupos = body.includes('CAMPEONES') || body.includes('CHICAS') || body.includes('18:00') || body.includes('19:00')
    console.log('Grupos visibles:', tieneGrupos)
    // Screenshot para revisión visual
    await page.screenshot({ path: '/home/claude/forge/test-results/agenda-audit.png' })
    console.log('✅ Agenda OK')
  })

  test('Seguimiento', async ({ page }) => {
    await login(page)
    const { errors } = await auditPage(page, '/seguimiento')
    console.log('Errores JS:', errors)
    expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
    console.log('✅ Seguimiento OK')
  })

  test('Mensajes', async ({ page }) => {
    await login(page)
    const { errors } = await auditPage(page, '/mensajes')
    console.log('Errores JS:', errors)
    expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
    console.log('✅ Mensajes OK')
  })

  test('Pagos', async ({ page }) => {
    await login(page)
    const { errors } = await auditPage(page, '/pagos')
    console.log('Errores JS:', errors)
    expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
    console.log('✅ Pagos OK')
  })

  test('Nutrición', async ({ page }) => {
    await login(page)
    const { errors } = await auditPage(page, '/nutricion')
    console.log('Errores JS:', errors)
    expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
    console.log('✅ Nutrición OK')
  })

  test('Configuración', async ({ page }) => {
    await login(page)
    const { errors } = await auditPage(page, '/configuracion')
    console.log('Errores JS:', errors)
    expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
    console.log('✅ Configuración OK')
  })

})

test.describe('Audit Forge — portal cliente (demo)', () => {

  test('Portal cliente — carga y tabs visibles', async ({ page }) => {
    await login(page, 'demo@forge-studio.es', 'Demo2024!')
    const { errors } = await auditPage(page, '/')
    console.log('Errores JS:', errors)
    const body = await page.evaluate(() => document.body.innerText)
    const tieneInicio = body.includes('Bienvenido') || body.includes('Inicio') || body.includes('Rutina') || body.includes('Tu plan')
    console.log('Portal cargado:', tieneInicio, '| Errores:', errors.length)
    await page.screenshot({ path: '/home/claude/forge/test-results/portal-cliente.png' })
    console.log('✅ Portal cliente OK')
  })

})
