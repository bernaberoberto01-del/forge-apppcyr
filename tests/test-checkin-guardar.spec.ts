import { test, expect } from '@playwright/test'
const BASE='https://forge-studio-os.vercel.app'
const SUPA='https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'

test('check-in completo — guarda en BD', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()

  // Contar check-ins antes
  const antes = await page.request.get(`${SUPA}/rest/v1/checkins?select=id&order=fecha.desc&limit=1`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
  })
  const antesData = await antes.json()
  console.log('Check-ins antes:', antesData)

  await page.goto(`${BASE}/login`, {waitUntil:'networkidle'})
  await page.fill('input[type="email"]', 'beatrizar79@gmail.com')
  await page.fill('input[type="password"]', 'Forge2024!')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(7000)

  // Abrir modal check-in
  await page.click('button:has-text("Check-in")')
  await page.waitForTimeout(800)

  // Rellenar: Energía 4, Sueño 3, Fatiga 5, Estrés 4
  const selectVal = async (label: string, val: number) => {
    const section = page.locator('div').filter({ hasText: new RegExp(`^${label}`) }).first()
    await section.locator(`button:has-text("${val}")`).first().click()
  }

  await page.locator('.grid').nth(0).locator('button').nth(3).click() // Energía 4
  await page.waitForTimeout(200)
  await page.locator('.grid').nth(1).locator('button').nth(2).click() // Sueño 3
  await page.waitForTimeout(200)
  await page.locator('.grid').nth(2).locator('button').nth(4).click() // Fatiga 5
  await page.waitForTimeout(200)
  await page.locator('.grid').nth(3).locator('button').nth(3).click() // Estrés 4
  await page.waitForTimeout(200)

  await page.screenshot({path:'/tmp/ci-rellenado.png'})

  // Enviar
  await page.click('button:has-text("Enviar check-in")')
  await page.waitForTimeout(3000)
  await page.screenshot({path:'/tmp/ci-enviado.png'})

  // Verificar en BD
  const despues = await page.request.get(`${SUPA}/rest/v1/checkins?select=id,fecha,energia,sueno&order=fecha.desc&limit=3`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
  })
  const despuesData = await despues.json()
  console.log('Check-ins después:', despuesData)

  await ctx.close()
})
