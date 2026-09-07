import { test } from '@playwright/test'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
// URL del deploy más reciente directamente
const BASE = 'https://forge-studio-ocle4toz5-bernaberoberto01-4397s-projects.vercel.app'
const KEY = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('captura deploy nuevo — rutina y nutrición', async ({ browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'beatrizar79@gmail.com', password: 'Forge2024!' }
  })
  const auth = await res.json()

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer',
      expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })

  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/tmp/nuevo-inicio.png', fullPage: true })

  await page.click('button:has-text("Rutina")')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/nuevo-rutina.png', fullPage: true })

  await page.click('button:has-text("Nutrición")')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/nuevo-nutricion.png', fullPage: true })

  await ctx.close()
})
