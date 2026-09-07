import { test } from '@playwright/test'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY  = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'
const SAMUEL_ID = '464175ba-e457-4633-b819-eb277e346e3b'

test('debug samuel — portal vacío', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // Login Samuel con contraseña nueva (reset enviado)
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'samuberu@gmail.com', password: 'Samuel72' }
  })
  const auth = await res.json()
  const token = auth.access_token || ''
  console.log('Login:', auth.error_code || 'OK', '| Token:', token ? token.slice(0,20)+'...' : 'NINGUNO')

  if (!token) {
    console.log('Sin token — probando con sesión inyectada directamente')
  }

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })

  // Si no hay token, inyectar sesión directamente en localStorage
  if (token) {
    await page.evaluate(({ t, r, u, k }) => {
      localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer',
        expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
    }, { t:token, r:auth.refresh_token, u:auth.user, k:KEY })
  }

  // Interceptar las respuestas de Supabase para ver qué devuelven
  const supaResponses: any[] = []
  page.on('response', async r => {
    if (r.url().includes('supabase') && r.url().includes('/rest/v1/')) {
      const url = r.url().split('/rest/v1/')[1]?.split('?')[0]
      try {
        const body = await r.json()
        supaResponses.push({ tabla: url, status: r.status(), count: Array.isArray(body) ? body.length : 'objeto' })
      } catch {}
    }
  })

  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(5000)

  const url = page.url()
  const body = await page.evaluate(() => document.body.innerText)

  console.log('\nURL final:', url)
  console.log('Errores JS:', errors)
  console.log('\nRespuestas Supabase:')
  supaResponses.forEach(r => console.log(`  ${r.tabla}: HTTP ${r.status} → ${r.count} resultados`))
  console.log('\nPortal body (inicio):')
  console.log(body.slice(0, 500))

  await page.screenshot({ path: '/tmp/samuel-portal.png' })
})
