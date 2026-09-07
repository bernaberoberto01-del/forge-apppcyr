import { test } from '@playwright/test'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

async function login(page, email, pass) {
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email, password: pass }
  })
  const auth = await res.json()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer',
      expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })
  return auth
}

test('ver portal Beatriz — todos los tabs', async ({ page }) => {
  await login(page, 'beatrizar79@gmail.com', 'Forge2024!')
  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/tmp/tab-inicio.png', fullPage: true })

  const tabs = ['💪', '🥗', '📈', '✉️', '⚙️']
  const nombres = ['rutina', 'nutricion', 'progreso', 'mensajes', 'ajustes']
  
  for (let i = 0; i < tabs.length; i++) {
    const btn = page.locator('button').filter({ hasText: tabs[i] }).first()
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `/tmp/tab-${nombres[i]}.png`, fullPage: true })
    }
  }
})
