import { test, expect } from '@playwright/test'
const SUPA='https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE='https://forge-studio-os.vercel.app'
const KEY='sb-qdpqpbkppkhzcxpfypvf-auth-token'

const CLIENTES = [
  { nombre: 'Beatriz', email: 'beatrizar79@gmail.com', pass: 'Forge2024!' },
  { nombre: 'Amalio',  email: 'aj1997gs@icloud.com',   pass: 'Forge2024!' },
  { nombre: 'Fran',    email: 'frangutival@gmail.com',  pass: 'Forge2024!' },
  { nombre: 'Juan',    email: 'juanbernabemadrona@hotmail.com', pass: 'Forge2024!' },
]

for (const cliente of CLIENTES) {
  test(`portal ${cliente.nombre}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))

    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', cliente.email)
    await page.fill('input[type="password"]', cliente.pass)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(7000)
    await page.screenshot({ path: `/tmp/estab-${cliente.nombre}-hoy.png`, fullPage: false })

    // Verificar que cargó el portal (no el login)
    const url = page.url()
    const esPortal = !url.includes('login')
    console.log(`${cliente.nombre}: URL=${url} | Errores JS: ${errors.length} | Es portal: ${esPortal}`)
    if (errors.length) console.log('  Errores:', errors.slice(0,3))

    // Navegar por cada tab y capturar errores
    const tabs = ['Entrena', 'Nutrición', 'Progreso', 'Más']
    for (const tabLabel of tabs) {
      errors.length = 0 // reset
      await page.evaluate((t) => {
        const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent?.includes(t))
        if (btn) (btn as HTMLElement).click()
      }, tabLabel)
      await page.waitForTimeout(2000)
      if (errors.length) {
        console.log(`  Tab ${tabLabel}: ERRORES — ${errors.join(', ')}`)
        await page.screenshot({ path: `/tmp/estab-${cliente.nombre}-${tabLabel}-ERROR.png` })
      } else {
        console.log(`  Tab ${tabLabel}: OK`)
      }
    }

    expect(errors.length).toBe(0)
    await ctx.close()
  })
}
