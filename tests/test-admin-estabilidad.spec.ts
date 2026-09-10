import { test } from '@playwright/test'
const SUPA='https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE='https://forge-studio-os.vercel.app'
const KEY='sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('admin — todas las secciones', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // Login admin
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'bernaberoberto01@gmail.com', password: 'Roberto72' }
  })
  const auth = await res.json()
  await page.goto(BASE)
  await page.evaluate(({ t, r, u, k }) => localStorage.setItem(k, JSON.stringify({
    access_token: t, token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now()/1000)+3600, refresh_token: r, user: u
  })), { t: auth.access_token, r: auth.refresh_token, u: auth.user, k: KEY })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  const RUTAS = [
    { path: '/', label: 'Dashboard' },
    { path: '/clientes', label: 'Clientes' },
    { path: '/seguimiento', label: 'Seguimiento' },
    { path: '/agenda', label: 'Agenda' },
    { path: '/rutinas', label: 'Rutinas' },
    { path: '/nutricion', label: 'Nutrición admin' },
    { path: '/biblioteca', label: 'Biblioteca' },
  ]

  for (const ruta of RUTAS) {
    errors.length = 0
    await page.goto(`${BASE}${ruta.path}`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `/tmp/admin-${ruta.label.replace(' ','_')}.png` })
    console.log(`${ruta.label}: ${errors.length ? 'ERROR — ' + errors.slice(0,2).join(' | ') : 'OK'}`)
  }

  await ctx.close()
})
