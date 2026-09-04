import { test } from '@playwright/test'
import * as fs from 'fs'

const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
const BASE = 'https://forge-studio-os.vercel.app'
const KEY  = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'

test('portal — screenshot de cada tab con cuenta Roberto ucam', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // Login con cuenta de cliente de Roberto
  const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    data: { email: 'rbernabe@alu.ucam.edu', password: 'Roberto72' }
  })
  const auth = await res.json()
  if (!auth.access_token) {
    console.log('Sin acceso — puede que la contraseña sea otra')
    // Intentar con el token de bernaberoberto01 pero vincular al cliente correcto
    return
  }

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ t, r, u, k }) => {
    localStorage.setItem(k, JSON.stringify({ access_token:t, token_type:'bearer',
      expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:r, user:u }))
  }, { t:auth.access_token, r:auth.refresh_token, u:auth.user, k:KEY })

  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)

  const url = page.url()
  console.log('URL:', url)
  if (url.includes('dashboard') || url.includes('login')) {
    console.log('Redirigido — no cargó el portal')
    return
  }

  // Screenshot de cada tab
  const tabs = [
    { selector: null, nombre: 'inicio' },
    { texto: '💪', nombre: 'rutina' },
    { texto: '📈', nombre: 'progreso' },
    { texto: '✉️', nombre: 'mensajes' },
    { texto: '🎯', nombre: 'habitos' },
    { texto: '⚙️', nombre: 'ajustes' },
  ]

  for (const tab of tabs) {
    if (tab.texto) {
      const btn = await page.$(`button:has-text("${tab.texto}")`)
      if (btn) await btn.click()
      await page.waitForTimeout(800)
    }
    await page.screenshot({ path: `/tmp/portal-tab-${tab.nombre}.png` })
    const body = await page.evaluate(() => document.body.innerText)
    console.log(`\n=== TAB ${tab.nombre.toUpperCase()} ===`)
    console.log(body.slice(0, 600))
  }
  console.log('\nErrores JS:', errors)
})
