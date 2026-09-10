import { test } from '@playwright/test'
const SUPA='https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE='https://forge-studio-os.vercel.app'
const KEY='sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('portal Roberto', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', 'rbernabe@alu.ucam.edu')
  await page.fill('input[type="password"]', 'Roberto72')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(7000)
  await page.screenshot({ path: '/tmp/rob-hoy.png', fullPage: false })

  const tabs = ['Entrena', 'Nutrición', 'Progreso']
  for (const t of tabs) {
    errors.length = 0
    await page.evaluate((tab) => {
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent?.includes(tab))
      if (btn) (btn as HTMLElement).click()
    }, t)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `/tmp/rob-${t.toLowerCase()}.png`, fullPage: false })
    console.log(`${t}: ${errors.length ? 'ERROR — ' + errors[0] : 'OK'}`)
  }
  await ctx.close()
})
