import { test } from '@playwright/test'

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const KEY = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

async function login(page: any, email = 'bernaberoberto01@gmail.com', pass = 'Roberto72') {
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email, password: pass }
  })
  const auth = await res.json()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }: any) => {
    localStorage.setItem(k, JSON.stringify({ access_token: t, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, refresh_token: r, user: u }))
  }, { t: auth.access_token, r: auth.refresh_token, u: auth.user, k: KEY })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
}

const PANTALLAS = [
  ['/dashboard', 'dashboard'],
  ['/clientes', 'clientes'],
  ['/rutinas', 'rutinas'],
  ['/agenda', 'agenda'],
  ['/seguimiento', 'seguimiento'],
  ['/mensajes', 'mensajes'],
  ['/pagos', 'pagos'],
  ['/nutricion', 'nutricion'],
  ['/configuracion', 'configuracion'],
]

test('screenshots — desktop (1280x800)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await login(page)
  for (const [ruta, nombre] of PANTALLAS) {
    await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `/home/claude/forge/test-results/desktop-${nombre}.png`, fullPage: true })
    console.log(`📸 desktop-${nombre}.png`)
  }
})

test('screenshots — mobile (390x844)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  for (const [ruta, nombre] of PANTALLAS) {
    await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `/home/claude/forge/test-results/mobile-${nombre}.png`, fullPage: true })
    console.log(`📱 mobile-${nombre}.png`)
  }
})

test('screenshots — portal cliente', async ({ page }) => {
  await login(page, 'demo@forge-studio.es', 'Demo2024!')
  const TABS = ['/', '/?tab=rutina', '/?tab=progreso', '/?tab=mensajes', '/?tab=clases']
  await page.setViewportSize({ width: 390, height: 844 })
  for (const tab of TABS) {
    const nombre = tab.replace('/?tab=', '').replace('/', 'inicio')
    await page.goto(`${BASE}${tab}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `/home/claude/forge/test-results/portal-${nombre}.png` })
    console.log(`📱 portal-${nombre}.png`)
  }
})
