import { test } from '@playwright/test'

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY  = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('portal como Arturo — reproducir spinner', async ({ page }) => {
  const errors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  // Simular sesión de Arturo directamente con su auth_user_id
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ k, uid }) => {
    // Simular sesión con el UID de Arturo
    localStorage.setItem(k, JSON.stringify({
      access_token: 'fake_but_uid_known',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now()/1000)+3600,
      refresh_token: 'fake',
      user: { id: uid, email: 'artuuurogb@gmail.com' }
    }))
  }, { k: KEY, uid: '9a097bb0-b4c5-421e-98e1-388a2111dbd8' })

  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 25000 })
  await page.waitForTimeout(5000)

  const url = page.url()
  const body = await page.evaluate(() => document.body.innerText)
  const tieneSpinner = await page.evaluate(() => !!document.querySelector('[class*="animate-spin"]'))
  
  console.log('URL:', url)
  console.log('Tiene spinner:', tieneSpinner)
  console.log('Body (400 chars):', body.slice(0, 400))
  console.log('Errores JS:', errors)
  console.log('Console errors:', consoleErrors.slice(0, 5))

  await page.screenshot({ path: '/tmp/portal-arturo.png', fullPage: true })
})
