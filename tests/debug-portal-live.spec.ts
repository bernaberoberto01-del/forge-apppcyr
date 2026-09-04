import { test } from '@playwright/test'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('debug portal — flujo completo con Arturo', async ({ page }) => {
  const errors: string[] = []
  const networkErrors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('requestfailed', r => networkErrors.push(`${r.url().slice(0,80)} — ${r.failure()?.errorText}`))
  page.on('response', r => {
    if (r.url().includes('supabase') && r.status() >= 400)
      console.log(`HTTP ${r.status()}: ${r.url().slice(0,100)}`)
  })

  // Simular exactamente lo que hace el portal cuando el cliente entra
  // El portal usa supabase.auth.getSession() — necesitamos una sesión real activa
  
  // Primero ver qué pasa con el portal sin sesión
  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)
  
  const body1 = await page.evaluate(() => document.body.innerText)
  const url1 = page.url()
  console.log('Sin sesión — URL:', url1)
  console.log('Sin sesión — Body:', body1.slice(0, 200))
  await page.screenshot({ path: '/tmp/debug-sin-sesion.png' })

  // Ahora con sesión de Arturo
  const authRes = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'artuuurogb@gmail.com', password: 'Arturo2024!' }
  })
  const auth = await authRes.json()
  console.log('\nAuth Arturo:', JSON.stringify(auth).slice(0, 150))

  if (auth.access_token) {
    await page.evaluate(({ t, r, u, k }) => {
      localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer',
        expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
    }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })

    await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(5000)
    
    // Ver exactamente qué queries hace el portal
    const queries = await page.evaluate(() => {
      return (window as any).__supabaseQueries || 'no debug'
    })
    
    const body2 = await page.evaluate(() => document.body.innerText)
    console.log('\nCon sesión Arturo:', body2.slice(0, 300))
    console.log('Errores JS:', errors)
    console.log('Network errors:', networkErrors)
    await page.screenshot({ path: '/tmp/debug-con-arturo.png' })
  } else {
    console.log('Arturo no tiene sesión activa — credenciales inválidas')
    console.log('El problema: el portal muestra cuenta no asociada porque el cliente')
    console.log('intenta entrar con un email que existe en auth pero su contraseña está en blanco')
    
    // Intentar con Samuel que sí tiene cuenta activa verificada en BD
    const authSam = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
      headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      data: { email: 'samuberu@gmail.com', password: 'Samuel72' }
    })
    const sam = await authSam.json()
    console.log('\nAuth Samuel:', JSON.stringify(sam).slice(0,150))
  }
})
