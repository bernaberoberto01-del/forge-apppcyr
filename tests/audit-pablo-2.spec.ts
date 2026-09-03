import { test } from '@playwright/test'

const BASE = 'https://pablo-rodriguez-centro.vercel.app'

test('audit profundo — agenda y clientes', async ({ page }) => {
  // Login
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', 'admin@pr.dev')
  await page.fill('input[type="password"]', 'Admin2026!')
  await page.click('button[type="submit"], button:has-text("Entrar")')
  await page.waitForTimeout(2000)

  // --- CENTRO (ruta correcta) ---
  await page.goto(`${BASE}/centro`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const centroText = await page.evaluate(() => document.body.innerText)
  console.log('\n=== /CENTRO ===')
  console.log(centroText.slice(0, 1500))
  await page.screenshot({ path: '/tmp/pablo-centro.png' })

  // --- PAGOS (ruta correcta) ---
  await page.goto(`${BASE}/pagos`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const pagosText = await page.evaluate(() => document.body.innerText)
  console.log('\n=== /PAGOS ===')
  console.log(pagosText.slice(0, 1500))
  await page.screenshot({ path: '/tmp/pablo-pagos.png' })

  // --- AGENDA — explorar tabs y funciones ---
  await page.goto(`${BASE}/agenda`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Click en "Recurrentes"
  try {
    await page.click('text=Recurrentes', { timeout: 3000 })
    await page.waitForTimeout(1500)
    const recText = await page.evaluate(() => document.body.innerText)
    console.log('\n=== AGENDA - RECURRENTES ===')
    console.log(recText.slice(0, 1000))
    await page.screenshot({ path: '/tmp/pablo-recurrentes.png' })
    await page.press('Escape', { timeout: 2000 }).catch(() => {})
  } catch {}

  // Click en "Nueva regla"
  try {
    await page.click('text=Nueva regla', { timeout: 3000 })
    await page.waitForTimeout(1500)
    const reglaText = await page.evaluate(() => document.body.innerText)
    console.log('\n=== AGENDA - NUEVA REGLA ===')
    console.log(reglaText.slice(0, 1500))
    await page.screenshot({ path: '/tmp/pablo-nueva-regla.png' })
    await page.press('Escape', { timeout: 2000 }).catch(() => {})
  } catch {}

  // Click en "+ Sesión"
  try {
    await page.click('text=+ Sesión', { timeout: 3000 })
    await page.waitForTimeout(1500)
    const sesText = await page.evaluate(() => document.body.innerText)
    console.log('\n=== AGENDA - NUEVA SESIÓN (campos disponibles) ===')
    console.log(sesText.slice(0, 2000))
    await page.screenshot({ path: '/tmp/pablo-nueva-sesion.png' })
    await page.press('Escape', { timeout: 2000 }).catch(() => {})
  } catch {}

  // Tab Nutricionista
  try {
    await page.click('text=Nutricionista', { timeout: 3000 })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/pablo-nutricion-agenda.png' })
    const nutrText = await page.evaluate(() => document.body.innerText)
    console.log('\n=== AGENDA - NUTRICIONISTA/FISIO ===')
    console.log(nutrText.slice(0, 1000))
  } catch {}

  // --- CLIENTE — ver la ficha de uno ---
  await page.goto(`${BASE}/clientes`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  try {
    await page.click('button:has-text("Editar")', { timeout: 3000 })
    await page.waitForTimeout(1500)
    const fichaText = await page.evaluate(() => document.body.innerText)
    console.log('\n=== FICHA CLIENTE (campos disponibles) ===')
    console.log(fichaText.slice(0, 2000))
    await page.screenshot({ path: '/tmp/pablo-ficha-cliente.png' })
  } catch {}
})
