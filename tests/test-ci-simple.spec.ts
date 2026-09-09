import { test } from '@playwright/test'
const BASE='https://forge-studio-os.vercel.app'

test('check-in flujo completo', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const networkReqs: string[] = []
  
  // Interceptar llamadas a Supabase para ver si se guarda
  page.on('request', req => {
    if (req.url().includes('checkins') && req.method() === 'POST') {
      networkReqs.push(`POST checkins: ${req.postData()?.slice(0,100)}`)
    }
  })
  page.on('response', res => {
    if (res.url().includes('checkins') && res.request().method() === 'POST') {
      res.json().then(d => networkReqs.push(`RESP checkins: ${JSON.stringify(d)?.slice(0,100)}`)).catch(()=>{})
    }
  })

  await page.goto(`${BASE}/login`, {waitUntil:'networkidle'})
  await page.fill('input[type="email"]', 'beatrizar79@gmail.com')
  await page.fill('input[type="password"]', 'Forge2024!')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(7000)

  // Abrir modal
  const ciBtn = page.locator('button').filter({hasText: /Check-in/}).first()
  await ciBtn.click()
  await page.waitForTimeout(800)

  // Seleccionar valores — buscar los botones numéricos dentro del modal
  const modal = page.locator('.rounded-3xl').first()
  const grids = modal.locator('.grid')
  const count = await grids.count()
  console.log('Grids en modal:', count)

  // Energia: botón "4"
  await modal.locator('button').filter({hasText: /^4$/}).first().click(); await page.waitForTimeout(200)
  // Sueño: botón "3" (segundo grupo)
  await modal.locator('button').filter({hasText: /^3$/}).nth(1).click(); await page.waitForTimeout(200)
  // Fatiga: botón "5"
  await modal.locator('button').filter({hasText: /^5$/}).nth(2).click(); await page.waitForTimeout(200)
  // Estrés: botón "4"
  await modal.locator('button').filter({hasText: /^4$/}).nth(3).click(); await page.waitForTimeout(200)

  await page.screenshot({path:'/tmp/ci2-rellenado.png'})

  // Enviar
  const enviar = modal.locator('button').filter({hasText: /Enviar check-in/})
  const disabled = await enviar.getAttribute('disabled')
  console.log('Botón Enviar disabled:', disabled)
  await enviar.click({force: true})
  await page.waitForTimeout(3000)
  await page.screenshot({path:'/tmp/ci2-enviado.png'})

  console.log('Llamadas a checkins:', networkReqs)
  await ctx.close()
})
