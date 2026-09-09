import { test } from '@playwright/test'
const SUPA='https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE='https://forge-studio-os.vercel.app'
const KEY='sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('beatriz full', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto(`${BASE}/login`, {waitUntil:'networkidle'})
  await page.fill('input[type="email"]', 'beatrizar79@gmail.com')
  await page.fill('input[type="password"]', 'Forge2024!')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(7000)
  await page.screenshot({path:'/tmp/b-hoy.png', fullPage:true})

  const navClick = async (texto: string) => {
    await page.evaluate((t) => {
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent?.includes(t))
      if (btn) (btn as HTMLElement).click()
    }, texto)
    await page.waitForTimeout(2000)
  }
  const btnClick = async (texto: string) => {
    await page.evaluate((t) => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim().includes(t))
      if (btn) (btn as HTMLElement).click()
    }, texto)
    await page.waitForTimeout(1000)
  }

  // Entrena — días colapsados
  await navClick('Entrena')
  await page.screenshot({path:'/tmp/b-entrena.png', fullPage:false})

  // Expandir día 1 — ver histórico cargas
  await btnClick('Día 1')
  await page.waitForTimeout(500)
  await page.screenshot({path:'/tmp/b-entrena-d1.png', fullPage:true})

  // Progreso → Fuerza
  await navClick('Progreso')
  await btnClick('💪 Fuerza')
  await page.screenshot({path:'/tmp/b-fuerza.png', fullPage:true})

  // Click en el primer ejercicio de fuerza
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find(b => b.querySelector('.text-lg') || (b.textContent?.includes('kg') && b.textContent?.length < 80))
    if (btn) (btn as HTMLElement).click()
  })
  await page.waitForTimeout(1000)
  await page.screenshot({path:'/tmp/b-fuerza-detalle.png', fullPage:true})

  // Progreso → Peso
  await navClick('Progreso')
  await page.screenshot({path:'/tmp/b-progreso.png', fullPage:true})

  // Nutrición
  await navClick('Nutrición')
  await page.screenshot({path:'/tmp/b-nutricion.png', fullPage:true})

  // Más
  await navClick('Más')
  await page.screenshot({path:'/tmp/b-mas.png', fullPage:true})

  console.log('URL final:', page.url())
  console.log('Errores JS:', errors)
  await ctx.close()
})
