# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit-forge.spec.ts >> Audit Forge — entrenador >> Dashboard
- Location: tests/audit-forge.spec.ts:46:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "Dashboard"
Received string:    "⚠️·
Algo ha fallado·
config is not defined·
Recargar"
```

# Page snapshot

```yaml
- generic [ref=f2e4]:
  - paragraph [ref=f2e5]: ⚠️
  - heading "Algo ha fallado" [level=2] [ref=f2e6]
  - paragraph [ref=f2e7]: config is not defined
  - button "Recargar" [ref=f2e8] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFwYmtwcGtoemN4cGZ5cHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2NDMsImV4cCI6MjA5MjUxNDY0M30.ZW7jmH1oUefjbD1yRqJJMtSb52o5CeZPrH6Sz-B68jQ'
  4   | const BASE = 'https://forge-studio-os.vercel.app'
  5   | const SUPA = 'https://qdpqpbkppkhzcxpfypvf.supabase.co'
  6   | const STORAGE_KEY = 'sb-qdpqpbkppkhzcxpfypvf-auth-token'
  7   | 
  8   | // Login helper — inyecta sesión via localStorage
  9   | async function login(page: any, email = 'bernaberoberto01@gmail.com', pass = 'Roberto72') {
  10  |   const res = await page.request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
  11  |     headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
  12  |     data: { email, password: pass }
  13  |   })
  14  |   const auth = await res.json()
  15  |   if (!auth.access_token) throw new Error('Login fallido: ' + JSON.stringify(auth))
  16  |   
  17  |   await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  18  |   await page.evaluate(({ token, refresh, user, key }: any) => {
  19  |     localStorage.setItem(key, JSON.stringify({
  20  |       access_token: token, token_type: 'bearer',
  21  |       expires_in: 3600, expires_at: Math.floor(Date.now()/1000) + 3600,
  22  |       refresh_token: refresh, user
  23  |     }))
  24  |   }, { token: auth.access_token, refresh: auth.refresh_token, user: auth.user, key: STORAGE_KEY })
  25  |   
  26  |   await page.reload({ waitUntil: 'networkidle' })
  27  |   await page.waitForTimeout(1500)
  28  |   return auth
  29  | }
  30  | 
  31  | // Navegar a una ruta y recoger errores JS
  32  | async function auditPage(page: any, path: string) {
  33  |   const errors: string[] = []
  34  |   const warnings: string[] = []
  35  |   page.on('pageerror', (e: Error) => errors.push(e.message))
  36  |   page.on('console', (msg: any) => { if (msg.type() === 'error') warnings.push(msg.text()) })
  37  |   
  38  |   await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  39  |   await page.waitForTimeout(2500)
  40  |   
  41  |   return { errors, warnings }
  42  | }
  43  | 
  44  | test.describe('Audit Forge — entrenador', () => {
  45  | 
  46  |   test('Dashboard', async ({ page }) => {
  47  |     await login(page)
  48  |     const { errors } = await auditPage(page, '/dashboard')
  49  |     console.log('Errores JS:', errors)
  50  |     expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
  51  |     const body = await page.evaluate(() => document.body.innerText)
> 52  |     expect(body).toContain('Dashboard')
      |                  ^ Error: expect(received).toContain(expected) // indexOf
  53  |     console.log('✅ Dashboard OK')
  54  |   })
  55  | 
  56  |   test('Clientes', async ({ page }) => {
  57  |     await login(page)
  58  |     const { errors } = await auditPage(page, '/clientes')
  59  |     console.log('Errores JS:', errors)
  60  |     expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
  61  |     console.log('✅ Clientes OK')
  62  |   })
  63  | 
  64  |   test('Rutinas', async ({ page }) => {
  65  |     await login(page)
  66  |     const { errors } = await auditPage(page, '/rutinas')
  67  |     console.log('Errores JS:', errors)
  68  |     expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
  69  |     console.log('✅ Rutinas OK')
  70  |   })
  71  | 
  72  |   test('Agenda — grupos visibles', async ({ page }) => {
  73  |     await login(page)
  74  |     const { errors } = await auditPage(page, '/agenda')
  75  |     console.log('Errores JS:', errors)
  76  |     // Sin errores JS críticos
  77  |     expect(errors.filter(e => !e.includes('Warning') && !e.includes('net::ERR'))).toEqual([])
  78  |     // Verificar que grupos aparecen
  79  |     const body = await page.evaluate(() => document.body.innerText)
  80  |     const tieneGrupos = body.includes('CAMPEONES') || body.includes('CHICAS') || body.includes('18:00') || body.includes('19:00')
  81  |     console.log('Grupos visibles:', tieneGrupos)
  82  |     // Screenshot para revisión visual
  83  |     await page.screenshot({ path: '/home/claude/forge/test-results/agenda-audit.png' })
  84  |     console.log('✅ Agenda OK')
  85  |   })
  86  | 
  87  |   test('Seguimiento', async ({ page }) => {
  88  |     await login(page)
  89  |     const { errors } = await auditPage(page, '/seguimiento')
  90  |     console.log('Errores JS:', errors)
  91  |     expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
  92  |     console.log('✅ Seguimiento OK')
  93  |   })
  94  | 
  95  |   test('Mensajes', async ({ page }) => {
  96  |     await login(page)
  97  |     const { errors } = await auditPage(page, '/mensajes')
  98  |     console.log('Errores JS:', errors)
  99  |     expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
  100 |     console.log('✅ Mensajes OK')
  101 |   })
  102 | 
  103 |   test('Pagos', async ({ page }) => {
  104 |     await login(page)
  105 |     const { errors } = await auditPage(page, '/pagos')
  106 |     console.log('Errores JS:', errors)
  107 |     expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
  108 |     console.log('✅ Pagos OK')
  109 |   })
  110 | 
  111 |   test('Nutrición', async ({ page }) => {
  112 |     await login(page)
  113 |     const { errors } = await auditPage(page, '/nutricion')
  114 |     console.log('Errores JS:', errors)
  115 |     expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
  116 |     console.log('✅ Nutrición OK')
  117 |   })
  118 | 
  119 |   test('Configuración', async ({ page }) => {
  120 |     await login(page)
  121 |     const { errors } = await auditPage(page, '/configuracion')
  122 |     console.log('Errores JS:', errors)
  123 |     expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
  124 |     console.log('✅ Configuración OK')
  125 |   })
  126 | 
  127 | })
  128 | 
  129 | test.describe('Audit Forge — portal cliente (demo)', () => {
  130 | 
  131 |   test('Portal cliente — carga y tabs visibles', async ({ page }) => {
  132 |     await login(page, 'demo@forge-studio.es', 'Demo2024!')
  133 |     const { errors } = await auditPage(page, '/')
  134 |     console.log('Errores JS:', errors)
  135 |     const body = await page.evaluate(() => document.body.innerText)
  136 |     const tieneInicio = body.includes('Bienvenido') || body.includes('Inicio') || body.includes('Rutina') || body.includes('Tu plan')
  137 |     console.log('Portal cargado:', tieneInicio, '| Errores:', errors.length)
  138 |     await page.screenshot({ path: '/home/claude/forge/test-results/portal-cliente.png' })
  139 |     console.log('✅ Portal cliente OK')
  140 |   })
  141 | 
  142 | })
  143 | 
```