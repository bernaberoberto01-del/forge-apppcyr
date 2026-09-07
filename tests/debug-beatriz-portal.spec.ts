import { test } from '@playwright/test'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY  = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('beatriz ve sus datos en el portal', async ({ page }) => {
  const errors: string[] = []
  const responses: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('response', async r => {
    if (r.url().includes('/rest/v1/')) {
      const tabla = r.url().split('/rest/v1/')[1].split('?')[0]
      try {
        const body = await r.json()
        const count = Array.isArray(body) ? body.length : 'obj'
        responses.push(`${tabla}:${r.status()}:${count}`)
      } catch { responses.push(`${tabla}:${r.status()}:err`) }
    }
  })

  // Login real de Beatriz
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'beatrizar79@gmail.com', password: 'Forge2024!' }
  })
  const auth = await res.json()
  console.log('Auth Beatriz:', auth.user?.email || auth.error_code)
  
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({ 
      access_token:t, token_type:'bearer', 
      expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, 
      refresh_token:r, user:u 
    }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })

  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(5000)

  const body = await page.evaluate(() => document.body.innerText)
  console.log('\nRESPUESTAS SUPABASE:')
  responses.forEach(r => console.log(' ', r))
  console.log('\nERRORES JS:', errors)
  console.log('\nCONTENIDO PORTAL:')
  console.log(body.slice(0, 800))
  
  await page.screenshot({ path: '/tmp/beatriz-portal.png' })
})
