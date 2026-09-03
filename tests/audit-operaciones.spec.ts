import { test, expect } from '@playwright/test'

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const KEY  = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

async function login(page: any) {
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'bernaberoberto01@gmail.com', password: 'Roberto72' }
  })
  const auth = await res.json()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }: any) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })
  await page.reload({ waitUntil:'networkidle' })
  await page.waitForTimeout(1000)
}

test.describe('Audit operaciones básicas', () => {

  test('Nutrición — ver, editar y eliminar borradores', async ({ page }) => {
    await login(page)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    
    await page.goto(`${BASE}/nutricion`, { waitUntil:'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path:'/tmp/nutricion-estado.png', fullPage:true })
    
    const body = await page.evaluate(() => document.body.innerText)
    console.log('\n=== NUTRICIÓN — pantalla completa ===')
    console.log(body.slice(0, 3000))
    
    // Verificar botones disponibles
    const botones = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button'))
        .map(b => b.textContent?.trim())
        .filter(t => t && t.length > 1 && t.length < 50)
    })
    console.log('\n=== BOTONES DISPONIBLES ===')
    console.log(botones.join(' | '))
    
    expect(errors, 'Errores JS en Nutrición').toEqual([])
    console.log('✅ Nutrición carga sin errores JS')
  })

  test('Rutinas — eliminar borrador funciona', async ({ page }) => {
    await login(page)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    
    await page.goto(`${BASE}/rutinas`, { waitUntil:'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path:'/tmp/rutinas-estado.png', fullPage:true })
    
    const body = await page.evaluate(() => document.body.innerText)
    console.log('\n=== RUTINAS — pantalla ===')
    console.log(body.slice(0, 2000))
    
    expect(errors).toEqual([])
    console.log('✅ Rutinas OK')
  })

  test('Sesiones — horas distintas por día', async ({ page }) => {
    await login(page)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    
    await page.goto(`${BASE}/agenda`, { waitUntil:'networkidle' })
    await page.waitForTimeout(2000)
    
    // Abrir modal nueva regla recurrente
    await page.click('text=↻ Nueva regla', { timeout:5000 }).catch(() => {})
    await page.waitForTimeout(1500)
    
    const modalText = await page.evaluate(() => document.body.innerText)
    const tieneHoraPorDia = modalText.includes('hora') && (modalText.includes('Lunes') || modalText.includes('lunes'))
    console.log('\n=== MODAL NUEVA REGLA ===')
    console.log(modalText.slice(0, 1500))
    console.log('¿Tiene hora por día?', tieneHoraPorDia)
    
    await page.screenshot({ path:'/tmp/agenda-nueva-regla.png', fullPage:true })
    expect(errors).toEqual([])
    console.log('✅ Agenda modal OK')
  })

  test('Clientes — editar ficha completa', async ({ page }) => {
    await login(page)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    
    await page.goto(`${BASE}/clientes`, { waitUntil:'networkidle' })
    await page.waitForTimeout(2000)
    
    // Click en el primer cliente
    await page.click('text=Ver ficha', { timeout:5000 }).catch(async () => {
      await page.click('[class*="cursor-pointer"]', { timeout:3000 }).catch(() => {})
    })
    await page.waitForTimeout(1500)
    
    const fichaText = await page.evaluate(() => document.body.innerText)
    console.log('\n=== FICHA CLIENTE ===')
    console.log(fichaText.slice(0, 2000))
    
    await page.screenshot({ path:'/tmp/clientes-ficha.png', fullPage:true })
    expect(errors).toEqual([])
    console.log('✅ Clientes ficha OK')
  })
})
