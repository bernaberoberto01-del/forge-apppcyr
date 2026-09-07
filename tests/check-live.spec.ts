import { test } from '@playwright/test'

const BASE = 'https://forge-studio-os.vercel.app'
const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const KEY = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('admin y portal — errores JS en vivo', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // Admin
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'bernaberoberto01@gmail.com', password: 'Roberto72' }
  })
  const auth = await res.json()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)
  console.log('ERRORES ADMIN:', errors)
  await page.screenshot({ path: '/tmp/live-admin.png' })

  // Portal cliente
  errors.length = 0
  const res2 = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'rbernabe@alu.ucam.edu', password: 'Roberto72' }
  })
  const auth2 = await res2.json()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t:auth2.access_token, r:auth2.refresh_token, u:auth2.user, k:KEY })

  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(4000)
  const body = await page.evaluate(() => document.body.innerText)
  console.log('ERRORES PORTAL:', errors)
  console.log('PORTAL BODY:', body.slice(0, 300))
  await page.screenshot({ path: '/tmp/live-portal.png' })
})
