import { test } from '@playwright/test'

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY  = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('ver portal de Juan Bernabé como él lo ve', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // Login como Juan (vincular-cliente usa su email)
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'juanbernabemadrona@hotmail.com', password: 'Juan2024!' }
  })
  const auth = await res.json()
  console.log('Login Juan:', auth.user?.email || auth.error || 'Sin cuenta de auth')

  if (!auth.access_token) {
    console.log('Juan no tiene cuenta de auth creada — el portal requiere login previo')
    console.log('Error:', JSON.stringify(auth))
    return
  }

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }: any) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t: auth.access_token, r: auth.refresh_token, u: auth.user, k: KEY })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  console.log('URL tras login:', page.url())
  const body = await page.evaluate(() => document.body.innerText)
  console.log('\n=== PORTAL JUAN — lo que ve ===')
  console.log(body.slice(0, 3000))
  console.log('\nErrores JS:', errors)

  await page.screenshot({ path: '/tmp/portal-juan.png', fullPage: true })
})
