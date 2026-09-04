import { test } from '@playwright/test'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY  = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('portal con cuenta de Roberto — reproducir spinner', async ({ page }) => {
  const errors: string[] = []
  const requests: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', msg => { if (msg.type() === 'error') errors.push('Console: ' + msg.text()) })
  page.on('requestfailed', r => requests.push(`FAILED: ${r.url()} — ${r.failure()?.errorText}`))

  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'bernaberoberto01@gmail.com', password: 'Roberto72' }
  })
  const auth = await res.json()
  console.log('Login OK:', !!auth.access_token)

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({
      access_token: t, token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600,
      refresh_token: r, user: u
    }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })

  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(6000)

  const body = await page.evaluate(() => document.body.innerText)
  const spinner = await page.evaluate(() => !!document.querySelector('[class*="animate-spin"]'))
  const url = page.url()

  console.log('URL final:', url)
  console.log('Tiene spinner:', spinner)
  console.log('Contenido:', body.slice(0, 400))
  console.log('Errores JS:', errors)
  console.log('Requests fallidos:', requests)

  await page.screenshot({ path: '/tmp/portal-roberto.png', fullPage: true })
})
