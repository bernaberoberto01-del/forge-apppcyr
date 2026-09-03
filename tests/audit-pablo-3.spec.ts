import { test } from '@playwright/test'

const BASE = 'https://pablo-rodriguez-centro.vercel.app'

test('audit — ficha cliente y modal sesion', async ({ page }) => {
  await page.goto(BASE)
  await page.fill('input[type="email"]', 'admin@pr.dev')
  await page.fill('input[type="password"]', 'Admin2026!')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2000)

  // Abrir ficha del primer cliente
  await page.goto(`${BASE}/clientes`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  
  // Click en Editar del primer cliente
  const editBtn = page.locator('button:has-text("Editar")').first()
  await editBtn.click()
  await page.waitForTimeout(2000)
  
  const fichaText = await page.evaluate(() => document.body.innerText)
  console.log('\n=== FICHA CLIENTE — CAMPOS COMPLETOS ===')
  console.log(fichaText.slice(0, 3000))
  await page.screenshot({ path: '/tmp/pablo-ficha-completa.png', fullPage: true })

  // Cerrar y abrir modal de nueva sesión desde agenda
  await page.press('Escape').catch(() => {})
  await page.goto(`${BASE}/agenda`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  // Click en + Sesión
  await page.click('text=+ Sesión', { timeout: 5000 })
  await page.waitForTimeout(2000)
  const sesionText = await page.evaluate(() => document.body.innerText)
  console.log('\n=== MODAL NUEVA SESIÓN — CAMPOS ===')
  console.log(sesionText.slice(0, 3000))
  await page.screenshot({ path: '/tmp/pablo-modal-sesion.png', fullPage: true })

  // Ver tab nutricionista/fisio
  await page.press('Escape').catch(() => {})
  await page.waitForTimeout(500)
  
  try {
    await page.click('text=Nutricionista y fisioterapeuta', { timeout: 3000 })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/pablo-tab-nutricion.png' })
    
    // Nueva cita en este tab
    await page.click('text=+ Sesión, text=+ Cita, text=Nueva cita', { timeout: 3000 })
    await page.waitForTimeout(1500)
    const citaText = await page.evaluate(() => document.body.innerText)
    console.log('\n=== MODAL NUEVA CITA NUTRICIÓN/FISIO ===')
    console.log(citaText.slice(0, 2000))
    await page.screenshot({ path: '/tmp/pablo-modal-cita.png', fullPage: true })
  } catch(e) {
    console.log('Tab nutrición error:', e)
  }
})
