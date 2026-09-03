import { test } from '@playwright/test'

const BASE = 'https://pablo-rodriguez-centro.vercel.app'

test('audit sistema Pablo Rodríguez', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // Login
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  
  // Intentar login con formulario
  try {
    await page.fill('input[type="email"], input[placeholder*="mail"], input[placeholder*="suer"]', 'admin@pr.dev')
    await page.fill('input[type="password"], input[placeholder*="ontra"]', 'Admin2026!')
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login"), button:has-text("Acceder")')
    await page.waitForTimeout(3000)
  } catch(e) {
    console.log('Login form error:', e)
  }
  
  console.log('URL tras login:', page.url())
  await page.screenshot({ path: '/tmp/pablo-01-login.png' })

  // Navegar por todas las secciones visibles
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, nav button, [role="link"]'))
      .map(el => ({ text: el.textContent?.trim(), href: (el as any).href || '' }))
      .filter(l => l.text && l.text.length > 1 && l.text.length < 40)
  })
  console.log('\n=== NAVEGACIÓN DISPONIBLE ===')
  links.forEach(l => console.log(`  ${l.text} → ${l.href}`))

  // Capturar el contenido completo de la pantalla actual
  const bodyText = await page.evaluate(() => document.body.innerText)
  console.log('\n=== CONTENIDO PANTALLA ACTUAL ===')
  console.log(bodyText.slice(0, 2000))

  // Intentar navegar a secciones clave
  const secciones = [
    '/dashboard', '/agenda', '/clientes', '/equipo', '/cobros', '/configuracion'
  ]
  
  for (const ruta of secciones) {
    try {
      await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle', timeout: 8000 })
      await page.waitForTimeout(1500)
      const url = page.url()
      const text = await page.evaluate(() => document.body.innerText)
      console.log(`\n=== ${ruta.toUpperCase()} (${url}) ===`)
      console.log(text.slice(0, 800))
      await page.screenshot({ path: `/tmp/pablo${ruta.replace(/\//g, '-')}.png` })
    } catch(e: any) {
      console.log(`${ruta}: error — ${e.message?.slice(0,50)}`)
    }
  }

  console.log('\n=== ERRORES JS ===')
  errors.forEach(e => console.log(e))
})
