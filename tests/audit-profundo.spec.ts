import { test, expect } from '@playwright/test'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

async function loginAdmin(page) {
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'bernaberoberto01@gmail.com', password: 'Roberto72' }
  })
  const auth = await res.json()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })
}

async function loginCliente(page) {
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'rbernabe@alu.ucam.edu', password: 'Roberto72' }
  })
  const auth = await res.json()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })
}

test('Portal cliente — tabs y datos', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await loginCliente(page)
  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(4000)

  const body = await page.evaluate(() => document.body.innerText)
  const tabs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(t => t && t.length < 20)
  )

  console.log('TABS:', [...new Set(tabs)].join(' | '))
  console.log('BODY (inicio):\n', body.slice(0, 1200))
  console.log('ERRORES JS:', errors)
  await page.screenshot({ path: '/tmp/portal-inicio.png' })

  // Verificar tabs uno a uno
  const tabsAVerificar = ['📈', '📅', '✉️', '🥗', '⚙️']
  for (const emoji of tabsAVerificar) {
    const btn = page.locator(`button`).filter({ hasText: emoji }).first()
    if (await btn.isVisible()) {
      await btn.click()
      await page.waitForTimeout(800)
      const tabBody = await page.evaluate(() => document.body.innerText)
      const tabErrors = await page.evaluate(() => window.__errors || [])
      console.log(`\nTAB ${emoji}:`, tabBody.slice(0, 300))
      await page.screenshot({ path: `/tmp/portal-tab-${emoji.codePointAt(0)}.png` })
    }
  }
  expect(errors).toHaveLength(0)
})

test('Admin — Dashboard carga sin errores', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await loginAdmin(page)
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)
  const body = await page.evaluate(() => document.body.innerText)
  console.log('DASHBOARD:\n', body.slice(0, 1000))
  console.log('ERRORES:', errors)
  await page.screenshot({ path: '/tmp/admin-dashboard.png' })
  expect(errors).toHaveLength(0)
})

test('Admin — Clientes, ficha y tabs', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await loginAdmin(page)
  await page.goto(`${BASE}/clientes`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)

  // Abrir primer cliente
  const primerCliente = page.locator('[class*="rounded"][class*="border"]').first()
  await primerCliente.click()
  await page.waitForTimeout(1500)

  const body = await page.evaluate(() => document.body.innerText)
  const tabs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(t => t && t.length < 20)
  )
  console.log('FICHA CLIENTE tabs:', [...new Set(tabs)].join(' | '))
  console.log('FICHA BODY:', body.slice(0, 600))
  await page.screenshot({ path: '/tmp/admin-ficha.png' })
  expect(errors).toHaveLength(0)
})

test('Admin — Seguimiento mensual', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await loginAdmin(page)
  await page.goto(`${BASE}/seguimiento`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)
  const body = await page.evaluate(() => document.body.innerText)
  console.log('SEGUIMIENTO:\n', body.slice(0, 800))
  await page.screenshot({ path: '/tmp/admin-seguimiento.png' })
  expect(errors).toHaveLength(0)
})
