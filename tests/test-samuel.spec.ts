import { test } from '@playwright/test'
const SUPA='https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE='https://forge-studio-os.vercel.app'
const KEY='sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('portal samuel', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // Login real en vez de inyectar token
  await page.goto(`${BASE}/login`, {waitUntil:'networkidle'})
  await page.fill('input[type="email"]', 'samuberu@gmail.com')
  await page.fill('input[type="password"]', 'Forge2024!')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(6000) // esperar detección de rol + carga portal
  await page.screenshot({path:'/tmp/s-hoy.png', fullPage:true})
  console.log('URL actual:', page.url())

  const click = async (texto: string, archivo: string) => {
    await page.evaluate((t) => {
      const btns = Array.from(document.querySelectorAll('nav button'))
      const btn = btns.find(b => b.textContent?.includes(t))
      if (btn) (btn as HTMLElement).click()
    }, texto)
    await page.waitForTimeout(2000)
    await page.screenshot({path:`/tmp/s-${archivo}.png`, fullPage:true})
  }

  await click('Entrena', 'entrena')
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    btns.find(b => /Día 1|día 1/i.test(b.textContent||''))?.click()
  })
  await page.waitForTimeout(800)
  await page.screenshot({path:'/tmp/s-entrena-abierto.png', fullPage:true})

  await click('Progreso', 'progreso')
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    btns.find(b => b.textContent?.trim() === '💪 Fuerza')?.click()
  })
  await page.waitForTimeout(1000)
  await page.screenshot({path:'/tmp/s-fuerza.png', fullPage:true})

  await click('Nutrición', 'nutricion')

  console.log('Errores JS:', errors.slice(0,3))
  await ctx.close()
})
