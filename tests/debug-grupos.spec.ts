import { test } from '@playwright/test'

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'

test('debug grupos en agenda', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  const gruposRequests: any[] = []
  page.on('response', async res => {
    if (res.url().includes('/grupos')) {
      const body = await res.text().catch(() => '?')
      gruposRequests.push({ status: res.status(), body: body.slice(0, 400) })
    }
  })

  // Obtener token via REST
  const authRes = await page.request.post(
    'https://qdpqpbkppkhzcxpfypvf.supabase.co/auth/v1/token?grant_type=password',
    { headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      data: { email: 'bernaberoberto01@gmail.com', password: 'Roberto72' } }
  )
  const auth = await authRes.json()
  console.log('Login:', auth.user?.email || auth.error_description)

  // Ir a la app y meter el token ANTES de que React hidrate
  await page.goto('https://forge-studio-os.vercel.app', { waitUntil: 'domcontentloaded' })
  
  // Meter el token en localStorage con el formato exacto que usa Supabase JS v2
  await page.evaluate((authData) => {
    const session = {
      access_token: authData.access_token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now()/1000) + 3600,
      refresh_token: authData.refresh_token,
      user: authData.user,
    }
    // Supabase v2 usa esta key
    const key = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'
    localStorage.setItem(key, JSON.stringify(session))
    // También probar el formato antiguo
    sessionStorage.setItem(key, JSON.stringify(session))
  }, auth)

  // Recargar para que React coja el token
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  console.log('URL tras reload:', page.url())

  // Ir directamente a agenda
  await page.goto('https://forge-studio-os.vercel.app/agenda', { waitUntil: 'networkidle' })
  await page.waitForTimeout(5000)
  
  console.log('URL final:', page.url())
  console.log('\n=== Errores JS ===')
  errors.forEach(e => console.log('ERROR:', e))
  console.log('\n=== Requests /grupos ===')
  if (gruposRequests.length === 0) console.log('⚠️  CERO requests a /grupos')
  gruposRequests.forEach(r => console.log(r.status, r.body))
  
  const bodyText = await page.evaluate(() => document.body.innerText)
  const debugLine = bodyText.split('\n').find(l => l.includes('uid=') || l.includes('Grupos:') || l.includes('cId='))
  console.log('\n=== Debug UI ===', debugLine || 'No encontrado')
  
  await page.screenshot({ path: '/home/claude/forge/test-results/agenda.png' })
})
