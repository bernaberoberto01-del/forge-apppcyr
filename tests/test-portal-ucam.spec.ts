import { test } from '@playwright/test'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY  = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('portal cliente ucam — ver todos los tabs', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'rbernabe@alu.ucam.edu', password: 'Roberto72' }
  })
  const auth = await res.json()
  console.log('Login ucam:', auth.user?.email || JSON.stringify(auth).slice(0,100))

  if (!auth.access_token) { console.log('Sin token — contraseña incorrecta'); return }

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })

  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(4000)

  const url = page.url()
  const body = await page.evaluate(() => document.body.innerText)
  console.log('URL:', url)
  console.log('CONTENIDO COMPLETO:\n', body.slice(0, 3000))
  console.log('Errores JS:', errors)

  // Screenshots de cada tab
  await page.screenshot({ path: '/tmp/portal-inicio.png', fullPage: true })

  // Ver tabs disponibles
  const tabs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[class*="tab"], button')).map(b => b.textContent?.trim()).filter(t => t && t.length < 20)
  )
  console.log('Tabs/botones:', [...new Set(tabs)].join(' | '))
})
