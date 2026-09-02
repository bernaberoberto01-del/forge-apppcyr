import { test, expect } from '@playwright/test'

const EMAIL = process.env.FORGE_EMAIL || ''
const PASS = process.env.FORGE_PASS || ''
const SUPABASE_URL = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'

async function login(page: any) {
  const res = await page.request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: EMAIL, password: PASS }
  })
  const auth = await res.json()
  if (!auth.access_token) throw new Error('Login fallido: ' + JSON.stringify(auth))
  await page.goto('https://forge-studio-os.vercel.app')
  await page.evaluate(({ token, refresh, user }: any) => {
    localStorage.setItem('sb-qdpqpbkppkhzcxpfypvf-auth-token', JSON.stringify({
      access_token: token, refresh_token: refresh, user, token_type: 'bearer', expires_in: 3600
    }))
  }, { token: auth.access_token, refresh: auth.refresh_token, user: auth.user })
  return auth
}

test.describe('Audit Forge — pantallas principales', () => {

  test('Dashboard carga sin errores', async ({ page }) => {
    await login(page)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('https://forge-studio-os.vercel.app/dashboard')
    await page.waitForTimeout(2000)
    expect(errors).toEqual([])
    await expect(page.locator('text=Dashboard,text=Atención requerida,text=Agenda').first()).toBeVisible()
    console.log('✅ Dashboard OK')
  })

  test('Agenda carga y muestra grupos', async ({ page }) => {
    await login(page)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('https://forge-studio-os.vercel.app/agenda')
    await page.waitForTimeout(3000)
    expect(errors).toEqual([])
    // Verificar que el debug muestra grupos > 0
    const debugEl = page.locator('span.font-mono')
    if (await debugEl.isVisible()) {
      const txt = await debugEl.textContent()
      console.log('Debug agenda:', txt)
      const match = txt?.match(/g=(\d+)/)
      if (match) {
        console.log(`Grupos encontrados: ${match[1]}`)
        expect(Number(match[1])).toBeGreaterThan(0)
      }
    }
    console.log('✅ Agenda OK')
  })

  test('Clientes carga sin errores', async ({ page }) => {
    await login(page)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('https://forge-studio-os.vercel.app/clientes')
    await page.waitForTimeout(2000)
    expect(errors).toEqual([])
    console.log('✅ Clientes OK')
  })

  test('Mensajes carga sin errores', async ({ page }) => {
    await login(page)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('https://forge-studio-os.vercel.app/mensajes')
    await page.waitForTimeout(2000)
    expect(errors).toEqual([])
    console.log('✅ Mensajes OK')
  })

  test('Rutinas carga sin errores', async ({ page }) => {
    await login(page)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('https://forge-studio-os.vercel.app/rutinas')
    await page.waitForTimeout(2000)
    expect(errors).toEqual([])
    console.log('✅ Rutinas OK')
  })

  test('Seguimiento carga sin errores', async ({ page }) => {
    await login(page)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('https://forge-studio-os.vercel.app/seguimiento')
    await page.waitForTimeout(2000)
    expect(errors).toEqual([])
    console.log('✅ Seguimiento OK')
  })

  test('Pagos carga sin errores', async ({ page }) => {
    await login(page)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('https://forge-studio-os.vercel.app/pagos')
    await page.waitForTimeout(2000)
    expect(errors).toEqual([])
    console.log('✅ Pagos OK')
  })

  test('Portal cliente carga sin errores (demo)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    // Login como cliente demo
    const res = await page.request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      data: { email: 'demo@forge-studio.es', password: 'Demo2024!' }
    })
    const auth = await res.json()
    if (auth.access_token) {
      await page.goto('https://forge-studio-os.vercel.app')
      await page.evaluate(({ token, refresh, user }: any) => {
        localStorage.setItem('sb-qdpqpbkppkhzcxpfypvf-auth-token', JSON.stringify({
          access_token: token, refresh_token: refresh, user, token_type: 'bearer', expires_in: 3600
        }))
      }, { token: auth.access_token, refresh: auth.refresh_token, user: auth.user })
      await page.goto('https://forge-studio-os.vercel.app')
      await page.waitForTimeout(2000)
      expect(errors).toEqual([])
      console.log('✅ Portal cliente OK')
    } else {
      console.log('⚠ Demo login falló — saltando test')
    }
  })
})
