import { test, expect } from '@playwright/test'
const BASE='https://forge-studio-os.vercel.app'

test('check-in en vivo', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto(`${BASE}/login`, {waitUntil:'networkidle'})
  await page.fill('input[type="email"]', 'beatrizar79@gmail.com')
  await page.fill('input[type="password"]', 'Forge2024!')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(7000)
  await page.screenshot({path:'/tmp/ci-hoy.png'})
  console.log('URL:', page.url())

  // Ver si el modal de check-in se abre
  const ciBtn = await page.$('button:has-text("Check-in")')
  if (ciBtn) {
    await ciBtn.click()
    await page.waitForTimeout(1000)
    await page.screenshot({path:'/tmp/ci-modal.png'})
    console.log('Modal check-in abierto ✓')
  } else {
    console.log('Botón Check-in NO encontrado')
    // Ver todos los botones visibles
    const btns = await page.$$eval('button', bs => bs.map(b => b.textContent?.trim()).filter(Boolean).slice(0,20))
    console.log('Botones visibles:', btns)
  }

  console.log('Errores JS:', errors)
  await ctx.close()
})
