import { test } from '@playwright/test'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY  = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('portal Samuel — screenshot de cada tab', async ({ page }) => {
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'samuberu@gmail.com', password: 'Samuel2024!' }
  })
  const auth = await res.json()
  if (!auth.access_token) { console.log('Sin token Samuel:', JSON.stringify(auth).slice(0,200)); return }

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })

  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)

  console.log('URL:', page.url())
  const body = await page.evaluate(() => document.body.innerText)
  console.log('Cargó portal:', !body.includes('Cuenta no asociada'))

  await page.screenshot({ path: '/tmp/portal-samuel-inicio.png', fullPage: false })

  // Tabs disponibles
  const tabBtns = await page.$$eval('button, [role="tab"]', btns =>
    btns.map(b => b.textContent?.trim()).filter(t => t && t.length < 25 && t.length > 1)
  )
  console.log('Botones/tabs:', [...new Set(tabBtns)].join(' | '))
  console.log('Contenido inicio:\n', body.slice(0, 1500))
})
