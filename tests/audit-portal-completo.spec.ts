import { test } from '@playwright/test'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('portal completo — todas las pantallas', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }) // iPhone
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'beatrizar79@gmail.com', password: 'Forge2024!' }
  })
  const auth = await res.json()
  console.log('Login:', auth.user?.email || auth.error_code)

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer',
      expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })

  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/tmp/p1-inicio.png', fullPage: true })
  console.log('Inicio capturado')

  // Rutina
  const btnRutina = page.locator('button').filter({ hasText: 'Rutina' }).first()
  if (await btnRutina.isVisible()) { await btnRutina.click(); await page.waitForTimeout(2000) }
  await page.screenshot({ path: '/tmp/p2-rutina.png', fullPage: true })

  // Nutrición
  const btnNutri = page.locator('button').filter({ hasText: 'Nutrición' }).first()
  if (await btnNutri.isVisible()) { await btnNutri.click(); await page.waitForTimeout(2000) }
  await page.screenshot({ path: '/tmp/p3-nutricion.png', fullPage: true })

  // Progreso
  const btnProg = page.locator('button').filter({ hasText: 'Progreso' }).first()
  if (await btnProg.isVisible()) { await btnProg.click(); await page.waitForTimeout(2000) }
  await page.screenshot({ path: '/tmp/p4-progreso.png', fullPage: true })

  // Mensajes
  const btnMsg = page.locator('button').filter({ hasText: 'Mensajes' }).first()
  if (await btnMsg.isVisible()) { await btnMsg.click(); await page.waitForTimeout(2000) }
  await page.screenshot({ path: '/tmp/p5-mensajes.png', fullPage: true })

  console.log('Errores JS:', errors)
  await ctx.close()
})
