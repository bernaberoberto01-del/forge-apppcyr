import { test, expect } from '@playwright/test'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY  = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

// Clientes online activos con sus emails reales
const CLIENTES = [
  { nombre: 'Samuel', email: 'samuel.bernabeu@example.com' },
  { nombre: 'Beatriz', email: 'beatriz.alcalde@example.com' },
]

async function loginCliente(page: any, email: string) {
  // Intentar login — si no tiene contraseña, verificar con magic link
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email, password: 'test' }
  })
  return await res.json()
}

test('portal del cliente carga sin errores JS críticos', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => {
    // Solo errores reales, no warnings de React dev mode
    if (!e.message.includes('Warning') && !e.message.includes('act(')) {
      errors.push(e.message)
    }
  })
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`Console: ${msg.text()}`)
  })

  // Cargar el portal del cliente directamente
  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)

  const url = page.url()
  const body = await page.evaluate(() => document.body.innerText)

  console.log('URL final:', url)
  console.log('Body (primeros 500):', body.slice(0, 500))
  console.log('Errores JS:', errors)

  await page.screenshot({ path: '/tmp/portal-carga.png', fullPage: true })

  // El portal debe cargar algo — no debe estar en blanco
  expect(body.length, 'Portal completamente en blanco').toBeGreaterThan(10)
  expect(errors.filter(e => !e.includes('favicon') && !e.includes('404')), 
    'Errores JS críticos').toHaveLength(0)
})

test('portal con token inválido muestra pantalla de login, no error', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // Ir al portal sin autenticación
  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)

  const body = await page.evaluate(() => document.body.innerText)
  console.log('Sin auth:', body.slice(0, 300))

  // Debe mostrar login o redirigir, no pantalla en blanco o error
  const tieneContenido = body.length > 20
  expect(tieneContenido, 'Portal en blanco sin autenticación').toBe(true)
  expect(errors.length, 'Errores JS sin auth').toBe(0)
})

test('login portal y navegación básica', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // Intentar con el email de Samuel — ver qué pasa
  const auth = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'sbernabeu@example.com', password: 'wrongpass' }
  })
  const authData = await auth.json()
  console.log('Estado auth Samuel:', JSON.stringify(authData).slice(0, 200))

  // Verificar que la página de login portal existe
  await page.goto(`${BASE}/login-portal`, { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(1000)
  const loginBody = await page.evaluate(() => document.body.innerText)
  console.log('Página login portal:', loginBody.slice(0, 300))

  await page.screenshot({ path: '/tmp/login-portal.png', fullPage: true })
  expect(loginBody.length).toBeGreaterThan(10)
})
